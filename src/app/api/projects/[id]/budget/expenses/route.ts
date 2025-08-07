import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';
import { HubSpotBackboneService } from '@/lib/services/hubspot-backbone.service';
import { QuickBooksAPIService } from '@/lib/services/quickbooks-api.service';

const prisma = new PrismaClient();
const hubspotService = new HubSpotBackboneService();
const quickbooksService = new QuickBooksAPIService();

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const projectId = params.id;
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const category = searchParams.get('category');
    const status = searchParams.get('status');

    // Find project budget
    const budget = await prisma.projectBudget.findUnique({
      where: { projectId },
      select: { id: true, memberId: true },
    });

    if (!budget) {
      return NextResponse.json({ error: 'Budget not found' }, { status: 404 });
    }

    // Check access
    if (budget.memberId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Build where clause
    const where: any = { budgetId: budget.id };
    if (category) where.expenseCategory = category;
    if (status) where.approvalStatus = status;

    // Get expenses with pagination
    const [expenses, total] = await Promise.all([
      prisma.budgetExpense.findMany({
        where,
        orderBy: { expenseDate: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.budgetExpense.count({ where }),
    ]);

    return NextResponse.json({
      expenses,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching budget expenses:', error);
    return NextResponse.json(
      { error: 'Failed to fetch budget expenses' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const projectId = params.id;
    const data = await request.json();

    const {
      expenseCategory,
      description,
      amount,
      expenseDate,
      vendor,
      receiptUrl,
      notes,
    } = data;

    // Validate required fields
    if (!expenseCategory || !description || !amount || !expenseDate) {
      return NextResponse.json(
        { error: 'Category, description, amount, and date are required' },
        { status: 400 }
      );
    }

    if (amount <= 0) {
      return NextResponse.json(
        { error: 'Amount must be greater than 0' },
        { status: 400 }
      );
    }

    // Find project budget
    const budget = await prisma.projectBudget.findUnique({
      where: { projectId },
    });

    if (!budget) {
      return NextResponse.json({ error: 'Budget not found' }, { status: 404 });
    }

    // Check access
    if (budget.memberId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check if expense would exceed budget
    const newSpentAmount = budget.spentAmount + amount;
    if (newSpentAmount > budget.totalBudget) {
      return NextResponse.json(
        { 
          error: 'Expense would exceed total budget',
          details: {
            currentSpent: budget.spentAmount,
            expenseAmount: amount,
            totalBudget: budget.totalBudget,
            wouldExceedBy: newSpentAmount - budget.totalBudget,
          }
        },
        { status: 400 }
      );
    }

    // Determine approval status
    const approvalStatus = budget.approvalRequired ? 'PENDING' : 'APPROVED';

    // Create expense
    const expense = await prisma.budgetExpense.create({
      data: {
        budgetId: budget.id,
        expenseCategory,
        description,
        amount,
        expenseDate: new Date(expenseDate),
        vendor,
        receiptUrl,
        notes,
        approvalStatus,
        ...(approvalStatus === 'APPROVED' && {
          approvedBy: session.user.id,
          approvedAt: new Date(),
        }),
      },
    });

    // Update budget spent amount if approved
    if (approvalStatus === 'APPROVED') {
      await prisma.projectBudget.update({
        where: { id: budget.id },
        data: {
          spentAmount: newSpentAmount,
          remainingFunds: budget.totalBudget - newSpentAmount,
        },
      });

      // Check if over threshold and send alert
      const utilizationPercentage = (newSpentAmount / budget.totalBudget);
      if (utilizationPercentage >= budget.alertThreshold) {
        // Trigger budget alert workflow
        try {
          await hubspotService.triggerBudgetAlert({
            projectId,
            budgetId: budget.id,
            utilizationPercentage,
            spentAmount: newSpentAmount,
            totalBudget: budget.totalBudget,
          });
        } catch (alertError) {
          console.error('Budget alert error:', alertError);
        }
      }
    }

    // Sync to QuickBooks if connected and approved
    if (approvalStatus === 'APPROVED') {
      try {
        const user = await prisma.user.findUnique({
          where: { id: session.user.id },
          select: { quickbooksConnected: true },
        });

        if (user?.quickbooksConnected) {
          await quickbooksService.createExpense({
            projectId: budget.quickbooksProjectId,
            amount,
            description,
            category: expenseCategory,
            date: expenseDate,
            vendor,
          });
        }
      } catch (quickbooksError) {
        console.error('QuickBooks sync error:', quickbooksError);
      }
    }

    return NextResponse.json(expense, { status: 201 });
  } catch (error) {
    console.error('Error creating budget expense:', error);
    return NextResponse.json(
      { error: 'Failed to create budget expense' },
      { status: 500 }
    );
  }
}

// Bulk approve expenses
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const projectId = params.id;
    const data = await request.json();
    const { expenseIds, action } = data;

    if (!expenseIds || !Array.isArray(expenseIds) || expenseIds.length === 0) {
      return NextResponse.json(
        { error: 'Expense IDs are required' },
        { status: 400 }
      );
    }

    if (!['APPROVE', 'REJECT'].includes(action)) {
      return NextResponse.json(
        { error: 'Action must be APPROVE or REJECT' },
        { status: 400 }
      );
    }

    // Find project budget
    const budget = await prisma.projectBudget.findUnique({
      where: { projectId },
    });

    if (!budget) {
      return NextResponse.json({ error: 'Budget not found' }, { status: 404 });
    }

    // Check access
    if (budget.memberId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get expenses to update
    const expenses = await prisma.budgetExpense.findMany({
      where: {
        id: { in: expenseIds },
        budgetId: budget.id,
        approvalStatus: 'PENDING',
      },
    });

    if (expenses.length === 0) {
      return NextResponse.json(
        { error: 'No pending expenses found' },
        { status: 404 }
      );
    }

    const approvalStatus = action === 'APPROVE' ? 'APPROVED' : 'REJECTED';
    const totalAmount = expenses.reduce((sum, expense) => sum + expense.amount, 0);

    // Update expenses
    await prisma.budgetExpense.updateMany({
      where: { id: { in: expenseIds } },
      data: {
        approvalStatus,
        approvedBy: session.user.id,
        approvedAt: new Date(),
      },
    });

    // Update budget if approved
    if (action === 'APPROVE') {
      const newSpentAmount = budget.spentAmount + totalAmount;
      await prisma.projectBudget.update({
        where: { id: budget.id },
        data: {
          spentAmount: newSpentAmount,
          remainingFunds: budget.totalBudget - newSpentAmount,
        },
      });

      // Sync approved expenses to QuickBooks
      try {
        const user = await prisma.user.findUnique({
          where: { id: session.user.id },
          select: { quickbooksConnected: true },
        });

        if (user?.quickbooksConnected) {
          for (const expense of expenses) {
            await quickbooksService.createExpense({
              projectId: budget.quickbooksProjectId,
              amount: expense.amount,
              description: expense.description,
              category: expense.expenseCategory,
              date: expense.expenseDate.toISOString(),
              vendor: expense.vendor,
            });
          }
        }
      } catch (quickbooksError) {
        console.error('QuickBooks sync error:', quickbooksError);
      }
    }

    return NextResponse.json({
      message: `${expenses.length} expenses ${action.toLowerCase()}d successfully`,
      updatedCount: expenses.length,
      totalAmount: action === 'APPROVE' ? totalAmount : 0,
    });
  } catch (error) {
    console.error('Error bulk updating expenses:', error);
    return NextResponse.json(
      { error: 'Failed to update expenses' },
      { status: 500 }
    );
  }
}
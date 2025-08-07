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

    // Fetch project budget with all related data
    const budget = await prisma.projectBudget.findUnique({
      where: { projectId },
      include: {
        member: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        expenses: {
          orderBy: { expenseDate: 'desc' },
          take: 10,
        },
        fundingCampaigns: {
          where: { campaignStatus: { in: ['ACTIVE', 'DRAFT'] } },
          include: {
            contributions: true,
            sponsors: true,
          },
        },
        socialImpactMetrics: true,
      },
    });

    if (!budget) {
      return NextResponse.json({ error: 'Budget not found' }, { status: 404 });
    }

    // Check if user has access to this project
    if (budget.memberId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Calculate remaining funds
    const remainingFunds = budget.totalBudget - budget.spentAmount;
    
    // Update remaining funds if different
    if (Math.abs(budget.remainingFunds - remainingFunds) > 0.01) {
      await prisma.projectBudget.update({
        where: { id: budget.id },
        data: { remainingFunds },
      });
      budget.remainingFunds = remainingFunds;
    }

    return NextResponse.json(budget);
  } catch (error) {
    console.error('Error fetching project budget:', error);
    return NextResponse.json(
      { error: 'Failed to fetch project budget' },
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
      projectName,
      totalBudget,
      memberFunding = 0,
      sponsorFunding = 0,
      crowdFunding = 0,
      contractValue = 0,
      alertThreshold = 0.8,
      approvalRequired = false,
    } = data;

    // Validate required fields
    if (!projectName || !totalBudget || totalBudget <= 0) {
      return NextResponse.json(
        { error: 'Project name and valid total budget are required' },
        { status: 400 }
      );
    }

    // Check if budget already exists for this project
    const existingBudget = await prisma.projectBudget.findUnique({
      where: { projectId },
    });

    if (existingBudget) {
      return NextResponse.json(
        { error: 'Budget already exists for this project' },
        { status: 409 }
      );
    }

    // Calculate profit margin
    const profitMargin = contractValue - totalBudget;
    const remainingFunds = totalBudget;

    // Create project budget
    const budget = await prisma.projectBudget.create({
      data: {
        projectId,
        memberId: session.user.id,
        projectName,
        totalBudget,
        allocatedFunds: 0,
        spentAmount: 0,
        remainingFunds,
        memberFunding,
        sponsorFunding,
        crowdFunding,
        contractValue,
        profitMargin,
        alertThreshold,
        approvalRequired,
      },
      include: {
        member: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        expenses: true,
        fundingCampaigns: true,
        socialImpactMetrics: true,
      },
    });

    // Sync to HubSpot
    try {
      await hubspotService.createProjectBudget({
        projectId,
        memberId: session.user.id,
        totalBudget,
        memberFunding,
        sponsorFunding,
        crowdFunding,
        contractValue,
        profitMargin,
      });
    } catch (hubspotError) {
      console.error('HubSpot sync error:', hubspotError);
      // Continue without failing the request
    }

    // Sync to QuickBooks if connected
    try {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { quickbooksConnected: true },
      });

      if (user?.quickbooksConnected) {
        await quickbooksService.createProject({
          projectId,
          projectName,
          totalBudget,
          memberId: session.user.id,
        });
      }
    } catch (quickbooksError) {
      console.error('QuickBooks sync error:', quickbooksError);
      // Continue without failing the request
    }

    return NextResponse.json(budget, { status: 201 });
  } catch (error) {
    console.error('Error creating project budget:', error);
    return NextResponse.json(
      { error: 'Failed to create project budget' },
      { status: 500 }
    );
  }
}

export async function PUT(
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

    // Find existing budget
    const existingBudget = await prisma.projectBudget.findUnique({
      where: { projectId },
    });

    if (!existingBudget) {
      return NextResponse.json({ error: 'Budget not found' }, { status: 404 });
    }

    // Check if user has access
    if (existingBudget.memberId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const {
      totalBudget,
      memberFunding,
      sponsorFunding,
      crowdFunding,
      contractValue,
      alertThreshold,
      approvalRequired,
      budgetStatus,
    } = data;

    // Calculate new values
    const profitMargin = contractValue ? contractValue - totalBudget : existingBudget.profitMargin;
    const remainingFunds = totalBudget ? totalBudget - existingBudget.spentAmount : existingBudget.remainingFunds;

    // Update budget
    const updatedBudget = await prisma.projectBudget.update({
      where: { projectId },
      data: {
        ...(totalBudget && { totalBudget, remainingFunds }),
        ...(memberFunding !== undefined && { memberFunding }),
        ...(sponsorFunding !== undefined && { sponsorFunding }),
        ...(crowdFunding !== undefined && { crowdFunding }),
        ...(contractValue !== undefined && { contractValue, profitMargin }),
        ...(alertThreshold !== undefined && { alertThreshold }),
        ...(approvalRequired !== undefined && { approvalRequired }),
        ...(budgetStatus && { budgetStatus }),
      },
      include: {
        member: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        expenses: {
          orderBy: { expenseDate: 'desc' },
          take: 10,
        },
        fundingCampaigns: {
          where: { campaignStatus: { in: ['ACTIVE', 'DRAFT'] } },
        },
        socialImpactMetrics: true,
      },
    });

    // Sync to HubSpot
    try {
      await hubspotService.updateProjectBudget(existingBudget.hubspotObjectId!, {
        totalBudget: updatedBudget.totalBudget,
        spentAmount: updatedBudget.spentAmount,
        remainingFunds: updatedBudget.remainingFunds,
        profitMargin: updatedBudget.profitMargin,
        budgetStatus: updatedBudget.budgetStatus,
      });
    } catch (hubspotError) {
      console.error('HubSpot sync error:', hubspotError);
    }

    return NextResponse.json(updatedBudget);
  } catch (error) {
    console.error('Error updating project budget:', error);
    return NextResponse.json(
      { error: 'Failed to update project budget' },
      { status: 500 }
    );
  }
}
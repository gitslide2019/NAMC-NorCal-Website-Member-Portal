import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const status = searchParams.get('status');
    const deadlineType = searchParams.get('deadlineType');
    const upcoming = searchParams.get('upcoming'); // Get deadlines in next 30 days

    const where: any = {
      memberId: session.user.id
    };

    if (projectId) {
      where.projectId = projectId;
    }

    if (status) {
      where.status = status;
    }

    if (deadlineType) {
      where.deadlineType = deadlineType;
    }

    if (upcoming === 'true') {
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      
      where.dueDate = {
        gte: new Date(),
        lte: thirtyDaysFromNow
      };
      where.status = {
        not: 'COMPLETED'
      };
    }

    const deadlines = await prisma.complianceDeadline.findMany({
      where,
      include: {
        member: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        dueDate: 'asc'
      }
    });

    // Parse JSON fields and calculate days until due
    const formattedDeadlines = deadlines.map(deadline => {
      const now = new Date();
      const dueDate = new Date(deadline.dueDate);
      const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      return {
        ...deadline,
        reminderDates: deadline.reminderDates ? JSON.parse(deadline.reminderDates) : [],
        daysUntilDue,
        isOverdue: daysUntilDue < 0 && deadline.status !== 'COMPLETED'
      };
    });

    return NextResponse.json({
      success: true,
      deadlines: formattedDeadlines
    });

  } catch (error) {
    console.error('Error fetching compliance deadlines:', error);
    return NextResponse.json(
      { error: 'Failed to fetch compliance deadlines' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      deadlineType,
      title,
      description,
      dueDate,
      reminderDates,
      priority,
      regulatoryBody,
      penaltyInfo,
      projectId
    } = body;

    if (!deadlineType || !title || !dueDate) {
      return NextResponse.json(
        { error: 'Deadline type, title, and due date are required' },
        { status: 400 }
      );
    }

    const deadline = await prisma.complianceDeadline.create({
      data: {
        memberId: session.user.id,
        projectId,
        deadlineType,
        title,
        description,
        dueDate: new Date(dueDate),
        reminderDates: reminderDates ? JSON.stringify(reminderDates) : JSON.stringify([]),
        priority: priority || 'MEDIUM',
        regulatoryBody,
        penaltyInfo,
        status: 'PENDING'
      },
      include: {
        member: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    // Calculate days until due
    const now = new Date();
    const dueDateObj = new Date(deadline.dueDate);
    const daysUntilDue = Math.ceil((dueDateObj.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    const formattedDeadline = {
      ...deadline,
      reminderDates: JSON.parse(deadline.reminderDates),
      daysUntilDue,
      isOverdue: daysUntilDue < 0
    };

    return NextResponse.json({
      success: true,
      deadline: formattedDeadline
    });

  } catch (error) {
    console.error('Error creating compliance deadline:', error);
    return NextResponse.json(
      { error: 'Failed to create compliance deadline' },
      { status: 500 }
    );
  }
}
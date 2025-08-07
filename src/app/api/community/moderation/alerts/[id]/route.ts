import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin or moderator
    const user = await prisma.user.findUnique({
      where: { email: session.user.email! }
    });

    if (!user || !['ADMIN', 'MODERATOR'].includes(user.memberType)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { action } = body;

    if (!['approve', 'remove', 'warn'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action' },
        { status: 400 }
      );
    }

    // Mock implementation - in real app would update database
    console.log(`Moderation action ${action} taken on alert ${params.id} by ${user.name}`);

    return NextResponse.json({
      message: `Alert ${action}d successfully`
    });

  } catch (error) {
    console.error('Error handling moderation action:', error);
    return NextResponse.json(
      { error: 'Failed to handle moderation action' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin or moderator
    const user = await prisma.user.findUnique({
      where: { email: session.user.email! }
    });

    if (!user || !['ADMIN', 'MODERATOR'].includes(user.memberType)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Mock alert data
    const alert = {
      id: params.id,
      type: 'inappropriate_content',
      severity: 'medium',
      content: 'Sample moderation alert content',
      reason: 'Reported for inappropriate language',
      status: 'pending',
      resolution: null,
      createdAt: new Date().toISOString(),
      resolvedAt: null,
      reportedBy: {
        id: 'user1',
        name: 'John Smith'
      },
      targetMember: {
        id: 'user2',
        name: 'Jane Doe',
        moderationScore: 5
      },
      resolvedBy: null,
      context: {
        discussion: null,
        message: null
      }
    };

    return NextResponse.json(alert);

  } catch (error) {
    console.error('Error fetching moderation alert:', error);
    return NextResponse.json(
      { error: 'Failed to fetch moderation alert' },
      { status: 500 }
    );
  }
}
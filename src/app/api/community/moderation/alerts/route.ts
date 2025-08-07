import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { HubSpotBackboneService } from '@/lib/services/hubspot-backbone.service';

const hubspotService = new HubSpotBackboneService();

export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'pending';
    const limit = parseInt(searchParams.get('limit') || '50');

    // Mock moderation alerts data (would be replaced with real database queries)
    const mockAlerts = [
      {
        id: '1',
        type: 'inappropriate_content',
        severity: 'medium',
        content: 'This post contains inappropriate language that may violate community guidelines.',
        reportedBy: 'John Smith',
        reportedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        status: 'pending',
        context: {
          discussionId: 'disc_1',
          messageId: null,
          memberId: 'member_1',
          memberName: 'Jane Doe'
        }
      },
      {
        id: '2',
        type: 'spam',
        severity: 'low',
        content: 'Multiple promotional messages posted in quick succession.',
        reportedBy: 'Sarah Johnson',
        reportedAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
        status: 'pending',
        context: {
          discussionId: null,
          messageId: 'msg_1',
          memberId: 'member_2',
          memberName: 'Bob Wilson'
        }
      }
    ];

    const formattedAlerts = status === 'all' ? mockAlerts : 
      mockAlerts.filter(alert => alert.status === status);

    return NextResponse.json(formattedAlerts);

  } catch (error) {
    console.error('Error fetching moderation alerts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch moderation alerts' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email! }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await request.json();
    const {
      type,
      severity,
      content,
      targetMemberId,
      discussionId,
      messageId,
      reason
    } = body;

    // Validate required fields
    if (!type || !severity || !content || !targetMemberId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create moderation alert (mock implementation)
    const alert = {
      id: `alert_${Date.now()}`,
      type,
      severity,
      content,
      reason,
      reportedById: user.id,
      targetMemberId,
      discussionId,
      messageId,
      status: 'PENDING',
      reportedBy: {
        firstName: user.name?.split(' ')[0] || 'Unknown',
        lastName: user.name?.split(' ')[1] || 'User'
      },
      targetMember: {
        firstName: 'Target',
        lastName: 'Member'
      }
    };

    // Create HubSpot ticket for tracking
    try {
      await hubspotService.createModerationTicket({
        alertId: alert.id,
        type: alert.type,
        severity: alert.severity,
        content: alert.content,
        reportedBy: `${alert.reportedBy.firstName} ${alert.reportedBy.lastName}`,
        targetMember: `${alert.targetMember.firstName} ${alert.targetMember.lastName}`,
        targetMemberId: alert.targetMemberId
      });
    } catch (hubspotError) {
      console.error('Error creating HubSpot moderation ticket:', hubspotError);
      // Continue without failing the request
    }

    return NextResponse.json({
      id: alert.id,
      message: 'Moderation alert created successfully'
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating moderation alert:', error);
    return NextResponse.json(
      { error: 'Failed to create moderation alert' },
      { status: 500 }
    );
  }
}
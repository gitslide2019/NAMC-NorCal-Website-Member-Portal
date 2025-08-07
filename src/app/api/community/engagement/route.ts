import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { MemberEngagementScoringService } from '@/lib/services/member-engagement-scoring.service';
import { prisma } from '@/lib/prisma';

const engagementService = new MemberEngagementScoringService();

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get('memberId');
    const type = searchParams.get('type') || 'score';

    if (type === 'leaderboard') {
      const limit = parseInt(searchParams.get('limit') || '10');
      const leaderboard = await engagementService.getCommunityLeaderboard(limit);
      return NextResponse.json(leaderboard);
    }

    if (type === 'analytics') {
      const timeframe = searchParams.get('timeframe') as 'week' | 'month' | 'quarter' || 'month';
      
      // Check if user is admin
      const user = await prisma.user.findUnique({
        where: { email: session.user.email! }
      });

      if (!user || !['ADMIN', 'MODERATOR'].includes(user.memberType)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      const analytics = await engagementService.generateEngagementAnalytics(timeframe);
      return NextResponse.json(analytics);
    }

    if (memberId) {
      const engagementScore = await engagementService.getMemberEngagementScore(memberId);
      return NextResponse.json(engagementScore);
    }

    // Get current user's engagement score
    const user = await prisma.user.findUnique({
      where: { email: session.user.email! }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const engagementScore = await engagementService.getMemberEngagementScore(user.id);
    return NextResponse.json(engagementScore);

  } catch (error) {
    console.error('Error fetching engagement data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch engagement data' },
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
    const { type, action, metadata } = body;

    // Validate required fields
    if (!type || !action) {
      return NextResponse.json(
        { error: 'Missing required fields: type, action' },
        { status: 400 }
      );
    }

    // Record the engagement activity
    await engagementService.recordActivity(user.id, {
      type,
      action,
      value: 0, // Will be calculated by the service
      metadata
    });

    // Get updated engagement score
    const updatedScore = await engagementService.getMemberEngagementScore(user.id);

    return NextResponse.json({
      message: 'Engagement activity recorded successfully',
      engagementScore: updatedScore
    });

  } catch (error) {
    console.error('Error recording engagement activity:', error);
    return NextResponse.json(
      { error: 'Failed to record engagement activity' },
      { status: 500 }
    );
  }
}
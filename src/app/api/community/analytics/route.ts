import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { email: session.user.email! }
    });

    if (!user || user.memberType !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const timeframe = searchParams.get('timeframe') || 'month';

    // Calculate date range based on timeframe
    const now = new Date();
    let startDate: Date;
    
    switch (timeframe) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'quarter':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default: // month
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    // Get total and active members
    const totalMembers = await prisma.user.count();
    const activeMembers = await prisma.user.count({
      where: {
        lastActive: {
          gte: startDate
        }
      }
    });

    // Mock data for community analytics (would be replaced with real data)
    const totalDiscussions = Math.floor(Math.random() * 50) + 20;
    const totalReplies = Math.floor(Math.random() * 200) + 100;
    const totalViews = Math.floor(Math.random() * 2000) + 1000;
    const totalLikes = Math.floor(Math.random() * 150) + 75;
    const weeklyGrowth = Math.floor(Math.random() * 20) + 5;

    const totalCommittees = Math.floor(Math.random() * 8) + 5;
    const activeMemberships = Math.floor(Math.random() * 40) + 20;
    const meetingsThisMonth = Math.floor(Math.random() * 15) + 8;
    const projectsInProgress = Math.floor(Math.random() * 12) + 6;
    const participationRate = totalMembers > 0 ? (activeMemberships / totalMembers) * 100 : 0;

    const activeVotes = Math.floor(Math.random() * 3) + 1;
    const completedVotes = Math.floor(Math.random() * 8) + 4;
    const votingParticipationRate = Math.floor(Math.random() * 30) + 40;
    const averageEngagement = Math.floor(Math.random() * 20) + 60;

    const connections = Math.floor(Math.random() * 25) + 15;
    const businessOpportunities = Math.floor(Math.random() * 12) + 8;
    const collaborations = Math.floor(Math.random() * 6) + 3;
    const conversionRate = businessOpportunities > 0 
      ? (collaborations / businessOpportunities) * 100 
      : 0;

    // Mock top contributors
    const topContributors = [
      { id: '1', name: 'Sarah Johnson', score: 850, contributions: 45, avatar: null },
      { id: '2', name: 'Michael Chen', score: 720, contributions: 38, avatar: null },
      { id: '3', name: 'David Rodriguez', score: 680, contributions: 35, avatar: null },
      { id: '4', name: 'Lisa Thompson', score: 620, contributions: 32, avatar: null },
      { id: '5', name: 'James Wilson', score: 580, contributions: 29, avatar: null },
      { id: '6', name: 'Maria Garcia', score: 540, contributions: 27, avatar: null },
      { id: '7', name: 'Robert Brown', score: 500, contributions: 25, avatar: null },
      { id: '8', name: 'Jennifer Davis', score: 460, contributions: 23, avatar: null },
      { id: '9', name: 'William Miller', score: 420, contributions: 21, avatar: null },
      { id: '10', name: 'Amanda Taylor', score: 380, contributions: 19, avatar: null }
    ];

    // Generate engagement trends
    const engagementTrends = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dayStart = new Date(date.setHours(0, 0, 0, 0));

      engagementTrends.push({
        date: dayStart.toISOString().split('T')[0],
        discussions: Math.floor(Math.random() * 10) + 2,
        committees: Math.floor(Math.random() * 5) + 1,
        voting: Math.floor(Math.random() * 3) + 1,
        networking: Math.floor(Math.random() * 8) + 2
      });
    }

    const metrics = {
      totalMembers,
      activeMembers,
      discussionActivity: {
        totalDiscussions,
        totalReplies,
        totalViews,
        totalLikes,
        weeklyGrowth: Math.round(weeklyGrowth * 10) / 10
      },
      committeeActivity: {
        totalCommittees,
        activeMemberships,
        meetingsThisMonth,
        projectsInProgress,
        participationRate: Math.round(participationRate * 10) / 10
      },
      votingActivity: {
        activeVotes,
        completedVotes,
        participationRate: Math.round(votingParticipationRate * 10) / 10,
        averageEngagement: Math.round(averageEngagement * 10) / 10
      },
      networkingSuccess: {
        connectionsFormed: connections,
        businessOpportunities,
        collaborationsStarted: collaborations,
        conversionRate: Math.round(conversionRate * 10) / 10
      },
      memberEngagement: {
        topContributors,
        engagementTrends
      }
    };

    return NextResponse.json(metrics);

  } catch (error) {
    console.error('Error fetching community analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch community analytics' },
      { status: 500 }
    );
  }
}
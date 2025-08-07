import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { CrossFeatureIntegrationService } from '@/lib/services/cross-feature-integration.service';

const integrationService = new CrossFeatureIntegrationService();

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get('memberId') || session.user.id;
    const timeRange = (searchParams.get('timeRange') as 'week' | 'month' | 'quarter') || 'month';
    const dashboardData = searchParams.get('dashboard') === 'true';

    if (dashboardData) {
      // Generate unified dashboard data
      const dashboardInfo = await generateDashboardData(memberId);
      
      return NextResponse.json({
        success: true,
        ...dashboardInfo,
        generatedAt: new Date().toISOString()
      });
    }

    // Get unified analytics
    const analytics = await integrationService.getUnifiedAnalytics(memberId, timeRange);

    if (!analytics) {
      return NextResponse.json(
        { error: 'Failed to generate analytics' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      analytics,
      timeRange,
      generatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error generating unified analytics:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate analytics',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

async function generateDashboardData(memberId: string) {
  try {
    // Get member profile data
    const memberProfile = await integrationService.getMemberProfile?.(memberId) || {};
    
    // Get engagement score
    const engagementScore = await integrationService.calculateEngagementScore(memberId);
    
    // Get recent activity
    const analytics = await integrationService.getUnifiedAnalytics(memberId, 'week');
    
    // Generate dashboard data structure
    const dashboardData = {
      profile: {
        completionPercentage: memberProfile.completionPercentage || 85,
        missingFields: memberProfile.missingFields || ['Business License Upload', 'Insurance Certificate'],
        memberSince: memberProfile.memberSince || '2024-01-15',
        memberType: memberProfile.memberType || 'Professional'
      },
      stats: {
        projectsActive: await getStatValue('projects_active', memberId) || 3,
        projectsCompleted: await getStatValue('projects_completed', memberId) || 12,
        tasksAssigned: await getStatValue('tasks_assigned', memberId) || 8,
        tasksCompleted: await getStatValue('tasks_completed', memberId) || 24,
        toolsReserved: await getStatValue('tools_reserved', memberId) || 2,
        coursesInProgress: await getStatValue('courses_in_progress', memberId) || 2,
        coursesCompleted: await getStatValue('courses_completed', memberId) || 8,
        badgesEarned: await getStatValue('badges_earned', memberId) || 5,
        messagesUnread: await getStatValue('messages_unread', memberId) || 3,
        estimatesCreated: await getStatValue('estimates_created', memberId) || 15,
        shopOrders: await getStatValue('shop_orders', memberId) || 4,
        communityPosts: await getStatValue('community_posts', memberId) || 7
      },
      quickActions: [
        {
          id: 'create-estimate',
          title: 'Create Cost Estimate',
          description: 'Use AI-powered tools for accurate project estimates',
          icon: 'Calculator',
          href: '/member/cost-estimator',
          color: 'text-blue-600',
          bgColor: 'bg-blue-100',
          priority: 'high'
        },
        {
          id: 'camera-estimate',
          title: 'Camera Estimate',
          description: 'Get instant estimates using your camera',
          icon: 'Camera',
          href: '/member/project-intelligence/camera',
          color: 'text-green-600',
          bgColor: 'bg-green-100',
          priority: 'high'
        },
        {
          id: 'browse-tools',
          title: 'Browse Tools',
          description: 'Reserve equipment for your projects',
          icon: 'Wrench',
          href: '/member/tools',
          color: 'text-orange-600',
          bgColor: 'bg-orange-100',
          priority: 'medium'
        },
        {
          id: 'view-projects',
          title: 'Project Opportunities',
          description: 'Find new projects to bid on',
          icon: 'Target',
          href: '/member/projects',
          color: 'text-purple-600',
          bgColor: 'bg-purple-100',
          priority: 'high'
        },
        {
          id: 'learning',
          title: 'Continue Learning',
          description: 'Complete courses and earn badges',
          icon: 'BookOpen',
          href: '/member/learning',
          color: 'text-indigo-600',
          bgColor: 'bg-indigo-100',
          priority: 'medium'
        },
        {
          id: 'shop',
          title: 'Member Shop',
          description: 'Browse exclusive member products',
          icon: 'ShoppingBag',
          href: '/member/shop',
          color: 'text-pink-600',
          bgColor: 'bg-pink-100',
          priority: 'low'
        }
      ],
      recentActivity: await getRecentActivity(memberId),
      upcomingDeadlines: await getUpcomingDeadlines(memberId),
      progressTracking: {
        onboardingProgress: engagementScore?.featureScores?.onboarding || 90,
        profileCompletion: memberProfile.completionPercentage || 85,
        monthlyGoals: {
          projectApplications: { current: 3, target: 5 },
          courseCompletions: { current: 1, target: 2 },
          networkingConnections: { current: 8, target: 10 },
          toolUsage: { current: 2, target: 3 }
        }
      }
    };

    return dashboardData;
    
  } catch (error) {
    console.error('Error generating dashboard data:', error);
    throw error;
  }
}

async function getStatValue(statType: string, memberId: string): Promise<number> {
  try {
    // In a real implementation, these would query the database
    // For now, return mock values based on stat type
    const mockValues: Record<string, number> = {
      projects_active: 3,
      projects_completed: 12,
      tasks_assigned: 8,
      tasks_completed: 24,
      tools_reserved: 2,
      courses_in_progress: 2,
      courses_completed: 8,
      badges_earned: 5,
      messages_unread: 3,
      estimates_created: 15,
      shop_orders: 4,
      community_posts: 7
    };
    
    return mockValues[statType] || 0;
  } catch (error) {
    console.error(`Error getting stat value for ${statType}:`, error);
    return 0;
  }
}

async function getRecentActivity(memberId: string) {
  try {
    // In a real implementation, this would query the member journey events
    return [
      {
        id: '1',
        type: 'project',
        title: 'Applied to Downtown Office Renovation',
        description: 'Your bid has been submitted and is under review',
        timestamp: '2 hours ago',
        status: 'pending',
        feature: 'projects',
        href: '/member/projects/123'
      },
      {
        id: '2',
        type: 'course',
        title: 'Completed Advanced Project Management',
        description: 'Certificate available for download',
        timestamp: '1 day ago',
        status: 'completed',
        feature: 'learning',
        href: '/member/learning/certificates'
      },
      {
        id: '3',
        type: 'tool',
        title: 'Tool reservation approved',
        description: 'Excavator CAT 320 reserved for Aug 15-20',
        timestamp: '2 days ago',
        status: 'approved',
        feature: 'tools',
        href: '/member/tools/reservations'
      },
      {
        id: '4',
        type: 'estimate',
        title: 'Cost estimate created',
        description: 'Residential foundation project - $85,000',
        timestamp: '3 days ago',
        status: 'completed',
        feature: 'cost-estimation',
        href: '/member/cost-estimator/estimates/456'
      }
    ];
  } catch (error) {
    console.error('Error getting recent activity:', error);
    return [];
  }
}

async function getUpcomingDeadlines(memberId: string) {
  try {
    // In a real implementation, this would query various deadline sources
    return [
      {
        id: '1',
        title: 'Downtown Office Renovation Bid',
        type: 'project' as const,
        dueDate: '2025-08-20',
        priority: 'high' as const,
        href: '/member/projects/123'
      },
      {
        id: '2',
        title: 'Safety Training Course',
        type: 'course' as const,
        dueDate: '2025-08-25',
        priority: 'medium' as const,
        href: '/member/learning/courses/safety'
      },
      {
        id: '3',
        title: 'Tool Return - Excavator',
        type: 'tool' as const,
        dueDate: '2025-08-20',
        priority: 'high' as const,
        href: '/member/tools/reservations'
      }
    ];
  } catch (error) {
    console.error('Error getting upcoming deadlines:', error);
    return [];
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { action, fromFeature, toFeature, dataType, data, memberId = session.user.id } = body;

    switch (action) {
      case 'share_feature_data':
        if (!fromFeature || !toFeature || !dataType || !data) {
          return NextResponse.json(
            { error: 'Missing required fields for data sharing' },
            { status: 400 }
          );
        }

        await integrationService.shareFeatureData(fromFeature, toFeature, memberId, dataType, data);
        
        return NextResponse.json({
          success: true,
          message: 'Feature data shared successfully'
        });

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Error processing analytics request:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process request',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
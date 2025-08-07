import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { SponsoredLearningService } from '@/lib/services/sponsored-learning.service';
import { ProficiencyBadgesService } from '@/lib/services/proficiency-badges.service';
import { BadgeShopCampaignsService } from '@/lib/services/badge-shop-campaigns.service';

const sponsoredLearningService = new SponsoredLearningService();
const proficiencyBadgesService = new ProficiencyBadgesService();
const badgeShopCampaignsService = new BadgeShopCampaignsService();

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    if (session.user.memberType !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const timeframe = searchParams.get('timeframe') as 'week' | 'month' | 'quarter' | 'year' || 'month';

    // Validate timeframe
    const validTimeframes = ['week', 'month', 'quarter', 'year'];
    if (!validTimeframes.includes(timeframe)) {
      return NextResponse.json(
        { error: 'Invalid timeframe. Must be one of: ' + validTimeframes.join(', ') },
        { status: 400 }
      );
    }

    // Get analytics from all services
    const [
      sponsorPartnerships,
      badgeAnalytics,
      campaignAnalytics,
    ] = await Promise.all([
      sponsoredLearningService.getSponsorPartnerships('ACTIVE'),
      proficiencyBadgesService.getBadgeAnalytics(timeframe),
      badgeShopCampaignsService.getCampaignAnalytics(timeframe),
    ]);

    // Calculate overall learning system metrics
    const totalCourses = sponsorPartnerships.reduce((sum, p) => sum + p.coursesSponsored, 0);
    const totalMembers = sponsorPartnerships.reduce((sum, p) => sum + p.membersTrained, 0);
    const totalRevenue = sponsorPartnerships.reduce((sum, p) => sum + p.totalPartnershipValue, 0);

    const overview = {
      timeframe: {
        period: timeframe,
        startDate: new Date(Date.now() - getTimeframeMs(timeframe)),
        endDate: new Date(),
      },
      sponsorPartnerships: {
        totalPartnerships: sponsorPartnerships.length,
        activePartnerships: sponsorPartnerships.filter(p => p.partnershipStatus === 'ACTIVE').length,
        totalCourses,
        totalMembers,
        totalRevenue,
        partnershipsByType: sponsorPartnerships.reduce((acc, p) => {
          acc[p.partnershipType] = (acc[p.partnershipType] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        topPartners: sponsorPartnerships
          .sort((a, b) => b.totalPartnershipValue - a.totalPartnershipValue)
          .slice(0, 5)
          .map(p => ({
            id: p.id,
            name: p.name,
            value: p.totalPartnershipValue,
            courses: p.coursesSponsored,
            members: p.membersTrained,
          })),
      },
      badges: badgeAnalytics,
      campaigns: campaignAnalytics,
      learningPathways: {
        totalPathways: Object.keys(badgeAnalytics.badgesByCategory).length,
        mostPopularCategory: Object.entries(badgeAnalytics.badgesByCategory)
          .sort(([,a], [,b]) => b - a)[0]?.[0] || 'RESIDENTIAL',
        averageBadgesPerMember: badgeAnalytics.uniqueMembers > 0 
          ? badgeAnalytics.totalBadgesAwarded / badgeAnalytics.uniqueMembers 
          : 0,
      },
      financialImpact: {
        totalLearningRevenue: totalRevenue + campaignAnalytics.totalRevenue,
        memberProjectFunding: campaignAnalytics.fundDistribution.memberProjectFunds,
        namcSupport: campaignAnalytics.fundDistribution.namcSupport,
        sponsorPartnerships: campaignAnalytics.fundDistribution.sponsorPartnerships,
        revenueGrowth: calculateRevenueGrowth(timeframe), // Placeholder
      },
      memberEngagement: {
        totalEngagedMembers: Math.max(badgeAnalytics.uniqueMembers, totalMembers),
        averageCoursesPerMember: totalMembers > 0 ? totalCourses / totalMembers : 0,
        averageBadgesPerMember: badgeAnalytics.uniqueMembers > 0 
          ? badgeAnalytics.totalBadgesAwarded / badgeAnalytics.uniqueMembers 
          : 0,
        campaignEngagement: {
          totalViews: campaignAnalytics.totalViews,
          totalClicks: campaignAnalytics.totalClicks,
          conversionRate: campaignAnalytics.averageConversionRate,
        },
      },
      trends: {
        courseEnrollmentTrend: 'increasing', // Placeholder - would calculate from historical data
        badgeAwardTrend: 'increasing', // Placeholder
        campaignPerformanceTrend: 'stable', // Placeholder
        partnershipGrowthTrend: 'increasing', // Placeholder
      },
    };

    return NextResponse.json({
      success: true,
      data: overview,
    });
  } catch (error) {
    console.error('Error fetching learning analytics overview:', error);
    return NextResponse.json(
      { error: 'Failed to fetch learning analytics overview' },
      { status: 500 }
    );
  }
}

function getTimeframeMs(timeframe: string): number {
  switch (timeframe) {
    case 'week':
      return 7 * 24 * 60 * 60 * 1000;
    case 'month':
      return 30 * 24 * 60 * 60 * 1000;
    case 'quarter':
      return 90 * 24 * 60 * 60 * 1000;
    case 'year':
      return 365 * 24 * 60 * 60 * 1000;
    default:
      return 30 * 24 * 60 * 60 * 1000;
  }
}

function calculateRevenueGrowth(timeframe: string): number {
  // Placeholder function - in a real implementation, this would:
  // 1. Get revenue for current timeframe
  // 2. Get revenue for previous timeframe
  // 3. Calculate percentage growth
  return 15.5; // Placeholder 15.5% growth
}
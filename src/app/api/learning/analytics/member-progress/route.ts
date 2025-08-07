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

    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get('memberId');

    // If memberId is provided, check permissions
    if (memberId && memberId !== session.user.id && session.user.memberType !== 'ADMIN') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const targetMemberId = memberId || session.user.id;

    // Get member's learning progress data
    const [
      enrollments,
      badges,
      campaigns,
      projectFund,
    ] = await Promise.all([
      sponsoredLearningService.getMemberEnrollments(targetMemberId),
      proficiencyBadgesService.getMemberBadges(targetMemberId),
      badgeShopCampaignsService.getMemberCampaigns(targetMemberId),
      badgeShopCampaignsService.getMemberProjectFund(targetMemberId),
    ]);

    // Calculate learning pathway progress
    const categoryProgress = enrollments.reduce((acc, enrollment) => {
      const category = enrollment.course.category;
      if (!acc[category]) {
        acc[category] = {
          enrolled: 0,
          completed: 0,
          inProgress: 0,
          totalTimeSpent: 0,
        };
      }
      
      acc[category].enrolled++;
      if (enrollment.status === 'COMPLETED') {
        acc[category].completed++;
      } else if (enrollment.status === 'IN_PROGRESS') {
        acc[category].inProgress++;
      }
      
      // Add time spent from progress
      if (enrollment.progress && enrollment.progress.length > 0) {
        acc[category].totalTimeSpent += enrollment.progress[0].timeSpent || 0;
      }
      
      return acc;
    }, {} as Record<string, any>);

    // Calculate badge progression
    const badgeProgression = badges.reduce((acc, badge) => {
      const category = badge.category;
      if (!acc[category]) {
        acc[category] = {
          basic: 0,
          intermediate: 0,
          advanced: 0,
          expert: 0,
        };
      }
      
      acc[category][badge.level.toLowerCase()]++;
      return acc;
    }, {} as Record<string, any>);

    // Calculate skill development timeline
    const skillTimeline = [...enrollments, ...badges]
      .sort((a, b) => {
        const dateA = 'enrollmentDate' in a ? a.enrollmentDate : a.earnedDate;
        const dateB = 'enrollmentDate' in b ? b.enrollmentDate : b.earnedDate;
        return new Date(dateA).getTime() - new Date(dateB).getTime();
      })
      .map(item => ({
        date: 'enrollmentDate' in item ? item.enrollmentDate : item.earnedDate,
        type: 'enrollmentDate' in item ? 'course_enrollment' : 'badge_earned',
        title: 'enrollmentDate' in item ? item.course.title : item.badgeName,
        category: 'enrollmentDate' in item ? item.course.category : item.category,
        status: 'enrollmentDate' in item ? item.status : item.verificationStatus,
      }));

    // Calculate achievement metrics
    const achievements = {
      totalCourses: enrollments.length,
      completedCourses: enrollments.filter(e => e.status === 'COMPLETED').length,
      totalBadges: badges.length,
      verifiedBadges: badges.filter(b => b.verificationStatus === 'VERIFIED').length,
      totalTimeSpent: enrollments.reduce((sum, e) => {
        return sum + (e.progress?.[0]?.timeSpent || 0);
      }, 0),
      campaignsTriggered: campaigns.length,
      projectFundBalance: projectFund?.currentBalance || 0,
      projectFundEarned: projectFund?.totalEarned || 0,
    };

    // Calculate learning velocity (achievements per month)
    const firstActivity = skillTimeline[0]?.date;
    const monthsSinceStart = firstActivity 
      ? Math.max(1, Math.ceil((Date.now() - new Date(firstActivity).getTime()) / (30 * 24 * 60 * 60 * 1000)))
      : 1;
    
    const learningVelocity = {
      coursesPerMonth: achievements.totalCourses / monthsSinceStart,
      badgesPerMonth: achievements.totalBadges / monthsSinceStart,
      hoursPerMonth: achievements.totalTimeSpent / 60 / monthsSinceStart,
    };

    // Identify next recommended actions
    const recommendations = {
      nextCourses: [], // Would be populated by recommendation engine
      nextBadges: [], // Would be populated by recommendation engine
      skillGaps: [], // Would be identified by comparing current skills to opportunities
      mentorshipOpportunities: [], // Would be populated by mentorship matching
    };

    const memberProgress = {
      memberId: targetMemberId,
      overview: achievements,
      categoryProgress,
      badgeProgression,
      skillTimeline: skillTimeline.slice(-20), // Last 20 activities
      learningVelocity,
      projectFunding: {
        currentBalance: projectFund?.currentBalance || 0,
        totalEarned: projectFund?.totalEarned || 0,
        totalSpent: projectFund?.totalSpent || 0,
        recentTransactions: projectFund?.transactions?.slice(0, 5) || [],
      },
      campaignPerformance: {
        totalCampaigns: campaigns.length,
        activeCampaigns: campaigns.filter(c => c.status === 'ACTIVE').length,
        totalRevenue: campaigns.reduce((sum, c) => sum + c.totalRevenue, 0),
        totalViews: campaigns.reduce((sum, c) => sum + c.viewCount, 0),
        totalClicks: campaigns.reduce((sum, c) => sum + c.clickCount, 0),
      },
      recommendations,
    };

    return NextResponse.json({
      success: true,
      data: memberProgress,
    });
  } catch (error) {
    console.error('Error fetching member learning progress:', error);
    return NextResponse.json(
      { error: 'Failed to fetch member learning progress' },
      { status: 500 }
    );
  }
}
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { SponsoredLearningService } from '@/lib/services/sponsored-learning.service';
import { ProficiencyBadgesService } from '@/lib/services/proficiency-badges.service';
import { prisma } from '@/lib/prisma';

const sponsoredLearningService = new SponsoredLearningService();
const proficiencyBadgesService = new ProficiencyBadgesService();

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get('memberId') || session.user.id;
    const type = searchParams.get('type'); // 'courses', 'badges', 'opportunities', or 'all'

    // Check if user can access the requested member's recommendations
    if (memberId !== session.user.id && session.user.memberType !== 'ADMIN') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const recommendations: any = {};

    // Get member's current badges and enrollments for context
    const memberBadges = await proficiencyBadgesService.getMemberBadges(memberId);
    const memberEnrollments = await sponsoredLearningService.getMemberEnrollments(memberId);

    const earnedBadgeIds = memberBadges.map(badge => badge.badgeId);
    const enrolledCourseIds = memberEnrollments.map(enrollment => enrollment.courseId);

    if (!type || type === 'courses' || type === 'all') {
      // Recommend courses based on member's interests and missing badges
      const memberCategories = [...new Set(memberBadges.map(badge => badge.category))];
      const recommendedCourses = await sponsoredLearningService.getCoursesByCategory();
      
      // Filter out already enrolled courses and prioritize by member's categories
      const filteredCourses = recommendedCourses
        .filter(course => !enrolledCourseIds.includes(course.id))
        .sort((a, b) => {
          const aInCategory = memberCategories.includes(a.category) ? 1 : 0;
          const bInCategory = memberCategories.includes(b.category) ? 1 : 0;
          return bInCategory - aInCategory;
        })
        .slice(0, 10);

      recommendations.courses = filteredCourses;
    }

    if (!type || type === 'badges' || type === 'all') {
      // Recommend badge pathways based on member's current skill areas
      const memberSkillAreas = [...new Set(memberBadges.map(badge => badge.skillArea))];
      
      // Find badges in similar skill areas that the member doesn't have
      const allBadges = await prisma.proficiencyBadge.findMany({
        where: {
          skillArea: {
            in: memberSkillAreas,
          },
          badgeId: {
            notIn: earnedBadgeIds,
          },
          verificationStatus: 'VERIFIED',
        },
        distinct: ['badgeId'],
        take: 10,
      });

      recommendations.badges = allBadges;
    }

    if (!type || type === 'opportunities' || type === 'all') {
      // Recommend opportunities that the member is close to qualifying for
      const allOpportunities = await prisma.opportunity.findMany({
        where: {
          status: 'Active',
        },
      });

      const qualifiableOpportunities = [];
      
      for (const opportunity of allOpportunities) {
        if (opportunity.requirements) {
          const requiredBadges = JSON.parse(opportunity.requirements);
          if (Array.isArray(requiredBadges) && requiredBadges.length > 0) {
            const badgeCheck = await proficiencyBadgesService.checkBadgeRequirements(
              memberId,
              requiredBadges
            );
            
            // Recommend if member has some but not all required badges
            if (badgeCheck.earnedBadges.length > 0 && !badgeCheck.hasAllRequiredBadges) {
              qualifiableOpportunities.push({
                ...opportunity,
                requirements: requiredBadges,
                earnedBadges: badgeCheck.earnedBadges,
                missingBadges: badgeCheck.missingBadges,
                completionPercentage: (badgeCheck.earnedBadges.length / requiredBadges.length) * 100,
              });
            }
          }
        }
      }

      // Sort by completion percentage (closest to qualifying first)
      qualifiableOpportunities.sort((a, b) => b.completionPercentage - a.completionPercentage);
      
      recommendations.opportunities = qualifiableOpportunities.slice(0, 10);
    }

    if (!type || type === 'mentorship' || type === 'all') {
      // Recommend mentorship connections based on skill gaps
      const memberSkillAreas = [...new Set(memberBadges.map(badge => badge.skillArea))];
      
      // Find potential mentors with advanced badges in member's skill areas
      const potentialMentors = await prisma.proficiencyBadge.findMany({
        where: {
          skillArea: {
            in: memberSkillAreas,
          },
          level: {
            in: ['ADVANCED', 'EXPERT'],
          },
          verificationStatus: 'VERIFIED',
          memberId: {
            not: memberId,
          },
        },
        include: {
          member: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        distinct: ['memberId'],
        take: 5,
      });

      recommendations.mentors = potentialMentors;
    }

    return NextResponse.json({
      success: true,
      data: recommendations,
    });
  } catch (error) {
    console.error('Error fetching learning recommendations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch learning recommendations' },
      { status: 500 }
    );
  }
}
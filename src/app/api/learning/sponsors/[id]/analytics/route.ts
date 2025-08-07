import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { SponsoredLearningService } from '@/lib/services/sponsored-learning.service';
import { prisma } from '@/lib/prisma';

const sponsoredLearningService = new SponsoredLearningService();

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    const timeframe = searchParams.get('timeframe') || 'month';

    // Validate timeframe
    const validTimeframes = ['week', 'month', 'quarter', 'year'];
    if (!validTimeframes.includes(timeframe)) {
      return NextResponse.json(
        { error: 'Invalid timeframe. Must be one of: ' + validTimeframes.join(', ') },
        { status: 400 }
      );
    }

    // Get sponsor partnership details
    const partnership = await prisma.sponsorPartnership.findUnique({
      where: { id: params.id },
      include: {
        sponsoredCourses: {
          include: {
            enrollments: {
              include: {
                member: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                  },
                },
                progress: true,
              },
            },
          },
        },
      },
    });

    if (!partnership) {
      return NextResponse.json({ error: 'Sponsor partnership not found' }, { status: 404 });
    }

    // Calculate date range for timeframe
    const endDate = new Date();
    const startDate = new Date();
    switch (timeframe) {
      case 'week':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case 'quarter':
        startDate.setMonth(startDate.getMonth() - 3);
        break;
      case 'year':
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
    }

    // Filter enrollments by timeframe
    const timeframeEnrollments = partnership.sponsoredCourses.flatMap(course =>
      course.enrollments.filter(enrollment =>
        enrollment.enrollmentDate >= startDate && enrollment.enrollmentDate <= endDate
      )
    );

    // Calculate analytics
    const analytics = {
      partnership: {
        id: partnership.id,
        name: partnership.name,
        partnershipType: partnership.partnershipType,
        status: partnership.partnershipStatus,
        startDate: partnership.partnershipStartDate,
        endDate: partnership.partnershipEndDate,
      },
      timeframe: {
        period: timeframe,
        startDate,
        endDate,
      },
      coursePerformance: {
        totalCourses: partnership.sponsoredCourses.length,
        activeCourses: partnership.sponsoredCourses.filter(course => course.isActive).length,
        totalEnrollments: timeframeEnrollments.length,
        completedEnrollments: timeframeEnrollments.filter(e => e.status === 'COMPLETED').length,
        averageCompletionRate: partnership.sponsoredCourses.length > 0
          ? partnership.sponsoredCourses.reduce((sum, course) => sum + course.completionRate, 0) / partnership.sponsoredCourses.length
          : 0,
        totalRevenue: partnership.sponsoredCourses.reduce((sum, course) => sum + course.totalRevenue, 0),
      },
      memberEngagement: {
        uniqueMembers: new Set(timeframeEnrollments.map(e => e.memberId)).size,
        averageTimeSpent: timeframeEnrollments.length > 0
          ? timeframeEnrollments.reduce((sum, e) => sum + (e.progress?.[0]?.timeSpent || 0), 0) / timeframeEnrollments.length
          : 0,
        membersByCategory: partnership.sponsoredCourses.reduce((acc, course) => {
          acc[course.category] = (acc[course.category] || 0) + course.enrollmentCount;
          return acc;
        }, {} as Record<string, number>),
      },
      financialMetrics: {
        totalPartnershipValue: partnership.totalPartnershipValue,
        revenueSharePercentage: partnership.revenueSharePercentage,
        sponsorRevenue: partnership.sponsoredCourses.reduce((sum, course) =>
          sum + (course.totalRevenue * (course.revenueSharePercentage / 100)), 0
        ),
        namcRevenue: partnership.sponsoredCourses.reduce((sum, course) =>
          sum + (course.totalRevenue * ((100 - course.revenueSharePercentage) / 100)), 0
        ),
      },
      badgeImpact: {
        badgesAwarded: partnership.badgesAwarded,
        badgesByCategory: partnership.sponsoredCourses.reduce((acc, course) => {
          acc[course.category] = (acc[course.category] || 0) + course.completionCount;
          return acc;
        }, {} as Record<string, number>),
      },
      courseBreakdown: partnership.sponsoredCourses.map(course => ({
        id: course.id,
        title: course.title,
        category: course.category,
        enrollmentCount: course.enrollmentCount,
        completionCount: course.completionCount,
        completionRate: course.completionRate,
        averageRating: course.averageRating,
        totalRevenue: course.totalRevenue,
        timeframeEnrollments: course.enrollments.filter(e =>
          e.enrollmentDate >= startDate && e.enrollmentDate <= endDate
        ).length,
      })),
    };

    return NextResponse.json({
      success: true,
      data: analytics,
    });
  } catch (error) {
    console.error('Error fetching sponsor analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sponsor analytics' },
      { status: 500 }
    );
  }
}
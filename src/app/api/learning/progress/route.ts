import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { SponsoredLearningService } from '@/lib/services/sponsored-learning.service';

const sponsoredLearningService = new SponsoredLearningService();

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();

    // Validate required fields
    if (!data.courseId || !data.enrollmentId || data.completionPercentage === undefined || data.timeSpent === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: courseId, enrollmentId, completionPercentage, timeSpent' },
        { status: 400 }
      );
    }

    // Validate completion percentage
    if (data.completionPercentage < 0 || data.completionPercentage > 100) {
      return NextResponse.json(
        { error: 'Completion percentage must be between 0 and 100' },
        { status: 400 }
      );
    }

    // Use session user ID if memberId not provided or if not admin
    const memberId = (data.memberId && session.user.memberType === 'ADMIN') 
      ? data.memberId 
      : session.user.id;

    const progress = await sponsoredLearningService.updateCourseProgress({
      memberId,
      courseId: data.courseId,
      enrollmentId: data.enrollmentId,
      currentModule: data.currentModule,
      completionPercentage: data.completionPercentage,
      modulesCompleted: data.modulesCompleted,
      assessmentScores: data.assessmentScores,
      timeSpent: data.timeSpent,
      strugglingAreas: data.strugglingAreas,
      strengths: data.strengths,
    });

    return NextResponse.json({
      success: true,
      data: progress,
    });
  } catch (error) {
    console.error('Error updating course progress:', error);
    return NextResponse.json(
      { error: 'Failed to update course progress' },
      { status: 500 }
    );
  }
}
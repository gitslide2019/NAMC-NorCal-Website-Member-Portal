import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { SponsoredLearningService } from '@/lib/services/sponsored-learning.service';

const sponsoredLearningService = new SponsoredLearningService();

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get('memberId') || session.user.id;
    const status = searchParams.get('status');

    // Check if user can access the requested member's enrollments
    if (memberId !== session.user.id && session.user.memberType !== 'ADMIN') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const enrollments = await sponsoredLearningService.getMemberEnrollments(
      memberId,
      status || undefined
    );

    return NextResponse.json({
      success: true,
      data: enrollments,
    });
  } catch (error) {
    console.error('Error fetching enrollments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch enrollments' },
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

    const data = await request.json();

    // Validate required fields
    if (!data.courseId) {
      return NextResponse.json(
        { error: 'Missing required field: courseId' },
        { status: 400 }
      );
    }

    // Use session user ID if memberId not provided or if not admin
    const memberId = (data.memberId && session.user.memberType === 'ADMIN') 
      ? data.memberId 
      : session.user.id;

    const enrollment = await sponsoredLearningService.enrollMemberInCourse({
      memberId,
      courseId: data.courseId,
      accessExpirationDate: data.accessExpirationDate ? new Date(data.accessExpirationDate) : undefined,
    });

    return NextResponse.json({
      success: true,
      data: enrollment,
    });
  } catch (error) {
    console.error('Error creating enrollment:', error);
    if (error instanceof Error && error.message === 'Member is already enrolled in this course') {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    return NextResponse.json(
      { error: 'Failed to create enrollment' },
      { status: 500 }
    );
  }
}
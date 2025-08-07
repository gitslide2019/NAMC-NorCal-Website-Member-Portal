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

    // Check if user is admin
    if (session.user.memberType !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const data = await request.json();

    // Validate required fields
    if (!data.courseId || data.totalRevenue === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: courseId, totalRevenue' },
        { status: 400 }
      );
    }

    // Validate revenue amount
    if (data.totalRevenue < 0) {
      return NextResponse.json(
        { error: 'Total revenue must be a positive number' },
        { status: 400 }
      );
    }

    const revenueSharing = await sponsoredLearningService.calculateRevenueSharing(
      data.courseId,
      data.totalRevenue
    );

    return NextResponse.json({
      success: true,
      data: revenueSharing,
    });
  } catch (error) {
    console.error('Error calculating revenue sharing:', error);
    if (error instanceof Error && error.message === 'Course not found') {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }
    return NextResponse.json(
      { error: 'Failed to calculate revenue sharing' },
      { status: 500 }
    );
  }
}
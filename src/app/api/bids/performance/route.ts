import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { BidPerformanceTrackingService } from '@/lib/services/bid-performance-tracking.service';

const performanceService = new BidPerformanceTrackingService();

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const metrics = await performanceService.getPerformanceMetrics(session.user.id);

    return NextResponse.json({
      success: true,
      data: metrics,
    });

  } catch (error) {
    console.error('Error fetching performance metrics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch performance metrics' },
      { status: 500 }
    );
  }
}
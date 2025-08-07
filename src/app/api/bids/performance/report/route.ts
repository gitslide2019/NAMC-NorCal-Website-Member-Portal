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

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') as 'MONTHLY' | 'QUARTERLY' | 'YEARLY' || 'MONTHLY';

    const report = await performanceService.generatePerformanceReport(session.user.id, period);

    return NextResponse.json({
      success: true,
      data: report,
    });

  } catch (error) {
    console.error('Error generating performance report:', error);
    return NextResponse.json(
      { error: 'Failed to generate performance report' },
      { status: 500 }
    );
  }
}
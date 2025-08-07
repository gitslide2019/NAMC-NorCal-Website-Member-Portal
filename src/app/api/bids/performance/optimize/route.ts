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

    const optimization = await performanceService.optimizeBiddingStrategy(session.user.id);

    return NextResponse.json({
      success: true,
      data: optimization,
    });

  } catch (error) {
    console.error('Error optimizing bidding strategy:', error);
    return NextResponse.json(
      { error: 'Failed to optimize bidding strategy' },
      { status: 500 }
    );
  }
}
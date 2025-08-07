import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { BidPerformanceTrackingService, BidOutcomeData } from '@/lib/services/bid-performance-tracking.service';

const performanceService = new BidPerformanceTrackingService();

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const outcomeData: BidOutcomeData = body;

    if (!outcomeData.bidId || !outcomeData.actualOutcome) {
      return NextResponse.json(
        { error: 'Missing required fields: bidId and actualOutcome' },
        { status: 400 }
      );
    }

    await performanceService.updateBidOutcome(session.user.id, outcomeData);

    return NextResponse.json({
      success: true,
      message: 'Bid outcome updated successfully',
    });

  } catch (error) {
    console.error('Error updating bid outcome:', error);
    return NextResponse.json(
      { error: 'Failed to update bid outcome' },
      { status: 500 }
    );
  }
}
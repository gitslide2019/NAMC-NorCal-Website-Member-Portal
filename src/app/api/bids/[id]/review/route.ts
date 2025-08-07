import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { AIBidReviewerService, BidReviewRequest } from '@/lib/services/ai-bid-reviewer.service';

const bidReviewerService = new AIBidReviewerService();

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const reviewRequest: BidReviewRequest = {
      bidId: params.id,
      reviewType: body.reviewType || 'AI_GENERATED',
      focusAreas: body.focusAreas,
      includeMarketAnalysis: body.includeMarketAnalysis !== false,
      includeRiskAssessment: body.includeRiskAssessment !== false,
      includeCompetitiveAnalysis: body.includeCompetitiveAnalysis !== false,
    };

    const reviewResult = await bidReviewerService.reviewBid(session.user.id, reviewRequest);

    return NextResponse.json({
      success: true,
      data: reviewResult,
    });

  } catch (error) {
    console.error('Error reviewing bid:', error);
    return NextResponse.json(
      { error: 'Failed to review bid' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const reviews = await bidReviewerService.getBidReviews(params.id);

    return NextResponse.json({
      success: true,
      data: reviews,
    });

  } catch (error) {
    console.error('Error fetching bid reviews:', error);
    return NextResponse.json(
      { error: 'Failed to fetch bid reviews' },
      { status: 500 }
    );
  }
}
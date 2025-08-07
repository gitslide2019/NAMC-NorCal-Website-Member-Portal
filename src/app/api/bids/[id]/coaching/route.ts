import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { AIBidReviewerService } from '@/lib/services/ai-bid-reviewer.service';

const bidReviewerService = new AIBidReviewerService();

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

    const coaching = await bidReviewerService.generateBidCoaching(session.user.id, params.id);

    return NextResponse.json({
      success: true,
      data: coaching,
    });

  } catch (error) {
    console.error('Error generating bid coaching:', error);
    return NextResponse.json(
      { error: 'Failed to generate bid coaching' },
      { status: 500 }
    );
  }
}
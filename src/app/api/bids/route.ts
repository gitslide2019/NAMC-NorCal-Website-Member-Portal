import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { AIBidGeneratorService, ProjectSpecification, BidGenerationOptions } from '@/lib/services/ai-bid-generator.service';

const bidGeneratorService = new AIBidGeneratorService();

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
    const status = searchParams.get('status');

    const bids = await bidGeneratorService.getBidsByMember(session.user.id, status || undefined);

    return NextResponse.json({
      success: true,
      data: bids,
    });

  } catch (error) {
    console.error('Error fetching bids:', error);
    return NextResponse.json(
      { error: 'Failed to fetch bids' },
      { status: 500 }
    );
  }
}

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
    const { projectSpec, bidAnalysis, options = {} }: { 
      projectSpec: ProjectSpecification; 
      bidAnalysis: any;
      options?: BidGenerationOptions;
    } = body;

    // Validate required fields
    if (!projectSpec.projectName || !bidAnalysis.totalBidAmount) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Save bid
    const bidId = await bidGeneratorService.saveBid(
      session.user.id,
      projectSpec,
      bidAnalysis,
      options
    );

    return NextResponse.json({
      success: true,
      data: { bidId },
    });

  } catch (error) {
    console.error('Error saving bid:', error);
    return NextResponse.json(
      { error: 'Failed to save bid' },
      { status: 500 }
    );
  }
}
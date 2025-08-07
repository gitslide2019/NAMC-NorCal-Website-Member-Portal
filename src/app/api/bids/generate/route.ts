import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { AIBidGeneratorService, ProjectSpecification, BidGenerationOptions } from '@/lib/services/ai-bid-generator.service';

const bidGeneratorService = new AIBidGeneratorService();

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
    const { projectSpec, options = {} }: { 
      projectSpec: ProjectSpecification; 
      options?: BidGenerationOptions;
    } = body;

    // Validate required fields
    if (!projectSpec.projectName || !projectSpec.projectType || !projectSpec.location) {
      return NextResponse.json(
        { error: 'Missing required project specification fields' },
        { status: 400 }
      );
    }

    // Generate bid analysis
    const bidAnalysis = await bidGeneratorService.generateBid(
      session.user.id,
      projectSpec,
      options
    );

    return NextResponse.json({
      success: true,
      data: bidAnalysis,
    });

  } catch (error) {
    console.error('Error generating bid:', error);
    return NextResponse.json(
      { error: 'Failed to generate bid analysis' },
      { status: 500 }
    );
  }
}
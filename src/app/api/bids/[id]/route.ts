import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { AIBidGeneratorService } from '@/lib/services/ai-bid-generator.service';

const bidGeneratorService = new AIBidGeneratorService();

export async function PUT(
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
    const { status, outcome, actualProjectValue } = body;

    if (!status) {
      return NextResponse.json(
        { error: 'Status is required' },
        { status: 400 }
      );
    }

    await bidGeneratorService.updateBidStatus(
      params.id,
      status,
      outcome,
      actualProjectValue
    );

    return NextResponse.json({
      success: true,
      message: 'Bid status updated successfully',
    });

  } catch (error) {
    console.error('Error updating bid status:', error);
    return NextResponse.json(
      { error: 'Failed to update bid status' },
      { status: 500 }
    );
  }
}
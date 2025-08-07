import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { OCRBusinessCardService } from '@/lib/services/ocr-business-card.service';

const ocrService = new OCRBusinessCardService();

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

    const businessCard = await ocrService.getBusinessCard(params.id);

    if (!businessCard) {
      return NextResponse.json(
        { error: 'Business card not found' },
        { status: 404 }
      );
    }

    // Check if user owns this business card
    if (businessCard.scannedBy !== session.user.id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Get processing logs
    const logs = await ocrService.getProcessingLogs(params.id);

    return NextResponse.json({
      success: true,
      businessCard,
      logs,
    });

  } catch (error) {
    console.error('Error fetching business card:', error);
    return NextResponse.json(
      { error: 'Failed to fetch business card' },
      { status: 500 }
    );
  }
}

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

    const updates = await request.json();

    // Get existing business card to check ownership
    const existingCard = await ocrService.getBusinessCard(params.id);
    
    if (!existingCard) {
      return NextResponse.json(
        { error: 'Business card not found' },
        { status: 404 }
      );
    }

    if (existingCard.scannedBy !== session.user.id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    const updatedCard = await ocrService.updateBusinessCard(params.id, updates);

    return NextResponse.json({
      success: true,
      businessCard: updatedCard,
    });

  } catch (error) {
    console.error('Error updating business card:', error);
    return NextResponse.json(
      { error: 'Failed to update business card' },
      { status: 500 }
    );
  }
}

export async function DELETE(
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

    // Get existing business card to check ownership
    const existingCard = await ocrService.getBusinessCard(params.id);
    
    if (!existingCard) {
      return NextResponse.json(
        { error: 'Business card not found' },
        { status: 404 }
      );
    }

    if (existingCard.scannedBy !== session.user.id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    await ocrService.deleteBusinessCard(params.id);

    return NextResponse.json({
      success: true,
      message: 'Business card deleted successfully',
    });

  } catch (error) {
    console.error('Error deleting business card:', error);
    return NextResponse.json(
      { error: 'Failed to delete business card' },
      { status: 500 }
    );
  }
}
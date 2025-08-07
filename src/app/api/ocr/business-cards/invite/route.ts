import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { OCRBusinessCardService } from '@/lib/services/ocr-business-card.service';

const ocrService = new OCRBusinessCardService();

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { businessCardId } = await request.json();

    if (!businessCardId) {
      return NextResponse.json(
        { error: 'Business card ID is required' },
        { status: 400 }
      );
    }

    // Verify ownership
    const businessCard = await ocrService.getBusinessCard(businessCardId);
    if (!businessCard || businessCard.scannedBy !== session.user.id) {
      return NextResponse.json(
        { error: 'Business card not found or access denied' },
        { status: 404 }
      );
    }

    const result = await ocrService.inviteToMembership(businessCardId);

    return NextResponse.json({
      success: result.success,
      message: result.success 
        ? 'Membership invitation sent successfully'
        : result.error,
    });

  } catch (error) {
    console.error('Error inviting contact to membership:', error);
    return NextResponse.json(
      { error: 'Failed to send membership invitation' },
      { status: 500 }
    );
  }
}
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { OCRBusinessCardService } from '@/lib/services/ocr-business-card.service';

const ocrService = new OCRBusinessCardService();

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const businessCards = await ocrService.getMemberBusinessCards(session.user.id);

    return NextResponse.json({
      success: true,
      businessCards,
    });

  } catch (error) {
    console.error('Error fetching business cards:', error);
    return NextResponse.json(
      { error: 'Failed to fetch business cards' },
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

    const { businessCardId, verifiedData } = await request.json();

    if (!businessCardId) {
      return NextResponse.json(
        { error: 'Business card ID is required' },
        { status: 400 }
      );
    }

    // Create contact from business card
    const result = await ocrService.createContactFromBusinessCard(
      businessCardId,
      verifiedData
    );

    return NextResponse.json({
      success: result.success,
      result,
    });

  } catch (error) {
    console.error('Error creating contact from business card:', error);
    return NextResponse.json(
      { error: 'Failed to create contact' },
      { status: 500 }
    );
  }
}
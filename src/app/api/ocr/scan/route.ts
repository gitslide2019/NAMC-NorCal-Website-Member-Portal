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

    const formData = await request.formData();
    const file = formData.get('image') as File;
    
    if (!file) {
      return NextResponse.json(
        { error: 'No image file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'Invalid file type. Please upload an image.' },
        { status: 400 }
      );
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 10MB.' },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Process the business card
    const businessCard = await ocrService.processBusinessCardImage(
      buffer,
      session.user.id,
      undefined // imageUrl would be set after uploading to storage
    );

    return NextResponse.json({
      success: true,
      businessCard,
    });

  } catch (error) {
    console.error('OCR scan error:', error);
    return NextResponse.json(
      { error: 'Failed to process business card' },
      { status: 500 }
    );
  }
}
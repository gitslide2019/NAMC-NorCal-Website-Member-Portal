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

    const { 
      businessCardId, 
      taskType = 'follow_up',
      dueDate 
    } = await request.json();

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

    const result = await ocrService.createNetworkingTask(
      businessCardId,
      session.user.id,
      taskType,
      dueDate ? new Date(dueDate) : undefined
    );

    return NextResponse.json({
      success: result.success,
      taskId: result.taskId,
      message: result.success 
        ? 'Networking task created successfully'
        : result.error,
    });

  } catch (error) {
    console.error('Error creating networking task:', error);
    return NextResponse.json(
      { error: 'Failed to create networking task' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const opportunities = await ocrService.getNetworkingOpportunities(session.user.id);

    return NextResponse.json({
      success: true,
      opportunities,
    });

  } catch (error) {
    console.error('Error fetching networking opportunities:', error);
    return NextResponse.json(
      { error: 'Failed to fetch networking opportunities' },
      { status: 500 }
    );
  }
}
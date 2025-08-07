import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { BidPerformanceTrackingService } from '@/lib/services/bid-performance-tracking.service';

const performanceService = new BidPerformanceTrackingService();

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
    const projectType = searchParams.get('projectType');

    const templates = await performanceService.getBidTemplates(
      session.user.id, 
      projectType || undefined
    );

    return NextResponse.json({
      success: true,
      data: templates,
    });

  } catch (error) {
    console.error('Error fetching bid templates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch bid templates' },
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
    const templateData = body;

    if (!templateData.name || !templateData.projectType) {
      return NextResponse.json(
        { error: 'Missing required fields: name and projectType' },
        { status: 400 }
      );
    }

    const templateId = await performanceService.createBidTemplate(session.user.id, templateData);

    return NextResponse.json({
      success: true,
      data: { templateId },
    });

  } catch (error) {
    console.error('Error creating bid template:', error);
    return NextResponse.json(
      { error: 'Failed to create bid template' },
      { status: 500 }
    );
  }
}
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { CrossFeatureIntegrationService } from '@/lib/services/cross-feature-integration.service';

const integrationService = new CrossFeatureIntegrationService();

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get('memberId') || session.user.id;

    // Calculate engagement score
    const engagementScore = await integrationService.calculateEngagementScore(memberId);

    return NextResponse.json({
      success: true,
      engagement: engagementScore
    });

  } catch (error) {
    console.error('Error calculating engagement score:', error);
    return NextResponse.json(
      { 
        error: 'Failed to calculate engagement score',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { 
      feature, 
      action, 
      metadata,
      memberId = session.user.id 
    } = body;

    if (!feature || !action) {
      return NextResponse.json(
        { error: 'Feature and action are required' },
        { status: 400 }
      );
    }

    // Track member journey event
    await integrationService.trackMemberJourney({
      memberId,
      feature,
      action,
      timestamp: new Date(),
      metadata
    });

    return NextResponse.json({
      success: true,
      message: 'Activity tracked successfully'
    });

  } catch (error) {
    console.error('Error tracking member activity:', error);
    return NextResponse.json(
      { 
        error: 'Failed to track activity',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
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

    // Generate cross-feature recommendations
    const recommendations = await integrationService.generateRecommendations(memberId);

    return NextResponse.json({
      success: true,
      recommendations,
      generatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error generating recommendations:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate recommendations',
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
    const { action, memberId = session.user.id } = body;

    switch (action) {
      case 'refresh_recommendations':
        const recommendations = await integrationService.generateRecommendations(memberId);
        return NextResponse.json({
          success: true,
          recommendations
        });

      case 'track_recommendation_click':
        const { recommendationType, recommendationId } = body;
        await integrationService.trackMemberJourney({
          memberId,
          feature: 'recommendations',
          action: 'click_recommendation',
          timestamp: new Date(),
          metadata: {
            type: recommendationType,
            id: recommendationId
          }
        });
        
        return NextResponse.json({
          success: true,
          message: 'Recommendation click tracked'
        });

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Error processing recommendation request:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process request',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
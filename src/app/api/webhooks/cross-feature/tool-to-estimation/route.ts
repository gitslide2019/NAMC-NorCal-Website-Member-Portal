/**
 * Cross-Feature Webhook: Tool Reservation to Cost Estimation
 * 
 * Handles the bridge between tool lending and cost estimation features
 * Suggests cost estimation when members reserve tools
 */

import { NextRequest, NextResponse } from 'next/server';
import { CrossFeatureIntegrationService } from '@/lib/services/cross-feature-integration.service';

const crossFeatureService = new CrossFeatureIntegrationService();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { memberId, toolReservationId, toolCategory, projectType } = body;

    if (!memberId || !toolReservationId) {
      return NextResponse.json(
        { error: 'Missing required fields: memberId, toolReservationId' },
        { status: 400 }
      );
    }

    // Track the cross-feature journey event
    await crossFeatureService.trackMemberJourney({
      memberId,
      feature: 'cross-feature-bridge',
      action: 'tool-to-estimation-trigger',
      timestamp: new Date(),
      metadata: {
        toolReservationId,
        toolCategory,
        projectType,
        triggerSource: 'tool-lending'
      }
    });

    // Share data between features
    await crossFeatureService.shareFeatureData(
      'tool-lending',
      'cost-estimation',
      memberId,
      'tool-reservation',
      {
        reservationId: toolReservationId,
        toolCategory,
        projectType,
        suggestedAction: 'create-estimate'
      }
    );

    // Generate personalized recommendations
    const recommendations = await crossFeatureService.generateRecommendations(memberId);
    const costEstimationRecommendations = recommendations.filter(r => 
      r.featureSource === 'tool-lending' && r.type === 'project'
    );

    console.log(`Cross-feature bridge activated: Tool reservation ${toolReservationId} -> Cost estimation for member ${memberId}`);

    return NextResponse.json({
      success: true,
      bridgeActivated: true,
      recommendations: costEstimationRecommendations,
      nextActions: [
        {
          feature: 'cost-estimation',
          action: 'create-estimate',
          url: '/member/cost-estimator',
          priority: 'high'
        }
      ]
    });

  } catch (error) {
    console.error('Cross-feature tool-to-estimation webhook error:', error);
    return NextResponse.json(
      { error: 'Failed to process cross-feature bridge' },
      { status: 500 }
    );
  }
}
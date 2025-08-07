/**
 * Cross-Feature Webhook: Cost Estimation to Growth Plan Integration
 * 
 * Updates growth plan when member creates cost estimates
 * Tracks business development progress
 */

import { NextRequest, NextResponse } from 'next/server';
import { CrossFeatureIntegrationService } from '@/lib/services/cross-feature-integration.service';

const crossFeatureService = new CrossFeatureIntegrationService();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { memberId, costEstimateId, projectValue, projectType, confidence } = body;

    if (!memberId || !costEstimateId) {
      return NextResponse.json(
        { error: 'Missing required fields: memberId, costEstimateId' },
        { status: 400 }
      );
    }

    // Track the cross-feature journey event
    await crossFeatureService.trackMemberJourney({
      memberId,
      feature: 'cross-feature-bridge',
      action: 'estimation-to-growth-trigger',
      timestamp: new Date(),
      metadata: {
        costEstimateId,
        projectValue,
        projectType,
        confidence,
        triggerSource: 'cost-estimation'
      }
    });

    // Share data with growth plan feature
    await crossFeatureService.shareFeatureData(
      'cost-estimation',
      'growth-plan',
      memberId,
      'cost-estimate',
      {
        estimateId: costEstimateId,
        projectValue,
        projectType,
        confidence,
        businessMetrics: {
          estimationActivity: 'active',
          projectPipeline: projectValue,
          skillDemonstration: projectType
        }
      }
    );

    // Update member engagement score
    const engagementScore = await crossFeatureService.calculateEngagementScore(memberId);

    console.log(`Cross-feature bridge activated: Cost estimate ${costEstimateId} -> Growth plan update for member ${memberId}`);

    return NextResponse.json({
      success: true,
      bridgeActivated: true,
      growthPlanUpdated: true,
      engagementScore: engagementScore.overallScore,
      businessInsights: {
        estimationCapability: confidence > 80 ? 'advanced' : 'developing',
        projectScale: projectValue > 50000 ? 'large' : projectValue > 10000 ? 'medium' : 'small',
        growthIndicators: [
          'Active cost estimation',
          'Project pipeline development',
          'Professional tool usage'
        ]
      }
    });

  } catch (error) {
    console.error('Cross-feature estimation-to-growth webhook error:', error);
    return NextResponse.json(
      { error: 'Failed to process cross-feature bridge' },
      { status: 500 }
    );
  }
}
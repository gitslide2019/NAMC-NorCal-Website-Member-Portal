/**
 * Cross-Feature Webhook: Learning Badge to Shop Campaign Trigger
 * 
 * Triggers shop campaigns when members earn badges
 * Creates personalized product recommendations and funding opportunities
 */

import { NextRequest, NextResponse } from 'next/server';
import { CrossFeatureIntegrationService } from '@/lib/services/cross-feature-integration.service';

const crossFeatureService = new CrossFeatureIntegrationService();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { memberId, badgeId, badgeName, category, skillArea, level } = body;

    if (!memberId || !badgeId) {
      return NextResponse.json(
        { error: 'Missing required fields: memberId, badgeId' },
        { status: 400 }
      );
    }

    // Track the cross-feature journey event
    await crossFeatureService.trackMemberJourney({
      memberId,
      feature: 'cross-feature-bridge',
      action: 'badge-to-shop-trigger',
      timestamp: new Date(),
      metadata: {
        badgeId,
        badgeName,
        category,
        skillArea,
        level,
        triggerSource: 'learning'
      }
    });

    // Share data with shop feature
    await crossFeatureService.shareFeatureData(
      'learning',
      'shop',
      memberId,
      'badge-earned',
      {
        badgeId,
        badgeName,
        category,
        skillArea,
        level,
        campaignTrigger: true,
        fundingEligible: true
      }
    );

    // Generate badge-specific shop campaign
    const campaignData = {
      campaignType: 'badge-achievement',
      badgeCategory: category,
      skillArea,
      level,
      discountPercentage: level === 'advanced' ? 20 : level === 'intermediate' ? 15 : 10,
      fundingAllocation: {
        memberProjectFund: 40, // 40% to member's project fund
        namcSupport: 35,       // 35% to NAMC operational support
        sponsorPartnership: 25  // 25% to sponsor partnership programs
      },
      duration: 30, // 30 days
      products: getBadgeRelatedProducts(category, skillArea)
    };

    console.log(`Cross-feature bridge activated: Badge ${badgeId} -> Shop campaign for member ${memberId}`);

    return NextResponse.json({
      success: true,
      bridgeActivated: true,
      campaignCreated: true,
      campaignData,
      fundingOpportunity: {
        available: true,
        potentialFunding: calculatePotentialFunding(level, category),
        allocationBreakdown: campaignData.fundingAllocation
      },
      nextActions: [
        {
          feature: 'shop',
          action: 'view-campaign',
          url: `/member/shop?campaign=badge-${badgeId}`,
          priority: 'high'
        },
        {
          feature: 'projects',
          action: 'apply-funding',
          url: '/member/projects/funding',
          priority: 'medium'
        }
      ]
    });

  } catch (error) {
    console.error('Cross-feature badge-to-shop webhook error:', error);
    return NextResponse.json(
      { error: 'Failed to process cross-feature bridge' },
      { status: 500 }
    );
  }
}

/**
 * Get products related to earned badge
 */
function getBadgeRelatedProducts(category: string, skillArea: string): string[] {
  const productMap: Record<string, string[]> = {
    'residential': ['residential-tools', 'home-construction-guides', 'residential-safety-equipment'],
    'commercial': ['commercial-tools', 'project-management-software', 'commercial-safety-gear'],
    'industrial': ['industrial-equipment', 'heavy-machinery-guides', 'industrial-safety-systems'],
    'business-development': ['business-books', 'marketing-materials', 'professional-development-courses']
  };

  return productMap[category] || ['general-construction-tools', 'professional-development'];
}

/**
 * Calculate potential funding based on badge level and category
 */
function calculatePotentialFunding(level: string, category: string): number {
  const baseAmounts: Record<string, number> = {
    'beginner': 100,
    'intermediate': 250,
    'advanced': 500,
    'expert': 1000
  };

  const categoryMultipliers: Record<string, number> = {
    'residential': 1.0,
    'commercial': 1.5,
    'industrial': 2.0,
    'business-development': 1.2
  };

  const baseAmount = baseAmounts[level] || 100;
  const multiplier = categoryMultipliers[category] || 1.0;

  return Math.round(baseAmount * multiplier);
}
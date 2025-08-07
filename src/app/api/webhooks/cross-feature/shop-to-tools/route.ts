/**
 * Cross-Feature Webhook: Shop Purchase to Tool Lending Suggestion
 * 
 * Suggests tool lending when members purchase related items
 * Creates synergy between shop purchases and tool usage
 */

import { NextRequest, NextResponse } from 'next/server';
import { CrossFeatureIntegrationService } from '@/lib/services/cross-feature-integration.service';

const crossFeatureService = new CrossFeatureIntegrationService();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { memberId, orderId, items, totalAmount, orderDate } = body;

    if (!memberId || !orderId) {
      return NextResponse.json(
        { error: 'Missing required fields: memberId, orderId' },
        { status: 400 }
      );
    }

    // Track the cross-feature journey event
    await crossFeatureService.trackMemberJourney({
      memberId,
      feature: 'cross-feature-bridge',
      action: 'shop-to-tools-trigger',
      timestamp: new Date(),
      metadata: {
        orderId,
        items,
        totalAmount,
        orderDate,
        triggerSource: 'shop'
      }
    });

    // Analyze purchased items to suggest related tools
    const toolSuggestions = analyzeItemsForToolSuggestions(items);

    // Share data with tool lending feature
    await crossFeatureService.shareFeatureData(
      'shop',
      'tool-lending',
      memberId,
      'purchase-analysis',
      {
        orderId,
        purchasedItems: items,
        totalAmount,
        toolSuggestions,
        suggestedAction: 'browse-tools'
      }
    );

    console.log(`Cross-feature bridge activated: Shop order ${orderId} -> Tool suggestions for member ${memberId}`);

    return NextResponse.json({
      success: true,
      bridgeActivated: true,
      toolSuggestions,
      synergies: calculatePurchaseToolSynergies(items),
      costSavings: {
        potentialSavings: calculatePotentialSavings(toolSuggestions),
        memberBenefit: 'Access professional tools without purchase cost',
        recommendation: 'Consider tool lending for complementary equipment'
      },
      nextActions: [
        {
          feature: 'tool-lending',
          action: 'browse-suggested-tools',
          url: `/member/tools?category=${toolSuggestions[0]?.category}`,
          priority: 'medium'
        },
        {
          feature: 'tool-lending',
          action: 'reserve-tool',
          url: '/member/tools/reserve',
          priority: 'low'
        }
      ]
    });

  } catch (error) {
    console.error('Cross-feature shop-to-tools webhook error:', error);
    return NextResponse.json(
      { error: 'Failed to process cross-feature bridge' },
      { status: 500 }
    );
  }
}

/**
 * Analyze purchased items to suggest related tools
 */
function analyzeItemsForToolSuggestions(items: any[]): any[] {
  const suggestions: any[] = [];

  for (const item of items) {
    const itemCategory = item.category?.toLowerCase() || '';
    const itemName = item.name?.toLowerCase() || '';

    // Safety equipment -> Safety tools
    if (itemCategory.includes('safety') || itemName.includes('safety')) {
      suggestions.push({
        category: 'safety-equipment',
        tools: ['Safety Harnesses', 'Fall Protection Systems', 'Gas Monitors'],
        reason: 'Complement your safety equipment purchase'
      });
    }

    // Construction materials -> Construction tools
    if (itemCategory.includes('material') || itemName.includes('lumber') || itemName.includes('concrete')) {
      suggestions.push({
        category: 'construction-tools',
        tools: ['Circular Saws', 'Concrete Mixers', 'Material Hoists'],
        reason: 'Tools for working with your purchased materials'
      });
    }

    // Electrical supplies -> Electrical tools
    if (itemCategory.includes('electrical') || itemName.includes('wire') || itemName.includes('electrical')) {
      suggestions.push({
        category: 'electrical-tools',
        tools: ['Wire Strippers', 'Multimeters', 'Conduit Benders'],
        reason: 'Professional electrical tools for your project'
      });
    }

    // Plumbing supplies -> Plumbing tools
    if (itemCategory.includes('plumbing') || itemName.includes('pipe') || itemName.includes('plumbing')) {
      suggestions.push({
        category: 'plumbing-tools',
        tools: ['Pipe Cutters', 'Drain Snakes', 'Pressure Testing Equipment'],
        reason: 'Professional plumbing tools for installation'
      });
    }

    // General construction -> Power tools
    if (itemCategory.includes('construction') || itemCategory.includes('building')) {
      suggestions.push({
        category: 'power-tools',
        tools: ['Impact Drivers', 'Angle Grinders', 'Reciprocating Saws'],
        reason: 'Power tools to enhance your construction work'
      });
    }
  }

  // Remove duplicates and limit suggestions
  const uniqueSuggestions = suggestions.filter((suggestion, index, self) =>
    index === self.findIndex(s => s.category === suggestion.category)
  );

  return uniqueSuggestions.slice(0, 3); // Limit to top 3 suggestions
}

/**
 * Calculate synergies between purchases and tool lending
 */
function calculatePurchaseToolSynergies(items: any[]): any {
  const synergies = {
    materialToolPairs: 0,
    safetyCompliance: 0,
    efficiencyGains: 0,
    costOptimization: 0
  };

  for (const item of items) {
    const itemCategory = item.category?.toLowerCase() || '';
    
    if (itemCategory.includes('material')) synergies.materialToolPairs++;
    if (itemCategory.includes('safety')) synergies.safetyCompliance++;
    if (itemCategory.includes('efficiency') || itemCategory.includes('productivity')) synergies.efficiencyGains++;
  }

  synergies.costOptimization = Math.min(synergies.materialToolPairs + synergies.efficiencyGains, 5);

  return synergies;
}

/**
 * Calculate potential cost savings from tool lending vs purchase
 */
function calculatePotentialSavings(toolSuggestions: any[]): number {
  let totalSavings = 0;

  const averageToolCosts: Record<string, number> = {
    'safety-equipment': 500,
    'construction-tools': 800,
    'electrical-tools': 600,
    'plumbing-tools': 400,
    'power-tools': 1200
  };

  const dailyRentalRates: Record<string, number> = {
    'safety-equipment': 25,
    'construction-tools': 40,
    'electrical-tools': 30,
    'plumbing-tools': 20,
    'power-tools': 60
  };

  for (const suggestion of toolSuggestions) {
    const purchaseCost = averageToolCosts[suggestion.category] || 500;
    const rentalCost = (dailyRentalRates[suggestion.category] || 30) * 7; // 7-day rental
    
    totalSavings += Math.max(0, purchaseCost - rentalCost);
  }

  return Math.round(totalSavings);
}
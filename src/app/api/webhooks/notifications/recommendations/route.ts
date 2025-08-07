/**
 * Personalized Feature Recommendations Notifications
 * 
 * Send personalized feature recommendations based on member behavior
 * Uses AI-driven insights to suggest relevant features and actions
 */

import { NextRequest, NextResponse } from 'next/server';
import { CrossFeatureIntegrationService } from '@/lib/services/cross-feature-integration.service';

const crossFeatureService = new CrossFeatureIntegrationService();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { memberId, recommendationScore, triggerEvent, context } = body;

    if (!memberId) {
      return NextResponse.json(
        { error: 'Missing required field: memberId' },
        { status: 400 }
      );
    }

    // Generate personalized recommendations
    const recommendations = await crossFeatureService.generateRecommendations(memberId);
    const memberProfile = await crossFeatureService.getMemberProfile(memberId);
    const engagementScore = await crossFeatureService.calculateEngagementScore(memberId);

    // Filter and prioritize recommendations
    const prioritizedRecommendations = prioritizeRecommendations(
      recommendations,
      engagementScore,
      triggerEvent,
      context
    );

    // Track the recommendation notification event
    await crossFeatureService.trackMemberJourney({
      memberId,
      feature: 'notifications',
      action: 'personalized-recommendations',
      timestamp: new Date(),
      metadata: {
        recommendationScore,
        triggerEvent,
        context,
        recommendationCount: prioritizedRecommendations.length,
        topRecommendation: prioritizedRecommendations[0]?.type
      }
    });

    // Generate notification content
    const notificationContent = generateRecommendationNotification(
      memberProfile,
      prioritizedRecommendations,
      engagementScore
    );

    console.log(`Personalized recommendations sent to member ${memberId}: ${prioritizedRecommendations.length} recommendations`);

    return NextResponse.json({
      success: true,
      notificationSent: true,
      recommendations: prioritizedRecommendations,
      content: notificationContent,
      personalization: {
        memberEngagement: engagementScore.overallScore,
        recommendationRelevance: calculateRelevanceScore(prioritizedRecommendations),
        nextBestActions: prioritizedRecommendations.slice(0, 3).map(r => ({
          feature: r.type,
          action: r.title,
          priority: r.priority
        }))
      }
    });

  } catch (error) {
    console.error('Personalized recommendations notification webhook error:', error);
    return NextResponse.json(
      { error: 'Failed to process recommendations notification' },
      { status: 500 }
    );
  }
}

/**
 * Prioritize recommendations based on member context and engagement
 */
function prioritizeRecommendations(
  recommendations: any[],
  engagementScore: any,
  triggerEvent: string,
  context: any
): any[] {
  // Score each recommendation based on multiple factors
  const scoredRecommendations = recommendations.map(rec => {
    let score = 0;

    // Base priority score
    const priorityScores = { high: 100, medium: 60, low: 30 };
    score += priorityScores[rec.priority as keyof typeof priorityScores] || 30;

    // Engagement-based scoring
    if (engagementScore.featureScores[rec.type] < 50) {
      score += 40; // Boost underutilized features
    }

    // Context-based scoring
    if (context?.recentActivity?.includes(rec.featureSource)) {
      score += 30; // Boost related to recent activity
    }

    // Trigger event relevance
    if (triggerEvent === 'low-engagement' && rec.type === 'learning') {
      score += 50; // Learning recommendations for low engagement
    }

    if (triggerEvent === 'project-completion' && rec.type === 'community') {
      score += 50; // Community recommendations after project completion
    }

    return { ...rec, relevanceScore: score };
  });

  // Sort by relevance score and return top recommendations
  return scoredRecommendations
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, 5); // Limit to top 5 recommendations
}

/**
 * Generate personalized recommendation notification content
 */
function generateRecommendationNotification(
  memberProfile: any,
  recommendations: any[],
  engagementScore: any
): any {
  const memberName = memberProfile.name || 'Member';
  const topRecommendation = recommendations[0];

  if (!topRecommendation) {
    return {
      subject: `${memberName}, discover new opportunities on NAMC`,
      body: 'Check out the latest features and opportunities available to you.',
      recommendations: []
    };
  }

  // Personalize based on engagement level
  let engagementMessage = '';
  if (engagementScore.overallScore > 80) {
    engagementMessage = "You're doing great with the platform! Here are some advanced features you might enjoy:";
  } else if (engagementScore.overallScore > 50) {
    engagementMessage = "We've noticed your growing engagement. Here are some features that could help you even more:";
  } else {
    engagementMessage = "Let's help you get the most out of your NAMC membership with these personalized suggestions:";
  }

  const content = {
    subject: `${memberName}, personalized recommendations just for you`,
    greeting: `Hi ${memberName},`,
    engagementMessage,
    topRecommendation: {
      title: topRecommendation.title,
      description: topRecommendation.description,
      reason: topRecommendation.reason,
      actionUrl: topRecommendation.actionUrl,
      priority: topRecommendation.priority
    },
    additionalRecommendations: recommendations.slice(1, 4).map(rec => ({
      title: rec.title,
      description: rec.description,
      actionUrl: rec.actionUrl
    })),
    memberInsights: {
      strongAreas: getStrongAreas(engagementScore.featureScores),
      growthOpportunities: getGrowthOpportunities(engagementScore.featureScores),
      nextMilestone: getNextMilestone(engagementScore.overallScore)
    },
    cta: 'Explore Recommendations',
    footer: 'These recommendations are based on your activity and interests. Update your preferences anytime in your settings.'
  };

  return content;
}

/**
 * Calculate overall relevance score for recommendations
 */
function calculateRelevanceScore(recommendations: any[]): number {
  if (recommendations.length === 0) return 0;

  const totalScore = recommendations.reduce((sum, rec) => sum + (rec.relevanceScore || 0), 0);
  return Math.round(totalScore / recommendations.length);
}

/**
 * Get member's strong areas based on feature scores
 */
function getStrongAreas(featureScores: any): string[] {
  const strongAreas = [];
  
  for (const [feature, score] of Object.entries(featureScores)) {
    if (score > 70) {
      strongAreas.push(formatFeatureName(feature));
    }
  }

  return strongAreas.slice(0, 3); // Top 3 strong areas
}

/**
 * Get growth opportunities based on feature scores
 */
function getGrowthOpportunities(featureScores: any): string[] {
  const opportunities = [];
  
  for (const [feature, score] of Object.entries(featureScores)) {
    if (score < 40) {
      opportunities.push(formatFeatureName(feature));
    }
  }

  return opportunities.slice(0, 3); // Top 3 opportunities
}

/**
 * Get next milestone based on overall engagement score
 */
function getNextMilestone(overallScore: number): string {
  if (overallScore < 25) return 'Complete your profile setup';
  if (overallScore < 50) return 'Try 3 different platform features';
  if (overallScore < 75) return 'Become an active community member';
  return 'Achieve expert status across all features';
}

/**
 * Format feature name for display
 */
function formatFeatureName(feature: string): string {
  const nameMap: Record<string, string> = {
    'toolLending': 'Tool Lending',
    'onboarding': 'Platform Onboarding',
    'growthPlan': 'Business Growth Planning',
    'costEstimation': 'Cost Estimation',
    'shop': 'NAMC Shop',
    'community': 'Community Engagement',
    'learning': 'Professional Learning'
  };

  return nameMap[feature] || feature;
}
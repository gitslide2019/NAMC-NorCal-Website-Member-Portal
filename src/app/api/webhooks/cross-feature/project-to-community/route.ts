/**
 * Cross-Feature Webhook: Project Completion to Community Engagement
 * 
 * Encourages community participation after project completion
 * Facilitates knowledge sharing and networking
 */

import { NextRequest, NextResponse } from 'next/server';
import { CrossFeatureIntegrationService } from '@/lib/services/cross-feature-integration.service';

const crossFeatureService = new CrossFeatureIntegrationService();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { memberId, projectId, projectType, projectValue, socialImpact, completionDate } = body;

    if (!memberId || !projectId) {
      return NextResponse.json(
        { error: 'Missing required fields: memberId, projectId' },
        { status: 400 }
      );
    }

    // Track the cross-feature journey event
    await crossFeatureService.trackMemberJourney({
      memberId,
      feature: 'cross-feature-bridge',
      action: 'project-to-community-trigger',
      timestamp: new Date(),
      metadata: {
        projectId,
        projectType,
        projectValue,
        socialImpact,
        completionDate,
        triggerSource: 'project-management'
      }
    });

    // Share data with community feature
    await crossFeatureService.shareFeatureData(
      'project-management',
      'community',
      memberId,
      'project-completion',
      {
        projectId,
        projectType,
        projectValue,
        socialImpact,
        completionDate,
        shareableContent: {
          successStory: true,
          lessonsLearned: true,
          resourcesUsed: true,
          challengesOvercome: true
        }
      }
    );

    // Generate community engagement opportunities
    const communityOpportunities = generateCommunityOpportunities(projectType, socialImpact);

    console.log(`Cross-feature bridge activated: Project ${projectId} completion -> Community engagement for member ${memberId}`);

    return NextResponse.json({
      success: true,
      bridgeActivated: true,
      communityInvitation: true,
      opportunities: communityOpportunities,
      sharingIncentives: {
        engagementPoints: calculateEngagementPoints(projectValue, socialImpact),
        mentorshipOpportunity: projectValue > 25000,
        expertRecognition: socialImpact?.jobsCreated > 5,
        networkingBoost: true
      },
      nextActions: [
        {
          feature: 'community',
          action: 'share-success-story',
          url: '/member/community/share-project',
          priority: 'high'
        },
        {
          feature: 'community',
          action: 'join-discussion',
          url: `/member/community/discussions?topic=${projectType}`,
          priority: 'medium'
        },
        {
          feature: 'community',
          action: 'mentor-others',
          url: '/member/community/mentorship',
          priority: 'medium'
        }
      ]
    });

  } catch (error) {
    console.error('Cross-feature project-to-community webhook error:', error);
    return NextResponse.json(
      { error: 'Failed to process cross-feature bridge' },
      { status: 500 }
    );
  }
}

/**
 * Generate community engagement opportunities based on project completion
 */
function generateCommunityOpportunities(projectType: string, socialImpact: any): any[] {
  const opportunities = [];

  // Discussion topics based on project type
  const discussionTopics: Record<string, string[]> = {
    'residential': ['Home Construction Tips', 'Residential Safety Best Practices', 'Client Relations'],
    'commercial': ['Commercial Project Management', 'Team Coordination', 'Budget Management'],
    'industrial': ['Industrial Safety Standards', 'Heavy Equipment Operations', 'Regulatory Compliance'],
    'infrastructure': ['Public Works Projects', 'Community Impact', 'Government Contracting']
  };

  if (discussionTopics[projectType]) {
    opportunities.push({
      type: 'discussion',
      title: `Share insights about ${projectType} projects`,
      topics: discussionTopics[projectType],
      engagement: 'high'
    });
  }

  // Mentorship opportunities for successful projects
  if (socialImpact?.jobsCreated > 0) {
    opportunities.push({
      type: 'mentorship',
      title: 'Mentor other contractors on job creation',
      focus: 'social-impact',
      engagement: 'high'
    });
  }

  // Committee participation based on project success
  opportunities.push({
    type: 'committee',
    title: 'Join project review committee',
    focus: 'project-excellence',
    engagement: 'medium'
  });

  return opportunities;
}

/**
 * Calculate engagement points for project completion sharing
 */
function calculateEngagementPoints(projectValue: number, socialImpact: any): number {
  let points = 50; // Base points for project completion

  // Value-based bonus
  if (projectValue > 100000) points += 50;
  else if (projectValue > 50000) points += 30;
  else if (projectValue > 25000) points += 20;

  // Social impact bonus
  if (socialImpact?.jobsCreated > 0) points += socialImpact.jobsCreated * 10;
  if (socialImpact?.localHirePercentage > 50) points += 25;
  if (socialImpact?.affordableUnits > 0) points += socialImpact.affordableUnits * 5;

  return Math.min(points, 200); // Cap at 200 points
}
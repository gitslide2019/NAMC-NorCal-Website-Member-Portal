import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { AIOnboardingAssistantService } from '@/lib/services/ai-onboarding-assistant.service';
import { HubSpotBackboneService } from '@/lib/services/hubspot-backbone.service';

const aiService = new AIOnboardingAssistantService();
const hubspotService = new HubSpotBackboneService();

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const memberId = session.user.id;
    
    // Get current onboarding progress from HubSpot
    const memberProfile = await hubspotService.getMemberProfile(memberId);
    
    const progress = {
      currentStep: memberProfile.onboarding_current_step || 0,
      totalSteps: 6,
      completedSteps: memberProfile.onboarding_completed_steps ? 
        memberProfile.onboarding_completed_steps.split(',') : [],
      skippedSteps: memberProfile.onboarding_skipped_steps ? 
        memberProfile.onboarding_skipped_steps.split(',') : [],
      strugglingAreas: memberProfile.onboarding_struggling_areas ? 
        memberProfile.onboarding_struggling_areas.split(',') : [],
      techComfortLevel: {
        level: memberProfile.onboarding_tech_comfort || 'intermediate',
        score: 5, // Default score
        areas: { software: 5, mobile: 5, internet: 5, learning: 5 }
      },
      personalizedBadges: memberProfile.onboarding_badges ? 
        memberProfile.onboarding_badges.split(',') : [],
      aiEncouragementLevel: memberProfile.onboarding_tech_comfort === 'beginner' ? 'high' :
                           memberProfile.onboarding_tech_comfort === 'intermediate' ? 'medium' : 'low'
    };

    return NextResponse.json({ progress });
  } catch (error) {
    console.error('Error fetching onboarding progress:', error);
    return NextResponse.json(
      { error: 'Failed to fetch onboarding progress' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const memberId = session.user.id;
    const { progress } = await request.json();

    // Update onboarding progress in HubSpot
    await aiService.updateOnboardingProgress(memberId, progress);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating onboarding progress:', error);
    return NextResponse.json(
      { error: 'Failed to update onboarding progress' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const memberId = session.user.id;
    const { stepId, stepData, action } = await request.json();

    if (action === 'complete') {
      // Award badge for step completion
      const badge = await aiService.awardPersonalizedBadge(
        memberId,
        stepId,
        stepData.techComfortLevel || { level: 'intermediate', score: 5, areas: {} }
      );

      return NextResponse.json({ badge });
    }

    if (action === 'assess_tech_comfort') {
      // Assess technical comfort level
      const techComfortLevel = await aiService.assessTechComfortLevel(stepData.responses);
      
      return NextResponse.json({ techComfortLevel });
    }

    if (action === 'generate_guidance') {
      // Generate AI guidance for current step
      const guidance = await aiService.generateContextualGuidance(
        memberId,
        stepId,
        stepData.techComfortLevel,
        stepData.context
      );

      return NextResponse.json({ guidance });
    }

    if (action === 'detect_struggle') {
      // Detect if member is struggling
      const detection = await aiService.detectStruggle(memberId, stepData.metrics);
      
      return NextResponse.json({ detection });
    }

    if (action === 'generate_encouragement') {
      // Generate encouragement message
      const encouragement = await aiService.generateEncouragement(
        memberId,
        stepData.progress,
        stepData.achievement
      );

      return NextResponse.json({ encouragement });
    }

    if (action === 'complete_onboarding') {
      // Complete onboarding and get all completion data
      const completionData = await aiService.completeOnboarding(
        memberId,
        stepData.progress
      );

      return NextResponse.json(completionData);
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Error processing onboarding action:', error);
    return NextResponse.json(
      { error: 'Failed to process onboarding action' },
      { status: 500 }
    );
  }
}
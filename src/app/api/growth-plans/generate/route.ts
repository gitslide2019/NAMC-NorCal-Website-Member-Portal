import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';
import { GrowthPlanAIService } from '@/lib/services/growth-plan-ai.service';
import { HubSpotBackboneService } from '@/lib/services/hubspot-backbone.service';

const prisma = new PrismaClient();
const growthPlanAI = new GrowthPlanAIService();
const hubspotService = new HubSpotBackboneService();

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { assessmentId } = await request.json();

    // Get the assessment data
    let assessmentData;
    if (assessmentId) {
      const existingPlan = await prisma.businessGrowthPlan.findUnique({
        where: { id: assessmentId }
      });
      
      if (!existingPlan || !existingPlan.assessmentData) {
        return NextResponse.json(
          { error: 'Assessment not found' },
          { status: 404 }
        );
      }
      
      assessmentData = JSON.parse(existingPlan.assessmentData);
    } else {
      // Get the most recent assessment for this member
      const existingPlan = await prisma.businessGrowthPlan.findFirst({
        where: { 
          memberId: session.user.id,
          isActive: true
        },
        orderBy: { updatedAt: 'desc' }
      });

      if (!existingPlan || !existingPlan.assessmentData) {
        return NextResponse.json(
          { error: 'No assessment found. Please complete the assessment first.' },
          { status: 400 }
        );
      }

      assessmentData = JSON.parse(existingPlan.assessmentData);
    }

    // Generate the AI-powered growth plan
    console.log('Generating growth plan for member:', session.user.id);
    const generatedPlan = await growthPlanAI.generateGrowthPlan(assessmentData);

    // Update the growth plan in the database
    const updatedPlan = await prisma.businessGrowthPlan.updateMany({
      where: { 
        memberId: session.user.id,
        isActive: true
      },
      data: {
        currentPhase: 'plan_generated',
        progressScore: 25, // 25% for completing plan generation
        aiAnalysis: JSON.stringify(generatedPlan.situationAnalysis),
        roadmapData: JSON.stringify(generatedPlan.roadmap),
        milestones: JSON.stringify(generatedPlan.milestones),
        updatedAt: new Date()
      }
    });

    // Get the updated plan
    const finalPlan = await prisma.businessGrowthPlan.findFirst({
      where: { 
        memberId: session.user.id,
        isActive: true
      }
    });

    if (!finalPlan) {
      return NextResponse.json(
        { error: 'Failed to retrieve updated plan' },
        { status: 500 }
      );
    }

    // Sync to HubSpot
    try {
      await hubspotService.createOrUpdateGrowthPlan(session.user.id, {
        planId: finalPlan.id,
        planName: finalPlan.planName,
        currentPhase: finalPlan.currentPhase,
        assessmentData: assessmentData,
        progressScore: finalPlan.progressScore
      });
    } catch (hubspotError) {
      console.error('HubSpot sync error:', hubspotError);
      // Continue without failing the request
    }

    // Return the complete generated plan
    const response = {
      id: finalPlan.id,
      planName: finalPlan.planName,
      currentPhase: finalPlan.currentPhase,
      progressScore: finalPlan.progressScore,
      generatedPlan,
      createdAt: finalPlan.createdAt,
      updatedAt: finalPlan.updatedAt
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Growth plan generation error:', error);
    
    // Check if it's an API key error
    if (error instanceof Error && error.message.includes('API key')) {
      return NextResponse.json(
        { 
          error: 'AI service temporarily unavailable. Please try again later.',
          details: 'API configuration issue'
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to generate growth plan' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the current growth plan with generated content
    const growthPlan = await prisma.businessGrowthPlan.findFirst({
      where: { 
        memberId: session.user.id,
        isActive: true
      }
    });

    if (!growthPlan) {
      return NextResponse.json(
        { error: 'No growth plan found' },
        { status: 404 }
      );
    }

    // Parse the stored data
    const response = {
      id: growthPlan.id,
      planName: growthPlan.planName,
      currentPhase: growthPlan.currentPhase,
      progressScore: growthPlan.progressScore,
      assessmentData: growthPlan.assessmentData ? JSON.parse(growthPlan.assessmentData) : null,
      aiAnalysis: growthPlan.aiAnalysis ? JSON.parse(growthPlan.aiAnalysis) : null,
      roadmapData: growthPlan.roadmapData ? JSON.parse(growthPlan.roadmapData) : null,
      milestones: growthPlan.milestones ? JSON.parse(growthPlan.milestones) : null,
      isActive: growthPlan.isActive,
      createdAt: growthPlan.createdAt,
      updatedAt: growthPlan.updatedAt
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Get growth plan error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve growth plan' },
      { status: 500 }
    );
  }
}
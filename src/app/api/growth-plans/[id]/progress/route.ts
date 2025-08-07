import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';
import { HubSpotBackboneService } from '@/lib/services/hubspot-backbone.service';

const prisma = new PrismaClient();
const hubspotService = new HubSpotBackboneService();

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { progress, milestoneId, milestoneStatus } = await request.json();
    const planId = params.id;

    // Verify the plan belongs to the current user
    const growthPlan = await prisma.businessGrowthPlan.findFirst({
      where: { 
        id: planId,
        memberId: session.user.id
      }
    });

    if (!growthPlan) {
      return NextResponse.json(
        { error: 'Growth plan not found' },
        { status: 404 }
      );
    }

    let updatedData: any = {};

    // Update overall progress if provided
    if (typeof progress === 'number') {
      updatedData.progressScore = Math.max(0, Math.min(100, progress));
      
      // Update phase based on progress
      if (progress >= 90) {
        updatedData.currentPhase = 'completed';
      } else if (progress >= 75) {
        updatedData.currentPhase = 'scaling';
      } else if (progress >= 50) {
        updatedData.currentPhase = 'implementation';
      } else if (progress >= 25) {
        updatedData.currentPhase = 'planning';
      }
    }

    // Update milestone status if provided
    if (milestoneId && milestoneStatus) {
      const milestones = growthPlan.milestones ? JSON.parse(growthPlan.milestones) : [];
      const milestoneIndex = milestones.findIndex((m: any) => m.id === milestoneId);
      
      if (milestoneIndex !== -1) {
        milestones[milestoneIndex].status = milestoneStatus;
        
        if (milestoneStatus === 'completed') {
          milestones[milestoneIndex].completedAt = new Date().toISOString();
        }
        
        updatedData.milestones = JSON.stringify(milestones);
        
        // Calculate progress based on completed milestones
        const completedCount = milestones.filter((m: any) => m.status === 'completed').length;
        const totalCount = milestones.length;
        const calculatedProgress = Math.round((completedCount / totalCount) * 100);
        
        if (!updatedData.progressScore) {
          updatedData.progressScore = calculatedProgress;
        }
      }
    }

    // Update the growth plan
    const updatedPlan = await prisma.businessGrowthPlan.update({
      where: { id: planId },
      data: {
        ...updatedData,
        updatedAt: new Date()
      }
    });

    // Sync to HubSpot
    try {
      await hubspotService.createOrUpdateGrowthPlan(session.user.id, {
        planId: updatedPlan.id,
        planName: updatedPlan.planName,
        currentPhase: updatedPlan.currentPhase,
        assessmentData: updatedPlan.assessmentData ? JSON.parse(updatedPlan.assessmentData) : {},
        progressScore: updatedPlan.progressScore
      });
    } catch (hubspotError) {
      console.error('HubSpot sync error:', hubspotError);
      // Continue without failing the request
    }

    return NextResponse.json({
      success: true,
      plan: {
        id: updatedPlan.id,
        progressScore: updatedPlan.progressScore,
        currentPhase: updatedPlan.currentPhase,
        milestones: updatedPlan.milestones ? JSON.parse(updatedPlan.milestones) : null,
        updatedAt: updatedPlan.updatedAt
      }
    });

  } catch (error) {
    console.error('Update progress error:', error);
    return NextResponse.json(
      { error: 'Failed to update progress' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const planId = params.id;

    // Get the growth plan progress
    const growthPlan = await prisma.businessGrowthPlan.findFirst({
      where: { 
        id: planId,
        memberId: session.user.id
      }
    });

    if (!growthPlan) {
      return NextResponse.json(
        { error: 'Growth plan not found' },
        { status: 404 }
      );
    }

    const milestones = growthPlan.milestones ? JSON.parse(growthPlan.milestones) : [];
    const completedMilestones = milestones.filter((m: any) => m.status === 'completed');
    const inProgressMilestones = milestones.filter((m: any) => m.status === 'in_progress');

    return NextResponse.json({
      id: growthPlan.id,
      progressScore: growthPlan.progressScore,
      currentPhase: growthPlan.currentPhase,
      totalMilestones: milestones.length,
      completedMilestones: completedMilestones.length,
      inProgressMilestones: inProgressMilestones.length,
      milestones: milestones,
      lastUpdated: growthPlan.updatedAt
    });

  } catch (error) {
    console.error('Get progress error:', error);
    return NextResponse.json(
      { error: 'Failed to get progress' },
      { status: 500 }
    );
  }
}
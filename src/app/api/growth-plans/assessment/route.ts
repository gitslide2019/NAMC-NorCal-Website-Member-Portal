import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';
import { HubSpotBackboneService } from '@/lib/services/hubspot-backbone.service';

const prisma = new PrismaClient();
const hubspotService = new HubSpotBackboneService();

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const assessmentData = await request.json();
    
    // Validate required assessment fields
    const requiredFields = ['businessStatus', 'currentRevenue', 'goals', 'challenges', 'timeframe'];
    for (const field of requiredFields) {
      if (!assessmentData[field]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    // Get member profile and project history for context
    const member = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        costEstimates: {
          orderBy: { createdAt: 'desc' },
          take: 10
        },
        toolReservations: {
          orderBy: { createdAt: 'desc' },
          take: 5
        }
      }
    });

    if (!member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    // Collect market data (placeholder for now - would integrate with real market APIs)
    const marketData = {
      localConstructionActivity: 'moderate',
      averageProjectSize: 150000,
      competitorDensity: 'medium',
      marketTrends: ['sustainable_construction', 'smart_homes', 'renovation_boom'],
      seasonalFactors: {
        currentSeason: 'spring',
        peakSeason: 'summer',
        slowSeason: 'winter'
      }
    };

    // Create comprehensive assessment data
    const completeAssessmentData = {
      ...assessmentData,
      memberProfile: {
        memberType: member.memberType,
        joinDate: member.joinDate,
        location: member.location,
        company: member.company,
        website: member.website
      },
      projectHistory: {
        totalEstimates: member.costEstimates.length,
        recentEstimates: member.costEstimates.map(est => ({
          projectType: est.projectType,
          totalEstimate: est.totalEstimate,
          createdAt: est.createdAt
        })),
        toolUsage: member.toolReservations.length,
        recentReservations: member.toolReservations.map(res => ({
          toolId: res.toolId,
          totalCost: res.totalCost,
          createdAt: res.createdAt
        }))
      },
      marketData,
      assessmentDate: new Date().toISOString()
    };

    // Create or update growth plan with assessment data
    const existingPlan = await prisma.businessGrowthPlan.findFirst({
      where: { 
        memberId: session.user.id,
        isActive: true
      }
    });

    let growthPlan;
    if (existingPlan) {
      growthPlan = await prisma.businessGrowthPlan.update({
        where: { id: existingPlan.id },
        data: {
          assessmentData: JSON.stringify(completeAssessmentData),
          currentPhase: 'assessment_completed',
          updatedAt: new Date()
        }
      });
    } else {
      growthPlan = await prisma.businessGrowthPlan.create({
        data: {
          memberId: session.user.id,
          planName: `${member.name || 'Member'} Growth Plan`,
          currentPhase: 'assessment_completed',
          assessmentData: JSON.stringify(completeAssessmentData),
          progressScore: 10, // 10% for completing assessment
          isActive: true
        }
      });
    }

    // Sync to HubSpot
    try {
      await hubspotService.createOrUpdateGrowthPlan(session.user.id, {
        planId: growthPlan.id,
        planName: growthPlan.planName,
        currentPhase: growthPlan.currentPhase,
        assessmentData: completeAssessmentData,
        progressScore: growthPlan.progressScore
      });
    } catch (hubspotError) {
      console.error('HubSpot sync error:', hubspotError);
      // Continue without failing the request
    }

    return NextResponse.json({
      success: true,
      growthPlanId: growthPlan.id,
      assessmentData: completeAssessmentData,
      message: 'Assessment completed successfully'
    });

  } catch (error) {
    console.error('Growth plan assessment error:', error);
    return NextResponse.json(
      { error: 'Failed to process assessment' },
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

    // Get existing assessment data
    const growthPlan = await prisma.businessGrowthPlan.findFirst({
      where: { 
        memberId: session.user.id,
        isActive: true
      }
    });

    if (!growthPlan || !growthPlan.assessmentData) {
      return NextResponse.json({
        hasAssessment: false,
        assessmentData: null
      });
    }

    const assessmentData = JSON.parse(growthPlan.assessmentData);

    return NextResponse.json({
      hasAssessment: true,
      assessmentData,
      growthPlanId: growthPlan.id,
      currentPhase: growthPlan.currentPhase,
      progressScore: growthPlan.progressScore
    });

  } catch (error) {
    console.error('Get assessment error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve assessment' },
      { status: 500 }
    );
  }
}
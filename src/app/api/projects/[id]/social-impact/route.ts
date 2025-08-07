import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';
import { ProjectBudgetService } from '@/lib/services/hubspot-backbone.service';

const prisma = new PrismaClient();
const budgetService = new ProjectBudgetService();

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const projectId = params.id;

    // Find project budget and social impact metrics
    const budget = await prisma.projectBudget.findUnique({
      where: { projectId },
      include: {
        socialImpactMetrics: true,
        member: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!budget) {
      return NextResponse.json({ error: 'Budget not found' }, { status: 404 });
    }

    // Check access
    if (budget.memberId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json(budget.socialImpactMetrics);
  } catch (error) {
    console.error('Error fetching social impact metrics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch social impact metrics' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const projectId = params.id;
    const data = await request.json();

    // Find project budget
    const budget = await prisma.projectBudget.findUnique({
      where: { projectId },
      include: {
        socialImpactMetrics: true,
      },
    });

    if (!budget) {
      return NextResponse.json({ error: 'Budget not found' }, { status: 404 });
    }

    // Check access
    if (budget.memberId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check if metrics already exist
    if (budget.socialImpactMetrics) {
      return NextResponse.json(
        { error: 'Social impact metrics already exist for this project' },
        { status: 409 }
      );
    }

    const {
      jobsPlanned = 0,
      trainingHours = 0,
      localHireTarget = 0,
      minorityHireTarget = 0,
      womenHireTarget = 0,
      housingUnitsTarget = 0,
      affordableUnitsTarget = 0,
      greenBuildingCertification,
      energyEfficiencyTarget = 0,
      waterConservationTarget = 0,
      wasteReductionTarget = 0,
      economicMultiplierFactor = 1.0,
      socialValueTarget = 0,
    } = data;

    // Calculate initial community benefit score
    const communityBenefitScore = calculateCommunityBenefitScore({
      jobsPlanned,
      trainingHours,
      localHireTarget,
      minorityHireTarget,
      womenHireTarget,
      housingUnitsTarget,
      affordableUnitsTarget,
      energyEfficiencyTarget,
      waterConservationTarget,
      wasteReductionTarget,
    });

    // Create social impact metrics
    const metrics = await prisma.socialImpactMetrics.create({
      data: {
        budgetId: budget.id,
        memberId: session.user.id,
        projectId,
        jobsPlanned,
        localHirePercentage: localHireTarget,
        minorityHirePercentage: minorityHireTarget,
        womenHirePercentage: womenHireTarget,
        housingUnitsCreated: 0, // Will be updated as project progresses
        affordableUnitsCreated: 0,
        communityBenefitScore,
        greenBuildingCertification,
        energyEfficiencyImprovement: 0, // Will be updated with actual measurements
        waterConservationAmount: 0,
        wasteReductionAmount: 0,
        economicMultiplierEffect: economicMultiplierFactor,
        socialValueCreated: 0, // Will be calculated as project progresses
        investmentAmount: budget.totalBudget,
        sroiRatio: 0, // Will be calculated when social value is determined
        milestonesTotal: calculateTotalMilestones(data),
        impactMilestones: JSON.stringify(generateImpactMilestones(data)),
      },
    });

    // Sync to HubSpot
    try {
      await budgetService.createSocialImpactMetrics({
        projectId,
        memberId: session.user.id,
        jobsCreated: 0,
        jobsPlanned,
        trainingHoursProvided: 0,
        localHirePercentage: localHireTarget,
        minorityHirePercentage: minorityHireTarget,
        communityBenefitScore,
        socialValueCreated: 0,
        investmentAmount: budget.totalBudget,
        sroiRatio: 0,
      });
    } catch (hubspotError) {
      console.error('HubSpot sync error:', hubspotError);
      // Continue without failing the request
    }

    return NextResponse.json(metrics, { status: 201 });
  } catch (error) {
    console.error('Error creating social impact metrics:', error);
    return NextResponse.json(
      { error: 'Failed to create social impact metrics' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const projectId = params.id;
    const data = await request.json();

    // Find project budget and metrics
    const budget = await prisma.projectBudget.findUnique({
      where: { projectId },
      include: {
        socialImpactMetrics: true,
      },
    });

    if (!budget || !budget.socialImpactMetrics) {
      return NextResponse.json({ error: 'Social impact metrics not found' }, { status: 404 });
    }

    // Check access
    if (budget.memberId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const {
      jobsCreated,
      trainingHoursProvided,
      localHirePercentage,
      minorityHirePercentage,
      womenHirePercentage,
      housingUnitsCreated,
      affordableUnitsCreated,
      affordabilityImprovement,
      localSpendingAmount,
      greenBuildingCertification,
      carbonFootprintReduction,
      energyEfficiencyImprovement,
      waterConservationAmount,
      wasteReductionAmount,
      taxRevenueGenerated,
      propertyValueIncrease,
      socialValueCreated,
    } = data;

    // Calculate updated community benefit score
    const communityBenefitScore = calculateCommunityBenefitScore({
      jobsPlanned: jobsCreated || budget.socialImpactMetrics.jobsPlanned,
      trainingHours: trainingHoursProvided || 0,
      localHireTarget: localHirePercentage || budget.socialImpactMetrics.localHirePercentage,
      minorityHireTarget: minorityHirePercentage || budget.socialImpactMetrics.minorityHirePercentage,
      womenHireTarget: womenHirePercentage || budget.socialImpactMetrics.womenHirePercentage,
      housingUnitsTarget: housingUnitsCreated || 0,
      affordableUnitsTarget: affordableUnitsCreated || 0,
      energyEfficiencyTarget: energyEfficiencyImprovement || 0,
      waterConservationTarget: waterConservationAmount || 0,
      wasteReductionTarget: wasteReductionAmount || 0,
    });

    // Calculate SROI ratio if social value is provided
    let sroiRatio = budget.socialImpactMetrics.sroiRatio;
    if (socialValueCreated && budget.socialImpactMetrics.investmentAmount > 0) {
      sroiRatio = socialValueCreated / budget.socialImpactMetrics.investmentAmount;
    }

    // Calculate local spending percentage
    let localSpendingPercentage = 0;
    if (localSpendingAmount && budget.totalBudget > 0) {
      localSpendingPercentage = (localSpendingAmount / budget.totalBudget) * 100;
    }

    // Update metrics
    const updatedMetrics = await prisma.socialImpactMetrics.update({
      where: { budgetId: budget.id },
      data: {
        ...(jobsCreated !== undefined && { jobsCreated }),
        ...(trainingHoursProvided !== undefined && { trainingHoursProvided }),
        ...(localHirePercentage !== undefined && { localHirePercentage }),
        ...(minorityHirePercentage !== undefined && { minorityHirePercentage }),
        ...(womenHirePercentage !== undefined && { womenHirePercentage }),
        ...(housingUnitsCreated !== undefined && { housingUnitsCreated }),
        ...(affordableUnitsCreated !== undefined && { affordableUnitsCreated }),
        ...(affordabilityImprovement !== undefined && { affordabilityImprovement }),
        ...(localSpendingAmount !== undefined && { 
          localSpendingAmount,
          localSpendingPercentage 
        }),
        ...(greenBuildingCertification !== undefined && { greenBuildingCertification }),
        ...(carbonFootprintReduction !== undefined && { carbonFootprintReduction }),
        ...(energyEfficiencyImprovement !== undefined && { energyEfficiencyImprovement }),
        ...(waterConservationAmount !== undefined && { waterConservationAmount }),
        ...(wasteReductionAmount !== undefined && { wasteReductionAmount }),
        ...(taxRevenueGenerated !== undefined && { taxRevenueGenerated }),
        ...(propertyValueIncrease !== undefined && { propertyValueIncrease }),
        ...(socialValueCreated !== undefined && { socialValueCreated, sroiRatio }),
        communityBenefitScore,
      },
    });

    // Check for milestone completion
    const milestones = JSON.parse(updatedMetrics.impactMilestones || '[]');
    let milestonesCompleted = 0;
    
    for (const milestone of milestones) {
      if (checkMilestoneCompletion(milestone, updatedMetrics)) {
        milestonesCompleted++;
      }
    }

    // Update milestones completed if changed
    if (milestonesCompleted !== updatedMetrics.milestonesCompleted) {
      await prisma.socialImpactMetrics.update({
        where: { budgetId: budget.id },
        data: { milestonesCompleted },
      });
      updatedMetrics.milestonesCompleted = milestonesCompleted;
    }

    // Sync to HubSpot
    try {
      await budgetService.updateSocialImpactMetrics(budget.socialImpactMetrics.hubspotObjectId!, {
        jobsCreated: updatedMetrics.jobsCreated,
        trainingHoursProvided: updatedMetrics.trainingHoursProvided,
        localHirePercentage: updatedMetrics.localHirePercentage,
        minorityHirePercentage: updatedMetrics.minorityHirePercentage,
        communityBenefitScore: updatedMetrics.communityBenefitScore,
        socialValueCreated: updatedMetrics.socialValueCreated,
        sroiRatio: updatedMetrics.sroiRatio,
        milestonesCompleted: updatedMetrics.milestonesCompleted,
      });
    } catch (hubspotError) {
      console.error('HubSpot sync error:', hubspotError);
    }

    return NextResponse.json(updatedMetrics);
  } catch (error) {
    console.error('Error updating social impact metrics:', error);
    return NextResponse.json(
      { error: 'Failed to update social impact metrics' },
      { status: 500 }
    );
  }
}

// Helper function to calculate community benefit score
function calculateCommunityBenefitScore(params: {
  jobsPlanned: number;
  trainingHours: number;
  localHireTarget: number;
  minorityHireTarget: number;
  womenHireTarget: number;
  housingUnitsTarget: number;
  affordableUnitsTarget: number;
  energyEfficiencyTarget: number;
  waterConservationTarget: number;
  wasteReductionTarget: number;
}): number {
  let score = 0;

  // Job creation and training (40 points max)
  score += Math.min(params.jobsPlanned * 3, 25);
  score += Math.min(params.trainingHours * 0.05, 15);

  // Diversity and inclusion (25 points max)
  score += Math.min(params.localHireTarget * 0.1, 10);
  score += Math.min(params.minorityHireTarget * 0.1, 10);
  score += Math.min(params.womenHireTarget * 0.1, 5);

  // Housing impact (20 points max)
  score += Math.min(params.housingUnitsTarget * 1.5, 15);
  score += Math.min(params.affordableUnitsTarget * 2.5, 5);

  // Environmental impact (15 points max)
  score += Math.min(params.energyEfficiencyTarget * 0.3, 5);
  score += Math.min(params.waterConservationTarget * 0.001, 5);
  score += Math.min(params.wasteReductionTarget * 2, 5);

  return Math.round(Math.min(score, 100));
}

// Helper function to calculate total milestones
function calculateTotalMilestones(data: any): number {
  let milestones = 0;
  
  if (data.jobsPlanned > 0) milestones += Math.ceil(data.jobsPlanned / 5); // Milestone every 5 jobs
  if (data.trainingHours > 0) milestones += Math.ceil(data.trainingHours / 100); // Milestone every 100 hours
  if (data.housingUnitsTarget > 0) milestones += Math.ceil(data.housingUnitsTarget / 10); // Milestone every 10 units
  if (data.affordableUnitsTarget > 0) milestones += data.affordableUnitsTarget; // Milestone per affordable unit
  
  return Math.max(milestones, 1); // At least 1 milestone
}

// Helper function to generate impact milestones
function generateImpactMilestones(data: any): any[] {
  const milestones = [];

  if (data.jobsPlanned > 0) {
    for (let i = 5; i <= data.jobsPlanned; i += 5) {
      milestones.push({
        id: `jobs-${i}`,
        type: 'jobs',
        title: `Create ${i} Jobs`,
        description: `Reach ${i} jobs created milestone`,
        target: i,
        metric: 'jobsCreated',
        completed: false,
      });
    }
  }

  if (data.trainingHours > 0) {
    for (let i = 100; i <= data.trainingHours; i += 100) {
      milestones.push({
        id: `training-${i}`,
        type: 'training',
        title: `Provide ${i} Training Hours`,
        description: `Reach ${i} training hours milestone`,
        target: i,
        metric: 'trainingHoursProvided',
        completed: false,
      });
    }
  }

  if (data.housingUnitsTarget > 0) {
    for (let i = 10; i <= data.housingUnitsTarget; i += 10) {
      milestones.push({
        id: `housing-${i}`,
        type: 'housing',
        title: `Complete ${i} Housing Units`,
        description: `Reach ${i} housing units completed milestone`,
        target: i,
        metric: 'housingUnitsCreated',
        completed: false,
      });
    }
  }

  return milestones;
}

// Helper function to check milestone completion
function checkMilestoneCompletion(milestone: any, metrics: any): boolean {
  const currentValue = metrics[milestone.metric] || 0;
  return currentValue >= milestone.target;
}
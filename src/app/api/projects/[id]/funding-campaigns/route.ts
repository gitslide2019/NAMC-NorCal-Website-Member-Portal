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
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const type = searchParams.get('type');

    // Find project budget
    const budget = await prisma.projectBudget.findUnique({
      where: { projectId },
      select: { id: true, memberId: true },
    });

    if (!budget) {
      return NextResponse.json({ error: 'Budget not found' }, { status: 404 });
    }

    // Check access
    if (budget.memberId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Build where clause
    const where: any = { budgetId: budget.id };
    if (status) where.campaignStatus = status;
    if (type) where.campaignType = type;

    // Get funding campaigns
    const campaigns = await prisma.fundingCampaign.findMany({
      where,
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        contributions: {
          orderBy: { createdAt: 'desc' },
          take: 5,
          include: {
            contributor: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        sponsors: {
          orderBy: { amount: 'desc' },
        },
        _count: {
          select: {
            contributions: true,
            sponsors: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(campaigns);
  } catch (error) {
    console.error('Error fetching funding campaigns:', error);
    return NextResponse.json(
      { error: 'Failed to fetch funding campaigns' },
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

    const {
      campaignTitle,
      description,
      targetAmount,
      campaignType,
      startDate,
      endDate,
      socialImpactGoals,
      jobsToCreate = 0,
      trainingHours = 0,
      localHireTarget = 0,
      minorityHireTarget = 0,
      womenHireTarget = 0,
      housingUnitsTarget = 0,
      affordableUnitsTarget = 0,
    } = data;

    // Validate required fields
    if (!campaignTitle || !description || !targetAmount || !campaignType || !startDate || !endDate) {
      return NextResponse.json(
        { error: 'Campaign title, description, target amount, type, start date, and end date are required' },
        { status: 400 }
      );
    }

    if (targetAmount <= 0) {
      return NextResponse.json(
        { error: 'Target amount must be greater than 0' },
        { status: 400 }
      );
    }

    if (new Date(startDate) >= new Date(endDate)) {
      return NextResponse.json(
        { error: 'End date must be after start date' },
        { status: 400 }
      );
    }

    // Find project budget
    const budget = await prisma.projectBudget.findUnique({
      where: { projectId },
    });

    if (!budget) {
      return NextResponse.json({ error: 'Budget not found' }, { status: 404 });
    }

    // Check access
    if (budget.memberId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Calculate community benefit score based on goals
    const communityBenefitScore = this.calculateCommunityBenefitScore({
      jobsToCreate,
      trainingHours,
      localHireTarget,
      minorityHireTarget,
      womenHireTarget,
      housingUnitsTarget,
      affordableUnitsTarget,
    });

    // Create funding campaign
    const campaign = await prisma.fundingCampaign.create({
      data: {
        budgetId: budget.id,
        createdBy: session.user.id,
        campaignTitle,
        description,
        targetAmount,
        campaignType,
        campaignStatus: 'DRAFT',
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        socialImpactGoals: socialImpactGoals ? JSON.stringify(socialImpactGoals) : null,
        jobsToCreate,
        trainingHours,
        localHireTarget,
        minorityHireTarget,
        womenHireTarget,
        housingUnitsTarget,
        affordableUnitsTarget,
        communityBenefitScore,
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        contributions: true,
        sponsors: true,
      },
    });

    // Sync to HubSpot
    try {
      await budgetService.createFundingCampaign({
        budgetId: budget.id,
        createdBy: session.user.id,
        campaignTitle,
        targetAmount,
        campaignType,
        campaignStatus: 'DRAFT',
        startDate,
        endDate,
        jobsToCreate,
        trainingHours,
        localHireTarget,
      });
    } catch (hubspotError) {
      console.error('HubSpot sync error:', hubspotError);
      // Continue without failing the request
    }

    return NextResponse.json(campaign, { status: 201 });
  } catch (error) {
    console.error('Error creating funding campaign:', error);
    return NextResponse.json(
      { error: 'Failed to create funding campaign' },
      { status: 500 }
    );
  }
}

// Helper function to calculate community benefit score
function calculateCommunityBenefitScore(goals: {
  jobsToCreate: number;
  trainingHours: number;
  localHireTarget: number;
  minorityHireTarget: number;
  womenHireTarget: number;
  housingUnitsTarget: number;
  affordableUnitsTarget: number;
}): number {
  let score = 0;

  // Job creation (0-25 points)
  score += Math.min(goals.jobsToCreate * 2.5, 25);

  // Training hours (0-20 points)
  score += Math.min(goals.trainingHours * 0.1, 20);

  // Local hire percentage (0-15 points)
  score += Math.min(goals.localHireTarget * 0.15, 15);

  // Minority hire percentage (0-15 points)
  score += Math.min(goals.minorityHireTarget * 0.15, 15);

  // Women hire percentage (0-10 points)
  score += Math.min(goals.womenHireTarget * 0.1, 10);

  // Housing units (0-10 points)
  score += Math.min(goals.housingUnitsTarget * 2, 10);

  // Affordable housing units (0-5 points)
  score += Math.min(goals.affordableUnitsTarget * 2.5, 5);

  return Math.round(score);
}
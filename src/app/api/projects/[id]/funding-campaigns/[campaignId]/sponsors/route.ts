import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; campaignId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { campaignId } = params;

    // Find campaign and verify access
    const campaign = await prisma.fundingCampaign.findUnique({
      where: { id: campaignId },
      include: {
        budget: {
          select: { memberId: true },
        },
      },
    });

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    // Check access
    if (campaign.budget?.memberId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get sponsors
    const sponsors = await prisma.campaignSponsor.findMany({
      where: { campaignId },
      orderBy: { amount: 'desc' },
    });

    return NextResponse.json(sponsors);
  } catch (error) {
    console.error('Error fetching campaign sponsors:', error);
    return NextResponse.json(
      { error: 'Failed to fetch campaign sponsors' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; campaignId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { campaignId } = params;
    const data = await request.json();

    const {
      sponsorName,
      sponsorType,
      sponsorshipLevel,
      amount,
      benefits,
      logoUrl,
      websiteUrl,
      contactEmail,
      contactName,
    } = data;

    // Validate required fields
    if (!sponsorName || !sponsorType || !sponsorshipLevel || !amount) {
      return NextResponse.json(
        { error: 'Sponsor name, type, sponsorship level, and amount are required' },
        { status: 400 }
      );
    }

    if (amount <= 0) {
      return NextResponse.json(
        { error: 'Amount must be greater than 0' },
        { status: 400 }
      );
    }

    // Find campaign and verify access
    const campaign = await prisma.fundingCampaign.findUnique({
      where: { id: campaignId },
      include: {
        budget: {
          select: { memberId: true },
        },
      },
    });

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    // Check access
    if (campaign.budget?.memberId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Create sponsor
    const sponsor = await prisma.campaignSponsor.create({
      data: {
        campaignId,
        sponsorName,
        sponsorType,
        sponsorshipLevel,
        amount,
        benefits: benefits ? JSON.stringify(benefits) : null,
        logoUrl,
        websiteUrl,
        contactEmail,
        contactName,
        contractSigned: false,
        recognitionApproved: false,
      },
    });

    return NextResponse.json(sponsor, { status: 201 });
  } catch (error) {
    console.error('Error creating campaign sponsor:', error);
    return NextResponse.json(
      { error: 'Failed to create campaign sponsor' },
      { status: 500 }
    );
  }
}

// Get potential sponsors based on project type and social impact goals
export async function GET_MATCHES(
  request: NextRequest,
  { params }: { params: { id: string; campaignId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { campaignId } = params;

    // Find campaign
    const campaign = await prisma.fundingCampaign.findUnique({
      where: { id: campaignId },
      include: {
        budget: {
          include: {
            socialImpactMetrics: true,
          },
        },
      },
    });

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    // Check access
    if (campaign.budget?.memberId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Generate sponsor matches based on campaign characteristics
    const matches = await generateSponsorMatches(campaign);

    return NextResponse.json(matches);
  } catch (error) {
    console.error('Error getting sponsor matches:', error);
    return NextResponse.json(
      { error: 'Failed to get sponsor matches' },
      { status: 500 }
    );
  }
}

// Helper function to generate sponsor matches
async function generateSponsorMatches(campaign: any): Promise<any[]> {
  const matches = [];

  // Corporate sponsors based on project type
  if (campaign.campaignType === 'CROWDFUNDING') {
    matches.push({
      type: 'CORPORATE',
      name: 'Local Construction Supply Companies',
      description: 'Hardware stores and construction suppliers often sponsor community projects',
      suggestedLevel: 'SUPPORTING',
      suggestedAmount: Math.min(campaign.targetAmount * 0.1, 5000),
      benefits: [
        'Logo on project signage',
        'Recognition in project materials',
        'Social media mentions',
      ],
      matchScore: 85,
      contactSuggestions: [
        'Reach out to local Home Depot/Lowe\'s community relations',
        'Contact regional construction supply distributors',
        'Approach specialty contractors in your network',
      ],
    });
  }

  // Foundation sponsors based on social impact goals
  if (campaign.jobsToCreate > 0 || campaign.trainingHours > 0) {
    matches.push({
      type: 'FOUNDATION',
      name: 'Workforce Development Foundations',
      description: 'Foundations focused on job creation and skills training',
      suggestedLevel: 'MAJOR',
      suggestedAmount: Math.min(campaign.targetAmount * 0.25, 15000),
      benefits: [
        'Detailed impact reporting',
        'Recognition as workforce development partner',
        'Access to training program data',
        'Speaking opportunities at events',
      ],
      matchScore: 92,
      contactSuggestions: [
        'Research local workforce development foundations',
        'Contact community foundations with employment focus',
        'Reach out to trade association foundations',
      ],
    });
  }

  // Government sponsors for housing projects
  if (campaign.housingUnitsTarget > 0 || campaign.affordableUnitsTarget > 0) {
    matches.push({
      type: 'GOVERNMENT',
      name: 'Housing Development Agencies',
      description: 'Local and state agencies supporting affordable housing',
      suggestedLevel: 'PRESENTING',
      suggestedAmount: Math.min(campaign.targetAmount * 0.4, 25000),
      benefits: [
        'Partnership recognition',
        'Policy impact documentation',
        'Community development metrics',
        'Public event speaking opportunities',
      ],
      matchScore: 88,
      contactSuggestions: [
        'Contact local housing authority',
        'Reach out to state housing finance agency',
        'Connect with community development block grant administrators',
      ],
    });
  }

  // Individual sponsors based on community benefit score
  if (campaign.communityBenefitScore > 70) {
    matches.push({
      type: 'INDIVIDUAL',
      name: 'Community Leaders and Philanthropists',
      description: 'Local business leaders and community advocates',
      suggestedLevel: 'COMMUNITY',
      suggestedAmount: Math.min(campaign.targetAmount * 0.05, 2500),
      benefits: [
        'Personal recognition',
        'Community impact updates',
        'Invitation to project events',
      ],
      matchScore: 75,
      contactSuggestions: [
        'Identify local business leaders',
        'Reach out through chamber of commerce',
        'Connect via existing NAMC member networks',
      ],
    });
  }

  // Environmental sponsors for green building projects
  if (campaign.budget?.socialImpactMetrics?.greenBuildingCertification) {
    matches.push({
      type: 'CORPORATE',
      name: 'Green Building and Environmental Companies',
      description: 'Companies focused on sustainability and environmental impact',
      suggestedLevel: 'SUPPORTING',
      suggestedAmount: Math.min(campaign.targetAmount * 0.15, 7500),
      benefits: [
        'Green building partnership recognition',
        'Environmental impact reporting',
        'Sustainability marketing opportunities',
      ],
      matchScore: 80,
      contactSuggestions: [
        'Contact solar and renewable energy companies',
        'Reach out to green building material suppliers',
        'Connect with environmental consulting firms',
      ],
    });
  }

  return matches.sort((a, b) => b.matchScore - a.matchScore);
}
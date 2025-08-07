import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { HubSpotBackboneService } from '@/lib/services/hubspot-backbone.service';
import { prisma } from '@/lib/prisma';

const hubspotService = new HubSpotBackboneService({
  accessToken: process.env.HUBSPOT_ACCESS_TOKEN!,
  portalId: process.env.HUBSPOT_PORTAL_ID
});

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();
    const {
      message,
      relevant_experience,
      proposed_approach,
      availability,
      collaboration_preferences,
      portfolio_items
    } = data;

    // Check if opportunity exists and is active
    const opportunity = await prisma.businessOpportunity.findFirst({
      where: {
        hubspot_deal_id: params.id,
        status: 'active'
      }
    });

    if (!opportunity) {
      return NextResponse.json({ error: 'Opportunity not found or no longer active' }, { status: 404 });
    }

    // Check if user already applied
    const existingApplication = await prisma.opportunityApplication.findFirst({
      where: {
        opportunity_id: params.id,
        applicant_id: session.user.id
      }
    });

    if (existingApplication) {
      return NextResponse.json({ error: 'Already applied to this opportunity' }, { status: 400 });
    }

    // Create application in HubSpot as a task/note on the deal
    const application = await hubspotService.createOpportunityApplication({
      opportunity_id: params.id,
      applicant_id: session.user.id,
      message,
      relevant_experience,
      proposed_approach,
      availability,
      collaboration_preferences,
      portfolio_items
    });

    // Create local cache record
    await prisma.opportunityApplication.create({
      data: {
        opportunity_id: params.id,
        applicant_id: session.user.id,
        message,
        relevant_experience: JSON.stringify(relevant_experience),
        proposed_approach,
        availability,
        collaboration_preferences: JSON.stringify(collaboration_preferences),
        portfolio_items: JSON.stringify(portfolio_items),
        status: 'pending'
      }
    });

    // Notify opportunity poster
    await hubspotService.notifyOpportunityPoster(params.id, session.user.id);

    return NextResponse.json({ application });
  } catch (error) {
    console.error('Error applying to business opportunity:', error);
    return NextResponse.json(
      { error: 'Failed to apply to opportunity' },
      { status: 500 }
    );
  }
}
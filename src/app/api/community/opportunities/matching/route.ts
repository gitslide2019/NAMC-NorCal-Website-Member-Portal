import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { HubSpotBackboneService } from '@/lib/services/hubspot-backbone.service';
import { prisma } from '@/lib/prisma';

const hubspotService = new HubSpotBackboneService({
  accessToken: process.env.HUBSPOT_ACCESS_TOKEN!,
  portalId: process.env.HUBSPOT_PORTAL_ID
});

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // 'opportunities' or 'partners'

    if (type === 'opportunities') {
      // Find opportunities matching member's skills and preferences
      const memberProfile = await hubspotService.getMemberProfile(session.user.id);
      
      const matchingOpportunities = await hubspotService.findMatchingOpportunities({
        member_id: session.user.id,
        skills: memberProfile.specialties,
        location: memberProfile.location,
        preferences: memberProfile.collaboration_preferences
      });

      return NextResponse.json({ opportunities: matchingOpportunities });
    } else if (type === 'partners') {
      // Find potential partners for joint ventures
      const potentialPartners = await hubspotService.findPotentialPartners({
        member_id: session.user.id,
        project_types: searchParams.get('project_types')?.split(','),
        location_radius: parseInt(searchParams.get('location_radius') || '50'),
        collaboration_type: searchParams.get('collaboration_type')
      });

      return NextResponse.json({ partners: potentialPartners });
    }

    return NextResponse.json({ error: 'Invalid type parameter' }, { status: 400 });
  } catch (error) {
    console.error('Error finding matches:', error);
    return NextResponse.json(
      { error: 'Failed to find matches' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();
    const { partner_id, project_type, collaboration_type, message } = data;

    // Create partnership proposal
    const proposal = await hubspotService.createPartnershipProposal({
      proposer_id: session.user.id,
      partner_id,
      project_type,
      collaboration_type,
      message
    });

    // Create local cache record
    await prisma.partnershipProposal.create({
      data: {
        proposer_id: session.user.id,
        partner_id,
        project_type,
        collaboration_type,
        message,
        status: 'pending'
      }
    });

    // Notify potential partner
    await hubspotService.notifyPartnershipProposal(partner_id, session.user.id);

    return NextResponse.json({ proposal });
  } catch (error) {
    console.error('Error creating partnership proposal:', error);
    return NextResponse.json(
      { error: 'Failed to create partnership proposal' },
      { status: 500 }
    );
  }
}
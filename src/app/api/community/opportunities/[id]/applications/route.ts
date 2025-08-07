import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { HubSpotBackboneService } from '@/lib/services/hubspot-backbone.service';
import { prisma } from '@/lib/prisma';

const hubspotService = new HubSpotBackboneService({
  accessToken: process.env.HUBSPOT_ACCESS_TOKEN!,
  portalId: process.env.HUBSPOT_PORTAL_ID
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user owns this opportunity
    const opportunity = await prisma.businessOpportunity.findFirst({
      where: {
        hubspot_deal_id: params.id,
        posted_by: session.user.id
      }
    });

    if (!opportunity) {
      return NextResponse.json({ error: 'Opportunity not found or unauthorized' }, { status: 404 });
    }

    // Get applications from local cache with member details
    const applications = await prisma.opportunityApplication.findMany({
      where: { opportunity_id: params.id },
      include: {
        applicant: {
          select: {
            id: true,
            name: true,
            email: true,
            company: true,
            specialties: true,
            location: true,
            profile_image: true
          }
        }
      },
      orderBy: { created_at: 'desc' }
    });

    return NextResponse.json({ applications });
  } catch (error) {
    console.error('Error fetching opportunity applications:', error);
    return NextResponse.json(
      { error: 'Failed to fetch applications' },
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

    const data = await request.json();
    const { application_id, status, response_message } = data;

    // Check if user owns this opportunity
    const opportunity = await prisma.businessOpportunity.findFirst({
      where: {
        hubspot_deal_id: params.id,
        posted_by: session.user.id
      }
    });

    if (!opportunity) {
      return NextResponse.json({ error: 'Opportunity not found or unauthorized' }, { status: 404 });
    }

    // Update application status
    const application = await prisma.opportunityApplication.update({
      where: { id: application_id },
      data: {
        status,
        response_message,
        responded_at: new Date()
      },
      include: {
        applicant: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    // Update in HubSpot
    await hubspotService.updateOpportunityApplication(application_id, {
      status,
      response_message
    });

    // If accepted, create collaboration workspace
    if (status === 'accepted') {
      await hubspotService.createCollaborationWorkspace({
        opportunity_id: params.id,
        poster_id: session.user.id,
        collaborator_id: application.applicant.id,
        workspace_type: opportunity.type
      });
    }

    // Notify applicant
    await hubspotService.notifyApplicationResponse(
      application.applicant.id,
      params.id,
      status,
      response_message
    );

    return NextResponse.json({ application });
  } catch (error) {
    console.error('Error updating application status:', error);
    return NextResponse.json(
      { error: 'Failed to update application' },
      { status: 500 }
    );
  }
}
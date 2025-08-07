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

    const opportunity = await hubspotService.getBusinessOpportunity(params.id);
    
    if (!opportunity) {
      return NextResponse.json({ error: 'Opportunity not found' }, { status: 404 });
    }

    return NextResponse.json({ opportunity });
  } catch (error) {
    console.error('Error fetching business opportunity:', error);
    return NextResponse.json(
      { error: 'Failed to fetch opportunity' },
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

    // Update in HubSpot
    const updatedOpportunity = await hubspotService.updateBusinessOpportunity(params.id, data);

    // Update local cache
    await prisma.businessOpportunity.update({
      where: { hubspot_deal_id: params.id },
      data: {
        title: data.title,
        description: data.description,
        category: data.category,
        skills_required: data.skills_required ? JSON.stringify(data.skills_required) : undefined,
        location: data.location,
        budget_range: data.budget_range,
        timeline: data.timeline,
        collaboration_type: data.collaboration_type,
        requirements: data.requirements ? JSON.stringify(data.requirements) : undefined,
        contact_preferences: data.contact_preferences ? JSON.stringify(data.contact_preferences) : undefined,
        status: data.status
      }
    });

    return NextResponse.json({ opportunity: updatedOpportunity });
  } catch (error) {
    console.error('Error updating business opportunity:', error);
    return NextResponse.json(
      { error: 'Failed to update opportunity' },
      { status: 500 }
    );
  }
}

export async function DELETE(
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

    // Update status in HubSpot (don't delete, just close)
    await hubspotService.closeBusinessOpportunity(params.id, 'withdrawn');

    // Update local cache
    await prisma.businessOpportunity.update({
      where: { hubspot_deal_id: params.id },
      data: { status: 'withdrawn' }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting business opportunity:', error);
    return NextResponse.json(
      { error: 'Failed to delete opportunity' },
      { status: 500 }
    );
  }
}
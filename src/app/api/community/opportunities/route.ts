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
    const category = searchParams.get('category');
    const skills = searchParams.get('skills')?.split(',');
    const location = searchParams.get('location');
    const type = searchParams.get('type'); // 'project', 'partnership', 'joint_venture', 'tool_sharing'

    // Get opportunities from HubSpot deals pipeline
    const opportunities = await hubspotService.getBusinessOpportunities({
      category,
      skills,
      location,
      type,
      memberId: session.user.id
    });

    return NextResponse.json({ opportunities });
  } catch (error) {
    console.error('Error fetching business opportunities:', error);
    return NextResponse.json(
      { error: 'Failed to fetch opportunities' },
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
    const {
      title,
      description,
      category,
      type, // 'project', 'partnership', 'joint_venture', 'tool_sharing'
      skills_required,
      location,
      budget_range,
      timeline,
      collaboration_type, // 'lead_contractor', 'equal_partner', 'subcontractor', 'resource_sharing'
      requirements,
      contact_preferences
    } = data;

    // Create business opportunity as HubSpot deal
    const opportunity = await hubspotService.createBusinessOpportunity({
      title,
      description,
      category,
      type,
      skills_required,
      location,
      budget_range,
      timeline,
      collaboration_type,
      requirements,
      contact_preferences,
      posted_by: session.user.id
    });

    // Find and notify matching members
    await hubspotService.notifyMatchingMembers(opportunity.id, {
      skills_required,
      location,
      category,
      type
    });

    // Create local cache record
    await prisma.businessOpportunity.create({
      data: {
        hubspot_deal_id: opportunity.id,
        title,
        description,
        category,
        type,
        skills_required: JSON.stringify(skills_required),
        location,
        budget_range,
        timeline,
        collaboration_type,
        requirements: JSON.stringify(requirements),
        contact_preferences: JSON.stringify(contact_preferences),
        posted_by: session.user.id,
        status: 'active'
      }
    });

    return NextResponse.json({ opportunity });
  } catch (error) {
    console.error('Error creating business opportunity:', error);
    return NextResponse.json(
      { error: 'Failed to create opportunity' },
      { status: 500 }
    );
  }
}
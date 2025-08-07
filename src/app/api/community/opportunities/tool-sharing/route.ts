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
    const tool_category = searchParams.get('category');
    const location = searchParams.get('location');
    const date_needed = searchParams.get('date_needed');

    // Get member-to-member tool sharing opportunities
    const toolSharingOpportunities = await hubspotService.getMemberToolSharing({
      requester_id: session.user.id,
      tool_category,
      location,
      date_needed
    });

    return NextResponse.json({ opportunities: toolSharingOpportunities });
  } catch (error) {
    console.error('Error fetching tool sharing opportunities:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tool sharing opportunities' },
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
      type, // 'offer' or 'request'
      tool_name,
      tool_category,
      description,
      availability_dates,
      location,
      rental_rate,
      deposit_required,
      delivery_available,
      pickup_instructions,
      condition_notes
    } = data;

    // Create tool sharing opportunity
    const opportunity = await hubspotService.createToolSharingOpportunity({
      member_id: session.user.id,
      type,
      tool_name,
      tool_category,
      description,
      availability_dates,
      location,
      rental_rate,
      deposit_required,
      delivery_available,
      pickup_instructions,
      condition_notes
    });

    // Create local cache record
    await prisma.memberToolSharing.create({
      data: {
        member_id: session.user.id,
        type,
        tool_name,
        tool_category,
        description,
        availability_dates: JSON.stringify(availability_dates),
        location,
        rental_rate,
        deposit_required,
        delivery_available,
        pickup_instructions,
        condition_notes,
        status: 'active'
      }
    });

    // Notify matching members
    if (type === 'offer') {
      await hubspotService.notifyToolSeekers({
        tool_category,
        location,
        tool_name
      });
    } else {
      await hubspotService.notifyToolProviders({
        tool_category,
        location,
        tool_name
      });
    }

    return NextResponse.json({ opportunity });
  } catch (error) {
    console.error('Error creating tool sharing opportunity:', error);
    return NextResponse.json(
      { error: 'Failed to create tool sharing opportunity' },
      { status: 500 }
    );
  }
}
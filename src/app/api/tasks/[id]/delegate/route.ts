import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { HubSpotBackboneService } from '@/lib/services/hubspot-backbone.service';

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

    const taskId = params.id;
    const body = await request.json();
    const { toMemberId, delegationNotes } = body;

    if (!toMemberId) {
      return NextResponse.json({ error: 'Delegate to member ID is required' }, { status: 400 });
    }

    // Delegate task to another member
    await hubspotService.delegateTask(
      taskId,
      session.user.id,
      toMemberId,
      delegationNotes
    );

    return NextResponse.json({ 
      success: true, 
      message: 'Task delegated successfully' 
    });

  } catch (error: any) {
    console.error('Error delegating task:', error);
    return NextResponse.json(
      { error: 'Failed to delegate task', details: error.message },
      { status: 500 }
    );
  }
}
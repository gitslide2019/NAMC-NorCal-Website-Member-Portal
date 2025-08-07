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
    const { assigneeId, notes } = body;

    if (!assigneeId) {
      return NextResponse.json({ error: 'Assignee ID is required' }, { status: 400 });
    }

    // Assign task to member
    await hubspotService.assignTaskToMember(
      taskId,
      assigneeId,
      session.user.id
    );

    // Add assignment notes if provided
    if (notes) {
      await hubspotService.updateTask(taskId, {
        assignment_notes: notes
      });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Task assigned successfully' 
    });

  } catch (error: any) {
    console.error('Error assigning task:', error);
    return NextResponse.json(
      { error: 'Failed to assign task', details: error.message },
      { status: 500 }
    );
  }
}
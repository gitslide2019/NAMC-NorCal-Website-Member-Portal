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
    const { completionNotes } = body;

    // Complete the task
    await hubspotService.completeTask(
      taskId,
      session.user.id,
      completionNotes
    );

    return NextResponse.json({ 
      success: true, 
      message: 'Task completed successfully' 
    });

  } catch (error: any) {
    console.error('Error completing task:', error);
    return NextResponse.json(
      { error: 'Failed to complete task', details: error.message },
      { status: 500 }
    );
  }
}
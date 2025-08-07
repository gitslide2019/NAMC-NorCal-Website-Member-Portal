import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { HubSpotBackboneService } from '@/lib/services/hubspot-backbone.service';

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

    const taskId = params.id;

    // Get task details from HubSpot
    const task = await hubspotService.getTask(taskId);

    // Transform task for frontend
    const transformedTask = {
      id: task.id,
      subject: task.properties.hs_task_subject,
      description: task.properties.hs_task_body,
      status: task.properties.hs_task_status,
      priority: task.properties.hs_task_priority,
      type: task.properties.hs_task_type,
      dueDate: task.properties.hs_task_due_date,
      assigneeId: task.properties.hubspot_owner_id,
      createdAt: task.properties.hs_createdate,
      updatedAt: task.properties.hs_lastmodifieddate,
      assignedBy: task.properties.assigned_by,
      assignedDate: task.properties.assigned_date,
      completedBy: task.properties.completed_by,
      completionDate: task.properties.completion_date,
      completionNotes: task.properties.completion_notes,
      delegatedFrom: task.properties.delegated_from,
      delegatedTo: task.properties.delegated_to,
      delegationDate: task.properties.delegation_date,
      delegationNotes: task.properties.delegation_notes,
      associations: {
        contacts: task.associations?.contacts || [],
        deals: task.associations?.deals || [],
        companies: task.associations?.companies || []
      }
    };

    return NextResponse.json({ task: transformedTask });

  } catch (error: any) {
    console.error('Error fetching task:', error);
    return NextResponse.json(
      { error: 'Failed to fetch task', details: error.message },
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

    const taskId = params.id;
    const body = await request.json();
    const {
      subject,
      description,
      priority,
      type,
      dueDate,
      status
    } = body;

    // Build update data
    const updateData: any = {};
    if (subject) updateData.hs_task_subject = subject;
    if (description !== undefined) updateData.hs_task_body = description;
    if (priority) updateData.hs_task_priority = priority;
    if (type) updateData.hs_task_type = type;
    if (dueDate) updateData.hs_task_due_date = new Date(dueDate).toISOString();
    if (status) updateData.hs_task_status = status;

    // Update task in HubSpot
    const updatedTask = await hubspotService.updateTask(taskId, updateData);

    // Transform response
    const transformedTask = {
      id: updatedTask.id,
      subject: updatedTask.properties.hs_task_subject,
      description: updatedTask.properties.hs_task_body,
      status: updatedTask.properties.hs_task_status,
      priority: updatedTask.properties.hs_task_priority,
      type: updatedTask.properties.hs_task_type,
      dueDate: updatedTask.properties.hs_task_due_date,
      assigneeId: updatedTask.properties.hubspot_owner_id,
      createdAt: updatedTask.properties.hs_createdate,
      updatedAt: updatedTask.properties.hs_lastmodifieddate
    };

    return NextResponse.json({ task: transformedTask });

  } catch (error: any) {
    console.error('Error updating task:', error);
    return NextResponse.json(
      { error: 'Failed to update task', details: error.message },
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

    const taskId = params.id;

    // Delete task from HubSpot
    await hubspotService.deleteTask(taskId);

    return NextResponse.json({ 
      success: true, 
      message: 'Task deleted successfully' 
    });

  } catch (error: any) {
    console.error('Error deleting task:', error);
    return NextResponse.json(
      { error: 'Failed to delete task', details: error.message },
      { status: 500 }
    );
  }
}
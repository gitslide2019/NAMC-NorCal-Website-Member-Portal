import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { HubSpotBackboneService } from '@/lib/services/hubspot-backbone.service';

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
    const status = searchParams.get('status') as 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | null;
    const projectId = searchParams.get('projectId');
    const assigneeId = searchParams.get('assigneeId');
    const priority = searchParams.get('priority');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build filter groups for HubSpot search
    const filterGroups = [];
    
    // Base filter for member's tasks (either assigned to them or created by them)
    const memberFilter = {
      filters: [
        {
          propertyName: 'associations.contact',
          operator: 'EQ',
          value: session.user.id
        }
      ]
    };

    // Add status filter if provided
    if (status) {
      memberFilter.filters.push({
        propertyName: 'hs_task_status',
        operator: 'EQ',
        value: status
      });
    }

    // Add priority filter if provided
    if (priority) {
      memberFilter.filters.push({
        propertyName: 'hs_task_priority',
        operator: 'EQ',
        value: priority
      });
    }

    // Add assignee filter if provided
    if (assigneeId) {
      memberFilter.filters.push({
        propertyName: 'hubspot_owner_id',
        operator: 'EQ',
        value: assigneeId
      });
    }

    filterGroups.push(memberFilter);

    // Search for tasks
    const searchRequest = {
      filterGroups,
      properties: [
        'hs_task_subject',
        'hs_task_body',
        'hs_task_status',
        'hs_task_priority',
        'hs_task_type',
        'hs_task_due_date',
        'hubspot_owner_id',
        'hs_createdate',
        'hs_lastmodifieddate',
        'assigned_by',
        'assigned_date',
        'completed_by',
        'completion_date',
        'completion_notes',
        'delegated_from',
        'delegated_to',
        'delegation_date',
        'delegation_notes'
      ],
      associations: ['contacts', 'deals', 'companies'],
      limit,
      after: offset.toString()
    };

    const tasksResponse = await hubspotService.searchTasks(searchRequest);

    // Transform tasks for frontend
    const tasks = tasksResponse.results.map((task: any) => ({
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
    }));

    return NextResponse.json({
      tasks,
      total: tasksResponse.total,
      hasMore: tasksResponse.paging?.next?.after ? true : false
    });

  } catch (error: any) {
    console.error('Error fetching tasks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tasks', details: error.message },
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

    const body = await request.json();
    const {
      subject,
      description,
      priority = 'MEDIUM',
      type = 'TODO',
      dueDate,
      assigneeId,
      projectId,
      companyId
    } = body;

    if (!subject) {
      return NextResponse.json({ error: 'Subject is required' }, { status: 400 });
    }

    // Create task data
    const taskData = {
      subject,
      description: description || '',
      priority,
      type,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      assigneeId: assigneeId || session.user.id,
      memberId: session.user.id,
      projectId,
      companyId
    };

    // Create task in HubSpot
    const task = await hubspotService.createTask(taskData);

    // Transform response
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
      updatedAt: task.properties.hs_lastmodifieddate
    };

    return NextResponse.json({ task: transformedTask }, { status: 201 });

  } catch (error: any) {
    console.error('Error creating task:', error);
    return NextResponse.json(
      { error: 'Failed to create task', details: error.message },
      { status: 500 }
    );
  }
}
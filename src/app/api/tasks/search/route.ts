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
    const query = searchParams.get('q');
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const assigneeId = searchParams.get('assigneeId');
    const projectId = searchParams.get('projectId');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build filter groups for HubSpot search
    const filters: any[] = [
      {
        propertyName: 'associations.contact',
        operator: 'EQ',
        value: session.user.id
      }
    ];

    // Add text search filter
    if (query) {
      filters.push({
        propertyName: 'hs_task_subject',
        operator: 'CONTAINS_TOKEN',
        value: query
      });
    }

    // Add status filter
    if (status) {
      filters.push({
        propertyName: 'hs_task_status',
        operator: 'EQ',
        value: status
      });
    }

    // Add priority filter
    if (priority) {
      filters.push({
        propertyName: 'hs_task_priority',
        operator: 'EQ',
        value: priority
      });
    }

    // Add assignee filter
    if (assigneeId) {
      filters.push({
        propertyName: 'hubspot_owner_id',
        operator: 'EQ',
        value: assigneeId
      });
    }

    // Add date range filters
    if (dateFrom) {
      filters.push({
        propertyName: 'hs_task_due_date',
        operator: 'GTE',
        value: new Date(dateFrom).getTime().toString()
      });
    }

    if (dateTo) {
      filters.push({
        propertyName: 'hs_task_due_date',
        operator: 'LTE',
        value: new Date(dateTo).getTime().toString()
      });
    }

    // Search for tasks
    const searchRequest = {
      filterGroups: [{ filters }],
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
      sorts: [
        {
          propertyName: 'hs_task_due_date',
          direction: 'ASCENDING'
        },
        {
          propertyName: 'hs_task_priority',
          direction: 'DESCENDING'
        }
      ],
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
      hasMore: tasksResponse.paging?.next?.after ? true : false,
      query: {
        q: query,
        status,
        priority,
        assigneeId,
        projectId,
        dateFrom,
        dateTo
      }
    });

  } catch (error: any) {
    console.error('Error searching tasks:', error);
    return NextResponse.json(
      { error: 'Failed to search tasks', details: error.message },
      { status: 500 }
    );
  }
}
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import HubSpotService from '@/services/hubspot.service';

// Mock database - replace with actual database implementation
let hubspotTaskSyncs: any[] = [];

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      taskId,
      projectId,
      taskName,
      description,
      status,
      priority,
      assignee,
      dueDate,
      dealId
    } = body;

    if (!taskId || !projectId || !taskName) {
      return NextResponse.json(
        { error: 'Task ID, Project ID, and Task Name are required' },
        { status: 400 }
      );
    }

    // Initialize HubSpot service
    const hubspotApiKey = process.env.HUBSPOT_API_KEY;
    if (!hubspotApiKey) {
      return NextResponse.json(
        { error: 'HubSpot API key not configured' },
        { status: 500 }
      );
    }

    const hubspotService = new HubSpotService(hubspotApiKey);

    // Sync task to HubSpot
    const syncResult = await hubspotService.syncProjectTask({
      taskId,
      projectId,
      taskName,
      description,
      status,
      priority,
      assignee,
      dueDate,
      dealId
    });

    if (syncResult.success) {
      // Store sync record
      const syncRecord = {
        id: `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        projectTaskId: taskId,
        hubspotTaskId: syncResult.hubspotTaskId,
        hubspotContactId: syncResult.hubspotContactId,
        lastSyncAt: new Date(),
        syncStatus: 'success',
        createdBy: session.user.id || session.user.email
      };

      hubspotTaskSyncs.push(syncRecord);

      return NextResponse.json({
        success: true,
        data: syncRecord,
        message: 'Task synced to HubSpot successfully'
      }, { status: 201 });
    } else {
      // Store failed sync record
      const syncRecord = {
        id: `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        projectTaskId: taskId,
        hubspotTaskId: null,
        hubspotContactId: null,
        lastSyncAt: new Date(),
        syncStatus: 'failed',
        errorMessage: syncResult.error,
        createdBy: session.user.id || session.user.email
      };

      hubspotTaskSyncs.push(syncRecord);

      return NextResponse.json({
        success: false,
        data: syncRecord,
        error: syncResult.error
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Error syncing task to HubSpot:', error);
    return NextResponse.json(
      { error: 'Failed to sync task to HubSpot' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      syncId,
      taskUpdates
    } = body;

    if (!syncId || !taskUpdates) {
      return NextResponse.json(
        { error: 'Sync ID and task updates are required' },
        { status: 400 }
      );
    }

    // Find sync record
    const syncRecord = hubspotTaskSyncs.find(sync => sync.id === syncId);
    if (!syncRecord) {
      return NextResponse.json(
        { error: 'Sync record not found' },
        { status: 404 }
      );
    }

    if (!syncRecord.hubspotTaskId) {
      return NextResponse.json(
        { error: 'No HubSpot task ID found for this sync record' },
        { status: 400 }
      );
    }

    // Initialize HubSpot service
    const hubspotApiKey = process.env.HUBSPOT_API_KEY;
    if (!hubspotApiKey) {
      return NextResponse.json(
        { error: 'HubSpot API key not configured' },
        { status: 500 }
      );
    }

    const hubspotService = new HubSpotService(hubspotApiKey);

    // Update task in HubSpot
    const updateResult = await hubspotService.updateProjectTaskSync(
      syncRecord.hubspotTaskId,
      taskUpdates
    );

    if (updateResult.success) {
      // Update sync record
      const syncIndex = hubspotTaskSyncs.findIndex(sync => sync.id === syncId);
      hubspotTaskSyncs[syncIndex] = {
        ...syncRecord,
        lastSyncAt: new Date(),
        syncStatus: 'success',
        errorMessage: undefined
      };

      return NextResponse.json({
        success: true,
        data: hubspotTaskSyncs[syncIndex],
        message: 'Task updated in HubSpot successfully'
      });
    } else {
      // Update sync record with error
      const syncIndex = hubspotTaskSyncs.findIndex(sync => sync.id === syncId);
      hubspotTaskSyncs[syncIndex] = {
        ...syncRecord,
        lastSyncAt: new Date(),
        syncStatus: 'failed',
        errorMessage: updateResult.error
      };

      return NextResponse.json({
        success: false,
        data: hubspotTaskSyncs[syncIndex],
        error: updateResult.error
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Error updating HubSpot task:', error);
    return NextResponse.json(
      { error: 'Failed to update HubSpot task' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('taskId');
    const projectId = searchParams.get('projectId');
    const status = searchParams.get('status');

    let filteredSyncs = hubspotTaskSyncs;

    if (taskId) {
      filteredSyncs = filteredSyncs.filter(sync => sync.projectTaskId === taskId);
    }

    if (projectId) {
      // This would require additional data structure to link project to tasks
      // For now, return all syncs
    }

    if (status) {
      filteredSyncs = filteredSyncs.filter(sync => sync.syncStatus === status);
    }

    return NextResponse.json({
      success: true,
      data: filteredSyncs,
      message: 'HubSpot sync records retrieved successfully'
    });

  } catch (error) {
    console.error('Error fetching HubSpot sync records:', error);
    return NextResponse.json(
      { error: 'Failed to fetch HubSpot sync records' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const syncId = searchParams.get('syncId');

    if (!syncId) {
      return NextResponse.json(
        { error: 'Sync ID is required' },
        { status: 400 }
      );
    }

    // Find sync record
    const syncRecord = hubspotTaskSyncs.find(sync => sync.id === syncId);
    if (!syncRecord) {
      return NextResponse.json(
        { error: 'Sync record not found' },
        { status: 404 }
      );
    }

    // Initialize HubSpot service and delete task if exists
    const hubspotApiKey = process.env.HUBSPOT_API_KEY;
    if (hubspotApiKey && syncRecord.hubspotTaskId) {
      const hubspotService = new HubSpotService(hubspotApiKey);
      try {
        await hubspotService.deleteTask(syncRecord.hubspotTaskId);
      } catch (error) {
        console.error('Error deleting HubSpot task:', error);
        // Continue to remove sync record even if HubSpot deletion fails
      }
    }

    // Remove sync record
    hubspotTaskSyncs = hubspotTaskSyncs.filter(sync => sync.id !== syncId);

    return NextResponse.json({
      success: true,
      message: 'HubSpot task sync removed successfully'
    });

  } catch (error) {
    console.error('Error removing HubSpot task sync:', error);
    return NextResponse.json(
      { error: 'Failed to remove HubSpot task sync' },
      { status: 500 }
    );
  }
}
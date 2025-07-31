import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
// Force dynamic rendering to prevent static generation during build
export const dynamic = 'force-dynamic'

import { authOptions } from '@/lib/auth';

// Mock database - replace with actual database implementation
let projectTasks: any[] = [];
let taskAssignments: any[] = [];
let taskComments: any[] = [];

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const memberId = searchParams.get('memberId');
    const status = searchParams.get('status');

    let filteredTasks = projectTasks;

    if (projectId) {
      filteredTasks = filteredTasks.filter(task => task.projectId === projectId);
    }

    if (memberId) {
      const memberTaskIds = taskAssignments
        .filter(assignment => assignment.memberId === memberId)
        .map(assignment => assignment.taskId);
      filteredTasks = filteredTasks.filter(task => memberTaskIds.includes(task.id));
    }

    if (status) {
      filteredTasks = filteredTasks.filter(task => task.status === status);
    }

    // Enrich tasks with assignments and comments
    const enrichedTasks = filteredTasks.map(task => ({
      ...task,
      assignments: taskAssignments.filter(assignment => assignment.taskId === task.id),
      comments: taskComments.filter(comment => comment.taskId === task.id)
    }));

    return NextResponse.json({
      success: true,
      data: enrichedTasks,
      message: 'Tasks retrieved successfully'
    });

  } catch (error) {
    console.error('Error fetching tasks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tasks' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      projectId,
      name,
      description,
      priority = 'medium',
      category = 'development',
      estimatedHours,
      dueDate,
      assignees = [],
      tags = []
    } = body;

    if (!projectId || !name) {
      return NextResponse.json(
        { error: 'Project ID and task name are required' },
        { status: 400 }
      );
    }

    // Create new task
    const newTask = {
      id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      projectId,
      name,
      description,
      status: 'not_started',
      priority,
      category,
      progress: 0,
      estimatedHours,
      dueDate: dueDate ? new Date(dueDate) : null,
      createdBy: session.user.id || session.user.email,
      createdAt: new Date(),
      updatedAt: new Date(),
      tags,
      attachments: [],
      hubspotTaskId: undefined as string | undefined
    };

    projectTasks.push(newTask);

    // Create assignments
    const assignments = assignees.map((assignee: any) => ({
      id: `assignment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      taskId: newTask.id,
      memberId: assignee.memberId,
      memberName: assignee.memberName,
      memberEmail: assignee.memberEmail,
      role: assignee.role || 'assignee',
      assignedAt: new Date(),
      assignedBy: session.user.id || session.user.email,
      estimatedHours: assignee.estimatedHours,
      notes: assignee.notes
    }));

    taskAssignments.push(...assignments);

    // Sync to HubSpot if configured
    if (process.env.HUBSPOT_API_KEY && assignments.length > 0) {
      try {
        const hubspotSyncResponse = await fetch('/api/projects/tasks/hubspot-sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            taskId: newTask.id,
            projectId,
            taskName: name,
            description,
            status: newTask.status,
            priority,
            assignee: assignments[0] ? {
              email: assignments[0].memberEmail,
              name: assignments[0].memberName
            } : undefined,
            dueDate
          })
        });

        if (hubspotSyncResponse.ok) {
          const syncResult = await hubspotSyncResponse.json();
          newTask.hubspotTaskId = syncResult.data?.hubspotTaskId;
        }
      } catch (error) {
        console.error('Error syncing task to HubSpot:', error);
      }
    }

    // Send notifications to assignees
    for (const assignment of assignments) {
      try {
        await fetch('/api/projects/notifications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectId,
            taskId: newTask.id,
            recipientId: assignment.memberId,
            type: 'task_assigned',
            title: 'New Task Assignment',
            message: `You have been assigned to task "${name}"`,
            actionUrl: `/member/projects?view=tasks&taskId=${newTask.id}`
          })
        });
      } catch (error) {
        console.error('Error sending task assignment notification:', error);
      }
    }

    // Prepare response with enriched task data
    const enrichedTask = {
      ...newTask,
      assignments,
      comments: [],
      dependencies: []
    };

    return NextResponse.json({
      success: true,
      data: enrichedTask,
      message: 'Task created successfully'
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating task:', error);
    return NextResponse.json(
      { error: 'Failed to create task' },
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
    const { taskId, ...updates } = body;

    if (!taskId) {
      return NextResponse.json(
        { error: 'Task ID is required' },
        { status: 400 }
      );
    }

    const taskIndex = projectTasks.findIndex(task => task.id === taskId);
    if (taskIndex === -1) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }

    // Update task
    projectTasks[taskIndex] = {
      ...projectTasks[taskIndex],
      ...updates,
      updatedAt: new Date()
    };

    // Handle status change to completed
    if (updates.status === 'completed' && projectTasks[taskIndex].status !== 'completed') {
      projectTasks[taskIndex].completedDate = new Date();
      projectTasks[taskIndex].progress = 100;
    }

    const updatedTask = {
      ...projectTasks[taskIndex],
      assignments: taskAssignments.filter(assignment => assignment.taskId === taskId),
      comments: taskComments.filter(comment => comment.taskId === taskId)
    };

    return NextResponse.json({
      success: true,
      data: updatedTask,
      message: 'Task updated successfully'
    });

  } catch (error) {
    console.error('Error updating task:', error);
    return NextResponse.json(
      { error: 'Failed to update task' },
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
    const taskId = searchParams.get('taskId');

    if (!taskId) {
      return NextResponse.json(
        { error: 'Task ID is required' },
        { status: 400 }
      );
    }

    const taskIndex = projectTasks.findIndex(task => task.id === taskId);
    if (taskIndex === -1) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }

    // Remove task and related data
    projectTasks.splice(taskIndex, 1);
    taskAssignments = taskAssignments.filter(assignment => assignment.taskId !== taskId);
    taskComments = taskComments.filter(comment => comment.taskId !== taskId);

    return NextResponse.json({
      success: true,
      message: 'Task deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting task:', error);
    return NextResponse.json(
      { error: 'Failed to delete task' },
      { status: 500 }
    );
  }
}
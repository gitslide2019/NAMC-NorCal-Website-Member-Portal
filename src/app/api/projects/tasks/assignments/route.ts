import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// Mock database - replace with actual database implementation
let taskAssignments: any[] = [];

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('taskId');
    const memberId = searchParams.get('memberId');

    let filteredAssignments = taskAssignments;

    if (taskId) {
      filteredAssignments = filteredAssignments.filter(assignment => assignment.taskId === taskId);
    }

    if (memberId) {
      filteredAssignments = filteredAssignments.filter(assignment => assignment.memberId === memberId);
    }

    return NextResponse.json({
      success: true,
      data: filteredAssignments,
      message: 'Task assignments retrieved successfully'
    });

  } catch (error) {
    console.error('Error fetching task assignments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch task assignments' },
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
      taskId,
      memberId,
      memberName,
      memberEmail,
      role = 'assignee',
      estimatedHours,
      notes
    } = body;

    if (!taskId || !memberId || !memberName || !memberEmail) {
      return NextResponse.json(
        { error: 'Task ID, member ID, name, and email are required' },
        { status: 400 }
      );
    }

    // Check if assignment already exists
    const existingAssignment = taskAssignments.find(
      assignment => assignment.taskId === taskId && assignment.memberId === memberId
    );

    if (existingAssignment) {
      return NextResponse.json(
        { error: 'Member is already assigned to this task' },
        { status: 400 }
      );
    }

    const newAssignment = {
      id: `assignment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      taskId,
      memberId,
      memberName,
      memberEmail,
      role,
      assignedAt: new Date(),
      assignedBy: session.user.id || session.user.email,
      estimatedHours,
      actualHours: 0,
      notes
    };

    taskAssignments.push(newAssignment);

    return NextResponse.json({
      success: true,
      data: newAssignment,
      message: 'Task assignment created successfully'
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating task assignment:', error);
    return NextResponse.json(
      { error: 'Failed to create task assignment' },
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
    const { assignmentId, ...updates } = body;

    if (!assignmentId) {
      return NextResponse.json(
        { error: 'Assignment ID is required' },
        { status: 400 }
      );
    }

    const assignmentIndex = taskAssignments.findIndex(assignment => assignment.id === assignmentId);
    if (assignmentIndex === -1) {
      return NextResponse.json(
        { error: 'Assignment not found' },
        { status: 404 }
      );
    }

    taskAssignments[assignmentIndex] = {
      ...taskAssignments[assignmentIndex],
      ...updates
    };

    return NextResponse.json({
      success: true,
      data: taskAssignments[assignmentIndex],
      message: 'Task assignment updated successfully'
    });

  } catch (error) {
    console.error('Error updating task assignment:', error);
    return NextResponse.json(
      { error: 'Failed to update task assignment' },
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
    const assignmentId = searchParams.get('assignmentId');

    if (!assignmentId) {
      return NextResponse.json(
        { error: 'Assignment ID is required' },
        { status: 400 }
      );
    }

    const assignmentIndex = taskAssignments.findIndex(assignment => assignment.id === assignmentId);
    if (assignmentIndex === -1) {
      return NextResponse.json(
        { error: 'Assignment not found' },
        { status: 404 }
      );
    }

    taskAssignments.splice(assignmentIndex, 1);

    return NextResponse.json({
      success: true,
      message: 'Task assignment removed successfully'
    });

  } catch (error) {
    console.error('Error removing task assignment:', error);
    return NextResponse.json(
      { error: 'Failed to remove task assignment' },
      { status: 500 }
    );
  }
}
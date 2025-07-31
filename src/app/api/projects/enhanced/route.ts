import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';

// Mock database - replace with actual database implementation
let enhancedProjects: any[] = [];
let projectCollaborators: any[] = [];
let projectActivities: any[] = [];

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

    let filteredProjects = enhancedProjects;

    if (projectId) {
      filteredProjects = filteredProjects.filter(project => project.id === projectId);
    }

    if (memberId) {
      const memberProjectIds = projectCollaborators
        .filter(collab => collab.memberId === memberId)
        .map(collab => collab.projectId);
      filteredProjects = filteredProjects.filter(project => memberProjectIds.includes(project.id));
    }

    if (status) {
      filteredProjects = filteredProjects.filter(project => project.status === status);
    }

    // Enrich projects with collaborators and activities
    const enrichedProjects = filteredProjects.map(project => {
      const collaborators = projectCollaborators.filter(collab => collab.projectId === project.id);
      const activities = projectActivities
        .filter(activity => activity.projectId === project.id)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 10); // Get latest 10 activities

      return {
        ...project,
        collaborators,
        activities,
        taskCount: project.taskCount || {
          total: 0,
          completed: 0,
          inProgress: 0,
          overdue: 0
        }
      };
    });

    return NextResponse.json({
      success: true,
      data: enrichedProjects,
      message: 'Enhanced projects retrieved successfully'
    });

  } catch (error) {
    console.error('Error fetching enhanced projects:', error);
    return NextResponse.json(
      { error: 'Failed to fetch enhanced projects' },
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
      title,
      description,
      category,
      budget,
      timeline,
      location,
      priority = 'medium',
      settings = {
        allowMemberSelfAssign: true,
        requireApprovalForTasks: false,
        enableTimeTracking: true,
        enableAutomaticNotifications: true,
        defaultTaskDuration: 8
      },
      initialCollaborators = []
    } = body;

    if (!title || !description || !category) {
      return NextResponse.json(
        { error: 'Title, description, and category are required' },
        { status: 400 }
      );
    }

    const newProject = {
      id: `enhanced_project_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title,
      description,
      category,
      budget: budget || { allocated: 0, spent: 0, remaining: 0, percentage: 0 },
      timeline: timeline || { 
        startDate: new Date().toISOString(), 
        endDate: null, 
        currentPhase: 'Planning', 
        progress: 0 
      },
      location: location || { address: '', city: '', state: '', coordinates: { lat: 0, lng: 0 } },
      status: 'open',
      priority,
      settings,
      workflows: [],
      milestones: [],
      documents: [],
      taskCount: {
        total: 0,
        completed: 0,
        inProgress: 0,
        overdue: 0
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    enhancedProjects.push(newProject);

    // Add project owner as collaborator
    const ownerCollaborator = {
      id: `collab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      projectId: newProject.id,
      memberId: session.user.id || session.user.email,
      memberName: session.user.name || '',
      memberEmail: session.user.email || '',
      role: 'owner',
      permissions: [
        { action: 'create_task', granted: true },
        { action: 'assign_task', granted: true },
        { action: 'edit_task', granted: true },
        { action: 'delete_task', granted: true },
        { action: 'view_financials', granted: true },
        { action: 'edit_project', granted: true },
        { action: 'manage_collaborators', granted: true }
      ],
      addedAt: new Date(),
      addedBy: session.user.id || session.user.email
    };

    projectCollaborators.push(ownerCollaborator);

    // Add initial collaborators
    initialCollaborators.forEach((collab: any) => {
      const collaborator = {
        id: `collab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        projectId: newProject.id,
        memberId: collab.memberId,
        memberName: collab.memberName,
        memberEmail: collab.memberEmail,
        role: collab.role || 'contributor',
        permissions: collab.permissions || [
          { action: 'create_task', granted: true },
          { action: 'assign_task', granted: false },
          { action: 'edit_task', granted: true },
          { action: 'delete_task', granted: false },
          { action: 'view_financials', granted: false },
          { action: 'edit_project', granted: false },
          { action: 'manage_collaborators', granted: false }
        ],
        addedAt: new Date(),
        addedBy: session.user.id || session.user.email
      };
      projectCollaborators.push(collaborator);
    });

    // Log project creation activity
    const createActivity = {
      id: `activity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      projectId: newProject.id,
      userId: session.user.id || session.user.email,
      userName: session.user.name || '',
      action: 'created',
      description: `Project "${title}" was created`,
      metadata: { category, priority },
      createdAt: new Date()
    };

    projectActivities.push(createActivity);

    const enrichedProject = {
      ...newProject,
      collaborators: [ownerCollaborator, ...initialCollaborators.map((collab: any, index: number) => ({
        ...collab,
        id: `collab_${Date.now() + index}_${Math.random().toString(36).substr(2, 9)}`,
        projectId: newProject.id,
        addedAt: new Date(),
        addedBy: session.user.id || session.user.email
      }))],
      activities: [createActivity]
    };

    return NextResponse.json({
      success: true,
      data: enrichedProject,
      message: 'Enhanced project created successfully'
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating enhanced project:', error);
    return NextResponse.json(
      { error: 'Failed to create enhanced project' },
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
    const { projectId, ...updates } = body;

    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      );
    }

    const projectIndex = enhancedProjects.findIndex(project => project.id === projectId);
    if (projectIndex === -1) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    enhancedProjects[projectIndex] = {
      ...enhancedProjects[projectIndex],
      ...updates,
      updatedAt: new Date().toISOString()
    };

    // Log update activity
    const updateActivity = {
      id: `activity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      projectId,
      userId: session.user.id || session.user.email,
      userName: session.user.name || '',
      action: 'updated',
      description: `Project was updated`,
      metadata: { updates: Object.keys(updates) },
      createdAt: new Date()
    };

    projectActivities.push(updateActivity);

    const updatedProject = {
      ...enhancedProjects[projectIndex],
      collaborators: projectCollaborators.filter(collab => collab.projectId === projectId),
      activities: projectActivities
        .filter(activity => activity.projectId === projectId)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 10)
    };

    return NextResponse.json({
      success: true,
      data: updatedProject,
      message: 'Enhanced project updated successfully'
    });

  } catch (error) {
    console.error('Error updating enhanced project:', error);
    return NextResponse.json(
      { error: 'Failed to update enhanced project' },
      { status: 500 }
    );
  }
}
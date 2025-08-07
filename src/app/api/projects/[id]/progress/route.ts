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

    const projectId = params.id;

    // Get project details
    const project = await hubspotService.getProject(projectId);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Get all tasks associated with the project
    const tasks = await hubspotService.getProjectTasks(projectId);

    // Calculate progress metrics
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(task => 
      task.properties.hs_task_status === 'COMPLETED'
    ).length;
    const inProgressTasks = tasks.filter(task => 
      task.properties.hs_task_status === 'IN_PROGRESS'
    ).length;
    const notStartedTasks = tasks.filter(task => 
      task.properties.hs_task_status === 'NOT_STARTED'
    ).length;
    const overdueTasks = tasks.filter(task => {
      if (!task.properties.hs_task_due_date || task.properties.hs_task_status === 'COMPLETED') {
        return false;
      }
      return new Date(task.properties.hs_task_due_date) < new Date();
    }).length;

    const progressPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    // Calculate timeline metrics
    const projectStartDate = project.properties.project_start_date ? 
      new Date(project.properties.project_start_date) : null;
    const projectEndDate = project.properties.project_end_date ? 
      new Date(project.properties.project_end_date) : null;
    
    let timelineProgress = 0;
    let daysElapsed = 0;
    let totalDays = 0;
    let daysRemaining = 0;

    if (projectStartDate && projectEndDate) {
      const now = new Date();
      totalDays = Math.ceil((projectEndDate.getTime() - projectStartDate.getTime()) / (1000 * 60 * 60 * 24));
      daysElapsed = Math.ceil((now.getTime() - projectStartDate.getTime()) / (1000 * 60 * 60 * 24));
      daysRemaining = Math.ceil((projectEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      timelineProgress = totalDays > 0 ? Math.round((daysElapsed / totalDays) * 100) : 0;
    }

    // Get recent task activities
    const recentActivities = tasks
      .filter(task => task.properties.hs_lastmodifieddate)
      .sort((a, b) => new Date(b.properties.hs_lastmodifieddate).getTime() - 
                     new Date(a.properties.hs_lastmodifieddate).getTime())
      .slice(0, 10)
      .map(task => ({
        id: task.id,
        subject: task.properties.hs_task_subject,
        status: task.properties.hs_task_status,
        lastModified: task.properties.hs_lastmodifieddate,
        assigneeId: task.properties.hubspot_owner_id,
        completedBy: task.properties.completed_by,
        completionDate: task.properties.completion_date
      }));

    // Calculate milestone progress
    const milestones = [
      { name: 'Project Start', percentage: 0, completed: daysElapsed > 0 },
      { name: '25% Complete', percentage: 25, completed: progressPercentage >= 25 },
      { name: '50% Complete', percentage: 50, completed: progressPercentage >= 50 },
      { name: '75% Complete', percentage: 75, completed: progressPercentage >= 75 },
      { name: 'Project Complete', percentage: 100, completed: progressPercentage >= 100 }
    ];

    // Get team performance metrics
    const teamPerformance = {};
    tasks.forEach(task => {
      const assigneeId = task.properties.hubspot_owner_id;
      if (assigneeId) {
        if (!teamPerformance[assigneeId]) {
          teamPerformance[assigneeId] = {
            assigneeId,
            totalTasks: 0,
            completedTasks: 0,
            overdueTasks: 0,
            avgCompletionTime: 0
          };
        }
        
        teamPerformance[assigneeId].totalTasks++;
        
        if (task.properties.hs_task_status === 'COMPLETED') {
          teamPerformance[assigneeId].completedTasks++;
        }
        
        if (task.properties.hs_task_due_date && 
            task.properties.hs_task_status !== 'COMPLETED' &&
            new Date(task.properties.hs_task_due_date) < new Date()) {
          teamPerformance[assigneeId].overdueTasks++;
        }
      }
    });

    // Calculate completion rates for team members
    Object.values(teamPerformance).forEach((member: any) => {
      member.completionRate = member.totalTasks > 0 ? 
        Math.round((member.completedTasks / member.totalTasks) * 100) : 0;
    });

    const progressData = {
      project: {
        id: projectId,
        name: project.properties.dealname,
        status: project.properties.dealstage,
        startDate: projectStartDate?.toISOString(),
        endDate: projectEndDate?.toISOString(),
        budget: project.properties.amount
      },
      progress: {
        percentage: progressPercentage,
        timelineProgress,
        daysElapsed,
        totalDays,
        daysRemaining
      },
      tasks: {
        total: totalTasks,
        completed: completedTasks,
        inProgress: inProgressTasks,
        notStarted: notStartedTasks,
        overdue: overdueTasks
      },
      milestones,
      recentActivities,
      teamPerformance: Object.values(teamPerformance),
      lastUpdated: new Date().toISOString()
    };

    return NextResponse.json(progressData);

  } catch (error: any) {
    console.error('Error fetching project progress:', error);
    return NextResponse.json(
      { error: 'Failed to fetch project progress', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const projectId = params.id;
    const body = await request.json();
    const { action, data } = body;

    switch (action) {
      case 'update_milestone':
        // Update project milestone
        await hubspotService.updateProject(projectId, {
          [`milestone_${data.milestone}`]: data.completed ? 'true' : 'false',
          [`milestone_${data.milestone}_date`]: data.completed ? new Date().toISOString() : ''
        });
        break;

      case 'add_progress_note':
        // Add progress note to project
        await hubspotService.addProjectNote(projectId, {
          note: data.note,
          author: session.user.id,
          timestamp: new Date().toISOString(),
          type: 'progress_update'
        });
        break;

      case 'update_timeline':
        // Update project timeline
        await hubspotService.updateProject(projectId, {
          project_start_date: data.startDate,
          project_end_date: data.endDate,
          timeline_updated_by: session.user.id,
          timeline_updated_date: new Date().toISOString()
        });
        break;

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    // Trigger progress update workflow
    await hubspotService.triggerWorkflow('project_progress_updated', projectId);

    return NextResponse.json({ 
      success: true, 
      message: 'Project progress updated successfully' 
    });

  } catch (error: any) {
    console.error('Error updating project progress:', error);
    return NextResponse.json(
      { error: 'Failed to update project progress', details: error.message },
      { status: 500 }
    );
  }
}
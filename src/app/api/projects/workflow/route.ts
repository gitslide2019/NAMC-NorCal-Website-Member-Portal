import { NextRequest, NextResponse } from 'next/server'
import { ProjectWorkflowService, ProjectStatus, ProjectPhase } from '@/lib/services/project-workflow.service'
import { getServerSession } from 'next-auth'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')
    const status = searchParams.get('status')?.split(',') as ProjectStatus[]
    const phase = searchParams.get('phase')?.split(',') as ProjectPhase[]
    const assignedTo = searchParams.get('assignedTo') || undefined
    const priority = searchParams.get('priority')?.split(',')
    const overdue = searchParams.get('overdue') === 'true'

    const workflowService = new ProjectWorkflowService()

    if (projectId) {
      // Get specific project workflow
      const workflow = await workflowService.getProjectWorkflow(projectId)
      await workflowService.disconnect()

      if (!workflow) {
        return NextResponse.json({
          success: false,
          error: 'Project workflow not found'
        }, { status: 404 })
      }

      return NextResponse.json({
        success: true,
        data: workflow
      })
    } else {
      // Get all projects with workflow status
      const projects = await workflowService.getProjectsWithWorkflowStatus({
        status,
        phase,
        assignedTo,
        priority,
        overdue
      })

      await workflowService.disconnect()

      return NextResponse.json({
        success: true,
        data: {
          projects,
          totalCount: projects.length,
          filters: {
            status,
            phase,
            assignedTo,
            priority,
            overdue
          }
        }
      })
    }

  } catch (error) {
    console.error('Error in project workflow GET:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get project workflow data'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const {
      projectId,
      initialStatus = 'draft',
      priority = 'medium',
      dueDate,
      assignedTo,
      automationRules = []
    } = await request.json()

    if (!projectId) {
      return NextResponse.json({
        success: false,
        error: 'projectId is required'
      }, { status: 400 })
    }

    const workflowService = new ProjectWorkflowService()

    const workflowId = await workflowService.createProjectWorkflow(
      projectId,
      initialStatus,
      session.user.id,
      {
        priority,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        assignedTo,
        automationRules
      }
    )

    await workflowService.disconnect()

    return NextResponse.json({
      success: true,
      data: {
        workflowId,
        projectId,
        status: initialStatus,
        message: 'Project workflow created successfully'
      }
    })

  } catch (error) {
    console.error('Error creating project workflow:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create project workflow'
    }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const {
      projectId,
      newStatus,
      reason,
      notes
    } = await request.json()

    if (!projectId || !newStatus || !reason) {
      return NextResponse.json({
        success: false,
        error: 'projectId, newStatus, and reason are required'
      }, { status: 400 })
    }

    const workflowService = new ProjectWorkflowService()

    const success = await workflowService.updateProjectStatus(
      projectId,
      newStatus,
      session.user.id,
      reason,
      notes
    )

    await workflowService.disconnect()

    if (success) {
      return NextResponse.json({
        success: true,
        data: {
          projectId,
          newStatus,
          message: 'Project status updated successfully'
        }
      })
    } else {
      return NextResponse.json({
        success: false,
        error: 'Failed to update project status'
      }, { status: 500 })
    }

  } catch (error) {
    console.error('Error updating project status:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update project status'
    }, { status: 500 })
  }
}
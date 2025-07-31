import { NextRequest, NextResponse } from 'next/server'
import { ProjectWorkflowService } from '@/lib/services/project-workflow.service'
import { getServerSession } from 'next-auth'

// Force dynamic rendering to prevent static generation during build
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const {
      projectId,
      title,
      description,
      dueDate,
      dependencies = [],
      deliverables = []
    } = await request.json()

    if (!projectId || !title || !description || !dueDate) {
      return NextResponse.json({
        success: false,
        error: 'projectId, title, description, and dueDate are required'
      }, { status: 400 })
    }

    const workflowService = new ProjectWorkflowService()

    const milestoneId = await workflowService.addProjectMilestone(
      projectId,
      {
        title,
        description,
        dueDate: new Date(dueDate),
        completed: false,
        dependencies,
        deliverables
      },
      session.user.id
    )

    await workflowService.disconnect()

    return NextResponse.json({
      success: true,
      data: {
        milestoneId,
        projectId,
        title,
        message: 'Project milestone added successfully'
      }
    })

  } catch (error) {
    console.error('Error adding project milestone:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to add project milestone'
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
      milestoneId,
      action = 'complete'
    } = await request.json()

    if (!projectId || !milestoneId) {
      return NextResponse.json({
        success: false,
        error: 'projectId and milestoneId are required'
      }, { status: 400 })
    }

    const workflowService = new ProjectWorkflowService()

    let success = false
    if (action === 'complete') {
      success = await workflowService.completeMilestone(
        projectId,
        milestoneId,
        session.user.id
      )
    }

    await workflowService.disconnect()

    if (success) {
      return NextResponse.json({
        success: true,
        data: {
          projectId,
          milestoneId,
          action,
          message: `Milestone ${action}d successfully`
        }
      })
    } else {
      return NextResponse.json({
        success: false,
        error: `Failed to ${action} milestone`
      }, { status: 500 })
    }

  } catch (error) {
    console.error('Error updating project milestone:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update project milestone'
    }, { status: 500 })
  }
}
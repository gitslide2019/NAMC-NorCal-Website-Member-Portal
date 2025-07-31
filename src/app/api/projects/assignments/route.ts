import { NextRequest, NextResponse } from 'next/server'
import { ProjectWorkflowService } from '@/lib/services/project-workflow.service'
import { getServerSession } from 'next-auth'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const {
      projectId,
      userId,
      role,
      permissions = []
    } = await request.json()

    if (!projectId || !userId || !role) {
      return NextResponse.json({
        success: false,
        error: 'projectId, userId, and role are required'
      }, { status: 400 })
    }

    // Validate role
    const validRoles = ['owner', 'manager', 'coordinator', 'reviewer', 'observer']
    if (!validRoles.includes(role)) {
      return NextResponse.json({
        success: false,
        error: `Invalid role. Must be one of: ${validRoles.join(', ')}`
      }, { status: 400 })
    }

    const workflowService = new ProjectWorkflowService()

    const success = await workflowService.assignUserToProject(
      projectId,
      userId,
      role,
      session.user.id,
      permissions
    )

    await workflowService.disconnect()

    if (success) {
      return NextResponse.json({
        success: true,
        data: {
          projectId,
          userId,
          role,
          message: `User assigned as ${role} successfully`
        }
      })
    } else {
      return NextResponse.json({
        success: false,
        error: 'Failed to assign user to project'
      }, { status: 500 })
    }

  } catch (error) {
    console.error('Error assigning user to project:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to assign user to project'
    }, { status: 500 })
  }
}
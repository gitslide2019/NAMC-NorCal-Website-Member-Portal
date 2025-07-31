/**
 * Project Workflow Management Service
 * 
 * Handles project status transitions, workflow automation, and lifecycle management
 * Integrates with engagement tracking and HubSpot for comprehensive project management
 */

import { PrismaClient } from '@prisma/client'
import { HubSpotIntegrationService } from './hubspot-integration.service'
import { notificationService } from './notification.service'

export interface ProjectWorkflow {
  id: string
  projectId: string
  status: ProjectStatus
  previousStatus?: ProjectStatus
  assignedTo?: string
  assignedBy?: string
  dueDate?: Date
  priority: 'low' | 'medium' | 'high' | 'critical'
  phase: ProjectPhase
  progress: number // 0-100
  blockers: string[]
  dependencies: string[]
  milestones: ProjectMilestone[]
  statusHistory: StatusChange[]
  automationRules: WorkflowRule[]
  metadata: Record<string, any>
  createdAt: Date
  updatedAt: Date
}

export type ProjectStatus = 
  | 'draft'           // Initial project creation
  | 'review'          // Under administrative review
  | 'approved'        // Approved for publication
  | 'active'          // Live and accepting applications
  | 'applications_open' // Actively recruiting
  | 'applications_closed' // No longer accepting applications
  | 'evaluation'      // Reviewing submitted applications
  | 'awarded'         // Contract awarded
  | 'in_progress'     // Project execution phase
  | 'on_hold'         // Temporarily paused
  | 'completed'       // Successfully finished
  | 'cancelled'       // Terminated before completion
  | 'archived'        // Moved to archive

export type ProjectPhase =
  | 'planning'        // Initial planning and setup
  | 'procurement'     // Bid and application process
  | 'selection'       // Contractor selection
  | 'execution'       // Project implementation
  | 'closeout'        // Final documentation and review
  | 'maintenance'     // Ongoing maintenance phase

export interface ProjectMilestone {
  id: string
  title: string
  description: string
  dueDate: Date
  completed: boolean
  completedAt?: Date
  completedBy?: string
  dependencies: string[]
  deliverables: string[]
}

export interface StatusChange {
  id: string
  fromStatus: ProjectStatus
  toStatus: ProjectStatus
  changedBy: string
  changedAt: Date
  reason: string
  notes?: string
  automated: boolean
  triggerEvent?: string
}

export interface WorkflowRule {
  id: string
  name: string
  trigger: WorkflowTrigger
  conditions: WorkflowCondition[]
  actions: WorkflowAction[]
  enabled: boolean
  priority: number
}

export interface WorkflowTrigger {
  type: 'status_change' | 'date_reached' | 'engagement_threshold' | 'member_action' | 'manual'
  conditions: Record<string, any>
}

export interface WorkflowCondition {
  field: string
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'in' | 'not_in'
  value: any
}

export interface WorkflowAction {
  type: 'status_change' | 'send_notification' | 'assign_user' | 'create_task' | 'update_hubspot' | 'send_email'
  parameters: Record<string, any>
}

export interface ProjectAssignment {
  id: string
  projectId: string
  userId: string
  role: 'owner' | 'manager' | 'coordinator' | 'reviewer' | 'observer'
  assignedBy: string
  assignedAt: Date
  permissions: string[]
  notifications: boolean
}

export class ProjectWorkflowService {
  private prisma: PrismaClient
  private hubspotService: HubSpotIntegrationService

  constructor() {
    this.prisma = new PrismaClient()
    this.hubspotService = new HubSpotIntegrationService()
  }

  /**
   * Get project workflow status and details
   */
  async getProjectWorkflow(projectId: string): Promise<ProjectWorkflow | null> {
    try {
      const result = await this.prisma.$queryRaw<ProjectWorkflow[]>`
        SELECT 
          pw.id,
          pw.project_id as "projectId",
          pw.status,
          pw.previous_status as "previousStatus",
          pw.assigned_to as "assignedTo",
          pw.assigned_by as "assignedBy",
          pw.due_date as "dueDate",
          pw.priority,
          pw.phase,
          pw.progress,
          pw.blockers,
          pw.dependencies,
          pw.milestones,
          pw.status_history as "statusHistory",
          pw.automation_rules as "automationRules",
          pw.metadata,
          pw.created_at as "createdAt",
          pw.updated_at as "updatedAt"
        FROM project_workflows pw
        WHERE pw.project_id = ${projectId}::uuid
        ORDER BY pw.updated_at DESC
        LIMIT 1
      `

      return result[0] || null
    } catch (error) {
      console.error('Error getting project workflow:', error)
      return null
    }
  }

  /**
   * Update project status with workflow validation
   */
  async updateProjectStatus(
    projectId: string,
    newStatus: ProjectStatus,
    userId: string,
    reason: string,
    notes?: string
  ): Promise<boolean> {
    try {
      const workflow = await this.getProjectWorkflow(projectId)
      if (!workflow) {
        throw new Error('Project workflow not found')
      }

      // Validate status transition
      const isValidTransition = this.isValidStatusTransition(workflow.status, newStatus)
      if (!isValidTransition) {
        throw new Error(`Invalid status transition from ${workflow.status} to ${newStatus}`)
      }

      // Create status change record
      const statusChange: StatusChange = {
        id: crypto.randomUUID(),
        fromStatus: workflow.status,
        toStatus: newStatus,
        changedBy: userId,
        changedAt: new Date(),
        reason,
        notes,
        automated: false
      }

      // Update workflow
      const updatedStatusHistory = [...workflow.statusHistory, statusChange]
      const newPhase = this.determinePhaseFromStatus(newStatus)
      const newProgress = this.calculateProgressFromStatus(newStatus)

      await this.prisma.$executeRaw`
        UPDATE project_workflows 
        SET 
          status = ${newStatus}::project_status,
          previous_status = ${workflow.status}::project_status,
          phase = ${newPhase}::project_phase,
          progress = ${newProgress},
          status_history = ${JSON.stringify(updatedStatusHistory)}::jsonb,
          updated_at = NOW()
        WHERE project_id = ${projectId}::uuid
      `

      // Trigger automation rules
      await this.triggerWorkflowRules(projectId, 'status_change', {
        fromStatus: workflow.status,
        toStatus: newStatus,
        userId
      })

      // Update HubSpot if integration is enabled
      await this.syncProjectStatusToHubSpot(projectId, newStatus, workflow)

      // Send notification about status change
      await notificationService.notifyProjectStatusChange(
        projectId,
        workflow.status,
        newStatus,
        userId,
        reason || 'Status updated'
      ).catch(error => {
        console.error('Failed to send status change notification:', error)
      })

      console.log(`Project ${projectId} status updated from ${workflow.status} to ${newStatus}`)
      return true

    } catch (error) {
      console.error('Error updating project status:', error)
      return false
    }
  }

  /**
   * Create or update project workflow
   */
  async createProjectWorkflow(
    projectId: string,
    initialStatus: ProjectStatus = 'draft',
    createdBy: string,
    options: {
      priority?: 'low' | 'medium' | 'high' | 'critical'
      dueDate?: Date
      assignedTo?: string
      automationRules?: WorkflowRule[]
    } = {}
  ): Promise<string> {
    try {
      const workflowId = crypto.randomUUID()
      const initialPhase = this.determinePhaseFromStatus(initialStatus)
      const initialProgress = this.calculateProgressFromStatus(initialStatus)

      const initialStatusChange: StatusChange = {
        id: crypto.randomUUID(),
        fromStatus: 'draft' as ProjectStatus,
        toStatus: initialStatus,
        changedBy: createdBy,
        changedAt: new Date(),
        reason: 'Initial workflow creation',
        automated: false
      }

      await this.prisma.$executeRaw`
        INSERT INTO project_workflows (
          id, project_id, status, assigned_to, assigned_by, due_date,
          priority, phase, progress, blockers, dependencies, milestones,
          status_history, automation_rules, metadata
        ) VALUES (
          ${workflowId}::uuid,
          ${projectId}::uuid,
          ${initialStatus}::project_status,
          ${options.assignedTo || null}::uuid,
          ${createdBy}::uuid,
          ${options.dueDate || null}::timestamp,
          ${options.priority || 'medium'}::workflow_priority,
          ${initialPhase}::project_phase,
          ${initialProgress},
          '[]'::jsonb,
          '[]'::jsonb,
          '[]'::jsonb,
          ${JSON.stringify([initialStatusChange])}::jsonb,
          ${JSON.stringify(options.automationRules || [])}::jsonb,
          '{}'::jsonb
        )
      `

      console.log(`Created project workflow ${workflowId} for project ${projectId}`)
      return workflowId

    } catch (error) {
      console.error('Error creating project workflow:', error)
      throw new Error('Failed to create project workflow')
    }
  }

  /**
   * Assign user to project with specific role
   */
  async assignUserToProject(
    projectId: string,
    userId: string,
    role: 'owner' | 'manager' | 'coordinator' | 'reviewer' | 'observer',
    assignedBy: string,
    permissions: string[] = []
  ): Promise<boolean> {
    try {
      const assignmentId = crypto.randomUUID()

      await this.prisma.$executeRaw`
        INSERT INTO project_assignments (
          id, project_id, user_id, role, assigned_by, permissions, notifications
        ) VALUES (
          ${assignmentId}::uuid,
          ${projectId}::uuid,
          ${userId}::uuid,
          ${role}::project_role,
          ${assignedBy}::uuid,
          ${JSON.stringify(permissions)}::jsonb,
          true
        )
        ON CONFLICT (project_id, user_id) 
        DO UPDATE SET 
          role = EXCLUDED.role,
          assigned_by = EXCLUDED.assigned_by,
          permissions = EXCLUDED.permissions,
          assigned_at = NOW()
      `

      // Update workflow assigned_to if role is owner or manager
      if (role === 'owner' || role === 'manager') {
        await this.prisma.$executeRaw`
          UPDATE project_workflows 
          SET 
            assigned_to = ${userId}::uuid,
            assigned_by = ${assignedBy}::uuid,
            updated_at = NOW()
          WHERE project_id = ${projectId}::uuid
        `
      }

      // Send assignment notification
      await notificationService.notifyAssignmentCreated(
        projectId,
        assignmentId,
        userId
      ).catch(error => {
        console.error('Failed to send assignment notification:', error)
      })

      console.log(`Assigned user ${userId} to project ${projectId} as ${role}`)
      return true

    } catch (error) {
      console.error('Error assigning user to project:', error)
      return false
    }
  }

  /**
   * Add milestone to project
   */
  async addProjectMilestone(
    projectId: string,
    milestone: Omit<ProjectMilestone, 'id'>,
    createdBy: string
  ): Promise<string> {
    try {
      const workflow = await this.getProjectWorkflow(projectId)
      if (!workflow) {
        throw new Error('Project workflow not found')
      }

      const milestoneId = crypto.randomUUID()
      const newMilestone: ProjectMilestone = {
        ...milestone,
        id: milestoneId
      }

      const updatedMilestones = [...workflow.milestones, newMilestone]

      await this.prisma.$executeRaw`
        UPDATE project_workflows 
        SET 
          milestones = ${JSON.stringify(updatedMilestones)}::jsonb,
          updated_at = NOW()
        WHERE project_id = ${projectId}::uuid
      `

      console.log(`Added milestone ${milestoneId} to project ${projectId}`)
      return milestoneId

    } catch (error) {
      console.error('Error adding project milestone:', error)
      throw new Error('Failed to add project milestone')
    }
  }

  /**
   * Complete milestone
   */
  async completeMilestone(
    projectId: string,
    milestoneId: string,
    completedBy: string
  ): Promise<boolean> {
    try {
      const workflow = await this.getProjectWorkflow(projectId)
      if (!workflow) {
        throw new Error('Project workflow not found')
      }

      const updatedMilestones = workflow.milestones.map(milestone => {
        if (milestone.id === milestoneId) {
          return {
            ...milestone,
            completed: true,
            completedAt: new Date(),
            completedBy
          }
        }
        return milestone
      })

      await this.prisma.$executeRaw`
        UPDATE project_workflows 
        SET 
          milestones = ${JSON.stringify(updatedMilestones)}::jsonb,
          updated_at = NOW()
        WHERE project_id = ${projectId}::uuid
      `

      // Check if all milestones are completed and trigger automation
      const allCompleted = updatedMilestones.every(m => m.completed)
      if (allCompleted) {
        await this.triggerWorkflowRules(projectId, 'milestones_completed', {
          completedBy,
          totalMilestones: updatedMilestones.length
        })
      }

      console.log(`Completed milestone ${milestoneId} for project ${projectId}`)
      return true

    } catch (error) {
      console.error('Error completing milestone:', error)
      return false
    }
  }

  /**
   * Get all projects with their workflow status
   */
  async getProjectsWithWorkflowStatus(filters: {
    status?: ProjectStatus[]
    phase?: ProjectPhase[]
    assignedTo?: string
    priority?: string[]
    overdue?: boolean
  } = {}): Promise<Array<ProjectWorkflow & { projectTitle: string; projectClient: string }>> {
    try {
      let whereConditions = ['1=1']
      const params: any[] = []

      if (filters.status && filters.status.length > 0) {
        whereConditions.push(`pw.status = ANY($${params.length + 1}::project_status[])`)
        params.push(filters.status)
      }

      if (filters.phase && filters.phase.length > 0) {
        whereConditions.push(`pw.phase = ANY($${params.length + 1}::project_phase[])`)
        params.push(filters.phase)
      }

      if (filters.assignedTo) {
        whereConditions.push(`pw.assigned_to = $${params.length + 1}::uuid`)
        params.push(filters.assignedTo)
      }

      if (filters.priority && filters.priority.length > 0) {
        whereConditions.push(`pw.priority = ANY($${params.length + 1}::workflow_priority[])`)
        params.push(filters.priority)
      }

      if (filters.overdue) {
        whereConditions.push(`pw.due_date < NOW() AND pw.status NOT IN ('completed', 'cancelled', 'archived')`)
      }

      const whereClause = whereConditions.join(' AND ')

      const result = await this.prisma.$queryRaw<Array<ProjectWorkflow & { projectTitle: string; projectClient: string }>>`
        SELECT 
          pw.id,
          pw.project_id as "projectId",
          pw.status,
          pw.previous_status as "previousStatus",
          pw.assigned_to as "assignedTo",
          pw.assigned_by as "assignedBy",
          pw.due_date as "dueDate",
          pw.priority,
          pw.phase,
          pw.progress,
          pw.blockers,
          pw.dependencies,
          pw.milestones,
          pw.status_history as "statusHistory",
          pw.automation_rules as "automationRules",
          pw.metadata,
          pw.created_at as "createdAt",
          pw.updated_at as "updatedAt",
          p.title as "projectTitle",
          p.client as "projectClient"
        FROM project_workflows pw
        JOIN projects p ON pw.project_id = p.id
        WHERE ${whereClause}
        ORDER BY pw.updated_at DESC
      `

      return result
    } catch (error) {
      console.error('Error getting projects with workflow status:', error)
      return []
    }
  }

  /**
   * Trigger workflow automation rules
   */
  private async triggerWorkflowRules(
    projectId: string,
    triggerType: string,
    context: Record<string, any>
  ): Promise<void> {
    try {
      const workflow = await this.getProjectWorkflow(projectId)
      if (!workflow) return

      const applicableRules = workflow.automationRules
        .filter(rule => rule.enabled && rule.trigger.type === triggerType)
        .sort((a, b) => a.priority - b.priority)

      for (const rule of applicableRules) {
        const conditionsMet = this.evaluateWorkflowConditions(rule.conditions, context, workflow)
        
        if (conditionsMet) {
          await this.executeWorkflowActions(projectId, rule.actions, context)
          console.log(`Executed workflow rule: ${rule.name} for project ${projectId}`)
        }
      }
    } catch (error) {
      console.error('Error triggering workflow rules:', error)
    }
  }

  /**
   * Evaluate workflow conditions
   */
  private evaluateWorkflowConditions(
    conditions: WorkflowCondition[],
    context: Record<string, any>,
    workflow: ProjectWorkflow
  ): boolean {
    return conditions.every(condition => {
      const fieldValue = this.getFieldValue(condition.field, context, workflow)
      
      switch (condition.operator) {
        case 'equals':
          return fieldValue === condition.value
        case 'not_equals':
          return fieldValue !== condition.value
        case 'greater_than':
          return Number(fieldValue) > Number(condition.value)
        case 'less_than':
          return Number(fieldValue) < Number(condition.value)
        case 'contains':
          return String(fieldValue).includes(String(condition.value))
        case 'in':
          return Array.isArray(condition.value) && condition.value.includes(fieldValue)
        case 'not_in':
          return Array.isArray(condition.value) && !condition.value.includes(fieldValue)
        default:
          return false
      }
    })
  }

  /**
   * Execute workflow actions
   */
  private async executeWorkflowActions(
    projectId: string,
    actions: WorkflowAction[],
    context: Record<string, any>
  ): Promise<void> {
    for (const action of actions) {
      try {
        switch (action.type) {
          case 'status_change':
            await this.updateProjectStatus(
              projectId,
              action.parameters.newStatus,
              action.parameters.userId || 'system',
              'Automated status change',
              action.parameters.notes
            )
            break

          case 'assign_user':
            await this.assignUserToProject(
              projectId,
              action.parameters.userId,
              action.parameters.role || 'observer',
              'system'
            )
            break

          case 'update_hubspot':
            await this.syncProjectStatusToHubSpot(projectId, context.toStatus)
            break

          case 'send_notification':
            // This would integrate with the notification system
            console.log(`Notification triggered: ${action.parameters.message}`)
            break

          default:
            console.log(`Unknown action type: ${action.type}`)
        }
      } catch (error) {
        console.error(`Error executing workflow action ${action.type}:`, error)
      }
    }
  }

  /**
   * Helper methods
   */
  private isValidStatusTransition(fromStatus: ProjectStatus, toStatus: ProjectStatus): boolean {
    const validTransitions: Record<ProjectStatus, ProjectStatus[]> = {
      'draft': ['review', 'cancelled'],
      'review': ['approved', 'draft', 'cancelled'],
      'approved': ['active', 'review', 'cancelled'],
      'active': ['applications_open', 'on_hold', 'cancelled'],
      'applications_open': ['applications_closed', 'on_hold', 'cancelled'],
      'applications_closed': ['evaluation', 'applications_open', 'cancelled'],
      'evaluation': ['awarded', 'applications_open', 'cancelled'],
      'awarded': ['in_progress', 'cancelled'],
      'in_progress': ['completed', 'on_hold', 'cancelled'],
      'on_hold': ['in_progress', 'cancelled'],
      'completed': ['archived'],
      'cancelled': ['archived'],
      'archived': []
    }

    return validTransitions[fromStatus]?.includes(toStatus) || false
  }

  private determinePhaseFromStatus(status: ProjectStatus): ProjectPhase {
    const statusPhaseMap: Record<ProjectStatus, ProjectPhase> = {
      'draft': 'planning',
      'review': 'planning',
      'approved': 'planning',
      'active': 'procurement',
      'applications_open': 'procurement',
      'applications_closed': 'procurement',
      'evaluation': 'selection',
      'awarded': 'selection',
      'in_progress': 'execution',
      'on_hold': 'execution',
      'completed': 'closeout',
      'cancelled': 'closeout',
      'archived': 'closeout'
    }

    return statusPhaseMap[status] || 'planning'
  }

  private calculateProgressFromStatus(status: ProjectStatus): number {
    const statusProgressMap: Record<ProjectStatus, number> = {
      'draft': 5,
      'review': 10,
      'approved': 15,
      'active': 20,
      'applications_open': 30,
      'applications_closed': 40,
      'evaluation': 50,
      'awarded': 60,
      'in_progress': 75,
      'on_hold': 75,
      'completed': 100,
      'cancelled': 0,
      'archived': 100
    }

    return statusProgressMap[status] || 0
  }

  private getFieldValue(field: string, context: Record<string, any>, workflow: ProjectWorkflow): any {
    // Check context first
    if (context[field] !== undefined) {
      return context[field]
    }

    // Check workflow properties
    return (workflow as any)[field]
  }

  private async syncProjectStatusToHubSpot(
    projectId: string,
    status: ProjectStatus,
    workflow?: ProjectWorkflow
  ): Promise<void> {
    try {
      // This would sync project status changes to related HubSpot deals
      // Implementation depends on how projects are linked to HubSpot deals
      console.log(`Syncing project ${projectId} status ${status} to HubSpot`)
    } catch (error) {
      console.error('Error syncing project status to HubSpot:', error)
    }
  }

  async disconnect(): Promise<void> {
    await this.prisma.$disconnect()
    await this.hubspotService.disconnect()
  }
}

// Export singleton instance
export const projectWorkflowService = new ProjectWorkflowService()
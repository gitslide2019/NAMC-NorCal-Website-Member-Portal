/**
 * HubSpot Project Integration Service
 * 
 * Enhanced HubSpot integration specifically for construction project management
 * Extends the existing NAMC HubSpot MCP service with project-specific features
 */

import { NAMCHubSpotMCPService } from './hubspot-mcp-service'
import { 
  ConstructionProject, 
  ProjectMilestone, 
  ProjectTeamMember,
  ProjectDocument,
  ChangeOrder,
  PaymentMilestone
} from '@/types/construction-project.types'

interface HubSpotDealStage {
  stageId: string
  label: string
  probability: number
}

// HubSpot deal pipeline stages for construction projects
const CONSTRUCTION_DEAL_STAGES: Record<string, HubSpotDealStage> = {
  'draft': { stageId: 'appointmentscheduled', label: 'Initial Consultation', probability: 10 },
  'estimating': { stageId: 'qualifiedtobuy', label: 'Estimating', probability: 20 },
  'quoted': { stageId: 'presentationscheduled', label: 'Quote Presented', probability: 40 },
  'negotiating': { stageId: 'decisionmakerboughtin', label: 'Negotiating', probability: 60 },
  'contracted': { stageId: 'contractsent', label: 'Contract Signed', probability: 80 },
  'permitting': { stageId: 'contractsent', label: 'Permitting Phase', probability: 80 },
  'scheduled': { stageId: 'contractsent', label: 'Project Scheduled', probability: 85 },
  'in_progress': { stageId: 'contractsent', label: 'In Progress', probability: 90 },
  'on_hold': { stageId: 'contractsent', label: 'On Hold', probability: 75 },
  'completed': { stageId: 'closedwon', label: 'Completed', probability: 100 },
  'closed': { stageId: 'closedwon', label: 'Closed Won', probability: 100 },
  'cancelled': { stageId: 'closedlost', label: 'Cancelled', probability: 0 }
}

export class HubSpotProjectService extends NAMCHubSpotMCPService {
  
  /**
   * Sync construction project to HubSpot as a deal with all related data
   */
  async syncConstructionProjectToHubSpot(project: ConstructionProject): Promise<{
    dealId: string
    contactId: string
    companyId?: string
    taskIds: string[]
    syncStatus: 'success' | 'partial' | 'failed'
    errors?: string[]
  }> {
    const errors: string[] = []
    let dealId = ''
    let contactId = ''
    let companyId = ''
    const taskIds: string[] = []
    
    try {
      // Step 1: Sync or create client contact
      const contactResult = await this.syncProjectClient(project)
      contactId = contactResult.contactId
      companyId = contactResult.companyId || ''
      
      if (contactResult.errors) {
        errors.push(...contactResult.errors)
      }
      
      // Step 2: Create or update deal
      const dealResult = await this.syncProjectDeal(project, contactId, companyId)
      dealId = dealResult.dealId
      
      if (dealResult.errors) {
        errors.push(...dealResult.errors)
      }
      
      // Step 3: Sync project milestones as tasks
      const taskResult = await this.syncProjectMilestones(project, dealId, contactId)
      taskIds.push(...taskResult.taskIds)
      
      if (taskResult.errors) {
        errors.push(...taskResult.errors)
      }
      
      // Step 4: Create project team associations
      await this.syncProjectTeam(project, dealId)
      
      // Step 5: Set up automated workflows
      await this.setupProjectWorkflows(project, dealId, contactId)
      
      const syncStatus = errors.length === 0 ? 'success' : 
                        (dealId && contactId) ? 'partial' : 'failed'
      
      return {
        dealId,
        contactId,
        companyId,
        taskIds,
        syncStatus,
        errors: errors.length > 0 ? errors : undefined
      }
      
    } catch (error) {
      console.error('Error syncing project to HubSpot:', error)
      return {
        dealId,
        contactId,
        companyId,
        taskIds,
        syncStatus: 'failed',
        errors: [error instanceof Error ? error.message : 'Unknown error']
      }
    }
  }
  
  /**
   * Sync project client to HubSpot contact and company
   */
  private async syncProjectClient(project: ConstructionProject): Promise<{
    contactId: string
    companyId?: string
    errors?: string[]
  }> {
    const errors: string[] = []
    
    try {
      // Convert to NAMC member format for existing sync method
      const namcMember = {
        id: project.client.id,
        email: project.client.email,
        firstName: project.client.contactPerson.split(' ')[0] || 'Unknown',
        lastName: project.client.contactPerson.split(' ').slice(1).join(' ') || '',
        company: project.client.companyName,
        phone: project.client.phone,
        membershipTier: 'Bronze' as const,
        memberStatus: 'active' as const,
        specialties: [],
        yearsExperience: 0,
        certifications: [],
        serviceAreas: [project.location.city],
        joinDate: new Date().toISOString(),
        renewalDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        projectsCompleted: 0,
        averageProjectValue: project.budget.estimated.total,
        preferredProjectTypes: [project.category],
        businessSize: 'small' as const,
        minorityClassification: [],
        address: {
          street: project.location.address,
          city: project.location.city,
          state: project.location.state,
          zipCode: project.location.zipCode
        }
      }
      
      const result = await this.syncMemberToHubSpot(namcMember)
      
      return {
        contactId: result.contactId,
        companyId: project.client.hubspotCompanyId
      }
      
    } catch (error) {
      errors.push(`Failed to sync client: ${error instanceof Error ? error.message : 'Unknown error'}`)
      return {
        contactId: project.client.hubspotContactId || '',
        errors
      }
    }
  }
  
  /**
   * Sync project as HubSpot deal
   */
  private async syncProjectDeal(
    project: ConstructionProject,
    contactId: string,
    companyId?: string
  ): Promise<{ dealId: string; errors?: string[] }> {
    const errors: string[] = []
    
    try {
      // Convert to NAMC project format for existing sync method
      const namcProject = {
        id: project.id,
        title: project.title,
        description: project.description,
        clientName: project.client.companyName,
        clientContact: {
          name: project.client.contactPerson,
          email: project.client.email,
          phone: project.client.phone,
          company: project.client.companyName
        },
        projectType: project.category,
        category: project.subcategory || project.category,
        budget: {
          total: project.budget.estimated.total,
          allocated: project.budget.estimated.total,
          spent: project.budget.actual.total,
          remaining: project.budget.estimated.total - project.budget.actual.total
        },
        timeline: {
          startDate: project.timeline.estimatedStartDate.toISOString(),
          endDate: project.timeline.estimatedEndDate.toISOString(),
          estimatedDuration: Math.ceil(
            (project.timeline.estimatedEndDate.getTime() - project.timeline.estimatedStartDate.getTime()) / 
            (1000 * 60 * 60 * 24)
          ),
          currentPhase: project.timeline.currentPhase,
          progress: this.calculateProjectProgress(project)
        },
        team: {
          projectManager: project.team.find(m => m.role === 'project_manager')?.name || 'TBD',
          members: project.team.map(member => ({
            memberId: member.id,
            role: member.role,
            company: member.company,
            specialization: member.specialization || ''
          }))
        },
        location: {
          address: project.location.address,
          city: project.location.city,
          state: project.location.state,
          zipCode: project.location.zipCode,
          coordinates: project.location.coordinates
        },
        permits: project.permits.map(permit => ({
          type: permit.type,
          number: permit.permitNumber || '',
          status: permit.status,
          issuedDate: permit.approvalDate?.toISOString(),
          expiryDate: permit.expirationDate?.toISOString()
        })),
        milestones: project.timeline.milestones.map(milestone => ({
          name: milestone.name,
          dueDate: milestone.targetDate.toISOString(),
          completedDate: milestone.completedDate?.toISOString(),
          status: milestone.status,
          responsible: milestone.assignedTo?.join(', ') || ''
        })),
        workflows: [], // Will be populated from milestones
        status: project.status,
        priority: project.priority,
        riskLevel: project.riskLevel,
        qualityScore: 85, // Default score
        sustainabilityRating: project.specifications.greenCertifications?.join(', '),
        minorityParticipation: {
          percentage: 0, // To be calculated
          targetPercentage: 30,
          certifiedFirms: 0,
          totalFirms: project.team.length
        }
      }
      
      const result = await this.syncProjectToHubSpot(namcProject, contactId)
      
      // Update deal with construction-specific properties
      await this.updateDealWithConstructionData(result.dealId, project)
      
      return { dealId: result.dealId }
      
    } catch (error) {
      errors.push(`Failed to sync deal: ${error instanceof Error ? error.message : 'Unknown error'}`)
      return {
        dealId: project.hubspotDealId || '',
        errors
      }
    }
  }
  
  /**
   * Update deal with construction-specific custom properties
   */
  private async updateDealWithConstructionData(dealId: string, project: ConstructionProject) {
    try {
      const updateData = {
        properties: {
          // Construction-specific properties
          namc_project_square_footage: project.specifications.squareFootage?.toString() || '',
          namc_project_stories: project.specifications.stories?.toString() || '',
          namc_project_units: project.specifications.units?.toString() || '',
          namc_project_parking_spaces: project.specifications.parkingSpaces?.toString() || '',
          namc_contract_signed: project.contractSigned ? 'Yes' : 'No',
          namc_contract_signed_date: project.contractSignedDate?.toISOString() || '',
          namc_permit_count: project.permits.length.toString(),
          namc_approved_permits: project.permits.filter(p => p.status === 'approved').length.toString(),
          namc_special_requirements: project.specifications.specialRequirements?.join(', ') || '',
          namc_green_certifications: project.specifications.greenCertifications?.join(', ') || '',
          namc_parcel_number: project.location.parcelNumber || '',
          namc_lot_size: project.location.lotSize?.toString() || '',
          namc_zoning_type: project.location.zoningType || '',
          namc_weather_days: project.timeline.weatherDays.toString(),
          namc_buffer_days: project.timeline.bufferDays.toString(),
          
          // Financial data
          namc_estimated_materials: project.budget.estimated.materials.toString(),
          namc_estimated_labor: project.budget.estimated.labor.toString(),
          namc_estimated_equipment: project.budget.estimated.equipment.toString(),
          namc_contingency_percentage: project.budget.contingency.toString(),
          namc_profit_margin_percentage: project.budget.profitMargin.toString(),
          namc_change_orders_count: project.budget.changeOrders.length.toString(),
          namc_change_orders_value: project.budget.changeOrders.reduce((sum, co) => sum + co.cost, 0).toString()
        }
      }
      
      await this.apiClient.patch(`/crm/v3/objects/deals/${dealId}`, updateData)
      
    } catch (error) {
      console.error('Error updating deal with construction data:', error)
      throw error
    }
  }
  
  /**
   * Sync project milestones as HubSpot tasks
   */
  private async syncProjectMilestones(
    project: ConstructionProject,
    dealId: string,
    contactId: string
  ): Promise<{ taskIds: string[]; errors?: string[] }> {
    const taskIds: string[] = []
    const errors: string[] = []
    
    try {
      for (const milestone of project.timeline.milestones) {
        try {
          const taskData = {
            properties: {
              hs_task_subject: `[${project.title}] ${milestone.name}`,
              hs_task_body: `Project: ${project.title}\nMilestone: ${milestone.name}\nDescription: ${milestone.description || ''}\nDue: ${milestone.targetDate.toLocaleDateString()}\nCritical Path: ${milestone.isCritical ? 'Yes' : 'No'}`,
              hs_task_status: this.mapMilestoneStatusToHubSpot(milestone.status),
              hs_task_priority: milestone.isCritical ? 'HIGH' : 'MEDIUM',
              hs_task_type: 'TODO',
              hs_timestamp: milestone.targetDate.getTime(),
              
              // Custom properties
              namc_milestone_id: milestone.id,
              namc_is_critical_path: milestone.isCritical ? 'true' : 'false',
              namc_milestone_phase: milestone.phase,
              namc_deliverables: milestone.deliverables.join(', '),
              namc_dependencies: milestone.dependencies.join(', ')
            }
          }
          
          const response = await this.apiClient.post('/crm/v3/objects/tasks', taskData)
          const taskId = response.data.id
          taskIds.push(taskId)
          
          // Associate with deal
          await this.associateObjects('tasks', taskId, 'deals', dealId, 212)
          
          // Associate with contact
          await this.associateObjects('tasks', taskId, 'contacts', contactId, 204)
          
          // Store HubSpot task ID in milestone
          milestone.hubspotTaskId = taskId
          
        } catch (taskError) {
          errors.push(`Failed to create task for milestone ${milestone.name}: ${taskError instanceof Error ? taskError.message : 'Unknown error'}`)
        }
      }
      
      return { taskIds, errors: errors.length > 0 ? errors : undefined }
      
    } catch (error) {
      return {
        taskIds,
        errors: [`Failed to sync milestones: ${error instanceof Error ? error.message : 'Unknown error'}`]
      }
    }
  }
  
  /**
   * Sync project team members as HubSpot contacts and associations
   */
  private async syncProjectTeam(project: ConstructionProject, dealId: string) {
    for (const teamMember of project.team) {
      try {
        // Check if contact exists
        let contact = await this.findContactByEmail(teamMember.email)
        
        if (!contact) {
          // Create new contact
          const contactData = {
            properties: {
              email: teamMember.email,
              firstname: teamMember.name.split(' ')[0],
              lastname: teamMember.name.split(' ').slice(1).join(' '),
              company: teamMember.company,
              phone: teamMember.phone || '',
              jobtitle: this.formatJobTitle(teamMember.role),
              
              // NAMC team member properties
              namc_member_role: teamMember.role,
              namc_specialization: teamMember.specialization || '',
              namc_license_number: teamMember.licenseNumber || '',
              namc_hourly_rate: teamMember.hourlyRate?.toString() || '',
              namc_insurance_carrier: teamMember.insurance?.carrier || '',
              namc_insurance_policy: teamMember.insurance?.policyNumber || '',
              namc_insurance_expiry: teamMember.insurance?.expirationDate.toISOString() || ''
            }
          }
          
          const response = await this.apiClient.post('/crm/v3/objects/contacts', contactData)
          contact = response.data
        }
        
        // Associate team member with deal
        await this.associateObjects('contacts', contact.id, 'deals', dealId, 3) // Contact to Deal association
        
        // Update team member with HubSpot contact ID
        teamMember.hubspotContactId = contact.id
        
      } catch (error) {
        console.error(`Failed to sync team member ${teamMember.name}:`, error)
      }
    }
  }
  
  /**
   * Set up automated workflows for project lifecycle
   */
  private async setupProjectWorkflows(project: ConstructionProject, dealId: string, contactId: string) {
    // This would set up HubSpot workflows based on project status and milestones
    // Implementation would depend on your HubSpot workflow setup
    
    const workflowTriggers = [
      {
        name: 'Project Status Change',
        trigger: `Deal stage changes for deal ${dealId}`,
        actions: [
          'Send notification to project team',
          'Update project timeline tasks',
          'Log activity in project feed'
        ]
      },
      {
        name: 'Milestone Due Reminder',
        trigger: 'Task due date approaches',
        actions: [
          'Send reminder email',
          'Create follow-up task',
          'Update project status if overdue'
        ]
      },
      {
        name: 'Budget Threshold Alert',
        trigger: 'Budget utilization exceeds 80%',
        actions: [
          'Alert project manager',
          'Request budget review meeting',
          'Create change order task if needed'
        ]
      }
    ]
    
    console.log('Project workflows to be configured:', workflowTriggers)
  }
  
  /**
   * Update project status in HubSpot
   */
  async updateProjectStatus(projectId: string, newStatus: string, dealId?: string) {
    try {
      if (!dealId) {
        // Find deal by project ID
        const searchResult = await this.apiClient.post('/crm/v3/objects/deals/search', {
          filterGroups: [{
            filters: [{
              propertyName: 'namc_project_id',
              operator: 'EQ',
              value: projectId
            }]
          }]
        })
        
        if (searchResult.data.results.length === 0) {
          throw new Error('Deal not found for project')
        }
        
        dealId = searchResult.data.results[0].id
      }
      
      const stageInfo = CONSTRUCTION_DEAL_STAGES[newStatus]
      if (!stageInfo) {
        throw new Error(`Invalid project status: ${newStatus}`)
      }
      
      const updateData = {
        properties: {
          dealstage: stageInfo.stageId,
          hs_deal_stage_probability: stageInfo.probability.toString(),
          namc_project_status: newStatus,
          namc_status_updated_date: new Date().toISOString()
        }
      }
      
      await this.apiClient.patch(`/crm/v3/objects/deals/${dealId}`, updateData)
      
      return { success: true, dealId, newStage: stageInfo.stageId }
      
    } catch (error) {
      console.error('Error updating project status in HubSpot:', error)
      throw error
    }
  }
  
  /**
   * Sync milestone completion to HubSpot
   */
  async completeMilestone(milestoneId: string, completedBy: string, hubspotTaskId?: string) {
    try {
      if (hubspotTaskId) {
        const updateData = {
          properties: {
            hs_task_status: 'COMPLETED',
            namc_completed_by: completedBy,
            namc_completed_date: new Date().toISOString()
          }
        }
        
        await this.apiClient.patch(`/crm/v3/objects/tasks/${hubspotTaskId}`, updateData)
      }
      
      return { success: true }
      
    } catch (error) {
      console.error('Error completing milestone in HubSpot:', error)
      throw error
    }
  }
  
  /**
   * Helper methods
   */
  private calculateProjectProgress(project: ConstructionProject): number {
    if (project.timeline.milestones.length === 0) return 0
    
    const completedMilestones = project.timeline.milestones.filter(m => m.status === 'completed')
    return Math.round((completedMilestones.length / project.timeline.milestones.length) * 100)
  }
  
  private mapMilestoneStatusToHubSpot(status: string): string {
    const statusMap: Record<string, string> = {
      'pending': 'NOT_STARTED',
      'in_progress': 'IN_PROGRESS', 
      'completed': 'COMPLETED',
      'delayed': 'WAITING'
    }
    
    return statusMap[status] || 'NOT_STARTED'
  }
  
  private formatJobTitle(role: string): string {
    const roleMap: Record<string, string> = {
      'project_manager': 'Project Manager',
      'site_supervisor': 'Site Supervisor',
      'architect': 'Architect',
      'engineer': 'Engineer',
      'subcontractor': 'Subcontractor',
      'inspector': 'Inspector'
    }
    
    return roleMap[role] || role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
  }
}

// Export singleton instance
export const hubspotProjectService = new HubSpotProjectService({
  accessToken: process.env.HUBSPOT_ACCESS_TOKEN || '',
  portalId: process.env.HUBSPOT_PORTAL_ID
})
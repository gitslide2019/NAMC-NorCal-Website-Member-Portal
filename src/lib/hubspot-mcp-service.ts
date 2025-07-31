/**
 * NAMC HubSpot MCP (Model Context Protocol) Service
 * 
 * Comprehensive HubSpot integration service for NAMC Member Portal featuring:
 * - Custom property management and synchronization
 * - Advanced member CRM workflows
 * - Project management integration
 * - Task and milestone tracking
 * - Automated workflow triggers
 * - Member lifecycle management
 * - Custom reporting and analytics
 */

import axios, { AxiosResponse } from 'axios';

interface HubSpotConfig {
  accessToken: string;
  portalId?: string;
  baseUrl?: string;
}

interface NAMCMember {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  company?: string;
  phone?: string;
  membershipTier: 'Bronze' | 'Silver' | 'Gold' | 'Platinum';
  memberStatus: 'active' | 'inactive' | 'pending' | 'suspended';
  specialties: string[];
  yearsExperience: number;
  certifications: string[];
  serviceAreas: string[];
  website?: string;
  linkedin?: string;
  joinDate: string;
  renewalDate: string;
  projectsCompleted: number;
  averageProjectValue: number;
  preferredProjectTypes: string[];
  businessSize: 'sole_proprietor' | 'small' | 'medium' | 'large';
  minorityClassification: string[];
  address?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
  };
}

interface NAMCProject {
  id: string;
  title: string;
  description: string;
  clientName: string;
  clientContact: {
    name: string;
    email: string;
    phone: string;
    company: string;
  };
  projectType: 'residential' | 'commercial' | 'industrial' | 'infrastructure';
  category: string;
  budget: {
    total: number;
    allocated: number;
    spent: number;
    remaining: number;
  };
  timeline: {
    startDate: string;
    endDate: string;
    estimatedDuration: number;
    currentPhase: string;
    progress: number;
  };
  team: {
    projectManager: string;
    members: Array<{
      memberId: string;
      role: string;
      company: string;
      specialization: string;
    }>;
  };
  location: {
    address: string;
    city: string;
    state: string;
    zipCode: string;
    coordinates?: { lat: number; lng: number };
  };
  permits: Array<{
    type: string;
    number: string;
    status: 'pending' | 'approved' | 'rejected';
    issuedDate?: string;
    expiryDate?: string;
  }>;
  milestones: Array<{
    name: string;
    dueDate: string;
    completedDate?: string;
    status: 'pending' | 'in_progress' | 'completed' | 'delayed';
    responsible: string;
  }>;
  workflows: Array<{
    id: string;
    name: string;
    status: 'pending' | 'in_progress' | 'completed';
    tasks: Array<{
      id: string;
      name: string;
      assignee: string;
      dueDate: string;
      priority: 'low' | 'medium' | 'high' | 'critical';
      status: 'not_started' | 'in_progress' | 'completed' | 'blocked';
      dependencies?: string[];
    }>;
  }>;
  status: 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'critical';
  riskLevel: 'low' | 'medium' | 'high';
  qualityScore?: number;
  sustainabilityRating?: string;
  minorityParticipation: {
    percentage: number;
    targetPercentage: number;
    certifiedFirms: number;
    totalFirms: number;
  };
}

interface HubSpotCustomProperty {
  name: string;
  label: string;
  description: string;
  groupName: string;
  type: 'string' | 'number' | 'date' | 'datetime' | 'enumeration' | 'bool';
  fieldType: 'text' | 'textarea' | 'select' | 'radio' | 'checkbox' | 'date' | 'file';
  options?: Array<{ label: string; value: string }>;
  required?: boolean;
  searchable?: boolean;
  calculated?: boolean;
  externalOptions?: boolean;
}

export class NAMCHubSpotMCPService {
  private config: HubSpotConfig;
  private apiClient: any;
  private customProperties: Map<string, HubSpotCustomProperty> = new Map();

  constructor(config: HubSpotConfig) {
    this.config = {
      baseUrl: 'https://api.hubapi.com',
      ...config
    };

    this.apiClient = axios.create({
      baseURL: this.config.baseUrl,
      headers: {
        'Authorization': `Bearer ${this.config.accessToken}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });

    this.initializeCustomProperties();
  }

  /**
   * Initialize and create custom properties for NAMC workflow
   */
  private async initializeCustomProperties() {
    // Define custom properties for Contacts (Members)
    const contactProperties: HubSpotCustomProperty[] = [
      {
        name: 'namc_member_id',
        label: 'NAMC Member ID',
        description: 'Unique identifier for NAMC member',
        groupName: 'namc_member_info',
        type: 'string',
        fieldType: 'text',
        searchable: true
      },
      {
        name: 'namc_membership_tier',
        label: 'Membership Tier',
        description: 'NAMC membership tier level',
        groupName: 'namc_member_info',
        type: 'enumeration',
        fieldType: 'select',
        options: [
          { label: 'Bronze', value: 'bronze' },
          { label: 'Silver', value: 'silver' },
          { label: 'Gold', value: 'gold' },
          { label: 'Platinum', value: 'platinum' }
        ]
      },
      {
        name: 'namc_member_status',
        label: 'Member Status',
        description: 'Current NAMC membership status',
        groupName: 'namc_member_info',
        type: 'enumeration',
        fieldType: 'select',
        options: [
          { label: 'Active', value: 'active' },
          { label: 'Inactive', value: 'inactive' },
          { label: 'Pending', value: 'pending' },
          { label: 'Suspended', value: 'suspended' }
        ]
      },
      {
        name: 'namc_specialties',
        label: 'Member Specialties',
        description: 'Areas of construction specialization',
        groupName: 'namc_member_info',
        type: 'string',
        fieldType: 'textarea'
      },
      {
        name: 'namc_years_experience',
        label: 'Years of Experience',
        description: 'Years of experience in construction industry',
        groupName: 'namc_member_info',
        type: 'number',
        fieldType: 'text'
      },
      {
        name: 'namc_certifications',
        label: 'Certifications',
        description: 'Professional certifications and licenses',
        groupName: 'namc_member_info',
        type: 'string',
        fieldType: 'textarea'
      },
      {
        name: 'namc_service_areas',
        label: 'Service Areas',
        description: 'Geographic areas served',
        groupName: 'namc_member_info',
        type: 'string',
        fieldType: 'textarea'
      },
      {
        name: 'namc_join_date',
        label: 'NAMC Join Date',
        description: 'Date when member joined NAMC',
        groupName: 'namc_member_info',
        type: 'date',
        fieldType: 'date'
      },
      {
        name: 'namc_renewal_date',
        label: 'Membership Renewal Date',
        description: 'Next membership renewal date',
        groupName: 'namc_member_info',
        type: 'date',
        fieldType: 'date'
      },
      {
        name: 'namc_projects_completed',
        label: 'Projects Completed',
        description: 'Number of projects completed through NAMC',
        groupName: 'namc_member_metrics',
        type: 'number',
        fieldType: 'text'
      },
      {
        name: 'namc_avg_project_value',
        label: 'Average Project Value',
        description: 'Average value of projects completed',
        groupName: 'namc_member_metrics',
        type: 'number',
        fieldType: 'text'
      },
      {
        name: 'namc_business_size',
        label: 'Business Size',
        description: 'Size classification of member business',
        groupName: 'namc_member_info',
        type: 'enumeration',
        fieldType: 'select',
        options: [
          { label: 'Sole Proprietor', value: 'sole_proprietor' },
          { label: 'Small (1-10 employees)', value: 'small' },
          { label: 'Medium (11-50 employees)', value: 'medium' },
          { label: 'Large (50+ employees)', value: 'large' }
        ]
      },
      {
        name: 'namc_minority_classification',
        label: 'Minority Classification',
        description: 'Minority business classification',
        groupName: 'namc_member_info',
        type: 'string',
        fieldType: 'textarea'
      }
    ];

    // Define custom properties for Deals (Projects)
    const dealProperties: HubSpotCustomProperty[] = [
      {
        name: 'namc_project_id',
        label: 'NAMC Project ID',
        description: 'Unique identifier for NAMC project',
        groupName: 'namc_project_info',
        type: 'string',
        fieldType: 'text',
        searchable: true
      },
      {
        name: 'namc_project_type',
        label: 'Project Type',
        description: 'Type of construction project',
        groupName: 'namc_project_info',
        type: 'enumeration',
        fieldType: 'select',
        options: [
          { label: 'Residential', value: 'residential' },
          { label: 'Commercial', value: 'commercial' },
          { label: 'Industrial', value: 'industrial' },
          { label: 'Infrastructure', value: 'infrastructure' }
        ]
      },
      {
        name: 'namc_project_category',
        label: 'Project Category',
        description: 'Specific category of construction',
        groupName: 'namc_project_info',
        type: 'string',
        fieldType: 'text'
      },
      {
        name: 'namc_budget_allocated',
        label: 'Budget Allocated',
        description: 'Total budget allocated for project',
        groupName: 'namc_project_budget',
        type: 'number',
        fieldType: 'text'
      },
      {
        name: 'namc_budget_spent',
        label: 'Budget Spent',
        description: 'Amount of budget spent to date',
        groupName: 'namc_project_budget',
        type: 'number',
        fieldType: 'text'
      },
      {
        name: 'namc_budget_remaining',
        label: 'Budget Remaining',
        description: 'Remaining budget amount',
        groupName: 'namc_project_budget',
        type: 'number',
        fieldType: 'text',
        calculated: true
      },
      {
        name: 'namc_project_progress',
        label: 'Project Progress',
        description: 'Overall project completion percentage',
        groupName: 'namc_project_status',
        type: 'number',
        fieldType: 'text'
      },
      {
        name: 'namc_current_phase',
        label: 'Current Phase',
        description: 'Current phase of project execution',
        groupName: 'namc_project_status',
        type: 'string',
        fieldType: 'text'
      },
      {
        name: 'namc_project_manager',
        label: 'Project Manager',
        description: 'Primary project manager contact',
        groupName: 'namc_project_team',
        type: 'string',
        fieldType: 'text'
      },
      {
        name: 'namc_team_size',
        label: 'Team Size',
        description: 'Number of team members on project',
        groupName: 'namc_project_team',
        type: 'number',
        fieldType: 'text'
      },
      {
        name: 'namc_minority_participation',
        label: 'Minority Participation %',
        description: 'Percentage of minority contractor participation',
        groupName: 'namc_project_metrics',
        type: 'number',
        fieldType: 'text'
      },
      {
        name: 'namc_quality_score',
        label: 'Quality Score',
        description: 'Project quality assessment score (1-100)',
        groupName: 'namc_project_metrics',
        type: 'number',
        fieldType: 'text'
      },
      {
        name: 'namc_risk_level',
        label: 'Risk Level',
        description: 'Project risk assessment level',
        groupName: 'namc_project_status',
        type: 'enumeration',
        fieldType: 'select',
        options: [
          { label: 'Low', value: 'low' },
          { label: 'Medium', value: 'medium' },
          { label: 'High', value: 'high' }
        ]
      },
      {
        name: 'namc_sustainability_rating',
        label: 'Sustainability Rating',
        description: 'Environmental sustainability rating',
        groupName: 'namc_project_metrics',
        type: 'string',
        fieldType: 'text'
      },
      {
        name: 'namc_permit_status',
        label: 'Permit Status',
        description: 'Overall permit approval status',
        groupName: 'namc_project_status',
        type: 'enumeration',
        fieldType: 'select',
        options: [
          { label: 'Not Required', value: 'not_required' },
          { label: 'Pending', value: 'pending' },
          { label: 'Approved', value: 'approved' },
          { label: 'Rejected', value: 'rejected' }
        ]
      }
    ];

    // Define custom properties for Tasks (Project Tasks)
    const taskProperties: HubSpotCustomProperty[] = [
      {
        name: 'namc_task_id',
        label: 'NAMC Task ID',
        description: 'Unique identifier for NAMC task',
        groupName: 'namc_task_info',
        type: 'string',
        fieldType: 'text'
      },
      {
        name: 'namc_workflow_id',
        label: 'Workflow ID',
        description: 'ID of the workflow this task belongs to',
        groupName: 'namc_task_info',
        type: 'string',
        fieldType: 'text'
      },
      {
        name: 'namc_workflow_name',
        label: 'Workflow Name',
        description: 'Name of the workflow this task belongs to',
        groupName: 'namc_task_info',
        type: 'string',
        fieldType: 'text'
      },
      {
        name: 'namc_task_assignee',
        label: 'Task Assignee',
        description: 'Person or team assigned to complete the task',
        groupName: 'namc_task_info',
        type: 'string',
        fieldType: 'text'
      },
      {
        name: 'namc_task_category',
        label: 'Task Category',
        description: 'Category or type of task',
        groupName: 'namc_task_info',
        type: 'enumeration',
        fieldType: 'select',
        options: [
          { label: 'Planning', value: 'planning' },
          { label: 'Design', value: 'design' },
          { label: 'Permits', value: 'permits' },
          { label: 'Construction', value: 'construction' },
          { label: 'Quality Control', value: 'quality_control' },
          { label: 'Documentation', value: 'documentation' },
          { label: 'Client Communication', value: 'client_communication' }
        ]
      },
      {
        name: 'namc_estimated_hours',
        label: 'Estimated Hours',
        description: 'Estimated hours to complete the task',
        groupName: 'namc_task_metrics',
        type: 'number',
        fieldType: 'text'
      },
      {
        name: 'namc_actual_hours',
        label: 'Actual Hours',
        description: 'Actual hours spent on the task',
        groupName: 'namc_task_metrics',
        type: 'number',
        fieldType: 'text'
      },
      {
        name: 'namc_task_dependencies',
        label: 'Task Dependencies',
        description: 'Other tasks that must be completed first',
        groupName: 'namc_task_info',
        type: 'string',
        fieldType: 'textarea'
      }
    ];

    // Store properties for later use
    contactProperties.forEach(prop => this.customProperties.set(`contact_${prop.name}`, prop));
    dealProperties.forEach(prop => this.customProperties.set(`deal_${prop.name}`, prop));
    taskProperties.forEach(prop => this.customProperties.set(`task_${prop.name}`, prop));
  }

  /**
   * Create custom properties in HubSpot
   */
  async createCustomProperties(): Promise<{ success: boolean; results: any[] }> {
    const results: any[] = [];
    
    try {
      // Create contact properties
      for (const [key, property] of this.customProperties) {
        if (key.startsWith('contact_')) {
          try {
            const response = await this.apiClient.post('/crm/v3/properties/contacts', {
              name: property.name,
              label: property.label,
              description: property.description,
              groupName: property.groupName,
              type: property.type,
              fieldType: property.fieldType,
              options: property.options,
              required: property.required || false,
              searchableInGlobalSearch: property.searchable || false,
              calculated: property.calculated || false,
              externalOptions: property.externalOptions || false
            });
            
            results.push({
              object: 'contact',
              property: property.name,
              status: 'created',
              id: response.data.name
            });
          } catch (error: any) {
            if (error.response?.status === 409) {
              results.push({
                object: 'contact',
                property: property.name,
                status: 'exists',
                message: 'Property already exists'
              });
            } else {
              results.push({
                object: 'contact',
                property: property.name,
                status: 'error',
                error: error.response?.data?.message || error.message
              });
            }
          }
        }
      }

      // Create deal properties
      for (const [key, property] of this.customProperties) {
        if (key.startsWith('deal_')) {
          try {
            const response = await this.apiClient.post('/crm/v3/properties/deals', {
              name: property.name,
              label: property.label,
              description: property.description,
              groupName: property.groupName,
              type: property.type,
              fieldType: property.fieldType,
              options: property.options,
              required: property.required || false,
              searchableInGlobalSearch: property.searchable || false,
              calculated: property.calculated || false,
              externalOptions: property.externalOptions || false
            });
            
            results.push({
              object: 'deal',
              property: property.name,
              status: 'created',
              id: response.data.name
            });
          } catch (error: any) {
            if (error.response?.status === 409) {
              results.push({
                object: 'deal',
                property: property.name,
                status: 'exists',
                message: 'Property already exists'
              });
            } else {
              results.push({
                object: 'deal',
                property: property.name,
                status: 'error',
                error: error.response?.data?.message || error.message
              });
            }
          }
        }
      }

      // Create task properties
      for (const [key, property] of this.customProperties) {
        if (key.startsWith('task_')) {
          try {
            const response = await this.apiClient.post('/crm/v3/properties/tasks', {
              name: property.name,
              label: property.label,
              description: property.description,
              groupName: property.groupName,
              type: property.type,
              fieldType: property.fieldType,
              options: property.options,
              required: property.required || false,
              searchableInGlobalSearch: property.searchable || false,
              calculated: property.calculated || false,
              externalOptions: property.externalOptions || false
            });
            
            results.push({
              object: 'task',
              property: property.name,
              status: 'created',
              id: response.data.name
            });
          } catch (error: any) {
            if (error.response?.status === 409) {
              results.push({
                object: 'task',
                property: property.name,
                status: 'exists',
                message: 'Property already exists'
              });
            } else {
              results.push({
                object: 'task',
                property: property.name,
                status: 'error',
                error: error.response?.data?.message || error.message
              });
            }
          }
        }
      }

      return {
        success: true,
        results
      };

    } catch (error: any) {
      throw new Error(`Failed to create custom properties: ${error.message}`);
    }
  }

  /**
   * Sync NAMC member to HubSpot contact with full custom properties
   */
  async syncMemberToHubSpot(member: NAMCMember): Promise<{ contactId: string; isNew: boolean }> {
    try {
      // Check if contact already exists
      const existingContact = await this.findContactByEmail(member.email);
      
      const contactData = {
        properties: {
          // Standard properties
          email: member.email,
          firstname: member.firstName,
          lastname: member.lastName,
          company: member.company || '',
          phone: member.phone || '',
          website: member.website || '',
          lifecyclestage: 'customer',
          hs_lead_status: 'CONNECTED',
          city: member.address?.city || '',
          state: member.address?.state || '',
          zip: member.address?.zipCode || '',
          address: member.address?.street || '',

          // Custom NAMC properties
          namc_member_id: member.id,
          namc_membership_tier: member.membershipTier.toLowerCase(),
          namc_member_status: member.memberStatus,
          namc_specialties: member.specialties.join(', '),
          namc_years_experience: member.yearsExperience.toString(),
          namc_certifications: member.certifications.join(', '),
          namc_service_areas: member.serviceAreas.join(', '),
          namc_join_date: member.joinDate,
          namc_renewal_date: member.renewalDate,
          namc_projects_completed: member.projectsCompleted.toString(),
          namc_avg_project_value: member.averageProjectValue.toString(),
          namc_business_size: member.businessSize,
          namc_minority_classification: member.minorityClassification.join(', ')
        }
      };

      let contactId: string;
      let isNew: boolean;

      if (existingContact) {
        // Update existing contact
        const response = await this.apiClient.patch(`/crm/v3/objects/contacts/${existingContact.id}`, contactData);
        contactId = response.data.id;
        isNew = false;
      } else {
        // Create new contact
        const response = await this.apiClient.post('/crm/v3/objects/contacts', contactData);
        contactId = response.data.id;
        isNew = true;
      }

      return { contactId, isNew };

    } catch (error: any) {
      throw new Error(`Failed to sync member to HubSpot: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Sync NAMC project to HubSpot deal with full custom properties
   */
  async syncProjectToHubSpot(project: NAMCProject, primaryContactId?: string): Promise<{ dealId: string; isNew: boolean }> {
    try {
      // Check if deal already exists
      const existingDeal = await this.findDealByProjectId(project.id);
      
      const dealData = {
        properties: {
          // Standard properties
          dealname: project.title,
          amount: project.budget.total.toString(),
          closedate: project.timeline.endDate,
          dealstage: this.mapProjectStatusToDealStage(project.status),
          pipeline: 'default',
          dealtype: 'newbusiness',
          description: project.description,
          deal_currency_code: 'USD',

          // Custom NAMC properties
          namc_project_id: project.id,
          namc_project_type: project.projectType,
          namc_project_category: project.category,
          namc_budget_allocated: project.budget.allocated.toString(),
          namc_budget_spent: project.budget.spent.toString(),
          namc_budget_remaining: project.budget.remaining.toString(),
          namc_project_progress: project.timeline.progress.toString(),
          namc_current_phase: project.timeline.currentPhase,
          namc_project_manager: project.team.projectManager,
          namc_team_size: project.team.members.length.toString(),
          namc_minority_participation: project.minorityParticipation.percentage.toString(),
          namc_quality_score: project.qualityScore?.toString() || '',
          namc_risk_level: project.riskLevel,
          namc_sustainability_rating: project.sustainabilityRating || '',
          namc_permit_status: this.getOverallPermitStatus(project.permits)
        }
      };

      let dealId: string;
      let isNew: boolean;

      if (existingDeal) {
        // Update existing deal
        const response = await this.apiClient.patch(`/crm/v3/objects/deals/${existingDeal.id}`, dealData);
        dealId = response.data.id;
        isNew = false;
      } else {
        // Create new deal
        const response = await this.apiClient.post('/crm/v3/objects/deals', dealData);
        dealId = response.data.id;
        isNew = true;
      }

      // Associate with primary contact if provided
      if (primaryContactId) {
        await this.associateObjects('contacts', primaryContactId, 'deals', dealId, 4);
      }

      return { dealId, isNew };

    } catch (error: any) {
      throw new Error(`Failed to sync project to HubSpot: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Create project tasks in HubSpot with full workflow integration
   */
  async createProjectTasks(project: NAMCProject, dealId: string, teamContactIds: string[] = []): Promise<{ taskIds: string[]; created: number; failed: number }> {
    const taskIds: string[] = [];
    let created = 0;
    let failed = 0;

    try {
      for (const workflow of project.workflows) {
        for (const task of workflow.tasks) {
          try {
            const taskData = {
              properties: {
                // Standard properties
                hs_task_subject: `${workflow.name}: ${task.name}`,
                hs_task_body: `Project: ${project.title}\nWorkflow: ${workflow.name}\nAssignee: ${task.assignee}\nPriority: ${task.priority}\nDue Date: ${task.dueDate}\nStatus: ${task.status}\nDependencies: ${task.dependencies?.join(', ') || 'None'}`,
                hs_task_status: this.mapTaskStatusToHubSpot(task.status),
                hs_task_priority: this.mapTaskPriorityToHubSpot(task.priority),
                hs_task_type: 'TODO',
                hs_timestamp: new Date(task.dueDate).getTime(),

                // Custom NAMC properties
                namc_task_id: task.id,
                namc_workflow_id: workflow.id,
                namc_workflow_name: workflow.name,
                namc_task_assignee: task.assignee,
                namc_task_category: this.categorizeTask(task.name, workflow.name),
                namc_estimated_hours: '0', // Default, can be updated later
                namc_actual_hours: '0',
                namc_task_dependencies: task.dependencies?.join(', ') || ''
              }
            };

            const response = await this.apiClient.post('/crm/v3/objects/tasks', taskData);
            const taskId = response.data.id;
            taskIds.push(taskId);
            created++;

            // Associate task with deal
            await this.associateObjects('tasks', taskId, 'deals', dealId, 212);

            // Associate task with relevant team member if available
            const assigneeContact = await this.findContactByName(task.assignee);
            if (assigneeContact) {
              await this.associateObjects('tasks', taskId, 'contacts', assigneeContact.id, 204);
            }

          } catch (taskError: any) {
            console.error(`Failed to create task "${task.name}":`, taskError.response?.data?.message || taskError.message);
            failed++;
          }
        }
      }

      return { taskIds, created, failed };

    } catch (error: any) {
      throw new Error(`Failed to create project tasks: ${error.message}`);
    }
  }

  /**
   * Set up automated workflows for member lifecycle management
   */
  async setupMemberLifecycleWorkflows(): Promise<{ workflowIds: string[]; setupComplete: boolean }> {
    // This would typically be done through the HubSpot UI or Operations Hub
    // For now, we'll return a placeholder indicating the workflow setup needed
    
    const workflowConfigs = [
      {
        name: 'NAMC New Member Onboarding',
        trigger: 'namc_member_status equals active AND namc_join_date is known',
        actions: [
          'Send welcome email sequence',
          'Create onboarding tasks',
          'Schedule follow-up calls',
          'Add to member directory'
        ]
      },
      {
        name: 'NAMC Membership Renewal Reminder',
        trigger: 'namc_renewal_date is 30 days from now',
        actions: [
          'Send renewal reminder email',
          'Create renewal task for account manager',
          'Update member status to renewal_pending'
        ]
      },
      {
        name: 'NAMC Project Completion Workflow',
        trigger: 'namc_project_progress equals 100',
        actions: [
          'Send project completion survey',
          'Update member project count',
          'Create case study opportunity task',
          'Schedule project review meeting'
        ]
      },
      {
        name: 'NAMC Member Engagement Scoring',
        trigger: 'Contact property changes OR Deal property changes',
        actions: [
          'Calculate engagement score',
          'Update member tier if eligible',
          'Create outreach tasks for low engagement'
        ]
      }
    ];

    // In a real implementation, these would be created via HubSpot's Workflows API
    return {
      workflowIds: [], // Would contain actual workflow IDs
      setupComplete: false // Indicates manual setup required in HubSpot UI
    };
  }

  /**
   * Generate comprehensive member and project reports
   */
  async generateReports(): Promise<{
    memberMetrics: any;
    projectMetrics: any;
    performanceMetrics: any;
  }> {
    try {
      // Get all NAMC members
      const members = await this.apiClient.get('/crm/v3/objects/contacts', {
        params: {
          properties: 'namc_member_id,namc_membership_tier,namc_member_status,namc_projects_completed,namc_avg_project_value',
          limit: 100
        }
      });

      // Get all NAMC projects
      const projects = await this.apiClient.get('/crm/v3/objects/deals', {
        params: {
          properties: 'namc_project_id,namc_project_type,namc_project_progress,namc_budget_allocated,namc_minority_participation',
          limit: 100
        }
      });

      // Calculate metrics
      const memberMetrics = this.calculateMemberMetrics(members.data.results);
      const projectMetrics = this.calculateProjectMetrics(projects.data.results);
      const performanceMetrics = this.calculatePerformanceMetrics();

      return {
        memberMetrics,
        projectMetrics,
        performanceMetrics
      };

    } catch (error: any) {
      throw new Error(`Failed to generate reports: ${error.message}`);
    }
  }

  // Helper methods
  private async findContactByEmail(email: string): Promise<any | null> {
    try {
      const response = await this.apiClient.post('/crm/v3/objects/contacts/search', {
        filterGroups: [{
          filters: [{
            propertyName: 'email',
            operator: 'EQ',
            value: email
          }]
        }]
      });

      return response.data.results.length > 0 ? response.data.results[0] : null;
    } catch (error) {
      return null;
    }
  }

  private async findContactByName(name: string): Promise<any | null> {
    try {
      const [firstName, ...lastNameParts] = name.split(' ');
      const lastName = lastNameParts.join(' ');

      const response = await this.apiClient.post('/crm/v3/objects/contacts/search', {
        filterGroups: [{
          filters: [
            {
              propertyName: 'firstname',
              operator: 'EQ',
              value: firstName
            },
            {
              propertyName: 'lastname',
              operator: 'EQ',
              value: lastName
            }
          ]
        }]
      });

      return response.data.results.length > 0 ? response.data.results[0] : null;
    } catch (error) {
      return null;
    }
  }

  private async findDealByProjectId(projectId: string): Promise<any | null> {
    try {
      const response = await this.apiClient.post('/crm/v3/objects/deals/search', {
        filterGroups: [{
          filters: [{
            propertyName: 'namc_project_id',
            operator: 'EQ',
            value: projectId
          }]
        }]
      });

      return response.data.results.length > 0 ? response.data.results[0] : null;
    } catch (error) {
      return null;
    }
  }

  private async associateObjects(fromObjectType: string, fromObjectId: string, toObjectType: string, toObjectId: string, associationTypeId: number): Promise<void> {
    try {
      await this.apiClient.put(
        `/crm/v4/objects/${fromObjectType}/${fromObjectId}/associations/${toObjectType}/${toObjectId}`,
        {
          associationCategory: 'HUBSPOT_DEFINED',
          associationTypeId
        }
      );
    } catch (error: any) {
      console.warn(`Failed to associate ${fromObjectType}:${fromObjectId} with ${toObjectType}:${toObjectId}:`, error.response?.data?.message);
    }
  }

  private mapProjectStatusToDealStage(status: string): string {
    const statusMap: { [key: string]: string } = {
      'planning': 'appointmentscheduled',
      'active': 'contractsent',
      'on_hold': 'appointmentscheduled',
      'completed': 'closedwon',
      'cancelled': 'closedlost'
    };
    return statusMap[status] || 'appointmentscheduled';
  }

  private mapTaskStatusToHubSpot(status: string): string {
    const statusMap: { [key: string]: string } = {
      'not_started': 'NOT_STARTED',
      'in_progress': 'IN_PROGRESS',
      'completed': 'COMPLETED',
      'blocked': 'WAITING'
    };
    return statusMap[status] || 'NOT_STARTED';
  }

  private mapTaskPriorityToHubSpot(priority: string): string {
    const priorityMap: { [key: string]: string } = {
      'low': 'LOW',
      'medium': 'MEDIUM',
      'high': 'HIGH',
      'critical': 'HIGH'
    };
    return priorityMap[priority] || 'MEDIUM';
  }

  private categorizeTask(taskName: string, workflowName: string): string {
    const categories: { [key: string]: string } = {
      'planning': 'planning',
      'design': 'design',
      'permit': 'permits',
      'construction': 'construction',
      'quality': 'quality_control',
      'documentation': 'documentation',
      'client': 'client_communication'
    };

    const combinedText = `${taskName} ${workflowName}`.toLowerCase();
    
    for (const [keyword, category] of Object.entries(categories)) {
      if (combinedText.includes(keyword)) {
        return category;
      }
    }
    
    return 'planning';
  }

  private getOverallPermitStatus(permits: NAMCProject['permits']): string {
    if (permits.length === 0) return 'not_required';
    
    const hasRejected = permits.some(p => p.status === 'rejected');
    if (hasRejected) return 'rejected';
    
    const allApproved = permits.every(p => p.status === 'approved');
    if (allApproved) return 'approved';
    
    return 'pending';
  }

  private calculateMemberMetrics(members: any[]): any {
    // Implementation for member metrics calculation
    return {
      totalMembers: members.length,
      membersByTier: {},
      averageProjectsCompleted: 0,
      totalProjectValue: 0
    };
  }

  private calculateProjectMetrics(projects: any[]): any {
    // Implementation for project metrics calculation
    return {
      totalProjects: projects.length,
      projectsByType: {},
      averageProgress: 0,
      totalValue: 0
    };
  }

  private calculatePerformanceMetrics(): any {
    // Implementation for performance metrics calculation
    return {
      memberEngagement: 0,
      projectSuccessRate: 0,
      minorityParticipation: 0
    };
  }
}

export default NAMCHubSpotMCPService;
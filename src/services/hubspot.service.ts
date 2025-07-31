import axios from 'axios';

interface HubSpotContact {
  id?: string;
  properties: {
    email?: string;
    firstname?: string;
    lastname?: string;
    company?: string;
    phone?: string;
    jobtitle?: string;
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
    website?: string;
    annual_revenue?: string;
    numberofemployees?: string;
    industry?: string;
    specialties?: string;
    membership_tier?: string;
    membership_status?: string;
    years_experience?: string;
    certifications?: string;
  };
}

interface HubSpotDeal {
  id?: string;
  properties: {
    dealname: string;
    dealstage: string;
    pipeline: string;
    amount: string;
    closedate: string;
    hubspot_owner_id?: string;
    dealtype?: string;
    project_id?: string;
    member_id?: string;
    project_type?: string;
    location?: string;
    budget_range?: string;
  };
}

interface HubSpotFormSubmission {
  formId: string;
  fields: Array<{
    name: string;
    value: string;
  }>;
}

export class HubSpotService {
  private apiKey: string;
  private baseUrl = 'https://api.hubapi.com';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async makeRequest(endpoint: string, method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' = 'GET', data?: any) {
    try {
      const response = await axios({
        method,
        url: `${this.baseUrl}${endpoint}`,
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        data,
      });
      return response.data;
    } catch (error) {
      console.error('HubSpot API Error:', error);
      throw error;
    }
  }

  // Contact Management
  async syncContact(userData: any): Promise<HubSpotContact> {
    const contactData: HubSpotContact = {
      properties: {
        email: userData.email,
        firstname: userData.firstName,
        lastname: userData.lastName,
        company: userData.companyName,
        phone: userData.phone,
        jobtitle: userData.jobTitle,
        specialties: userData.specialties?.join(','),
        membership_tier: userData.membership?.tier,
        membership_status: userData.membership?.status,
        years_experience: userData.profile?.yearsExperience?.toString(),
        certifications: userData.certifications?.map((c: any) => c.name).join(','),
      },
    };

    // Check if contact exists
    const existingContact = await this.findContactByEmail(userData.email);
    
    if (existingContact) {
      return await this.updateContact(existingContact.id, contactData);
    } else {
      return await this.createContact(contactData);
    }
  }

  async createContact(contact: HubSpotContact): Promise<HubSpotContact> {
    return await this.makeRequest('/crm/v3/objects/contacts', 'POST', contact);
  }

  async updateContact(contactId: string, contact: HubSpotContact): Promise<HubSpotContact> {
    return await this.makeRequest(`/crm/v3/objects/contacts/${contactId}`, 'PATCH', contact);
  }

  async findContactByEmail(email: string): Promise<HubSpotContact | null> {
    try {
      const response = await this.makeRequest(
        `/crm/v3/objects/contacts/search`,
        'POST',
        {
          filterGroups: [{
            filters: [{
              propertyName: 'email',
              operator: 'EQ',
              value: email,
            }],
          }],
        }
      );
      
      return response.results?.[0] || null;
    } catch (error) {
      console.error('Error finding contact:', error);
      return null;
    }
  }

  async getContact(contactId: string): Promise<HubSpotContact> {
    return await this.makeRequest(`/crm/v3/objects/contacts/${contactId}`);
  }

  // Deal Management
  async createDeal(dealData: {
    projectId: string;
    memberId: string;
    dealName: string;
    amount: number;
    closeDate: string;
    projectType?: string;
    location?: string;
    budgetRange?: string;
  }): Promise<HubSpotDeal> {
    const deal: HubSpotDeal = {
      properties: {
        dealname: dealData.dealName,
        dealstage: 'appointmentscheduled', // Initial stage
        pipeline: 'default',
        amount: dealData.amount.toString(),
        closedate: new Date(dealData.closeDate).toISOString().split('T')[0],
        project_id: dealData.projectId,
        member_id: dealData.memberId,
        project_type: dealData.projectType,
        location: dealData.location,
        budget_range: dealData.budgetRange,
      },
    };

    return await this.makeRequest('/crm/v3/objects/deals', 'POST', deal);
  }

  async updateDeal(dealId: string, deal: Partial<HubSpotDeal>): Promise<HubSpotDeal> {
    return await this.makeRequest(`/crm/v3/objects/deals/${dealId}`, 'PATCH', deal);
  }

  async getDeal(dealId: string): Promise<HubSpotDeal> {
    return await this.makeRequest(`/crm/v3/objects/deals/${dealId}`);
  }

  // Form Submissions
  async submitForm(formId: string, submission: HubSpotFormSubmission): Promise<any> {
    return await this.makeRequest(`/forms/v2/forms/${formId}/submissions`, 'POST', {
      fields: submission.fields,
    });
  }

  // Webhooks
  async registerWebhook(targetUrl: string, events: string[]): Promise<any> {
    return await this.makeRequest('/webhooks/v3/app', 'POST', {
      targetUrl,
      eventTypes: events,
    });
  }

  // Workflow Automation
  async triggerWorkflow(workflowId: string, email: string): Promise<any> {
    return await this.makeRequest(`/automation/v2/workflows/${workflowId}/enrollments/contacts`,
      'POST',
      { inputs: [{ email }] }
    );
  }

  // Analytics and Reporting
  async getContactAnalytics(contactId: string): Promise<any> {
    return await this.makeRequest(`/analytics/v2/reports/contacts/${contactId}`);
  }

  async getDealAnalytics(dealId: string): Promise<any> {
    return await this.makeRequest(`/analytics/v2/reports/deals/${dealId}`);
  }

  // Batch Operations
  async batchSyncContacts(contacts: HubSpotContact[]): Promise<any> {
    return await this.makeRequest('/crm/v3/objects/contacts/batch/create', 'POST', {
      inputs: contacts,
    });
  }

  // Association Management
  async associateContactWithDeal(contactId: string, dealId: string): Promise<any> {
    return await this.makeRequest(
      `/crm/v4/objects/contacts/${contactId}/associations/deals/${dealId}`,
      'PUT',
      {
        associationCategory: 'HUBSPOT_DEFINED',
        associationTypeId: 4, // Contact to Deal association
      }
    );
  }

  // Custom Properties
  async createCustomProperty(objectType: string, property: any): Promise<any> {
    return await this.makeRequest(`/crm/v3/properties/${objectType}`, 'POST', property);
  }

  // List Management
  async addContactToList(listId: string, contactEmail: string): Promise<any> {
    return await this.makeRequest(`/contacts/v1/lists/${listId}/add`, 'POST', {
      emails: [contactEmail],
    });
  }

  // Company Management
  async createCompany(companyData: any): Promise<any> {
    return await this.makeRequest('/crm/v3/objects/companies', 'POST', companyData);
  }

  async associateContactWithCompany(contactId: string, companyId: string): Promise<any> {
    return await this.makeRequest(
      `/crm/v4/objects/contacts/${contactId}/associations/companies/${companyId}`,
      'PUT',
      {
        associationCategory: 'HUBSPOT_DEFINED',
        associationTypeId: 1, // Contact to Company association
      }
    );
  }

  // Task Management
  async createTask(taskData: {
    taskName: string;
    taskType: string;
    taskStatus: string;
    priority: string;
    taskNote?: string;
    dueDate?: string;
    assignedTo?: string;
    projectId?: string;
    dealId?: string;
    contactId?: string;
  }): Promise<any> {
    const task = {
      properties: {
        hs_task_subject: taskData.taskName,
        hs_task_body: taskData.taskNote || '',
        hs_task_status: this.mapTaskStatus(taskData.taskStatus),
        hs_task_priority: this.mapTaskPriority(taskData.priority),
        hs_task_type: taskData.taskType.toUpperCase(),
        hs_timestamp: taskData.dueDate ? new Date(taskData.dueDate).getTime().toString() : undefined,
        hubspot_owner_id: taskData.assignedTo,
        project_id: taskData.projectId,
        deal_id: taskData.dealId,
      },
    };

    const result = await this.makeRequest('/crm/v3/objects/tasks', 'POST', task);

    // Associate task with contact if provided
    if (result.id && taskData.contactId) {
      await this.associateTaskWithContact(result.id, taskData.contactId);
    }

    // Associate task with deal if provided
    if (result.id && taskData.dealId) {
      await this.associateTaskWithDeal(result.id, taskData.dealId);
    }

    return result;
  }

  async updateTask(taskId: string, updates: any): Promise<any> {
    const taskUpdates = {
      properties: {
        hs_task_subject: updates.taskName,
        hs_task_body: updates.taskNote || '',
        hs_task_status: updates.taskStatus ? this.mapTaskStatus(updates.taskStatus) : undefined,
        hs_task_priority: updates.priority ? this.mapTaskPriority(updates.priority) : undefined,
        hs_timestamp: updates.dueDate ? new Date(updates.dueDate).getTime().toString() : undefined,
        hubspot_owner_id: updates.assignedTo,
      },
    };

    // Remove undefined properties
    Object.keys(taskUpdates.properties).forEach(key => {
      if (taskUpdates.properties[key] === undefined) {
        delete taskUpdates.properties[key];
      }
    });

    return await this.makeRequest(`/crm/v3/objects/tasks/${taskId}`, 'PATCH', taskUpdates);
  }

  async getTask(taskId: string): Promise<any> {
    return await this.makeRequest(`/crm/v3/objects/tasks/${taskId}`);
  }

  async deleteTask(taskId: string): Promise<any> {
    return await this.makeRequest(`/crm/v3/objects/tasks/${taskId}`, 'DELETE');
  }

  // Task Associations
  async associateTaskWithContact(taskId: string, contactId: string): Promise<any> {
    return await this.makeRequest(
      `/crm/v4/objects/tasks/${taskId}/associations/contacts/${contactId}`,
      'PUT',
      {
        associationCategory: 'HUBSPOT_DEFINED',
        associationTypeId: 204, // Task to Contact association
      }
    );
  }

  async associateTaskWithDeal(taskId: string, dealId: string): Promise<any> {
    return await this.makeRequest(
      `/crm/v4/objects/tasks/${taskId}/associations/deals/${dealId}`,
      'PUT',
      {
        associationCategory: 'HUBSPOT_DEFINED',
        associationTypeId: 216, // Task to Deal association
      }
    );
  }

  // Task Status and Priority Mapping
  private mapTaskStatus(status: string): string {
    const statusMap: { [key: string]: string } = {
      'not_started': 'NOT_STARTED',
      'in_progress': 'IN_PROGRESS', 
      'on_hold': 'WAITING',
      'completed': 'COMPLETED',
      'cancelled': 'DEFERRED',
    };
    return statusMap[status] || 'NOT_STARTED';
  }

  private mapTaskPriority(priority: string): string {
    const priorityMap: { [key: string]: string } = {
      'low': 'LOW',
      'medium': 'MEDIUM',
      'high': 'HIGH', 
      'critical': 'HIGH',
    };
    return priorityMap[priority] || 'MEDIUM';
  }

  // Project-specific task management
  async syncProjectTask(projectTaskData: {
    taskId: string;
    projectId: string;
    taskName: string;
    description?: string;
    status: string;
    priority: string;
    assignee?: {
      email: string;
      name: string;
    };
    dueDate?: string;
    dealId?: string;
  }): Promise<any> {
    try {
      // Find contact by assignee email if provided
      let contactId: string | undefined;
      let hubspotOwnerId: string | undefined;

      if (projectTaskData.assignee?.email) {
        const contact = await this.findContactByEmail(projectTaskData.assignee.email);
        contactId = contact?.id;
        hubspotOwnerId = contact?.properties?.hubspot_owner_id;
      }

      // Create task in HubSpot
      const hubspotTask = await this.createTask({
        taskName: projectTaskData.taskName,
        taskType: 'TODO',
        taskStatus: projectTaskData.status,
        priority: projectTaskData.priority,
        taskNote: projectTaskData.description,
        dueDate: projectTaskData.dueDate,
        assignedTo: hubspotOwnerId,
        projectId: projectTaskData.projectId,
        dealId: projectTaskData.dealId,
        contactId: contactId,
      });

      return {
        hubspotTaskId: hubspotTask.id,
        hubspotContactId: contactId,
        success: true,
      };
    } catch (error) {
      console.error('Error syncing project task to HubSpot:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async updateProjectTaskSync(hubspotTaskId: string, taskUpdates: {
    taskName?: string;
    description?: string;
    status?: string;
    priority?: string;
    dueDate?: string;
  }): Promise<any> {
    try {
      const result = await this.updateTask(hubspotTaskId, {
        taskName: taskUpdates.taskName,
        taskNote: taskUpdates.description,
        taskStatus: taskUpdates.status,
        priority: taskUpdates.priority,
        dueDate: taskUpdates.dueDate,
      });

      return {
        success: true,
        hubspotTaskId: result.id,
      };
    } catch (error) {
      console.error('Error updating HubSpot task:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // Bulk task operations
  async batchSyncTasks(tasks: any[]): Promise<any> {
    const taskInputs = tasks.map(task => ({
      properties: {
        hs_task_subject: task.taskName,
        hs_task_body: task.description || '',
        hs_task_status: this.mapTaskStatus(task.status),
        hs_task_priority: this.mapTaskPriority(task.priority),
        hs_task_type: 'TODO',
        hs_timestamp: task.dueDate ? new Date(task.dueDate).getTime().toString() : undefined,
        project_id: task.projectId,
      },
    }));

    return await this.makeRequest('/crm/v3/objects/tasks/batch/create', 'POST', {
      inputs: taskInputs,
    });
  }
}

export default HubSpotService;

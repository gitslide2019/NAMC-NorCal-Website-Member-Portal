/**
 * Project Workflow Service
 * 
 * Handles project-based task automation, team collaboration, and workflow management
 * integrated with HubSpot for comprehensive project tracking and team coordination.
 */

import { HubSpotBackboneService } from './hubspot-backbone.service';

interface ProjectMember {
  id: string;
  name: string;
  email: string;
  role: string;
  permissions: string[];
}

interface TaskDependency {
  taskId: string;
  dependsOn: string[];
  blockedBy?: string[];
}

interface ProjectWorkflowConfig {
  projectId: string;
  workflowType: 'residential' | 'commercial' | 'industrial' | 'custom';
  startDate: Date;
  endDate?: Date;
  teamMembers: ProjectMember[];
  milestones: Array<{
    name: string;
    dueDate: Date;
    tasks: string[];
  }>;
}

export class ProjectWorkflowService {
  private hubspotService: HubSpotBackboneService;

  constructor() {
    this.hubspotService = new HubSpotBackboneService({
      accessToken: process.env.HUBSPOT_ACCESS_TOKEN!,
      portalId: process.env.HUBSPOT_PORTAL_ID
    });
  }

  /**
   * Initialize project workflow with automated task generation
   */
  async initializeProjectWorkflow(config: ProjectWorkflowConfig): Promise<{
    success: boolean;
    tasksCreated: number;
    workflowId: string;
  }> {
    try {
      // Create workflow record in HubSpot
      const workflow = await this.createWorkflowRecord(config);

      // Generate tasks based on workflow type
      const tasks = await this.generateWorkflowTasks(config);

      // Set up task dependencies
      await this.setupTaskDependencies(tasks);

      // Assign tasks to team members
      await this.assignTasksToTeam(tasks, config.teamMembers);

      // Create project milestones
      await this.createProjectMilestones(config);

      // Set up automated notifications
      await this.setupWorkflowNotifications(config.projectId);

      return {
        success: true,
        tasksCreated: tasks.length,
        workflowId: workflow.id
      };
    } catch (error: any) {
      console.error('Error initializing project workflow:', error);
      throw new Error(`Failed to initialize project workflow: ${error.message}`);
    }
  }

  /**
   * Generate tasks based on project workflow type
   */
  private async generateWorkflowTasks(config: ProjectWorkflowConfig): Promise<any[]> {
    const taskTemplates = this.getTaskTemplatesByType(config.workflowType);
    const createdTasks = [];

    for (const template of taskTemplates) {
      const dueDate = new Date(config.startDate);
      dueDate.setDate(dueDate.getDate() + template.daysFromStart);

      const taskData = {
        subject: template.subject,
        description: template.description,
        priority: template.priority,
        type: template.type,
        dueDate,
        assigneeId: this.getAssigneeByRole(template.assigneeRole, config.teamMembers),
        memberId: config.teamMembers[0]?.id, // Project owner
        projectId: config.projectId
      };

      const task = await this.hubspotService.createTask(taskData);
      createdTasks.push({
        ...task,
        templateId: template.id,
        dependencies: template.dependencies || []
      });
    }

    return createdTasks;
  }

  /**
   * Set up task dependencies and blocking relationships
   */
  private async setupTaskDependencies(tasks: any[]): Promise<void> {
    const taskMap = new Map(tasks.map(task => [task.templateId, task]));

    for (const task of tasks) {
      if (task.dependencies && task.dependencies.length > 0) {
        const dependencyIds = task.dependencies
          .map(depId => taskMap.get(depId)?.id)
          .filter(Boolean);

        if (dependencyIds.length > 0) {
          await this.hubspotService.updateTask(task.id, {
            task_dependencies: JSON.stringify(dependencyIds),
            dependency_status: 'blocked'
          });
        }
      }
    }
  }

  /**
   * Assign tasks to team members based on roles
   */
  private async assignTasksToTeam(tasks: any[], teamMembers: ProjectMember[]): Promise<void> {
    for (const task of tasks) {
      if (task.assigneeId) {
        await this.hubspotService.assignTaskToMember(
          task.id,
          task.assigneeId,
          teamMembers[0]?.id // Project owner as assigner
        );
      }
    }
  }

  /**
   * Create project milestones in HubSpot
   */
  private async createProjectMilestones(config: ProjectWorkflowConfig): Promise<void> {
    for (const milestone of config.milestones) {
      await this.hubspotService.updateProject(config.projectId, {
        [`milestone_${milestone.name.toLowerCase().replace(/\s+/g, '_')}`]: 'false',
        [`milestone_${milestone.name.toLowerCase().replace(/\s+/g, '_')}_date`]: milestone.dueDate.toISOString(),
        [`milestone_${milestone.name.toLowerCase().replace(/\s+/g, '_')}_tasks`]: JSON.stringify(milestone.tasks)
      });
    }
  }

  /**
   * Set up automated workflow notifications
   */
  private async setupWorkflowNotifications(projectId: string): Promise<void> {
    // Set up various workflow triggers
    await this.hubspotService.triggerWorkflow('project_workflow_initialized', projectId);
  }

  /**
   * Update project progress based on task completion
   */
  async updateProjectProgress(projectId: string): Promise<{
    progressPercentage: number;
    completedTasks: number;
    totalTasks: number;
    milestonesReached: string[];
  }> {
    try {
      const tasks = await this.hubspotService.getProjectTasks(projectId);
      const totalTasks = tasks.length;
      const completedTasks = tasks.filter(task => 
        task.properties.hs_task_status === 'COMPLETED'
      ).length;

      const progressPercentage = totalTasks > 0 ? 
        Math.round((completedTasks / totalTasks) * 100) : 0;

      // Check for milestone completion
      const milestonesReached = await this.checkMilestoneCompletion(projectId, progressPercentage);

      // Update project with progress
      await this.hubspotService.updateProject(projectId, {
        project_progress: progressPercentage.toString(),
        completed_tasks: completedTasks.toString(),
        total_tasks: totalTasks.toString(),
        last_progress_update: new Date().toISOString()
      });

      // Trigger progress workflows
      if (milestonesReached.length > 0) {
        await this.hubspotService.triggerWorkflow('project_milestone_reached', projectId);
      }

      return {
        progressPercentage,
        completedTasks,
        totalTasks,
        milestonesReached
      };
    } catch (error: any) {
      throw new Error(`Failed to update project progress: ${error.message}`);
    }
  }

  /**
   * Handle task completion and dependency resolution
   */
  async handleTaskCompletion(taskId: string): Promise<void> {
    try {
      const task = await this.hubspotService.getTask(taskId);
      const projectId = task.associations?.deals?.[0]?.id;

      if (!projectId) return;

      // Update dependent tasks
      await this.updateDependentTasks(taskId, projectId);

      // Update project progress
      await this.updateProjectProgress(projectId);

      // Check for workflow completion
      await this.checkWorkflowCompletion(projectId);
    } catch (error: any) {
      console.error('Error handling task completion:', error);
    }
  }

  /**
   * Update tasks that were blocked by the completed task
   */
  private async updateDependentTasks(completedTaskId: string, projectId: string): Promise<void> {
    const allTasks = await this.hubspotService.getProjectTasks(projectId);
    
    for (const task of allTasks) {
      const dependencies = task.properties.task_dependencies;
      if (dependencies) {
        try {
          const depArray = JSON.parse(dependencies);
          if (depArray.includes(completedTaskId)) {
            // Remove completed task from dependencies
            const updatedDeps = depArray.filter(id => id !== completedTaskId);
            
            await this.hubspotService.updateTask(task.id, {
              task_dependencies: JSON.stringify(updatedDeps),
              dependency_status: updatedDeps.length === 0 ? 'ready' : 'blocked'
            });

            // Notify assignee if task is now ready
            if (updatedDeps.length === 0) {
              await this.hubspotService.triggerWorkflow('task_dependency_resolved', task.id);
            }
          }
        } catch (error) {
          console.error('Error parsing task dependencies:', error);
        }
      }
    }
  }

  /**
   * Check if project workflow is complete
   */
  private async checkWorkflowCompletion(projectId: string): Promise<void> {
    const tasks = await this.hubspotService.getProjectTasks(projectId);
    const allCompleted = tasks.every(task => 
      task.properties.hs_task_status === 'COMPLETED'
    );

    if (allCompleted) {
      await this.hubspotService.updateProject(projectId, {
        workflow_status: 'completed',
        workflow_completion_date: new Date().toISOString()
      });

      await this.hubspotService.triggerWorkflow('project_workflow_completed', projectId);
    }
  }

  /**
   * Check milestone completion based on progress
   */
  private async checkMilestoneCompletion(projectId: string, progressPercentage: number): Promise<string[]> {
    const milestonesReached = [];
    const milestoneThresholds = [25, 50, 75, 100];

    for (const threshold of milestoneThresholds) {
      if (progressPercentage >= threshold) {
        const milestoneKey = `milestone_${threshold}_percent`;
        
        // Check if milestone was already marked as reached
        const project = await this.hubspotService.getProject(projectId);
        if (project.properties[milestoneKey] !== 'true') {
          await this.hubspotService.updateProject(projectId, {
            [milestoneKey]: 'true',
            [`${milestoneKey}_date`]: new Date().toISOString()
          });
          
          milestonesReached.push(`${threshold}% Complete`);
        }
      }
    }

    return milestonesReached;
  }

  /**
   * Create workflow record in HubSpot
   */
  private async createWorkflowRecord(config: ProjectWorkflowConfig): Promise<any> {
    // This would create a custom object for workflow tracking
    // For now, we'll update the project deal with workflow info
    return await this.hubspotService.updateProject(config.projectId, {
      workflow_type: config.workflowType,
      workflow_start_date: config.startDate.toISOString(),
      workflow_end_date: config.endDate?.toISOString() || '',
      workflow_status: 'active',
      team_members: JSON.stringify(config.teamMembers.map(m => ({
        id: m.id,
        name: m.name,
        role: m.role
      })))
    });
  }

  /**
   * Get assignee ID by role from team members
   */
  private getAssigneeByRole(role: string, teamMembers: ProjectMember[]): string {
    const member = teamMembers.find(m => m.role === role);
    return member?.id || teamMembers[0]?.id || '';
  }

  /**
   * Get task templates by workflow type
   */
  private getTaskTemplatesByType(workflowType: string): any[] {
    const templates = {
      residential: [
        {
          id: 'permits',
          subject: 'Obtain Building Permits',
          description: 'Submit permit applications and obtain all required building permits',
          priority: 'HIGH',
          type: 'APPROVAL',
          daysFromStart: 0,
          assigneeRole: 'Project Manager'
        },
        {
          id: 'site_prep',
          subject: 'Site Preparation',
          description: 'Prepare construction site and conduct land survey',
          priority: 'HIGH',
          type: 'TODO',
          daysFromStart: 7,
          dependencies: ['permits'],
          assigneeRole: 'Site Supervisor'
        },
        {
          id: 'foundation',
          subject: 'Foundation Work',
          description: 'Complete foundation excavation and construction',
          priority: 'HIGH',
          type: 'TODO',
          daysFromStart: 14,
          dependencies: ['site_prep'],
          assigneeRole: 'Site Supervisor'
        }
      ],
      commercial: [
        {
          id: 'assessment',
          subject: 'Site Assessment',
          description: 'Conduct thorough site assessment and planning',
          priority: 'HIGH',
          type: 'REVIEW',
          daysFromStart: 0,
          assigneeRole: 'Project Manager'
        },
        {
          id: 'permits',
          subject: 'Commercial Permits',
          description: 'Submit commercial permits and obtain approvals',
          priority: 'HIGH',
          type: 'APPROVAL',
          daysFromStart: 3,
          dependencies: ['assessment'],
          assigneeRole: 'Project Manager'
        }
      ],
      industrial: [
        {
          id: 'safety_review',
          subject: 'Safety Assessment',
          description: 'Conduct comprehensive safety assessment',
          priority: 'HIGH',
          type: 'REVIEW',
          daysFromStart: 0,
          assigneeRole: 'Safety Coordinator'
        },
        {
          id: 'shutdown_plan',
          subject: 'Equipment Shutdown Planning',
          description: 'Plan equipment shutdown procedures',
          priority: 'HIGH',
          type: 'TODO',
          daysFromStart: 2,
          dependencies: ['safety_review'],
          assigneeRole: 'Maintenance Supervisor'
        }
      ]
    };

    return templates[workflowType] || templates.residential;
  }

  /**
   * Get team collaboration metrics
   */
  async getTeamCollaborationMetrics(projectId: string): Promise<{
    teamPerformance: any[];
    communicationStats: any;
    collaborationScore: number;
  }> {
    try {
      const tasks = await this.hubspotService.getProjectTasks(projectId);
      const project = await this.hubspotService.getProject(projectId);
      
      // Calculate team performance metrics
      const teamPerformance = this.calculateTeamPerformance(tasks);
      
      // Get communication statistics
      const communicationStats = await this.getCommunicationStats(projectId);
      
      // Calculate overall collaboration score
      const collaborationScore = this.calculateCollaborationScore(
        teamPerformance, 
        communicationStats
      );

      return {
        teamPerformance,
        communicationStats,
        collaborationScore
      };
    } catch (error: any) {
      throw new Error(`Failed to get team collaboration metrics: ${error.message}`);
    }
  }

  /**
   * Calculate team performance metrics
   */
  private calculateTeamPerformance(tasks: any[]): any[] {
    const teamStats = {};

    tasks.forEach(task => {
      const assigneeId = task.properties.hubspot_owner_id;
      if (assigneeId) {
        if (!teamStats[assigneeId]) {
          teamStats[assigneeId] = {
            assigneeId,
            totalTasks: 0,
            completedTasks: 0,
            overdueTasks: 0,
            onTimeCompletions: 0
          };
        }

        teamStats[assigneeId].totalTasks++;

        if (task.properties.hs_task_status === 'COMPLETED') {
          teamStats[assigneeId].completedTasks++;
          
          // Check if completed on time
          if (task.properties.hs_task_due_date && task.properties.completion_date) {
            const dueDate = new Date(task.properties.hs_task_due_date);
            const completionDate = new Date(task.properties.completion_date);
            
            if (completionDate <= dueDate) {
              teamStats[assigneeId].onTimeCompletions++;
            }
          }
        }

        // Check for overdue tasks
        if (task.properties.hs_task_due_date && 
            task.properties.hs_task_status !== 'COMPLETED' &&
            new Date(task.properties.hs_task_due_date) < new Date()) {
          teamStats[assigneeId].overdueTasks++;
        }
      }
    });

    // Calculate performance percentages
    return Object.values(teamStats).map((member: any) => ({
      ...member,
      completionRate: member.totalTasks > 0 ? 
        Math.round((member.completedTasks / member.totalTasks) * 100) : 0,
      onTimeRate: member.completedTasks > 0 ? 
        Math.round((member.onTimeCompletions / member.completedTasks) * 100) : 0
    }));
  }

  /**
   * Get communication statistics for the project
   */
  private async getCommunicationStats(projectId: string): Promise<any> {
    // This would integrate with HubSpot's communication tracking
    // For now, return mock data structure
    return {
      totalMessages: 0,
      activeParticipants: 0,
      averageResponseTime: 0,
      lastActivity: new Date().toISOString()
    };
  }

  /**
   * Calculate overall collaboration score
   */
  private calculateCollaborationScore(teamPerformance: any[], communicationStats: any): number {
    if (teamPerformance.length === 0) return 0;

    const avgCompletionRate = teamPerformance.reduce((sum, member) => 
      sum + member.completionRate, 0) / teamPerformance.length;
    
    const avgOnTimeRate = teamPerformance.reduce((sum, member) => 
      sum + member.onTimeRate, 0) / teamPerformance.length;

    // Weight completion rate and on-time rate equally for now
    return Math.round((avgCompletionRate + avgOnTimeRate) / 2);
  }
}
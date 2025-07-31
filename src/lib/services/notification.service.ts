/**
 * Automated Notification Service
 * 
 * Provides intelligent notification delivery across multiple channels
 * Integrates with project workflows, member engagement, and HubSpot
 * Supports email, SMS, in-app, and push notifications
 */

import { PrismaClient } from '@prisma/client'
import { ProjectWorkflowService } from './project-workflow.service'
import { EngagementTrackingService } from './engagement-tracking.service'
import { HubSpotIntegrationService } from './hubspot-integration.service'

export interface NotificationTemplate {
  id: string
  name: string
  type: NotificationType
  channel: NotificationChannel[]
  subject: string
  bodyTemplate: string
  variables: string[]
  enabled: boolean
  priority: NotificationPriority
  conditions: NotificationCondition[]
  scheduling: NotificationScheduling
  createdAt: Date
  updatedAt: Date
}

export type NotificationType = 
  | 'project_status_change'
  | 'project_deadline_approaching'
  | 'project_overdue'
  | 'member_engagement_high'
  | 'member_engagement_low'
  | 'member_at_risk'
  | 'project_inquiry_received'
  | 'milestone_completed'
  | 'milestone_overdue'
  | 'assignment_created'
  | 'assignment_updated'
  | 'hubspot_sync_completed'
  | 'hubspot_sync_failed'
  | 'system_alert'
  | 'custom'

export type NotificationChannel = 
  | 'email'
  | 'sms'
  | 'in_app'
  | 'push'
  | 'slack'
  | 'teams'

export type NotificationPriority = 
  | 'low'
  | 'medium' 
  | 'high'
  | 'critical'

export interface NotificationCondition {
  field: string
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'in' | 'not_in'
  value: any
}

export interface NotificationScheduling {
  immediate: boolean
  delay?: number // minutes
  batchingWindow?: number // minutes
  maxFrequency?: number // per hour
  quietHours?: { start: string; end: string }
  timezone?: string
}

export interface NotificationRecipient {
  id: string
  userId: string
  email: string
  phone?: string
  name: string
  role: string
  preferences: NotificationPreferences
  subscriptions: NotificationSubscription[]
}

export interface NotificationPreferences {
  channels: Record<NotificationChannel, boolean>
  priorities: Record<NotificationPriority, boolean>
  quietHours: { start: string; end: string }
  timezone: string
  frequency: 'immediate' | 'hourly' | 'daily' | 'weekly'
  batchSimilar: boolean
}

export interface NotificationSubscription {
  templateId: string
  enabled: boolean
  channels: NotificationChannel[]
  conditions?: NotificationCondition[]
}

export interface NotificationInstance {
  id: string
  templateId: string
  recipientId: string
  channel: NotificationChannel
  subject: string
  body: string
  metadata: Record<string, any>
  status: 'pending' | 'sent' | 'delivered' | 'failed' | 'cancelled'
  scheduledAt: Date
  sentAt?: Date
  deliveredAt?: Date
  failureReason?: string
  retryCount: number
  maxRetries: number
  createdAt: Date
  updatedAt: Date
}

export interface NotificationContext {
  projectId?: string
  memberId?: string
  workflowId?: string
  assignmentId?: string
  milestoneId?: string
  engagementEvent?: string
  hubspotSync?: string
  customData?: Record<string, any>
}

export class NotificationService {
  private prisma: PrismaClient
  private projectWorkflow: ProjectWorkflowService
  private engagementTracking: EngagementTrackingService
  private hubspotIntegration: HubSpotIntegrationService

  constructor() {
    this.prisma = new PrismaClient()
    this.projectWorkflow = new ProjectWorkflowService()
    this.engagementTracking = new EngagementTrackingService()
    this.hubspotIntegration = new HubSpotIntegrationService()
  }

  /**
   * Send notification based on template and context
   */
  async sendNotification(
    templateId: string,
    context: NotificationContext,
    recipientOverrides?: string[]
  ): Promise<string[]> {
    try {
      // Get notification template
      const template = await this.getNotificationTemplate(templateId)
      if (!template || !template.enabled) {
        console.log(`Template ${templateId} not found or disabled`)
        return []
      }

      // Determine recipients
      const recipients = recipientOverrides 
        ? await this.getRecipientsByIds(recipientOverrides)
        : await this.determineRecipients(template, context)

      if (recipients.length === 0) {
        console.log(`No recipients found for template ${templateId}`)
        return []
      }

      // Process each recipient
      const notificationIds: string[] = []
      
      for (const recipient of recipients) {
        // Check if recipient should receive this notification
        if (!this.shouldReceiveNotification(recipient, template, context)) {
          continue
        }

        // Determine delivery channels for this recipient
        const channels = this.getDeliveryChannels(recipient, template)
        
        // Create notification instances for each channel
        for (const channel of channels) {
          // Generate personalized content
          const { subject, body } = await this.generateNotificationContent(
            template, 
            context, 
            recipient
          )

          // Create notification instance
          const notificationId = await this.createNotificationInstance({
            templateId,
            recipientId: recipient.id,
            channel,
            subject,
            body,
            metadata: { context, template: template.name },
            priority: template.priority,
            scheduling: template.scheduling
          })

          notificationIds.push(notificationId)
        }
      }

      // Process delivery queue
      await this.processDeliveryQueue()

      console.log(`Created ${notificationIds.length} notifications for template ${templateId}`)
      return notificationIds

    } catch (error) {
      console.error('Error sending notification:', error)
      return []
    }
  }

  /**
   * Create and manage notification templates
   */
  async createNotificationTemplate(template: Omit<NotificationTemplate, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      const templateId = crypto.randomUUID()
      
      await this.prisma.$executeRaw`
        INSERT INTO notification_templates (
          id, name, type, channel, subject, body_template, variables,
          enabled, priority, conditions, scheduling
        ) VALUES (
          ${templateId}::uuid,
          ${template.name},
          ${template.type}::notification_type,
          ${JSON.stringify(template.channel)}::jsonb,
          ${template.subject},
          ${template.bodyTemplate},
          ${JSON.stringify(template.variables)}::jsonb,
          ${template.enabled},
          ${template.priority}::notification_priority,
          ${JSON.stringify(template.conditions)}::jsonb,
          ${JSON.stringify(template.scheduling)}::jsonb
        )
      `

      console.log(`Created notification template: ${template.name}`)
      return templateId

    } catch (error) {
      console.error('Error creating notification template:', error)
      throw new Error('Failed to create notification template')
    }
  }

  /**
   * Project workflow notification triggers
   */
  async notifyProjectStatusChange(
    projectId: string,
    fromStatus: string,
    toStatus: string,
    changedBy: string,
    reason: string
  ): Promise<void> {
    await this.sendNotification('project_status_change', {
      projectId,
      customData: { fromStatus, toStatus, changedBy, reason }
    })
  }

  async notifyProjectDeadlineApproaching(projectId: string, daysUntilDeadline: number): Promise<void> {
    await this.sendNotification('project_deadline_approaching', {
      projectId,
      customData: { daysUntilDeadline }
    })
  }

  async notifyProjectOverdue(projectId: string, daysOverdue: number): Promise<void> {
    await this.sendNotification('project_overdue', {
      projectId,
      customData: { daysOverdue }
    })
  }

  async notifyMilestoneCompleted(projectId: string, milestoneId: string, completedBy: string): Promise<void> {
    await this.sendNotification('milestone_completed', {
      projectId,
      milestoneId,
      customData: { completedBy }
    })
  }

  async notifyAssignmentCreated(projectId: string, assignmentId: string, assignedUserId: string): Promise<void> {
    await this.sendNotification('assignment_created', {
      projectId,
      assignmentId,
      customData: { assignedUserId }
    }, [assignedUserId])
  }

  /**
   * Member engagement notification triggers
   */
  async notifyHighEngagement(memberId: string, engagementScore: number, projectId?: string): Promise<void> {
    await this.sendNotification('member_engagement_high', {
      memberId,
      projectId,
      customData: { engagementScore }
    })
  }

  async notifyLowEngagement(memberId: string, engagementScore: number): Promise<void> {
    await this.sendNotification('member_engagement_low', {
      memberId,
      customData: { engagementScore }
    })
  }

  async notifyMemberAtRisk(memberId: string, riskFactors: string[]): Promise<void> {
    await this.sendNotification('member_at_risk', {
      memberId,
      customData: { riskFactors }
    })
  }

  async notifyProjectInquiry(projectId: string, memberId: string, inquiryType: string): Promise<void> {
    await this.sendNotification('project_inquiry_received', {
      projectId,
      memberId,
      customData: { inquiryType }
    })
  }

  /**
   * HubSpot integration notification triggers
   */
  async notifyHubSpotSyncCompleted(syncType: string, successful: number, failed: number): Promise<void> {
    await this.sendNotification('hubspot_sync_completed', {
      hubspotSync: syncType,
      customData: { successful, failed }
    })
  }

  async notifyHubSpotSyncFailed(syncType: string, error: string): Promise<void> {
    await this.sendNotification('hubspot_sync_failed', {
      hubspotSync: syncType,
      customData: { error }
    })
  }

  /**
   * System alert notifications
   */
  async notifySystemAlert(alertType: string, message: string, severity: NotificationPriority): Promise<void> {
    await this.sendNotification('system_alert', {
      customData: { alertType, message, severity }
    })
  }

  /**
   * Batch notification processing for recurring events
   */
  async processScheduledNotifications(): Promise<void> {
    try {
      // Check for approaching deadlines
      await this.checkProjectDeadlines()
      
      // Check for overdue projects
      await this.checkOverdueProjects()
      
      // Check for at-risk members
      await this.checkAtRiskMembers()
      
      // Process pending notifications
      await this.processDeliveryQueue()

      console.log('Completed scheduled notification processing')
    } catch (error) {
      console.error('Error processing scheduled notifications:', error)
    }
  }

  /**
   * Manage user notification preferences
   */
  async updateNotificationPreferences(
    userId: string, 
    preferences: Partial<NotificationPreferences>
  ): Promise<boolean> {
    try {
      await this.prisma.$executeRaw`
        UPDATE notification_recipients 
        SET preferences = preferences || ${JSON.stringify(preferences)}::jsonb
        WHERE user_id = ${userId}::uuid
      `

      console.log(`Updated notification preferences for user ${userId}`)
      return true
    } catch (error) {
      console.error('Error updating notification preferences:', error)
      return false
    }
  }

  async subscribeToNotification(
    userId: string,
    templateId: string,
    channels: NotificationChannel[],
    conditions?: NotificationCondition[]
  ): Promise<boolean> {
    try {
      const subscription: NotificationSubscription = {
        templateId,
        enabled: true,
        channels,
        conditions
      }

      await this.prisma.$executeRaw`
        UPDATE notification_recipients 
        SET subscriptions = subscriptions || ${JSON.stringify([subscription])}::jsonb
        WHERE user_id = ${userId}::uuid
      `

      console.log(`Created subscription for user ${userId} to template ${templateId}`)
      return true
    } catch (error) {
      console.error('Error creating notification subscription:', error)
      return false
    }
  }

  /**
   * Analytics and reporting
   */
  async getNotificationAnalytics(timeRange: { start: Date; end: Date }): Promise<{
    totalSent: number
    deliveryRate: number
    channelPerformance: Record<NotificationChannel, { sent: number; delivered: number }>
    templatePerformance: Record<string, { sent: number; delivered: number }>
    failureReasons: Record<string, number>
  }> {
    try {
      const analytics = await this.prisma.$queryRaw<Array<{
        channel: NotificationChannel
        templateId: string
        status: string
        failureReason?: string
        count: number
      }>>`
        SELECT 
          channel,
          template_id as "templateId",
          status,
          failure_reason as "failureReason",
          COUNT(*) as count
        FROM notification_instances 
        WHERE created_at BETWEEN ${timeRange.start} AND ${timeRange.end}
        GROUP BY channel, template_id, status, failure_reason
      `

      // Process analytics data
      let totalSent = 0
      let totalDelivered = 0
      const channelPerformance: Record<string, { sent: number; delivered: number }> = {}
      const templatePerformance: Record<string, { sent: number; delivered: number }> = {}
      const failureReasons: Record<string, number> = {}

      analytics.forEach(row => {
        const count = Number(row.count)
        
        if (row.status === 'sent' || row.status === 'delivered') {
          totalSent += count
          
          if (row.status === 'delivered') {
            totalDelivered += count
          }
          
          // Channel performance
          if (!channelPerformance[row.channel]) {
            channelPerformance[row.channel] = { sent: 0, delivered: 0 }
          }
          channelPerformance[row.channel].sent += count
          if (row.status === 'delivered') {
            channelPerformance[row.channel].delivered += count
          }
          
          // Template performance
          if (!templatePerformance[row.templateId]) {
            templatePerformance[row.templateId] = { sent: 0, delivered: 0 }
          }
          templatePerformance[row.templateId].sent += count
          if (row.status === 'delivered') {
            templatePerformance[row.templateId].delivered += count
          }
        }
        
        // Failure reasons
        if (row.status === 'failed' && row.failureReason) {
          failureReasons[row.failureReason] = (failureReasons[row.failureReason] || 0) + count
        }
      })

      return {
        totalSent,
        deliveryRate: totalSent > 0 ? (totalDelivered / totalSent) * 100 : 0,
        channelPerformance: channelPerformance as any,
        templatePerformance,
        failureReasons
      }
    } catch (error) {
      console.error('Error getting notification analytics:', error)
      throw new Error('Failed to get notification analytics')
    }
  }

  // Private helper methods
  private async getNotificationTemplate(templateId: string): Promise<NotificationTemplate | null> {
    try {
      const result = await this.prisma.$queryRaw<NotificationTemplate[]>`
        SELECT * FROM notification_templates WHERE id = ${templateId}::uuid
      `
      return result[0] || null
    } catch (error) {
      console.error('Error getting notification template:', error)
      return null
    }
  }

  private async getRecipientsByIds(recipientIds: string[]): Promise<NotificationRecipient[]> {
    try {
      const result = await this.prisma.$queryRaw<NotificationRecipient[]>`
        SELECT * FROM notification_recipients 
        WHERE user_id = ANY(${recipientIds}::uuid[])
      `
      return result
    } catch (error) {
      console.error('Error getting recipients:', error)
      return []
    }
  }

  private async determineRecipients(
    template: NotificationTemplate, 
    context: NotificationContext
  ): Promise<NotificationRecipient[]> {
    // Implementation would determine recipients based on template type and context
    // For example, project notifications go to assigned users, engagement notifications to admins
    try {
      let recipients: NotificationRecipient[] = []
      
      switch (template.type) {
        case 'project_status_change':
        case 'project_deadline_approaching':
        case 'project_overdue':
          if (context.projectId) {
            recipients = await this.getProjectRecipients(context.projectId)
          }
          break
          
        case 'member_engagement_high':
        case 'member_engagement_low':
        case 'member_at_risk':
          recipients = await this.getAdminRecipients()
          break
          
        case 'assignment_created':
        case 'assignment_updated':
          if (context.assignmentId) {
            recipients = await this.getAssignmentRecipients(context.assignmentId)
          }
          break
          
        default:
          recipients = await this.getAdminRecipients()
      }
      
      return recipients
    } catch (error) {
      console.error('Error determining recipients:', error)
      return []
    }
  }

  private shouldReceiveNotification(
    recipient: NotificationRecipient,
    template: NotificationTemplate,
    context: NotificationContext
  ): boolean {
    // Check recipient preferences and subscriptions
    const preferences = recipient.preferences
    
    // Check if recipient wants this priority level
    if (!preferences.priorities[template.priority]) {
      return false
    }
    
    // Check quiet hours
    const now = new Date()
    const currentHour = now.getHours()
    const quietStart = parseInt(preferences.quietHours.start.split(':')[0])
    const quietEnd = parseInt(preferences.quietHours.end.split(':')[0])
    
    if (currentHour >= quietStart || currentHour < quietEnd) {
      // Only send critical notifications during quiet hours
      if (template.priority !== 'critical') {
        return false
      }
    }
    
    // Check subscriptions
    const subscription = recipient.subscriptions.find(s => s.templateId === template.id)
    if (subscription && !subscription.enabled) {
      return false
    }
    
    return true
  }

  private getDeliveryChannels(
    recipient: NotificationRecipient,
    template: NotificationTemplate
  ): NotificationChannel[] {
    const templateChannels = template.channel
    const recipientChannels = Object.entries(recipient.preferences.channels)
      .filter(([_, enabled]) => enabled)
      .map(([channel, _]) => channel as NotificationChannel)
    
    // Intersection of template channels and recipient preferences
    return templateChannels.filter(channel => recipientChannels.includes(channel))
  }

  private async generateNotificationContent(
    template: NotificationTemplate,
    context: NotificationContext,
    recipient: NotificationRecipient
  ): Promise<{ subject: string; body: string }> {
    // Template variable replacement
    const variables = await this.getTemplateVariables(context, recipient)
    
    let subject = template.subject
    let body = template.bodyTemplate
    
    // Replace variables in template
    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{{${key}}}`
      subject = subject.replace(new RegExp(placeholder, 'g'), String(value))
      body = body.replace(new RegExp(placeholder, 'g'), String(value))
    }
    
    return { subject, body }
  }

  private async getTemplateVariables(
    context: NotificationContext,
    recipient: NotificationRecipient
  ): Promise<Record<string, any>> {
    const variables: Record<string, any> = {
      recipientName: recipient.name,
      recipientEmail: recipient.email,
      currentDate: new Date().toLocaleDateString(),
      currentTime: new Date().toLocaleTimeString()
    }
    
    // Add context-specific variables
    if (context.projectId) {
      const project = await this.getProjectDetails(context.projectId)
      if (project) {
        variables.projectTitle = project.title
        variables.projectClient = project.client
        variables.projectDeadline = project.deadline
      }
    }
    
    if (context.memberId) {
      const member = await this.getMemberDetails(context.memberId)
      if (member) {
        variables.memberName = member.name
        variables.memberCompany = member.company
        variables.memberEmail = member.email
      }
    }
    
    // Add custom data variables
    if (context.customData) {
      Object.assign(variables, context.customData)
    }
    
    return variables
  }

  private async createNotificationInstance(data: {
    templateId: string
    recipientId: string
    channel: NotificationChannel
    subject: string
    body: string
    metadata: Record<string, any>
    priority: NotificationPriority
    scheduling: NotificationScheduling
  }): Promise<string> {
    const notificationId = crypto.randomUUID()
    const scheduledAt = data.scheduling.immediate 
      ? new Date()
      : new Date(Date.now() + (data.scheduling.delay || 0) * 60 * 1000)
    
    await this.prisma.$executeRaw`
      INSERT INTO notification_instances (
        id, template_id, recipient_id, channel, subject, body,
        metadata, status, scheduled_at, retry_count, max_retries
      ) VALUES (
        ${notificationId}::uuid,
        ${data.templateId}::uuid,
        ${data.recipientId}::uuid,
        ${data.channel}::notification_channel,
        ${data.subject},
        ${data.body},
        ${JSON.stringify(data.metadata)}::jsonb,
        'pending'::notification_status,
        ${scheduledAt},
        0,
        3
      )
    `
    
    return notificationId
  }

  private async processDeliveryQueue(): Promise<void> {
    try {
      // Get pending notifications ready for delivery
      const pendingNotifications = await this.prisma.$queryRaw<NotificationInstance[]>`
        SELECT * FROM notification_instances 
        WHERE status = 'pending' 
        AND scheduled_at <= NOW()
        AND retry_count < max_retries
        ORDER BY scheduled_at ASC
        LIMIT 50
      `

      console.log(`Processing ${pendingNotifications.length} pending notifications`)

      for (const notification of pendingNotifications) {
        try {
          await this.deliverNotification(notification)
        } catch (error) {
          console.error(`Failed to deliver notification ${notification.id}:`, error)
          await this.handleDeliveryFailure(notification, error instanceof Error ? error.message : 'Unknown error')
        }
      }

      console.log('Notification delivery queue processing completed')
    } catch (error) {
      console.error('Error processing delivery queue:', error)
    }
  }

  private async deliverNotification(notification: NotificationInstance): Promise<void> {
    // Update status to processing
    await this.prisma.$executeRaw`
      UPDATE notification_instances 
      SET status = 'sent', sent_at = NOW(), updated_at = NOW()
      WHERE id = ${notification.id}::uuid
    `

    // Handle different delivery channels
    switch (notification.channel) {
      case 'email':
        await this.deliverEmail(notification)
        break
      case 'sms':
        await this.deliverSMS(notification)
        break
      case 'in_app':
        await this.deliverInApp(notification)
        break
      case 'push':
        await this.deliverPush(notification)
        break
      default:
        throw new Error(`Unsupported delivery channel: ${notification.channel}`)
    }

    // Mark as delivered
    await this.prisma.$executeRaw`
      UPDATE notification_instances 
      SET status = 'delivered', delivered_at = NOW(), updated_at = NOW()
      WHERE id = ${notification.id}::uuid
    `

    console.log(`Successfully delivered notification ${notification.id} via ${notification.channel}`)
  }

  private async deliverEmail(notification: NotificationInstance): Promise<void> {
    // Get email delivery service
    const { emailDeliveryService } = await import('./email-delivery.service')
    
    // Get recipient email
    const recipient = await this.prisma.$queryRaw<Array<{ email: string }>>`
      SELECT email FROM notification_recipients WHERE id = ${notification.recipientId}::uuid
    `

    if (!recipient[0]) {
      throw new Error('Recipient not found')
    }

    // Send email
    const result = await emailDeliveryService.sendNotificationEmail({
      ...notification,
      recipientId: recipient[0].email
    })

    if (!result.success) {
      throw new Error(result.error || 'Email delivery failed')
    }
  }

  private async deliverSMS(notification: NotificationInstance): Promise<void> {
    // SMS delivery would be implemented here using Twilio or similar
    console.log(`[MOCK] SMS delivery for notification ${notification.id}`)
    console.log(`[MOCK] Message: ${notification.body}`)
  }

  private async deliverInApp(notification: NotificationInstance): Promise<void> {
    // In-app notification delivery (store in database for user to see)
    await this.prisma.$executeRaw`
      INSERT INTO user_notifications (
        id, user_id, title, message, type, read, created_at
      ) VALUES (
        gen_random_uuid(),
        (SELECT user_id FROM notification_recipients WHERE id = ${notification.recipientId}::uuid),
        ${notification.subject},
        ${notification.body},
        'notification',
        false,
        NOW()
      )
    `
    console.log(`In-app notification stored for notification ${notification.id}`)
  }

  private async deliverPush(notification: NotificationInstance): Promise<void> {
    // Push notification delivery would be implemented here using FCM or similar
    console.log(`[MOCK] Push notification delivery for notification ${notification.id}`)
    console.log(`[MOCK] Title: ${notification.subject}`)
    console.log(`[MOCK] Body: ${notification.body}`)
  }

  private async handleDeliveryFailure(notification: NotificationInstance, error: string): Promise<void> {
    const newRetryCount = notification.retryCount + 1
    const maxRetries = notification.maxRetries

    if (newRetryCount >= maxRetries) {
      // Mark as failed
      await this.prisma.$executeRaw`
        UPDATE notification_instances 
        SET status = 'failed', failure_reason = ${error}, retry_count = ${newRetryCount}, updated_at = NOW()
        WHERE id = ${notification.id}::uuid
      `
      console.error(`Notification ${notification.id} failed after ${maxRetries} attempts: ${error}`)
    } else {
      // Schedule retry with exponential backoff
      const retryDelay = Math.min(300000, Math.pow(2, newRetryCount) * 60000) // Max 5 minutes
      const retryAt = new Date(Date.now() + retryDelay)

      await this.prisma.$executeRaw`
        UPDATE notification_instances 
        SET status = 'pending', retry_count = ${newRetryCount}, scheduled_at = ${retryAt}, 
            failure_reason = ${error}, updated_at = NOW()
        WHERE id = ${notification.id}::uuid
      `
      
      console.log(`Scheduled retry ${newRetryCount}/${maxRetries} for notification ${notification.id} at ${retryAt}`)
    }
  }

  // Additional helper methods for checking deadlines, overdue projects, etc.
  private async checkProjectDeadlines(): Promise<void> {
    try {
      // Check for projects with deadlines approaching in 1, 3, and 7 days
      const deadlineChecks = [
        { days: 1, template: 'project_deadline_approaching' },
        { days: 3, template: 'project_deadline_approaching' }, 
        { days: 7, template: 'project_deadline_approaching' }
      ]

      for (const check of deadlineChecks) {
        const targetDate = new Date()
        targetDate.setDate(targetDate.getDate() + check.days)
        targetDate.setHours(0, 0, 0, 0)

        const endDate = new Date(targetDate)
        endDate.setHours(23, 59, 59, 999)

        const projects = await this.prisma.$queryRaw<Array<{ id: string; title: string; deadline: Date }>>`
          SELECT id, title, deadline FROM projects 
          WHERE deadline BETWEEN ${targetDate} AND ${endDate}
          AND status IN ('active', 'approved')
        `

        for (const project of projects) {
          await this.notifyProjectDeadlineApproaching(project.id, check.days)
        }
      }
    } catch (error) {
      console.error('Error checking project deadlines:', error)
    }
  }

  private async checkOverdueProjects(): Promise<void> {
    try {
      const now = new Date()
      const overdueProjects = await this.prisma.$queryRaw<Array<{ id: string; title: string; deadline: Date }>>`
        SELECT id, title, deadline FROM projects 
        WHERE deadline < ${now}
        AND status IN ('active', 'approved')
        AND id NOT IN (
          SELECT DISTINCT project_id FROM project_notifications 
          WHERE notification_type = 'project_overdue'
          AND created_at > ${new Date(Date.now() - 24 * 60 * 60 * 1000)}
        )
      `

      for (const project of overdueProjects) {
        const daysOverdue = Math.floor((now.getTime() - project.deadline.getTime()) / (1000 * 60 * 60 * 24))
        await this.notifyProjectOverdue(project.id, daysOverdue)
      }
    } catch (error) {
      console.error('Error checking overdue projects:', error)
    }
  }

  private async checkAtRiskMembers(): Promise<void> {
    try {
      // Find members with declining engagement scores
      const atRiskMembers = await this.prisma.$queryRaw<Array<{
        user_id: string
        engagement_score: number
        engagement_trend: string
        last_activity: Date
      }>>`
        SELECT user_id, AVG(engagement_score) as engagement_score, 
               mode() WITHIN GROUP (ORDER BY engagement_trend) as engagement_trend,
               MAX(last_activity) as last_activity
        FROM member_engagement_scores 
        WHERE updated_at >= NOW() - INTERVAL '30 days'
        GROUP BY user_id
        HAVING AVG(engagement_score) < 30 
        OR mode() WITHIN GROUP (ORDER BY engagement_trend) = 'decreasing'
        OR MAX(last_activity) < NOW() - INTERVAL '14 days'
      `

      for (const member of atRiskMembers) {
        const riskFactors = []
        
        if (member.engagement_score < 30) {
          riskFactors.push('Low engagement score')
        }
        
        if (member.engagement_trend === 'decreasing') {
          riskFactors.push('Declining engagement trend')
        }
        
        if (member.last_activity < new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)) {
          riskFactors.push('No recent activity')
        }

        await this.notifyMemberAtRisk(member.user_id, riskFactors)
      }
    } catch (error) {
      console.error('Error checking at-risk members:', error)
    }
  }

  private async getProjectRecipients(projectId: string): Promise<NotificationRecipient[]> {
    try {
      const recipients = await this.prisma.$queryRaw<NotificationRecipient[]>`
        SELECT DISTINCT nr.* 
        FROM notification_recipients nr
        JOIN project_assignments pa ON nr.user_id = pa.user_id
        WHERE pa.project_id = ${projectId}::uuid
        
        UNION
        
        SELECT DISTINCT nr.*
        FROM notification_recipients nr
        JOIN users u ON nr.user_id = u.id
        JOIN user_roles ur ON u.id = ur.user_id
        WHERE ur.role_name = 'admin'
      `
      
      return recipients
    } catch (error) {
      console.error('Error getting project recipients:', error)
      return []
    }
  }

  private async getAdminRecipients(): Promise<NotificationRecipient[]> {
    try {
      const recipients = await this.prisma.$queryRaw<NotificationRecipient[]>`
        SELECT DISTINCT nr.*
        FROM notification_recipients nr
        JOIN users u ON nr.user_id = u.id
        JOIN user_roles ur ON u.id = ur.user_id
        WHERE ur.role_name = 'admin'
      `
      
      return recipients
    } catch (error) {
      console.error('Error getting admin recipients:', error)
      return []
    }
  }

  private async getAssignmentRecipients(assignmentId: string): Promise<NotificationRecipient[]> {
    try {
      const recipients = await this.prisma.$queryRaw<NotificationRecipient[]>`
        SELECT DISTINCT nr.*
        FROM notification_recipients nr
        JOIN project_assignments pa ON nr.user_id = pa.assigned_user_id
        WHERE pa.id = ${assignmentId}::uuid
      `
      
      return recipients
    } catch (error) {
      console.error('Error getting assignment recipients:', error)
      return []
    }
  }

  private async getProjectDetails(projectId: string): Promise<any> {
    try {
      const project = await this.prisma.$queryRaw`
        SELECT title, client, deadline, budget_min, budget_max, location, status
        FROM projects WHERE id = ${projectId}::uuid
      `
      
      return (project as any)[0] || null
    } catch (error) {
      console.error('Error getting project details:', error)
      return null
    }
  }

  private async getMemberDetails(memberId: string): Promise<any> {
    try {
      const member = await this.prisma.$queryRaw`
        SELECT u.first_name || ' ' || u.last_name as name, u.email, mp.company_name as company
        FROM users u
        LEFT JOIN member_profiles mp ON u.id = mp.user_id
        WHERE u.id = ${memberId}::uuid
      `
      
      return (member as any)[0] || null
    } catch (error) {
      console.error('Error getting member details:', error)
      return null
    }
  }

  async disconnect(): Promise<void> {
    await this.prisma.$disconnect()
    await this.projectWorkflow.disconnect()
    await this.engagementTracking.disconnect()
    await this.hubspotIntegration.disconnect()
  }
}

// Export singleton instance
export const notificationService = new NotificationService()
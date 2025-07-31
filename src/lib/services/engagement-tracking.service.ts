/**
 * Member Engagement Tracking Service
 * 
 * This service implements comprehensive member engagement tracking for project opportunities.
 * It provides methods to track views, interactions, document access, inquiries, and 
 * calculate engagement scores for analytics and HubSpot integration.
 */

import { PrismaClient } from '@prisma/client'
import { notificationService } from './notification.service'

// Types for engagement tracking
export interface ProjectView {
  id?: string
  projectId: string
  userId: string
  viewDuration: number
  pagesViewed: string[]
  referrerSource?: string
  deviceType: string
  ipAddress?: string
  userAgent?: string
  createdAt?: Date
}

export interface ProjectInterest {
  id?: string
  projectId: string
  userId: string
  interestLevel: 'high' | 'medium' | 'low'
  interestType: 'viewing' | 'bookmark' | 'inquiry' | 'bid_intent'
  notes?: string
  metadata?: Record<string, any>
}

export interface DocumentAccess {
  id?: string
  projectId: string
  documentId: string
  userId: string
  accessType: 'view' | 'download' | 'print'
  ipAddress?: string
  userAgent?: string
}

export interface ProjectInquiry {
  id?: string
  projectId: string
  userId: string
  inquiryType: 'question' | 'clarification' | 'site_visit' | 'meeting'
  subject: string
  message: string
  status: 'pending' | 'answered' | 'closed'
  priorityLevel: 'low' | 'medium' | 'high' | 'urgent'
}

export interface EngagementScore {
  userId: string
  projectId: string
  engagementScore: number
  viewScore: number
  interactionScore: number
  documentScore: number
  inquiryScore: number
  bidHistoryScore: number
  lastActivity?: Date
  engagementTrend: 'increasing' | 'stable' | 'decreasing'
}

export interface EngagementAnalytics {
  totalViews: number
  uniqueViewers: number
  totalDocumentDownloads: number
  totalInquiries: number
  averageEngagementScore: number
  highEngagementMembers: number
  mediumEngagementMembers: number
  lowEngagementMembers: number
  conversionRate: number
  topReferrerSources: Array<{ source: string; count: number }>
  deviceBreakdown: Array<{ device: string; count: number }>
  engagementTrends: Array<{ date: string; score: number }>
}

export class EngagementTrackingService {
  private prisma: PrismaClient

  constructor(prisma?: PrismaClient) {
    this.prisma = prisma || new PrismaClient()
  }

  /**
   * Track a project view
   */
  async trackProjectView(viewData: ProjectView): Promise<string> {
    try {
      // Use raw SQL to insert into our custom engagement tables
      const result = await this.prisma.$executeRaw`
        INSERT INTO project_views (
          project_id, user_id, view_duration, pages_viewed, 
          referrer_source, device_type, ip_address, user_agent
        ) VALUES (
          ${viewData.projectId}::uuid, 
          ${viewData.userId}::uuid, 
          ${viewData.viewDuration}, 
          ${JSON.stringify(viewData.pagesViewed)}::jsonb,
          ${viewData.referrerSource || null},
          ${viewData.deviceType},
          ${viewData.ipAddress || null}::inet,
          ${viewData.userAgent || null}
        )
      `

      // Update engagement score asynchronously
      this.updateEngagementScore(viewData.userId, viewData.projectId).catch(console.error)

      return 'success'
    } catch (error) {
      console.error('Error tracking project view:', error)
      throw new Error('Failed to track project view')
    }
  }

  /**
   * Track member interest in a project
   */
  async trackProjectInterest(interestData: ProjectInterest): Promise<string> {
    try {
      const result = await this.prisma.$executeRaw`
        INSERT INTO project_interests (
          project_id, user_id, interest_level, interest_type, notes, metadata
        ) VALUES (
          ${interestData.projectId}::uuid,
          ${interestData.userId}::uuid,
          ${interestData.interestLevel},
          ${interestData.interestType},
          ${interestData.notes || null},
          ${JSON.stringify(interestData.metadata || {})}::jsonb
        )
        ON CONFLICT (project_id, user_id, interest_type) DO UPDATE SET
          interest_level = EXCLUDED.interest_level,
          notes = EXCLUDED.notes,
          metadata = EXCLUDED.metadata,
          updated_at = NOW()
      `

      // Update engagement score asynchronously
      this.updateEngagementScore(interestData.userId, interestData.projectId).catch(console.error)

      return 'success'
    } catch (error) {
      console.error('Error tracking project interest:', error)
      throw new Error('Failed to track project interest')
    }
  }

  /**
   * Track document access
   */
  async trackDocumentAccess(accessData: DocumentAccess): Promise<string> {
    try {
      const result = await this.prisma.$executeRaw`
        INSERT INTO project_document_access (
          project_id, document_id, user_id, access_type, ip_address, user_agent
        ) VALUES (
          ${accessData.projectId}::uuid,
          ${accessData.documentId}::uuid,
          ${accessData.userId}::uuid,
          ${accessData.accessType},
          ${accessData.ipAddress || null}::inet,
          ${accessData.userAgent || null}
        )
      `

      // Update engagement score asynchronously
      this.updateEngagementScore(accessData.userId, accessData.projectId).catch(console.error)

      return 'success'
    } catch (error) {
      console.error('Error tracking document access:', error)
      throw new Error('Failed to track document access')
    }
  }

  /**
   * Track project inquiry
   */
  async trackProjectInquiry(inquiryData: ProjectInquiry): Promise<string> {
    try {
      const result = await this.prisma.$executeRaw`
        INSERT INTO project_inquiries (
          project_id, user_id, inquiry_type, subject, message, priority_level
        ) VALUES (
          ${inquiryData.projectId}::uuid,
          ${inquiryData.userId}::uuid,
          ${inquiryData.inquiryType},
          ${inquiryData.subject},
          ${inquiryData.message},
          ${inquiryData.priorityLevel}
        )
      `

      // Update engagement score asynchronously
      this.updateEngagementScore(inquiryData.userId, inquiryData.projectId).catch(console.error)

      // Send inquiry notification to admins
      await notificationService.notifyProjectInquiry(
        inquiryData.projectId,
        inquiryData.userId,
        inquiryData.inquiryType
      ).catch(error => {
        console.error('Failed to send project inquiry notification:', error)
      })

      return 'success'
    } catch (error) {
      console.error('Error tracking project inquiry:', error)
      throw new Error('Failed to track project inquiry')
    }
  }

  /**
   * Get member engagement score for a specific project
   */
  async getMemberEngagementScore(userId: string, projectId: string): Promise<EngagementScore | null> {
    try {
      const result = await this.prisma.$queryRaw<EngagementScore[]>`
        SELECT 
          user_id as "userId",
          project_id as "projectId",
          engagement_score as "engagementScore",
          view_score as "viewScore",
          interaction_score as "interactionScore",
          document_score as "documentScore",
          inquiry_score as "inquiryScore",
          bid_history_score as "bidHistoryScore",
          last_activity as "lastActivity",
          engagement_trend as "engagementTrend"
        FROM member_engagement_scores 
        WHERE user_id = ${userId}::uuid AND project_id = ${projectId}::uuid
      `

      return result[0] || null
    } catch (error) {
      console.error('Error getting engagement score:', error)
      return null
    }
  }

  /**
   * Get top engaged members for a project
   */
  async getTopEngagedMembers(projectId: string, limit: number = 10): Promise<EngagementScore[]> {
    try {
      const result = await this.prisma.$queryRaw<EngagementScore[]>`
        SELECT 
          mes.user_id as "userId",
          mes.project_id as "projectId",
          mes.engagement_score as "engagementScore",
          mes.view_score as "viewScore",
          mes.interaction_score as "interactionScore",
          mes.document_score as "documentScore",
          mes.inquiry_score as "inquiryScore",
          mes.bid_history_score as "bidHistoryScore",
          mes.last_activity as "lastActivity",
          mes.engagement_trend as "engagementTrend",
          u.first_name,
          u.last_name,
          u.email,
          mp.company_name
        FROM member_engagement_scores mes
        JOIN users u ON mes.user_id = u.id
        LEFT JOIN member_profiles mp ON u.id = mp.user_id
        WHERE mes.project_id = ${projectId}::uuid
        ORDER BY mes.engagement_score DESC
        LIMIT ${limit}
      `

      return result
    } catch (error) {
      console.error('Error getting top engaged members:', error)
      return []
    }
  }

  /**
   * Get project engagement analytics
   */
  async getProjectEngagementAnalytics(projectId: string): Promise<EngagementAnalytics | null> {
    try {
      // Get basic engagement metrics
      const analyticsResult = await this.prisma.$queryRaw<any[]>`
        SELECT 
          COALESCE(pa.total_views, 0) as "totalViews",
          COALESCE(pa.unique_viewers, 0) as "uniqueViewers",
          COALESCE(pa.total_document_downloads, 0) as "totalDocumentDownloads",
          COALESCE(pa.total_inquiries, 0) as "totalInquiries",
          COALESCE(pa.average_engagement_score, 0) as "averageEngagementScore",
          COALESCE(pa.high_engagement_members, 0) as "highEngagementMembers",
          COALESCE(pa.medium_engagement_members, 0) as "mediumEngagementMembers",
          COALESCE(pa.low_engagement_members, 0) as "lowEngagementMembers",
          COALESCE(pa.conversion_rate, 0) as "conversionRate"
        FROM project_analytics pa
        WHERE pa.project_id = ${projectId}::uuid
      `

      // Get referrer source breakdown
      const referrerResult = await this.prisma.$queryRaw<Array<{source: string, count: number}>>`
        SELECT 
          COALESCE(referrer_source, 'Direct') as source,
          COUNT(*) as count
        FROM project_views 
        WHERE project_id = ${projectId}::uuid
        GROUP BY referrer_source
        ORDER BY count DESC
        LIMIT 10
      `

      // Get device breakdown
      const deviceResult = await this.prisma.$queryRaw<Array<{device: string, count: number}>>`
        SELECT 
          device_type as device,
          COUNT(*) as count
        FROM project_views 
        WHERE project_id = ${projectId}::uuid
        GROUP BY device_type
        ORDER BY count DESC
      `

      // Get engagement trends (last 30 days)
      const trendsResult = await this.prisma.$queryRaw<Array<{date: string, score: number}>>`
        SELECT 
          DATE(pv.created_at) as date,
          AVG(mes.engagement_score) as score
        FROM project_views pv
        LEFT JOIN member_engagement_scores mes ON pv.user_id = mes.user_id AND pv.project_id = mes.project_id
        WHERE pv.project_id = ${projectId}::uuid
          AND pv.created_at >= NOW() - INTERVAL '30 days'
        GROUP BY DATE(pv.created_at)
        ORDER BY date ASC
      `

      if (analyticsResult.length === 0) {
        return null
      }

      const analytics = analyticsResult[0]

      return {
        ...analytics,
        topReferrerSources: referrerResult.map(r => ({ source: r.source, count: Number(r.count) })),
        deviceBreakdown: deviceResult.map(d => ({ device: d.device, count: Number(d.count) })),
        engagementTrends: trendsResult.map(t => ({ 
          date: t.date, 
          score: Number(t.score) || 0 
        }))
      }
    } catch (error) {
      console.error('Error getting project engagement analytics:', error)
      return null
    }
  }

  /**
   * Get member engagement overview across all projects
   */
  async getMemberEngagementOverview(userId: string): Promise<any> {
    try {
      const result = await this.prisma.$queryRaw<any[]>`
        SELECT 
          u.id as user_id,
          u.first_name,
          u.last_name,
          u.email,
          mp.company_name,
          COUNT(DISTINCT pv.project_id) as projects_viewed,
          COUNT(DISTINCT pi.project_id) as projects_interested,
          COUNT(DISTINCT pb.project_id) as projects_bid,
          AVG(mes.engagement_score) as average_engagement_score,
          MAX(pv.created_at) as last_project_view,
          COUNT(DISTINCT pda.document_id) as documents_downloaded
        FROM users u
        LEFT JOIN member_profiles mp ON u.id = mp.user_id
        LEFT JOIN project_views pv ON u.id = pv.user_id
        LEFT JOIN project_interests pi ON u.id = pi.user_id
        LEFT JOIN project_bids pb ON u.id = pb.member_id
        LEFT JOIN member_engagement_scores mes ON u.id = mes.user_id
        LEFT JOIN project_document_access pda ON u.id = pda.user_id
        WHERE u.id = ${userId}::uuid
        GROUP BY u.id, u.first_name, u.last_name, u.email, mp.company_name
      `

      return result[0] || null
    } catch (error) {
      console.error('Error getting member engagement overview:', error)
      return null
    }
  }

  /**
   * Update engagement score using database function
   */
  private async updateEngagementScore(userId: string, projectId: string): Promise<void> {
    try {
      // Call the database function to calculate and update engagement score
      await this.prisma.$executeRaw`
        INSERT INTO member_engagement_scores (user_id, project_id, engagement_score)
        VALUES (
          ${userId}::uuid, 
          ${projectId}::uuid, 
          calculate_engagement_score(${userId}::uuid, ${projectId}::uuid)
        )
        ON CONFLICT (user_id, project_id) DO UPDATE SET
          engagement_score = calculate_engagement_score(EXCLUDED.user_id, EXCLUDED.project_id),
          updated_at = NOW()
      `

      // Update project analytics
      await this.prisma.$executeRaw`
        SELECT update_project_analytics(${projectId}::uuid)
      `

      // Check if we should send engagement notifications
      await this.checkEngagementThresholds(userId, projectId)
    } catch (error) {
      console.error('Error updating engagement score:', error)
    }
  }

  /**
   * Check engagement thresholds and send notifications if needed
   */
  private async checkEngagementThresholds(userId: string, projectId: string): Promise<void> {
    try {
      const engagementScore = await this.getEngagementScore(userId, projectId)
      
      if (!engagementScore) return

      // Check for high engagement (score >= 80)
      if (engagementScore.engagementScore >= 80) {
        // Only notify once per day for high engagement
        const lastNotification = await this.prisma.$queryRaw<Array<{ created_at: Date }>>`
          SELECT created_at FROM project_notifications 
          WHERE user_id = ${userId}::uuid 
          AND notification_type = 'member_engagement_high'
          AND created_at > NOW() - INTERVAL '24 hours'
          ORDER BY created_at DESC LIMIT 1
        `

        if (lastNotification.length === 0) {
          await notificationService.notifyHighEngagement(
            userId, 
            engagementScore.engagementScore, 
            projectId
          ).catch(error => {
            console.error('Failed to send high engagement notification:', error)
          })
        }
      }

      // Check for low engagement (score < 20 and trending down)
      if (engagementScore.engagementScore < 20 && engagementScore.engagementTrend === 'decreasing') {
        // Only notify weekly for low engagement
        const lastNotification = await this.prisma.$queryRaw<Array<{ created_at: Date }>>`
          SELECT created_at FROM project_notifications 
          WHERE user_id = ${userId}::uuid 
          AND notification_type = 'member_engagement_low'
          AND created_at > NOW() - INTERVAL '7 days'
          ORDER BY created_at DESC LIMIT 1
        `

        if (lastNotification.length === 0) {
          await notificationService.notifyLowEngagement(
            userId, 
            engagementScore.engagementScore
          ).catch(error => {
            console.error('Failed to send low engagement notification:', error)
          })
        }
      }
    } catch (error) {
      console.error('Error checking engagement thresholds:', error)
    }
  }

  /**
   * Bulk track multiple activities (for batch processing)
   */
  async bulkTrackActivities(activities: Array<{
    type: 'view' | 'interest' | 'document' | 'inquiry'
    data: ProjectView | ProjectInterest | DocumentAccess | ProjectInquiry
  }>): Promise<{success: number, failed: number}> {
    let success = 0
    let failed = 0

    for (const activity of activities) {
      try {
        switch (activity.type) {
          case 'view':
            await this.trackProjectView(activity.data as ProjectView)
            break
          case 'interest':
            await this.trackProjectInterest(activity.data as ProjectInterest)
            break
          case 'document':
            await this.trackDocumentAccess(activity.data as DocumentAccess)
            break
          case 'inquiry':
            await this.trackProjectInquiry(activity.data as ProjectInquiry)
            break
        }
        success++
      } catch (error) {
        console.error(`Failed to track ${activity.type} activity:`, error)
        failed++
      }
    }

    return { success, failed }
  }

  /**
   * Get engagement leaderboard
   */
  async getEngagementLeaderboard(limit: number = 50): Promise<any[]> {
    try {
      const result = await this.prisma.$queryRaw<any[]>`
        SELECT 
          u.id as user_id,
          u.first_name,
          u.last_name,
          u.email,
          mp.company_name,
          COUNT(DISTINCT mes.project_id) as active_projects,
          AVG(mes.engagement_score) as average_engagement_score,
          SUM(CASE WHEN mes.engagement_score >= 70 THEN 1 ELSE 0 END) as high_engagement_projects,
          MAX(mes.last_activity) as last_activity,
          COUNT(DISTINCT pv.project_id) as total_projects_viewed,
          COUNT(DISTINCT pda.document_id) as total_documents_downloaded
        FROM users u
        LEFT JOIN member_profiles mp ON u.id = mp.user_id
        LEFT JOIN member_engagement_scores mes ON u.id = mes.user_id
        LEFT JOIN project_views pv ON u.id = pv.user_id
        LEFT JOIN project_document_access pda ON u.id = pda.user_id
        WHERE EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = u.id AND ur.role_name = 'member')
        GROUP BY u.id, u.first_name, u.last_name, u.email, mp.company_name
        HAVING COUNT(DISTINCT mes.project_id) > 0
        ORDER BY average_engagement_score DESC, high_engagement_projects DESC
        LIMIT ${limit}
      `

      return result
    } catch (error) {
      console.error('Error getting engagement leaderboard:', error)
      return []
    }
  }

  /**
   * Generate engagement report for a date range
   */
  async generateEngagementReport(
    startDate: Date, 
    endDate: Date, 
    projectId?: string
  ): Promise<{
    totalViews: number
    uniqueMembers: number
    averageEngagementScore: number
    topProjects: Array<{projectId: string, title: string, engagementScore: number}>
    topMembers: Array<{userId: string, name: string, engagementScore: number}>
    trendsData: Array<{date: string, views: number, avgScore: number}>
  }> {
    try {
      const projectFilter = projectId ? `AND pv.project_id = '${projectId}'::uuid` : ''

      // Get summary statistics
      const summaryResult = await this.prisma.$queryRaw<any[]>`
        SELECT 
          COUNT(pv.id) as total_views,
          COUNT(DISTINCT pv.user_id) as unique_members,
          AVG(mes.engagement_score) as average_engagement_score
        FROM project_views pv
        LEFT JOIN member_engagement_scores mes ON pv.user_id = mes.user_id AND pv.project_id = mes.project_id
        WHERE pv.created_at BETWEEN ${startDate} AND ${endDate}
        ${projectFilter}
      `

      // Get top projects by engagement
      const topProjectsResult = await this.prisma.$queryRaw<any[]>`
        SELECT 
          p.id as project_id,
          p.title,
          AVG(mes.engagement_score) as engagement_score
        FROM projects p
        JOIN member_engagement_scores mes ON p.id = mes.project_id
        WHERE mes.calculated_at BETWEEN ${startDate} AND ${endDate}
        ${projectFilter}
        GROUP BY p.id, p.title
        ORDER BY engagement_score DESC
        LIMIT 10
      `

      // Get top members by engagement
      const topMembersResult = await this.prisma.$queryRaw<any[]>`
        SELECT 
          u.id as user_id,
          CONCAT(u.first_name, ' ', u.last_name) as name,
          AVG(mes.engagement_score) as engagement_score
        FROM users u
        JOIN member_engagement_scores mes ON u.id = mes.user_id
        WHERE mes.calculated_at BETWEEN ${startDate} AND ${endDate}
        ${projectFilter}
        GROUP BY u.id, u.first_name, u.last_name
        ORDER BY engagement_score DESC
        LIMIT 10
      `

      // Get trends data
      const trendsResult = await this.prisma.$queryRaw<any[]>`
        SELECT 
          DATE(pv.created_at) as date,
          COUNT(pv.id) as views,
          AVG(mes.engagement_score) as avg_score
        FROM project_views pv
        LEFT JOIN member_engagement_scores mes ON pv.user_id = mes.user_id AND pv.project_id = mes.project_id
        WHERE pv.created_at BETWEEN ${startDate} AND ${endDate}
        ${projectFilter}
        GROUP BY DATE(pv.created_at)
        ORDER BY date ASC
      `

      const summary = summaryResult[0] || { total_views: 0, unique_members: 0, average_engagement_score: 0 }

      return {
        totalViews: Number(summary.total_views),
        uniqueMembers: Number(summary.unique_members),
        averageEngagementScore: Number(summary.average_engagement_score) || 0,
        topProjects: topProjectsResult.map(p => ({
          projectId: p.project_id,
          title: p.title,
          engagementScore: Number(p.engagement_score) || 0
        })),
        topMembers: topMembersResult.map(m => ({
          userId: m.user_id,
          name: m.name,
          engagementScore: Number(m.engagement_score) || 0
        })),
        trendsData: trendsResult.map(t => ({
          date: t.date,
          views: Number(t.views),
          avgScore: Number(t.avg_score) || 0
        }))
      }
    } catch (error) {
      console.error('Error generating engagement report:', error)
      throw new Error('Failed to generate engagement report')
    }
  }

  /**
   * Clean up old engagement data (for data retention)
   */
  async cleanupOldEngagementData(daysToKeep: number = 365): Promise<{deleted: number}> {
    try {
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep)

      const result = await this.prisma.$executeRaw`
        DELETE FROM project_views 
        WHERE created_at < ${cutoffDate}
      `

      return { deleted: Number(result) }
    } catch (error) {
      console.error('Error cleaning up old engagement data:', error)
      throw new Error('Failed to cleanup old engagement data')
    }
  }

  /**
   * Close database connection
   */
  /**
   * Get all member engagement data for HubSpot sync
   */
  async getAllMemberEngagementData(): Promise<Array<{
    userId: string
    email: string
    avgEngagementScore: number
    riskLevel: string
    lastActiveDate: string
    totalViews: number
    totalDownloads: number
    totalInquiries: number
    preferredCategories: string[]
    activityStreak: number
  }>> {
    try {
      const result = await this.prisma.$queryRaw<Array<{
        userId: string
        email: string
        avgEngagementScore: number
        riskLevel: string
        lastActiveDate: string
        totalViews: number
        totalDownloads: number
        totalInquiries: number
        preferredCategories: string
        activityStreak: number
      }>>`
        WITH member_stats AS (
          SELECT 
            u.id as user_id,
            u.email,
            COALESCE(AVG(mes.engagement_score), 0) as avg_engagement_score,
            COUNT(DISTINCT pv.id) as total_views,
            COUNT(DISTINCT da.id) as total_downloads,
            COUNT(DISTINCT pi.id) as total_inquiries,
            COALESCE(MAX(pv.created_at), u.created_at) as last_active_date,
            COALESCE(u.activity_streak, 0) as activity_streak,
            STRING_AGG(DISTINCT p.category, ', ') as preferred_categories
          FROM users u
          LEFT JOIN member_engagement_scores mes ON u.id = mes.user_id
          LEFT JOIN project_views pv ON u.id = pv.user_id
          LEFT JOIN document_access da ON u.id = da.user_id AND da.access_type = 'download'
          LEFT JOIN project_inquiries pi ON u.id = pi.user_id
          LEFT JOIN projects p ON mes.project_id = p.id OR pv.project_id = p.id
          WHERE u.member_type IS NOT NULL
          GROUP BY u.id, u.email, u.activity_streak
        )
        SELECT 
          user_id as "userId",
          email,
          avg_engagement_score as "avgEngagementScore",
          CASE 
            WHEN avg_engagement_score >= 70 THEN 'low'
            WHEN avg_engagement_score >= 40 THEN 'medium'
            ELSE 'high'
          END as "riskLevel",
          last_active_date::text as "lastActiveDate",
          total_views as "totalViews",
          total_downloads as "totalDownloads",
          total_inquiries as "totalInquiries",
          COALESCE(preferred_categories, '') as "preferredCategories",
          activity_streak as "activityStreak"
        FROM member_stats
        ORDER BY avg_engagement_score DESC
      `

      return result.map(row => ({
        ...row,
        preferredCategories: row.preferredCategories ? row.preferredCategories.split(', ') : []
      }))
    } catch (error) {
      console.error('Error getting all member engagement data:', error)
      return []
    }
  }

  /**
   * Get member engagement summary for a specific user
   */
  async getMemberEngagementSummary(userId: string): Promise<{
    userId: string
    email: string
    avgEngagementScore: number
    riskLevel: string
    lastActiveDate: string
    totalViews: number
    totalDownloads: number
    totalInquiries: number
    preferredCategories: string[]
    activityStreak: number
  } | null> {
    try {
      const result = await this.prisma.$queryRaw<Array<{
        userId: string
        email: string
        avgEngagementScore: number
        riskLevel: string
        lastActiveDate: string
        totalViews: number
        totalDownloads: number
        totalInquiries: number
        preferredCategories: string
        activityStreak: number
      }>>`
        WITH member_stats AS (
          SELECT 
            u.id as user_id,
            u.email,
            COALESCE(AVG(mes.engagement_score), 0) as avg_engagement_score,
            COUNT(DISTINCT pv.id) as total_views,
            COUNT(DISTINCT da.id) as total_downloads,
            COUNT(DISTINCT pi.id) as total_inquiries,
            COALESCE(MAX(pv.created_at), u.created_at) as last_active_date,
            COALESCE(u.activity_streak, 0) as activity_streak,
            STRING_AGG(DISTINCT p.category, ', ') as preferred_categories
          FROM users u
          LEFT JOIN member_engagement_scores mes ON u.id = mes.user_id
          LEFT JOIN project_views pv ON u.id = pv.user_id
          LEFT JOIN document_access da ON u.id = da.user_id AND da.access_type = 'download'
          LEFT JOIN project_inquiries pi ON u.id = pi.user_id
          LEFT JOIN projects p ON mes.project_id = p.id OR pv.project_id = p.id
          WHERE u.id = ${userId}::uuid
          GROUP BY u.id, u.email, u.activity_streak
        )
        SELECT 
          user_id as "userId",
          email,
          avg_engagement_score as "avgEngagementScore",
          CASE 
            WHEN avg_engagement_score >= 70 THEN 'low'
            WHEN avg_engagement_score >= 40 THEN 'medium'
            ELSE 'high'
          END as "riskLevel",
          last_active_date::text as "lastActiveDate",
          total_views as "totalViews",
          total_downloads as "totalDownloads",
          total_inquiries as "totalInquiries",
          COALESCE(preferred_categories, '') as "preferredCategories",
          activity_streak as "activityStreak"
        FROM member_stats
      `

      if (result.length === 0) return null

      const row = result[0]
      return {
        ...row,
        preferredCategories: row.preferredCategories ? row.preferredCategories.split(', ') : []
      }
    } catch (error) {
      console.error('Error getting member engagement summary:', error)
      return null
    }
  }

  /**
   * Track project inquiry with enhanced data for HubSpot integration
   */
  async trackProjectInquiry(inquiryData: {
    projectId: string
    userId: string
    inquiryType: string
    message: string
    contactMethod: string
    budget?: string
    timeline?: string
  }): Promise<string> {
    try {
      await this.prisma.$executeRaw`
        INSERT INTO project_inquiries (
          project_id, user_id, inquiry_type, subject, message, 
          contact_method, budget_expectation, timeline_expectation
        ) VALUES (
          ${inquiryData.projectId}::uuid,
          ${inquiryData.userId}::uuid,
          ${inquiryData.inquiryType}::project_inquiry_type,
          'Project Inquiry',
          ${inquiryData.message},
          ${inquiryData.contactMethod},
          ${inquiryData.budget || null},
          ${inquiryData.timeline || null}
        )
      `

      // Update engagement score
      await this.updateEngagementScore(inquiryData.userId, inquiryData.projectId)

      return 'success'
    } catch (error) {
      console.error('Error tracking project inquiry:', error)
      throw new Error('Failed to track project inquiry')
    }
  }

  async disconnect(): Promise<void> {
    await this.prisma.$disconnect()
  }
}

// Export singleton instance
export const engagementTrackingService = new EngagementTrackingService()
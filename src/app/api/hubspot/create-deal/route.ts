import { NextRequest, NextResponse } from 'next/server'
import { HubSpotIntegrationService } from '@/lib/services/hubspot-integration.service'
import { EngagementTrackingService } from '@/lib/services/engagement-tracking.service'

export async function POST(request: NextRequest) {
  try {
    const {
      memberId,
      memberEmail,
      memberName,
      projectId,
      projectTitle,
      projectBudget,
      projectDeadline,
      projectCategory,
      inquiryType,
      contactMethod,
      message
    } = await request.json()

    // Validate required fields
    if (!memberId || !memberEmail || !memberName || !projectId || !projectTitle) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: memberId, memberEmail, memberName, projectId, projectTitle'
      }, { status: 400 })
    }

    const hubspotService = new HubSpotIntegrationService()
    const engagementService = new EngagementTrackingService()

    // Get member's current engagement score
    const memberEngagement = await engagementService.getMemberEngagementSummary(memberId)
    const engagementScore = memberEngagement?.avgEngagementScore || 0

    // Create deal data
    const inquiryData = {
      memberId,
      memberEmail,
      memberName,
      projectId,
      projectTitle,
      projectBudget: projectBudget || 'Not specified',
      projectDeadline: projectDeadline || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(), // Default 90 days
      projectCategory: projectCategory || 'General',
      inquiryType: inquiryType || 'inquiry' as 'view' | 'download' | 'inquiry' | 'interest',
      engagementScore,
      contactMethod,
      message
    }

    // Create HubSpot deal
    const dealId = await hubspotService.createProjectInquiryDeal(inquiryData)

    if (dealId) {
      // Track the inquiry in our engagement system
      await engagementService.trackProjectInquiry({
        projectId,
        userId: memberId,
        inquiryType: inquiryType || 'general',
        message: message || '',
        contactMethod: contactMethod || 'portal',
        budget: projectBudget,
        timeline: projectDeadline
      })

      // Sync updated engagement data to HubSpot
      if (memberEngagement) {
        await hubspotService.syncMemberEngagement({
          memberId,
          email: memberEmail,
          engagementScore: memberEngagement.avgEngagementScore,
          riskLevel: memberEngagement.riskLevel as 'low' | 'medium' | 'high',
          lastActivity: new Date().toISOString(),
          totalViews: memberEngagement.totalViews,
          totalDownloads: memberEngagement.totalDownloads,
          totalInquiries: memberEngagement.totalInquiries + 1, // Increment for this inquiry
          preferredCategories: memberEngagement.preferredCategories,
          activityStreak: memberEngagement.activityStreak
        })
      }

      await hubspotService.disconnect()
      await engagementService.disconnect()

      return NextResponse.json({
        success: true,
        data: {
          dealId,
          message: 'Project inquiry deal created successfully in HubSpot',
          projectTitle,
          memberName
        }
      })

    } else {
      await hubspotService.disconnect()
      await engagementService.disconnect()

      return NextResponse.json({
        success: false,
        error: 'Failed to create deal in HubSpot. Check integration configuration.'
      }, { status: 500 })
    }

  } catch (error) {
    console.error('Error creating HubSpot deal:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create project inquiry deal'
    }, { status: 500 })
  }
}
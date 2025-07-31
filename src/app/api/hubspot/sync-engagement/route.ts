import { NextRequest, NextResponse } from 'next/server'
import { HubSpotIntegrationService } from '@/lib/services/hubspot-integration.service'
import { EngagementTrackingService } from '@/lib/services/engagement-tracking.service'

export async function POST(request: NextRequest) {
  try {
    const { memberIds, syncAll = false } = await request.json()

    const hubspotService = new HubSpotIntegrationService()
    const engagementService = new EngagementTrackingService()

    if (syncAll) {
      // Sync all members with recent engagement activity
      const allEngagementData = await engagementService.getAllMemberEngagementData()
      
      const syncData = allEngagementData.map(data => ({
        memberId: data.userId,
        email: data.email,
        engagementScore: data.avgEngagementScore,
        riskLevel: data.riskLevel as 'low' | 'medium' | 'high',
        lastActivity: data.lastActiveDate,
        totalViews: data.totalViews,
        totalDownloads: data.totalDownloads,
        totalInquiries: data.totalInquiries,
        preferredCategories: data.preferredCategories,
        activityStreak: data.activityStreak
      }))

      const result = await hubspotService.bulkSyncEngagement(syncData)
      
      await hubspotService.disconnect()
      await engagementService.disconnect()

      return NextResponse.json({
        success: true,
        data: {
          message: 'Bulk engagement sync completed',
          totalProcessed: syncData.length,
          successful: result.success,
          failed: result.failed
        }
      })

    } else if (memberIds && Array.isArray(memberIds)) {
      // Sync specific members
      const results = []

      for (const memberId of memberIds) {
        try {
          const engagementData = await engagementService.getMemberEngagementSummary(memberId)
          
          if (engagementData) {
            const syncData = {
              memberId: engagementData.userId,
              email: engagementData.email,
              engagementScore: engagementData.avgEngagementScore,
              riskLevel: engagementData.riskLevel as 'low' | 'medium' | 'high',
              lastActivity: engagementData.lastActiveDate,
              totalViews: engagementData.totalViews,
              totalDownloads: engagementData.totalDownloads,
              totalInquiries: engagementData.totalInquiries,
              preferredCategories: engagementData.preferredCategories,
              activityStreak: engagementData.activityStreak
            }

            const success = await hubspotService.syncMemberEngagement(syncData)
            results.push({ memberId, success })
          } else {
            results.push({ memberId, success: false, error: 'Member not found' })
          }
        } catch (error) {
          results.push({ 
            memberId, 
            success: false, 
            error: error instanceof Error ? error.message : 'Unknown error' 
          })
        }
      }

      await hubspotService.disconnect()
      await engagementService.disconnect()

      const successful = results.filter(r => r.success).length
      const failed = results.filter(r => !r.success).length

      return NextResponse.json({
        success: true,
        data: {
          message: 'Member engagement sync completed',
          totalProcessed: results.length,
          successful,
          failed,
          results
        }
      })

    } else {
      return NextResponse.json({
        success: false,
        error: 'Either memberIds array or syncAll=true must be provided'
      }, { status: 400 })
    }

  } catch (error) {
    console.error('Error in HubSpot engagement sync:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to sync engagement data'
    }, { status: 500 })
  }
}

// GET endpoint to retrieve sync status
export async function GET(request: NextRequest) {
  try {
    const hubspotService = new HubSpotIntegrationService()
    
    // Get HubSpot analytics to show sync status
    const analytics = await hubspotService.getHubSpotEngagementAnalytics()
    
    await hubspotService.disconnect()

    if (analytics) {
      return NextResponse.json({
        success: true,
        data: {
          hubspotConnected: true,
          analytics
        }
      })
    } else {
      return NextResponse.json({
        success: true,
        data: {
          hubspotConnected: false,
          message: 'HubSpot integration not configured or unavailable'
        }
      })
    }

  } catch (error) {
    console.error('Error checking HubSpot sync status:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to check sync status'
    }, { status: 500 })
  }
}
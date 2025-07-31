import { NextRequest, NextResponse } from 'next/server'
import { notificationService } from '@/lib/services/notification.service'

/**
 * GET /api/notifications
 * Get notification analytics and history
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const timeRange = {
      start: new Date(searchParams.get('start') || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)),
      end: new Date(searchParams.get('end') || new Date())
    }
    
    const analytics = await notificationService.getNotificationAnalytics(timeRange)
    
    return NextResponse.json({
      success: true,
      data: analytics
    })
    
  } catch (error) {
    console.error('Error fetching notification analytics:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch notification analytics' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/notifications
 * Send notification based on template
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { templateId, context, recipientOverrides } = body
    
    if (!templateId || !context) {
      return NextResponse.json(
        { success: false, error: 'Template ID and context are required' },
        { status: 400 }
      )
    }
    
    const notificationIds = await notificationService.sendNotification(
      templateId,
      context,
      recipientOverrides
    )
    
    return NextResponse.json({
      success: true,
      data: {
        notificationIds,
        count: notificationIds.length
      },
      message: `Created ${notificationIds.length} notifications`
    })
    
  } catch (error) {
    console.error('Error sending notification:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to send notification' },
      { status: 500 }
    )
  }
}
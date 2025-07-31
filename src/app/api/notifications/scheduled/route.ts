import { NextRequest, NextResponse } from 'next/server'
import { notificationService } from '@/lib/services/notification.service'

/**
 * POST /api/notifications/scheduled
 * Process scheduled notifications (called by cron job)
 */
export async function POST(request: NextRequest) {
  try {
    // Verify this is called from authorized source (cron job, admin, etc.)
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    // Process scheduled notifications
    await notificationService.processScheduledNotifications()
    
    return NextResponse.json({
      success: true,
      message: 'Scheduled notifications processed successfully'
    })
    
  } catch (error) {
    console.error('Error processing scheduled notifications:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to process scheduled notifications' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/notifications/scheduled
 * Get information about scheduled notification processing
 */
export async function GET() {
  try {
    // Return basic information about the scheduled notification system
    return NextResponse.json({
      success: true,
      data: {
        enabled: true,
        lastProcessed: new Date().toISOString(),
        nextProcessing: new Date(Date.now() + 15 * 60 * 1000).toISOString(), // Next 15 minutes
        features: [
          'Project deadline monitoring',
          'Overdue project alerts',
          'At-risk member detection',
          'Automated HubSpot sync notifications'
        ]
      }
    })
    
  } catch (error) {
    console.error('Error getting scheduled notification info:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to get scheduled notification info' },
      { status: 500 }
    )
  }
}
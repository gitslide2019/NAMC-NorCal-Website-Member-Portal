import { NextRequest, NextResponse } from 'next/server'
import { notificationService } from '@/lib/services/notification.service'

/**
 * PUT /api/notifications/preferences
 * Update user notification preferences
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, preferences } = body
    
    if (!userId || !preferences) {
      return NextResponse.json(
        { success: false, error: 'User ID and preferences are required' },
        { status: 400 }
      )
    }
    
    const success = await notificationService.updateNotificationPreferences(userId, preferences)
    
    if (success) {
      return NextResponse.json({
        success: true,
        message: 'Notification preferences updated successfully'
      })
    } else {
      return NextResponse.json(
        { success: false, error: 'Failed to update notification preferences' },
        { status: 500 }
      )
    }
    
  } catch (error) {
    console.error('Error updating notification preferences:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update notification preferences' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/notifications/preferences/subscribe
 * Subscribe user to notification template
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, templateId, channels, conditions } = body
    
    if (!userId || !templateId || !channels) {
      return NextResponse.json(
        { success: false, error: 'User ID, template ID, and channels are required' },
        { status: 400 }
      )
    }
    
    const success = await notificationService.subscribeToNotification(
      userId,
      templateId,
      channels,
      conditions
    )
    
    if (success) {
      return NextResponse.json({
        success: true,
        message: 'Successfully subscribed to notification'
      })
    } else {
      return NextResponse.json(
        { success: false, error: 'Failed to subscribe to notification' },
        { status: 500 }
      )
    }
    
  } catch (error) {
    console.error('Error subscribing to notification:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to subscribe to notification' },
      { status: 500 }
    )
  }
}
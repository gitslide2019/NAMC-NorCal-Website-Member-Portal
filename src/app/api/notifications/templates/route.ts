import { NextRequest, NextResponse } from 'next/server'
import { notificationService } from '@/lib/services/notification.service'
// Force dynamic rendering to prevent static generation during build
export const dynamic = 'force-dynamic'


/**
 * GET /api/notifications/templates
 * Get all notification templates
 */
export async function GET() {
  try {
    // This would need to be implemented in the notification service
    // For now, return placeholder response
    return NextResponse.json({
      success: true,
      data: [],
      message: 'Templates endpoint needs implementation'
    })
    
  } catch (error) {
    console.error('Error fetching notification templates:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch notification templates' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/notifications/templates
 * Create new notification template
 */
export async function POST(request: NextRequest) {
  try {
    const template = await request.json()
    
    // Validate required fields
    if (!template.name || !template.type || !template.subject || !template.bodyTemplate) {
      return NextResponse.json(
        { success: false, error: 'Missing required template fields' },
        { status: 400 }
      )
    }
    
    const templateId = await notificationService.createNotificationTemplate(template)
    
    return NextResponse.json({
      success: true,
      data: { templateId },
      message: 'Notification template created successfully'
    })
    
  } catch (error) {
    console.error('Error creating notification template:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create notification template' },
      { status: 500 }
    )
  }
}
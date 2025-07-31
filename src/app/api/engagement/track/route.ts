import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { engagementTrackingService } from '@/lib/services/engagement-tracking.service'

/**
 * POST /api/engagement/track
 * Track member engagement activities
 */
export async function POST(request: NextRequest) {
  try {
    // Check if user is authenticated
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { type, data } = body

    if (!type || !data) {
      return NextResponse.json(
        { success: false, message: 'Type and data are required' },
        { status: 400 }
      )
    }

    // Get client information for tracking
    const userAgent = request.headers.get('user-agent') || ''
    const forwardedFor = request.headers.get('x-forwarded-for')
    const realIp = request.headers.get('x-real-ip')
    const ipAddress = forwardedFor?.split(',')[0] || realIp || '127.0.0.1'

    // Detect device type from user agent
    const isMobile = /Mobile|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)
    const isTablet = /iPad|Android(?=.*Tablet)|Tablet/i.test(userAgent)
    const deviceType = isMobile ? 'mobile' : isTablet ? 'tablet' : 'desktop'

    // Add common tracking data
    const trackingData = {
      ...data,
      userId: session.user.id,
      userAgent,
      ipAddress,
      deviceType
    }

    let result: string

    switch (type) {
      case 'view':
        result = await engagementTrackingService.trackProjectView({
          ...trackingData,
          viewDuration: data.viewDuration || 0,
          pagesViewed: data.pagesViewed || [],
          referrerSource: data.referrerSource
        })
        break

      case 'interest':
        result = await engagementTrackingService.trackProjectInterest({
          ...trackingData,
          interestLevel: data.interestLevel || 'medium',
          interestType: data.interestType,
          notes: data.notes,
          metadata: data.metadata
        })
        break

      case 'document':
        if (!data.documentId) {
          return NextResponse.json(
            { success: false, message: 'Document ID is required for document tracking' },
            { status: 400 }
          )
        }
        result = await engagementTrackingService.trackDocumentAccess({
          ...trackingData,
          documentId: data.documentId,
          accessType: data.accessType || 'view'
        })
        break

      case 'inquiry':
        if (!data.subject || !data.message) {
          return NextResponse.json(
            { success: false, message: 'Subject and message are required for inquiry tracking' },
            { status: 400 }
          )
        }
        result = await engagementTrackingService.trackProjectInquiry({
          ...trackingData,
          inquiryType: data.inquiryType || 'question',
          subject: data.subject,
          message: data.message,
          priorityLevel: data.priorityLevel || 'medium'
        })
        break

      default:
        return NextResponse.json(
          { success: false, message: 'Invalid tracking type' },
          { status: 400 }
        )
    }

    return NextResponse.json({
      success: true,
      message: `${type} tracked successfully`,
      data: { trackingId: result }
    })

  } catch (error) {
    console.error('Error tracking engagement:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to track engagement',
        error: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : String(error)) : undefined
      },
      { status: 500 }
    )
  }
}
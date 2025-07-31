import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { engagementTrackingService } from '@/lib/services/engagement-tracking.service'

/**
 * GET /api/engagement/analytics
 * Get engagement analytics and insights
 */
export async function GET(request: NextRequest) {
  try {
    // Check if user is authenticated and is admin
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if user has admin role (you'll need to implement this based on your auth system)
    // For now, we'll allow all authenticated users but you should add role checking
    // const hasAdminRole = await checkUserRole(session.user.id, 'admin')
    // if (!hasAdminRole) {
    //   return NextResponse.json(
    //     { success: false, message: 'Insufficient permissions' },
    //     { status: 403 }
    //   )
    // }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'overview'
    const projectId = searchParams.get('projectId')
    const userId = searchParams.get('userId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const limit = parseInt(searchParams.get('limit') || '10')

    let data: any

    switch (type) {
      case 'overview':
        if (projectId) {
          // Get project-specific analytics
          data = await engagementTrackingService.getProjectEngagementAnalytics(projectId)
        } else if (userId) {
          // Get member-specific engagement overview
          data = await engagementTrackingService.getMemberEngagementOverview(userId)
        } else {
          return NextResponse.json(
            { success: false, message: 'Either projectId or userId is required for overview' },
            { status: 400 }
          )
        }
        break

      case 'top-engaged':
        if (!projectId) {
          return NextResponse.json(
            { success: false, message: 'Project ID is required for top engaged members' },
            { status: 400 }
          )
        }
        data = await engagementTrackingService.getTopEngagedMembers(projectId, limit)
        break

      case 'leaderboard':
        data = await engagementTrackingService.getEngagementLeaderboard(limit)
        break

      case 'score':
        if (!userId || !projectId) {
          return NextResponse.json(
            { success: false, message: 'Both userId and projectId are required for engagement score' },
            { status: 400 }
          )
        }
        data = await engagementTrackingService.getMemberEngagementScore(userId, projectId)
        break

      case 'report':
        if (!startDate || !endDate) {
          return NextResponse.json(
            { success: false, message: 'Start date and end date are required for reports' },
            { status: 400 }
          )
        }
        
        const start = new Date(startDate)
        const end = new Date(endDate)
        
        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
          return NextResponse.json(
            { success: false, message: 'Invalid date format' },
            { status: 400 }
          )
        }

        data = await engagementTrackingService.generateEngagementReport(start, end, projectId || undefined)
        break

      default:
        return NextResponse.json(
          { success: false, message: 'Invalid analytics type' },
          { status: 400 }
        )
    }

    if (data === null) {
      return NextResponse.json(
        { success: false, message: 'No data found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data,
      metadata: {
        type,
        timestamp: new Date().toISOString(),
        projectId,
        userId,
        dateRange: startDate && endDate ? { startDate, endDate } : null
      }
    })

  } catch (error) {
    console.error('Error fetching engagement analytics:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to fetch engagement analytics',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/engagement/analytics
 * Bulk track multiple engagement activities
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
    const { activities } = body

    if (!activities || !Array.isArray(activities)) {
      return NextResponse.json(
        { success: false, message: 'Activities array is required' },
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

    // Add common tracking data to all activities
    const enrichedActivities = activities.map(activity => ({
      ...activity,
      data: {
        ...activity.data,
        userId: session.user.id,
        userAgent,
        ipAddress,
        deviceType
      }
    }))

    const result = await engagementTrackingService.bulkTrackActivities(enrichedActivities)

    return NextResponse.json({
      success: true,
      message: 'Bulk tracking completed',
      data: result
    })

  } catch (error) {
    console.error('Error bulk tracking engagement:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to bulk track engagement',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    )
  }
}
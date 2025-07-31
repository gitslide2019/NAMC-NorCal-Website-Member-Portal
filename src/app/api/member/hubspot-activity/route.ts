import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import HubSpotMemberService from '@/lib/hubspot-member-service'

/**
 * Track member activities in HubSpot automatically
 * This runs in the background as part of member services
 */

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Member authentication required' }, { status: 401 })
    }

    const { activity } = await req.json()

    if (!activity || !activity.type || !activity.details) {
      return NextResponse.json({
        error: 'Invalid activity data',
        details: 'activity.type and activity.details are required'
      }, { status: 400 })
    }

    const hubspotService = new HubSpotMemberService()
    
    // Get member data (in real app, this would come from your member database)
    const memberData = {
      id: session.user.id || 'member_' + Date.now(),
      email: session.user.email!,
      firstName: session.user.name?.split(' ')[0] || 'Member',
      lastName: session.user.name?.split(' ').slice(1).join(' ') || 'User',
      company: 'NAMC NorCal Member',
      phone: undefined,
      specialties: ['General Construction'],
      licenseNumber: undefined,
      yearsExperience: undefined,
      membershipTier: 'Gold' as const,
      membershipStatus: 'Active' as const,
      joinDate: new Date().toISOString(),
      lastLogin: new Date().toISOString(),
      serviceAreas: 'Northern California',
      website: undefined,
      certifications: []
    }

    // Track the activity in HubSpot
    await hubspotService.trackMemberActivity(memberData, {
      type: activity.type,
      details: activity.details,
      timestamp: activity.timestamp ? new Date(activity.timestamp) : new Date()
    })

    return NextResponse.json({
      success: true,
      message: 'Activity tracked in HubSpot as part of member services'
    })

  } catch (error) {
    console.error('Member activity tracking error:', error)
    return NextResponse.json({
      success: false,
      error: 'Activity tracking failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
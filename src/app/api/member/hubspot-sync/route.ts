import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
// Force dynamic rendering to prevent static generation during build
export const dynamic = 'force-dynamic'

import { authOptions } from '@/lib/auth'
import HubSpotMemberService from '@/lib/hubspot-member-service'

/**
 * Automatic HubSpot sync for NAMC members
 * This runs automatically as part of their membership service benefits
 */

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Member authentication required' }, { status: 401 })
    }

    const hubspotService = new HubSpotMemberService()
    
    // Get member data (in real app, this would come from your member database)
    const memberData = {
      id: session.user.id || 'member_' + Date.now(),
      email: session.user.email!,
      firstName: session.user.name?.split(' ')[0] || 'Member',
      lastName: session.user.name?.split(' ').slice(1).join(' ') || 'User',
      company: 'NAMC NorCal Member', // This would come from member profile
      phone: undefined, // Would come from member profile
      specialties: ['General Construction'], // Would come from member profile
      licenseNumber: undefined, // Would come from member profile
      yearsExperience: undefined, // Would come from member profile
      membershipTier: 'Gold' as const, // Would come from member database
      membershipStatus: 'Active' as const,
      joinDate: new Date().toISOString(), // Would come from member database
      lastLogin: new Date().toISOString(),
      serviceAreas: 'Northern California', // Would come from member profile
      website: undefined, // Would come from member profile
      certifications: [] // Would come from member profile
    }

    // Auto-sync member to HubSpot (runs in background)
    const syncResult = await hubspotService.autoSyncMember(memberData)

    // Track login activity
    await hubspotService.trackMemberActivity(memberData, {
      type: 'portal_login',
      details: 'Member accessed NAMC NorCal portal',
      timestamp: new Date()
    })

    return NextResponse.json({
      success: true,
      message: 'Member automatically synced to HubSpot CRM',
      data: {
        contactId: syncResult.contactId,
        isNewContact: syncResult.isNewContact,
        syncMessage: syncResult.message
      }
    })

  } catch (error) {
    console.error('Member HubSpot sync error:', error)
    return NextResponse.json({
      success: false,
      error: 'Member service sync failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Member authentication required' }, { status: 401 })
    }

    const hubspotService = new HubSpotMemberService()
    
    // Get member's HubSpot data for dashboard
    const hubspotData = await hubspotService.getMemberHubSpotData(session.user.email)

    return NextResponse.json({
      success: true,
      data: hubspotData
    })

  } catch (error) {
    console.error('Member HubSpot data fetch error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch member HubSpot data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
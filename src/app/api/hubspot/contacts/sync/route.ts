import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import HubSpotService from '@/services/hubspot.service'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { userId, properties } = await req.json()

    if (!userId || !properties) {
      return NextResponse.json({
        error: 'Missing required fields',
        details: 'userId and properties are required',
      }, { status: 400 })
    }

    const hubspotApiKey = process.env.HUBSPOT_ACCESS_TOKEN
    if (!hubspotApiKey) {
      return NextResponse.json({
        error: 'HubSpot API key not configured',
      }, { status: 500 })
    }

    const hubspotService = new HubSpotService(hubspotApiKey)
    
    // Sync contact with HubSpot
    const contact = await hubspotService.syncContact({
      id: userId,
      ...properties,
    })

    return NextResponse.json({
      success: true,
      contact,
      message: 'Contact synced successfully',
    })
  } catch (error) {
    console.error('HubSpot sync error:', error)
    return NextResponse.json({
      error: 'Failed to sync contact with HubSpot',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 })
  }
}
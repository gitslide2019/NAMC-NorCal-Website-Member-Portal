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

    const dealData = await req.json()

    const { projectId, memberId, dealName, amount, closeDate, projectType, location, budgetRange } = dealData

    if (!projectId || !memberId || !dealName || !amount || !closeDate) {
      return NextResponse.json({
        error: 'Missing required fields',
        details: 'projectId, memberId, dealName, amount, and closeDate are required',
      }, { status: 400 })
    }

    const hubspotApiKey = process.env.HUBSPOT_ACCESS_TOKEN
    if (!hubspotApiKey) {
      return NextResponse.json({
        error: 'HubSpot API key not configured',
      }, { status: 500 })
    }

    const hubspotService = new HubSpotService(hubspotApiKey)
    
    // Create deal in HubSpot
    const deal = await hubspotService.createDeal({
      projectId,
      memberId,
      dealName,
      amount,
      closeDate,
      projectType,
      location,
      budgetRange,
    })

    return NextResponse.json({
      success: true,
      deal,
      message: 'Deal created successfully',
    })
  } catch (error) {
    console.error('HubSpot deal creation error:', error)
    return NextResponse.json({
      error: 'Failed to create deal in HubSpot',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 })
  }
}
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// HubSpot API configuration
const HUBSPOT_API_KEY = process.env.HUBSPOT_ACCESS_TOKEN || process.env.HUBSPOT_API_KEY
const HUBSPOT_API_URL = 'https://api.hubapi.com'

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      )
    }

    // Try to get data from HubSpot first, fallback to database
    let opportunities: any[] = []
    let source = 'database'

    if (HUBSPOT_API_KEY) {
      try {
        const response = await fetch(`${HUBSPOT_API_URL}/crm/v3/objects/deals?properties=dealname,amount,dealstage,closedate,namc_opportunity_id,namc_opportunity_type,namc_opportunity_description,namc_opportunity_location,namc_opportunity_posted_date,namc_opportunity_contact_info,namc_opportunity_requirements,namc_opportunity_tags,namc_opportunity_latitude,namc_opportunity_longitude&limit=100`, {
          headers: {
            'Authorization': `Bearer ${HUBSPOT_API_KEY}`
          }
        })

        if (response.ok) {
          const data = await response.json()
          const deals = data.results || []

          // Transform HubSpot deals back to opportunity format
          opportunities = deals
            .filter((deal: any) => deal.properties.namc_opportunity_id) // Only NAMC opportunities
            .map((deal: any) => ({
              id: deal.properties.namc_opportunity_id,
              title: deal.properties.dealname,
              description: deal.properties.namc_opportunity_description,
              type: deal.properties.namc_opportunity_type,
              location: deal.properties.namc_opportunity_location,
              estimatedValue: parseFloat(deal.properties.amount || '0'),
              deadline: deal.properties.closedate ? new Date(deal.properties.closedate) : null,
              status: mapDealStageToStatus(deal.properties.dealstage),
              datePosted: deal.properties.namc_opportunity_posted_date ? new Date(deal.properties.namc_opportunity_posted_date) : null,
              contactInfo: deal.properties.namc_opportunity_contact_info,
              requirements: deal.properties.namc_opportunity_requirements ? JSON.parse(deal.properties.namc_opportunity_requirements) : [],
              tags: deal.properties.namc_opportunity_tags ? JSON.parse(deal.properties.namc_opportunity_tags) : [],
              latitude: deal.properties.namc_opportunity_latitude ? parseFloat(deal.properties.namc_opportunity_latitude) : null,
              longitude: deal.properties.namc_opportunity_longitude ? parseFloat(deal.properties.namc_opportunity_longitude) : null,
              hubspotDealId: deal.id
            }))

          source = 'hubspot'
        }
      } catch (hubspotError) {
        console.warn('Failed to fetch from HubSpot, falling back to database:', hubspotError)
      }
    }

    // Fallback to database if HubSpot failed or no data
    if (opportunities.length === 0) {
      const dbOpportunities = await prisma.opportunity.findMany({
        orderBy: { datePosted: 'desc' }
      })
      opportunities = dbOpportunities
      source = 'database'
    }

    return NextResponse.json({
      success: true,
      data: opportunities,
      total: opportunities.length,
      source
    })

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to get opportunities',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}

function mapDealStageToStatus(dealStage: string): string {
  const stageMap: Record<string, string> = {
    'appointmentscheduled': 'Active',
    'qualifiedtobuy': 'In Progress',
    'closedwon': 'Completed',
    'presentationscheduled': 'Under Review'
  }
  return stageMap[dealStage] || 'Active'
}
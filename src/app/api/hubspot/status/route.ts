import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]/route'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// HubSpot API configuration
const HUBSPOT_API_KEY = process.env.HUBSPOT_ACCESS_TOKEN || process.env.HUBSPOT_API_KEY
const HUBSPOT_API_URL = 'https://api.hubapi.com'

export async function GET(request: NextRequest) {
  try {
    // Check authentication and admin role
    const session = await getServerSession(authOptions)
    if (!session || session.user.memberType !== 'ADMIN') {
      return NextResponse.json(
        { success: false, message: 'Admin access required' },
        { status: 403 }
      )
    }

    if (!HUBSPOT_API_KEY) {
      return NextResponse.json({
        success: true,
        data: {
          connected: false,
          message: 'HubSpot API key not configured'
        }
      })
    }

    try {
      // Test HubSpot connection
      const testResponse = await fetch(`${HUBSPOT_API_URL}/crm/v3/objects/contacts?limit=1`, {
        headers: {
          'Authorization': `Bearer ${HUBSPOT_API_KEY}`
        }
      })

      if (!testResponse.ok) {
        throw new Error('HubSpot connection failed')
      }

      // Get counts from database
      const [opportunityCount, memberCount] = await Promise.all([
        prisma.opportunity.count(),
        prisma.user.count()
      ])

      // Get counts from HubSpot
      const [dealsResponse, contactsResponse] = await Promise.all([
        fetch(`${HUBSPOT_API_URL}/crm/v3/objects/deals?properties=namc_opportunity_id&limit=100`, {
          headers: { 'Authorization': `Bearer ${HUBSPOT_API_KEY}` }
        }),
        fetch(`${HUBSPOT_API_URL}/crm/v3/objects/contacts?properties=namc_member_id&limit=100`, {
          headers: { 'Authorization': `Bearer ${HUBSPOT_API_KEY}` }
        })
      ])

      const dealsData = await dealsResponse.json()
      const contactsData = await contactsResponse.json()

      const hubspotOpportunities = (dealsData.results || []).filter((deal: any) => deal.properties.namc_opportunity_id).length
      const hubspotMembers = (contactsData.results || []).filter((contact: any) => contact.properties.namc_member_id).length

      return NextResponse.json({
        success: true,
        data: {
          connected: true,
          database: {
            opportunities: opportunityCount,
            members: memberCount
          },
          hubspot: {
            opportunities: hubspotOpportunities,
            members: hubspotMembers
          },
          syncStatus: {
            opportunitiesInSync: opportunityCount === hubspotOpportunities,
            membersInSync: memberCount === hubspotMembers
          }
        }
      })

    } catch (error) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Failed to get HubSpot status',
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to get HubSpot status',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}
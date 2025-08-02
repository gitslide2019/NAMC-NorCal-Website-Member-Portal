import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]/route'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// HubSpot API configuration
const HUBSPOT_API_KEY = process.env.HUBSPOT_ACCESS_TOKEN || process.env.HUBSPOT_API_KEY
const HUBSPOT_API_URL = 'https://api.hubapi.com'

export async function POST(request: NextRequest) {
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
      return NextResponse.json(
        { success: false, message: 'HubSpot API key not configured' },
        { status: 400 }
      )
    }

    // Get all opportunities from database
    const opportunities = await prisma.opportunity.findMany()
    
    let synced = 0
    let errors: string[] = []

    for (const opportunity of opportunities) {
      try {
        // Map opportunity to HubSpot deal format
        const dealData = {
          properties: {
            dealname: opportunity.title,
            dealstage: mapStatusToDealStage(opportunity.status),
            amount: opportunity.estimatedValue?.toString() || '0',
            closedate: opportunity.deadline?.toISOString() || '',
            
            // NAMC custom properties
            namc_opportunity_id: opportunity.id,
            namc_opportunity_type: opportunity.type,
            namc_opportunity_description: opportunity.description || '',
            namc_opportunity_location: opportunity.location || '',
            namc_opportunity_posted_date: opportunity.datePosted.toISOString(),
            namc_opportunity_contact_info: opportunity.contactInfo || '',
            namc_opportunity_requirements: JSON.stringify(opportunity.requirements || []),
            namc_opportunity_tags: JSON.stringify(opportunity.tags || []),
            namc_opportunity_latitude: opportunity.latitude?.toString() || '',
            namc_opportunity_longitude: opportunity.longitude?.toString() || '',
            namc_opportunity_score: opportunity.score?.toString() || '0',
            namc_complexity_score: opportunity.complexityScore?.toString() || '0',
            namc_match_score: opportunity.matchScore?.toString() || '0',
            namc_claude_analysis: JSON.stringify(opportunity.claudeAnalysis || {})
          }
        }

        // Create new deal in HubSpot
        const response = await fetch(`${HUBSPOT_API_URL}/crm/v3/objects/deals`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${HUBSPOT_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(dealData)
        })

        if (response.ok) {
          synced++
        } else {
          const errorData = await response.json()
          errors.push(`${opportunity.title}: ${errorData.message}`)
        }

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 100))

      } catch (error) {
        errors.push(`${opportunity.title}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Opportunities sync completed',
      data: {
        totalOpportunities: opportunities.length,
        synced,
        errors: errors.length,
        errorDetails: errors
      }
    })

  } catch (error) {
    console.error('HubSpot sync error:', error)
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to sync opportunities',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}

function mapStatusToDealStage(status: string | null): string {
  const statusMap: Record<string, string> = {
    'Active': 'appointmentscheduled',
    'In Progress': 'qualifiedtobuy',
    'Completed': 'closedwon',
    'Under Review': 'presentationscheduled'
  }
  return statusMap[status || ''] || 'appointmentscheduled'
}
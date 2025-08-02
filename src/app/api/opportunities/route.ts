import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'
import ClaudeConstructionAssistantService from '@/lib/services/claude-construction-assistant.service'

const prisma = new PrismaClient()

// HubSpot API configuration
const HUBSPOT_API_KEY = process.env.HUBSPOT_ACCESS_TOKEN || process.env.HUBSPOT_API_KEY
const HUBSPOT_API_URL = 'https://api.hubapi.com'

export async function GET(request: Request) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '20', 10)
    const type = searchParams.get('type')
    const status = searchParams.get('status')
    const search = searchParams.get('search')
    const sortBy = searchParams.get('sortBy') || 'datePosted'
    const sortOrder = searchParams.get('sortOrder') || 'desc'

    let opportunities: any[] = []
    let total = 0
    let source = 'database'

    // Try to get data from HubSpot first
    if (HUBSPOT_API_KEY) {
      try {
        const response = await fetch(`${HUBSPOT_API_URL}/crm/v3/objects/deals?properties=dealname,amount,dealstage,closedate,namc_opportunity_id,namc_opportunity_type,namc_opportunity_description,namc_opportunity_location,namc_opportunity_posted_date,namc_opportunity_contact_info,namc_opportunity_requirements,namc_opportunity_tags,namc_opportunity_latitude,namc_opportunity_longitude,namc_opportunity_score,namc_complexity_score,namc_match_score,namc_claude_analysis&limit=100`, {
          headers: {
            'Authorization': `Bearer ${HUBSPOT_API_KEY}`
          }
        })

        if (response.ok) {
          const data = await response.json()
          let deals = (data.results || []).filter((deal: any) => deal.properties.namc_opportunity_id)

          // Transform HubSpot deals back to opportunity format
          let hubspotOpportunities = deals.map((deal: any) => ({
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
            score: deal.properties.namc_opportunity_score ? parseFloat(deal.properties.namc_opportunity_score) : null,
            complexityScore: deal.properties.namc_complexity_score ? parseFloat(deal.properties.namc_complexity_score) : null,
            matchScore: deal.properties.namc_match_score ? parseFloat(deal.properties.namc_match_score) : null,
            claudeAnalysis: deal.properties.namc_claude_analysis ? JSON.parse(deal.properties.namc_claude_analysis) : null,
            hubspotDealId: deal.id
          }))

          // Apply filters
          if (type && type !== 'all') {
            hubspotOpportunities = hubspotOpportunities.filter((opp: any) => opp.type === type)
          }
          
          if (status && status !== 'all') {
            hubspotOpportunities = hubspotOpportunities.filter((opp: any) => opp.status === status)
          }
          
          if (search) {
            hubspotOpportunities = hubspotOpportunities.filter((opp: any) => 
              opp.title?.toLowerCase().includes(search.toLowerCase()) ||
              opp.description?.toLowerCase().includes(search.toLowerCase()) ||
              opp.tags?.some((tag: string) => tag.toLowerCase().includes(search.toLowerCase()))
            )
          }

          // Sort
          hubspotOpportunities.sort((a: any, b: any) => {
            const aVal = a[sortBy]
            const bVal = b[sortBy]
            if (sortOrder === 'desc') {
              return bVal > aVal ? 1 : -1
            } else {
              return aVal > bVal ? 1 : -1
            }
          })

          // Paginate
          total = hubspotOpportunities.length
          opportunities = hubspotOpportunities.slice((page - 1) * limit, page * limit)
          source = 'hubspot'
        }
      } catch (hubspotError) {
        console.warn('Failed to fetch from HubSpot, falling back to database:', hubspotError)
      }
    }

    // Fallback to database if HubSpot failed or no data
    if (opportunities.length === 0 && source === 'database') {
      // Build where clause
      const where: any = {}
      
      if (type && type !== 'all') {
        where.type = type
      }
      
      if (status && status !== 'all') {
        where.status = status
      }
      
      if (search) {
        where.OR = [
          { title: { contains: search } },
          { description: { contains: search } },
          { tags: { contains: search } }
        ]
      }

      // Get opportunities with pagination
      const [rawOpportunities, dbTotal] = await Promise.all([
        prisma.opportunity.findMany({
          where,
          orderBy: {
            [sortBy]: sortOrder
          },
          skip: (page - 1) * limit,
          take: limit
        }),
        prisma.opportunity.count({ where })
      ])

      // Parse JSON strings back to arrays
      opportunities = rawOpportunities.map(opp => ({
        ...opp,
        requirements: opp.requirements ? JSON.parse(opp.requirements) : [],
        tags: opp.tags ? JSON.parse(opp.tags) : [],
        claudeAnalysis: opp.claudeAnalysis ? JSON.parse(opp.claudeAnalysis) : null
      }))
      
      total = dbTotal
      source = 'database'
    }

    return NextResponse.json({
      success: true,
      data: {
        opportunities,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        },
        source
      }
    })
  } catch (error) {
    console.error('Error fetching opportunities:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch opportunities',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      title,
      description,
      type,
      status,
      deadline,
      contactInfo,
      location,
      estimatedValue,
      requirements,
      tags
    } = body

    // Validate required fields
    if (!title || !description || !type) {
      return NextResponse.json(
        { error: 'Title, description, and type are required' },
        { status: 400 }
      )
    }

    // Create opportunity
    const rawOpportunity = await prisma.opportunity.create({
      data: {
        title,
        description,
        type,
        status: status || 'Active',
        datePosted: new Date(),
        deadline: deadline ? new Date(deadline) : undefined,
        contactInfo,
        location,
        estimatedValue: estimatedValue ? parseFloat(estimatedValue) : undefined,
        requirements: JSON.stringify(requirements || []),
        tags: JSON.stringify(tags || [])
      }
    })

    // Parse back to arrays for response
    const opportunity = {
      ...rawOpportunity,
      requirements: JSON.parse(rawOpportunity.requirements || '[]'),
      tags: JSON.parse(rawOpportunity.tags || '[]')
    }

    return NextResponse.json({
      success: true,
      data: opportunity,
      message: 'Opportunity created successfully'
    })
  } catch (error) {
    console.error('Error creating opportunity:', error)
    return NextResponse.json(
      { 
        error: 'Failed to create opportunity',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// Analyze opportunity with Claude AI
export async function PATCH(request: Request) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { opportunityId, action } = body

    if (action === 'analyze') {
      // Get opportunity
      const opportunity = await prisma.opportunity.findUnique({
        where: { id: opportunityId }
      })

      if (!opportunity) {
        return NextResponse.json({ error: 'Opportunity not found' }, { status: 404 })
      }

      // Analyze with Claude
      try {
        const claudeService = new ClaudeConstructionAssistantService()
        
        // Create analysis input
        const analysisInput = {
          permitNumber: `OPP-${opportunity.id}`,
          permitType: opportunity.type,
          description: opportunity.description,
          valuation: opportunity.estimatedValue ?? undefined,
          address: {
            street: '',
            city: opportunity.location || '',
            state: 'CA',
            zip: ''
          }
        }

        // Get member profile (simplified)
        const memberProfile = {
          specialties: ['General Construction'],
          serviceAreas: ['Northern California'],
          teamSize: 10
        }

        const analysis = await claudeService.analyzePermit(analysisInput, memberProfile)

        // Update opportunity with analysis
        const rawUpdatedOpportunity = await prisma.opportunity.update({
          where: { id: opportunityId },
          data: {
            claudeAnalysis: JSON.stringify(analysis),
            opportunityScore: analysis.opportunityScore,
            complexityScore: analysis.complexityScore,
            matchScore: analysis.opportunityScore // Use opportunity score as match score
          }
        })

        // Parse back for response
        const updatedOpportunity = {
          ...rawUpdatedOpportunity,
          requirements: JSON.parse(rawUpdatedOpportunity.requirements || '[]'),
          tags: JSON.parse(rawUpdatedOpportunity.tags || '[]'),
          claudeAnalysis: JSON.parse(rawUpdatedOpportunity.claudeAnalysis || 'null')
        }

        return NextResponse.json({
          success: true,
          data: updatedOpportunity,
          message: 'Opportunity analyzed successfully'
        })
      } catch (claudeError) {
        console.error('Claude analysis error:', claudeError)
        // Continue without analysis if Claude fails
        return NextResponse.json({
          success: true,
          data: opportunity,
          message: 'Opportunity retrieved (AI analysis unavailable)',
          warning: 'AI analysis failed - check Claude API configuration'
        })
      }
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Error updating opportunity:', error)
    return NextResponse.json(
      { 
        error: 'Failed to update opportunity',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
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
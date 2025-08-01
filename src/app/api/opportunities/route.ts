import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'
import ClaudeConstructionAssistantService from '@/lib/services/claude-construction-assistant.service'

const prisma = new PrismaClient()

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
    const [rawOpportunities, total] = await Promise.all([
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
    const opportunities = rawOpportunities.map(opp => ({
      ...opp,
      requirements: opp.requirements ? JSON.parse(opp.requirements) : [],
      tags: opp.tags ? JSON.parse(opp.tags) : [],
      claudeAnalysis: opp.claudeAnalysis ? JSON.parse(opp.claudeAnalysis) : null
    }))

    return NextResponse.json({
      success: true,
      data: {
        opportunities,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
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
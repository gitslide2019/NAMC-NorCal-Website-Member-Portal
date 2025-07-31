import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { constructionEstimatorService } from '@/lib/services/construction-estimator.service'
import { ConstructionProject } from '@/types/construction-project.types'

/**
 * Generate AI-powered construction estimate
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    const body = await request.json()
    const {
      projectData,
      includeTimeline = false,
      includePDF = false,
      companyInfo
    } = body
    
    // Validate required fields
    if (!projectData) {
      return NextResponse.json(
        { success: false, error: 'Project data is required' },
        { status: 400 }
      )
    }
    
    // Generate estimate
    const estimate = await constructionEstimatorService.generateEstimate(projectData)
    
    // Track the estimation request
    await constructionEstimatorService.trackEstimateInteraction(
      estimate.id,
      'viewed',
      {
        userId: session.user.id,
        projectType: projectData.category,
        requestSource: 'api'
      }
    )
    
    let response: any = {
      success: true,
      data: {
        estimate,
        generatedAt: new Date().toISOString(),
        validUntil: estimate.validUntil,
        confidence: estimate.aiAnalysis.confidence
      }
    }
    
    // Include PDF if requested
    if (includePDF && companyInfo) {
      try {
        const pdfBlob = await constructionEstimatorService.generateEstimatePDF(
          projectData as ConstructionProject,
          estimate,
          companyInfo
        )
        
        // Convert blob to base64 for JSON response
        const arrayBuffer = await pdfBlob.arrayBuffer()
        const base64 = Buffer.from(arrayBuffer).toString('base64')
        
        response.data.pdf = {
          data: base64,
          filename: `Estimate-${estimate.id}.pdf`,
          mimeType: 'application/pdf'
        }
        
        await constructionEstimatorService.trackEstimateInteraction(
          estimate.id,
          'downloaded',
          { format: 'pdf', userId: session.user.id }
        )
      } catch (pdfError) {
        console.error('Error generating PDF:', pdfError)
        response.warnings = ['PDF generation failed, but estimate was created successfully']
      }
    }
    
    return NextResponse.json(response)
    
  } catch (error) {
    console.error('Error generating estimate:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to generate estimate',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

/**
 * Get existing estimates for a project
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')
    const includeExpired = searchParams.get('includeExpired') === 'true'
    
    if (!projectId) {
      return NextResponse.json(
        { success: false, error: 'Project ID is required' },
        { status: 400 }
      )
    }
    
    // In a real implementation, this would query the database
    // For now, return mock data
    const mockEstimates = [
      {
        id: 'EST-123',
        projectId,
        version: 1,
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
        status: 'final',
        validUntil: new Date(Date.now() + 29 * 24 * 60 * 60 * 1000), // 29 days from now
        costBreakdown: {
          total: 125000,
          materials: 45000,
          labor: 38000,
          equipment: 12000,
          permits: 5000,
          overhead: 15000,
          contingency: 10000
        },
        aiAnalysis: {
          confidence: 87
        }
      }
    ]
    
    // Filter out expired estimates if requested
    const filteredEstimates = includeExpired 
      ? mockEstimates 
      : mockEstimates.filter(est => new Date(est.validUntil) > new Date())
    
    return NextResponse.json({
      success: true,
      data: filteredEstimates,
      count: filteredEstimates.length
    })
    
  } catch (error) {
    console.error('Error fetching estimates:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch estimates' },
      { status: 500 }
    )
  }
}
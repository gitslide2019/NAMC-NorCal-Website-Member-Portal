import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
// Force dynamic rendering to prevent static generation during build
export const dynamic = 'force-dynamic'

import { authOptions } from '@/lib/auth'
import { constructionEstimatorService } from '@/lib/services/construction-estimator.service'
import { ConstructionProject, ConstructionEstimate } from '@/types/construction-project.types'

/**
 * Send estimate via email with PDF attachment
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
      project,
      estimate,
      recipientEmail,
      recipientName,
      senderInfo,
      message,
      includePDF = true
    } = body
    
    // Validate required fields
    if (!project || !estimate || !recipientEmail || !recipientName || !senderInfo) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      )
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(recipientEmail)) {
      return NextResponse.json(
        { success: false, error: 'Invalid email format' },
        { status: 400 }
      )
    }
    
    // Send estimate email
    const success = await constructionEstimatorService.sendEstimateEmail(
      project as ConstructionProject,
      estimate as ConstructionEstimate,
      recipientEmail,
      recipientName,
      senderInfo
    )
    
    if (!success) {
      return NextResponse.json(
        { success: false, error: 'Failed to send estimate email' },
        { status: 500 }
      )
    }
    
    // Track the send action
    await constructionEstimatorService.trackEstimateInteraction(
      estimate.id,
      'shared',
      {
        userId: session.user.id,
        recipient: recipientEmail,
        method: 'email',
        includedPDF: includePDF
      }
    )
    
    return NextResponse.json({
      success: true,
      message: 'Estimate sent successfully',
      sentAt: new Date().toISOString(),
      recipient: {
        email: recipientEmail,
        name: recipientName
      }
    })
    
  } catch (error) {
    console.error('Error sending estimate:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to send estimate',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

/**
 * Create shareable link for estimate
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    const body = await request.json()
    const { project, estimate, maxAccess = 10, expiryDays = 7 } = body
    
    if (!project || !estimate) {
      return NextResponse.json(
        { success: false, error: 'Project and estimate data required' },
        { status: 400 }
      )
    }
    
    // Create shareable link
    const shareData = await constructionEstimatorService.createEstimateShareLink(
      project as ConstructionProject,
      estimate as ConstructionEstimate
    )
    
    // Track the share link creation
    await constructionEstimatorService.trackEstimateInteraction(
      estimate.id,
      'shared',
      {
        userId: session.user.id,
        method: 'link',
        maxAccess,
        expiryDays
      }
    )
    
    return NextResponse.json({
      success: true,
      data: {
        shareLink: shareData.link,
        expires: shareData.expires,
        maxAccess,
        createdAt: new Date().toISOString()
      }
    })
    
  } catch (error) {
    console.error('Error creating share link:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create share link' },
      { status: 500 }
    )
  }
}
import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

export async function POST(req: NextRequest) {
  try {
    const body = await req.text()
    const signature = req.headers.get('x-hubspot-signature-v3')
    
    // Verify webhook signature
    const clientSecret = process.env.HUBSPOT_CLIENT_SECRET
    if (!clientSecret) {
      return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 })
    }

    if (signature) {
      const expectedSignature = crypto
        .createHmac('sha256', clientSecret)
        .update(body)
        .digest('hex')

      if (signature !== expectedSignature) {
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
      }
    }

    const webhookData = JSON.parse(body)
    
    // Handle different webhook events
    for (const event of webhookData) {
      switch (event.eventType) {
        case 'contact.creation':
          await handleContactCreation(event)
          break
        case 'contact.propertyChange':
          await handleContactPropertyChange(event)
          break
        case 'deal.creation':
          await handleDealCreation(event)
          break
        case 'deal.propertyChange':
          await handleDealPropertyChange(event)
          break
        default:
          console.log('Unhandled event type:', event.eventType)
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Webhook processing error:', error)
    return NextResponse.json({
      error: 'Failed to process webhook',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 })
  }
}

async function handleContactCreation(event: any) {
  console.log('New contact created:', event.objectId)
  // Add your contact creation logic here
  // For example, sync with your local database
}

async function handleContactPropertyChange(event: any) {
  console.log('Contact property changed:', event.objectId, event.propertyName, event.propertyValue)
  // Add your contact update logic here
}

async function handleDealCreation(event: any) {
  console.log('New deal created:', event.objectId)
  // Add your deal creation logic here
  // For example, notify relevant team members
}

async function handleDealPropertyChange(event: any) {
  console.log('Deal property changed:', event.objectId, event.propertyName, event.propertyValue)
  // Add your deal update logic here
  // For example, update project status in your system
}
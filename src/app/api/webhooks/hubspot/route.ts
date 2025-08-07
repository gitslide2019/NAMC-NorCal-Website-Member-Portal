/**
 * HubSpot Webhook Endpoints
 * 
 * Handles real-time data synchronization from HubSpot to local database
 * Processes webhook events for contacts, deals, tasks, and custom objects
 */

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface HubSpotWebhookEvent {
  eventId: number;
  subscriptionId: number;
  portalId: number;
  appId: number;
  occurredAt: number;
  subscriptionType: string;
  attemptNumber: number;
  objectId: number;
  changeSource: string;
  changeFlag: string;
  propertyName?: string;
  propertyValue?: string;
}

interface HubSpotWebhookPayload {
  events: HubSpotWebhookEvent[];
}

/**
 * Verify HubSpot webhook signature
 */
function verifyHubSpotSignature(
  payload: string,
  signature: string,
  clientSecret: string
): boolean {
  const hash = crypto
    .createHmac('sha256', clientSecret)
    .update(payload)
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature, 'utf8'),
    Buffer.from(hash, 'utf8')
  );
}

/**
 * Process contact update events
 */
async function processContactUpdate(event: HubSpotWebhookEvent): Promise<void> {
  try {
    // Fetch updated contact data from HubSpot
    const hubspotClient = new (await import('@hubspot/api-client')).Client({
      accessToken: process.env.HUBSPOT_ACCESS_TOKEN
    });

    const contact = await hubspotClient.crm.contacts.basicApi.getById(
      event.objectId.toString(),
      [
        'email',
        'firstname',
        'lastname',
        'company',
        'phone',
        'member_portal_access',
        'onboarding_progress',
        'onboarding_step',
        'tool_reservations_count',
        'growth_plan_active',
        'cost_estimates_count',
        'shop_orders_count',
        'last_portal_activity',
        'portal_engagement_score'
      ]
    );

    // Update local database cache
    const userData = {
      email: contact.properties.email || '',
      name: `${contact.properties.firstname || ''} ${contact.properties.lastname || ''}`.trim(),
      phone: contact.properties.phone || null,
      company: contact.properties.company || null,
      lastActive: contact.properties.last_portal_activity 
        ? new Date(contact.properties.last_portal_activity)
        : new Date(),
      isActive: contact.properties.member_portal_access === 'true'
    };

    await prisma.user.upsert({
      where: { email: userData.email },
      update: userData,
      create: {
        ...userData,
        memberType: 'REGULAR'
      }
    });

    console.log(`Contact ${event.objectId} synchronized to local database`);
  } catch (error) {
    console.error(`Failed to process contact update for ${event.objectId}:`, error);
  }
}

/**
 * Process deal update events
 */
async function processDealUpdate(event: HubSpotWebhookEvent): Promise<void> {
  try {
    const hubspotClient = new (await import('@hubspot/api-client')).Client({
      accessToken: process.env.HUBSPOT_ACCESS_TOKEN
    });

    const deal = await hubspotClient.crm.deals.basicApi.getById(
      event.objectId.toString(),
      ['dealname', 'amount', 'dealstage', 'closedate', 'project_type']
    );

    // Create or update opportunity in local database
    const opportunityData = {
      title: deal.properties.dealname || 'Untitled Project',
      description: `HubSpot Deal: ${deal.properties.dealname}`,
      type: deal.properties.project_type || 'Construction',
      status: mapDealStageToStatus(deal.properties.dealstage),
      datePosted: new Date(),
      deadline: deal.properties.closedate ? new Date(deal.properties.closedate) : null,
      estimatedValue: deal.properties.amount ? parseFloat(deal.properties.amount) : null
    };

    await prisma.opportunity.upsert({
      where: { id: `hubspot-deal-${event.objectId}` },
      update: opportunityData,
      create: {
        id: `hubspot-deal-${event.objectId}`,
        ...opportunityData
      }
    });

    console.log(`Deal ${event.objectId} synchronized to local database`);
  } catch (error) {
    console.error(`Failed to process deal update for ${event.objectId}:`, error);
  }
}

/**
 * Process task update events
 */
async function processTaskUpdate(event: HubSpotWebhookEvent): Promise<void> {
  try {
    // Task synchronization would be implemented here
    // For now, we'll log the event
    console.log(`Task ${event.objectId} updated in HubSpot`);
  } catch (error) {
    console.error(`Failed to process task update for ${event.objectId}:`, error);
  }
}

/**
 * Process custom object update events
 */
async function processCustomObjectUpdate(event: HubSpotWebhookEvent): Promise<void> {
  try {
    // Custom object synchronization would be implemented here
    // This would handle tool reservations, growth plans, cost estimates, etc.
    console.log(`Custom object ${event.objectId} updated in HubSpot`);
  } catch (error) {
    console.error(`Failed to process custom object update for ${event.objectId}:`, error);
  }
}

/**
 * Map HubSpot deal stage to local opportunity status
 */
function mapDealStageToStatus(dealStage: string): string {
  const stageMap: Record<string, string> = {
    'appointmentscheduled': 'Active',
    'qualifiedtobuy': 'Active',
    'presentationscheduled': 'In Progress',
    'decisionmakerboughtin': 'In Progress',
    'contractsent': 'Under Review',
    'closedwon': 'Completed',
    'closedlost': 'Completed'
  };

  return stageMap[dealStage] || 'Active';
}

/**
 * Main webhook handler
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('x-hubspot-signature-v3');
    
    if (!signature) {
      return NextResponse.json(
        { error: 'Missing HubSpot signature' },
        { status: 401 }
      );
    }

    // Verify webhook signature
    const clientSecret = process.env.HUBSPOT_CLIENT_SECRET;
    if (!clientSecret) {
      return NextResponse.json(
        { error: 'HubSpot client secret not configured' },
        { status: 500 }
      );
    }

    if (!verifyHubSpotSignature(body, signature, clientSecret)) {
      return NextResponse.json(
        { error: 'Invalid HubSpot signature' },
        { status: 401 }
      );
    }

    const payload: HubSpotWebhookPayload = JSON.parse(body);

    // Process each event
    for (const event of payload.events) {
      try {
        switch (event.subscriptionType) {
          case 'contact.propertyChange':
          case 'contact.creation':
          case 'contact.deletion':
            await processContactUpdate(event);
            break;

          case 'deal.propertyChange':
          case 'deal.creation':
          case 'deal.deletion':
            await processDealUpdate(event);
            break;

          case 'task.propertyChange':
          case 'task.creation':
          case 'task.deletion':
            await processTaskUpdate(event);
            break;

          case 'tools.propertyChange':
          case 'tools.creation':
          case 'tool_reservations.propertyChange':
          case 'tool_reservations.creation':
          case 'growth_plans.propertyChange':
          case 'growth_plans.creation':
          case 'cost_estimates.propertyChange':
          case 'cost_estimates.creation':
          case 'camera_estimates.propertyChange':
          case 'camera_estimates.creation':
          case 'shop_orders.propertyChange':
          case 'shop_orders.creation':
            await processCustomObjectUpdate(event);
            break;

          default:
            console.log(`Unhandled webhook event type: ${event.subscriptionType}`);
        }
      } catch (eventError) {
        console.error(`Failed to process event ${event.eventId}:`, eventError);
      }
    }

    return NextResponse.json({ success: true, processed: payload.events.length });
  } catch (error) {
    console.error('HubSpot webhook processing error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

/**
 * Handle webhook verification (GET request)
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const challenge = url.searchParams.get('challenge');
  
  if (challenge) {
    return new Response(challenge, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' }
    });
  }

  return NextResponse.json({ status: 'HubSpot webhook endpoint active' });
}
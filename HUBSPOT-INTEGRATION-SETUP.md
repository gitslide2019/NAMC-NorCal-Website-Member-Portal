# HubSpot Integration Foundation Setup

This document provides comprehensive setup instructions for the HubSpot integration foundation that powers the NAMC member portal features.

## Overview

The HubSpot integration serves as the primary data repository and workflow engine for all member portal functionality, including:

- **Tool Lending Library**: Custom objects for tools and reservations
- **Interactive Onboarding**: Member progress tracking and automated workflows
- **AI-Powered Business Growth Plans**: Custom objects and milestone tracking
- **RS Means Cost API Integration**: Cost estimates and bid tracking
- **Dual-Facing Shop System**: Order management and fulfillment workflows
- **OCR Business Card Scanner**: Contact creation and networking workflows
- **Camera AI Estimates**: Real-time cost estimation data
- **Task Management**: Project task assignment and completion tracking

## Prerequisites

### HubSpot Account Requirements

1. **HubSpot Account**: Professional or Enterprise tier recommended
2. **Custom Objects**: Available in Professional tier and above
3. **Workflows**: Available in Professional tier and above
4. **API Access**: Private app with required scopes

### Required HubSpot Scopes

Your HubSpot private app must have the following scopes:

```
crm.objects.contacts.read
crm.objects.contacts.write
crm.objects.deals.read
crm.objects.deals.write
crm.objects.tasks.read
crm.objects.tasks.write
crm.objects.custom.read
crm.objects.custom.write
crm.schemas.custom.read
crm.schemas.custom.write
crm.properties.read
crm.properties.write
automation.workflows.read
automation.workflows.write
webhooks
```

## Environment Variables

Add the following environment variables to your `.env.local` file:

```bash
# HubSpot Integration
HUBSPOT_ACCESS_TOKEN=your_private_app_access_token
HUBSPOT_PORTAL_ID=your_portal_id
HUBSPOT_CLIENT_SECRET=your_app_client_secret

# Optional: HubSpot Lists
HUBSPOT_NAMC_MEMBERS_LIST_ID=your_members_list_id

# Webhook Configuration
NEXTAUTH_URL=https://your-domain.com
```

## Installation

### 1. Install Dependencies

```bash
npm install @hubspot/api-client
```

### 2. Run HubSpot Integration Setup

```bash
# Full setup (recommended for first-time setup)
npm run setup:hubspot

# Or use the API endpoint
curl -X POST http://localhost:3000/api/hubspot/setup \
  -H "Content-Type: application/json" \
  -d '{"action": "full_setup"}'
```

### 3. Verify Setup

```bash
# Check integration status
curl http://localhost:3000/api/hubspot/setup

# Run integration tests
curl -X PUT http://localhost:3000/api/hubspot/setup
```

## Custom Objects Created

The setup process creates the following custom objects in HubSpot:

### 1. Tools
- **Purpose**: Tool lending library inventory
- **Properties**: tool_name, category, daily_rate, condition, serial_number, location, is_available
- **Associations**: Contacts (members), Tool Reservations

### 2. Tool Reservations
- **Purpose**: Tool rental reservations and tracking
- **Properties**: reservation_id, start_date, end_date, status, total_cost, checkout_condition, return_condition
- **Associations**: Contacts (members), Tools

### 3. Growth Plans
- **Purpose**: AI-powered business growth planning
- **Properties**: plan_name, current_phase, progress_score, ai_analysis, roadmap_data, milestones
- **Associations**: Contacts (members), Deals (projects)

### 4. Cost Estimates
- **Purpose**: RS Means API cost estimation tracking
- **Properties**: project_name, project_type, total_estimate, rs_means_data, ai_adjustments, confidence_score, bid_submitted, bid_result
- **Associations**: Contacts (members), Deals (projects)

### 5. Camera Estimates
- **Purpose**: Gemini Live AI camera-based cost estimation
- **Properties**: session_id, scene_analysis, material_analysis, estimated_costs, confidence, media_url
- **Associations**: Contacts (members), Cost Estimates

### 6. Shop Orders
- **Purpose**: E-commerce order management
- **Properties**: order_number, total_amount, order_status, payment_status, items_data, shipping_address
- **Associations**: Contacts (members)

## Custom Properties Added

The following custom properties are added to the Contact object for member portal tracking:

- `member_portal_access`: Boolean - Portal access status
- `onboarding_progress`: Number - Onboarding completion percentage
- `onboarding_step`: String - Current onboarding step
- `tool_reservations_count`: Number - Total tool reservations
- `growth_plan_active`: Boolean - Active growth plan status
- `cost_estimates_count`: Number - Total cost estimates created
- `shop_orders_count`: Number - Total shop orders placed
- `last_portal_activity`: DateTime - Last portal activity timestamp
- `portal_engagement_score`: Number - Engagement score (0-100)

## Automated Workflows

The setup configures the following automated workflows:

### 1. NAMC Member Onboarding Workflow
- **Trigger**: member_portal_access = true
- **Actions**: Welcome email, onboarding tasks, follow-up calls

### 2. Tool Reservation Confirmation Workflow
- **Trigger**: Tool reservation created
- **Actions**: Confirmation email, staff notification, pickup reminder

### 3. Growth Plan Milestone Celebration
- **Trigger**: progress_score > 75
- **Actions**: Celebration email, engagement score update, review scheduling

### 4. Cost Estimate Follow-up Workflow
- **Trigger**: Cost estimate created
- **Actions**: Estimate ready email, bidding assistance, follow-up tasks

### 5. Shop Order Processing Workflow
- **Trigger**: Shop order created
- **Actions**: Order confirmation, processing tasks, fulfillment webhook

### 6. Member Engagement Scoring Workflow
- **Trigger**: Portal activity detected
- **Actions**: Engagement calculation, score updates

### 7. Task Assignment Notification Workflow
- **Trigger**: Task assigned to member
- **Actions**: Assignment notification, webhook triggers

### 8. Member Inactivity Re-engagement
- **Trigger**: Engagement score < 30
- **Actions**: Re-engagement emails, outreach tasks

## Webhook Configuration

The integration sets up webhook subscriptions for real-time data synchronization:

### Webhook Endpoint
```
POST https://your-domain.com/api/webhooks/hubspot
```

### Subscribed Events
- `contact.propertyChange` - Member profile updates
- `contact.creation` - New member registration
- `deal.propertyChange` - Project updates
- `deal.creation` - New project creation
- `task.propertyChange` - Task status changes
- `task.creation` - New task assignment
- Custom object events for all portal features

### Webhook Security
- Signature verification using HubSpot client secret
- Request validation and error handling
- Automatic retry logic for failed processing

## API Endpoints

### Setup and Management
- `GET /api/hubspot/setup` - Check integration status
- `POST /api/hubspot/setup` - Initialize integration components
- `PUT /api/hubspot/setup` - Test integration functionality

### Webhook Processing
- `POST /api/webhooks/hubspot` - Process HubSpot webhook events
- `GET /api/webhooks/hubspot` - Webhook verification endpoint

## Usage Examples

### Creating a Tool Reservation

```typescript
import HubSpotBackboneService from '@/lib/services/hubspot-backbone.service';

const hubspotService = new HubSpotBackboneService({
  accessToken: process.env.HUBSPOT_ACCESS_TOKEN!,
  portalId: process.env.HUBSPOT_PORTAL_ID
});

const reservation = await hubspotService.createToolReservation({
  memberId: 'contact-id',
  toolId: 'tool-object-id',
  startDate: '2024-12-01',
  endDate: '2024-12-03',
  totalCost: 150.00,
  status: 'confirmed'
});
```

### Creating a Growth Plan

```typescript
const growthPlan = await hubspotService.createGrowthPlan({
  memberId: 'contact-id',
  planName: 'Business Expansion Plan',
  currentPhase: 'assessment',
  progressScore: 25,
  aiAnalysis: { /* AI analysis data */ },
  roadmap: { /* roadmap data */ },
  milestones: [ /* milestone array */ ]
});
```

### Updating Member Portal Metrics

```typescript
await hubspotService.updateMemberPortalMetrics('contact-id', {
  toolReservationsCount: 5,
  costEstimatesCount: 12,
  shopOrdersCount: 3,
  lastPortalActivity: new Date(),
  engagementScore: 85
});
```

## Testing

### Run Integration Tests

```bash
# Run HubSpot integration tests
npx playwright test tests/hubspot-integration/

# Run specific test suite
npx playwright test tests/hubspot-integration/hubspot-backbone-integration.spec.ts
```

### Manual Testing

1. **Admin Dashboard**: Visit `/admin/integrations/hubspot`
2. **Setup Interface**: Test initialization and configuration
3. **Member Portal**: Test feature integration and data sync
4. **Webhook Processing**: Monitor webhook events in HubSpot

## Troubleshooting

### Common Issues

#### 1. Authentication Errors
```
Error: HUBSPOT_ACCESS_TOKEN not configured
```
**Solution**: Verify your private app access token is correctly set in environment variables.

#### 2. Custom Object Creation Fails
```
Error: Custom object already exists
```
**Solution**: This is expected if objects were previously created. Check the setup results for existing objects.

#### 3. Webhook Signature Verification Fails
```
Error: Invalid HubSpot signature
```
**Solution**: Ensure `HUBSPOT_CLIENT_SECRET` matches your app's client secret.

#### 4. Workflow Setup Issues
```
Error: Insufficient permissions for workflow creation
```
**Solution**: Workflows may need to be created manually in HubSpot UI. The setup provides configuration templates.

### Debug Mode

Enable debug logging by setting:
```bash
DEBUG=hubspot:*
```

### API Rate Limits

HubSpot API has rate limits:
- **Professional**: 100 requests per 10 seconds
- **Enterprise**: 150 requests per 10 seconds

The integration includes automatic retry logic and rate limiting.

## Monitoring and Maintenance

### Health Checks

Monitor integration health using:
```bash
curl http://localhost:3000/api/hubspot/setup
```

### Data Synchronization

- **Real-time**: Webhook events for immediate sync
- **Batch**: Periodic sync for data consistency
- **Manual**: Admin interface for manual sync operations

### Performance Metrics

Track integration performance:
- Webhook processing time
- API response times
- Data sync success rates
- Error rates and types

## Security Considerations

1. **API Keys**: Store securely in environment variables
2. **Webhook Security**: Always verify signatures
3. **Data Privacy**: Follow GDPR/CCPA compliance
4. **Access Control**: Limit API scopes to minimum required
5. **Audit Logging**: Log all data operations

## Support

For issues with the HubSpot integration:

1. Check the troubleshooting section above
2. Review HubSpot API documentation
3. Verify environment configuration
4. Test with minimal data sets
5. Contact HubSpot support for API-specific issues

## Changelog

### Version 1.0.0
- Initial HubSpot integration foundation
- Custom objects for all member portal features
- Automated workflows for member engagement
- Real-time webhook synchronization
- Comprehensive testing suite
/**
 * HubSpot Integration Setup Script
 * 
 * Initializes HubSpot custom objects, properties, and workflows
 * for the NAMC member portal integration
 */

const { HubSpotBackboneService } = require('../src/lib/services/hubspot-backbone.service.ts');
const { HubSpotWorkflowsService } = require('../src/lib/services/hubspot-workflows.service.ts');

async function setupHubSpotIntegration() {
  console.log('🚀 Starting HubSpot Integration Setup...\n');

  try {
    // Check for required environment variables
    const accessToken = process.env.HUBSPOT_ACCESS_TOKEN;
    const portalId = process.env.HUBSPOT_PORTAL_ID;

    if (!accessToken) {
      throw new Error('HUBSPOT_ACCESS_TOKEN environment variable is required');
    }

    console.log('✅ Environment variables validated');

    // Initialize services
    const hubspotService = new HubSpotBackboneService({
      accessToken,
      portalId
    });

    const workflowsService = new HubSpotWorkflowsService(accessToken);

    console.log('✅ HubSpot services initialized\n');

    // Step 1: Initialize custom objects
    console.log('📦 Creating custom objects...');
    const customObjectsResult = await hubspotService.initializeCustomObjects();
    
    console.log(`Custom Objects Results:`);
    customObjectsResult.results.forEach(result => {
      const status = result.status === 'created' ? '✅' : 
                    result.status === 'exists' ? '⚠️' : '❌';
      console.log(`  ${status} ${result.object}: ${result.status}`);
      if (result.error) {
        console.log(`    Error: ${result.error}`);
      }
    });
    console.log('');

    // Step 2: Configure custom properties
    console.log('🏷️  Configuring custom properties...');
    const propertiesResult = await hubspotService.configureCustomProperties();
    
    console.log(`Custom Properties Results:`);
    propertiesResult.results.forEach(result => {
      const status = result.status === 'created' ? '✅' : 
                    result.status === 'exists' ? '⚠️' : '❌';
      console.log(`  ${status} ${result.property}: ${result.status}`);
      if (result.error) {
        console.log(`    Error: ${result.error}`);
      }
    });
    console.log('');

    // Step 3: Setup workflows
    console.log('⚡ Setting up automated workflows...');
    const workflowsResult = await workflowsService.setupMemberPortalWorkflows();
    
    console.log(`Workflows Results:`);
    workflowsResult.workflows.forEach(workflow => {
      const status = workflow.status === 'configured' ? '✅' : '❌';
      console.log(`  ${status} ${workflow.name}: ${workflow.status}`);
      if (workflow.error) {
        console.log(`    Error: ${workflow.error}`);
      }
    });
    console.log('');

    // Step 4: Setup webhook subscriptions
    console.log('🔗 Setting up webhook subscriptions...');
    const webhooksResult = await workflowsService.setupWebhookSubscriptions();
    
    console.log(`Webhook Subscriptions Results:`);
    webhooksResult.subscriptions.forEach(subscription => {
      const status = subscription.status === 'configured' ? '✅' : '❌';
      console.log(`  ${status} ${subscription.type}: ${subscription.status}`);
      if (subscription.error) {
        console.log(`    Error: ${subscription.error}`);
      }
    });
    console.log('');

    // Step 5: Test the integration
    console.log('🧪 Testing integration...');
    
    try {
      // Test creating a sample tool reservation
      const testReservation = await hubspotService.createToolReservation({
        memberId: 'test-member-id',
        toolId: 'test-tool-id',
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
        totalCost: 50.00,
        status: 'pending'
      });
      
      console.log('  ✅ Tool reservation creation test passed');
      
      // Clean up test data
      await hubspotService.deleteCustomObject('tool_reservations', testReservation.id);
      console.log('  ✅ Test data cleanup completed');
      
    } catch (testError) {
      console.log('  ⚠️  Integration test failed (this is expected if test data doesn\'t exist)');
      console.log(`    ${testError.message}`);
    }

    console.log('\n🎉 HubSpot Integration Setup Complete!\n');

    // Print summary
    console.log('📊 Setup Summary:');
    console.log(`  • Custom Objects: ${customObjectsResult.results.filter(r => r.status === 'created').length} created, ${customObjectsResult.results.filter(r => r.status === 'exists').length} existing`);
    console.log(`  • Custom Properties: ${propertiesResult.results.filter(r => r.status === 'created').length} created, ${propertiesResult.results.filter(r => r.status === 'exists').length} existing`);
    console.log(`  • Workflows: ${workflowsResult.workflows.filter(w => w.status === 'configured').length} configured`);
    console.log(`  • Webhooks: ${webhooksResult.subscriptions.filter(s => s.status === 'configured').length} configured`);

    console.log('\n📝 Next Steps:');
    console.log('  1. Verify custom objects in your HubSpot portal');
    console.log('  2. Test webhook endpoint: POST /api/webhooks/hubspot');
    console.log('  3. Configure email templates for workflows');
    console.log('  4. Set up HubSpot user permissions for custom objects');
    console.log('  5. Test member portal features with real data');

  } catch (error) {
    console.error('❌ HubSpot Integration Setup Failed:', error.message);
    console.error('\n🔧 Troubleshooting:');
    console.error('  • Verify HUBSPOT_ACCESS_TOKEN is valid and has required scopes');
    console.error('  • Ensure HubSpot account has custom objects feature enabled');
    console.error('  • Check network connectivity to HubSpot API');
    console.error('  • Review HubSpot API rate limits');
    process.exit(1);
  }
}

// Run the setup if this script is executed directly
if (require.main === module) {
  setupHubSpotIntegration();
}

module.exports = { setupHubSpotIntegration };
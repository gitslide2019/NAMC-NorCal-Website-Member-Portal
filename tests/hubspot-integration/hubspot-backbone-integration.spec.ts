/**
 * HubSpot Backbone Integration Tests
 * 
 * Tests the HubSpot integration foundation including:
 * - Custom objects creation and management
 * - Custom properties configuration
 * - Workflow setup and triggers
 * - Webhook endpoints
 * - Real-time data synchronization
 */

import { test, expect } from '@playwright/test';

test.describe('HubSpot Integration Foundation', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to admin dashboard for HubSpot integration management
    await page.goto('/admin/integrations/hubspot');
  });

  test('should display HubSpot integration status', async ({ page }) => {
    // Check if HubSpot integration status is displayed
    await expect(page.locator('[data-testid="hubspot-status"]')).toBeVisible();
    
    // Verify connection status
    const statusElement = page.locator('[data-testid="hubspot-connection-status"]');
    await expect(statusElement).toBeVisible();
    
    // Check for configuration details
    await expect(page.locator('[data-testid="hubspot-portal-id"]')).toBeVisible();
    await expect(page.locator('[data-testid="hubspot-custom-objects-status"]')).toBeVisible();
  });

  test('should initialize custom objects', async ({ page }) => {
    // Click initialize custom objects button
    await page.click('[data-testid="initialize-custom-objects-btn"]');
    
    // Wait for initialization to complete
    await expect(page.locator('[data-testid="initialization-progress"]')).toBeVisible();
    await expect(page.locator('[data-testid="initialization-complete"]')).toBeVisible({ timeout: 30000 });
    
    // Verify custom objects were created
    const customObjects = [
      'tools',
      'tool_reservations',
      'growth_plans',
      'cost_estimates',
      'camera_estimates',
      'shop_orders'
    ];
    
    for (const objectType of customObjects) {
      await expect(page.locator(`[data-testid="custom-object-${objectType}"]`)).toContainText('✅');
    }
  });

  test('should configure custom properties', async ({ page }) => {
    // Click configure properties button
    await page.click('[data-testid="configure-properties-btn"]');
    
    // Wait for configuration to complete
    await expect(page.locator('[data-testid="properties-configuration-complete"]')).toBeVisible({ timeout: 30000 });
    
    // Verify member portal properties were configured
    const memberProperties = [
      'member_portal_access',
      'onboarding_progress',
      'onboarding_step',
      'tool_reservations_count',
      'growth_plan_active',
      'cost_estimates_count',
      'shop_orders_count',
      'last_portal_activity',
      'portal_engagement_score'
    ];
    
    for (const property of memberProperties) {
      await expect(page.locator(`[data-testid="property-${property}"]`)).toContainText('✅');
    }
  });

  test('should setup automated workflows', async ({ page }) => {
    // Click setup workflows button
    await page.click('[data-testid="setup-workflows-btn"]');
    
    // Wait for workflow setup to complete
    await expect(page.locator('[data-testid="workflows-setup-complete"]')).toBeVisible({ timeout: 45000 });
    
    // Verify workflows were configured
    const workflows = [
      'member-onboarding',
      'tool-reservation-confirmation',
      'growth-plan-milestone',
      'cost-estimate-followup',
      'shop-order-processing',
      'member-engagement-scoring',
      'task-assignment-notification',
      'member-inactivity-reengagement'
    ];
    
    for (const workflow of workflows) {
      await expect(page.locator(`[data-testid="workflow-${workflow}"]`)).toContainText('✅');
    }
  });

  test('should configure webhook subscriptions', async ({ page }) => {
    // Click setup webhooks button
    await page.click('[data-testid="setup-webhooks-btn"]');
    
    // Wait for webhook setup to complete
    await expect(page.locator('[data-testid="webhooks-setup-complete"]')).toBeVisible({ timeout: 30000 });
    
    // Verify webhook endpoint is configured
    await expect(page.locator('[data-testid="webhook-endpoint"]')).toContainText('/api/webhooks/hubspot');
    
    // Check webhook subscriptions
    const subscriptionTypes = [
      'contact.propertyChange',
      'deal.propertyChange',
      'task.propertyChange',
      'tools.creation',
      'tool_reservations.creation',
      'growth_plans.creation',
      'cost_estimates.creation',
      'shop_orders.creation'
    ];
    
    for (const subscriptionType of subscriptionTypes) {
      await expect(page.locator(`[data-testid="webhook-${subscriptionType.replace('.', '-')}"]`)).toContainText('✅');
    }
  });

  test('should run full integration setup', async ({ page }) => {
    // Click full setup button
    await page.click('[data-testid="full-setup-btn"]');
    
    // Wait for full setup to complete (this may take longer)
    await expect(page.locator('[data-testid="full-setup-progress"]')).toBeVisible();
    await expect(page.locator('[data-testid="full-setup-complete"]')).toBeVisible({ timeout: 120000 });
    
    // Verify all components are configured
    await expect(page.locator('[data-testid="custom-objects-status"]')).toContainText('✅');
    await expect(page.locator('[data-testid="custom-properties-status"]')).toContainText('✅');
    await expect(page.locator('[data-testid="workflows-status"]')).toContainText('✅');
    await expect(page.locator('[data-testid="webhooks-status"]')).toContainText('✅');
    
    // Check setup summary
    await expect(page.locator('[data-testid="setup-summary"]')).toBeVisible();
    await expect(page.locator('[data-testid="setup-timestamp"]')).toBeVisible();
  });

  test('should test integration functionality', async ({ page }) => {
    // Click test integration button
    await page.click('[data-testid="test-integration-btn"]');
    
    // Wait for tests to complete
    await expect(page.locator('[data-testid="integration-tests-complete"]')).toBeVisible({ timeout: 60000 });
    
    // Verify test results
    const testResults = page.locator('[data-testid="test-results"]');
    await expect(testResults).toBeVisible();
    
    // Check individual test results
    await expect(page.locator('[data-testid="test-custom-object-creation"]')).toContainText('passed');
    await expect(page.locator('[data-testid="test-property-updates"]')).toContainText('passed');
    await expect(page.locator('[data-testid="test-webhook-endpoint"]')).toContainText('configured');
    
    // Verify test summary
    await expect(page.locator('[data-testid="test-summary"]')).toContainText('tests passed');
  });

  test('should handle API errors gracefully', async ({ page }) => {
    // Simulate API error by using invalid configuration
    await page.evaluate(() => {
      // Mock fetch to return error for HubSpot API calls
      window.fetch = async (url) => {
        if (url.includes('/api/hubspot/')) {
          return new Response(JSON.stringify({ error: 'API Error' }), { 
            status: 500,
            headers: { 'Content-Type': 'application/json' }
          });
        }
        return fetch(url);
      };
    });
    
    // Try to initialize custom objects
    await page.click('[data-testid="initialize-custom-objects-btn"]');
    
    // Verify error handling
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-message"]')).toContainText('API Error');
    
    // Check that error details are displayed
    await expect(page.locator('[data-testid="error-details"]')).toBeVisible();
  });

  test('should display integration metrics', async ({ page }) => {
    // Navigate to integration metrics section
    await page.click('[data-testid="view-metrics-btn"]');
    
    // Verify metrics are displayed
    await expect(page.locator('[data-testid="integration-metrics"]')).toBeVisible();
    
    // Check key metrics
    await expect(page.locator('[data-testid="total-custom-objects"]')).toBeVisible();
    await expect(page.locator('[data-testid="total-properties"]')).toBeVisible();
    await expect(page.locator('[data-testid="active-workflows"]')).toBeVisible();
    await expect(page.locator('[data-testid="webhook-events-processed"]')).toBeVisible();
    
    // Verify sync status
    await expect(page.locator('[data-testid="last-sync-timestamp"]')).toBeVisible();
    await expect(page.locator('[data-testid="sync-status"]')).toBeVisible();
  });

  test('should allow workflow management', async ({ page }) => {
    // Navigate to workflow management
    await page.click('[data-testid="manage-workflows-btn"]');
    
    // Verify workflow list is displayed
    await expect(page.locator('[data-testid="workflows-list"]')).toBeVisible();
    
    // Test enabling/disabling a workflow
    const firstWorkflow = page.locator('[data-testid^="workflow-toggle-"]').first();
    await firstWorkflow.click();
    
    // Verify status change
    await expect(page.locator('[data-testid="workflow-status-updated"]')).toBeVisible();
    
    // Test viewing workflow details
    await page.click('[data-testid^="workflow-details-"]');
    await expect(page.locator('[data-testid="workflow-details-modal"]')).toBeVisible();
    
    // Verify workflow configuration is displayed
    await expect(page.locator('[data-testid="workflow-triggers"]')).toBeVisible();
    await expect(page.locator('[data-testid="workflow-actions"]')).toBeVisible();
  });
});

test.describe('HubSpot API Integration', () => {
  test('should handle tool reservation creation', async ({ page }) => {
    // Navigate to member portal
    await page.goto('/member/tools');
    
    // Create a tool reservation
    await page.click('[data-testid="reserve-tool-btn"]');
    await page.fill('[data-testid="start-date-input"]', '2024-12-01');
    await page.fill('[data-testid="end-date-input"]', '2024-12-03');
    await page.click('[data-testid="confirm-reservation-btn"]');
    
    // Verify reservation was created in HubSpot
    await expect(page.locator('[data-testid="reservation-confirmation"]')).toBeVisible();
    await expect(page.locator('[data-testid="hubspot-sync-status"]')).toContainText('synced');
  });

  test('should handle growth plan creation', async ({ page }) => {
    // Navigate to growth plan section
    await page.goto('/member/growth-plan');
    
    // Create a growth plan
    await page.click('[data-testid="create-growth-plan-btn"]');
    await page.fill('[data-testid="plan-name-input"]', 'Test Growth Plan');
    await page.fill('[data-testid="business-goals-input"]', 'Expand construction services');
    await page.click('[data-testid="generate-plan-btn"]');
    
    // Wait for AI generation
    await expect(page.locator('[data-testid="plan-generated"]')).toBeVisible({ timeout: 30000 });
    
    // Verify plan was synced to HubSpot
    await expect(page.locator('[data-testid="hubspot-sync-indicator"]')).toBeVisible();
  });

  test('should handle cost estimate creation', async ({ page }) => {
    // Navigate to cost estimator
    await page.goto('/member/cost-estimator');
    
    // Create a cost estimate
    await page.fill('[data-testid="project-name-input"]', 'Test Project');
    await page.selectOption('[data-testid="project-type-select"]', 'residential');
    await page.fill('[data-testid="square-footage-input"]', '2000');
    await page.click('[data-testid="generate-estimate-btn"]');
    
    // Wait for estimate generation
    await expect(page.locator('[data-testid="estimate-generated"]')).toBeVisible({ timeout: 30000 });
    
    // Verify estimate was synced to HubSpot
    await expect(page.locator('[data-testid="hubspot-deal-created"]')).toBeVisible();
  });

  test('should handle shop order creation', async ({ page }) => {
    // Navigate to shop
    await page.goto('/member/shop');
    
    // Add item to cart and checkout
    await page.click('[data-testid="add-to-cart-btn"]');
    await page.click('[data-testid="checkout-btn"]');
    await page.fill('[data-testid="shipping-address"]', '123 Test St, Test City, CA 12345');
    await page.click('[data-testid="place-order-btn"]');
    
    // Verify order was created in HubSpot
    await expect(page.locator('[data-testid="order-confirmation"]')).toBeVisible();
    await expect(page.locator('[data-testid="hubspot-order-id"]')).toBeVisible();
  });
});

test.describe('Webhook Integration', () => {
  test('should process HubSpot webhook events', async ({ page }) => {
    // This would test webhook processing in a real environment
    // For now, we'll verify the webhook endpoint exists and is configured
    
    const response = await page.request.get('/api/webhooks/hubspot');
    expect(response.status()).toBe(200);
    
    const responseBody = await response.json();
    expect(responseBody.status).toBe('HubSpot webhook endpoint active');
  });

  test('should handle contact update webhooks', async ({ page }) => {
    // Simulate a contact update webhook
    const webhookPayload = {
      events: [{
        eventId: 1,
        subscriptionId: 1,
        portalId: 12345,
        appId: 1,
        occurredAt: Date.now(),
        subscriptionType: 'contact.propertyChange',
        attemptNumber: 1,
        objectId: 12345,
        changeSource: 'CRM_UI',
        changeFlag: 'UPDATED',
        propertyName: 'member_portal_access',
        propertyValue: 'true'
      }]
    };
    
    const response = await page.request.post('/api/webhooks/hubspot', {
      data: webhookPayload,
      headers: {
        'Content-Type': 'application/json',
        'x-hubspot-signature-v3': 'test-signature'
      }
    });
    
    // Note: This would fail signature verification in a real environment
    // but tests the webhook structure
    expect(response.status()).toBe(401); // Expected due to signature verification
  });
});
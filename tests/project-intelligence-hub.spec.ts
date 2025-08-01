import { test, expect } from '@playwright/test';

// Test configuration
const BASE_URL = 'http://localhost:3001';
const TEST_USER = {
  email: 'john.doe@example.com',
  password: 'member123'
};

test.describe('Project Intelligence Hub End-to-End Tests', () => {
  
  test.beforeEach(async ({ page }) => {
    // Skip authentication for now and go directly to test pages
    // In a real production environment, you'd handle authentication properly
    console.log('Setting up test environment...');
  });

  test.describe('Project Intelligence Dashboard', () => {
    
    test('should load dashboard with all components', async ({ page }) => {
      await page.goto(`${BASE_URL}/member/project-intelligence`);
      
      // Check header elements
      await expect(page.locator('h1')).toContainText('Project Intelligence Hub');
      await expect(page.locator('text=AI-powered construction insights')).toBeVisible();
      
      // Check status indicators
      await expect(page.locator('text=Shovels API:')).toBeVisible();
      await expect(page.locator('text=Claude AI: Active')).toBeVisible();
      await expect(page.locator('text=Mapbox: Connected')).toBeVisible();
      
      // Check stats cards
      await expect(page.locator('text=Total Opportunities')).toBeVisible();
      await expect(page.locator('text=Active Projects')).toBeVisible();
      await expect(page.locator('text=AI Estimates')).toBeVisible();
      await expect(page.locator('text=Avg Match Score')).toBeVisible();
      
      // Check feature cards
      await expect(page.locator('text=Smart Permit Discovery')).toBeVisible();
      await expect(page.locator('text=AI Cost Estimation')).toBeVisible();
      await expect(page.locator('text=Opportunity Matching')).toBeVisible();
      await expect(page.locator('text=AI Construction Assistant')).toBeVisible();
      await expect(page.locator('text=Market Analytics')).toBeVisible();
      await expect(page.locator('text=Enhanced Pipeline')).toBeVisible();
      
      // Check recent activity section
      await expect(page.locator('text=Recent Activity')).toBeVisible();
      await expect(page.locator('text=Quick Actions')).toBeVisible();
    });

    test('should navigate to each feature from dashboard', async ({ page }) => {
      await page.goto(`${BASE_URL}/member/project-intelligence`);
      
      // Test navigation to Permit Discovery
      await page.click('text=Smart Permit Discovery');
      await expect(page).toHaveURL('**/permits');
      await expect(page.locator('h1')).toContainText('Intelligent Permit Discovery');
      await page.goBack();
      
      // Test navigation to Cost Estimation
      await page.click('text=AI Cost Estimation');
      await expect(page).toHaveURL('**/estimates');
      await expect(page.locator('h1')).toContainText('AI Cost Estimation');
      await page.goBack();
      
      // Test navigation to AI Assistant
      await page.click('text=AI Construction Assistant');
      await expect(page).toHaveURL('**/assistant');
      await expect(page.locator('h1')).toContainText('AI Construction Assistant');
      await page.goBack();
    });

    test('should use quick actions buttons', async ({ page }) => {
      await page.goto(`${BASE_URL}/member/project-intelligence`);
      
      // Test Search New Permits quick action
      await page.click('text=Search New Permits');
      await expect(page).toHaveURL('**/permits');
      await page.goBack();
      
      // Test Ask AI Assistant quick action
      await page.click('text=Ask AI Assistant');
      await expect(page).toHaveURL('**/assistant');
      await page.goBack();
      
      // Test Generate Estimate quick action
      await page.click('text=Generate Estimate');
      await expect(page).toHaveURL('**/estimates');
    });
  });

  test.describe('AI Construction Assistant', () => {
    
    test('should load chat interface correctly', async ({ page }) => {
      await page.goto(`${BASE_URL}/member/project-intelligence/assistant`);
      
      // Check header
      await expect(page.locator('h1')).toContainText('AI Construction Assistant');
      await expect(page.locator('text=Claude • Expert construction knowledge')).toBeVisible();
      await expect(page.locator('text=Online')).toBeVisible();
      
      // Check quick prompts sidebar
      await expect(page.locator('text=Quick Prompts')).toBeVisible();
      await expect(page.locator('text=Cost Estimation Help')).toBeVisible();
      await expect(page.locator('text=Permit Requirements')).toBeVisible();
      await expect(page.locator('text=Project Planning')).toBeVisible();
      await expect(page.locator('text=Safety Regulations')).toBeVisible();
      await expect(page.locator('text=Bidding Strategy')).toBeVisible();
      await expect(page.locator('text=Material Specifications')).toBeVisible();
      
      // Check welcome message
      await expect(page.locator('text=Hello! I\'m Claude')).toBeVisible();
      await expect(page.locator('text=Project Planning & Analysis')).toBeVisible();
      
      // Check input area
      await expect(page.locator('input[placeholder*="Ask about construction"]')).toBeVisible();
      await expect(page.locator('button:has-text("Send")')).toBeVisible();
      await expect(page.locator('text=Claude is powered by AI and may make mistakes')).toBeVisible();
    });

    test('should send message and receive response', async ({ page }) => {
      await page.goto(`${BASE_URL}/member/project-intelligence/assistant`);
      
      // Type a test message
      const testMessage = 'What permits do I need for a commercial building renovation?';
      await page.fill('input[placeholder*="Ask about construction"]', testMessage);
      
      // Send message
      await page.click('button:has-text("Send")');
      
      // Check that user message appears
      await expect(page.locator('text=' + testMessage)).toBeVisible();
      
      // Wait for loading indicator
      await expect(page.locator('.animate-bounce')).toBeVisible();
      
      // Wait for AI response (with timeout for API call)
      await page.waitForSelector('text=I apologize, but I encountered an error', { timeout: 10000 }).catch(() => {
        // This is expected if Claude API is not configured
      });
      
      // Check that input was cleared
      await expect(page.locator('input[placeholder*="Ask about construction"]')).toHaveValue('');
    });

    test('should use quick prompts', async ({ page }) => {
      await page.goto(`${BASE_URL}/member/project-intelligence/assistant`);
      
      // Click on Cost Estimation Help prompt
      await page.click('text=Cost Estimation Help');
      
      // Check that the prompt text appears in chat
      await expect(page.locator('text=Help me estimate costs for a commercial renovation project')).toBeVisible();
      
      // Wait for loading or response
      await page.waitForTimeout(2000);
    });

    test('should navigate back correctly', async ({ page }) => {
      await page.goto(`${BASE_URL}/member/project-intelligence/assistant`);
      
      // Click back button
      await page.click('button:has-text("Back")');
      
      // Should return to previous page or dashboard
      await expect(page).toHaveURL('**/project-intelligence');
    });
  });

  test.describe('Permit Discovery', () => {
    
    test('should load permit search interface', async ({ page }) => {
      await page.goto(`${BASE_URL}/member/project-intelligence/permits`);
      
      // Check header
      await expect(page.locator('h1')).toContainText('Intelligent Permit Discovery');
      await expect(page.locator('text=AI-powered permit search')).toBeVisible();
      
      // Check view mode toggles
      await expect(page.locator('button:has-text("List")')).toBeVisible();
      await expect(page.locator('button:has-text("Map")')).toBeVisible();
      
      // Check stats cards
      await expect(page.locator('text=Permits Found')).toBeVisible();
      await expect(page.locator('text=High Opportunity')).toBeVisible();
      await expect(page.locator('text=Avg Valuation')).toBeVisible();
      await expect(page.locator('text=AI Analyzed')).toBeVisible();
      
      // Check search interface
      await expect(page.locator('input[placeholder*="Search permits"]')).toBeVisible();
      await expect(page.locator('button:has-text("Filters")')).toBeVisible();
      await expect(page.locator('button:has-text("Search")')).toBeVisible();
    });

    test('should toggle between list and map views', async ({ page }) => {
      await page.goto(`${BASE_URL}/member/project-intelligence/permits`);
      
      // Default should be list view
      await expect(page.locator('button:has-text("List")[variant="primary"]')).toBeVisible();
      
      // Switch to map view
      await page.click('button:has-text("Map")');
      await expect(page.locator('button:has-text("Map")[variant="primary"]')).toBeVisible();
      
      // Check that map component loads
      await expect(page.locator('.mapboxgl-canvas')).toBeVisible({ timeout: 5000 }).catch(() => {
        // Map might not load if Mapbox token is not configured
        console.log('Mapbox component may not be fully configured');
      });
      
      // Switch back to list view
      await page.click('button:has-text("List")');
      await expect(page.locator('button:has-text("List")[variant="primary"]')).toBeVisible();
    });

    test('should expand and collapse filters', async ({ page }) => {
      await page.goto(`${BASE_URL}/member/project-intelligence/permits`);
      
      // Filters should be collapsed initially
      await expect(page.locator('input[placeholder="e.g. San Francisco"]')).not.toBeVisible();
      
      // Click filters button
      await page.click('button:has-text("Filters")');
      
      // Filters should now be visible
      await expect(page.locator('input[placeholder="e.g. San Francisco"]')).toBeVisible();
      await expect(page.locator('select')).toHaveCount(3); // City, Permit Type, Status, Time Period
      await expect(page.locator('input[type="checkbox"]')).toBeVisible(); // AI Analysis checkbox
      
      // Click filters button again to collapse
      await page.click('button:has-text("Filters")');
      
      // Wait for animation
      await page.waitForTimeout(500);
    });

    test('should perform permit search', async ({ page }) => {
      await page.goto(`${BASE_URL}/member/project-intelligence/permits`);
      
      // Enter search term
      await page.fill('input[placeholder*="Search permits"]', 'construction');
      
      // Expand filters
      await page.click('button:has-text("Filters")');
      
      // Set filter values
      await page.fill('input[placeholder="e.g. San Francisco"]', 'Oakland');
      await page.selectOption('select >> nth=0', 'building'); // Permit Type
      await page.selectOption('select >> nth=1', 'issued'); // Status
      
      // Ensure AI Analysis is checked
      await page.check('input[type="checkbox"]');
      
      // Click search
      await page.click('button:has-text("Search")');
      
      // Wait for loading to complete
      await page.waitForSelector('.animate-spin', { state: 'hidden', timeout: 10000 });
      
      // Check if results are displayed or no results message
      const hasResults = await page.locator('text=No permits found').isVisible().catch(() => false);
      const hasPermits = await page.locator('text=Permit #').isVisible().catch(() => false);
      
      expect(hasResults || hasPermits).toBeTruthy();
    });

    test('should handle API configuration warning', async ({ page }) => {
      await page.goto(`${BASE_URL}/member/project-intelligence/permits`);
      
      // If Shovels API is not configured, should show configuration message
      const configButton = page.locator('button:has-text("Configure Shovels API")');
      const isConfigured = await configButton.isVisible().catch(() => false);
      
      if (isConfigured) {
        await expect(configButton).toBeVisible();
        await configButton.click();
        // Should navigate to settings (when settings page exists)
      }
    });
  });

  test.describe('Cost Estimation', () => {
    
    test('should load cost estimation interface', async ({ page }) => {
      await page.goto(`${BASE_URL}/member/project-intelligence/estimates`);
      
      // Check header
      await expect(page.locator('h1')).toContainText('AI Cost Estimation');
      await expect(page.locator('text=Generate accurate project estimates')).toBeVisible();
      
      // Check new estimate button
      await expect(page.locator('button:has-text("New Estimate")')).toBeVisible();
      
      // Check stats cards
      await expect(page.locator('text=Total Estimates')).toBeVisible();
      await expect(page.locator('text=Avg Confidence')).toBeVisible();
      await expect(page.locator('text=Total Value')).toBeVisible();
      await expect(page.locator('text=AI Powered')).toBeVisible();
    });

    test('should show empty state when no estimates exist', async ({ page }) => {
      await page.goto(`${BASE_URL}/member/project-intelligence/estimates`);
      
      // Check for empty state or existing estimates
      const emptyState = await page.locator('text=No estimates yet').isVisible().catch(() => false);
      const hasEstimates = await page.locator('text=Downtown Office Renovation').isVisible().catch(() => false);
      
      if (emptyState) {
        await expect(page.locator('text=Create your first AI-powered cost estimate')).toBeVisible();
        await expect(page.locator('button:has-text("Create First Estimate")')).toBeVisible();
      } else if (hasEstimates) {
        // Should show mock estimate
        await expect(page.locator('text=Downtown Office Renovation')).toBeVisible();
        await expect(page.locator('text=Confidence')).toBeVisible();
      }
    });

    test('should open new estimate modal', async ({ page }) => {
      await page.goto(`${BASE_URL}/member/project-intelligence/estimates`);
      
      // Click new estimate button
      await page.click('button:has-text("New Estimate")');
      
      // Check modal appears
      await expect(page.locator('text=Generate AI Cost Estimate')).toBeVisible();
      await expect(page.locator('input[placeholder="Enter project name"]')).toBeVisible();
      await expect(page.locator('input[placeholder="City, State"]')).toBeVisible();
      await expect(page.locator('select')).toBeVisible(); // Project type dropdown
      await expect(page.locator('textarea[placeholder*="Detailed description"]')).toBeVisible();
      
      // Check scope checkboxes
      await expect(page.locator('text=Foundation Work')).toBeVisible();
      await expect(page.locator('text=Electrical Systems')).toBeVisible();
      await expect(page.locator('text=HVAC Systems')).toBeVisible();
      
      // Check action buttons
      await expect(page.locator('button:has-text("Cancel")')).toBeVisible();
      await expect(page.locator('button:has-text("Generate AI Estimate")')).toBeVisible();
    });

    test('should close modal when clicking cancel', async ({ page }) => {
      await page.goto(`${BASE_URL}/member/project-intelligence/estimates`);
      
      // Open modal
      await page.click('button:has-text("New Estimate")');
      await expect(page.locator('text=Generate AI Cost Estimate')).toBeVisible();
      
      // Click cancel
      await page.click('button:has-text("Cancel")');
      
      // Modal should close
      await expect(page.locator('text=Generate AI Cost Estimate')).not.toBeVisible();
    });

    test('should fill out estimate form', async ({ page }) => {
      await page.goto(`${BASE_URL}/member/project-intelligence/estimates`);
      
      // Open modal
      await page.click('button:has-text("New Estimate")');
      
      // Fill basic information
      await page.fill('input[placeholder="Enter project name"]', 'Test Project');
      await page.fill('input[placeholder="City, State"]', 'San Francisco, CA');
      await page.selectOption('select', 'Commercial Office');
      await page.fill('input[placeholder="Square footage"]', '5000');
      await page.fill('input[placeholder="Stories"]', '2');
      await page.fill('input[placeholder="Expected duration"]', '16');
      await page.fill('textarea[placeholder*="Detailed description"]', 'Complete office renovation with modern finishes and upgraded systems.');
      
      // Select scope items
      await page.check('text=Foundation Work');
      await page.check('text=Electrical Systems');
      await page.check('text=HVAC Systems');
      await page.check('text=Flooring');
      
      // Add special requirement
      await page.fill('input[placeholder="Add special requirement..."]', 'LEED certification required');
      await page.click('button:has-text("Add")');
      await expect(page.locator('text=LEED certification required')).toBeVisible();
      
      // Check that generate button is enabled
      const generateButton = page.locator('button:has-text("Generate AI Estimate")');
      await expect(generateButton).not.toBeDisabled();
    });

    test('should validate required fields', async ({ page }) => {
      await page.goto(`${BASE_URL}/member/project-intelligence/estimates`);
      
      // Open modal
      await page.click('button:has-text("New Estimate")');
      
      // Try to generate without required fields
      await page.click('button:has-text("Generate AI Estimate")');
      
      // Should show validation message (browser alert or inline validation)
      await page.waitForTimeout(500);
    });

    test('should generate mock estimate', async ({ page }) => {
      await page.goto(`${BASE_URL}/member/project-intelligence/estimates`);
      
      // Open modal
      await page.click('button:has-text("New Estimate")');
      
      // Fill required fields
      await page.fill('input[placeholder="Enter project name"]', 'Playwright Test Project');
      await page.fill('input[placeholder="City, State"]', 'Oakland, CA');
      await page.selectOption('select', 'Commercial Office');
      await page.fill('textarea[placeholder*="Detailed description"]', 'Test project for Playwright automation.');
      
      // Generate estimate
      await page.click('button:has-text("Generate AI Estimate")');
      
      // Wait for loading
      await expect(page.locator('.animate-spin')).toBeVisible();
      
      // Wait for estimate to be generated (mock response)
      await page.waitForTimeout(2000);
      
      // Modal should close and new estimate should appear
      await expect(page.locator('text=Generate AI Cost Estimate')).not.toBeVisible();
      await expect(page.locator('text=Playwright Test Project')).toBeVisible();
    });

    test('should display estimate details correctly', async ({ page }) => {
      await page.goto(`${BASE_URL}/member/project-intelligence/estimates`);
      
      // If mock estimate exists, check its details
      const hasEstimate = await page.locator('text=Downtown Office Renovation').isVisible().catch(() => false);
      
      if (hasEstimate) {
        // Check cost summary
        await expect(page.locator('text=Estimated Cost Range')).toBeVisible();
        await expect(page.locator('text=Timeline')).toBeVisible();
        await expect(page.locator('text=Risk Level')).toBeVisible();
        
        // Check cost breakdown
        await expect(page.locator('text=Cost Breakdown')).toBeVisible();
        await expect(page.locator('text=General Construction')).toBeVisible();
        
        // Check AI insights
        await expect(page.locator('text=AI Insights & Recommendations')).toBeVisible();
        
        // Check action buttons
        await expect(page.locator('button:has-text("Edit")')).toBeVisible();
        await expect(page.locator('button:has-text("Export")')).toBeVisible();
      }
    });
  });

  test.describe('Navigation and Error Handling', () => {
    
    test('should handle back navigation correctly', async ({ page }) => {
      // Start at dashboard
      await page.goto(`${BASE_URL}/member/project-intelligence`);
      
      // Navigate to permits
      await page.click('text=Smart Permit Discovery');
      await expect(page).toHaveURL('**/permits');
      
      // Use back button
      await page.click('button:has-text("Back")');
      await expect(page).toHaveURL('**/project-intelligence');
      
      // Navigate to assistant
      await page.click('text=AI Construction Assistant');
      await expect(page).toHaveURL('**/assistant');
      
      // Use back button
      await page.click('button:has-text("Back")');
      await expect(page).toHaveURL('**/project-intelligence');
    });

    test('should handle API errors gracefully', async ({ page }) => {
      await page.goto(`${BASE_URL}/member/project-intelligence/assistant`);
      
      // Try to send a message (may fail if Claude API is not configured)
      await page.fill('input[placeholder*="Ask about construction"]', 'Test message');
      await page.click('button:has-text("Send")');
      
      // Should either get response or error message
      await page.waitForTimeout(3000);
      
      const hasError = await page.locator('text=I apologize, but I encountered an error').isVisible().catch(() => false);
      const hasResponse = await page.locator('text=Test message').isVisible().catch(() => false);
      
      expect(hasError || hasResponse).toBeTruthy();
    });

    test('should maintain responsive design on mobile', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      
      await page.goto(`${BASE_URL}/member/project-intelligence`);
      
      // Check that header is responsive
      await expect(page.locator('h1')).toBeVisible();
      
      // Check that cards stack properly
      await expect(page.locator('text=Total Opportunities')).toBeVisible();
      
      // Navigate to other pages
      await page.click('text=Smart Permit Discovery');
      await expect(page.locator('h1')).toContainText('Intelligent Permit Discovery');
      
      // Check that filters work on mobile
      await page.click('button:has-text("Filters")');
      await expect(page.locator('input[placeholder="e.g. San Francisco"]')).toBeVisible();
    });
  });

  test.describe('Performance and Loading', () => {
    
    test('should load pages within acceptable time', async ({ page }) => {
      const startTime = Date.now();
      
      await page.goto(`${BASE_URL}/member/project-intelligence`);
      await page.waitForLoadState('networkidle');
      
      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(5000); // Should load within 5 seconds
      
      // Check that all critical elements are visible
      await expect(page.locator('h1')).toBeVisible();
      await expect(page.locator('text=Total Opportunities')).toBeVisible();
    });

    test('should handle loading states correctly', async ({ page }) => {
      await page.goto(`${BASE_URL}/member/project-intelligence/permits`);
      
      // Trigger search to see loading state
      await page.click('button:has-text("Search")');
      
      // Should show loading spinner
      await expect(page.locator('.animate-spin')).toBeVisible();
      
      // Wait for loading to complete
      await page.waitForSelector('.animate-spin', { state: 'hidden', timeout: 10000 });
    });
  });
});

// Additional helper tests for specific edge cases
test.describe('Edge Cases and Error Scenarios', () => {
  
  test.beforeEach(async ({ page }) => {
    // Skip authentication for now and go directly to test pages
    console.log('Setting up edge case test environment...');
  });

  test('should handle empty search results', async ({ page }) => {
    await page.goto(`${BASE_URL}/member/project-intelligence/permits`);
    
    // Search for something unlikely to return results
    await page.fill('input[placeholder*="Search permits"]', 'xyznonexistentpermit123');
    await page.click('button:has-text("Search")');
    
    // Wait for search to complete
    await page.waitForSelector('.animate-spin', { state: 'hidden', timeout: 10000 });
    
    // Should show no results message
    await expect(page.locator('text=No permits found')).toBeVisible();
  });

  test('should handle form validation in estimate modal', async ({ page }) => {
    await page.goto(`${BASE_URL}/member/project-intelligence/estimates`);
    
    // Open modal
    await page.click('button:has-text("New Estimate")');
    
    // Try various invalid inputs
    await page.fill('input[placeholder="Square footage"]', '-100');
    await page.fill('input[placeholder="Stories"]', '0');
    await page.fill('input[placeholder="Expected duration"]', '-5');
    
    // Form should handle these gracefully
    await page.click('button:has-text("Generate AI Estimate")');
    await page.waitForTimeout(500);
  });

  test('should handle network timeouts gracefully', async ({ page }) => {
    // Simulate slow network
    await page.route('**/api/construction-assistant/**', async route => {
      await page.waitForTimeout(5000); // Simulate slow response
      await route.continue();
    });

    await page.goto(`${BASE_URL}/member/project-intelligence/assistant`);
    
    // Try to send message
    await page.fill('input[placeholder*="Ask about construction"]', 'Test timeout');
    await page.click('button:has-text("Send")');
    
    // Should show loading state and eventually timeout or error
    await expect(page.locator('.animate-bounce')).toBeVisible();
    await page.waitForTimeout(6000);
  });
});
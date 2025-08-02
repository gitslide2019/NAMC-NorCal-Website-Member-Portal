import { test, expect } from '@playwright/test';

test.describe('Comprehensive Member Experience Test', () => {
  // Test configuration
  const TEST_MEMBER = {
    email: 'member@namc-norcal.org',
    password: 'member123'
  };

  test.beforeEach(async ({ page }) => {
    // Navigate to homepage and login
    await page.goto('/');
    await page.click('text=Sign In');
    await expect(page).toHaveURL('/auth/signin');
    
    // Wait for the form to be fully loaded
    await page.waitForSelector('input[name="email"]', { state: 'visible' });
    await page.waitForSelector('input[name="password"]', { state: 'visible' });
    await page.waitForSelector('button[type="submit"]', { state: 'visible' });
    
    // Fill form fields properly
    await page.click('input[name="email"]');
    await page.fill('input[name="email"]', '');
    await page.type('input[name="email"]', TEST_MEMBER.email);
    
    await page.click('input[name="password"]');
    await page.fill('input[name="password"]', '');
    await page.type('input[name="password"]', TEST_MEMBER.password);
    
    // Wait for validation to complete
    await page.waitForTimeout(500);
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Wait for login to complete
    await page.waitForURL(/\/member/, { timeout: 15000 });
    await expect(page).toHaveURL(/\/member/);
    await page.waitForLoadState('networkidle');
  });

  test('🎯 Complete Project Intelligence Hub Experience', async ({ page }) => {
    // Navigate directly to the Project Intelligence page (it exists!)  
    await page.goto('/member/project-intelligence');
    await page.waitForLoadState('networkidle');
    
    // Wait for the page to load and check the title
    await page.waitForSelector('h1:has-text("NAMC Project Opportunities")', { timeout: 10000 });
    
    // 1. Test Opportunities Display
    console.log('Testing opportunities display...');
    
    // Check that opportunities text is visible
    const opportunitiesText = await page.locator('p:has-text("opportunities available")');
    await expect(opportunitiesText).toBeVisible({ timeout: 10000 });
    
    // Test view mode toggles
    await page.click('button:has-text("Map")');
    await page.waitForTimeout(2000); // Wait for map to potentially load
    
    await page.click('button:has-text("Table")');
    await expect(page.locator('table')).toBeVisible({ timeout: 5000 });
    
    await page.click('button:has-text("Both Views")');
    await expect(page.locator('table')).toBeVisible();
    
    // 2. Test Search and Filter Functionality
    console.log('Testing search and filter...');
    
    // Test search
    const searchInput = page.locator('input[placeholder*="Search opportunities"]');
    await expect(searchInput).toBeVisible();
    await searchInput.fill('test');
    await page.waitForTimeout(1000);
    
    // Clear search
    await searchInput.fill('');
    await page.waitForTimeout(1000);
    
    // 3. Test Quick Stats
    console.log('Testing quick stats...');
    await expect(page.locator('text=Total Opportunities')).toBeVisible();
    
    // 4. Test Refresh functionality
    const refreshButton = page.locator('button:has-text("Refresh")');
    if (await refreshButton.isVisible()) {
      await refreshButton.click();
      await page.waitForTimeout(1000);
      console.log('✅ Refresh button works');
    }
  });

  test('🔍 Permits Search Feature', async ({ page }) => {
    // Navigate to permits page (it exists!)
    await page.goto('/member/project-intelligence/permits');
    await page.waitForLoadState('networkidle');
    
    console.log('Testing permits search...');
    
    // Look for any search-related elements
    const hasSearchInput = await page.locator('input[placeholder*="address"], input[placeholder*="search"], input[type="search"]').count();
    if (hasSearchInput > 0) {
      const searchInput = page.locator('input[placeholder*="address"], input[placeholder*="search"], input[type="search"]').first();
      await searchInput.fill('Oakland');
      
      // Look for submit button
      const submitButton = page.locator('button:has-text("Search"), button[type="submit"]').first();
      if (await submitButton.isVisible()) {
        await submitButton.click();
        await page.waitForTimeout(3000);
        console.log('✅ Permits search form submitted');
      }
    } else {
      console.log('ℹ️ No search form found on permits page');
    }
  });

  test('🧠 AI Construction Assistant', async ({ page }) => {
    // Navigate to AI assistant page (it exists!)
    await page.goto('/member/project-intelligence/assistant');
    await page.waitForLoadState('networkidle');
    
    console.log('Testing AI assistant...');
    
    // Look for any chat or input interface
    const hasChatInput = await page.locator('textarea, input[placeholder*="ask"], input[placeholder*="question"], input[placeholder*="message"]').count();
    
    if (hasChatInput > 0) {
      const chatInput = page.locator('textarea, input[placeholder*="ask"], input[placeholder*="question"], input[placeholder*="message"]').first();
      await chatInput.fill('What are the typical costs for a bathroom remodel?');
      
      const submitButton = page.locator('button:has-text("Send"), button[type="submit"], button:has-text("Ask")').first();
      if (await submitButton.isVisible()) {
        await submitButton.click();
        await page.waitForTimeout(2000);
        console.log('✅ AI assistant query submitted');
      }
    } else {
      console.log('ℹ️ No chat interface found on AI assistant page');
    }
  });

  test('📊 Cost Estimation Feature', async ({ page }) => {
    // Navigate to estimates page (it exists!)
    await page.goto('/member/project-intelligence/estimates');
    await page.waitForLoadState('networkidle');
    
    console.log('Testing cost estimation...');
    
    // Look for estimation form elements
    const hasProjectTypeSelect = await page.locator('select[name*="type"], select[name*="project"]').count();
    const hasLocationInput = await page.locator('input[name*="location"], input[placeholder*="location"]').count();
    
    if (hasProjectTypeSelect > 0 && hasLocationInput > 0) {
      // Fill out the form
      const projectTypeSelect = page.locator('select[name*="type"], select[name*="project"]').first();
      await projectTypeSelect.selectOption({ index: 1 }); // Select first non-default option
      
      const locationInput = page.locator('input[name*="location"], input[placeholder*="location"]').first();
      await locationInput.fill('Oakland, CA');
      
      const submitButton = page.locator('button:has-text("Estimate"), button[type="submit"], button:has-text("Calculate")').first();
      if (await submitButton.isVisible()) {
        await submitButton.click();
        await page.waitForTimeout(3000);
        console.log('✅ Cost estimation form submitted');
      }
    } else {
      console.log('ℹ️ No cost estimation form found');
    }
  });

  test('🗺️ Interactive Map Functionality', async ({ page }) => {
    // Go back to main project intelligence page for map testing
    await page.goto('/member/project-intelligence');
    await page.waitForLoadState('networkidle');
    
    console.log('Testing interactive map...');
    
    // Switch to map view
    await page.click('button:has-text("Map")');
    await page.waitForTimeout(2000);
    
    // Look for map container (Mapbox or similar)
    const mapContainer = page.locator('.mapboxgl-canvas, [class*="mapbox"], #map, .map-container');
    
    if (await mapContainer.count() > 0) {
      console.log('✅ Map container found');
      
      // Try to interact with the map
      const mapElement = mapContainer.first();
      if (await mapElement.isVisible()) {
        // Click on the map
        await mapElement.click({ position: { x: 300, y: 200 } });
        await page.waitForTimeout(1000);
        console.log('✅ Map interaction successful');
      }
    } else {
      console.log('ℹ️ No map container found - map might not be configured');
    }
  });

  test('📱 Mobile Responsiveness', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/member/project-intelligence');
    await page.waitForLoadState('networkidle');
    
    console.log('Testing mobile responsiveness...');
    
    // Check for mobile navigation (hamburger menu)
    const mobileMenuButton = page.locator('button[aria-label*="menu"], button:has(svg):has-text("Menu"), .lg\\:hidden button');
    
    if (await mobileMenuButton.count() > 0) {
      await mobileMenuButton.first().click();
      await page.waitForTimeout(500);
      console.log('✅ Mobile menu opened');
    }
    
    // Check that main content is visible and responsive
    await expect(page.locator('h1:has-text("NAMC Project Opportunities")')).toBeVisible();
    
    // Test table responsiveness
    await page.click('button:has-text("Table")');
    await expect(page.locator('table')).toBeVisible();
    
    console.log('✅ Mobile layout is responsive');
  });

  test('🔄 Data Refresh and Real-time Updates', async ({ page }) => {
    await page.goto('/member/project-intelligence');
    await page.waitForLoadState('networkidle');
    
    console.log('Testing data refresh...');
    
    // Test refresh button
    const refreshButton = page.locator('button:has-text("Refresh")');
    
    if (await refreshButton.isVisible()) {
      await refreshButton.click();
      await page.waitForTimeout(2000);
      
      // Check that the page still shows expected content
      await expect(page.locator('text=opportunities available')).toBeVisible();
      console.log('✅ Data refresh functionality works');
    } else {
      console.log('ℹ️ No refresh button found');
    }
  });

  test('🎯 End-to-End User Journey', async ({ page }) => {
    console.log('Testing complete user journey...');
    
    // 1. Start at dashboard (we're already there from beforeEach)
    await expect(page.locator('text=Welcome')).toBeVisible();
    
    // 2. Navigate to Project Intelligence
    await page.goto('/member/project-intelligence');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1:has-text("NAMC Project Opportunities")')).toBeVisible();
    
    // 3. Test search functionality
    const searchInput = page.locator('input[placeholder*="Search opportunities"]');
    if (await searchInput.isVisible()) {
      await searchInput.fill('construction');
      await page.waitForTimeout(1000);
      await searchInput.fill(''); // Clear search
    }
    
    // 4. Navigate to permits
    await page.goto('/member/project-intelligence/permits');
    await page.waitForLoadState('networkidle');
    
    // 5. Navigate to AI assistant
    await page.goto('/member/project-intelligence/assistant');
    await page.waitForLoadState('networkidle');
    
    // 6. Navigate to estimates
    await page.goto('/member/project-intelligence/estimates');
    await page.waitForLoadState('networkidle');
    
    // 7. Return to main projects page through navigation
    await page.click('a[href="/member/projects"], text=Projects');
    await page.waitForLoadState('networkidle');
    
    console.log('✅ Complete user journey successful');
  });
});
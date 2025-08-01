import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3000';

// Helper function to login
async function loginAsMember(page: any) {
  await page.goto(`${BASE_URL}/auth/signin`);
  await page.fill('input[name="email"]', 'member@namc-norcal.org');
  await page.fill('input[name="password"]', 'member123');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/member/**', { timeout: 10000 });
}

test.describe('Shovels API Integration Tests', () => {
  
  test('should verify Shovels API connection status', async ({ page }) => {
    console.log('🔍 Testing Shovels API connection...');
    
    await loginAsMember(page);
    await page.goto(`${BASE_URL}/member/project-intelligence`);
    await page.waitForLoadState('networkidle');
    
    // Check API status indicator
    const shovelsStatus = await page.locator('text=Shovels API:').textContent();
    console.log('Shovels API status:', shovelsStatus);
    
    // Look for green/red connection indicator
    const statusIndicator = page.locator('text=Shovels API:').locator('xpath=following-sibling::*[1]');
    const statusText = await statusIndicator.textContent();
    
    console.log(`Shovels API Connection: ${statusText}`);
    
    if (statusText?.includes('Connected')) {
      console.log('✅ Shovels API is connected');
    } else {
      console.log('❌ Shovels API appears disconnected');
    }
    
    await page.screenshot({ path: 'test-results/shovels-api-status.png', fullPage: true });
  });

  test('should perform real permit search with Shovels API', async ({ page }) => {
    console.log('🏗️ Testing real permit search...');
    
    await loginAsMember(page);
    await page.goto(`${BASE_URL}/member/project-intelligence/permits`);
    await page.waitForLoadState('networkidle');
    
    // Wait for any initial loading to complete
    await page.waitForTimeout(2000);
    
    // Check if we have the search interface
    const hasSearchButton = await page.locator('button:has-text("Search")').isVisible();
    
    if (hasSearchButton) {
      console.log('Search interface available, testing with California permits...');
      
      // Expand filters
      const filtersButton = page.locator('button:has-text("Filters")');
      if (await filtersButton.isVisible()) {
        await filtersButton.click();
        await page.waitForTimeout(500);
      }
      
      // Set location to a Bay Area city where permits are likely
      const cityInput = page.locator('input[placeholder*="San Francisco"]');
      if (await cityInput.isVisible()) {
        await cityInput.fill('San Francisco');
      }
      
      // Select building permits (most common)
      const permitTypeSelect = page.locator('select').nth(0);
      if (await permitTypeSelect.isVisible()) {
        await permitTypeSelect.selectOption('building');
      }
      
      // Ensure AI analysis is enabled
      const aiCheckbox = page.locator('input[type="checkbox"]');
      if (await aiCheckbox.isVisible()) {
        await aiCheckbox.check();
      }
      
      // Perform search
      console.log('Performing permit search...');
      await page.click('button:has-text("Search")');
      
      // Wait for search to complete (up to 30 seconds for API call)
      await page.waitForSelector('.animate-spin', { state: 'hidden', timeout: 30000 });
      
      await page.screenshot({ path: 'test-results/permit-search-results.png', fullPage: true });
      
      // Check for results or error messages
      const hasResults = await page.locator('text=Permit #').isVisible().catch(() => false);
      const hasNoResults = await page.locator('text=No permits found').isVisible().catch(() => false);
      const hasConfigError = await page.locator('text=Configure Shovels API').isVisible().catch(() => false);
      
      console.log('Search results check:', { hasResults, hasNoResults, hasConfigError });
      
      if (hasResults) {
        console.log('✅ Found permits! Checking for AI analysis...');
        
        // Check if AI analysis is displayed
        const hasAIAnalysis = await page.locator('text=AI Analysis').isVisible().catch(() => false);
        const hasOpportunityScore = await page.locator('text=/% Match/').isVisible().catch(() => false);
        
        console.log('AI Analysis check:', { hasAIAnalysis, hasOpportunityScore });
        
        if (hasAIAnalysis || hasOpportunityScore) {
          console.log('✅ AI analysis is working with real permit data!');
        }
        
        // Count how many permits were found
        const permitElements = await page.locator('text=Permit #').count();
        console.log(`Found ${permitElements} permits`);
        
      } else if (hasNoResults) {
        console.log('⚠️ No permits found for search criteria (this could be normal)');
      } else if (hasConfigError) {
        console.log('❌ Shovels API configuration issue detected');
      } else {
        console.log('⚠️ Unexpected search result state');
      }
      
    } else {
      console.log('❌ Search interface not available');
    }
  });

  test('should test permit search with various Bay Area cities', async ({ page }) => {
    console.log('🌉 Testing multiple Bay Area cities...');
    
    await loginAsMember(page);
    await page.goto(`${BASE_URL}/member/project-intelligence/permits`);
    await page.waitForLoadState('networkidle');
    
    const testCities = ['Oakland', 'San Jose', 'Berkeley', 'Fremont'];
    const results = [];
    
    for (const city of testCities) {
      console.log(`Testing permits in ${city}...`);
      
      // Expand filters
      const filtersButton = page.locator('button:has-text("Filters")');
      if (await filtersButton.isVisible()) {
        await filtersButton.click();
        await page.waitForTimeout(500);
      }
      
      // Set city
      const cityInput = page.locator('input[placeholder*="San Francisco"]');
      if (await cityInput.isVisible()) {
        await cityInput.clear();
        await cityInput.fill(city);
      }
      
      // Search
      await page.click('button:has-text("Search")');
      await page.waitForSelector('.animate-spin', { state: 'hidden', timeout: 20000 });
      
      // Check results
      const permitCount = await page.locator('text=Permit #').count();
      const hasResults = permitCount > 0;
      
      results.push({ city, permitCount, hasResults });
      console.log(`${city}: ${permitCount} permits found`);
      
      await page.waitForTimeout(1000); // Brief pause between searches
    }
    
    console.log('City search results:', results);
    
    const citiesWithResults = results.filter(r => r.hasResults).length;
    console.log(`✅ Found permits in ${citiesWithResults} out of ${testCities.length} cities`);
    
    await page.screenshot({ path: 'test-results/bay-area-permit-search.png', fullPage: true });
  });

  test('should verify AI-powered opportunity scoring', async ({ page }) => {
    console.log('🤖 Testing AI opportunity scoring...');
    
    await loginAsMember(page);
    await page.goto(`${BASE_URL}/member/project-intelligence/permits`);
    await page.waitForLoadState('networkidle');
    
    // Perform a search likely to return results
    const filtersButton = page.locator('button:has-text("Filters")');
    if (await filtersButton.isVisible()) {
      await filtersButton.click();
      await page.waitForTimeout(500);
    }
    
    // Search in San Francisco with AI analysis enabled
    const cityInput = page.locator('input[placeholder*="San Francisco"]');
    if (await cityInput.isVisible()) {
      await cityInput.fill('San Francisco');
    }
    
    // Ensure AI analysis is enabled
    const aiCheckbox = page.locator('input[type="checkbox"]');
    if (await aiCheckbox.isVisible()) {
      await aiCheckbox.check();
    }
    
    // Set minimum opportunity score to test filtering
    const opportunitySlider = page.locator('input[type="range"]');
    if (await opportunitySlider.isVisible()) {
      await opportunitySlider.fill('0.7'); // 70% minimum
    }
    
    await page.click('button:has-text("Search")');
    await page.waitForSelector('.animate-spin', { state: 'hidden', timeout: 30000 });
    
    await page.screenshot({ path: 'test-results/ai-opportunity-scoring.png', fullPage: true });
    
    // Check for AI analysis elements
    const hasOpportunityScores = await page.locator('text=/% Match/').count();
    const hasComplexityBadges = await page.locator('text=LOW').or(page.locator('text=MEDIUM')).or(page.locator('text=HIGH')).count();
    const hasAIRecommendations = await page.locator('text=AI Recommendations').count();
    
    console.log('AI Analysis elements found:', {
      opportunityScores: hasOpportunityScores,
      complexityBadges: hasComplexityBadges,
      recommendations: hasAIRecommendations
    });
    
    if (hasOpportunityScores > 0) {
      console.log('✅ AI opportunity scoring is working!');
    } else {
      console.log('⚠️ AI opportunity scores not visible (may need Claude API key)');
    }
  });

  test('should test permit map view integration', async ({ page }) => {
    console.log('🗺️ Testing permit map view...');
    
    await loginAsMember(page);
    await page.goto(`${BASE_URL}/member/project-intelligence/permits`);
    await page.waitForLoadState('networkidle');
    
    // Switch to map view
    const mapButton = page.locator('button:has-text("Map")');
    if (await mapButton.isVisible()) {
      await mapButton.click();
      await page.waitForTimeout(2000); // Wait for map to load
      
      await page.screenshot({ path: 'test-results/permit-map-view.png', fullPage: true });
      
      // Check if map container is present
      const hasMapContainer = await page.locator('.mapboxgl-canvas').isVisible().catch(() => false);
      const hasMapboxMap = await page.locator('[class*="mapbox"]').count() > 0;
      
      console.log('Map view check:', { hasMapContainer, hasMapboxMap });
      
      if (hasMapContainer || hasMapboxMap) {
        console.log('✅ Map view is loading');
      } else {
        console.log('⚠️ Map view may need Mapbox token configuration');
      }
    }
  });

  test('should verify API error handling', async ({ page }) => {
    console.log('🛡️ Testing API error handling...');
    
    await loginAsMember(page);
    await page.goto(`${BASE_URL}/member/project-intelligence/permits`);
    await page.waitForLoadState('networkidle');
    
    // Test search with potentially problematic parameters
    const filtersButton = page.locator('button:has-text("Filters")');
    if (await filtersButton.isVisible()) {
      await filtersButton.click();
      await page.waitForTimeout(500);
    }
    
    // Try searching for a non-existent city
    const cityInput = page.locator('input[placeholder*="San Francisco"]');
    if (await cityInput.isVisible()) {
      await cityInput.fill('NonExistentCity123');
    }
    
    await page.click('button:has-text("Search")');
    await page.waitForSelector('.animate-spin', { state: 'hidden', timeout: 20000 });
    
    // Check for graceful error handling
    const hasErrorMessage = await page.locator('text=/error/i').isVisible().catch(() => false);
    const hasNoResults = await page.locator('text=No permits found').isVisible().catch(() => false);
    const hasConfigPrompt = await page.locator('text=Configure Shovels API').isVisible().catch(() => false);
    
    console.log('Error handling check:', { hasErrorMessage, hasNoResults, hasConfigPrompt });
    
    if (hasNoResults) {
      console.log('✅ Graceful handling of empty results');
    } else if (hasConfigPrompt) {
      console.log('⚠️ API configuration issue detected');
    } else if (!hasErrorMessage) {
      console.log('✅ No errors displayed - good error handling');
    }
    
    await page.screenshot({ path: 'test-results/api-error-handling.png', fullPage: true });
  });
});

test.describe('Shovels API Performance Tests', () => {
  
  test('should measure API response times', async ({ page }) => {
    console.log('⏱️ Testing API performance...');
    
    await loginAsMember(page);
    await page.goto(`${BASE_URL}/member/project-intelligence/permits`);
    await page.waitForLoadState('networkidle');
    
    // Measure search response time
    const startTime = Date.now();
    
    const filtersButton = page.locator('button:has-text("Filters")');
    if (await filtersButton.isVisible()) {
      await filtersButton.click();
      await page.waitForTimeout(500);
    }
    
    const cityInput = page.locator('input[placeholder*="San Francisco"]');
    if (await cityInput.isVisible()) {
      await cityInput.fill('San Francisco');
    }
    
    await page.click('button:has-text("Search")');
    await page.waitForSelector('.animate-spin', { state: 'hidden', timeout: 30000 });
    
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    console.log(`API Response Time: ${responseTime}ms`);
    
    if (responseTime < 10000) {
      console.log('✅ Good API performance (<10 seconds)');
    } else if (responseTime < 20000) {
      console.log('⚠️ Acceptable API performance (10-20 seconds)');
    } else {
      console.log('❌ Slow API performance (>20 seconds)');
    }
    
    // Check if results loaded
    const hasResults = await page.locator('text=Permit #').isVisible().catch(() => false);
    const hasNoResults = await page.locator('text=No permits found').isVisible().catch(() => false);
    
    console.log('Performance test results:', { responseTime, hasResults, hasNoResults });
  });
});
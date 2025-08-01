const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function testMapFunctionality() {
  console.log('🚀 Starting NAMC Map Functionality Test...\n');
  
  const browser = await chromium.launch({ 
    headless: false, // Run with GUI so we can see what's happening
    slowMo: 1000 // Add delay between actions for visibility
  });
  
  const page = await browser.newPage();
  
  // Set up monitoring
  const networkRequests = [];
  const consoleMessages = [];
  const arcgisRequests = [];
  
  // Monitor network requests
  page.on('request', request => {
    networkRequests.push({
      url: request.url(),
      method: request.method(),
      resourceType: request.resourceType()
    });
    
    // Capture ArcGIS related requests
    if (request.url().includes('arcgis') || 
        request.url().includes('geocode') ||
        request.url().includes('maps.esri.com') ||
        request.url().includes('basemaps') ||
        request.url().includes('tile')) {
      arcgisRequests.push({
        url: request.url(),
        method: request.method(),
        timestamp: new Date().toISOString()
      });
      console.log(`🗺️  ArcGIS Request: ${request.method()} ${request.url()}`);
    }
  });
  
  // Monitor console messages
  page.on('console', msg => {
    const message = {
      type: msg.type(),
      text: msg.text(),
      timestamp: new Date().toISOString()
    };
    consoleMessages.push(message);
    
    // Log all console messages to catch any potential issues
    console.log(`📋 Console [${msg.type()}]: ${msg.text()}`);
    
    // Log ArcGIS related console messages with emphasis
    if (msg.text().toLowerCase().includes('arcgis') || 
        msg.text().toLowerCase().includes('map') ||
        msg.text().toLowerCase().includes('geocode')) {
      console.log(`🗺️ MAP-RELATED Console [${msg.type()}]: ${msg.text()}`);
    }
  });
  
  try {
    console.log('📍 Step 1: Navigating to NAMC site...');
    await page.goto('https://namc-nor-cal-website-member-portal.vercel.app/', { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    
    // Take initial screenshot
    await page.screenshot({ path: 'test-results/01-homepage.png', fullPage: true });
    console.log('✅ Homepage loaded and screenshot saved');
    
    console.log('\n🔐 Step 2: Logging in as member...');
    
    // Look for login button or form - try multiple possible selectors
    let loginFound = false;
    const possibleLoginSelectors = [
      'text=Login',
      'text=Sign In', 
      'button:has-text("Login")',
      'button:has-text("Sign In")',
      'a[href*="login"]',
      '.login-button',
      '#login-button'
    ];
    
    for (const selector of possibleLoginSelectors) {
      try {
        const element = await page.locator(selector).first();
        if (await element.isVisible({ timeout: 2000 })) {
          console.log(`📍 Found login element: ${selector}`);
          await element.click();
          loginFound = true;
          await page.waitForTimeout(2000);
          break;
        }
      } catch (e) {
        // Continue to next selector
      }
    }
    
    if (!loginFound) {
      console.log('🔍 No login button found, checking if already on login page...');
    }
    
    // Wait for and fill email field
    try {
      await page.waitForSelector('input[type="email"], input[name="email"], input[placeholder*="email" i]', { timeout: 10000 });
      await page.fill('input[type="email"], input[name="email"], input[placeholder*="email" i]', 'member@namc-norcal.org');
      console.log('✅ Email field filled');
    } catch (e) {
      console.log('❌ Email field not found:', e.message);
    }
    
    // Wait for and fill password field
    try {
      await page.waitForSelector('input[type="password"], input[name="password"], input[placeholder*="password" i]', { timeout: 10000 });
      await page.fill('input[type="password"], input[name="password"], input[placeholder*="password" i]', 'member123');
      console.log('✅ Password field filled');
    } catch (e) {
      console.log('❌ Password field not found:', e.message);
    }
    
    // Click login submit button
    try {
      const submitSelectors = [
        'button[type="submit"]',
        'button:has-text("Login")',
        'button:has-text("Sign In")',
        'input[type="submit"]',
        '.submit-button'
      ];
      
      let submitClicked = false;
      for (const selector of submitSelectors) {
        try {
          const element = await page.locator(selector).first();
          if (await element.isVisible({ timeout: 2000 })) {
            await element.click();
            console.log(`✅ Submit button clicked: ${selector}`);
            submitClicked = true;
            break;
          }
        } catch (e) {
          // Continue to next selector
        }
      }
      
      if (!submitClicked) {
        console.log('❌ No submit button found');
      }
    } catch (e) {
      console.log('❌ Submit button error:', e.message);
    }
    
    // Wait for navigation after login
    await page.waitForTimeout(5000);
    await page.screenshot({ path: 'test-results/02-after-login.png', fullPage: true });
    console.log('✅ Login attempt completed and screenshot saved');
    
    console.log('\n🏗️ Step 3: Navigating to Projects page...');
    
    // Navigate to projects page
    await page.goto('https://namc-nor-cal-website-member-portal.vercel.app/member/projects', {
      waitUntil: 'networkidle',
      timeout: 30000
    });
    
    // Wait for the page to fully load
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'test-results/03-projects-page.png', fullPage: true });
    console.log('✅ Projects page loaded and screenshot saved');
    
    console.log('\n🗺️ Step 4: Checking map functionality...');
    
    // Check for map view unavailable message
    const mapUnavailableMessage = await page.locator('text=Map View Unavailable').count();
    const mapContainer = await page.locator('.mapbox-gl-map, .esri-view, [class*="map"], .leaflet-container').count();
    
    // Check for any environment variables or API keys in the page
    const pageContent = await page.content();
    const hasArcGISKey = pageContent.includes('ARCGIS') || pageContent.includes('arcgis');
    const hasNextPublicArcGIS = pageContent.includes('NEXT_PUBLIC_ARCGIS');
    
    // Check if there are any JavaScript errors preventing map loading
    const errorElements = await page.locator('[data-testid="error"], .error, .map-error').count();
    
    console.log(`📊 Map Analysis:`);
    console.log(`   - "Map View Unavailable" messages found: ${mapUnavailableMessage}`);
    console.log(`   - Map containers found: ${mapContainer}`);
    console.log(`   - ArcGIS references in page: ${hasArcGISKey}`);
    console.log(`   - NEXT_PUBLIC_ARCGIS references: ${hasNextPublicArcGIS}`);
    console.log(`   - Error elements found: ${errorElements}`);
    
    // Try to evaluate JavaScript to check for environment variables
    try {
      const envCheck = await page.evaluate(() => {
        return {
          processEnv: typeof process !== 'undefined' ? Object.keys(process.env || {}).filter(key => key.includes('ARCGIS')) : [],
          windowVars: Object.keys(window).filter(key => key.toLowerCase().includes('arcgis')),
          hasNextConfig: typeof window !== 'undefined' && window.__NEXT_DATA__ !== undefined,
          nextPublicVars: typeof window !== 'undefined' && window.__NEXT_DATA__ ? 
            Object.keys(window.__NEXT_DATA__.buildId || {}).filter(key => key.includes('ARCGIS')) : []
        };
      });
      console.log(`   - Environment check:`, JSON.stringify(envCheck, null, 2));
    } catch (e) {
      console.log(`   - Environment check failed: ${e.message}`);
    }
    
    // Look for Map/Grid toggle
    const mapToggle = await page.locator('button:has-text("Map"), [aria-label*="Map"], .map-toggle').first();
    const gridToggle = await page.locator('button:has-text("Grid"), button:has-text("List"), [aria-label*="Grid"]').first();
    
    if (await mapToggle.isVisible()) {
      console.log('🔘 Map/Grid toggle found - testing toggle functionality...');
      
      // Click map view
      await mapToggle.click();
      await page.waitForTimeout(2000);
      await page.screenshot({ path: 'test-results/04-map-view.png', fullPage: true });
      
      // Click grid view
      if (await gridToggle.isVisible()) {
        await gridToggle.click();
        await page.waitForTimeout(2000);
        await page.screenshot({ path: 'test-results/05-grid-view.png', fullPage: true });
        
        // Switch back to map view
        await mapToggle.click();
        await page.waitForTimeout(2000);
      }
      
      console.log('✅ Toggle functionality tested');
    } else {
      console.log('❌ Map/Grid toggle not found');
    }
    
    console.log('\n📍 Step 5: Looking for project markers...');
    
    // Look for project markers or project elements
    const projectMarkers = await page.locator('.marker, .project-marker, .leaflet-marker, .esri-graphic').count();
    const projectCards = await page.locator('.project-card, [class*="project"]').count();
    
    console.log(`📊 Project Elements:`);
    console.log(`   - Project markers found: ${projectMarkers}`);
    console.log(`   - Project cards/elements found: ${projectCards}`);
    
    // Try to click on any visible markers
    if (projectMarkers > 0) {
      console.log('🎯 Attempting to click on project markers...');
      const firstMarker = await page.locator('.marker, .project-marker, .leaflet-marker, .esri-graphic').first();
      if (await firstMarker.isVisible()) {
        await firstMarker.click();
        await page.waitForTimeout(1000);
        await page.screenshot({ path: 'test-results/06-marker-clicked.png', fullPage: true });
        console.log('✅ Project marker clicked and screenshot saved');
      }
    }
    
    console.log('\n📱 Step 6: Final comprehensive screenshot...');
    await page.screenshot({ path: 'test-results/07-final-state.png', fullPage: true });
    
    // Generate summary report
    const report = {
      timestamp: new Date().toISOString(),
      testResults: {
        mapUnavailableMessages: mapUnavailableMessage,
        mapContainers: mapContainer,
        projectMarkers: projectMarkers,
        projectCards: projectCards,
        toggleFunctional: await mapToggle.isVisible()
      },
      arcgisRequests: arcgisRequests,
      consoleMessages: consoleMessages.filter(msg => 
        msg.text.toLowerCase().includes('arcgis') || 
        msg.text.toLowerCase().includes('map') ||
        msg.text.toLowerCase().includes('error')
      ),
      networkSummary: {
        totalRequests: networkRequests.length,
        arcgisRequestCount: arcgisRequests.length
      }
    };
    
    // Save detailed report
    fs.writeFileSync('test-results/map-test-report.json', JSON.stringify(report, null, 2));
    
    console.log('\n📋 TEST SUMMARY:');
    console.log('='.repeat(50));
    console.log(`🗺️  Map Status: ${mapUnavailableMessage === 0 ? 'WORKING' : 'UNAVAILABLE'}`);
    console.log(`📍 Project Markers: ${projectMarkers} found`);
    console.log(`🔄 Toggle Functionality: ${await mapToggle.isVisible() ? 'Available' : 'Not Found'}`);
    console.log(`🌐 ArcGIS Requests: ${arcgisRequests.length} detected`);
    console.log(`📱 Screenshots: 7 saved to test-results/`);
    console.log(`📊 Full Report: test-results/map-test-report.json`);
    
    if (arcgisRequests.length > 0) {
      console.log('\n🗺️  ArcGIS API ACTIVITY DETECTED:');
      arcgisRequests.forEach((req, i) => {
        console.log(`   ${i + 1}. ${req.method} ${req.url}`);
      });
    } else {
      console.log('\n❌ No ArcGIS API requests detected - map may not be loading');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    await page.screenshot({ path: 'test-results/error-screenshot.png', fullPage: true });
  } finally {
    await browser.close();
    console.log('\n🏁 Test completed!');
  }
}

// Ensure test-results directory exists
if (!fs.existsSync('test-results')) {
  fs.mkdirSync('test-results');
}

// Run the test
testMapFunctionality().catch(console.error);
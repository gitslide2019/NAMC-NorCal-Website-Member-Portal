const { chromium } = require('playwright');
const fs = require('fs');

async function investigateMapError() {
  const browser = await chromium.launch({ 
    headless: false,
    devtools: true
  });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  });
  const page = await context.newPage();

  // Setup console listener to capture all messages
  const consoleMessages = [];
  const errors = [];
  const networkErrors = [];
  
  page.on('console', msg => {
    const message = {
      type: msg.type(),
      text: msg.text(),
      location: msg.location(),
      timestamp: new Date().toISOString()
    };
    consoleMessages.push(message);
    console.log(`[${message.type.toUpperCase()}] ${message.text}`);
  });

  page.on('pageerror', error => {
    const errorInfo = {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    };
    errors.push(errorInfo);
    console.log(`[PAGE ERROR] ${error.message}`);
    console.log(error.stack);
  });

  page.on('requestfailed', request => {
    const failedRequest = {
      url: request.url(),
      method: request.method(),
      failure: request.failure(),
      timestamp: new Date().toISOString()
    };
    networkErrors.push(failedRequest);
    console.log(`[NETWORK ERROR] ${request.method()} ${request.url()} - ${request.failure()?.errorText}`);
  });

  try {
    console.log('🔍 Starting comprehensive map error investigation...\n');

    // Step 1: Navigate to the site
    console.log('1. Navigating to the site...');
    await page.goto('https://namc-nor-cal-website-member-portal.vercel.app/', { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    
    await page.screenshot({ path: 'investigation-01-homepage.png', fullPage: true });
    console.log('   ✅ Homepage loaded successfully');

    // Step 2: Navigate to signin
    console.log('\n2. Navigating to signin page...');
    await page.click('a[href="/auth/signin"]');
    await page.waitForURL('**/auth/signin', { timeout: 10000 });
    
    await page.screenshot({ path: 'investigation-02-signin.png', fullPage: true });
    console.log('   ✅ Signin page loaded');

    // Step 3: Login as member
    console.log('\n3. Logging in as member...');
    await page.fill('input[name="email"]', 'member@namc-norcal.org');
    await page.fill('input[name="password"]', 'member123');
    
    await page.screenshot({ path: 'investigation-03-login-form.png', fullPage: true });
    
    // Wait for navigation after login
    await Promise.all([
      page.waitForURL('**/member/dashboard', { timeout: 15000 }),
      page.click('button[type="submit"]')
    ]);
    
    await page.screenshot({ path: 'investigation-04-after-login.png', fullPage: true });
    console.log('   ✅ Successfully logged in as member');

    // Step 4: Navigate to projects page
    console.log('\n4. Navigating to projects page...');
    await page.click('a[href="/member/projects"]');
    await page.waitForURL('**/member/projects', { timeout: 10000 });
    
    // Wait a bit for initial render
    await page.waitForTimeout(2000);
    
    await page.screenshot({ path: 'investigation-05-projects-initial.png', fullPage: true });
    console.log('   ✅ Projects page loaded');

    // Step 5: Look for "Initializing map..." message
    console.log('\n5. Checking for map initialization message...');
    try {
      await page.waitForSelector('text=Initializing map...', { timeout: 5000 });
      console.log('   ✅ Found "Initializing map..." message');
    } catch (e) {
      console.log('   ℹ️  "Initializing map..." message not found or disappeared quickly');
    }

    // Step 6: Wait for any map loading or errors
    console.log('\n6. Waiting for map loading/errors (10 seconds)...');
    await page.waitForTimeout(10000);
    
    await page.screenshot({ path: 'investigation-06-after-wait.png', fullPage: true });

    // Step 7: Check for map container and elements
    console.log('\n7. Analyzing map container...');
    const mapContainer = await page.$('#map-container');
    if (mapContainer) {
      console.log('   ✅ Map container found');
      const containerHTML = await mapContainer.innerHTML();
      console.log('   Map container HTML:', containerHTML.substring(0, 200) + '...');
    } else {
      console.log('   ❌ Map container not found');
    }

    // Step 8: Check ArcGIS script loading
    console.log('\n8. Checking ArcGIS script loading...');
    const arcgisScripts = await page.$$eval('script', scripts => 
      scripts.filter(script => script.src && script.src.includes('arcgis')).map(script => ({
        src: script.src,
        loaded: script.readyState || 'unknown'
      }))
    );
    
    if (arcgisScripts.length > 0) {
      console.log('   ✅ ArcGIS scripts found:');
      arcgisScripts.forEach(script => console.log(`     - ${script.src}`));
    } else {
      console.log('   ❌ No ArcGIS scripts found');
    }

    // Step 9: Try to switch to map view if available
    console.log('\n9. Looking for map view toggle...');
    try {
      const mapViewButton = await page.$('button:has-text("Map View")');
      if (mapViewButton) {
        console.log('   ✅ Found Map View button, clicking...');
        await mapViewButton.click();
        await page.waitForTimeout(5000);
        await page.screenshot({ path: 'investigation-07-map-view.png', fullPage: true });
      } else {
        console.log('   ℹ️  Map View button not found');
      }
    } catch (e) {
      console.log(`   ❌ Error with map view: ${e.message}`);
    }

    // Step 10: Check for React hydration errors
    console.log('\n10. Analyzing console messages for hydration errors...');
    const hydrationErrors = consoleMessages.filter(msg => 
      msg.text.toLowerCase().includes('hydration') || 
      msg.text.toLowerCase().includes('hydrat') ||
      msg.text.toLowerCase().includes('mismatch')
    );
    
    if (hydrationErrors.length > 0) {
      console.log('   ❌ Found hydration-related errors:');
      hydrationErrors.forEach(error => console.log(`     - ${error.text}`));
    } else {
      console.log('   ✅ No hydration errors detected');
    }

    // Step 11: Final screenshot
    await page.screenshot({ path: 'investigation-08-final-state.png', fullPage: true });

    // Generate comprehensive report
    const report = {
      timestamp: new Date().toISOString(),
      url: page.url(),
      investigation: {
        totalConsoleMessages: consoleMessages.length,
        totalErrors: errors.length,
        totalNetworkErrors: networkErrors.length,
        hydrationErrors: hydrationErrors.length
      },
      consoleMessages: consoleMessages,
      pageErrors: errors,
      networkErrors: networkErrors,
      arcgisScripts: arcgisScripts,
      summary: {
        mapContainerFound: !!mapContainer,
        arcgisScriptsLoaded: arcgisScripts.length > 0,
        hasHydrationIssues: hydrationErrors.length > 0,
        hasMapErrors: consoleMessages.some(msg => 
          msg.text.toLowerCase().includes('removechild') ||
          msg.text.toLowerCase().includes('map') ||
          msg.text.toLowerCase().includes('arcgis')
        )
      }
    };

    // Save detailed report
    fs.writeFileSync('map-error-investigation-report.json', JSON.stringify(report, null, 2));
    
    console.log('\n📊 INVESTIGATION SUMMARY:');
    console.log('='.repeat(50));
    console.log(`Total Console Messages: ${report.investigation.totalConsoleMessages}`);
    console.log(`Page Errors: ${report.investigation.totalErrors}`);
    console.log(`Network Errors: ${report.investigation.totalNetworkErrors}`);
    console.log(`Hydration Errors: ${report.investigation.hydrationErrors}`);
    console.log(`Map Container Found: ${report.summary.mapContainerFound}`);
    console.log(`ArcGIS Scripts Loaded: ${report.summary.arcgisScriptsLoaded}`);
    console.log(`Has Map-Related Errors: ${report.summary.hasMapErrors}`);

    // Show recent console messages
    console.log('\n📝 RECENT CONSOLE MESSAGES:');
    console.log('='.repeat(50));
    const recentMessages = consoleMessages.slice(-10);
    recentMessages.forEach(msg => {
      console.log(`[${msg.type.toUpperCase()}] ${msg.text}`);
    });

    // Show all errors
    if (errors.length > 0) {
      console.log('\n❌ PAGE ERRORS:');
      console.log('='.repeat(50));
      errors.forEach(error => {
        console.log(`Error: ${error.message}`);
        if (error.stack) {
          console.log(`Stack: ${error.stack.split('\n')[0]}`);
        }
      });
    }

    // Show network errors
    if (networkErrors.length > 0) {
      console.log('\n🌐 NETWORK ERRORS:');
      console.log('='.repeat(50));
      networkErrors.forEach(error => {
        console.log(`${error.method} ${error.url} - ${error.failure?.errorText || 'Unknown error'}`);
      });
    }

  } catch (error) {
    console.error('❌ Investigation failed:', error);
    await page.screenshot({ path: 'investigation-error.png', fullPage: true });
  } finally {
    await browser.close();
    console.log('\n✅ Investigation complete. Check the generated screenshots and report files.');
  }
}

// Run the investigation
investigateMapError().catch(console.error);
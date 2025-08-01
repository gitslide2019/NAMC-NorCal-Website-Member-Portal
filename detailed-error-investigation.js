const { chromium } = require('playwright');

async function detailedErrorInvestigation() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  const jsErrors = [];
  const uncaughtExceptions = [];
  const reactErrors = [];
  const consoleErrors = [];
  const networkErrors = [];

  // Capture JavaScript errors
  page.on('pageerror', error => {
    jsErrors.push({
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    console.log(`🚨 JavaScript Error: ${error.name}: ${error.message}`);
  });

  // Capture console errors
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push({
        text: msg.text(),
        location: msg.location()
      });
      console.log(`❌ Console Error: ${msg.text()}`);
    }
    if (msg.type() === 'warning') {
      console.log(`⚠️ Console Warning: ${msg.text()}`);
    }
  });

  // Capture network failures
  page.on('response', response => {
    if (!response.ok()) {
      networkErrors.push({
        url: response.url(),
        status: response.status(),
        statusText: response.statusText()
      });
      console.log(`📡 Network Error: ${response.status()} - ${response.url()}`);
    }
  });

  // Capture request failures
  page.on('requestfailed', request => {
    console.log(`🌐 Request Failed: ${request.url()} - ${request.failure()?.errorText}`);
  });

  try {
    console.log('=== 🔍 DETAILED ERROR INVESTIGATION ===\n');

    // Test 1: Homepage with detailed monitoring
    console.log('🏠 Testing Homepage...');
    await page.goto('https://namc-nor-cal-website-member-portal.vercel.app/', { 
      waitUntil: 'domcontentloaded',
      timeout: 30000 
    });
    
    // Wait for any lazy-loaded components or scripts
    await page.waitForTimeout(5000);

    // Check for React hydration errors
    const reactHydrationErrors = await page.evaluate(() => {
      const errors = [];
      if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__?.onCommitFiberRoot) {
        errors.push('React DevTools detected');
      }
      return errors;
    });

    // Test 2: Navigate to member/projects and trigger potential error
    console.log('\n📁 Testing /member/projects route...');
    await page.goto('https://namc-nor-cal-website-member-portal.vercel.app/member/projects', { 
      waitUntil: 'domcontentloaded',
      timeout: 30000 
    });
    
    await page.waitForTimeout(3000);

    // Test 3: Try to access pages that might trigger errors
    const testRoutes = [
      '/member/projects/create',
      '/member/dashboard',
      '/admin/dashboard',
      '/api/projects',
      '/api/members'
    ];

    for (const route of testRoutes) {
      try {
        console.log(`\n🔗 Testing route: ${route}`);
        const response = await page.goto(`https://namc-nor-cal-website-member-portal.vercel.app${route}`, { 
          waitUntil: 'domcontentloaded',
          timeout: 15000 
        });
        
        if (!response.ok()) {
          console.log(`❌ Route ${route} returned ${response.status()}`);
        }
        
        await page.waitForTimeout(2000);
        
        // Check for specific error messages in the DOM
        const errorMessages = await page.locator('text=/Application error|client-side exception|Unhandled Runtime Error|ChunkLoadError|Module not found/i').all();
        if (errorMessages.length > 0) {
          console.log(`🎯 Found ${errorMessages.length} error message(s) on ${route}:`);
          for (let i = 0; i < errorMessages.length; i++) {
            const text = await errorMessages[i].textContent();
            console.log(`   ${i + 1}. ${text}`);
          }
        }
        
      } catch (error) {
        console.log(`⚠️ Route ${route} failed: ${error.message}`);
      }
    }

    // Test 4: Try to trigger client-side errors by interacting with the page
    console.log('\n🖱️ Testing interactive elements...');
    await page.goto('https://namc-nor-cal-website-member-portal.vercel.app/', { 
      waitUntil: 'domcontentloaded',
      timeout: 30000 
    });

    // Try clicking navigation items
    try {
      const navItems = ['About', 'Timeline', 'Projects', 'Shop', 'News', 'Sponsors', 'Contact'];
      for (const item of navItems) {
        try {
          const link = page.locator(`text="${item}"`).first();
          if (await link.isVisible({ timeout: 2000 })) {
            console.log(`Clicking ${item}...`);
            await link.click();
            await page.waitForTimeout(2000);
          }
        } catch (error) {
          console.log(`Failed to click ${item}: ${error.message}`);
        }
      }
    } catch (error) {
      console.log(`Navigation test failed: ${error.message}`);
    }

    // Test 5: Check for ArcGIS or map-related errors
    console.log('\n🗺️ Checking for ArcGIS/Map errors...');
    await page.goto('https://namc-nor-cal-website-member-portal.vercel.app/member/projects', { 
      waitUntil: 'domcontentloaded',
      timeout: 30000 
    });
    
    // Look for map containers or ArcGIS elements
    const mapElements = await page.locator('[class*="map"], [class*="arcgis"], [id*="map"], [id*="arcgis"]').count();
    console.log(`📍 Found ${mapElements} potential map elements`);

    // Test 6: Check for environment variable errors
    console.log('\n🔧 Checking for environment variable issues...');
    const envErrors = await page.evaluate(() => {
      const errors = [];
      if (typeof window !== 'undefined') {
        // Check for common env var access patterns that might fail
        try {
          if (window.location.href.includes('localhost') && !window.location.href.includes('vercel')) {
            errors.push('Local development environment detected');
          }
        } catch (e) {
          errors.push(`Environment check failed: ${e.message}`);
        }
      }
      return errors;
    });

    envErrors.forEach(error => console.log(`🔧 ${error}`));

  } catch (error) {
    console.error('Investigation failed:', error.message);
    await page.screenshot({ path: 'detailed-error-screenshot.png', fullPage: true });
  }

  // Final report
  console.log('\n' + '='.repeat(50));
  console.log('📊 DETAILED ERROR INVESTIGATION REPORT');
  console.log('='.repeat(50));
  
  console.log(`\n🚨 JavaScript Errors: ${jsErrors.length}`);
  if (jsErrors.length > 0) {
    jsErrors.forEach((error, index) => {
      console.log(`${index + 1}. ${error.name}: ${error.message}`);
      if (error.stack) {
        console.log(`   Stack: ${error.stack.split('\n')[0]}`);
      }
    });
  }

  console.log(`\n❌ Console Errors: ${consoleErrors.length}`);
  if (consoleErrors.length > 0) {
    consoleErrors.slice(0, 10).forEach((error, index) => {
      console.log(`${index + 1}. ${error.text}`);
      if (error.location) {
        console.log(`   Location: ${error.location.url}:${error.location.lineNumber}`);
      }
    });
    if (consoleErrors.length > 10) {
      console.log(`   ... and ${consoleErrors.length - 10} more`);
    }
  }

  console.log(`\n📡 Network Errors: ${networkErrors.length}`);
  if (networkErrors.length > 0) {
    const uniqueNetworkErrors = [...new Set(networkErrors.map(e => `${e.status} - ${e.url.split('?')[0]}`))];
    uniqueNetworkErrors.slice(0, 10).forEach((error, index) => {
      console.log(`${index + 1}. ${error}`);
    });
    if (uniqueNetworkErrors.length > 10) {
      console.log(`   ... and ${uniqueNetworkErrors.length - 10} more unique errors`);
    }
  }

  // Specific diagnosis
  console.log('\n🔍 DIAGNOSIS:');
  
  if (jsErrors.length > 0) {
    console.log('✅ Found JavaScript runtime errors - this is likely the cause of "Application error: a client-side exception has occurred"');
  } else {
    console.log('❌ No JavaScript runtime errors detected');
  }
  
  if (networkErrors.filter(e => e.status >= 500).length > 0) {
    console.log('✅ Found server errors (5xx) - these could cause client-side exceptions');
  }
  
  if (networkErrors.filter(e => e.url.includes('/_next/')).length > 0) {
    console.log('✅ Found Next.js build asset errors - could indicate build/deployment issues');
  }
  
  const routeErrors = networkErrors.filter(e => 
    e.status === 404 && 
    !e.url.includes('favicon.ico') && 
    !e.url.includes('_next/static')
  );
  
  if (routeErrors.length > 0) {
    console.log(`✅ Found ${routeErrors.length} route-related 404 errors - indicating missing pages or routing issues`);
  }

  await browser.close();
}

detailedErrorInvestigation().catch(console.error);
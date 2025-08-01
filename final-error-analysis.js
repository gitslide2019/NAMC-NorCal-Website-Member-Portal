const { chromium } = require('playwright');

async function finalErrorAnalysis() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  const criticalErrors = [];
  const authErrors = [];
  const missingRoutes = [];

  page.on('pageerror', error => {
    criticalErrors.push({
      type: 'JavaScript Runtime Error',
      message: error.message,
      stack: error.stack,
      location: 'Client-side'
    });
    console.log(`🚨 CRITICAL: ${error.message}`);
  });

  page.on('console', msg => {
    if (msg.type() === 'error') {
      const text = msg.text();
      if (text.includes('next-auth') || text.includes('CLIENT_FETCH_ERROR')) {
        authErrors.push({
          type: 'NextAuth Error',
          message: text,
          location: msg.location()
        });
        console.log(`🔐 AUTH ERROR: ${text}`);
      } else if (text.includes('ChunkLoadError') || text.includes('Loading chunk')) {
        criticalErrors.push({
          type: 'Chunk Load Error',
          message: text,
          location: msg.location()
        });
        console.log(`📦 CHUNK ERROR: ${text}`);
      }
    }
  });

  page.on('response', response => {
    if (response.status() === 404 && !response.url().includes('favicon.ico') && !response.url().includes('_rsc=')) {
      const url = new URL(response.url());
      missingRoutes.push({
        route: url.pathname,
        url: response.url(),
        status: response.status()
      });
      console.log(`❌ MISSING ROUTE: ${url.pathname}`);
    }
  });

  try {
    console.log('=== 🎯 FINAL ERROR ANALYSIS ===\n');

    // Test homepage for critical errors
    console.log('🏠 Testing homepage for critical errors...');
    await page.goto('https://namc-nor-cal-website-member-portal.vercel.app/', { 
      waitUntil: 'domcontentloaded',
      timeout: 30000 
    });
    
    await page.waitForTimeout(5000);

    // Try to trigger NextAuth session check
    console.log('🔐 Testing NextAuth session...');
    try {
      await page.evaluate(async () => {
        if (typeof window !== 'undefined' && window.fetch) {
          return await fetch('/api/auth/session');
        }
      });
    } catch (error) {
      console.log(`Auth test failed: ${error.message}`);
    }

    // Test member routes specifically
    console.log('\n👤 Testing member routes...');
    const memberRoutes = ['/member/projects', '/member/dashboard', '/member/directory'];
    
    for (const route of memberRoutes) {
      console.log(`Testing ${route}...`);
      await page.goto(`https://namc-nor-cal-website-member-portal.vercel.app${route}`, { 
        waitUntil: 'domcontentloaded',
        timeout: 15000 
      });
      await page.waitForTimeout(2000);
    }

    // Check for the specific error message the user reported
    console.log('\n🔍 Checking for "Application error: a client-side exception has occurred"...');
    
    // Navigate to a route that might trigger the error
    await page.goto('https://namc-nor-cal-website-member-portal.vercel.app/projects', { 
      waitUntil: 'domcontentloaded',
      timeout: 15000 
    });
    
    await page.waitForTimeout(3000);
    
    const errorText = await page.locator('text=/Application error.*client-side exception/i').textContent().catch(() => null);
    if (errorText) {
      console.log(`🎯 FOUND USER-REPORTED ERROR: ${errorText}`);
      criticalErrors.push({
        type: 'Application Error',
        message: errorText,
        location: 'Error page'
      });
    }

  } catch (error) {
    console.error('Analysis failed:', error.message);
  }

  // Generate final report
  console.log('\n' + '='.repeat(60));
  console.log('🎯 FINAL ERROR ANALYSIS REPORT');
  console.log('='.repeat(60));

  console.log(`\n🚨 CRITICAL ERRORS: ${criticalErrors.length}`);
  if (criticalErrors.length > 0) {
    criticalErrors.forEach((error, index) => {
      console.log(`${index + 1}. [${error.type}] ${error.message}`);
    });
  } else {
    console.log('✅ No critical JavaScript runtime errors detected');
  }

  console.log(`\n🔐 AUTHENTICATION ERRORS: ${authErrors.length}`);
  if (authErrors.length > 0) {
    authErrors.forEach((error, index) => {
      console.log(`${index + 1}. ${error.message}`);
    });
  }

  // Get unique missing routes
  const uniqueMissingRoutes = [...new Set(missingRoutes.map(r => r.route))];
  console.log(`\n❌ MISSING ROUTES: ${uniqueMissingRoutes.length}`);
  if (uniqueMissingRoutes.length > 0) {
    uniqueMissingRoutes.forEach((route, index) => {
      console.log(`${index + 1}. ${route}`);
    });
  }

  console.log('\n' + '='.repeat(60));
  console.log('🔧 ROOT CAUSE ANALYSIS');
  console.log('='.repeat(60));

  if (criticalErrors.length > 0) {
    console.log('🎯 PRIMARY ISSUE: JavaScript runtime errors causing client-side exceptions');
    console.log('   These are likely the direct cause of "Application error: a client-side exception has occurred"');
  } else if (authErrors.length > 0) {
    console.log('🎯 PRIMARY ISSUE: NextAuth configuration errors');
    console.log('   Authentication failures can cause client-side exceptions in protected routes');
  } else if (uniqueMissingRoutes.length > 0) {
    console.log('🎯 PRIMARY ISSUE: Missing page components for navigation routes');
    console.log('   404 errors for expected routes can cause navigation failures and client-side exceptions');
  } else {
    console.log('🤔 INCONCLUSIVE: No obvious errors detected in this session');
    console.log('   The error may be intermittent or triggered by specific user actions');
  }

  console.log('\n📋 RECOMMENDATIONS:');
  
  if (uniqueMissingRoutes.includes('/about')) {
    console.log('1. Create missing page components: /about, /projects, /shop, /news, /sponsors');
  }
  
  if (authErrors.length > 0) {
    console.log('2. Fix NextAuth configuration - check environment variables and API route');
  }
  
  if (criticalErrors.length > 0) {
    console.log('3. Fix JavaScript runtime errors immediately - these cause client-side exceptions');
  }
  
  console.log('4. Check server logs and Vercel deployment logs for additional error details');
  console.log('5. Test the application in different browsers and network conditions');

  await browser.close();
}

finalErrorAnalysis().catch(console.error);
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Store console messages for analysis
  const consoleMessages = [];
  const networkRequests = [];
  const networkResponses = [];

  // Listen for console messages
  page.on('console', msg => {
    const type = msg.type();
    const text = msg.text();
    consoleMessages.push({ type, text });
    console.log(`[CONSOLE ${type}] ${text}`);
  });

  // Listen for network requests to ArcGIS services
  page.on('request', request => {
    const url = request.url();
    if (url.includes('arcgis') || url.includes('esri')) {
      networkRequests.push({ method: request.method(), url });
      console.log(`[NETWORK REQUEST] ${request.method()} ${url}`);
    }
  });

  // Listen for network responses
  page.on('response', response => {
    const url = response.url();
    if (url.includes('arcgis') || url.includes('esri')) {
      networkResponses.push({ status: response.status(), url });
      console.log(`[NETWORK RESPONSE] ${response.status()} ${url}`);
    }
  });

  try {
    console.log('1. Navigating to the NAMC portal...');
    await page.goto('https://namc-nor-cal-website-member-portal.vercel.app/', { waitUntil: 'networkidle' });
    
    console.log('2. Taking initial homepage screenshot...');
    await page.screenshot({ path: 'homepage-initial.png', fullPage: true });

    // Click Sign In button
    console.log('3. Clicking Sign In button...');
    await page.click('text=Sign In');
    await page.waitForTimeout(2000);

    console.log('4. Taking sign-in page screenshot...');
    await page.screenshot({ path: 'signin-page.png', fullPage: true });

    // Fill in login credentials
    console.log('5. Attempting to login with member credentials...');
    await page.fill('input[type="email"]', 'member@namc-norcal.org');
    await page.fill('input[type="password"]', 'member123');
    
    console.log('6. Taking filled form screenshot...');
    await page.screenshot({ path: 'login-form-filled.png', fullPage: true });

    // Submit the form
    await page.click('button[type="submit"]');
    await page.waitForTimeout(5000);

    console.log('7. Current URL after login:', page.url());
    await page.screenshot({ path: 'after-login-member.png', fullPage: true });

    // Navigate to projects page
    console.log('8. Navigating to projects page...');
    await page.goto('https://namc-nor-cal-website-member-portal.vercel.app/member/projects', { waitUntil: 'networkidle' });
    
    await page.waitForTimeout(5000);

    console.log('9. Taking screenshot of projects page...');
    await page.screenshot({ path: 'projects-page-member.png', fullPage: true });

    // Look for specific ArcGIS error messages
    console.log('10. Checking for ArcGIS error messages...');
    const arcgisErrors = await page.locator('text=/API key|Map View Unavailable|ArcGIS|authentication|unauthorized/i').allTextContents();
    console.log('ArcGIS related messages:', arcgisErrors);

    // Check for any error states or messages in the projects page
    console.log('11. Checking page content for errors...');
    const pageContent = await page.textContent('body');
    
    if (pageContent.includes('Map View Unavailable')) {
      console.log('FOUND: Map View Unavailable message');
    }
    if (pageContent.includes('API key')) {
      console.log('FOUND: API key related message');
    }
    if (pageContent.includes('ArcGIS')) {
      console.log('FOUND: ArcGIS related message');
    }

    // Look for any error containers or components
    console.log('12. Checking for error UI components...');
    const errorElements = await page.locator('[class*="error"], [data-testid*="error"], [role="alert"]').count();
    console.log(`Found ${errorElements} error UI elements`);

    if (errorElements > 0) {
      const errorTexts = await page.locator('[class*="error"], [data-testid*="error"], [role="alert"]').allTextContents();
      console.log('Error element texts:', errorTexts);
    }

    // Check browser dev tools console for environment variable errors
    console.log('13. Console messages summary:');
    consoleMessages.forEach((msg, index) => {
      if (msg.text.includes('ARCGIS') || msg.text.includes('API') || msg.text.includes('key') || msg.text.includes('undefined')) {
        console.log(`  ${index + 1}. [${msg.type}] ${msg.text}`);
      }
    });

    console.log('14. Network requests summary:');
    if (networkRequests.length > 0) {
      networkRequests.forEach((req, index) => {
        console.log(`  ${index + 1}. ${req.method} ${req.url}`);
      });
    } else {
      console.log('  No ArcGIS/Esri network requests found');
    }

    console.log('15. Network responses summary:');
    if (networkResponses.length > 0) {
      networkResponses.forEach((res, index) => {
        console.log(`  ${index + 1}. ${res.status} ${res.url}`);
      });
    } else {
      console.log('  No ArcGIS/Esri network responses found');
    }

    // Try to interact with map component if it exists
    console.log('16. Looking for map components...');
    const mapElements = await page.locator('[id*="map"], [class*="map"], [data-testid*="map"]').count();
    console.log(`Found ${mapElements} potential map elements`);

    if (mapElements > 0) {
      console.log('17. Taking screenshot of map area...');
      await page.locator('[id*="map"], [class*="map"], [data-testid*="map"]').first().screenshot({ path: 'map-component.png' });
    }

    console.log('18. Final projects page screenshot...');
    await page.screenshot({ path: 'projects-final-analysis.png', fullPage: true });

  } catch (error) {
    console.error('Error during test:', error);
    await page.screenshot({ path: 'test-error-screenshot.png', fullPage: true });
  } finally {
    await browser.close();
  }
})();
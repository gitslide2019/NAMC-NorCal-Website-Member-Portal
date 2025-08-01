const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Listen for console messages
  page.on('console', msg => {
    const type = msg.type();
    const text = msg.text();
    console.log(`[CONSOLE ${type}] ${text}`);
  });

  // Listen for network requests to ArcGIS services
  page.on('request', request => {
    if (request.url().includes('arcgis') || request.url().includes('esri')) {
      console.log(`[NETWORK REQUEST] ${request.method()} ${request.url()}`);
    }
  });

  // Listen for network responses
  page.on('response', response => {
    if (response.url().includes('arcgis') || response.url().includes('esri')) {
      console.log(`[NETWORK RESPONSE] ${response.status()} ${response.url()}`);
    }
  });

  try {
    console.log('1. Navigating to the NAMC portal...');
    await page.goto('https://namc-nor-cal-website-member-portal.vercel.app/', { waitUntil: 'networkidle' });
    
    console.log('2. Taking initial screenshot...');
    await page.screenshot({ path: 'initial-page.png', fullPage: true });

    // Try to find login form
    console.log('3. Looking for login elements...');
    const loginElements = await page.locator('input[type="email"], input[type="password"], button[type="submit"]').count();
    console.log(`Found ${loginElements} login-related elements`);

    // Try member login first
    console.log('4. Attempting member login...');
    try {
      await page.fill('input[type="email"]', 'member@namc-norcal.org');
      await page.fill('input[type="password"]', 'member123');
      await page.click('button[type="submit"]');
      await page.waitForTimeout(3000);
    } catch (error) {
      console.log('Member login failed, trying admin login...');
      await page.fill('input[type="email"]', 'admin@namc-norcal.org');
      await page.fill('input[type="password"]', 'admin123');
      await page.click('button[type="submit"]');
      await page.waitForTimeout(3000);
    }

    console.log('5. Current URL after login attempt:', page.url());

    // Navigate to projects page
    console.log('6. Navigating to projects page...');
    await page.goto('https://namc-nor-cal-website-member-portal.vercel.app/member/projects', { waitUntil: 'networkidle' });
    
    console.log('7. Current URL:', page.url());

    // Wait a bit for any async loading
    await page.waitForTimeout(5000);

    console.log('8. Taking screenshot of projects page...');
    await page.screenshot({ path: 'projects-page.png', fullPage: true });

    // Look for error messages
    console.log('9. Checking for error messages...');
    const errorMessages = await page.locator('text=/error|Error|unavailable|Unavailable|not found|Not Found|API key|missing/i').allTextContents();
    console.log('Error messages found:', errorMessages);

    // Look for ArcGIS related text
    console.log('10. Checking for ArcGIS related content...');
    const arcgisText = await page.locator('text=/arcgis|ArcGIS|esri|Esri|map|Map/i').allTextContents();
    console.log('ArcGIS related text:', arcgisText);

    // Check if there are any elements with specific error classes or IDs
    console.log('11. Checking for error containers...');
    const errorContainers = await page.locator('[class*="error"], [id*="error"], [class*="unavailable"], [id*="unavailable"]').count();
    console.log(`Found ${errorContainers} potential error containers`);

    // Get page title and check for any alert dialogs
    console.log('12. Page title:', await page.title());

    // Look for loading states
    console.log('13. Checking for loading states...');
    const loadingElements = await page.locator('text=/loading|Loading|spinner/i').count();
    console.log(`Found ${loadingElements} loading elements`);

    console.log('14. Final screenshot...');
    await page.screenshot({ path: 'final-projects-page.png', fullPage: true });

  } catch (error) {
    console.error('Error during test:', error);
    await page.screenshot({ path: 'error-screenshot.png', fullPage: true });
  } finally {
    await browser.close();
  }
})();
const { chromium } = require('playwright');

async function investigateApplication() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Set up console logging
  const consoleMessages = [];
  const networkErrors = [];
  const errors = [];

  page.on('console', msg => {
    consoleMessages.push({
      type: msg.type(),
      text: msg.text(),
      location: msg.location()
    });
    console.log(`Console ${msg.type()}: ${msg.text()}`);
  });

  page.on('pageerror', error => {
    errors.push({
      message: error.message,
      stack: error.stack
    });
    console.log(`Page Error: ${error.message}`);
  });

  page.on('response', response => {
    if (!response.ok()) {
      networkErrors.push({
        url: response.url(),
        status: response.status(),
        statusText: response.statusText()
      });
      console.log(`Network Error: ${response.status()} ${response.statusText()} - ${response.url()}`);
    }
  });

  try {
    console.log('=== INVESTIGATING HOMEPAGE ===');
    await page.goto('https://namc-nor-cal-website-member-portal.vercel.app/', { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    
    // Wait a bit for any delayed errors
    await page.waitForTimeout(3000);
    
    // Take screenshot of homepage
    await page.screenshot({ path: 'homepage-screenshot.png', fullPage: true });
    console.log('Homepage screenshot saved');

    // Check for error messages in the DOM
    const errorElements = await page.locator('text=/error|Error|ERROR/i').all();
    if (errorElements.length > 0) {
      console.log(`Found ${errorElements.length} error elements on homepage`);
      for (let i = 0; i < errorElements.length; i++) {
        const text = await errorElements[i].textContent();
        console.log(`Error element ${i + 1}: ${text}`);
      }
    }

    console.log('\n=== INVESTIGATING PROJECTS PAGE ===');
    await page.goto('https://namc-nor-cal-website-member-portal.vercel.app/member/projects', { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    
    // Wait for any errors to appear
    await page.waitForTimeout(3000);
    
    // Take screenshot of projects page
    await page.screenshot({ path: 'projects-screenshot.png', fullPage: true });
    console.log('Projects page screenshot saved');

    // Check for specific error messages
    const projectsErrorElements = await page.locator('text=/error|Error|ERROR|exception|Exception/i').all();
    if (projectsErrorElements.length > 0) {
      console.log(`Found ${projectsErrorElements.length} error elements on projects page`);
      for (let i = 0; i < projectsErrorElements.length; i++) {
        const text = await projectsErrorElements[i].textContent();
        console.log(`Error element ${i + 1}: ${text}`);
      }
    }

    console.log('\n=== INVESTIGATING OTHER PAGES ===');
    const pagesToTest = [
      '/about',
      '/contact',
      '/member',
      '/member/dashboard',
      '/member/events',
      '/member/directory'
    ];

    for (const path of pagesToTest) {
      try {
        console.log(`Testing page: ${path}`);
        await page.goto(`https://namc-nor-cal-website-member-portal.vercel.app${path}`, { 
          waitUntil: 'networkidle',
          timeout: 15000 
        });
        await page.waitForTimeout(2000);
        
        const pageErrorElements = await page.locator('text=/error|Error|ERROR/i').count();
        console.log(`${path}: ${pageErrorElements} error elements found`);
        
      } catch (error) {
        console.log(`${path}: Navigation failed - ${error.message}`);
      }
    }

  } catch (error) {
    console.error('Investigation failed:', error.message);
    await page.screenshot({ path: 'error-screenshot.png', fullPage: true });
  }

  // Generate comprehensive report
  console.log('\n=== INVESTIGATION SUMMARY ===');
  console.log(`Total console messages: ${consoleMessages.length}`);
  console.log(`Total page errors: ${errors.length}`);
  console.log(`Total network errors: ${networkErrors.length}`);

  if (consoleMessages.length > 0) {
    console.log('\n--- Console Messages ---');
    consoleMessages.forEach((msg, index) => {
      console.log(`${index + 1}. [${msg.type}] ${msg.text}`);
      if (msg.location) {
        console.log(`   Location: ${msg.location.url}:${msg.location.lineNumber}:${msg.location.columnNumber}`);
      }
    });
  }

  if (errors.length > 0) {
    console.log('\n--- Page Errors ---');
    errors.forEach((error, index) => {
      console.log(`${index + 1}. ${error.message}`);
      if (error.stack) {
        console.log(`   Stack: ${error.stack}`);
      }
    });
  }

  if (networkErrors.length > 0) {
    console.log('\n--- Network Errors ---');
    networkErrors.forEach((error, index) => {
      console.log(`${index + 1}. ${error.status} ${error.statusText} - ${error.url}`);
    });
  }

  await browser.close();
}

investigateApplication().catch(console.error);
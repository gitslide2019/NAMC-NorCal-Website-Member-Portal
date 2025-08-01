import { test, expect } from '@playwright/test';

test('Debug page loading', async ({ page }) => {
  console.log('Navigating to Project Intelligence Hub...');
  
  // Navigate to the page
  await page.goto('http://localhost:3001/member/project-intelligence');
  
  // Wait for page to load
  await page.waitForLoadState('networkidle');
  
  // Take a screenshot to see what's actually rendered
  await page.screenshot({ path: 'debug-project-intelligence.png', fullPage: true });
  
  // Get the page content
  const content = await page.content();
  console.log('Page HTML content (first 1000 chars):', content.substring(0, 1000));
  
  // Check for any error messages
  const errors = await page.locator('[role="alert"], .error, [data-testid="error"]').allTextContents();
  console.log('Found error messages:', errors);
  
  // Check what's actually in the page
  const h1Elements = await page.locator('h1').allTextContents();
  console.log('H1 elements found:', h1Elements);
  
  const pageTitle = await page.title();
  console.log('Page title:', pageTitle);
  
  // Check if we're being redirected
  const currentUrl = page.url();
  console.log('Current URL:', currentUrl);
});

test('Check if routes exist', async ({ page }) => {
  const routes = [
    'http://localhost:3001/member/project-intelligence',
    'http://localhost:3001/member/project-intelligence/assistant',
    'http://localhost:3001/member/project-intelligence/estimates',
    'http://localhost:3001/member/project-intelligence/permits'
  ];
  
  for (const route of routes) {
    console.log(`Testing route: ${route}`);
    
    const response = await page.goto(route);
    console.log(`Status: ${response?.status()}`);
    
    await page.waitForLoadState('networkidle');
    
    const title = await page.title();
    const url = page.url();
    console.log(`Title: ${title}, Final URL: ${url}`);
    
    await page.screenshot({ path: `debug-${route.split('/').pop()}.png`, fullPage: true });
  }
});
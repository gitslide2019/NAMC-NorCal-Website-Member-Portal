import { test, expect } from '@playwright/test';

test.describe('Check Projects Page', () => {
  const TEST_MEMBER = {
    email: 'member@namc-norcal.org',
    password: 'member123'
  };

  test('Check what is actually on the projects page', async ({ page }) => {
    // Login first
    await page.goto('/');
    await page.click('text=Sign In');
    await page.waitForSelector('input[name="email"]', { state: 'visible' });
    await page.click('input[name="email"]');
    await page.fill('input[name="email"]', '');
    await page.type('input[name="email"]', TEST_MEMBER.email);
    await page.click('input[name="password"]');
    await page.fill('input[name="password"]', '');
    await page.type('input[name="password"]', TEST_MEMBER.password);
    await page.waitForTimeout(500);
    await page.click('button[type="submit"]');
    
    // Wait for login
    await page.waitForURL(/\/member/, { timeout: 15000 });
    
    // Navigate to Projects
    await page.click('text=Projects');
    await page.waitForLoadState('networkidle');
    
    // Log current URL
    console.log('Current URL:', page.url());
    
    // Check page title
    const title = await page.textContent('h1');
    console.log('Page title:', title);
    
    // Check if there are any project-related elements
    const projectElements = await page.locator('text=/project|Project|opportunity|Opportunity/i').count();
    console.log('Project-related elements found:', projectElements);
    
    // Get some text content to understand the page
    const pageText = await page.textContent('main');
    console.log('First 500 characters of main content:', pageText?.substring(0, 500));
  });
});
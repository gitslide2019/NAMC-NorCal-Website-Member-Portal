import { test, expect } from '@playwright/test';

test.describe('Debug Login', () => {
  const TEST_MEMBER = {
    email: 'member@namc-norcal.org',
    password: 'member123'
  };

  test('Debug login process step by step', async ({ page }) => {
    // Navigate to homepage
    console.log('1. Going to homepage...');
    await page.goto('/');
    
    // Click Sign In button
    console.log('2. Clicking Sign In...');
    await page.click('text=Sign In');
    await expect(page).toHaveURL('/auth/signin');
    
    // Wait for the form to be fully loaded
    console.log('3. Waiting for form to load...');
    await page.waitForSelector('input[name="email"]', { state: 'visible' });
    await page.waitForSelector('input[name="password"]', { state: 'visible' });
    await page.waitForSelector('button[type="submit"]', { state: 'visible' });
    
    // Clear and fill email field
    console.log('4. Filling email field...');
    await page.click('input[name="email"]');
    await page.fill('input[name="email"]', '');
    await page.type('input[name="email"]', TEST_MEMBER.email);
    
    // Wait for a moment to let validation run
    await page.waitForTimeout(500);
    
    // Check if there are validation errors
    const emailError = await page.locator('text=Please enter a valid email address').count();
    console.log('Email validation error count:', emailError);
    
    // Clear and fill password field
    console.log('5. Filling password field...');
    await page.click('input[name="password"]');
    await page.fill('input[name="password"]', '');
    await page.type('input[name="password"]', TEST_MEMBER.password);
    
    // Wait for validation
    await page.waitForTimeout(500);
    
    // Check current page state
    const currentUrl = page.url();
    console.log('Current URL before submit:', currentUrl);
    
    // Try to submit the form
    console.log('6. Submitting form...');
    await page.click('button[type="submit"]');
    
    // Wait for some time to see what happens
    await page.waitForTimeout(3000);
    
    // Check new URL
    const newUrl = page.url();
    console.log('URL after submit:', newUrl);
    
    // Check if we're still on signin page or moved somewhere else
    if (newUrl.includes('/auth/signin')) {
      console.log('❌ Still on signin page - login failed');
      
      // Check for any error messages
      const errorMessages = await page.locator('text=/error|Error|invalid|Invalid|failed|Failed/').allTextContents();
      console.log('Error messages found:', errorMessages);
      
      // Check form field values
      const emailValue = await page.inputValue('input[name="email"]');
      const passwordValue = await page.inputValue('input[name="password"]');
      console.log('Form values - Email:', emailValue, 'Password length:', passwordValue.length);
      
    } else {
      console.log('✅ Login successful - redirected to:', newUrl);
      await expect(page).toHaveURL(/\/member/);
    }
  });
});
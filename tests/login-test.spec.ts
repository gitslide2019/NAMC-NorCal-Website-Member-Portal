import { test, expect } from '@playwright/test';

test.describe('Login Test', () => {
  const TEST_MEMBER = {
    email: 'member@namc-norcal.org',
    password: 'member123'
  };

  test('Basic login functionality', async ({ page }) => {
    // Navigate to homepage
    await page.goto('/');
    
    // Click Sign In button
    await page.click('text=Sign In');
    await expect(page).toHaveURL('/auth/signin');
    
    // Fill in login form
    await page.fill('input[name="email"]', TEST_MEMBER.email);
    await page.fill('input[name="password"]', TEST_MEMBER.password);
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Wait for redirect to member area
    await page.waitForURL(/\/member/, { timeout: 15000 });
    
    // Verify we're logged in
    await expect(page).toHaveURL(/\/member/);
    console.log('✅ Login successful!');
  });
});
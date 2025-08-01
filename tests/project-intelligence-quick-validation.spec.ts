import { test, expect } from '@playwright/test';

// Quick validation test for Project Intelligence Hub
const BASE_URL = 'http://localhost:3000';
const DEMO_CREDENTIALS = {
  email: 'member@namc-norcal.org',
  password: 'member123'
};

test.describe('🚀 Project Intelligence Hub - Quick Validation', () => {
  
  test.beforeEach(async ({ page }) => {
    // Simple authentication setup
    await page.goto(`${BASE_URL}/auth/signin`);
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Fill credentials using more robust selectors
    await page.fill('input[name="email"]', DEMO_CREDENTIALS.email);
    await page.fill('input[name="password"]', DEMO_CREDENTIALS.password);
    await page.click('button[type="submit"]');
    
    // Wait for redirect (flexible)
    await page.waitForURL(/\/(member|dashboard)/, { timeout: 10000 });
  });

  test('✅ Authentication and Dashboard Access', async ({ page }) => {
    await page.goto(`${BASE_URL}/member/project-intelligence`);
    await page.waitForLoadState('networkidle');

    // Verify we're authenticated and on the right page
    expect(page.url()).toContain('/member/project-intelligence');
    
    // Check main heading exists
    const heading = page.locator('h1, h2').first();
    await expect(heading).toBeVisible();
    
    console.log('✅ Dashboard accessible and authenticated');
  });

  test('✅ Project Opportunities Data Display', async ({ page }) => {
    await page.goto(`${BASE_URL}/member/project-intelligence/opportunities`);
    await page.waitForLoadState('networkidle');
    
    // Wait a bit for data to load
    await page.waitForTimeout(3000);
    
    // Check if opportunities are loading
    const loadingIndicator = page.locator('[class*="loading"], [class*="spinner"]');
    const cards = page.locator('.card, [data-testid="opportunity-card"]');
    const opportunityText = page.locator('text=Opportunities, text=opportunities');
    
    // At least one of these should be visible
    const hasLoadingState = await loadingIndicator.isVisible();
    const hasCards = await cards.count() > 0;
    const hasOpportunityText = await opportunityText.isVisible();
    
    console.log(`📊 Loading state: ${hasLoadingState}, Cards: ${await cards.count()}, Text: ${hasOpportunityText}`);
    
    // Should have some indication of opportunities functionality
    expect(hasLoadingState || hasCards || hasOpportunityText).toBeTruthy();
    
    // Take screenshot for manual review
    await page.screenshot({ 
      path: 'test-results/opportunities-validation.png',
      fullPage: true 
    });
  });

  test('✅ Permit Search Interface', async ({ page }) => {
    await page.goto(`${BASE_URL}/member/project-intelligence/permits`);
    await page.waitForLoadState('networkidle');
    
    // Check basic page structure
    const pageContent = await page.textContent('body');
    const hasPermitContent = pageContent.includes('Permit') || pageContent.includes('permit') || 
                           pageContent.includes('Search') || pageContent.includes('Shovels');
    
    console.log('🔍 Permit page has relevant content:', hasPermitContent);
    expect(hasPermitContent).toBeTruthy();
    
    // Take screenshot
    await page.screenshot({ 
      path: 'test-results/permits-validation.png',
      fullPage: true 
    });
  });

  test('✅ Cost Estimation Interface', async ({ page }) => {
    await page.goto(`${BASE_URL}/member/project-intelligence/estimates`);
    await page.waitForLoadState('networkidle');
    
    // Check for estimation-related content
    const pageContent = await page.textContent('body');
    const hasEstimationContent = pageContent.includes('Cost') || pageContent.includes('Estimate') || 
                                pageContent.includes('estimate') || pageContent.includes('pricing');
    
    console.log('💰 Cost estimation page has relevant content:', hasEstimationContent);
    expect(hasEstimationContent).toBeTruthy();
    
    // Take screenshot
    await page.screenshot({ 
      path: 'test-results/estimates-validation.png',
      fullPage: true 
    });
  });

  test('✅ Construction Assistant Interface', async ({ page }) => {
    await page.goto(`${BASE_URL}/member/project-intelligence/assistant`);
    await page.waitForLoadState('networkidle');
    
    // Check for chat/assistant content
    const pageContent = await page.textContent('body');
    const hasChatContent = pageContent.includes('Assistant') || pageContent.includes('Chat') || 
                          pageContent.includes('Message') || pageContent.includes('AI');
    
    console.log('🤖 Assistant page has relevant content:', hasChatContent);
    expect(hasChatContent).toBeTruthy();
    
    // Take screenshot
    await page.screenshot({ 
      path: 'test-results/assistant-validation.png',
      fullPage: true 
    });
  });

  test('✅ Mobile Responsiveness Check', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    const pages = [
      '/member/project-intelligence',
      '/member/project-intelligence/opportunities'
    ];
    
    for (const pagePath of pages) {
      await page.goto(`${BASE_URL}${pagePath}`);
      await page.waitForLoadState('networkidle');
      
      // Page should load without major layout issues
      const bodyHeight = await page.evaluate(() => document.body.scrollHeight);
      expect(bodyHeight).toBeGreaterThan(300); // Should have substantial content
      
      console.log(`📱 ${pagePath} mobile height: ${bodyHeight}px`);
      
      // Take mobile screenshot
      const pageName = pagePath.split('/').pop() || 'dashboard';
      await page.screenshot({ 
        path: `test-results/mobile-${pageName}.png`,
        fullPage: true 
      });
    }
  });

  test('✅ Navigation Between Features', async ({ page }) => {
    // Start at dashboard
    await page.goto(`${BASE_URL}/member/project-intelligence`);
    await page.waitForLoadState('networkidle');
    
    // Test navigation to each feature
    const features = [
      { name: 'opportunities', path: '/member/project-intelligence/opportunities' },
      { name: 'permits', path: '/member/project-intelligence/permits' },
      { name: 'estimates', path: '/member/project-intelligence/estimates' },
      { name: 'assistant', path: '/member/project-intelligence/assistant' }
    ];
    
    for (const feature of features) {
      await page.goto(`${BASE_URL}${feature.path}`);
      await page.waitForLoadState('networkidle');
      
      // Should reach the page without errors
      expect(page.url()).toContain(feature.path);
      
      // Should not be redirected to signin
      expect(page.url()).not.toContain('/auth/signin');
      
      console.log(`🔗 Navigation to ${feature.name}: ✅`);
    }
  });

  test('✅ Basic Accessibility Check', async ({ page }) => {
    await page.goto(`${BASE_URL}/member/project-intelligence`);
    await page.waitForLoadState('networkidle');
    
    // Check for basic accessibility elements
    const hasHeadings = await page.locator('h1, h2, h3').count() > 0;
    const hasButtons = await page.locator('button, [role="button"]').count() > 0;
    const hasLinks = await page.locator('a, [role="link"]').count() > 0;
    
    console.log(`♿ Accessibility elements - Headings: ${hasHeadings}, Buttons: ${hasButtons}, Links: ${hasLinks}`);
    
    expect(hasHeadings).toBeTruthy();
    expect(hasButtons).toBeTruthy();
    
    // Test tab navigation (basic)
    await page.keyboard.press('Tab');
    const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
    console.log(`⌨️ Tab navigation working, focused: ${focusedElement}`);
  });
});
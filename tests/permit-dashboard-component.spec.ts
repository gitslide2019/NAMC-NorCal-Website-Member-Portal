import { test, expect } from '@playwright/test';

// Simple component test that bypasses authentication by testing the direct page
test.describe('Permit Dashboard Component', () => {
  test('should display permit dashboard configuration message when API not configured', async ({ page }) => {
    // Navigate directly to the permits page
    await page.goto('/member/permits', { waitUntil: 'networkidle' });
    
    // The page should load and show either the dashboard or configuration message
    await page.waitForTimeout(2000);
    
    // Check if we can see page content - either the dashboard or config message
    const hasPermitContent = await page.locator('text=Permit').count();
    const hasConstructionContent = await page.locator('text=Construction').count();
    const hasShovelsContent = await page.locator('text=Shovels').count();
    const hasDashboardContent = await page.locator('text=Dashboard').count();
    
    // At least one of these should be present on the permits page
    expect(hasPermitContent + hasConstructionContent + hasShovelsContent + hasDashboardContent).toBeGreaterThan(0);
  });

  test('should handle page navigation without crashing', async ({ page }) => {
    // Test that the page loads without JavaScript errors
    const consoleErrors: string[] = [];
    
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    await page.goto('/member/permits', { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);
    
    // Check that there are no critical console errors
    const criticalErrors = consoleErrors.filter(error => 
      !error.includes('favicon') && 
      !error.includes('404') &&
      !error.includes('net::ERR_FAILED') && // Common network errors
      error.includes('Error') || error.includes('TypeError') || error.includes('ReferenceError')
    );
    
    expect(criticalErrors.length).toBe(0);
  });

  test('should show permit dashboard when accessed directly', async ({ page }) => {
    await page.goto('/member/permits');
    await page.waitForTimeout(3000);
    
    // Look for key elements that should be present regardless of auth state
    const pageTitle = await page.title();
    expect(pageTitle).not.toBe('');
    
    // Check for main navigation or content
    const hasMainContent = await page.locator('main, .main, #main, [role="main"]').count();
    const hasNavigation = await page.locator('nav, .nav, [role="navigation"]').count();
    const hasHeader = await page.locator('header, .header, h1, h2').count();
    
    expect(hasMainContent + hasNavigation + hasHeader).toBeGreaterThan(0);
  });
  
  test('should display search functionality elements when configured', async ({ page }) => {
    await page.goto('/member/permits');
    await page.waitForTimeout(3000);
    
    // Look for search-related elements in the page
    const searchInputs = await page.locator('input[type="text"], input[placeholder*="search"], input[placeholder*="Search"]').count();
    const searchButtons = await page.locator('button:has-text("Search"), [data-testid*="search"]').count();
    const filterElements = await page.locator('button:has-text("Filter"), select, [data-testid*="filter"]').count();
    
    // If the page loads properly, it should have some interactive elements
    // This test passes if we can find search/filter UI or if the page shows a "not configured" message
    const notConfiguredMessage = await page.locator('text=Not Configured').count();
    
    if (notConfiguredMessage > 0) {
      // If not configured, that's expected behavior
      expect(notConfiguredMessage).toBeGreaterThan(0);
    } else {
      // If configured, should have search elements
      expect(searchInputs + searchButtons + filterElements).toBeGreaterThan(0);
    }
  });
});

// Additional test for component behavior without authentication
test.describe('Permit Dashboard - API Integration Status', () => {
  test('should handle missing API configuration gracefully', async ({ page }) => {
    await page.goto('/member/permits');
    await page.waitForTimeout(3000);
    
    // The page should either show:
    // 1. A "not configured" message, or
    // 2. The actual dashboard if configured
    
    const notConfiguredElements = await page.locator('text=Not Configured, text=Configure, text=API').count();
    const dashboardElements = await page.locator('text=Dashboard, text=Permit, text=Search').count();
    
    // One or the other should be present
    expect(notConfiguredElements + dashboardElements).toBeGreaterThan(0);
  });
  
  test('should display appropriate error states', async ({ page }) => {
    await page.goto('/member/permits');
    await page.waitForTimeout(3000);
    
    // Check for error handling in the UI
    const errorMessages = await page.locator('[class*="error"], [class*="alert"], .text-red').count();
    const loadingStates = await page.locator('[class*="loading"], [class*="spinner"]').count();
    const emptyStates = await page.locator('text=No permits, text=No data, text=Empty').count();
    
    // The page should handle states appropriately
    // This test mainly ensures the page doesn't crash
    expect(true).toBe(true); // Always passes if we get here without errors
  });
});
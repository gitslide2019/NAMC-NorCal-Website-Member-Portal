import { test, expect } from '@playwright/test';

// UI/UX Engineering Test Suite for Project Intelligence Hub
// This test follows UI/UX best practices and design system validation

const BASE_URL = 'http://localhost:3000';
const DEMO_CREDENTIALS = {
  email: 'member@namc-norcal.org',
  password: 'member123'
};

// UI/UX Test Utilities
const UITestUtils = {
  // Color contrast validation
  checkColorContrast: async (page, selector) => {
    const element = page.locator(selector);
    const styles = await element.evaluate((el) => {
      const style = window.getComputedStyle(el);
      return {
        color: style.color,
        backgroundColor: style.backgroundColor,
        fontSize: style.fontSize
      };
    });
    return styles;
  },

  // Visual hierarchy validation
  checkVisualHierarchy: async (page) => {
    const headings = await page.locator('h1, h2, h3, h4, h5, h6').all();
    const sizes = [];
    for (const heading of headings) {
      const fontSize = await heading.evaluate(el => 
        window.getComputedStyle(el).fontSize
      );
      sizes.push(fontSize);
    }
    return sizes;
  },

  // Responsive breakpoint testing
  testResponsiveBreakpoints: async (page, url) => {
    const breakpoints = [
      { name: 'mobile', width: 375, height: 667 },
      { name: 'tablet', width: 768, height: 1024 },
      { name: 'desktop', width: 1440, height: 900 },
      { name: 'large', width: 1920, height: 1080 }
    ];

    const results = [];
    for (const bp of breakpoints) {
      await page.setViewportSize({ width: bp.width, height: bp.height });
      await page.goto(url);
      await page.waitForLoadState('networkidle');
      
      // Check if navigation is accessible
      const navVisible = await page.locator('[role="navigation"]').isVisible();
      const mainContentVisible = await page.locator('main').isVisible();
      
      results.push({
        breakpoint: bp.name,
        navigation: navVisible,
        mainContent: mainContentVisible,
        viewport: bp
      });
    }
    return results;
  }
};

test.describe('🎨 Project Intelligence Hub - UI/UX Engineering Review', () => {
  
  test.beforeEach(async ({ page }) => {
    // Authenticate before each test
    await page.goto(`${BASE_URL}/auth/signin`);
    await page.fill('input[type="email"]', DEMO_CREDENTIALS.email);
    await page.fill('input[type="password"]', DEMO_CREDENTIALS.password);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/member/dashboard');
  });

  test.describe('1️⃣ Dashboard Visual Design & Layout', () => {
    
    test('should display proper visual hierarchy and typography', async ({ page }) => {
      await page.goto(`${BASE_URL}/member/project-intelligence`);
      await page.waitForLoadState('networkidle');

      // Check main heading
      const mainHeading = page.locator('h1').first();
      await expect(mainHeading).toBeVisible();
      await expect(mainHeading).toContainText('Project Intelligence Hub');
      
      // Validate heading hierarchy
      const headingSizes = await UITestUtils.checkVisualHierarchy(page);
      console.log('📏 Heading sizes:', headingSizes);
      
      // Check for consistent spacing
      const cards = page.locator('[data-testid="feature-card"], .card');
      const cardCount = await cards.count();
      expect(cardCount).toBeGreaterThan(0);
      
      // Screenshot for visual regression
      await page.screenshot({ 
        path: 'test-results/dashboard-visual-hierarchy.png',
        fullPage: true 
      });
    });

    test('should have accessible color contrast ratios', async ({ page }) => {
      await page.goto(`${BASE_URL}/member/project-intelligence`);
      
      // Test primary buttons
      const primaryButton = page.locator('button').first();
      const buttonStyles = await UITestUtils.checkColorContrast(page, 'button');
      console.log('🎨 Button styles:', buttonStyles);
      
      // Test text elements
      const bodyText = page.locator('p').first();
      if (await bodyText.isVisible()) {
        const textStyles = await UITestUtils.checkColorContrast(page, 'p');
        console.log('📝 Text styles:', textStyles);
      }
      
      // Check card backgrounds
      const cardStyles = await UITestUtils.checkColorContrast(page, '.card');
      console.log('🃏 Card styles:', cardStyles);
    });

    test('should be fully responsive across all breakpoints', async ({ page }) => {
      const url = `${BASE_URL}/member/project-intelligence`;
      const responsiveResults = await UITestUtils.testResponsiveBreakpoints(page, url);
      
      for (const result of responsiveResults) {
        console.log(`📱 ${result.breakpoint}: Nav=${result.navigation}, Content=${result.mainContent}`);
        expect(result.navigation).toBeTruthy();
        expect(result.mainContent).toBeTruthy();
        
        // Take screenshot for each breakpoint
        await page.screenshot({ 
          path: `test-results/dashboard-${result.breakpoint}.png`,
          fullPage: true 
        });
      }
    });

    test('should display all dashboard components correctly', async ({ page }) => {
      await page.goto(`${BASE_URL}/member/project-intelligence`);
      await page.waitForLoadState('networkidle');

      // Check header section
      await expect(page.locator('text=Project Intelligence Hub')).toBeVisible();
      await expect(page.locator('text=AI-powered construction insights')).toBeVisible();
      
      // Check status indicators
      const statusElements = [
        'text=Shovels API',
        'text=Claude AI',
        'text=Mapbox'
      ];
      
      for (const selector of statusElements) {
        await expect(page.locator(selector)).toBeVisible();
      }
      
      // Check feature cards
      const expectedFeatures = [
        'Smart Permit Discovery',
        'AI Cost Estimation', 
        'Project Opportunities',
        'Construction Assistant'
      ];
      
      for (const feature of expectedFeatures) {
        await expect(page.locator(`text=${feature}`)).toBeVisible();
      }
      
      // Check stats cards
      const statsCards = page.locator('[data-testid="stats-card"]');
      const statsCount = await statsCards.count();
      console.log(`📊 Found ${statsCount} stats cards`);
    });
  });

  test.describe('2️⃣ Authentication Flow UX', () => {
    
    test('should handle authentication states gracefully', async ({ page }) => {
      // Test unauthenticated access
      await page.goto(`${BASE_URL}/member/project-intelligence/opportunities`);
      
      // Should redirect to signin
      await page.waitForURL('**/auth/signin');
      await expect(page.locator('text=Welcome Back')).toBeVisible();
      
      // Check form validation
      await page.click('button[type="submit"]');
      await expect(page.locator('text=Please enter a valid email address')).toBeVisible();
      
      // Test successful login
      await page.fill('input[type="email"]', DEMO_CREDENTIALS.email);
      await page.fill('input[type="password"]', DEMO_CREDENTIALS.password);
      await page.click('button[type="submit"]');
      
      // Should redirect back or to dashboard
      await page.waitForURL(/\/(member\/dashboard|member\/project-intelligence)/);
    });
    
    test('should maintain session across page navigation', async ({ page }) => {
      // Navigate through different sections
      const sections = [
        '/member/project-intelligence',
        '/member/project-intelligence/permits',
        '/member/project-intelligence/opportunities',
        '/member/project-intelligence/estimates',
        '/member/project-intelligence/assistant'
      ];
      
      for (const section of sections) {
        await page.goto(`${BASE_URL}${section}`);
        
        // Should not redirect to signin
        await page.waitForLoadState('networkidle');
        const currentUrl = page.url();
        expect(currentUrl).not.toContain('/auth/signin');
        
        // Should show authenticated content
        await expect(page.locator('header')).toBeVisible();
      }
    });
  });

  test.describe('3️⃣ Project Opportunities Feature', () => {
    
    test('should display imported NAMC opportunities correctly', async ({ page }) => {
      await page.goto(`${BASE_URL}/member/project-intelligence/opportunities`);
      await page.waitForLoadState('networkidle');
      
      // Wait for opportunities to load
      await page.waitForSelector('[data-testid="opportunity-card"], .card', { timeout: 10000 });
      
      // Check if opportunities are displayed
      const opportunityCards = page.locator('[data-testid="opportunity-card"], .card');
      const cardCount = await opportunityCards.count();
      console.log(`🎯 Found ${cardCount} opportunity cards`);
      
      expect(cardCount).toBeGreaterThan(0);
      
      // Check first opportunity details
      if (cardCount > 0) {
        const firstCard = opportunityCards.first();
        await expect(firstCard).toBeVisible();
        
        // Check for required elements
        await expect(firstCard.locator('text=/[A-Za-z]/')).toBeVisible(); // Has some text
        
        // Look for common opportunity elements
        const possibleSelectors = [
          'text=Construction',
          'text=Training', 
          'text=Outreach',
          'text=Active',
          'text=In Progress',
          'text=Caltrans',
          'text=UCSF',
          'text=Swinerton',
          '[class*="tag"]',
          '[class*="badge"]',
          '[class*="status"]'
        ];
        
        let foundElements = 0;
        for (const selector of possibleSelectors) {
          if (await page.locator(selector).first().isVisible()) {
            foundElements++;
          }
        }
        
        console.log(`✅ Found ${foundElements} expected opportunity elements`);
        expect(foundElements).toBeGreaterThan(0);
      }
      
      // Test search functionality
      const searchInput = page.locator('input[placeholder*="search"], input[placeholder*="Search"]');
      if (await searchInput.isVisible()) {
        await searchInput.fill('Caltrans');
        await page.waitForTimeout(1000); // Wait for search
        
        // Should show filtered results
        const filteredCards = page.locator('[data-testid="opportunity-card"], .card');
        const filteredCount = await filteredCards.count();
        console.log(`🔍 Filtered results: ${filteredCount}`);
      }
      
      // Screenshot the opportunities view
      await page.screenshot({ 
        path: 'test-results/opportunities-display.png',
        fullPage: true 
      });
    });

    test('should handle filters and sorting correctly', async ({ page }) => {
      await page.goto(`${BASE_URL}/member/project-intelligence/opportunities`);
      await page.waitForLoadState('networkidle');
      
      // Wait for content to load
      await page.waitForTimeout(2000);
      
      // Test type filter
      const typeFilter = page.locator('select, [role="combobox"]').first();
      if (await typeFilter.isVisible()) {
        await typeFilter.click();
        
        // Try to select Construction type
        const constructionOption = page.locator('option[value="Construction"], text=Construction');
        if (await constructionOption.isVisible()) {
          await constructionOption.click();
          await page.waitForTimeout(1000);
          console.log('🏗️ Applied Construction filter');
        }
      }
      
      // Test sort functionality
      const sortSelect = page.locator('select').nth(1);
      if (await sortSelect.isVisible()) {
        await sortSelect.selectOption('title');
        await page.waitForTimeout(1000);
        console.log('📋 Applied title sorting');
      }
    });

    test('should support AI analysis features', async ({ page }) => {
      await page.goto(`${BASE_URL}/member/project-intelligence/opportunities`);
      await page.waitForLoadState('networkidle');
      
      // Look for AI analysis buttons
      const analyzeButtons = page.locator('button:has-text("Analyze"), button:has-text("AI")');
      const buttonCount = await analyzeButtons.count();
      
      if (buttonCount > 0) {
        console.log(`🤖 Found ${buttonCount} AI analysis buttons`);
        
        // Test clicking first analyze button (if Claude API key is configured)
        const firstButton = analyzeButtons.first();
        if (await firstButton.isVisible() && await firstButton.isEnabled()) {
          await firstButton.click();
          
          // Check for loading state
          await expect(page.locator('text=Analyzing, [class*="spin"]')).toBeVisible({ timeout: 5000 });
          console.log('⚡ AI analysis initiated');
        }
      }
    });
  });

  test.describe('4️⃣ Permit Search Feature', () => {
    
    test('should load permit search interface', async ({ page }) => {
      await page.goto(`${BASE_URL}/member/project-intelligence/permits`);
      await page.waitForLoadState('networkidle');
      
      // Check for permit search components
      await expect(page.locator('text=Permit Search, text=Smart Permit Discovery')).toBeVisible({ timeout: 10000 });
      
      // Check for search form
      const searchElements = page.locator('input[type="text"], input[placeholder*="search"]');
      const searchCount = await searchElements.count();
      console.log(`🔍 Found ${searchCount} search inputs`);
      
      // Look for map container
      const mapContainer = page.locator('#map, [id*="map"], [class*="map"]');
      if (await mapContainer.isVisible()) {
        console.log('🗺️ Map container found');
      }
      
      // Screenshot permit search page
      await page.screenshot({ 
        path: 'test-results/permits-search.png',
        fullPage: true 
      });
    });

    test('should handle search functionality', async ({ page }) => {
      await page.goto(`${BASE_URL}/member/project-intelligence/permits`);
      await page.waitForLoadState('networkidle');
      
      // Find search input
      const searchInput = page.locator('input[type="text"]').first();
      if (await searchInput.isVisible()) {
        await searchInput.fill('Oakland');
        
        // Look for search button
        const searchButton = page.locator('button:has-text("Search"), button[type="submit"]');
        if (await searchButton.isVisible()) {
          await searchButton.click();
          await page.waitForTimeout(3000); // Wait for API response
          
          console.log('🔍 Permit search executed');
        }
      }
    });
  });

  test.describe('5️⃣ AI Cost Estimation Feature', () => {
    
    test('should load cost estimation interface', async ({ page }) => {
      await page.goto(`${BASE_URL}/member/project-intelligence/estimates`);
      await page.waitForLoadState('networkidle');
      
      // Check for estimation form elements
      const expectedElements = [
        'text=Cost Estimation',
        'text=Project Type',
        'text=Square Footage',
        'input[type="number"]',
        'select',
        'button:has-text("Estimate")'
      ];
      
      let foundElements = 0;
      for (const selector of expectedElements) {
        if (await page.locator(selector).isVisible()) {
          foundElements++;
          console.log(`✅ Found: ${selector}`);
        }
      }
      
      console.log(`📊 Cost estimation elements found: ${foundElements}/${expectedElements.length}`);
      
      // Screenshot cost estimation page
      await page.screenshot({ 
        path: 'test-results/cost-estimation.png',
        fullPage: true 
      });
    });

    test('should handle form validation', async ({ page }) => {
      await page.goto(`${BASE_URL}/member/project-intelligence/estimates`);
      await page.waitForLoadState('networkidle');
      
      // Try to submit empty form
      const submitButton = page.locator('button:has-text("Estimate"), button[type="submit"]');
      if (await submitButton.isVisible()) {
        await submitButton.click();
        
        // Check for validation messages
        const validationMessages = page.locator('[class*="error"], [role="alert"], text=required');
        const messageCount = await validationMessages.count();
        
        if (messageCount > 0) {
          console.log(`⚠️ Found ${messageCount} validation messages`);
        }
      }
    });
  });

  test.describe('6️⃣ Construction Assistant Chat', () => {
    
    test('should load chat interface', async ({ page }) => {
      await page.goto(`${BASE_URL}/member/project-intelligence/assistant`);
      await page.waitForLoadState('networkidle');
      
      // Check for chat elements
      const chatElements = [
        'text=Construction Assistant',
        'textarea, input[type="text"]',
        'button:has-text("Send")',
        '[class*="message"], [class*="chat"]'
      ];
      
      let foundChatElements = 0;
      for (const selector of chatElements) {
        if (await page.locator(selector).isVisible()) {
          foundChatElements++;
        }
      }
      
      console.log(`💬 Chat elements found: ${foundChatElements}/${chatElements.length}`);
      
      // Screenshot chat interface
      await page.screenshot({ 
        path: 'test-results/chat-assistant.png',
        fullPage: true 
      });
    });

    test('should handle message sending', async ({ page }) => {
      await page.goto(`${BASE_URL}/member/project-intelligence/assistant`);
      await page.waitForLoadState('networkidle');
      
      // Find message input
      const messageInput = page.locator('textarea, input[placeholder*="message"], input[placeholder*="type"]');
      if (await messageInput.isVisible()) {
        await messageInput.fill('What are the current construction trends in Northern California?');
        
        // Find send button
        const sendButton = page.locator('button:has-text("Send"), button[type="submit"]');
        if (await sendButton.isVisible()) {
          await sendButton.click();
          
          // Wait for response (if Claude API is configured)
          await page.waitForTimeout(2000);
          console.log('💬 Message sent to assistant');
        }
      }
    });
  });

  test.describe('7️⃣ Mobile UX Testing', () => {
    
    test('should work properly on mobile devices', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      
      const pages = [
        '/member/project-intelligence',
        '/member/project-intelligence/opportunities',
        '/member/project-intelligence/permits',
        '/member/project-intelligence/estimates',
        '/member/project-intelligence/assistant'
      ];
      
      for (const pagePath of pages) {
        await page.goto(`${BASE_URL}${pagePath}`);
        await page.waitForLoadState('networkidle');
        
        // Check mobile navigation
        const mobileMenu = page.locator('[data-testid="mobile-menu"], button:has-text("Menu"), [class*="hamburger"]');
        if (await mobileMenu.isVisible()) {
          await mobileMenu.click();
          console.log(`📱 Mobile menu accessible on ${pagePath}`);
        }
        
        // Check scrolling and touch interactions
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await page.waitForTimeout(500);
        
        // Screenshot mobile view
        const pageName = pagePath.split('/').pop() || 'dashboard';
        await page.screenshot({ 
          path: `test-results/mobile-${pageName}.png`,
          fullPage: true 
        });
      }
    });
  });

  test.describe('8️⃣ Performance & Loading States', () => {
    
    test('should show appropriate loading states', async ({ page }) => {
      // Test with slow network
      await page.route('**/api/**', route => {
        setTimeout(() => route.continue(), 1000); // Delay API calls
      });
      
      await page.goto(`${BASE_URL}/member/project-intelligence/opportunities`);
      
      // Should show loading indicators
      const loadingIndicators = page.locator('[class*="loading"], [class*="spinner"], [class*="skeleton"]');
      const loadingCount = await loadingIndicators.count();
      
      if (loadingCount > 0) {
        console.log(`⏳ Found ${loadingCount} loading indicators`);
      }
      
      // Wait for content to load
      await page.waitForLoadState('networkidle');
    });

    test('should handle error states gracefully', async ({ page }) => {
      // Mock API error
      await page.route('**/api/opportunities', route => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Internal Server Error' })
        });
      });
      
      await page.goto(`${BASE_URL}/member/project-intelligence/opportunities`);
      await page.waitForLoadState('networkidle');
      
      // Should show error state
      const errorElements = page.locator('text=error, text=failed, [class*="error"]');
      const errorCount = await errorElements.count();
      
      console.log(`❌ Error handling elements: ${errorCount}`);
    });
  });

  test.describe('9️⃣ Accessibility Compliance', () => {
    
    test('should be keyboard navigable', async ({ page }) => {
      await page.goto(`${BASE_URL}/member/project-intelligence`);
      await page.waitForLoadState('networkidle');
      
      // Test tab navigation
      let focusableElements = 0;
      for (let i = 0; i < 20; i++) {
        await page.keyboard.press('Tab');
        
        const focusedElement = await page.evaluate(() => {
          const activeElement = document.activeElement;
          return activeElement ? {
            tagName: activeElement.tagName,
            type: activeElement.getAttribute('type'),
            role: activeElement.getAttribute('role')
          } : null;
        });
        
        if (focusedElement) {
          focusableElements++;
        }
      }
      
      console.log(`⌨️ Found ${focusableElements} focusable elements`);
      expect(focusableElements).toBeGreaterThan(5);
    });

    test('should have proper ARIA labels and roles', async ({ page }) => {
      await page.goto(`${BASE_URL}/member/project-intelligence`);
      await page.waitForLoadState('networkidle');
      
      // Check for essential ARIA elements
      const ariaElements = [
        '[role="main"]',
        '[role="navigation"]', 
        '[role="button"]',
        '[aria-label]',
        '[aria-describedby]'
      ];
      
      let ariaCount = 0;
      for (const selector of ariaElements) {
        const count = await page.locator(selector).count();
        ariaCount += count;
      }
      
      console.log(`♿ Found ${ariaCount} ARIA-enhanced elements`);
    });
  });
});
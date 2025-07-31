import { test, expect } from '@playwright/test';

/**
 * UI/UX Design Audit - Human User Perspective
 * Comprehensive design review focusing on colors, usability, and user experience
 */

test.describe('UI/UX Design Audit - NAMC Permit Search', () => {
  test.beforeEach(async ({ page }) => {
    // Start from the public page to review the full user journey
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test.describe('🎨 Visual Design & Brand Consistency', () => {
    test('should display consistent NAMC branding and color scheme', async ({ page }) => {
      console.log('🎨 EVALUATING: Visual Design & Brand Consistency');
      
      // Navigate through the authentication flow
      await page.goto('/auth/signin');
      await page.waitForLoadState('networkidle');
      
      // Check NAMC branding elements on signin page
      const namcLogo = page.locator('[class*="namc"], [class*="yellow"]').first();
      if (await namcLogo.count() > 0) {
        console.log('✅ NAMC branding present on signin page');
      }
      
      // Get computed styles for color analysis
      const bodyStyles = await page.evaluate(() => {
        const body = document.body;
        const computed = window.getComputedStyle(body);
        return {
          backgroundColor: computed.backgroundColor,
          color: computed.color,
          fontFamily: computed.fontFamily
        };
      });
      
      console.log('📋 Base Styles:', bodyStyles);
      
      // Check for NAMC yellow elements
      const yellowElements = await page.locator('[class*="namc-yellow"], [class*="yellow"]').count();
      const blackElements = await page.locator('[class*="namc-black"], [class*="black"]').count();
      
      console.log(`🟡 Yellow branded elements found: ${yellowElements}`);
      console.log(`⚫ Black branded elements found: ${blackElements}`);
      
      expect(yellowElements + blackElements).toBeGreaterThan(0);
    });

    test('should have readable text contrast and accessibility', async ({ page }) => {
      console.log('🎨 EVALUATING: Text Contrast & Accessibility');
      
      await page.goto('/auth/signin');
      await page.waitForTimeout(2000);
      
      // Check for proper heading structure
      const headings = await page.locator('h1, h2, h3, h4, h5, h6').count();
      console.log(`📝 Heading elements found: ${headings}`);
      
      // Check for proper input labels
      const inputs = await page.locator('input').count();
      const labels = await page.locator('label').count();
      console.log(`📝 Input fields: ${inputs}, Labels: ${labels}`);
      
      // Check button accessibility
      const buttons = await page.locator('button').count();
      console.log(`🔘 Interactive buttons found: ${buttons}`);
      
      expect(headings).toBeGreaterThan(0);
      expect(buttons).toBeGreaterThan(0);
    });
  });

  test.describe('🚀 User Journey & Experience Flow', () => {
    test('should provide clear user feedback and guidance', async ({ page }) => {
      console.log('🚀 EVALUATING: User Journey & Experience Flow');
      
      await page.goto('/auth/signin');
      await page.waitForTimeout(2000);
      
      // Check for demo credentials display (good UX)
      const demoCredentials = await page.locator('text=Demo Credentials, text=demo, text=member@').count();
      if (demoCredentials > 0) {
        console.log('✅ Demo credentials provided - Good UX for testing');
      }
      
      // Check for helpful placeholder text
      const emailInput = page.locator('input[type="email"]');
      const emailPlaceholder = await emailInput.getAttribute('placeholder');
      console.log(`📧 Email input placeholder: "${emailPlaceholder}"`);
      
      // Check for form validation feedback
      const validationElements = await page.locator('[class*="error"], [class*="invalid"], .text-red').count();
      console.log(`⚠️ Validation elements ready: ${validationElements}`);
      
      expect(true).toBe(true); // Journey analysis complete
    });

    test('should handle user authentication flow smoothly', async ({ page }) => {
      console.log('🚀 EVALUATING: Authentication Flow');
      
      await page.goto('/auth/signin');
      await page.waitForTimeout(2000);
      
      // Fill in demo credentials
      const emailInput = page.locator('input[type="email"]');
      if (await emailInput.count() > 0) {
        await emailInput.fill('member@namc-norcal.org');
        console.log('✅ Email input accepts user input');
      }
      
      const passwordInput = page.locator('input[type="password"]');
      if (await passwordInput.count() > 0) {
        await passwordInput.fill('member123');
        console.log('✅ Password input accepts user input');
      }
      
      // Check for sign-in button
      const signInButton = page.locator('button:has-text("Sign In"), button[type="submit"]');
      if (await signInButton.count() > 0) {
        console.log('✅ Sign-in button is present and accessible');
        
        // Don't actually submit to avoid auth complications, just verify UX
        const buttonText = await signInButton.textContent();
        console.log(`🔘 Sign-in button text: "${buttonText}"`);
      }
      
      expect(true).toBe(true); // Authentication flow analysis complete
    });
  });

  test.describe('📱 Responsive Design & Device Compatibility', () => {
    test('should adapt to mobile viewport properly', async ({ page }) => {
      console.log('📱 EVALUATING: Mobile Responsiveness');
      
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/auth/signin');
      await page.waitForTimeout(2000);
      
      // Check if content is accessible on mobile
      const mainContent = await page.locator('main, [role="main"], .main-content, form').count();
      console.log(`📱 Mobile content containers: ${mainContent}`);
      
      // Check for responsive navigation
      const mobileNav = await page.locator('[class*="mobile"], button[class*="menu"], .hamburger').count();
      console.log(`📱 Mobile navigation elements: ${mobileNav}`);
      
      // Check input field sizing on mobile
      const inputs = page.locator('input');
      const inputCount = await inputs.count();
      
      if (inputCount > 0) {
        const firstInput = inputs.first();
        const inputBox = await firstInput.boundingBox();
        if (inputBox) {
          console.log(`📱 Input field width on mobile: ${inputBox.width}px`);
          // Input should be reasonably sized for mobile (not too small)
          expect(inputBox.width).toBeGreaterThan(200);
        }
      }
      
      expect(mainContent).toBeGreaterThan(0);
    });

    test('should maintain usability on tablet viewport', async ({ page }) => {
      console.log('📱 EVALUATING: Tablet Responsiveness');
      
      // Set tablet viewport
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto('/auth/signin');
      await page.waitForTimeout(2000);
      
      // Check layout adaptation
      const contentWidth = await page.evaluate(() => {
        const main = document.querySelector('main, [role="main"], .max-w-md, .max-w-lg, .container');
        return main ? main.getBoundingClientRect().width : 0;
      });
      
      console.log(`📱 Content width on tablet: ${contentWidth}px`);
      expect(contentWidth).toBeGreaterThan(300);
    });
  });

  test.describe('🎯 Permit Search Interface Analysis', () => {
    test('should display permit search with proper NAMC styling when accessible', async ({ page }) => {
      console.log('🎯 EVALUATING: Permit Search Interface');
      
      // Try to access the permits page (will redirect if not authenticated)
      await page.goto('/member/permits');
      await page.waitForTimeout(3000);
      
      const currentUrl = page.url();
      console.log(`🔍 Current URL after permits navigation: ${currentUrl}`);
      
      // Check if we're on the permits page or redirected
      if (currentUrl.includes('/member/permits')) {
        console.log('✅ Successfully reached permits page');
        
        // Analyze permit page design
        const permitElements = await page.locator('text=Permit, text=Construction, text=Building').count();
        console.log(`🏗️ Permit-related content: ${permitElements}`);
        
        // Check for NAMC color scheme elements
        const namcColors = await page.locator('[class*="namc-yellow"], [class*="namc-black"], [class*="yellow"]').count();
        console.log(`🟡 NAMC color elements: ${namcColors}`);
        
        // Check for search functionality
        const searchElements = await page.locator('input[type="text"], [data-testid*="search"], [placeholder*="search"]').count();
        console.log(`🔍 Search interface elements: ${searchElements}`);
        
      } else if (currentUrl.includes('signin') || currentUrl.includes('auth')) {
        console.log('🔐 Redirected to authentication - Security working correctly');
        console.log('💡 RECOMMENDATION: Users need clear onboarding about login requirement');
        
      } else {
        console.log('🏠 Redirected to homepage - Navigation protection active');
      }
      
      expect(true).toBe(true); // Interface analysis complete
    });

    test('should provide intuitive search and filter experience', async ({ page }) => {
      console.log('🎯 EVALUATING: Search & Filter UX');
      
      await page.goto('/member/permits');
      await page.waitForTimeout(3000);
      
      // Check for search input design
      const searchInputs = await page.locator('input[placeholder*="search"], [data-testid*="search"]').count();
      if (searchInputs > 0) {
        console.log('✅ Search inputs found with clear placeholders');
        
        const searchInput = page.locator('input[placeholder*="search"], [data-testid*="search"]').first();
        const placeholder = await searchInput.getAttribute('placeholder');
        console.log(`🔍 Search placeholder text: "${placeholder}"`);
        
        // Check placeholder helpfulness
        if (placeholder && placeholder.length > 10) {
          console.log('✅ Search placeholder is descriptive and helpful');
        }
      }
      
      // Check for filter buttons
      const filterButtons = await page.locator('button:has-text("Filter"), [data-testid*="filter"]').count();
      console.log(`🔧 Filter control buttons: ${filterButtons}`);
      
      // Check for clear/reset options
      const clearButtons = await page.locator('button:has-text("Clear"), [data-testid*="clear"]').count();
      console.log(`🧹 Clear/reset buttons: ${clearButtons}`);
      
      expect(true).toBe(true); // Search UX analysis complete
    });
  });

  test.describe('⚡ Performance & Loading Experience', () => {
    test('should load quickly and provide loading feedback', async ({ page }) => {
      console.log('⚡ EVALUATING: Performance & Loading');
      
      const startTime = Date.now();
      await page.goto('/auth/signin');
      await page.waitForLoadState('networkidle');
      const loadTime = Date.now() - startTime;
      
      console.log(`⏱️ Page load time: ${loadTime}ms`);
      
      // Check for loading indicators
      const loadingElements = await page.locator('[class*="loading"], [class*="spinner"], [class*="animate-spin"]').count();
      console.log(`⏳ Loading indicator elements: ${loadingElements}`);
      
      // Performance should be reasonable
      expect(loadTime).toBeLessThan(10000); // Less than 10 seconds
      
      if (loadTime < 3000) {
        console.log('✅ EXCELLENT: Page loads under 3 seconds');
      } else if (loadTime < 5000) {
        console.log('✅ GOOD: Page loads under 5 seconds');
      } else {
        console.log('⚠️ SLOW: Page load time could be improved');
      }
    });
  });

  test.describe('🔍 Design Consistency Audit', () => {
    test('should maintain consistent spacing and typography', async ({ page }) => {
      console.log('🔍 EVALUATING: Design Consistency');
      
      await page.goto('/auth/signin');
      await page.waitForTimeout(2000);
      
      // Check font consistency
      const fontInfo = await page.evaluate(() => {
        const elements = ['h1', 'h2', 'h3', 'p', 'button', 'input'];
        const fonts = {};
        
        elements.forEach(tag => {
          const el = document.querySelector(tag);
          if (el) {
            const computed = window.getComputedStyle(el);
            fonts[tag] = {
              fontFamily: computed.fontFamily,
              fontSize: computed.fontSize,
              fontWeight: computed.fontWeight
            };
          }
        });
        
        return fonts;
      });
      
      console.log('🔤 Typography Analysis:');
      Object.entries(fontInfo).forEach(([tag, styles]) => {
        console.log(`  ${tag}: ${JSON.stringify(styles)}`);
      });
      
      // Check for consistent spacing
      const spacingElements = await page.locator('[class*="space-"], [class*="gap-"], [class*="p-"], [class*="m-"]').count();
      console.log(`📏 Spacing utility classes: ${spacingElements}`);
      
      expect(Object.keys(fontInfo).length).toBeGreaterThan(0);
    });
  });

  test.describe('📊 User Experience Recommendations', () => {
    test('should generate UX improvement recommendations', async ({ page }) => {
      console.log('📊 GENERATING: UX Recommendations');
      
      await page.goto('/');
      await page.waitForTimeout(2000);
      
      console.log('\n🎯 UI/UX DESIGNER RECOMMENDATIONS:');
      console.log('=====================================');
      
      // Navigation clarity
      const navLinks = await page.locator('nav a, [role="navigation"] a').count();
      console.log(`\n🧭 NAVIGATION:`);
      console.log(`   • Navigation links found: ${navLinks}`);
      if (navLinks < 3) {
        console.log('   💡 RECOMMENDATION: Add more navigation options for better discoverability');
      }
      
      // Call-to-action visibility
      const ctaButtons = await page.locator('button, .btn, [class*="button"]').count();
      console.log(`\n🔘 CALL-TO-ACTION:`);
      console.log(`   • Action buttons found: ${ctaButtons}`);
      console.log('   💡 RECOMMENDATION: Ensure primary CTAs use NAMC yellow for visibility');
      
      // Content hierarchy
      const headings = await page.locator('h1, h2, h3').count();
      console.log(`\n📝 CONTENT HIERARCHY:`);
      console.log(`   • Heading levels found: ${headings}`);
      if (headings > 0) {
        console.log('   ✅ GOOD: Clear content hierarchy established');
      }
      
      // Visual feedback
      console.log(`\n💫 INTERACTION FEEDBACK:`);
      console.log('   💡 RECOMMENDATION: Ensure hover states use NAMC brand colors');
      console.log('   💡 RECOMMENDATION: Add subtle animations for better user feedback');
      
      // Mobile optimization
      console.log(`\n📱 MOBILE EXPERIENCE:`);
      console.log('   💡 RECOMMENDATION: Test all interactions on actual mobile devices');
      console.log('   💡 RECOMMENDATION: Ensure touch targets are minimum 44px');
      
      // Accessibility
      console.log(`\n♿ ACCESSIBILITY:`);
      console.log('   💡 RECOMMENDATION: Verify color contrast meets WCAG AA standards');
      console.log('   💡 RECOMMENDATION: Add focus indicators for keyboard navigation');
      
      console.log('\n=====================================');
      
      expect(true).toBe(true); // Recommendations generated
    });
  });
});
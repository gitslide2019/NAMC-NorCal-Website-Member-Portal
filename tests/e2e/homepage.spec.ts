import { test, expect } from '@playwright/test'
import { HomePage } from '../pages/HomePage'
import { TestHelpers } from '../utils/test-helpers'

test.describe('Homepage User Journey', () => {
  let homePage: HomePage

  test.beforeEach(async ({ page }) => {
    homePage = new HomePage(page)
    await homePage.goto()
  })

  test('should load homepage with all sections visible', async ({ page }) => {
    await test.step('Verify hero section', async () => {
      await homePage.verifyHeroSection()
    })

    await test.step('Verify stats section', async () => {
      await homePage.verifyStatsSection()
    })

    await test.step('Verify features section', async () => {
      await homePage.verifyFeaturesSection()
    })

    await test.step('Verify timeline section', async () => {
      await homePage.verifyTimelineSection()
    })

    await test.step('Check for console errors', async () => {
      await TestHelpers.expectNoConsoleErrors(page, [
        'Failed to load resource', // Allow image loading errors in tests
        'net::ERR_INTERNET_DISCONNECTED' // Allow network errors in CI
      ])
    })
  })

  test('should navigate to registration from "Become a Member" CTA', async ({ page }) => {
    await test.step('Click "Become a Member" button', async () => {
      await homePage.clickBecomeMember()
    })

    await test.step('Verify navigation to registration page', async () => {
      await expect(page).toHaveURL(/.*\/auth\/register/)
      await expect(page.locator('h1')).toContainText('Become a Member')
    })
  })

  test('should navigate to about page from "Learn More" CTA', async ({ page }) => {
    await test.step('Click "Learn More" button', async () => {
      await homePage.clickLearnMore()
    })

    await test.step('Verify navigation to about page', async () => {
      await expect(page).toHaveURL(/.*\/about/)
    })
  })

  test('should scroll through all sections with proper animations', async ({ page }) => {
    await test.step('Scroll through sections', async () => {
      await homePage.scrollThroughSections()
    })

    await test.step('Verify no layout issues during scroll', async () => {
      const hasHorizontalScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth
      })
      expect(hasHorizontalScroll).toBeFalsy()
    })
  })

  test('should handle newsletter signup', async ({ page }) => {
    await test.step('Test newsletter signup', async () => {
      const testEmail = TestHelpers.generateRandomEmail()
      await homePage.testNewsletterSignup(testEmail)
    })

    // Note: In a real test, you might check for success/error messages
    // or verify the email was added to your newsletter system
  })

  test('should display feature cards with proper hover effects', async ({ page }) => {
    await test.step('Test feature card interactions', async () => {
      await homePage.testFeatureCardHoverEffects()
    })

    await test.step('Verify feature card links are valid', async () => {
      const featureLinks = ['/timeline', '/member/dashboard', '/learning', '/tools']
      
      for (const link of featureLinks) {
        const linkElement = page.locator(`a[href="${link}"]`)
        await expect(linkElement).toBeVisible()
        await expect(linkElement).toHaveAttribute('href', link)
      }
    })
  })

  test('should be responsive across all breakpoints', async ({ page }) => {
    await test.step('Test responsive design', async () => {
      await TestHelpers.testAllBreakpoints(page, async (breakpoint) => {
        console.log(`Testing ${breakpoint} breakpoint`)
        
        // Verify key elements are visible at each breakpoint
        await expect(homePage.heroTitle).toBeVisible()
        await expect(homePage.statsSection).toBeVisible()
        
        // Check for horizontal scroll issues
        const hasHScroll = await page.evaluate(() => 
          document.documentElement.scrollWidth > document.documentElement.clientWidth
        )
        expect(hasHScroll).toBeFalsy()
      })
    })
  })

  test('should handle mobile navigation properly', async ({ page }) => {
    await test.step('Test mobile navigation', async () => {
      await homePage.testResponsiveNavigation()
    })
  })

  test('should meet performance benchmarks', async ({ page }) => {
    await test.step('Check page load performance', async () => {
      await homePage.verifyPerformanceMetrics()
    })

    await test.step('Get detailed performance metrics', async () => {
      const metrics = await TestHelpers.getPerformanceMetrics(page)
      console.log('Homepage performance metrics:', metrics)
      
      // Performance assertions
      expect(metrics.loadComplete).toBeLessThan(3000) // 3 seconds
      expect(metrics.firstContentfulPaint).toBeLessThan(2000) // 2 seconds
      expect(metrics.resourceCount).toBeLessThan(50) // Reasonable resource count
    })
  })

  test('should be accessible via keyboard navigation', async ({ page }) => {
    await test.step('Test keyboard accessibility', async () => {
      await homePage.testAccessibilityFeatures()
    })

    await test.step('Test keyboard navigation flow', async () => {
      const expectedTabOrder = [
        'a[href="/"]', // Logo
        'a[href="/auth/register"]', // Become member button
        'a[href="/about"]' // Learn more button
      ]
      
      await TestHelpers.testKeyboardNavigation(page, expectedTabOrder)
    })
  })

  test('should pass accessibility audit', async ({ page }) => {
    await test.step('Run accessibility check', async () => {
      const violations = await TestHelpers.checkAccessibility(page, [
        'color-contrast',
        'keyboard-navigation',
        'aria-labels',
        'heading-order'
      ])
      
      // Allow some violations but log them
      if (violations.length > 0) {
        console.warn(`Found ${violations.length} accessibility violations`)
      }
      
      // Fail if critical violations found
      const criticalViolations = violations.filter(v => v.impact === 'critical')
      expect(criticalViolations.length).toBe(0)
    })
  })

  test('should handle slow network conditions gracefully', async ({ page }) => {
    await test.step('Simulate slow network', async () => {
      await TestHelpers.simulateSlowNetwork(page)
      
      // Reload page with slow network
      await page.reload()
      await homePage.waitForHeroToLoad()
      
      // Verify critical content still loads
      await expect(homePage.heroTitle).toBeVisible()
      await expect(homePage.becomeMemberButton).toBeVisible()
    })

    await test.step('Restore network conditions', async () => {
      await TestHelpers.restoreNetworkConditions(page)
    })
  })

  test('should handle broken images gracefully', async ({ page }) => {
    await test.step('Mock broken image responses', async () => {
      // Mock image requests to return 404
      await page.route('**/*.{png,jpg,jpeg,gif,webp}', route => {
        route.fulfill({ status: 404 })
      })
      
      await page.reload()
      await homePage.waitForHeroToLoad()
      
      // Verify page still functions with broken images
      await expect(homePage.heroTitle).toBeVisible()
      await expect(homePage.becomeMemberButton).toBeEnabled()
    })
  })

  test('should handle JavaScript disabled scenario', async ({ page, context }) => {
    await test.step('Disable JavaScript', async () => {
      await context.addInitScript(() => {
        // Simulate disabled JavaScript by breaking common JS features
        delete (window as any).fetch
        delete (window as any).XMLHttpRequest
      })
      
      await page.reload()
      await page.waitForTimeout(3000) // Wait for any fallbacks
      
      // Verify basic content is still accessible
      await expect(homePage.heroTitle).toBeVisible()
      await expect(homePage.becomeMemberButton).toBeVisible()
    })
  })

  test('should display proper error states', async ({ page }) => {
    await test.step('Test form error handling', async () => {
      // Navigate to registration to test form errors
      await homePage.clickBecomeMember()
      
      // Try to submit empty form
      const submitButton = page.locator('button:has-text("Next")')
      await submitButton.click()
      
      // Should show validation errors
      const errorMessages = page.locator('.text-red-500, [role="alert"]')
      const errorCount = await errorMessages.count()
      expect(errorCount).toBeGreaterThan(0)
    })
  })

  test('should handle multiple concurrent users', async ({ page, context }) => {
    await test.step('Simulate concurrent usage', async () => {
      // Create multiple pages to simulate concurrent users
      const pages = []
      for (let i = 0; i < 3; i++) {
        const newPage = await context.newPage()
        pages.push(newPage)
        
        const newHomePage = new HomePage(newPage)
        await newHomePage.goto()
        await newHomePage.verifyHeroSection()
      }
      
      // Verify all pages loaded successfully
      for (const testPage of pages) {
        await expect(testPage.locator('h1')).toBeVisible()
        await testPage.close()
      }
    })
  })

  test.afterEach(async ({ page }) => {
    // Take screenshot on failure
    if (test.info().status !== test.info().expectedStatus) {
      await TestHelpers.takeTimestampedScreenshot(page, 'homepage-failure')
    }
  })
})
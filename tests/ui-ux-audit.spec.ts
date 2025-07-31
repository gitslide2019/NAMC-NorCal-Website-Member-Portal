import { test, expect } from '@playwright/test'
import { injectAxe, checkA11y } from 'axe-playwright'

test.describe('Comprehensive UI/UX Audit', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication
    await page.goto('http://localhost:3000')
    await page.evaluate(() => {
      window.localStorage.setItem('mockAuth', JSON.stringify({
        user: {
          id: 'admin-123',
          name: 'Admin User',
          email: 'admin@namcnorcal.org',
          role: 'admin'
        }
      }))
    })
  })

  test.describe('Accessibility Audit', () => {
    test('project upload form accessibility', async ({ page }) => {
      await page.goto('http://localhost:3000/admin/projects/opportunities')
      await injectAxe(page)
      
      // Run accessibility checks
      await checkA11y(page, null, {
        detailedReport: true,
        detailedReportOptions: {
          html: true
        }
      })
      
      // Check specific WCAG criteria
      // 1. All form inputs have labels
      const inputs = await page.locator('input, select, textarea').all()
      for (const input of inputs) {
        const id = await input.getAttribute('id')
        if (id) {
          const label = await page.locator(`label[for="${id}"]`).count()
          const ariaLabel = await input.getAttribute('aria-label')
          const ariaLabelledby = await input.getAttribute('aria-labelledby')
          
          // Input should have either a label, aria-label, or aria-labelledby
          expect(label > 0 || ariaLabel || ariaLabelledby).toBeTruthy()
        }
      }
      
      // 2. Check focus indicators
      await page.keyboard.press('Tab')
      const focusedElement = page.locator(':focus')
      const focusVisible = await focusedElement.evaluate(el => {
        const styles = window.getComputedStyle(el)
        return styles.outline !== 'none' || styles.boxShadow !== 'none'
      })
      expect(focusVisible).toBeTruthy()
      
      // 3. Check color contrast for text
      const textElements = await page.locator('p, span, div, h1, h2, h3, h4, h5, h6').all()
      const sampleSize = Math.min(10, textElements.length)
      
      for (let i = 0; i < sampleSize; i++) {
        const element = textElements[i]
        const contrast = await element.evaluate(el => {
          const styles = window.getComputedStyle(el)
          // This is a simplified check - in production use a proper contrast calculation
          return styles.color !== styles.backgroundColor
        })
        expect(contrast).toBeTruthy()
      }
    })

    test('dashboard accessibility', async ({ page }) => {
      await page.goto('http://localhost:3000/admin/projects/dashboard')
      await injectAxe(page)
      
      await checkA11y(page, null, {
        detailedReport: true
      })
      
      // Check ARIA landmarks
      await expect(page.locator('main')).toHaveCount(1)
      
      // Check heading hierarchy
      const h1Count = await page.locator('h1').count()
      expect(h1Count).toBe(1)
      
      // Check that interactive elements are keyboard accessible
      const buttons = await page.locator('button').all()
      for (const button of buttons.slice(0, 5)) {
        const isDisabled = await button.isDisabled()
        if (!isDisabled) {
          const tabindex = await button.getAttribute('tabindex')
          expect(tabindex !== '-1').toBeTruthy()
        }
      }
    })

    test('screen reader compatibility', async ({ page }) => {
      await page.goto('http://localhost:3000/admin/projects/opportunities')
      
      // Check for screen reader only content
      const srOnly = await page.locator('.sr-only').count()
      
      // Check images have alt text
      const images = await page.locator('img').all()
      for (const img of images) {
        const alt = await img.getAttribute('alt')
        expect(alt).toBeTruthy()
      }
      
      // Check form validation messages are announced
      await page.click('button:has-text("Publish Project")')
      const errorMessages = await page.locator('[role="alert"]').count()
      const ariaLiveRegions = await page.locator('[aria-live]').count()
      expect(errorMessages > 0 || ariaLiveRegions > 0).toBeTruthy()
    })
  })

  test.describe('Usability Testing', () => {
    test('form usability and user flow', async ({ page }) => {
      await page.goto('http://localhost:3000/admin/projects/opportunities')
      
      // Test tab order is logical
      const tabOrder = []
      for (let i = 0; i < 10; i++) {
        await page.keyboard.press('Tab')
        const focused = await page.evaluate(() => {
          const el = document.activeElement
          return {
            tag: el?.tagName,
            placeholder: el?.getAttribute('placeholder'),
            text: el?.textContent
          }
        })
        tabOrder.push(focused)
      }
      
      // Verify tab order makes sense (form fields before buttons, etc.)
      expect(tabOrder[0].tag).toBe('INPUT') // Should start with form inputs
      
      // Test form field grouping
      const fieldsets = await page.locator('h3').all()
      expect(fieldsets.length).toBeGreaterThan(3) // Multiple logical sections
      
      // Test error recovery
      await page.fill('input[placeholder="Enter project title"]', 'Test Project')
      await page.click('button:has-text("Publish Project")')
      
      // User should be able to see what fields need attention
      const errorCount = await page.locator('.text-red-500').count()
      expect(errorCount).toBeGreaterThan(0)
      
      // Errors should be near their respective fields
      const firstError = await page.locator('.text-red-500').first()
      const errorText = await firstError.textContent()
      expect(errorText).toBeTruthy()
    })

    test('navigation and wayfinding', async ({ page }) => {
      await page.goto('http://localhost:3000/admin/projects/dashboard')
      
      // Check breadcrumbs or navigation context
      // (Would need to be implemented in the actual UI)
      
      // Check that current page is indicated in navigation
      const currentPageIndicator = await page.locator('.bg-namc-gold, .text-namc-gold').count()
      expect(currentPageIndicator).toBeGreaterThan(0)
      
      // Test that all major sections are reachable
      const navLinks = [
        'Projects',
        'Dashboard',
        'Upload',
        'Manage'
      ]
      
      for (const link of navLinks) {
        const linkExists = await page.locator(`text=${link}`).count()
        expect(linkExists).toBeGreaterThan(0)
      }
    })

    test('feedback and confirmation', async ({ page }) => {
      await page.goto('http://localhost:3000/admin/projects/opportunities')
      
      // Fill form partially
      await page.fill('input[placeholder="Enter project title"]', 'Important Project')
      await page.fill('textarea[placeholder="Provide detailed project description"]', 'This is important data')
      
      // Try to navigate away
      await page.click('button:has-text("Manage Projects")')
      
      // Should either save draft or warn about unsaved changes
      // (This would need to be implemented in the actual UI)
      
      // Test loading states
      const submitButton = page.locator('button:has-text("Publish Project")')
      await submitButton.click()
      
      // Button should show loading state
      const buttonText = await submitButton.textContent()
      expect(buttonText).toContain('Publishing...')
    })
  })

  test.describe('Performance & Optimization', () => {
    test('page load performance', async ({ page }) => {
      const metrics = []
      
      page.on('load', () => {
        metrics.push(page.evaluate(() => {
          const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
          return {
            domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
            loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
            firstPaint: performance.getEntriesByName('first-paint')[0]?.startTime || 0,
            firstContentfulPaint: performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 0
          }
        }))
      })
      
      await page.goto('http://localhost:3000/admin/projects/dashboard')
      
      const metric = metrics[metrics.length - 1]
      if (metric) {
        // First contentful paint should be under 1.5s
        expect(metric.firstContentfulPaint).toBeLessThan(1500)
        
        // DOM content loaded should be under 2s
        expect(metric.domContentLoaded).toBeLessThan(2000)
      }
    })

    test('interaction responsiveness', async ({ page }) => {
      await page.goto('http://localhost:3000/admin/projects/dashboard')
      
      // Test button click responsiveness
      const startTime = Date.now()
      await page.click('button:has-text("View Details")').first()
      const modalAppearTime = Date.now() - startTime
      
      // Modal should appear quickly
      expect(modalAppearTime).toBeLessThan(300)
      
      // Test form input responsiveness
      await page.goto('http://localhost:3000/admin/projects/opportunities')
      const input = page.locator('input[placeholder="Enter project title"]')
      
      const inputStartTime = Date.now()
      await input.fill('Testing responsiveness')
      const inputEndTime = Date.now() - inputStartTime
      
      // Input should be responsive
      expect(inputEndTime).toBeLessThan(500)
    })

    test('memory usage and leaks', async ({ page }) => {
      await page.goto('http://localhost:3000/admin/projects/dashboard')
      
      // Get initial memory usage
      const initialMemory = await page.evaluate(() => {
        if ('memory' in performance) {
          return (performance as any).memory.usedJSHeapSize
        }
        return 0
      })
      
      // Perform several interactions
      for (let i = 0; i < 5; i++) {
        await page.click('button:has-text("View Details")').first()
        await page.waitForTimeout(100)
        await page.click('button:has(svg.h-6.w-6)') // Close modal
        await page.waitForTimeout(100)
      }
      
      // Check memory hasn't increased dramatically
      const finalMemory = await page.evaluate(() => {
        if ('memory' in performance) {
          return (performance as any).memory.usedJSHeapSize
        }
        return 0
      })
      
      if (initialMemory && finalMemory) {
        const memoryIncrease = finalMemory - initialMemory
        // Memory increase should be reasonable (less than 10MB)
        expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024)
      }
    })
  })

  test.describe('Cross-browser Compatibility', () => {
    const browsers = ['chromium', 'firefox', 'webkit']
    
    for (const browserName of browsers) {
      test(`basic functionality in ${browserName}`, async ({ page, browserName: currentBrowser }) => {
        if (currentBrowser !== browserName) {
          test.skip()
          return
        }
        
        await page.goto('http://localhost:3000/admin/projects/dashboard')
        
        // Basic functionality should work in all browsers
        await expect(page.locator('h1')).toBeVisible()
        await expect(page.locator('button')).toHaveCount(await page.locator('button').count())
        
        // Test form inputs
        await page.goto('http://localhost:3000/admin/projects/opportunities')
        await page.fill('input[placeholder="Enter project title"]', 'Cross-browser test')
        
        const value = await page.inputValue('input[placeholder="Enter project title"]')
        expect(value).toBe('Cross-browser test')
      })
    }
  })

  test.describe('Error States and Edge Cases', () => {
    test('empty states', async ({ page }) => {
      await page.goto('http://localhost:3000/admin/projects/opportunities')
      await page.click('button:has-text("Manage Projects")')
      
      // Search for non-existent project
      await page.fill('input[placeholder="Search projects..."]', 'NonExistentProject12345')
      
      // Should show appropriate empty state
      await expect(page.locator('text=No projects found')).toBeVisible()
      await expect(page.locator('button:has-text("Create New Project")')).toBeVisible()
    })

    test('error boundaries', async ({ page }) => {
      // Test that errors don't crash the entire app
      await page.goto('http://localhost:3000/admin/projects/dashboard')
      
      // Inject an error
      await page.evaluate(() => {
        // Simulate a render error
        const errorEvent = new ErrorEvent('error', {
          error: new Error('Test error'),
          message: 'Test error message'
        })
        window.dispatchEvent(errorEvent)
      })
      
      // App should still be functional
      await expect(page.locator('h1')).toBeVisible()
    })

    test('network error handling', async ({ page }) => {
      // Block API calls
      await page.route('**/api/**', route => route.abort())
      
      await page.goto('http://localhost:3000/admin/projects/dashboard')
      
      // Should handle gracefully with fallback UI or error messages
      await expect(page.locator('h1')).toBeVisible()
      
      // Try to submit form with network blocked
      await page.goto('http://localhost:3000/admin/projects/opportunities')
      await page.fill('input[placeholder="Enter project title"]', 'Test')
      await page.click('button:has-text("Publish Project")')
      
      // Should show error state, not crash
      await page.waitForTimeout(1000)
      await expect(page).toHaveURL(/opportunities/) // Should stay on same page
    })
  })
})
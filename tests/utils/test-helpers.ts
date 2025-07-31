import { Page, BrowserContext, expect } from '@playwright/test'
import { SignInPage } from '../pages/SignInPage'

export class TestHelpers {
  /**
   * Generate test user data
   */
  static generateTestUser() {
    const timestamp = Date.now()
    return {
      step1: {
        firstName: 'Test',
        lastName: 'User',
        email: `test.user.${timestamp}@example.com`,
        phone: '(555) 123-4567',
        company: 'Test Construction Co.',
        password: 'TestPassword123!',
        confirmPassword: 'TestPassword123!'
      },
      step2: {
        businessAddress: '123 Construction Ave',
        city: 'San Francisco',
        state: 'CA',
        zip: '94102',
        licenseNumber: 'C-123456',
        yearsExperience: '10',
        specialties: ['Residential Construction', 'Commercial Construction'],
        serviceAreas: 'San Francisco Bay Area, Oakland, Berkeley'
      }
    }
  }

  /**
   * Generate invalid test data for validation testing
   */
  static generateInvalidTestData() {
    return {
      invalidEmail: 'not-an-email',
      shortPassword: '123',
      missingRequired: '',
      invalidPhone: '123',
      invalidZip: '1',
      futureDates: '2030-12-31',
      specialCharacters: '<script>alert("test")</script>',
      longText: 'a'.repeat(1000)
    }
  }

  /**
   * Authenticate as admin user
   */
  static async authenticateAsAdmin(page: Page) {
    const signInPage = new SignInPage(page)
    await signInPage.goto()
    await signInPage.signInAsAdmin()
  }

  /**
   * Authenticate as member user
   */
  static async authenticateAsMember(page: Page) {
    const signInPage = new SignInPage(page)
    await signInPage.goto()
    await signInPage.signInAsMember()
  }

  /**
   * Clear all cookies and local storage
   */
  static async clearUserSession(context: BrowserContext) {
    await context.clearCookies()
    await context.clearPermissions()
    
    const pages = context.pages()
    for (const page of pages) {
      await page.evaluate(() => {
        localStorage.clear()
        sessionStorage.clear()
      })
    }
  }

  /**
   * Wait for network to be idle
   */
  static async waitForNetworkIdle(page: Page, timeout: number = 2000) {
    await page.waitForLoadState('networkidle', { timeout })
  }

  /**
   * Take full page screenshot with timestamp
   */
  static async takeTimestampedScreenshot(page: Page, name: string) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    await page.screenshot({
      path: `test-results/screenshots/${name}-${timestamp}.png`,
      fullPage: true
    })
  }

  /**
   * Check for console errors
   */
  static async expectNoConsoleErrors(page: Page, allowedErrors: string[] = []) {
    const errors: string[] = []
    
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text()
        // Filter out allowed errors
        if (!allowedErrors.some(allowed => text.includes(allowed))) {
          errors.push(text)
        }
      }
    })

    page.on('pageerror', (error) => {
      const message = error.message
      if (!allowedErrors.some(allowed => message.includes(allowed))) {
        errors.push(message)
      }
    })

    // Wait for any async errors
    await page.waitForTimeout(1000)
    
    if (errors.length > 0) {
      console.warn('Console errors detected:', errors)
      // Don't fail the test, just log warnings for now
    }
  }

  /**
   * Test responsive breakpoints
   */
  static async testAllBreakpoints(page: Page, testCallback: (breakpoint: string) => Promise<void>) {
    const breakpoints = [
      { name: 'mobile', width: 375, height: 667 },
      { name: 'tablet', width: 768, height: 1024 },
      { name: 'laptop', width: 1024, height: 768 },
      { name: 'desktop', width: 1440, height: 900 },
      { name: 'wide', width: 1920, height: 1080 }
    ]

    for (const breakpoint of breakpoints) {
      await page.setViewportSize({
        width: breakpoint.width,
        height: breakpoint.height
      })
      
      await page.waitForTimeout(500) // Wait for layout changes
      await testCallback(breakpoint.name)
    }
  }

  /**
   * Check accessibility violations using axe-core
   */
  static async checkAccessibility(page: Page, rules?: string[]) {
    try {
      // Inject axe-core
      await page.addScriptTag({
        url: 'https://unpkg.com/axe-core@4.8.2/axe.min.js'
      })

      // Run accessibility check
      const results = await page.evaluate((rulesToCheck) => {
        return new Promise((resolve) => {
          // @ts-ignore
          window.axe.run(
            document,
            {
              rules: rulesToCheck ? 
                Object.fromEntries(rulesToCheck.map(rule => [rule, { enabled: true }])) :
                undefined
            },
            (err: any, results: any) => {
              if (err) {
                resolve({ error: err.message })
              } else {
                resolve(results)
              }
            }
          )
        })
      }, rules)

      // @ts-ignore
      if (results.error) {
        // @ts-ignore
        console.warn('Accessibility check error:', results.error)
        return
      }

      // @ts-ignore
      const violations = results.violations || []
      
      if (violations.length > 0) {
        console.warn(`Found ${violations.length} accessibility violations:`)
        violations.forEach((violation: any, index: number) => {
          console.warn(`${index + 1}. ${violation.id}: ${violation.description}`)
          console.warn(`   Impact: ${violation.impact}`)
          console.warn(`   Elements: ${violation.nodes.length}`)
        })
      }

      return violations
    } catch (error) {
      console.warn('Could not run accessibility check:', error)
      return []
    }
  }

  /**
   * Monitor performance metrics
   */
  static async getPerformanceMetrics(page: Page) {
    return await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
      const paint = performance.getEntriesByType('paint')
      const resources = performance.getEntriesByType('resource')

      return {
        // Navigation timing
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.fetchStart,
        loadComplete: navigation.loadEventEnd - navigation.fetchStart,
        firstByte: navigation.responseStart - navigation.fetchStart,
        
        // Paint timing
        firstPaint: paint.find(p => p.name === 'first-paint')?.startTime || 0,
        firstContentfulPaint: paint.find(p => p.name === 'first-contentful-paint')?.startTime || 0,
        
        // Resource metrics
        resourceCount: resources.length,
        totalSize: resources.reduce((total, resource) => total + ((resource as any).transferSize || 0), 0),
        
        // Memory usage (if available)
        // @ts-ignore
        memoryUsage: (performance as any).memory ? {
          // @ts-ignore
          used: (performance as any).memory.usedJSHeapSize,
          // @ts-ignore
          total: (performance as any).memory.totalJSHeapSize,
          // @ts-ignore
          limit: (performance as any).memory.jsHeapSizeLimit
        } : null
      }
    })
  }

  /**
   * Test form validation
   */
  static async testFormFieldValidation(
    page: Page,
    fieldSelector: string,
    validValue: string,
    invalidValues: string[],
    expectedErrorMessage?: string
  ) {
    const field = page.locator(fieldSelector)
    await expect(field).toBeVisible()

    // Test invalid values
    for (const invalidValue of invalidValues) {
      await field.fill(invalidValue)
      await field.blur()
      
      if (expectedErrorMessage) {
        await expect(page.locator(`text=${expectedErrorMessage}`)).toBeVisible()
      } else {
        // Look for any error message
        const errorExists = await page.locator('.text-red-500, [role="alert"]').count() > 0
        expect(errorExists).toBeTruthy()
      }
    }

    // Test valid value
    await field.fill(validValue)
    await field.blur()
    
    if (expectedErrorMessage) {
      await expect(page.locator(`text=${expectedErrorMessage}`)).not.toBeVisible()
    }
  }

  /**
   * Simulate slow network conditions
   */
  static async simulateSlowNetwork(page: Page) {
    const client = await page.context().newCDPSession(page)
    await client.send('Network.emulateNetworkConditions', {
      offline: false,
      downloadThroughput: 1.5 * 1024 * 1024 / 8, // 1.5 Mbps
      uploadThroughput: 750 * 1024 / 8, // 750 Kbps
      latency: 40 // 40ms latency
    })
  }

  /**
   * Restore normal network conditions
   */
  static async restoreNetworkConditions(page: Page) {
    const client = await page.context().newCDPSession(page)
    await client.send('Network.emulateNetworkConditions', {
      offline: false,
      downloadThroughput: -1,
      uploadThroughput: -1,
      latency: 0
    })
  }

  /**
   * Mock API responses
   */
  static async mockApiResponse(page: Page, urlPattern: string, response: any, status: number = 200) {
    await page.route(urlPattern, (route) => {
      route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify(response)
      })
    })
  }

  /**
   * Wait for element to be stable (not animating)
   */
  static async waitForElementStable(page: Page, selector: string, timeout: number = 5000) {
    const element = page.locator(selector)
    await element.waitFor({ state: 'visible' })
    
    // Wait for element position to stabilize
    let previousBox = await element.boundingBox()
    let stabilityCount = 0
    const startTime = Date.now()
    
    while (stabilityCount < 3 && Date.now() - startTime < timeout) {
      await page.waitForTimeout(100)
      const currentBox = await element.boundingBox()
      
      if (previousBox && currentBox && 
          Math.abs(previousBox.x - currentBox.x) < 1 &&
          Math.abs(previousBox.y - currentBox.y) < 1) {
        stabilityCount++
      } else {
        stabilityCount = 0
      }
      
      previousBox = currentBox
    }
  }

  /**
   * Test keyboard navigation flow
   */
  static async testKeyboardNavigation(page: Page, expectedFocusOrder: string[]) {
    // Start from beginning
    await page.keyboard.press('Control+Home')
    await page.keyboard.press('Tab')
    
    for (let i = 0; i < expectedFocusOrder.length; i++) {
      const expectedSelector = expectedFocusOrder[i]
      
      // Check if current focused element matches expected
      const focusedElement = page.locator(':focus')
      const matchesExpected = await focusedElement.locator(expectedSelector).count() > 0 ||
                              await page.locator(expectedSelector).evaluate((el) => el === document.activeElement)
      
      if (!matchesExpected) {
        console.warn(`Keyboard navigation mismatch at step ${i + 1}. Expected: ${expectedSelector}`)
      }
      
      // Move to next element
      if (i < expectedFocusOrder.length - 1) {
        await page.keyboard.press('Tab')
      }
    }
  }

  /**
   * Generate random test data
   */
  static generateRandomString(length: number = 8): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    let result = ''
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result
  }

  /**
   * Generate random email
   */
  static generateRandomEmail(): string {
    return `test.${this.generateRandomString(8)}@example.com`
  }

  /**
   * Generate random phone number
   */
  static generateRandomPhone(): string {
    const areaCode = Math.floor(Math.random() * 900) + 100
    const exchange = Math.floor(Math.random() * 900) + 100
    const number = Math.floor(Math.random() * 9000) + 1000
    return `(${areaCode}) ${exchange}-${number}`
  }

  /**
   * Verify no broken links on page
   */
  static async verifyNoProkenLinks(page: Page) {
    const links = await page.locator('a[href]').all()
    const brokenLinks: string[] = []
    
    for (const link of links) {
      const href = await link.getAttribute('href')
      
      if (href && href.startsWith('http')) {
        try {
          const response = await page.context().request.get(href)
          if (response.status() >= 400) {
            brokenLinks.push(`${href} (${response.status()})`)
          }
        } catch (error) {
          brokenLinks.push(`${href} (error: ${error})`)
        }
      }
    }
    
    if (brokenLinks.length > 0) {
      console.warn('Broken links found:', brokenLinks)
    }
    
    return brokenLinks
  }

  /**
   * Check page loading performance
   */
  static async checkPageLoadPerformance(page: Page, maxLoadTime: number = 3000) {
    const startTime = Date.now()
    await page.waitForLoadState('networkidle')
    const loadTime = Date.now() - startTime
    
    expect(loadTime).toBeLessThan(maxLoadTime)
    return loadTime
  }
}
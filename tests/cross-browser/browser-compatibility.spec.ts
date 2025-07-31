import { test, expect, devices } from '@playwright/test'
import { HomePage } from '../pages/HomePage'
import { RegistrationPage } from '../pages/RegistrationPage'
import { SignInPage } from '../pages/SignInPage'
import { MemberDashboardPage } from '../pages/MemberDashboardPage'
import { TestHelpers } from '../utils/test-helpers'

test.describe('Cross-Browser Compatibility Testing', () => {
  test('should display consistently across all browsers', async ({ page, browserName }) => {
    const homePage = new HomePage(page)
    
    await test.step(`Test homepage consistency on ${browserName}`, async () => {
      await homePage.goto()
      await homePage.waitForHeroToLoad()
      
      // Core elements should exist across all browsers
      await expect(homePage.heroTitle).toBeVisible()
      await expect(homePage.becomeMemberButton).toBeVisible()
      await expect(homePage.statsSection).toBeVisible()
      
      // Take screenshot for visual comparison
      await page.screenshot({
        path: `test-results/browser-screenshots/homepage-${browserName}.png`,
        fullPage: true
      })
    })

    await test.step(`Test interactive elements on ${browserName}`, async () => {
      // Test button clicks work across browsers
      await homePage.becomeMemberButton.click()
      await page.waitForTimeout(2000)
      
      // Should navigate correctly regardless of browser
      const currentUrl = page.url()
      expect(currentUrl).toContain('/auth/register')
    })

    await test.step(`Test CSS rendering on ${browserName}`, async () => {
      await homePage.goto()
      
      // Check critical CSS properties work across browsers
      const heroStyles = await homePage.heroTitle.evaluate(el => {
        const styles = window.getComputedStyle(el)
        return {
          display: styles.display,
          fontSize: styles.fontSize,
          fontWeight: styles.fontWeight,
          color: styles.color,
          textAlign: styles.textAlign
        }
      })
      
      // Text should be visible and styled consistently
      expect(heroStyles.display).not.toBe('none')
      expect(heroStyles.fontSize).toBeTruthy()
      expect(heroStyles.color).toBeTruthy()
      
      console.log(`${browserName} hero styles:`, heroStyles)
    })
  })

  test('should handle form interactions consistently', async ({ page, browserName }) => {
    const signInPage = new SignInPage(page)
    
    await test.step(`Test form rendering on ${browserName}`, async () => {
      await signInPage.goto()
      
      // Verify form elements render consistently
      await expect(signInPage.emailInput).toBeVisible()
      await expect(signInPage.passwordInput).toBeVisible()
      await expect(signInPage.signInButton).toBeVisible()
      
      // Check form styling
      const inputStyles = await signInPage.emailInput.evaluate(el => {
        const styles = window.getComputedStyle(el)
        return {
          border: styles.border,
          borderRadius: styles.borderRadius,
          padding: styles.padding,
          fontSize: styles.fontSize
        }
      })
      
      expect(inputStyles.border).toBeTruthy()
      expect(inputStyles.padding).toBeTruthy()
      
      console.log(`${browserName} input styles:`, inputStyles)
    })

    await test.step(`Test form validation on ${browserName}`, async () => {
      // Test validation works across browsers
      await signInPage.emailInput.fill('invalid-email')
      await signInPage.emailInput.blur()
      
      // Allow time for validation
      await page.waitForTimeout(1000)
      
      // Browser-specific validation behavior
      const hasValidationMessage = await page.locator('.text-red-500, [role="alert"], :invalid').count() > 0
      const emailValid = await signInPage.emailInput.evaluate(el => (el as HTMLInputElement).validity.valid)
      
      console.log(`${browserName} validation: hasMessage=${hasValidationMessage}, isValid=${emailValid}`)
      
      // Should show some form of validation feedback
      expect(hasValidationMessage || !emailValid).toBeTruthy()
    })

    await test.step(`Test keyboard navigation on ${browserName}`, async () => {
      // Test tab navigation works consistently
      await signInPage.emailInput.focus()
      await page.keyboard.press('Tab')
      
      const focusedElement = await page.evaluate(() => document.activeElement?.tagName.toLowerCase())
      expect(focusedElement).toBe('input')
      
      console.log(`${browserName} keyboard navigation: focused=${focusedElement}`)
    })
  })

  test('should handle JavaScript features consistently', async ({ page, browserName }) => {
    const homePage = new HomePage(page)
    
    await test.step(`Test scroll animations on ${browserName}`, async () => {
      await homePage.goto()
      
      // Test scroll-triggered animations work
      await homePage.scrollThroughSections()
      
      // Check if animations completed
      const animationElements = await page.locator('[data-aos], .animate-fadeIn, .animate-slideIn').count()
      console.log(`${browserName} animation elements found: ${animationElements}`)
    })

    await test.step(`Test event handlers on ${browserName}`, async () => {
      // Test click events work consistently
      let clickHandled = false
      
      page.on('console', msg => {
        if (msg.text().includes('clicked')) {
          clickHandled = true
        }
      })
      
      await homePage.becomeMemberButton.click()
      await page.waitForTimeout(500)
      
      // Navigation should work regardless of browser
      const urlChanged = !page.url().includes('/#')
      expect(urlChanged).toBeTruthy()
      
      console.log(`${browserName} event handling: navigation=${urlChanged}`)
    })
  })

  test('should handle responsive design consistently', async ({ page, browserName }) => {
    const homePage = new HomePage(page)
    await homePage.goto()
    
    const breakpoints = [
      { name: 'mobile', width: 375, height: 667 },
      { name: 'tablet', width: 768, height: 1024 },
      { name: 'desktop', width: 1440, height: 900 }
    ]

    for (const breakpoint of breakpoints) {
      await test.step(`Test ${breakpoint.name} layout on ${browserName}`, async () => {
        await page.setViewportSize({
          width: breakpoint.width,
          height: breakpoint.height
        })
        
        await page.waitForTimeout(500)
        
        // Check responsive layout
        const heroVisible = await homePage.heroTitle.isVisible()
        expect(heroVisible).toBeTruthy()
        
        // Take responsive screenshot
        await page.screenshot({
          path: `test-results/responsive-screenshots/${browserName}-${breakpoint.name}.png`,
          fullPage: true
        })
        
        console.log(`${browserName} ${breakpoint.name}: hero visible=${heroVisible}`)
      })
    }
  })

  test('should handle CSS Grid and Flexbox consistently', async ({ page, browserName }) => {
    const homePage = new HomePage(page)
    
    await test.step(`Test CSS Grid layout on ${browserName}`, async () => {
      await homePage.goto()
      
      // Check if CSS Grid is working
      const gridElements = await page.locator('.grid, [style*="grid"], [class*="grid-"]').count()
      const gridSupported = await page.evaluate(() => {
        return CSS.supports('display', 'grid')
      })
      
      console.log(`${browserName} CSS Grid: elements=${gridElements}, supported=${gridSupported}`)
      expect(gridSupported).toBeTruthy()
    })

    await test.step(`Test Flexbox layout on ${browserName}`, async () => {
      // Check if Flexbox is working
      const flexElements = await page.locator('.flex, [style*="flex"], [class*="flex-"]').count()
      const flexSupported = await page.evaluate(() => {
        return CSS.supports('display', 'flex')
      })
      
      console.log(`${browserName} Flexbox: elements=${flexElements}, supported=${flexSupported}`)
      expect(flexSupported).toBeTruthy()
    })
  })

  test('should handle ES6+ features consistently', async ({ page, browserName }) => {
    const homePage = new HomePage(page)
    
    await test.step(`Test modern JavaScript features on ${browserName}`, async () => {
      await homePage.goto()
      
      // Test if modern JS features are supported
      const jsFeatures = await page.evaluate(() => {
        try {
          // Test arrow functions
          const arrow = () => true
          
          // Test template literals
          const template = `template${arrow()}`
          
          // Test const/let
          const testConst = 'test'
          let testLet = 'test'
          
          // Test destructuring
          const [first] = [1, 2, 3]
          const { length } = 'test'
          
          // Test Promise
          const hasPromise = typeof Promise !== 'undefined'
          
          // Test fetch API
          const hasFetch = typeof fetch !== 'undefined'
          
          return {
            arrowFunctions: typeof arrow === 'function',
            templateLiterals: template === 'templetetrue',
            constLet: testConst === 'test' && testLet === 'test',
            destructuring: first === 1 && length === 4,
            promises: hasPromise,
            fetch: hasFetch
          }
        } catch (error) {
          return { error: error.message }
        }
      })
      
      console.log(`${browserName} JS features:`, jsFeatures)
      
      // Modern browsers should support these features
      if (!jsFeatures.error) {
        expect(jsFeatures.arrowFunctions).toBeTruthy()
        expect(jsFeatures.promises).toBeTruthy()
      }
    })
  })

  test('should handle touch events on mobile browsers', async ({ page, browserName }) => {
    // Only run on mobile-configured browsers
    if (browserName === 'chromium' || browserName === 'webkit') {
      const homePage = new HomePage(page)
      
      await test.step(`Test touch interactions on ${browserName}`, async () => {
        await page.setViewportSize({ width: 375, height: 667 })
        await homePage.goto()
        
        // Test touch tap on mobile
        await homePage.becomeMemberButton.tap()
        await page.waitForTimeout(1000)
        
        // Should navigate on touch
        const currentUrl = page.url()
        expect(currentUrl).toContain('/auth/register')
        
        console.log(`${browserName} touch navigation successful`)
      })
    }
  })

  test('should handle print styles consistently', async ({ page, browserName }) => {
    const homePage = new HomePage(page)
    
    await test.step(`Test print styles on ${browserName}`, async () => {
      await homePage.goto()
      
      // Emulate print media
      await page.emulateMedia({ media: 'print' })
      
      // Check if print styles are applied
      const printStyles = await page.evaluate(() => {
        const body = document.body
        const styles = window.getComputedStyle(body)
        return {
          backgroundColor: styles.backgroundColor,
          color: styles.color,
          fontSize: styles.fontSize
        }
      })
      
      console.log(`${browserName} print styles:`, printStyles)
      
      // Reset to screen media
      await page.emulateMedia({ media: 'screen' })
    })
  })

  test.afterEach(async ({ page, browserName }) => {
    // Collect browser-specific performance metrics
    const metrics = await TestHelpers.getPerformanceMetrics(page)
    console.log(`${browserName} performance metrics:`, {
      loadTime: metrics.loadComplete,
      resources: metrics.resourceCount,
      memory: metrics.memoryUsage?.used
    })
    
    // Take screenshot on failure
    if (test.info().status !== test.info().expectedStatus) {
      await TestHelpers.takeTimestampedScreenshot(page, `${browserName}-compatibility-failure`)
    }
  })
})

test.describe('Mobile Device Testing', () => {
  // Test specific mobile devices
  const mobileDevices = [
    { name: 'iPhone 12', device: devices['iPhone 12'] },
    { name: 'iPad', device: devices['iPad'] },
    { name: 'Samsung Galaxy S21', device: devices['Galaxy S8'] },
    { name: 'Pixel 5', device: devices['Pixel 5'] }
  ]

  for (const { name, device } of mobileDevices) {
    test(`should work correctly on ${name}`, async ({ browser }) => {
      const context = await browser.newContext({
        ...device,
      })
      const page = await context.newPage()
      
      const homePage = new HomePage(page)
      
      await test.step(`Test ${name} homepage`, async () => {
        await homePage.goto()
        await homePage.waitForHeroToLoad()
        
        // Verify mobile layout
        await expect(homePage.heroTitle).toBeVisible()
        await expect(homePage.becomeMemberButton).toBeVisible()
        
        // Check mobile navigation
        const mobileMenu = page.locator('button[aria-label*="menu"], .mobile-menu-toggle, [data-testid="mobile-menu"]')
        const mobileMenuExists = await mobileMenu.count() > 0
        
        if (mobileMenuExists) {
          await mobileMenu.click()
          await page.waitForTimeout(500)
        }
        
        console.log(`${name}: Mobile menu exists=${mobileMenuExists}`)
      })

      await test.step(`Test ${name} touch interactions`, async () => {
        // Test touch-specific interactions
        await homePage.becomeMemberButton.tap()
        await page.waitForTimeout(2000)
        
        // Should navigate correctly
        const currentUrl = page.url()
        expect(currentUrl).toContain('/auth/register')
        
        console.log(`${name}: Touch navigation successful`)
      })

      await test.step(`Test ${name} virtual keyboard`, async () => {
        const registrationPage = new RegistrationPage(page)
        await registrationPage.goto()
        
        // Focus on input to trigger virtual keyboard
        await registrationPage.firstNameInput.focus()
        await registrationPage.firstNameInput.fill('Test User')
        
        // Verify input still visible after virtual keyboard
        await expect(registrationPage.firstNameInput).toBeVisible()
        
        console.log(`${name}: Virtual keyboard handling successful`)
      })

      await test.step(`Take ${name} screenshot`, async () => {
        await homePage.goto()
        await page.screenshot({
          path: `test-results/device-screenshots/${name.replace(/\s+/g, '-')}.png`,
          fullPage: true
        })
      })
      
      await context.close()
    })
  }
})

test.describe('Browser Feature Detection', () => {
  test('should detect and adapt to browser capabilities', async ({ page, browserName }) => {
    const homePage = new HomePage(page)
    
    await test.step(`Detect ${browserName} capabilities`, async () => {
      await homePage.goto()
      
      const capabilities = await page.evaluate(() => {
        return {
          // CSS Features
          cssGrid: CSS.supports('display', 'grid'),
          cssFlexbox: CSS.supports('display', 'flex'),
          cssVariables: CSS.supports('--test', '0'),
          
          // JavaScript APIs
          intersectionObserver: 'IntersectionObserver' in window,
          webGL: (() => {
            try {
              const canvas = document.createElement('canvas')
              return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
            } catch (e) {
              return false
            }
          })(),
          serviceWorker: 'serviceWorker' in navigator,
          localStorage: 'localStorage' in window,
          sessionStorage: 'sessionStorage' in window,
          
          // Network APIs
          fetch: 'fetch' in window,
          webSockets: 'WebSocket' in window,
          
          // Media APIs
          mediaQueries: 'matchMedia' in window,
          audio: (() => {
            try {
              return !!(document.createElement('audio').canPlayType)
            } catch (e) {
              return false
            }
          })(),
          video: (() => {
            try {
              return !!(document.createElement('video').canPlayType)
            } catch (e) {
              return false
            }
          })(),
          
          // Security Features
          https: location.protocol === 'https:',
          
          // Performance APIs
          performanceObserver: 'PerformanceObserver' in window,
          performanceNavigation: 'performance' in window && 'navigation' in performance
        }
      })
      
      console.log(`${browserName} capabilities:`, capabilities)
      
      // Core capabilities should be available in modern browsers
      expect(capabilities.cssFlexbox).toBeTruthy()
      expect(capabilities.localStorage).toBeTruthy()
      expect(capabilities.fetch).toBeTruthy()
      
      // Log capability matrix for analysis
      const supportMatrix = Object.entries(capabilities)
        .map(([feature, supported]) => `${feature}: ${supported ? '✅' : '❌'}`)
        .join('\n')
      
      console.log(`${browserName} Support Matrix:\n${supportMatrix}`)
    })
  })
})
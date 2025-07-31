import { test, expect, devices } from '@playwright/test'
import { HomePage } from '../pages/HomePage'
import { RegistrationPage } from '../pages/RegistrationPage'
import { SignInPage } from '../pages/SignInPage'
import { MemberDashboardPage } from '../pages/MemberDashboardPage'
import { TestHelpers } from '../utils/test-helpers'

test.describe('Mobile UX Experience Testing', () => {
  test.beforeEach(async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
  })

  test('should handle mobile navigation patterns', async ({ page }) => {
    const homePage = new HomePage(page)
    
    await test.step('Test mobile menu hamburger pattern', async () => {
      await homePage.goto()
      
      // Look for mobile menu button
      const mobileMenuSelectors = [
        'button[aria-label*="menu"]',
        '.hamburger-menu',
        '[data-testid="mobile-menu"]',
        'button:has-text("☰")',
        '.mobile-menu-toggle'
      ]
      
      let mobileMenuFound = false
      for (const selector of mobileMenuSelectors) {
        const menuButton = page.locator(selector)
        if (await menuButton.count() > 0) {
          mobileMenuFound = true
          
          // Test menu toggle
          await menuButton.click()
          await page.waitForTimeout(500)
          
          // Menu should open
          const menuOpen = await page.locator('.mobile-menu, [aria-expanded="true"], .menu-open').count() > 0
          console.log(`Mobile menu opened: ${menuOpen}`)
          
          // Close menu
          await menuButton.click()
          await page.waitForTimeout(500)
          break
        }
      }
      
      console.log(`Mobile menu pattern found: ${mobileMenuFound}`)
    })

    await test.step('Test sticky navigation on mobile', async () => {
      // Scroll down to test sticky nav
      await page.evaluate(() => window.scrollTo(0, 500))
      await page.waitForTimeout(500)
      
      const nav = page.locator('nav, .navigation, header').first()
      const navVisible = await nav.isVisible()
      
      // Check if navigation remains accessible
      expect(navVisible).toBeTruthy()
      console.log(`Sticky navigation visible: ${navVisible}`)
    })
  })

  test('should optimize touch interactions', async ({ page }) => {
    const homePage = new HomePage(page)
    
    await test.step('Test touch target sizes', async () => {
      await homePage.goto()
      
      // Find all interactive elements
      const touchTargets = await page.locator('button, a, input[type="checkbox"], input[type="radio"]').all()
      const smallTargets: string[] = []
      
      for (const target of touchTargets) {
        if (await target.isVisible()) {
          const box = await target.boundingBox()
          
          if (box) {
            // WCAG recommends minimum 44x44 pixels for touch targets
            const hasAdequateSize = box.width >= 44 && box.height >= 44
            
            if (!hasAdequateSize) {
              const targetText = await target.textContent()
              smallTargets.push(`${targetText || 'unnamed'}: ${box.width}x${box.height}`)
            }
          }
        }
      }
      
      console.log(`Touch targets below 44px: ${smallTargets.length}`)
      smallTargets.forEach(target => console.log(`  - ${target}`))
      
      // Allow some small targets but flag if too many
      expect(smallTargets.length).toBeLessThan(10)
    })

    await test.step('Test touch gestures', async () => {
      // Test tap interactions
      await homePage.becomeMemberButton.tap()
      await page.waitForTimeout(2000)
      
      // Should navigate successfully
      const currentUrl = page.url()
      expect(currentUrl).toContain('/auth/register')
      
      console.log('Touch tap navigation successful')
    })

    await test.step('Test scroll performance on mobile', async () => {
      await homePage.goto()
      
      // Measure scroll performance
      const scrollStart = Date.now()
      
      await page.evaluate(() => {
        return new Promise(resolve => {
          let scrollCount = 0
          const scrollHeight = document.body.scrollHeight
          const viewportHeight = window.innerHeight
          const scrollStep = viewportHeight / 2
          
          function smoothScroll() {
            window.scrollBy(0, scrollStep)
            scrollCount++
            
            if (window.scrollY >= scrollHeight - viewportHeight || scrollCount > 10) {
              resolve(undefined)
            } else {
              requestAnimationFrame(smoothScroll)
            }
          }
          
          smoothScroll()
        })
      })
      
      const scrollTime = Date.now() - scrollStart
      console.log(`Mobile scroll performance: ${scrollTime}ms`)
      
      // Mobile scrolling should be smooth
      expect(scrollTime).toBeLessThan(3000)
    })
  })

  test('should handle virtual keyboard properly', async ({ page }) => {
    const registrationPage = new RegistrationPage(page)
    
    await test.step('Test virtual keyboard interaction', async () => {
      await registrationPage.goto()
      
      // Focus on input field to trigger virtual keyboard
      await registrationPage.firstNameInput.focus()
      await registrationPage.firstNameInput.fill('Test User')
      
      // Check that input remains visible and accessible
      await expect(registrationPage.firstNameInput).toBeVisible()
      
      // Test scrolling input into view
      const inputBox = await registrationPage.firstNameInput.boundingBox()
      expect(inputBox).toBeTruthy()
      
      if (inputBox) {
        // Input should be in viewport
        const isInViewport = inputBox.y >= 0 && inputBox.y <= 667
        console.log(`Input in viewport with virtual keyboard: ${isInViewport}`)
      }
    })

    await test.step('Test form submission on mobile', async () => {
      // Fill form completely
      await registrationPage.firstNameInput.fill('Mobile')
      await registrationPage.lastNameInput.fill('User')
      await registrationPage.emailInput.fill('mobile@test.com')
      await registrationPage.phoneInput.fill('5551234567')
      await registrationPage.companyInput.fill('Mobile Test Co')
      await registrationPage.passwordInput.fill('password123')
      await registrationPage.confirmPasswordInput.fill('password123')
      
      // Submit with mobile keyboard
      await registrationPage.nextButton.tap()
      await page.waitForTimeout(2000)
      
      // Should advance to next step
      const currentStep = await page.locator('.step-indicator, [data-step="2"], .progress-step').count()
      console.log(`Advanced to next step on mobile: ${currentStep > 0}`)
    })
  })

  test('should optimize mobile performance', async ({ page }) => {
    const homePage = new HomePage(page)
    
    await test.step('Test mobile load performance', async () => {
      const startTime = Date.now()
      await homePage.goto()
      await homePage.waitForHeroToLoad()
      
      const loadTime = Date.now() - startTime
      console.log(`Mobile load time: ${loadTime}ms`)
      
      // Mobile should load within 5 seconds
      expect(loadTime).toBeLessThan(5000)
    })

    await test.step('Test mobile resource optimization', async () => {
      const resourceMetrics = await page.evaluate(() => {
        const resources = performance.getEntriesByType('resource')
        
        return {
          totalResources: resources.length,
          totalSize: resources.reduce((sum, r) => sum + (r.transferSize || 0), 0),
          imageCount: resources.filter(r => r.name.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i)).length,
          cssCount: resources.filter(r => r.name.match(/\.css$/i)).length,
          jsCount: resources.filter(r => r.name.match(/\.js$/i)).length
        }
      })
      
      console.log('Mobile resource metrics:', resourceMetrics)
      
      // Mobile should have optimized resource usage
      expect(resourceMetrics.totalSize).toBeLessThan(3 * 1024 * 1024) // < 3MB
      expect(resourceMetrics.totalResources).toBeLessThan(50) // < 50 resources
    })

    await test.step('Test mobile memory usage', async () => {
      const memoryMetrics = await page.evaluate(() => {
        // @ts-ignore
        return (performance as any).memory ? {
          // @ts-ignore
          used: (performance as any).memory.usedJSHeapSize,
          // @ts-ignore
          total: (performance as any).memory.totalJSHeapSize
        } : null
      })
      
      if (memoryMetrics) {
        console.log('Mobile memory usage:', memoryMetrics)
        
        // Mobile should use less than 50MB
        expect(memoryMetrics.used).toBeLessThan(50 * 1024 * 1024)
      }
    })
  })

  test('should handle mobile-specific layouts', async ({ page }) => {
    const homePage = new HomePage(page)
    
    await test.step('Test mobile content hierarchy', async () => {
      await homePage.goto()
      
      // Check mobile content stacking
      const sections = await page.locator('section, .section, main > div').all()
      
      for (let i = 0; i < Math.min(sections.length, 5); i++) {
        const section = sections[i]
        if (await section.isVisible()) {
          const box = await section.boundingBox()
          
          if (box) {
            // Content should fit mobile width
            expect(box.width).toBeLessThanOrEqual(375)
            console.log(`Section ${i}: width=${box.width}px`)
          }
        }
      }
    })

    await test.step('Test mobile typography', async () => {
      const textElements = await page.locator('h1, h2, h3, p, span').all()
      
      for (let i = 0; i < Math.min(textElements.length, 10); i++) {
        const element = textElements[i]
        if (await element.isVisible()) {
          const styles = await element.evaluate(el => {
            const computed = window.getComputedStyle(el)
            return {
              fontSize: parseFloat(computed.fontSize),
              lineHeight: computed.lineHeight,
              marginBottom: parseFloat(computed.marginBottom)
            }
          })
          
          // Mobile text should be readable (min 16px for body)
          if (element.locator('p, span, div').count() > 0) {
            expect(styles.fontSize).toBeGreaterThanOrEqual(14) // Allow 14px minimum
          }
          
          console.log(`Text element ${i}: fontSize=${styles.fontSize}px`)
        }
      }
    })
  })

  test('should handle mobile accessibility', async ({ page }) => {
    const homePage = new HomePage(page)
    
    await test.step('Test mobile accessibility features', async () => {
      await homePage.goto()
      
      // Check zoom compatibility
      await page.evaluate(() => {
        document.body.style.zoom = '200%'
      })
      
      await page.waitForTimeout(500)
      
      // Content should still be accessible at 200% zoom
      await expect(homePage.heroTitle).toBeVisible()
      await expect(homePage.becomeMemberButton).toBeVisible()
      
      // Reset zoom
      await page.evaluate(() => {
        document.body.style.zoom = '100%'
      })
      
      console.log('Mobile zoom accessibility test passed')
    })

    await test.step('Test mobile screen reader compatibility', async () => {
      // Check for mobile-friendly ARIA labels
      const interactiveElements = await page.locator('button, a, input').all()
      let elementsWithLabels = 0
      
      for (const element of interactiveElements) {
        if (await element.isVisible()) {
          const ariaLabel = await element.getAttribute('aria-label')
          const title = await element.getAttribute('title')
          const textContent = await element.textContent()
          
          if (ariaLabel || title || (textContent && textContent.trim().length > 0)) {
            elementsWithLabels++
          }
        }
      }
      
      console.log(`Interactive elements with labels: ${elementsWithLabels}`)
      expect(elementsWithLabels).toBeGreaterThan(0)
    })
  })

  test('should handle mobile orientation changes', async ({ page }) => {
    const homePage = new HomePage(page)
    
    await test.step('Test portrait orientation', async () => {
      await page.setViewportSize({ width: 375, height: 667 })
      await homePage.goto()
      
      await expect(homePage.heroTitle).toBeVisible()
      await expect(homePage.becomeMemberButton).toBeVisible()
      
      console.log('Portrait orientation layout working')
    })

    await test.step('Test landscape orientation', async () => {
      await page.setViewportSize({ width: 667, height: 375 })
      await page.waitForTimeout(500)
      
      // Content should adapt to landscape
      await expect(homePage.heroTitle).toBeVisible()
      await expect(homePage.becomeMemberButton).toBeVisible()
      
      console.log('Landscape orientation layout working')
    })

    await test.step('Test orientation change handling', async () => {
      // Simulate orientation change
      await page.setViewportSize({ width: 375, height: 667 })
      await page.waitForTimeout(500)
      await page.setViewportSize({ width: 667, height: 375 })
      await page.waitForTimeout(500)
      
      // Layout should remain functional
      const pageTitle = await page.title()
      expect(pageTitle).toBeTruthy()
      
      console.log('Orientation change handling successful')
    })
  })

  test('should handle mobile form UX patterns', async ({ page }) => {
    const registrationPage = new RegistrationPage(page)
    
    await test.step('Test mobile form layout', async () => {
      await registrationPage.goto()
      
      // Form should stack vertically on mobile
      const formInputs = await page.locator('input').all()
      
      for (let i = 0; i < Math.min(formInputs.length, 5); i++) {
        const input = formInputs[i]
        if (await input.isVisible()) {
          const box = await input.boundingBox()
          
          if (box) {
            // Input should span most of mobile width
            expect(box.width).toBeGreaterThan(250) // At least 250px wide
            console.log(`Form input ${i}: width=${box.width}px`)
          }
        }
      }
    })

    await test.step('Test mobile input types', async () => {
      // Check appropriate input types for mobile
      const emailInput = registrationPage.emailInput
      const phoneInput = registrationPage.phoneInput
      
      const emailInputType = await emailInput.getAttribute('type')
      const phoneInputType = await phoneInput.getAttribute('type')
      
      // Should use appropriate input types for mobile keyboards
      expect(emailInputType).toBe('email')
      expect(phoneInputType === 'tel' || phoneInputType === 'phone').toBeTruthy()
      
      console.log(`Input types: email=${emailInputType}, phone=${phoneInputType}`)
    })

    await test.step('Test mobile validation feedback', async () => {
      // Test immediate validation feedback
      await registrationPage.emailInput.fill('invalid')
      await registrationPage.emailInput.blur()
      
      await page.waitForTimeout(500)
      
      // Should show validation message
      const validationMessage = await page.locator('.text-red-500, [role="alert"], .error-message').count()
      expect(validationMessage).toBeGreaterThan(0)
      
      console.log('Mobile validation feedback working')
    })
  })
})

test.describe('Device-Specific Testing', () => {
  // Test on actual device configurations
  const testDevices = [
    { name: 'iPhone SE', config: devices['iPhone SE'] },
    { name: 'iPhone 12', config: devices['iPhone 12'] },
    { name: 'iPhone 12 Pro Max', config: devices['iPhone 12 Pro Max'] },
    { name: 'iPad Air', config: devices['iPad Air'] },
    { name: 'Samsung Galaxy S8', config: devices['Galaxy S8'] },
    { name: 'Samsung Galaxy Tab S4', config: devices['Galaxy Tab S4'] }
  ]

  for (const { name, config } of testDevices) {
    test(`should work optimally on ${name}`, async ({ browser }) => {
      const context = await browser.newContext({
        ...config,
      })
      const page = await context.newPage()
      
      const homePage = new HomePage(page)
      
      await test.step(`Test ${name} device compatibility`, async () => {
        await homePage.goto()
        await homePage.waitForHeroToLoad()
        
        // Core functionality should work
        await expect(homePage.heroTitle).toBeVisible()
        await expect(homePage.becomeMemberButton).toBeVisible()
        
        // Measure device-specific performance
        const metrics = await TestHelpers.getPerformanceMetrics(page)
        
        console.log(`${name} performance:`, {
          loadTime: metrics.loadComplete,
          firstPaint: metrics.firstPaint,
          resources: metrics.resourceCount
        })
        
        // Device should load within reasonable time
        expect(metrics.loadComplete).toBeLessThan(8000) // 8 seconds max
      })

      await test.step(`Test ${name} interaction patterns`, async () => {
        // Test device-appropriate interactions
        if (name.includes('iPhone') || name.includes('Galaxy')) {
          // Mobile interactions
          await homePage.becomeMemberButton.tap()
        } else {
          // Tablet interactions
          await homePage.becomeMemberButton.click()
        }
        
        await page.waitForTimeout(2000)
        
        // Should navigate successfully
        const currentUrl = page.url()
        expect(currentUrl).toContain('/auth/register')
        
        console.log(`${name} interaction successful`)
      })

      await test.step(`Capture ${name} screenshot`, async () => {
        await homePage.goto()
        await page.screenshot({
          path: `test-results/device-screenshots/${name.replace(/\s+/g, '-').toLowerCase()}.png`,
          fullPage: true
        })
      })
      
      await context.close()
    })
  }
})

test.describe('Progressive Web App Features', () => {
  test('should handle offline capabilities', async ({ page }) => {
    const homePage = new HomePage(page)
    
    await test.step('Test offline page loading', async () => {
      await homePage.goto()
      
      // Go offline
      await page.route('**/*', route => route.abort('internetdisconnected'))
      
      // Try to navigate
      await page.reload()
      await page.waitForTimeout(2000)
      
      // Should show offline message or cached content
      const pageContent = await page.textContent('body')
      const hasOfflineHandling = pageContent?.includes('offline') || 
                                 pageContent?.includes('network') ||
                                 pageContent?.includes('connection')
      
      console.log(`Offline handling detected: ${hasOfflineHandling}`)
    })
  })

  test('should handle app-like features', async ({ page }) => {
    const homePage = new HomePage(page)
    
    await test.step('Test PWA manifest', async () => {
      await homePage.goto()
      
      // Check for PWA manifest
      const manifest = await page.locator('link[rel="manifest"]').getAttribute('href')
      
      if (manifest) {
        console.log(`PWA manifest found: ${manifest}`)
        
        // Fetch and validate manifest
        const manifestResponse = await page.context().request.get(manifest)
        const manifestData = await manifestResponse.json()
        
        expect(manifestData.name || manifestData.short_name).toBeTruthy()
        console.log('PWA manifest valid')
      } else {
        console.log('No PWA manifest found')
      }
    })

    await test.step('Test service worker registration', async () => {
      const hasServiceWorker = await page.evaluate(() => {
        return 'serviceWorker' in navigator
      })
      
      console.log(`Service worker support: ${hasServiceWorker}`)
      
      if (hasServiceWorker) {
        const registrations = await page.evaluate(() => {
          return navigator.serviceWorker.getRegistrations()
        })
        
        console.log(`Service worker registrations: ${registrations.length}`)
      }
    })
  })
})
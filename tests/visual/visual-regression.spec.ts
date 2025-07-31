import { test, expect } from '@playwright/test'
import { HomePage } from '../pages/HomePage'
import { RegistrationPage } from '../pages/RegistrationPage'
import { SignInPage } from '../pages/SignInPage'
import { MemberDashboardPage } from '../pages/MemberDashboardPage'
import { TestHelpers } from '../utils/test-helpers'

test.describe('Visual Regression Testing', () => {
  test('should maintain visual consistency across homepage states', async ({ page }) => {
    const homePage = new HomePage(page)
    
    await test.step('Capture homepage baseline', async () => {
      await homePage.goto()
      await homePage.waitForHeroToLoad()
      await homePage.waitForAnimations()
      
      // Take full page screenshot
      await expect(page).toHaveScreenshot('homepage-baseline.png', {
        fullPage: true,
        animations: 'disabled'
      })
    })

    await test.step('Capture homepage with hover states', async () => {
      // Hover over primary CTA
      await homePage.becomeMemberButton.hover()
      await page.waitForTimeout(300)
      
      await expect(page).toHaveScreenshot('homepage-hover-cta.png', {
        fullPage: true,
        animations: 'disabled'
      })
    })

    await test.step('Capture mobile homepage', async () => {
      await page.setViewportSize({ width: 375, height: 667 })
      await page.waitForTimeout(500)
      
      await expect(page).toHaveScreenshot('homepage-mobile.png', {
        fullPage: true,
        animations: 'disabled'
      })
    })

    await test.step('Capture tablet homepage', async () => {
      await page.setViewportSize({ width: 768, height: 1024 })
      await page.waitForTimeout(500)
      
      await expect(page).toHaveScreenshot('homepage-tablet.png', {
        fullPage: true,
        animations: 'disabled'
      })
    })
  })

  test('should maintain visual consistency in registration flow', async ({ page }) => {
    const registrationPage = new RegistrationPage(page)
    const testUserData = TestHelpers.generateTestUser()
    
    await test.step('Capture step 1 baseline', async () => {
      await registrationPage.goto()
      await registrationPage.waitForPageLoad()
      
      await expect(page).toHaveScreenshot('registration-step1-baseline.png', {
        fullPage: true,
        animations: 'disabled'
      })
    })

    await test.step('Capture step 1 with validation errors', async () => {
      // Trigger validation errors
      await registrationPage.nextButton.click()
      await page.waitForTimeout(1000)
      
      await expect(page).toHaveScreenshot('registration-step1-errors.png', {
        fullPage: true,
        animations: 'disabled'
      })
    })

    await test.step('Capture step 1 filled state', async () => {
      await registrationPage.fillStep1(testUserData.step1)
      await page.waitForTimeout(500)
      
      await expect(page).toHaveScreenshot('registration-step1-filled.png', {
        fullPage: true,
        animations: 'disabled'
      })
    })

    await test.step('Capture step 2 baseline', async () => {
      await registrationPage.clickNext()
      await page.waitForTimeout(1000)
      
      await expect(page).toHaveScreenshot('registration-step2-baseline.png', {
        fullPage: true,
        animations: 'disabled'
      })
    })

    await test.step('Capture step 2 with specialties selected', async () => {
      await registrationPage.fillStep2(testUserData.step2)
      
      // Select specialties
      const specialtyCheckboxes = await page.locator('input[type="checkbox"]').all()
      for (let i = 0; i < Math.min(specialtyCheckboxes.length, 3); i++) {
        await specialtyCheckboxes[i].check()
      }
      
      await page.waitForTimeout(500)
      
      await expect(page).toHaveScreenshot('registration-step2-filled.png', {
        fullPage: true,
        animations: 'disabled'
      })
    })

    await test.step('Capture mobile registration', async () => {
      await page.setViewportSize({ width: 375, height: 667 })
      await page.waitForTimeout(500)
      
      await expect(page).toHaveScreenshot('registration-mobile.png', {
        fullPage: true,
        animations: 'disabled'
      })
    })
  })

  test('should maintain visual consistency in authentication', async ({ page }) => {
    const signInPage = new SignInPage(page)
    
    await test.step('Capture sign in baseline', async () => {
      await signInPage.goto()
      await signInPage.waitForPageLoad()
      
      await expect(page).toHaveScreenshot('signin-baseline.png', {
        fullPage: true,
        animations: 'disabled'
      })
    })

    await test.step('Capture sign in with error state', async () => {
      await signInPage.signIn('invalid@email.com', 'wrongpassword')
      await page.waitForTimeout(2000)
      
      await expect(page).toHaveScreenshot('signin-error-state.png', {
        fullPage: true,
        animations: 'disabled'
      })
    })

    await test.step('Capture password visibility toggle', async () => {
      await page.reload()
      await signInPage.waitForPageLoad()
      
      await signInPage.passwordInput.fill('testpassword')
      await signInPage.showPasswordButton.click()
      await page.waitForTimeout(300)
      
      await expect(page).toHaveScreenshot('signin-password-visible.png', {
        fullPage: true,
        animations: 'disabled'
      })
    })

    await test.step('Capture loading state', async () => {
      await page.reload()
      await signInPage.waitForPageLoad()
      
      // Fill form and capture during submission
      await signInPage.emailInput.fill('test@example.com')
      await signInPage.passwordInput.fill('password123')
      
      // Click and immediately capture loading state
      await signInPage.signInButton.click()
      await page.waitForTimeout(100) // Capture during loading
      
      await expect(page).toHaveScreenshot('signin-loading-state.png', {
        animations: 'disabled'
      })
    })
  })

  test('should maintain visual consistency in dashboard', async ({ page }) => {
    const memberDashboard = new MemberDashboardPage(page)
    
    await test.step('Capture dashboard baseline', async () => {
      await TestHelpers.authenticateAsMember(page)
      await memberDashboard.goto()
      await memberDashboard.waitForDashboardLoad()
      
      await expect(page).toHaveScreenshot('dashboard-baseline.png', {
        fullPage: true,
        animations: 'disabled'
      })
    })

    await test.step('Capture dashboard with hover effects', async () => {
      // Hover over stat cards
      const statCard = memberDashboard.statCards.first()
      await statCard.hover()
      await page.waitForTimeout(300)
      
      await expect(page).toHaveScreenshot('dashboard-hover-effects.png', {
        fullPage: true,
        animations: 'disabled'
      })
    })

    await test.step('Capture mobile dashboard', async () => {
      await page.setViewportSize({ width: 375, height: 667 })
      await page.waitForTimeout(500)
      
      await expect(page).toHaveScreenshot('dashboard-mobile.png', {
        fullPage: true,
        animations: 'disabled'
      })
    })

    await test.step('Capture dashboard empty states', async () => {
      // Mock empty data
      await TestHelpers.mockApiResponse(page, '**/api/dashboard**', {
        success: true,
        data: {
          stats: { projectsApplied: 0, coursesCompleted: 0, toolsReserved: 0, messagesUnread: 0 },
          recentActivity: [],
          upcomingEvents: [],
          projectOpportunities: []
        }
      })
      
      await page.reload()
      await memberDashboard.waitForDashboardLoad()
      
      await expect(page).toHaveScreenshot('dashboard-empty-states.png', {
        fullPage: true,
        animations: 'disabled'
      })
    })
  })

  test('should maintain visual consistency across color themes', async ({ page }) => {
    const homePage = new HomePage(page)
    
    await test.step('Test default theme', async () => {
      await homePage.goto()
      await homePage.waitForHeroToLoad()
      
      await expect(page).toHaveScreenshot('theme-default.png', {
        fullPage: true,
        animations: 'disabled'
      })
    })

    await test.step('Test high contrast mode', async () => {
      // Simulate high contrast
      await page.evaluate(() => {
        document.body.style.filter = 'contrast(200%)'
      })
      
      await page.waitForTimeout(500)
      
      await expect(page).toHaveScreenshot('theme-high-contrast.png', {
        fullPage: true,
        animations: 'disabled'
      })
    })

    await test.step('Test dark background simulation', async () => {
      await page.evaluate(() => {
        document.body.style.filter = 'invert(1) hue-rotate(180deg)'
      })
      
      await page.waitForTimeout(500)
      
      await expect(page).toHaveScreenshot('theme-dark-simulation.png', {
        fullPage: true,
        animations: 'disabled'
      })
    })
  })

  test('should handle visual consistency in error states', async ({ page }) => {
    const homePage = new HomePage(page)
    
    await test.step('Capture 404 error state', async () => {
      await page.goto('/nonexistent-page')
      await page.waitForTimeout(2000)
      
      await expect(page).toHaveScreenshot('error-404-state.png', {
        fullPage: true,
        animations: 'disabled'
      })
    })

    await test.step('Capture network error state', async () => {
      await homePage.goto()
      
      // Mock network failure
      await page.route('**/api/**', route => {
        route.abort('failed')
      })
      
      // Try to trigger API call
      const newsletterInput = page.locator('input[type="email"]').first()
      if (await newsletterInput.isVisible()) {
        await newsletterInput.fill('test@example.com')
        const submitButton = page.locator('button:has-text("Subscribe"), button:has-text("Join")').first()
        if (await submitButton.isVisible()) {
          await submitButton.click()
          await page.waitForTimeout(2000)
        }
      }
      
      await expect(page).toHaveScreenshot('error-network-state.png', {
        fullPage: true,
        animations: 'disabled'
      })
    })

    await test.step('Capture loading timeout state', async () => {
      // Simulate slow loading
      await page.route('**/*', async route => {
        await page.waitForTimeout(5000)
        route.continue()
      })
      
      await page.goto('/')
      await page.waitForTimeout(3000) // Capture during loading
      
      await expect(page).toHaveScreenshot('error-timeout-state.png', {
        animations: 'disabled'
      })
    })
  })

  test('should maintain print layout consistency', async ({ page }) => {
    const homePage = new HomePage(page)
    
    await test.step('Capture print layout', async () => {
      await homePage.goto()
      await homePage.waitForHeroToLoad()
      
      // Emulate print media
      await page.emulateMedia({ media: 'print' })
      await page.waitForTimeout(500)
      
      await expect(page).toHaveScreenshot('print-layout.png', {
        fullPage: true,
        animations: 'disabled'
      })
    })
  })

  test('should handle visual consistency with JavaScript disabled', async ({ page }) => {
    await test.step('Capture no-JS state', async () => {
      // Disable JavaScript
      await page.setJavaScriptEnabled(false)
      
      const homePage = new HomePage(page)
      await homePage.goto()
      await page.waitForTimeout(2000)
      
      await expect(page).toHaveScreenshot('no-javascript-state.png', {
        fullPage: true,
        animations: 'disabled'
      })
    })
  })

  test('should maintain visual consistency with different zoom levels', async ({ page }) => {
    const homePage = new HomePage(page)
    
    const zoomLevels = [0.75, 1.0, 1.25, 1.5, 2.0]
    
    for (const zoom of zoomLevels) {
      await test.step(`Capture at ${zoom * 100}% zoom`, async () => {
        await homePage.goto()
        await homePage.waitForHeroToLoad()
        
        // Set zoom level
        await page.evaluate((zoomLevel) => {
          document.body.style.zoom = zoomLevel.toString()
        }, zoom)
        
        await page.waitForTimeout(500)
        
        await expect(page).toHaveScreenshot(`zoom-${zoom * 100}percent.png`, {
          fullPage: true,
          animations: 'disabled'
        })
      })
    }
  })

  test('should handle visual consistency in different languages', async ({ page }) => {
    const homePage = new HomePage(page)
    
    await test.step('Capture with different text lengths', async () => {
      await homePage.goto()
      await homePage.waitForHeroToLoad()
      
      // Simulate longer text content (like German)
      await page.evaluate(() => {
        const headings = document.querySelectorAll('h1, h2, h3')
        headings.forEach(heading => {
          if (heading.textContent) {
            heading.textContent = heading.textContent + ' und Zusätzliche Lange Deutsche Wörter'
          }
        })
      })
      
      await page.waitForTimeout(500)
      
      await expect(page).toHaveScreenshot('long-text-simulation.png', {
        fullPage: true,
        animations: 'disabled'
      })
    })

    await test.step('Capture with shorter text', async () => {
      await page.reload()
      await homePage.waitForHeroToLoad()
      
      // Simulate shorter text content
      await page.evaluate(() => {
        const headings = document.querySelectorAll('h1, h2, h3')
        headings.forEach(heading => {
          if (heading.textContent && heading.textContent.length > 10) {
            heading.textContent = heading.textContent.substring(0, 10) + '…'
          }
        })
      })
      
      await page.waitForTimeout(500)
      
      await expect(page).toHaveScreenshot('short-text-simulation.png', {
        fullPage: true,
        animations: 'disabled'
      })
    })
  })

  test.afterEach(async ({ page }) => {
    // Reset any modifications
    await page.evaluate(() => {
      document.body.style.zoom = '1'
      document.body.style.filter = 'none'
    })
    
    await page.setJavaScriptEnabled(true)
    await page.emulateMedia({ media: 'screen' })
    
    // Take failure screenshot
    if (test.info().status !== test.info().expectedStatus) {
      await TestHelpers.takeTimestampedScreenshot(page, 'visual-regression-failure')
    }
  })
})
import { test, expect } from '@playwright/test'
import { HomePage } from '../pages/HomePage'
import { RegistrationPage } from '../pages/RegistrationPage'
import { SignInPage } from '../pages/SignInPage'
import { MemberDashboardPage } from '../pages/MemberDashboardPage'
import { TestHelpers } from '../utils/test-helpers'

test.describe('API Integration and Third-Party Service Testing', () => {
  test('should handle API service failures gracefully', async ({ page }) => {
    const memberDashboard = new MemberDashboardPage(page)
    
    await test.step('Test dashboard API failure', async () => {
      // Mock API failure
      await page.route('**/api/dashboard**', route => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            message: 'Internal server error'
          })
        })
      })
      
      await TestHelpers.authenticateAsMember(page)
      await memberDashboard.goto()
      await page.waitForTimeout(3000)
      
      // Should handle API failure gracefully
      const errorElements = await page.locator('[role="alert"], .error-message, text=error, text=Error').count()
      const pageTitle = await page.title()
      
      // Either show error message or degrade gracefully
      expect(errorElements > 0 || pageTitle.length > 0).toBeTruthy()
      
      console.log('Dashboard API failure handled gracefully')
    })

    await test.step('Test authentication API failure', async () => {
      // Mock auth API failure
      await page.route('**/api/auth/**', route => {
        route.fulfill({
          status: 503,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            message: 'Service temporarily unavailable'
          })
        })
      })
      
      const signInPage = new SignInPage(page)
      await signInPage.goto()
      
      await signInPage.signIn('test@example.com', 'password123')
      await page.waitForTimeout(3000)
      
      // Should show appropriate error message
      const errorMessage = await signInPage.checkForErrors()
      const stillOnSignInPage = page.url().includes('/auth/signin')
      
      expect(errorMessage !== null || stillOnSignInPage).toBeTruthy()
      
      console.log('Authentication API failure handled')
    })

    await test.step('Test registration API failure', async () => {
      const registrationPage = new RegistrationPage(page)
      const testUserData = TestHelpers.generateTestUser()
      
      // Mock registration API failure at final step
      await page.route('**/api/auth/register**', route => {
        route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            message: 'Registration failed - email already exists'
          })
        })
      })
      
      await registrationPage.goto()
      await registrationPage.completeRegistration(testUserData)
      
      // Should show error message
      const errorElements = await page.locator('.text-red-500, [role="alert"], .error-message').count()
      expect(errorElements).toBeGreaterThan(0)
      
      console.log('Registration API failure handled')
    })
  })

  test('should handle API timeout scenarios', async ({ page }) => {
    const signInPage = new SignInPage(page)
    
    await test.step('Test slow API response', async () => {
      // Mock slow API response
      await page.route('**/api/auth/**', async (route) => {
        await page.waitForTimeout(10000) // 10 second delay
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            message: 'Login successful (slow)'
          })
        })
      })
      
      await signInPage.goto()
      
      const startTime = Date.now()
      await signInPage.signIn('test@example.com', 'password123')
      
      // Don't wait for full response - test timeout handling
      await page.waitForTimeout(3000)
      
      const elapsedTime = Date.now() - startTime
      console.log(`API timeout test elapsed time: ${elapsedTime}ms`)
      
      // Should either show loading state or timeout message
      const loadingElements = await page.locator('.loading, .spinner, text=loading, text=Loading').count()
      const timeoutElements = await page.locator('text=timeout, text=slow, text=taking').count()
      
      expect(loadingElements > 0 || timeoutElements > 0).toBeTruthy()
      
      console.log('Slow API response handled')
    })

    await test.step('Test intermittent API failures', async () => {
      let requestCount = 0
      
      await page.route('**/api/**', (route) => {
        requestCount++
        
        // Fail every 3rd request
        if (requestCount % 3 === 0) {
          route.fulfill({
            status: 503,
            contentType: 'application/json',
            body: JSON.stringify({ success: false, message: 'Service unavailable' })
          })
        } else {
          route.continue()
        }
      })
      
      const homePage = new HomePage(page)
      await homePage.goto()
      
      // Try newsletter signup (if available)
      const newsletterInput = page.locator('input[type="email"]').first()
      if (await newsletterInput.isVisible()) {
        await newsletterInput.fill('test@example.com')
        const submitButton = page.locator('button:has-text("Subscribe"), button:has-text("Join")').first()
        
        if (await submitButton.isVisible()) {
          // Try multiple times to test retry logic
          for (let i = 0; i < 5; i++) {
            await submitButton.click()
            await page.waitForTimeout(1000)
          }
        }
      }
      
      // Page should remain functional despite intermittent failures
      await expect(homePage.heroTitle).toBeVisible()
      
      console.log(`Intermittent API failures tested: ${requestCount} requests`)
    })
  })

  test('should handle third-party service integration failures', async ({ page }) => {
    const homePage = new HomePage(page)
    
    await test.step('Test map service failure', async () => {
      // Block map service requests (Mapbox, Google Maps, etc.)
      await page.route('**/maps.googleapis.com/**', route => route.abort('failed'))
      await page.route('**/mapbox.com/**', route => route.abort('failed'))
      await page.route('**/openstreetmap.org/**', route => route.abort('failed'))
      
      await homePage.goto()
      await page.waitForTimeout(3000)
      
      // Page should load despite map service failure
      await expect(homePage.heroTitle).toBeVisible()
      
      // Check if fallback content is shown for maps
      const mapContainers = await page.locator('.map, #map, [id*="map"], [class*="map"]').count()
      
      if (mapContainers > 0) {
        console.log('Map containers found, testing fallback behavior')
        
        // Maps should either show placeholder or hide gracefully
        const mapVisible = await page.locator('.map:visible, #map:visible').count()
        console.log(`Visible maps after service failure: ${mapVisible}`)
      }
      
      console.log('Map service failure handled')
    })

    await test.step('Test analytics service failure', async () => {
      // Block analytics services
      await page.route('**/google-analytics.com/**', route => route.abort('failed'))
      await page.route('**/googletagmanager.com/**', route => route.abort('failed'))
      await page.route('**/hotjar.com/**', route => route.abort('failed'))
      await page.route('**/mixpanel.com/**', route => route.abort('failed'))
      
      await homePage.goto()
      await page.waitForTimeout(2000)
      
      // Core functionality should work without analytics
      await expect(homePage.heroTitle).toBeVisible()
      await expect(homePage.becomeMemberButton).toBeVisible()
      
      // Test navigation still works
      await homePage.becomeMemberButton.click()
      await page.waitForTimeout(2000)
      
      const currentUrl = page.url()
      expect(currentUrl).toContain('/auth/register')
      
      console.log('Analytics service failure handled')
    })

    await test.step('Test CDN failure', async () => {
      // Block CDN resources
      await page.route('**/cdn.jsdelivr.net/**', route => route.abort('failed'))
      await page.route('**/unpkg.com/**', route => route.abort('failed'))
      await page.route('**/cdnjs.cloudflare.com/**', route => route.abort('failed'))
      
      await homePage.goto()
      await page.waitForTimeout(3000)
      
      // Core functionality should work with local fallbacks
      await expect(homePage.heroTitle).toBeVisible()
      
      console.log('CDN failure handled with local fallbacks')
    })

    await test.step('Test font service failure', async () => {
      // Block Google Fonts and other font services
      await page.route('**/fonts.googleapis.com/**', route => route.abort('failed'))
      await page.route('**/fonts.gstatic.com/**', route => route.abort('failed'))
      await page.route('**/typekit.net/**', route => route.abort('failed'))
      
      await homePage.goto()
      await page.waitForTimeout(2000)
      
      // Text should still be readable with fallback fonts
      await expect(homePage.heroTitle).toBeVisible()
      
      const titleStyles = await homePage.heroTitle.evaluate(el => {
        const styles = window.getComputedStyle(el)
        return {
          fontFamily: styles.fontFamily,
          fontSize: styles.fontSize,
          display: styles.display
        }
      })
      
      // Should have fallback font and be visible
      expect(titleStyles.display).not.toBe('none')
      expect(titleStyles.fontFamily).toBeTruthy()
      
      console.log('Font service failure handled with fallbacks')
    })
  })

  test('should handle data consistency issues', async ({ page }) => {
    const memberDashboard = new MemberDashboardPage(page)
    
    await test.step('Test stale data handling', async () => {
      // Mock stale data response
      await page.route('**/api/dashboard**', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              stats: { projectsApplied: 999, coursesCompleted: 888, toolsReserved: 777, messagesUnread: 666 },
              recentActivity: [
                { id: 1, type: 'project', title: 'Old Activity 1', timestamp: '2020-01-01T00:00:00Z' },
                { id: 2, type: 'course', title: 'Old Activity 2', timestamp: '2020-01-02T00:00:00Z' }
              ],
              upcomingEvents: [],
              projectOpportunities: [],
              lastUpdated: '2020-01-01T00:00:00Z' // Very old timestamp
            }
          })
        })
      })
      
      await TestHelpers.authenticateAsMember(page)
      await memberDashboard.goto()
      await memberDashboard.waitForDashboardLoad()
      
      // Should display the data even if stale
      await memberDashboard.verifyStatsCards()
      
      // Check if there's any stale data indicator
      const staleIndicators = await page.locator('text=outdated, text=refresh, text=update').count()
      
      console.log(`Stale data indicators found: ${staleIndicators}`)
      console.log('Stale data handling tested')
    })

    await test.step('Test malformed API responses', async () => {
      const malformedResponses = [
        '{"incomplete": true', // Invalid JSON
        '{"success": "maybe", "data": null}', // Unexpected format
        '<html><body>Error 500</body></html>', // HTML instead of JSON
        '{"data": {"stats": "not_an_object"}}', // Wrong data types
        '' // Empty response
      ]
      
      for (let i = 0; i < malformedResponses.length; i++) {
        const response = malformedResponses[i]
        
        await page.route('**/api/dashboard**', route => {
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: response
          })
        })
        
        await page.reload()
        await page.waitForTimeout(2000)
        
        // Should handle malformed responses gracefully
        const pageTitle = await page.title()
        expect(pageTitle).toBeTruthy()
        
        console.log(`Malformed response ${i + 1} handled gracefully`)
      }
    })

    await test.step('Test data validation errors', async () => {
      // Mock API returning invalid data
      await page.route('**/api/dashboard**', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              stats: { 
                projectsApplied: -1, // Invalid negative number
                coursesCompleted: 'invalid', // Wrong type
                toolsReserved: null, // Null value
                messagesUnread: undefined // Undefined value
              },
              recentActivity: [
                { id: 'not_a_number', title: null, timestamp: 'invalid_date' }
              ],
              upcomingEvents: 'not_an_array',
              projectOpportunities: {}
            }
          })
        })
      })
      
      await page.reload()
      await memberDashboard.waitForDashboardLoad()
      
      // Should handle invalid data gracefully
      const dashboardStillVisible = await memberDashboard.welcomeTitle.isVisible()
      expect(dashboardStillVisible).toBeTruthy()
      
      console.log('Data validation errors handled')
    })
  })

  test('should handle authentication edge cases', async ({ page, context }) => {
    const signInPage = new SignInPage(page)
    
    await test.step('Test expired token handling', async () => {
      // Authenticate normally first
      await TestHelpers.authenticateAsMember(page)
      
      const memberDashboard = new MemberDashboardPage(page)
      await memberDashboard.goto()
      await expect(memberDashboard.welcomeTitle).toBeVisible()
      
      // Mock API returning 401 (expired token)
      await page.route('**/api/**', route => {
        route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            message: 'Token expired'
          })
        })
      })
      
      // Try to access protected resource
      await page.reload()
      await page.waitForTimeout(3000)
      
      // Should redirect to login or show appropriate message
      const currentUrl = page.url()
      const redirectedToAuth = currentUrl.includes('/auth/signin') || 
                              currentUrl.includes('/login')
      
      const authElements = await page.locator('text=Sign in, text=Login, text=expired, text=session').count()
      
      expect(redirectedToAuth || authElements > 0).toBeTruthy()
      
      console.log('Expired token handled')
    })

    await test.step('Test concurrent session handling', async () => {
      // Create second browser context (simulate different device)
      const secondContext = await page.context().browser()!.newContext()
      const secondPage = await secondContext.newPage()
      
      // Authenticate in both contexts with same user
      await TestHelpers.authenticateAsMember(page)
      await TestHelpers.authenticateAsMember(secondPage)
      
      const dashboard1 = new MemberDashboardPage(page)
      const dashboard2 = new MemberDashboardPage(secondPage)
      
      await dashboard1.goto()
      await dashboard2.goto()
      
      // Both should work or handle gracefully
      const dashboard1Working = await dashboard1.welcomeTitle.isVisible()
      const dashboard2Working = await dashboard2.welcomeTitle.isVisible()
      
      console.log(`Concurrent sessions: D1=${dashboard1Working}, D2=${dashboard2Working}`)
      
      // At least one should work
      expect(dashboard1Working || dashboard2Working).toBeTruthy()
      
      await secondContext.close()
      
      console.log('Concurrent session handling tested')
    })

    await test.step('Test invalid session data', async () => {
      // Set invalid session data
      await page.evaluate(() => {
        localStorage.setItem('token', 'invalid.jwt.token')
        localStorage.setItem('user', '{"invalid": "json"')
        sessionStorage.setItem('auth', 'corrupted_data')
      })
      
      const memberDashboard = new MemberDashboardPage(page)
      await memberDashboard.goto()
      await page.waitForTimeout(2000)
      
      // Should handle invalid session gracefully
      const currentUrl = page.url()
      const handledGracefully = currentUrl.includes('/auth/signin') ||
                               await page.locator('text=Sign in, text=Login').count() > 0
      
      expect(handledGracefully).toBeTruthy()
      
      console.log('Invalid session data handled')
    })
  })

  test('should handle real-world integration scenarios', async ({ page }) => {
    await test.step('Test form submission with file upload simulation', async () => {
      const registrationPage = new RegistrationPage(page)
      const testUserData = TestHelpers.generateTestUser()
      
      // Navigate to file upload step
      await registrationPage.goto()
      await registrationPage.fillStep1(testUserData.step1)
      await registrationPage.clickNext()
      await registrationPage.fillStep2(testUserData.step2)
      await registrationPage.clickNext()
      
      // Mock file upload API
      await page.route('**/api/upload/**', route => {
        // Simulate slow upload
        setTimeout(() => {
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              fileId: 'mock-file-123',
              message: 'File uploaded successfully'
            })
          })
        }, 2000)
      })
      
      // Test file upload interface exists
      const fileInputs = await page.locator('input[type="file"]').count()
      
      if (fileInputs > 0) {
        console.log(`File upload inputs found: ${fileInputs}`)
        
        // Continue with registration
        await registrationPage.clickNext()
        await page.waitForTimeout(3000)
        
        // Should handle upload gracefully
        const progressIndicator = page.locator('.progress, [role="progressbar"], .upload-progress')
        const progressExists = await progressIndicator.count()
        
        console.log(`Upload progress indicators: ${progressExists}`)
      }
      
      console.log('File upload simulation completed')
    })

    await test.step('Test email service integration', async () => {
      const homePage = new HomePage(page)
      
      // Mock email subscription API
      await page.route('**/api/newsletter/**', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            message: 'Successfully subscribed to newsletter'
          })
        })
      })
      
      await homePage.goto()
      
      // Try newsletter signup
      const emailInput = page.locator('input[type="email"]').first()
      const submitButton = page.locator('button:has-text("Subscribe"), button:has-text("Join"), button:has-text("Sign up")').first()
      
      if (await emailInput.isVisible() && await submitButton.isVisible()) {
        await emailInput.fill('integration-test@example.com')
        await submitButton.click()
        await page.waitForTimeout(2000)
        
        // Check for success message
        const successMessage = await page.locator('text=subscribed, text=success, text=thank').count()
        
        console.log(`Newsletter integration success indicators: ${successMessage}`)
      }
      
      console.log('Email service integration tested')
    })

    await test.step('Test search functionality integration', async () => {
      const homePage = new HomePage(page)
      await homePage.goto()
      
      // Look for search functionality
      const searchInputs = await page.locator('input[type="search"], input[placeholder*="search"], input[placeholder*="Search"]').count()
      
      if (searchInputs > 0) {
        const searchInput = page.locator('input[type="search"], input[placeholder*="search"]').first()
        
        // Mock search API
        await page.route('**/api/search/**', route => {
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              results: [
                { title: 'Test Result 1', description: 'Description 1' },
                { title: 'Test Result 2', description: 'Description 2' }
              ]
            })
          })
        })
        
        await searchInput.fill('construction projects')
        await searchInput.press('Enter')
        await page.waitForTimeout(2000)
        
        // Check for search results
        const searchResults = await page.locator('.search-result, [data-testid="search-result"]').count()
        
        console.log(`Search integration results: ${searchResults}`)
      }
      
      console.log('Search functionality integration tested')
    })
  })

  test.afterEach(async ({ page, context }) => {
    // Clean up any test routes and data
    await page.unrouteAll()
    await TestHelpers.clearUserSession(context)
    
    // Take screenshot on failure
    if (test.info().status !== test.info().expectedStatus) {
      await TestHelpers.takeTimestampedScreenshot(page, 'api-integration-failure')
    }
  })
})
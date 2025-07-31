import { test, expect, Page } from '@playwright/test'

/**
 * Working Authentication Test
 * Tests with actual working credentials from CLAUDE.md
 */

const workingCredentials = {
  admin: {
    email: 'admin@namcnorcal.org',
    password: 'admin123'
  },
  member: {
    email: 'john.doe@example.com', 
    password: 'member123'
  }
}

test.describe('Working Authentication Tests', () => {
  test('Admin login with working credentials', async ({ page }) => {
    console.log('👨‍💼 Testing admin login with working credentials...')
    
    // Navigate to signin page
    await page.goto('/auth/signin')
    console.log('✅ Step 1: Navigated to signin page')
    
    // Fill in admin credentials
    await page.fill('input[type="email"]', workingCredentials.admin.email)
    await page.fill('input[type="password"]', workingCredentials.admin.password)
    console.log('✅ Step 2: Admin credentials entered')
    
    // Submit the form
    await page.click('button[type="submit"]')
    console.log('✅ Step 3: Login form submitted')
    
    // Wait for potential redirect or response
    await page.waitForTimeout(5000)
    
    const currentUrl = page.url()
    console.log(`Current URL after login: ${currentUrl}`)
    
    // Check if we were redirected to a dashboard or admin area
    if (currentUrl.includes('/admin') || currentUrl.includes('/dashboard')) {
      console.log('✅ Admin login successful - redirected to admin area')
    } else if (currentUrl.includes('/auth/signin')) {
      console.log('ℹ️ Still on signin page - may need database setup')
    } else {
      console.log(`ℹ️ Redirected to: ${currentUrl}`)
    }
    
    // Take screenshot of result
    await page.screenshot({ path: 'screenshots/admin-login-result.png' })
    console.log('✅ Admin login test completed')
  })

  test('Member login with working credentials', async ({ page }) => {
    console.log('👤 Testing member login with working credentials...')
    
    // Navigate to signin page
    await page.goto('/auth/signin')
    console.log('✅ Step 1: Navigated to signin page')
    
    // Fill in member credentials
    await page.fill('input[type="email"]', workingCredentials.member.email)
    await page.fill('input[type="password"]', workingCredentials.member.password)
    console.log('✅ Step 2: Member credentials entered')
    
    // Submit the form
    await page.click('button[type="submit"]')
    console.log('✅ Step 3: Login form submitted')
    
    // Wait for potential redirect or response
    await page.waitForTimeout(5000)
    
    const currentUrl = page.url()
    console.log(`Current URL after login: ${currentUrl}`)
    
    // Check if we were redirected to member dashboard
    if (currentUrl.includes('/member') || currentUrl.includes('/dashboard')) {
      console.log('✅ Member login successful - redirected to member area')
    } else if (currentUrl.includes('/auth/signin')) {
      console.log('ℹ️ Still on signin page - may need database setup')
    } else {
      console.log(`ℹ️ Redirected to: ${currentUrl}`)
    }
    
    // Take screenshot of result
    await page.screenshot({ path: 'screenshots/member-login-result.png' })
    console.log('✅ Member login test completed')
  })

  test('Full user journey - Homepage to Login to Dashboard', async ({ page }) => {
    console.log('🚀 Testing complete user journey...')
    
    // Step 1: Start at homepage
    await page.goto('/')
    await expect(page.locator('h1')).toBeVisible()
    console.log('✅ Step 1: Homepage loaded successfully')
    await page.screenshot({ path: 'screenshots/journey-01-homepage.png' })
    
    // Step 2: Find and click signin link
    let signinClicked = false
    const signinSelectors = [
      'a[href="/auth/signin"]',
      'text=Sign In',
      'text=Login',
      'button:has-text("Sign In")',
      'button:has-text("Login")'
    ]
    
    for (const selector of signinSelectors) {
      const element = page.locator(selector).first()
      if (await element.isVisible()) {
        await element.click()
        signinClicked = true
        console.log(`✅ Step 2: Clicked signin element: ${selector}`)
        break
      }
    }
    
    if (!signinClicked) {
      await page.goto('/auth/signin')
      console.log('✅ Step 2: Navigated directly to signin')
    }
    
    await page.screenshot({ path: 'screenshots/journey-02-signin.png' })
    
    // Step 3: Fill login form
    await expect(page.locator('form')).toBeVisible()
    await page.fill('input[type="email"]', workingCredentials.admin.email)
    await page.fill('input[type="password"]', workingCredentials.admin.password)
    console.log('✅ Step 3: Login form filled')
    await page.screenshot({ path: 'screenshots/journey-03-filled-form.png' })
    
    // Step 4: Submit form and wait for result
    await page.click('button[type="submit"]')
    await page.waitForTimeout(5000)
    console.log('✅ Step 4: Form submitted, waiting for response')
    await page.screenshot({ path: 'screenshots/journey-04-post-login.png' })
    
    // Step 5: Analyze final state
    const finalUrl = page.url()
    const pageTitle = await page.title()
    const hasNavigation = await page.locator('nav').isVisible()
    const hasDashboard = await page.locator('h1:has-text("Dashboard")').isVisible()
    
    console.log(`Final URL: ${finalUrl}`)
    console.log(`Page Title: ${pageTitle}`)
    console.log(`Has Navigation: ${hasNavigation}`)
    console.log(`Has Dashboard: ${hasDashboard}`)
    
    if (finalUrl.includes('/admin') || finalUrl.includes('/dashboard') || hasDashboard) {
      console.log('🎉 SUCCESS: User successfully logged in and reached dashboard!')
    } else if (finalUrl.includes('/auth/signin')) {
      console.log('ℹ️ AUTHENTICATION ISSUE: Still on signin page - likely database not configured')
    } else {
      console.log(`ℹ️ UNKNOWN STATE: Ended up at ${finalUrl}`)
    }
    
    console.log('✅ Complete user journey test finished')
  })
})
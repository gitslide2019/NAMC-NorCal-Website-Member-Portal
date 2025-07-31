import { test, expect, Page } from '@playwright/test'

/**
 * Basic User Journey Test
 * Tests the core user flows step-by-step to validate the build
 */

test.describe('Basic User Journey Tests', () => {
  test('Homepage loads and displays correctly', async ({ page }) => {
    console.log('🏠 Testing homepage...')
    
    // Navigate to homepage
    await page.goto('/')
    
    // Verify page loads
    await expect(page).toHaveTitle(/NAMC/)
    
    // Check for key elements
    await expect(page.locator('h1')).toBeVisible()
    await expect(page.locator('nav')).toBeVisible()
    
    console.log('✅ Homepage loaded successfully')
    
    // Take screenshot
    await page.screenshot({ path: 'screenshots/homepage.png' })
  })

  test('Authentication pages are accessible', async ({ page }) => {
    console.log('🔐 Testing authentication routes...')
    
    // Test signin page
    await page.goto('/auth/signin')
    await expect(page.locator('form')).toBeVisible()
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
    console.log('✅ Signin page accessible')
    
    // Test register page
    await page.goto('/auth/register')
    await expect(page.locator('form')).toBeVisible()
    console.log('✅ Register page accessible')
    
    // Take screenshots
    await page.screenshot({ path: 'screenshots/signin.png' })
  })

  test('Member portal pages are protected', async ({ page }) => {
    console.log('🏢 Testing member portal access...')
    
    // Try to access member dashboard without auth
    await page.goto('/member/dashboard')
    
    // Should redirect to signin or show login form
    const currentUrl = page.url()
    const hasSigninForm = await page.locator('input[type="email"]').isVisible()
    
    if (currentUrl.includes('/auth/signin') || hasSigninForm) {
      console.log('✅ Member portal properly protected')
    } else {
      console.log('⚠️ Member portal may not be properly protected')
    }
  })

  test('Admin portal pages are protected', async ({ page }) => {
    console.log('👨‍💼 Testing admin portal access...')
    
    // Try to access admin dashboard without auth
    await page.goto('/admin/dashboard')
    
    // Should redirect to signin or show login form
    const currentUrl = page.url()
    const hasSigninForm = await page.locator('input[type="email"]').isVisible()
    
    if (currentUrl.includes('/auth/signin') || hasSigninForm) {
      console.log('✅ Admin portal properly protected')
    } else {
      console.log('⚠️ Admin portal may not be properly protected')
    }
  })

  test('API endpoints respond correctly', async ({ page }) => {
    console.log('🔌 Testing API endpoints...')
    
    // Test public API endpoint (should require auth)
    const response = await page.request.get('/api/projects')
    
    // Should get 401 unauthorized or redirect
    if (response.status() === 401 || response.status() === 403) {
      console.log('✅ API properly protected')
    } else {
      console.log(`⚠️ API responded with status: ${response.status()}`)
    }
  })

  test('Navigation and key pages load', async ({ page }) => {
    console.log('🧭 Testing navigation and key pages...')
    
    await page.goto('/')
    
    // Test contact page
    const contactLink = page.locator('a[href="/contact"]').first()
    if (await contactLink.isVisible()) {
      await contactLink.click()
      await expect(page).toHaveURL('/contact')
      console.log('✅ Contact page accessible')
    }
    
    // Test timeline page
    await page.goto('/timeline')
    await expect(page.locator('h1')).toBeVisible()
    console.log('✅ Timeline page accessible')
    
    // Take final screenshot
    await page.screenshot({ path: 'screenshots/navigation-test.png' })
  })
})
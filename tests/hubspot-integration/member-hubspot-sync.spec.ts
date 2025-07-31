import { test, expect } from '@playwright/test'
import { SignInPage } from '../pages/SignInPage'
import { MemberDashboardPage } from '../pages/MemberDashboardPage'

/**
 * HubSpot Member Integration Tests
 * Tests the automatic member sync and HubSpot integration features
 * Validates click-by-click user journey with HubSpot CRM integration
 */

test.describe('HubSpot Member Profile Integration', () => {
  let signInPage: SignInPage
  let dashboardPage: MemberDashboardPage

  test.beforeEach(async ({ page }) => {
    signInPage = new SignInPage(page)
    dashboardPage = new MemberDashboardPage(page)
  })

  test('should automatically sync member profile to HubSpot on login', async ({ page }) => {
    // Step 1: Navigate to login page
    await signInPage.navigate()
    await expect(page).toHaveTitle(/NAMC NorCal/)

    // Step 2: Login as test member
    await signInPage.login('member@namc-norcal.org', 'member123')
    
    // Step 3: Verify redirect to member dashboard
    await expect(page).toHaveURL(/\/member\/dashboard/)
    await dashboardPage.waitForLoad()

    // Step 4: Check for HubSpot sync status indicator
    const syncStatus = page.locator('[data-testid="hubspot-sync-status"]')
    await expect(syncStatus).toBeVisible({ timeout: 10000 })
    
    // Step 5: Verify sync success message appears
    await expect(syncStatus).toContainText('Your profile is synced to HubSpot CRM')
    await expect(syncStatus).toHaveClass(/bg-green-50/)

    // Step 6: Verify sync timestamp is shown
    const syncTimestamp = page.locator('[data-testid="hubspot-sync-timestamp"]')
    await expect(syncTimestamp).toBeVisible()
    await expect(syncTimestamp).toContainText('Last synced:')

    // Step 7: Check that HubSpot dashboard widget loads
    const hubspotWidget = page.locator('[data-testid="hubspot-dashboard-widget"]')
    await expect(hubspotWidget).toBeVisible()
    await expect(hubspotWidget).toContainText('HubSpot Integration')
  })

  test('should track project view activity in HubSpot', async ({ page }) => {
    // Login first
    await signInPage.navigate()
    await signInPage.login('member@namc-norcal.org', 'member123')
    await dashboardPage.waitForLoad()

    // Step 1: Wait for initial sync to complete
    await page.waitForSelector('[data-testid="hubspot-sync-status"]', { state: 'visible' })
    
    // Step 2: Click on a project opportunity
    const projectCard = page.locator('[data-testid="project-opportunity"]').first()
    await expect(projectCard).toBeVisible()
    
    // Step 3: Track the click activity
    await projectCard.click()
    
    // Step 4: Verify activity tracking request was made
    // We'll check network requests to ensure activity tracking API was called
    const activityRequest = page.waitForRequest('**/api/member/hubspot-activity')
    await activityRequest
    
    // Step 5: Verify the activity was tracked with correct data
    const response = await page.waitForResponse('**/api/member/hubspot-activity')
    expect(response.status()).toBe(200)
  })

  test('should track project application activity in HubSpot', async ({ page }) => {
    // Login first
    await signInPage.navigate()
    await signInPage.login('member@namc-norcal.org', 'member123')
    await dashboardPage.waitForLoad()

    // Wait for sync
    await page.waitForSelector('[data-testid="hubspot-sync-status"]', { state: 'visible' })
    
    // Step 1: Find and click "Submit Bid" button
    const submitBidButton = page.locator('button:has-text("Submit Bid")').first()
    await expect(submitBidButton).toBeVisible()
    
    // Step 2: Track the project application
    const activityRequest = page.waitForRequest('**/api/member/hubspot-activity')
    await submitBidButton.click()
    
    // Step 3: Verify activity tracking for project application
    await activityRequest
    const response = await page.waitForResponse('**/api/member/hubspot-activity')
    expect(response.status()).toBe(200)
  })

  test('should display HubSpot dashboard data correctly', async ({ page }) => {
    // Login first
    await signInPage.navigate()
    await signInPage.login('member@namc-norcal.org', 'member123')
    await dashboardPage.waitForLoad()

    // Step 1: Wait for HubSpot widget to load
    const hubspotWidget = page.locator('[data-testid="hubspot-dashboard-widget"]')
    await expect(hubspotWidget).toBeVisible()

    // Step 2: Check HubSpot stats cards are displayed
    const totalPipelineValue = page.locator('[data-testid="hubspot-total-pipeline"]')
    const activeDeals = page.locator('[data-testid="hubspot-active-deals"]')
    const totalProjects = page.locator('[data-testid="hubspot-total-projects"]')
    const lastActivity = page.locator('[data-testid="hubspot-last-activity"]')

    await expect(totalPipelineValue).toBeVisible()
    await expect(activeDeals).toBeVisible()
    await expect(totalProjects).toBeVisible()
    await expect(lastActivity).toBeVisible()

    // Step 3: Verify stats contain currency/numeric values
    await expect(totalPipelineValue).toContainText('$')
    await expect(activeDeals).toContainText(/\d+/)
    await expect(totalProjects).toContainText(/\d+/)

    // Step 4: Check recent deals section
    const recentDeals = page.locator('[data-testid="hubspot-recent-deals"]')
    await expect(recentDeals).toBeVisible()
    await expect(recentDeals).toContainText('Recent Deals')

    // Step 5: Check recent activities section
    const recentActivities = page.locator('[data-testid="hubspot-recent-activities"]')
    await expect(recentActivities).toBeVisible()
    await expect(recentActivities).toContainText('Recent Activities')
  })

  test('should refresh HubSpot data when refresh button clicked', async ({ page }) => {
    // Login first
    await signInPage.navigate()
    await signInPage.login('member@namc-norcal.org', 'member123')
    await dashboardPage.waitForLoad()

    // Step 1: Wait for HubSpot widget to load
    const hubspotWidget = page.locator('[data-testid="hubspot-dashboard-widget"]')
    await expect(hubspotWidget).toBeVisible()

    // Step 2: Click refresh button
    const refreshButton = page.locator('[data-testid="hubspot-refresh-button"]')
    await expect(refreshButton).toBeVisible()
    
    // Step 3: Track the refresh request
    const refreshRequest = page.waitForRequest('**/api/member/hubspot-sync')
    await refreshButton.click()
    
    // Step 4: Verify refresh request was made
    await refreshRequest
    
    // Step 5: Check that loading state is shown during refresh
    const loadingIndicator = page.locator('[data-testid="hubspot-loading"]')
    await expect(loadingIndicator).toBeVisible()
    
    // Step 6: Wait for refresh to complete
    await expect(loadingIndicator).toHidden()
    
    // Step 7: Verify updated timestamp
    const lastUpdated = page.locator('[data-testid="hubspot-last-updated"]')
    await expect(lastUpdated).toBeVisible()
    await expect(lastUpdated).toContainText('Last updated:')
  })

  test('should handle HubSpot sync errors gracefully', async ({ page }) => {
    // Mock network failure for HubSpot sync
    await page.route('**/api/member/hubspot-sync', (route) => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: 'HubSpot API temporarily unavailable'
        })
      })
    })

    // Step 1: Login (this should trigger the failed sync)
    await signInPage.navigate()
    await signInPage.login('member@namc-norcal.org', 'member123')
    await dashboardPage.waitForLoad()

    // Step 2: Check for error status indicator
    const syncStatus = page.locator('[data-testid="hubspot-sync-status"]')
    await expect(syncStatus).toBeVisible({ timeout: 10000 })
    
    // Step 3: Verify error message is shown
    await expect(syncStatus).toContainText('HubSpot sync failed')
    await expect(syncStatus).toHaveClass(/bg-red-50/)

    // Step 4: Verify error details are displayed
    await expect(syncStatus).toContainText('HubSpot API temporarily unavailable')

    // Step 5: Verify the dashboard still functions without HubSpot data
    const memberDashboard = page.locator('[data-testid="member-dashboard"]')
    await expect(memberDashboard).toBeVisible()
  })

  test('should show different sync status for new vs existing contacts', async ({ page }) => {
    // Mock HubSpot response for new contact
    await page.route('**/api/member/hubspot-sync', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            contactId: 'new_contact_123',
            isNewContact: true,
            syncMessage: 'New contact created in HubSpot'
          }
        })
      })
    })

    // Step 1: Login as new member
    await signInPage.navigate()
    await signInPage.login('member@namc-norcal.org', 'member123')
    await dashboardPage.waitForLoad()

    // Step 2: Check for new contact indicator
    const syncStatus = page.locator('[data-testid="hubspot-sync-status"]')
    await expect(syncStatus).toBeVisible()
    await expect(syncStatus).toContainText('New contact created')

    // Step 3: Mock existing contact for next test
    await page.route('**/api/member/hubspot-sync', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            contactId: 'existing_contact_456',
            isNewContact: false,
            syncMessage: 'Profile updated in HubSpot'
          }
        })
      })
    })

    // Step 4: Refresh to trigger existing contact sync
    await page.reload()
    await dashboardPage.waitForLoad()

    // Step 5: Verify existing contact message
    await expect(syncStatus).toContainText('Profile updated')
  })
})

test.describe('HubSpot Admin Testing Interface', () => {
  test('should access admin HubSpot test page and run tests', async ({ page }) => {
    const signInPage = new SignInPage(page)

    // Step 1: Login as admin
    await signInPage.navigate()
    await signInPage.login('admin@namc-norcal.org', 'admin123')
    
    // Step 2: Navigate to HubSpot test page
    await page.goto('/admin/hubspot-test')
    await expect(page).toHaveTitle(/HubSpot MCP Integration Testing/)

    // Step 3: Click "Run Full Test Suite" button
    const runTestsButton = page.locator('button:has-text("Run Full Test Suite")')
    await expect(runTestsButton).toBeVisible()
    
    const testRequest = page.waitForRequest('**/api/hubspot/test')
    await runTestsButton.click()

    // Step 4: Wait for test results
    await testRequest
    await page.waitForSelector('[data-testid="test-results"]', { state: 'visible' })

    // Step 5: Verify test summary is displayed
    const testSummary = page.locator('[data-testid="test-summary"]')
    await expect(testSummary).toBeVisible()
    await expect(testSummary).toContainText('Test Summary')

    // Step 6: Check individual test results
    const testResults = page.locator('[data-testid="test-result-item"]')
    await expect(testResults).toHaveCount(6) // Should have 6 tests
    
    // Step 7: Verify at least some tests passed
    const passedTests = page.locator('[data-testid="test-result-item"]:has(.text-green-500)')
    await expect(passedTests.first()).toBeVisible()
  })

  test('should test member profile sync component', async ({ page }) => {
    const signInPage = new SignInPage(page)

    // Login as admin
    await signInPage.navigate()
    await signInPage.login('admin@namc-norcal.org', 'admin123')
    await page.goto('/admin/hubspot-test')

    // Step 1: Show the member profile sync component
    const showProfileSyncButton = page.locator('[data-testid="show-profile-sync"]')
    await expect(showProfileSyncButton).toBeVisible()
    await showProfileSyncButton.click()

    // Step 2: Verify member profile sync form is visible
    const profileSyncForm = page.locator('[data-testid="member-profile-sync"]')
    await expect(profileSyncForm).toBeVisible()

    // Step 3: Fill out test member data
    await page.fill('[data-testid="profile-firstname"]', 'Test')
    await page.fill('[data-testid="profile-lastname"]', 'Member')
    await page.fill('[data-testid="profile-email"]', 'test.member@namcnorcal.org')
    await page.fill('[data-testid="profile-company"]', 'Test Construction Co')
    await page.fill('[data-testid="profile-phone"]', '(555) 123-4567')

    // Step 4: Select membership tier
    await page.selectOption('[data-testid="profile-membership-tier"]', 'Gold')

    // Step 5: Click sync to HubSpot
    const syncButton = page.locator('[data-testid="sync-to-hubspot"]')
    await expect(syncButton).toBeVisible()
    
    const syncRequest = page.waitForRequest('**/api/hubspot/contacts/sync')
    await syncButton.click()

    // Step 6: Wait for sync to complete
    await syncRequest
    const syncResponse = await page.waitForResponse('**/api/hubspot/contacts/sync')
    expect(syncResponse.status()).toBe(200)

    // Step 7: Verify success message
    const successMessage = page.locator('[data-testid="sync-success-message"]')
    await expect(successMessage).toBeVisible()
    await expect(successMessage).toContainText('successfully synced')
  })

  test('should test project deal conversion component', async ({ page }) => {
    const signInPage = new SignInPage(page)

    // Login as admin
    await signInPage.navigate()
    await signInPage.login('admin@namc-norcal.org', 'admin123')
    await page.goto('/admin/hubspot-test')

    // Step 1: Show the project deal sync component
    const showDealSyncButton = page.locator('[data-testid="show-deal-sync"]')
    await expect(showDealSyncButton).toBeVisible()
    await showDealSyncButton.click()

    // Step 2: Verify project deal sync form is visible
    const dealSyncForm = page.locator('[data-testid="project-deal-sync"]')
    await expect(dealSyncForm).toBeVisible()

    // Step 3: Fill out test project data
    await page.fill('[data-testid="deal-name"]', 'Test Project Deal')
    await page.fill('[data-testid="deal-amount"]', '750000')
    await page.selectOption('[data-testid="deal-project-type"]', 'Commercial')
    await page.fill('[data-testid="deal-location"]', 'San Francisco, CA')

    // Step 4: Set close date (30 days from now)
    const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    const dateString = futureDate.toISOString().split('T')[0]
    await page.fill('[data-testid="deal-close-date"]', dateString)

    // Step 5: Click create deal in HubSpot
    const createDealButton = page.locator('[data-testid="create-deal-hubspot"]')
    await expect(createDealButton).toBeVisible()
    
    const dealRequest = page.waitForRequest('**/api/hubspot/deals/create')
    await createDealButton.click()

    // Step 6: Wait for deal creation to complete
    await dealRequest
    const dealResponse = await page.waitForResponse('**/api/hubspot/deals/create')
    expect(dealResponse.status()).toBe(200)

    // Step 7: Verify success message and HubSpot link
    const successMessage = page.locator('[data-testid="deal-success-message"]')
    await expect(successMessage).toBeVisible()
    await expect(successMessage).toContainText('successfully created')

    const hubspotLink = page.locator('[data-testid="view-deal-hubspot"]')
    await expect(hubspotLink).toBeVisible()
    await expect(hubspotLink).toHaveAttribute('href', /hubspot\.com/)
  })
})
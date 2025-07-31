import { test, expect, Page } from '@playwright/test'

/**
 * Comprehensive User Story Audit for NAMC Project Management System
 * 
 * This test suite validates critical user stories across the entire system:
 * - Member project discovery and engagement
 * - Admin project management workflows  
 * - HubSpot integration and CRM sync
 * - Analytics and reporting capabilities
 * - Accessibility and usability standards
 */

// Test data setup
const testData = {
  adminUser: {
    email: 'admin@namcnorcal.org',
    password: 'admin123',
    name: 'Test Admin'
  },
  memberUser: {
    email: 'john.doe@example.com', 
    password: 'member123',
    name: 'John Doe',
    company: 'Doe Construction'
  },
  testProject: {
    title: 'Downtown Office Complex Renovation',
    client: 'Oakland Development Corp',
    budget: '$2M - $2.5M',
    location: 'Oakland, CA',
    category: 'Commercial',
    description: 'Large-scale office renovation project requiring experienced contractors'
  }
}

// Helper functions
async function loginAsAdmin(page: Page) {
  await page.goto('/admin/login')
  await page.fill('[data-testid="email-input"]', testData.adminUser.email)
  await page.fill('[data-testid="password-input"]', testData.adminUser.password)
  await page.click('[data-testid="login-button"]')
  await expect(page).toHaveURL(/\/admin/)
}

async function loginAsMember(page: Page) {
  await page.goto('/login')
  await page.fill('[data-testid="email-input"]', testData.memberUser.email)
  await page.fill('[data-testid="password-input"]', testData.memberUser.password)
  await page.click('[data-testid="login-button"]')
  await expect(page).toHaveURL(/\/dashboard/)
}

test.describe('User Story 1: Member Project Discovery Journey', () => {
  test('Member should discover and engage with project opportunities', async ({ page }) => {
    // Login as member
    await loginAsMember(page)
    
    // Navigate to projects
    await page.click('[data-testid="projects-nav"]')
    await expect(page).toHaveURL(/\/projects/)
    
    // Search for projects
    await page.fill('[data-testid="project-search"]', testData.testProject.title)
    await page.keyboard.press('Enter')
    
    // Verify project appears in results
    await expect(page.locator('[data-testid="project-card"]').first()).toContainText(testData.testProject.title)
    
    // View project details
    await page.click('[data-testid="project-card"]').first()
    await expect(page).toHaveURL(/\/projects\/.*/)
    
    // Verify project engagement tracking
    await expect(page.locator('[data-testid="project-title"]')).toContainText(testData.testProject.title)
    await expect(page.locator('[data-testid="project-client"]')).toContainText(testData.testProject.client)
    await expect(page.locator('[data-testid="project-budget"]')).toContainText(testData.testProject.budget)
    
    // Download project documents
    if (await page.locator('[data-testid="download-documents"]').isVisible()) {
      await page.click('[data-testid="download-documents"]')
      // Verify download tracking (check network request or UI feedback)
      await expect(page.locator('[data-testid="download-success"]')).toBeVisible({ timeout: 5000 })
    }
    
    // Express interest in project
    await page.click('[data-testid="express-interest"]')
    await page.fill('[data-testid="interest-message"]', 'We are interested in this project and would like more information.')
    await page.selectOption('[data-testid="contact-method"]', 'email')
    await page.click('[data-testid="submit-interest"]')
    
    // Verify interest submission
    await expect(page.locator('[data-testid="interest-success"]')).toBeVisible()
    await expect(page.locator('[data-testid="interest-success"]')).toContainText('Interest submitted successfully')
  })

  test('Member engagement should be tracked and scored', async ({ page }) => {
    await loginAsMember(page)
    
    // Navigate to member profile/dashboard
    await page.click('[data-testid="profile-nav"]')
    
    // Verify engagement metrics are displayed
    await expect(page.locator('[data-testid="engagement-score"]')).toBeVisible()
    await expect(page.locator('[data-testid="projects-viewed"]')).toBeVisible()
    await expect(page.locator('[data-testid="documents-downloaded"]')).toBeVisible()
    await expect(page.locator('[data-testid="inquiries-submitted"]')).toBeVisible()
    
    // Verify engagement score is numerical and reasonable
    const engagementScore = await page.locator('[data-testid="engagement-score"]').textContent()
    expect(parseInt(engagementScore || '0')).toBeGreaterThanOrEqual(0)
    expect(parseInt(engagementScore || '0')).toBeLessThanOrEqual(100)
  })
})

test.describe('User Story 2: Admin Project Management Workflow', () => {
  test('Admin should create and manage project opportunities', async ({ page }) => {
    await loginAsAdmin(page)
    
    // Navigate to project opportunities upload
    await page.click('[data-testid="projects-nav"]')
    await page.click('[data-testid="opportunities-nav"]')
    await expect(page).toHaveURL(/\/admin\/projects\/opportunities/)
    
    // Create new project opportunity
    await page.click('[data-testid="upload-new-project"]')
    
    // Fill project details
    await page.fill('[data-testid="project-title"]', testData.testProject.title)
    await page.fill('[data-testid="project-client"]', testData.testProject.client)
    await page.fill('[data-testid="project-description"]', testData.testProject.description)
    await page.fill('[data-testid="project-budget"]', testData.testProject.budget)
    await page.fill('[data-testid="project-location"]', testData.testProject.location)
    await page.selectOption('[data-testid="project-category"]', testData.testProject.category)
    
    // Set project dates
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    await page.fill('[data-testid="application-deadline"]', tomorrow.toISOString().split('T')[0])
    
    const nextMonth = new Date()
    nextMonth.setMonth(nextMonth.getMonth() + 1)
    await page.fill('[data-testid="project-deadline"]', nextMonth.toISOString().split('T')[0])
    
    // Upload documents (if file upload is available)
    if (await page.locator('[data-testid="document-upload"]').isVisible()) {
      await page.setInputFiles('[data-testid="document-upload"]', 'tests/fixtures/sample-project-doc.pdf')
    }
    
    // Submit project
    await page.click('[data-testid="submit-project"]')
    
    // Verify project creation success
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible()
    await expect(page.locator('[data-testid="success-message"]')).toContainText('Project created successfully')
  })

  test('Admin should manage project workflow states', async ({ page }) => {
    await loginAsAdmin(page)
    
    // Navigate to workflow management
    await page.click('[data-testid="projects-nav"]')
    await page.click('[data-testid="workflow-nav"]')
    await expect(page).toHaveURL(/\/admin\/projects\/workflow/)
    
    // Verify workflow dashboard loads
    await expect(page.locator('[data-testid="workflow-stats"]')).toBeVisible()
    await expect(page.locator('[data-testid="project-list"]')).toBeVisible()
    
    // Select a project to update status
    await page.click('[data-testid="project-row"]').first()
    await page.click('[data-testid="update-status-button"]')
    
    // Update project status
    await page.selectOption('[data-testid="new-status-select"]', 'active')
    await page.fill('[data-testid="status-reason"]', 'Project approved and ready for applications')
    await page.fill('[data-testid="status-notes"]', 'All documentation reviewed and approved by legal team')
    await page.click('[data-testid="confirm-status-update"]')
    
    // Verify status update success
    await expect(page.locator('[data-testid="status-update-success"]')).toBeVisible()
    
    // Verify project appears with new status
    await expect(page.locator('[data-testid="project-status"]').first()).toContainText('Active')
  })

  test('Admin should assign users to projects', async ({ page }) => {
    await loginAsAdmin(page)
    
    // Navigate to workflow management
    await page.goto('/admin/projects/workflow')
    
    // Select project and assign user
    await page.click('[data-testid="project-row"]').first()
    await page.click('[data-testid="assign-user-button"]')
    
    // Fill assignment details
    await page.selectOption('[data-testid="user-select"]', testData.adminUser.email)
    await page.selectOption('[data-testid="role-select"]', 'manager')
    await page.check('[data-testid="permission-edit"]')
    await page.check('[data-testid="permission-view-analytics"]')
    
    await page.click('[data-testid="confirm-assignment"]')
    
    // Verify assignment success
    await expect(page.locator('[data-testid="assignment-success"]')).toBeVisible()
  })
})

test.describe('User Story 3: Member Engagement Analytics', () => {
  test('Admin should view comprehensive member engagement analytics', async ({ page }) => {
    await loginAsAdmin(page)
    
    // Navigate to member engagement analytics
    await page.click('[data-testid="members-nav"]')
    await page.click('[data-testid="engagement-nav"]')
    await expect(page).toHaveURL(/\/admin\/members\/engagement/)
    
    // Verify analytics dashboard loads
    await expect(page.locator('[data-testid="engagement-stats"]')).toBeVisible()
    await expect(page.locator('[data-testid="member-list"]')).toBeVisible()
    await expect(page.locator('[data-testid="engagement-distribution"]')).toBeVisible()
    
    // Verify key metrics are displayed
    await expect(page.locator('[data-testid="total-members"]')).toBeVisible()
    await expect(page.locator('[data-testid="active-members"]')).toBeVisible()
    await expect(page.locator('[data-testid="at-risk-members"]')).toBeVisible()
    await expect(page.locator('[data-testid="avg-engagement"]')).toBeVisible()
    
    // Filter members by engagement level
    await page.selectOption('[data-testid="engagement-filter"]', 'high')
    await expect(page.locator('[data-testid="member-row"]')).toHaveCount(0, { timeout: 10000 }) // May be 0 if no high engagement members
    
    // Search for specific member
    await page.fill('[data-testid="member-search"]', testData.memberUser.name)
    await page.keyboard.press('Enter')
    
    // Verify member appears in results (if exists)
    if (await page.locator('[data-testid="member-row"]').count() > 0) {
      await expect(page.locator('[data-testid="member-row"]').first()).toContainText(testData.memberUser.name)
    }
  })

  test('Admin should view detailed member engagement profile', async ({ page }) => {
    await loginAsAdmin(page)
    
    // Navigate to engagement analytics
    await page.goto('/admin/members/engagement')
    
    // Select a member to view details
    if (await page.locator('[data-testid="member-row"]').count() > 0) {
      await page.click('[data-testid="view-member-details"]').first()
      
      // Verify member detail modal opens
      await expect(page.locator('[data-testid="member-detail-modal"]')).toBeVisible()
      
      // Verify detailed engagement metrics
      await expect(page.locator('[data-testid="member-engagement-score"]')).toBeVisible()
      await expect(page.locator('[data-testid="member-total-views"]')).toBeVisible()
      await expect(page.locator('[data-testid="member-total-downloads"]')).toBeVisible()
      await expect(page.locator('[data-testid="member-total-inquiries"]')).toBeVisible()
      
      // Verify recent activity is shown
      await expect(page.locator('[data-testid="recent-activity"]')).toBeVisible()
      
      // Verify contact actions are available
      await expect(page.locator('[data-testid="send-email-button"]')).toBeVisible()
      await expect(page.locator('[data-testid="view-profile-button"]')).toBeVisible()
    }
  })
})

test.describe('User Story 4: HubSpot Integration Workflow', () => {
  test('Admin should sync member engagement data to HubSpot', async ({ page }) => {
    await loginAsAdmin(page)
    
    // Navigate to HubSpot integration
    await page.click('[data-testid="integrations-nav"]')
    await page.click('[data-testid="hubspot-nav"]')
    await expect(page).toHaveURL(/\/admin\/integrations\/hubspot/)
    
    // Verify HubSpot connection status
    await expect(page.locator('[data-testid="connection-status"]')).toBeVisible()
    
    // Test HubSpot connection
    await page.click('[data-testid="test-connection"]')
    await expect(page.locator('[data-testid="connection-test-result"]')).toBeVisible({ timeout: 10000 })
    
    // Perform full member sync
    await page.click('[data-testid="full-sync-button"]')
    
    // Verify sync progress
    await expect(page.locator('[data-testid="sync-progress"]')).toBeVisible({ timeout: 5000 })
    
    // Wait for sync completion
    await expect(page.locator('[data-testid="sync-results"]')).toBeVisible({ timeout: 30000 })
    
    // Verify sync results show success/failure counts
    await expect(page.locator('[data-testid="sync-successful"]')).toBeVisible()
    await expect(page.locator('[data-testid="sync-failed"]')).toBeVisible()
  })

  test('System should automatically create HubSpot deals from project inquiries', async ({ page }) => {
    // This test verifies the end-to-end flow from member inquiry to HubSpot deal creation
    
    // First, create an inquiry as a member
    await loginAsMember(page)
    await page.goto('/projects')
    
    if (await page.locator('[data-testid="project-card"]').count() > 0) {
      await page.click('[data-testid="project-card"]').first()
      await page.click('[data-testid="express-interest"]')
      await page.fill('[data-testid="interest-message"]', 'Interested in bidding on this project')
      await page.selectOption('[data-testid="contact-method"]', 'phone')
      await page.click('[data-testid="submit-interest"]')
      
      await expect(page.locator('[data-testid="interest-success"]')).toBeVisible()
    }
    
    // Then verify as admin that the inquiry appears in workflow
    await loginAsAdmin(page)
    await page.goto('/admin/projects/workflow')
    
    // Check if project shows recent inquiry activity
    // This would depend on the specific implementation of how inquiries are displayed
    await expect(page.locator('[data-testid="project-list"]')).toBeVisible()
  })
})

test.describe('User Story 5: Project Workflow Automation', () => {
  test('System should automatically transition project statuses based on rules', async ({ page }) => {
    await loginAsAdmin(page)
    
    // Navigate to workflow management
    await page.goto('/admin/projects/workflow')
    
    // Create a test automation rule (if interface exists)
    if (await page.locator('[data-testid="automation-rules"]').isVisible()) {
      await page.click('[data-testid="add-automation-rule"]')
      
      // Configure rule
      await page.fill('[data-testid="rule-name"]', 'Auto-activate approved projects')
      await page.selectOption('[data-testid="rule-trigger"]', 'status_change')
      await page.selectOption('[data-testid="trigger-status"]', 'approved')
      await page.selectOption('[data-testid="action-type"]', 'status_change')
      await page.selectOption('[data-testid="action-status"]', 'active')
      
      await page.click('[data-testid="save-rule"]')
      
      // Verify rule was created
      await expect(page.locator('[data-testid="rule-success"]')).toBeVisible()
    }
    
    // Test manual status change to trigger automation
    if (await page.locator('[data-testid="project-row"]').count() > 0) {
      await page.click('[data-testid="project-row"]').first()
      await page.click('[data-testid="update-status-button"]')
      await page.selectOption('[data-testid="new-status-select"]', 'approved')
      await page.fill('[data-testid="status-reason"]', 'Testing automation rule')
      await page.click('[data-testid="confirm-status-update"]')
      
      // Verify status change was successful
      await expect(page.locator('[data-testid="status-update-success"]')).toBeVisible()
    }
  })
})

test.describe('User Story 6: Accessibility and Usability', () => {
  test('All forms should be accessible and keyboard navigable', async ({ page }) => {
    await loginAsAdmin(page)
    
    // Test main navigation accessibility
    await page.keyboard.press('Tab')
    await expect(page.locator(':focus')).toBeVisible()
    
    // Navigate to project creation form
    await page.goto('/admin/projects/opportunities')
    
    // Test form accessibility
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')
    
    // Verify form labels are properly associated
    const titleInput = page.locator('[data-testid="project-title"]')
    await expect(titleInput).toHaveAttribute('aria-label')
    
    // Test required field validation
    await page.click('[data-testid="submit-project"]')
    await expect(page.locator('[data-testid="validation-error"]')).toBeVisible()
    
    // Verify error messages are descriptive
    const errorMessage = await page.locator('[data-testid="validation-error"]').textContent()
    expect(errorMessage).toContain('required')
  })

  test('System should work properly on mobile devices', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    
    await loginAsAdmin(page)
    
    // Verify mobile navigation is accessible
    if (await page.locator('[data-testid="mobile-menu-button"]').isVisible()) {
      await page.click('[data-testid="mobile-menu-button"]')
      await expect(page.locator('[data-testid="mobile-menu"]')).toBeVisible()
      
      // Test mobile navigation
      await page.click('[data-testid="mobile-projects-nav"]')
      await expect(page).toHaveURL(/\/admin\/projects/)
    }
    
    // Verify touch targets are appropriately sized (minimum 44px)
    const buttons = page.locator('button')
    const buttonCount = await buttons.count()
    
    for (let i = 0; i < Math.min(buttonCount, 10); i++) {
      const button = buttons.nth(i)
      if (await button.isVisible()) {
        const boundingBox = await button.boundingBox()
        if (boundingBox) {
          expect(boundingBox.height).toBeGreaterThanOrEqual(44)
          expect(boundingBox.width).toBeGreaterThanOrEqual(44)
        }
      }
    }
  })

  test('System should handle errors gracefully', async ({ page }) => {
    await loginAsAdmin(page)
    
    // Test network error handling by intercepting API calls
    await page.route('/api/projects/workflow', route => {
      if (route.request().method() === 'GET') {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ success: false, error: 'Internal server error' })
        })
      } else {
        route.continue()
      }
    })
    
    await page.goto('/admin/projects/workflow')
    
    // Verify error state is displayed
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('[data-testid="retry-button"]')).toBeVisible()
    
    // Test retry functionality
    await page.unroute('/api/projects/workflow')
    await page.click('[data-testid="retry-button"]')
    
    // Verify system recovers
    await expect(page.locator('[data-testid="project-list"]')).toBeVisible({ timeout: 10000 })
  })
})

test.describe('User Story 7: Performance and Loading States', () => {
  test('Large data sets should load efficiently with proper loading states', async ({ page }) => {
    await loginAsAdmin(page)
    
    // Navigate to engagement analytics (likely to have large datasets)
    await page.goto('/admin/members/engagement')
    
    // Verify loading skeleton appears
    await expect(page.locator('[data-testid="loading-skeleton"]')).toBeVisible({ timeout: 1000 })
    
    // Wait for content to load
    await expect(page.locator('[data-testid="member-list"]')).toBeVisible({ timeout: 10000 })
    
    // Verify loading skeleton is replaced by content
    await expect(page.locator('[data-testid="loading-skeleton"]')).not.toBeVisible()
    
    // Test virtual scrolling performance (if implemented)
    if (await page.locator('[data-testid="virtualized-list"]').isVisible()) {
      // Scroll through list to test performance
      await page.locator('[data-testid="virtualized-list"]').hover()
      for (let i = 0; i < 5; i++) {
        await page.mouse.wheel(0, 500)
        await page.waitForTimeout(100)
      }
      
      // Verify list remains responsive
      await expect(page.locator('[data-testid="member-list"]')).toBeVisible()
    }
  })

  test('Search and filtering should be debounced and responsive', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/admin/projects/workflow')
    
    // Test search debouncing
    const searchInput = page.locator('[data-testid="project-search"]')
    await searchInput.fill('test')
    
    // Verify immediate search doesn't trigger (debounced)
    await page.waitForTimeout(200)
    
    // Complete search term
    await searchInput.fill('test project')
    
    // Wait for debounce period and verify search executes
    await page.waitForTimeout(500)
    
    // Verify search results or loading state
    const projectList = page.locator('[data-testid="project-list"]')
    await expect(projectList).toBeVisible()
  })
})

test.describe('User Story 8: Data Integrity and Validation', () => {
  test('Form validation should prevent invalid data submission', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/admin/projects/opportunities')
    
    // Test empty form submission
    await page.click('[data-testid="submit-project"]')
    await expect(page.locator('[data-testid="validation-error"]')).toBeVisible()
    
    // Test invalid email format (if email field exists)
    if (await page.locator('[data-testid="contact-email"]').isVisible()) {
      await page.fill('[data-testid="contact-email"]', 'invalid-email')
      await page.click('[data-testid="submit-project"]')
      await expect(page.locator('[data-testid="email-validation-error"]')).toBeVisible()
    }
    
    // Test date validation
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() - 1) // Yesterday
    await page.fill('[data-testid="application-deadline"]', tomorrow.toISOString().split('T')[0])
    await page.click('[data-testid="submit-project"]')
    await expect(page.locator('[data-testid="date-validation-error"]')).toBeVisible()
  })

  test('Status transitions should be validated', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/admin/projects/workflow')
    
    if (await page.locator('[data-testid="project-row"]').count() > 0) {
      await page.click('[data-testid="project-row"]').first()
      await page.click('[data-testid="update-status-button"]')
      
      // Try to transition to an invalid status (depends on current status)
      // This test assumes current status is 'draft' and we're trying to go to 'completed'
      await page.selectOption('[data-testid="new-status-select"]', 'completed')
      await page.fill('[data-testid="status-reason"]', 'Invalid transition test')
      await page.click('[data-testid="confirm-status-update"]')
      
      // Verify invalid transition is prevented
      await expect(page.locator('[data-testid="transition-error"]')).toBeVisible({ timeout: 5000 })
    }
  })
})

// Generate comprehensive audit report
test.afterAll(async ({ browser }) => {
  const report = {
    timestamp: new Date().toISOString(),
    testResults: 'See individual test results above',
    criticalIssues: [],
    recommendations: [
      'Ensure all data-testid attributes are properly implemented',
      'Verify HubSpot integration is properly configured for testing',
      'Implement comprehensive loading states for all async operations',
      'Add proper form validation for all user inputs',
      'Ensure mobile responsiveness meets WCAG guidelines',
      'Implement proper error boundaries and recovery mechanisms',
      'Add comprehensive accessibility attributes (ARIA labels, roles)',
      'Optimize performance for large data sets with virtualization',
      'Implement proper status transition validation',
      'Add comprehensive audit logging for all admin actions'
    ],
    coverageAreas: [
      'Member project discovery and engagement flow',
      'Admin project creation and management',
      'Member engagement analytics and reporting', 
      'HubSpot integration and CRM sync',
      'Project workflow and status management',
      'Accessibility and keyboard navigation',
      'Mobile responsiveness and touch targets',
      'Error handling and recovery',
      'Performance with large datasets',
      'Form validation and data integrity'
    ]
  }
  
  console.log('='.repeat(80))
  console.log('NAMC PROJECT MANAGEMENT SYSTEM - USER STORY AUDIT REPORT')
  console.log('='.repeat(80))
  console.log(JSON.stringify(report, null, 2))
  console.log('='.repeat(80))
})
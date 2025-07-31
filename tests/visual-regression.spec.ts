import { test, expect } from '@playwright/test'

test.describe('Visual Regression Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication
    await page.goto('http://localhost:3000')
    await page.evaluate(() => {
      window.localStorage.setItem('mockAuth', JSON.stringify({
        user: {
          id: 'admin-123',
          name: 'Admin User',
          email: 'admin@namcnorcal.org',
          role: 'admin'
        }
      }))
    })
  })

  test('project upload form visual test', async ({ page }) => {
    await page.goto('http://localhost:3000/admin/projects/opportunities')
    await page.waitForSelector('h1:has-text("Project Opportunities Management")')
    
    // Take screenshot of the entire form
    await expect(page).toHaveScreenshot('project-upload-form.png', {
      fullPage: true,
      animations: 'disabled'
    })
    
    // Take screenshot of specific sections
    const basicInfoSection = page.locator('h3:has-text("Basic Information")').locator('..')
    await expect(basicInfoSection).toHaveScreenshot('basic-info-section.png')
    
    const budgetSection = page.locator('h3:has-text("Budget and Timeline")').locator('..')
    await expect(budgetSection).toHaveScreenshot('budget-timeline-section.png')
  })

  test('project dashboard visual test', async ({ page }) => {
    await page.goto('http://localhost:3000/admin/projects/dashboard')
    await page.waitForSelector('h1:has-text("Project Opportunities Dashboard")')
    
    // Wait for animations to complete
    await page.waitForTimeout(1000)
    
    // Full page screenshot
    await expect(page).toHaveScreenshot('project-dashboard-full.png', {
      fullPage: true,
      animations: 'disabled'
    })
    
    // Key metrics section
    const metricsSection = page.locator('.grid.grid-cols-1.md\\:grid-cols-2.lg\\:grid-cols-4').first()
    await expect(metricsSection).toHaveScreenshot('dashboard-metrics.png')
    
    // Top performing projects
    const projectsSection = page.locator('text=Top Performing Projects').locator('../..')
    await expect(projectsSection).toHaveScreenshot('top-projects.png')
  })

  test('project detail modal visual test', async ({ page }) => {
    await page.goto('http://localhost:3000/admin/projects/dashboard')
    await page.waitForSelector('button:has-text("View Details")')
    
    // Open modal
    await page.click('button:has-text("View Details")').first()
    await page.waitForSelector('.fixed.inset-0')
    
    // Screenshot of modal
    const modal = page.locator('.bg-white.rounded-lg.max-w-4xl')
    await expect(modal).toHaveScreenshot('project-detail-modal.png')
  })

  test('responsive design screenshots', async ({ page }) => {
    const viewports = [
      { name: 'mobile', width: 375, height: 667 },
      { name: 'tablet', width: 768, height: 1024 },
      { name: 'desktop', width: 1920, height: 1080 }
    ]
    
    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height })
      
      // Dashboard responsive
      await page.goto('http://localhost:3000/admin/projects/dashboard')
      await page.waitForSelector('h1')
      await expect(page).toHaveScreenshot(`dashboard-${viewport.name}.png`, {
        fullPage: false,
        animations: 'disabled'
      })
      
      // Upload form responsive
      await page.goto('http://localhost:3000/admin/projects/opportunities')
      await page.waitForSelector('h1')
      await expect(page).toHaveScreenshot(`upload-form-${viewport.name}.png`, {
        fullPage: false,
        animations: 'disabled'
      })
    }
  })

  test('interaction states visual test', async ({ page }) => {
    await page.goto('http://localhost:3000/admin/projects/opportunities')
    
    // Hover state on button
    const publishButton = page.locator('button:has-text("Publish Project")')
    await publishButton.hover()
    await expect(publishButton).toHaveScreenshot('button-hover-state.png')
    
    // Focus state on input
    const titleInput = page.locator('input[placeholder="Enter project title"]')
    await titleInput.focus()
    await expect(titleInput.locator('..').locator('..')).toHaveScreenshot('input-focus-state.png')
    
    // Error state
    await publishButton.click() // Trigger validation
    await page.waitForSelector('text=Project title is required')
    await expect(titleInput.locator('..').locator('..')).toHaveScreenshot('input-error-state.png')
  })

  test('dark mode support visual test', async ({ page }) => {
    // If dark mode is implemented, test it here
    await page.goto('http://localhost:3000/admin/projects/dashboard')
    
    // Toggle dark mode if available
    // await page.click('button[aria-label="Toggle dark mode"]')
    
    // For now, just test that the UI works well with system dark mode
    await page.emulateMedia({ colorScheme: 'dark' })
    await page.waitForTimeout(500) // Wait for any transitions
    
    await expect(page).toHaveScreenshot('dashboard-dark-mode.png', {
      fullPage: true,
      animations: 'disabled'
    })
  })
})
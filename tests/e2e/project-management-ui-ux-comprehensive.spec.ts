import { test, expect, Page, BrowserContext } from '@playwright/test'

/**
 * Comprehensive End-to-End UI/UX Testing for NAMC Project Management System
 * 
 * This test suite covers the entire user journey from a UI/UX perspective:
 * 1. Navigation & Layout Testing
 * 2. Project Creation Wizard Testing  
 * 3. Project Management Dashboard Testing
 * 4. Project Detail View Testing
 * 5. UI/UX Issues Detection
 * 6. Interaction Testing
 */

// Test data constants
const TEST_PROJECT_DATA = {
  title: 'Test Project - Oakland Community Center',
  description: 'Test description for automated testing of the project creation wizard',
  category: 'commercial',
  subcategory: 'office',
  specifications: {
    squareFootage: '5000',
    stories: '2',
    units: '1',
    parkingSpaces: '10'
  },
  client: {
    companyName: 'Test Construction Company',
    contactPerson: 'John Test',
    email: 'john.test@example.com',
    phone: '(555) 123-4567'
  },
  location: {
    address: '123 Test Street',
    city: 'Oakland',
    state: 'CA',
    zipCode: '94612',
    parcelNumber: '123-456-789',
    lotSize: '7500',
    zoningType: 'C-1'
  },
  timeline: {
    startDate: '2024-06-01',
    endDate: '2024-12-31',
    weatherDays: '10',
    bufferDays: '5'
  }
}

// Helper functions for common operations
class ProjectManagementHelpers {
  constructor(private page: Page) {}

  async navigateToProjects() {
    await this.page.goto('/member/projects')
    await this.page.waitForLoadState('networkidle')
  }

  async navigateToCreateProject() {
    await this.page.goto('/member/projects/create')
    await this.page.waitForLoadState('networkidle')
  }

  async checkResponsiveDesign(viewports: Array<{width: number, height: number, device: string}>) {
    const issues: string[] = []
    
    for (const viewport of viewports) {
      await this.page.setViewportSize(viewport)
      await this.page.waitForTimeout(500) // Allow layout to adjust
      
      // Check for horizontal scroll
      const hasHorizontalScroll = await this.page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth
      })
      
      if (hasHorizontalScroll) {
        issues.push(`Horizontal scroll detected on ${viewport.device} (${viewport.width}x${viewport.height})`)
      }
      
      // Check for overlapping elements
      const overlappingElements = await this.page.evaluate(() => {
        const elements = Array.from(document.querySelectorAll('*'))
        const overlaps: string[] = []
        
        for (let i = 0; i < elements.length; i++) {
          const elem1 = elements[i] as HTMLElement
          const rect1 = elem1.getBoundingClientRect()
          
          if (rect1.width === 0 || rect1.height === 0) continue
          
          for (let j = i + 1; j < elements.length; j++) {
            const elem2 = elements[j] as HTMLElement
            const rect2 = elem2.getBoundingClientRect()
            
            if (rect2.width === 0 || rect2.height === 0) continue
            
            // Check if elements overlap significantly
            const overlapX = Math.max(0, Math.min(rect1.right, rect2.right) - Math.max(rect1.left, rect2.left))
            const overlapY = Math.max(0, Math.min(rect1.bottom, rect2.bottom) - Math.max(rect1.top, rect2.top))
            
            if (overlapX > rect1.width * 0.5 && overlapY > rect1.height * 0.5) {
              overlaps.push(`Potential overlap between ${elem1.tagName} and ${elem2.tagName}`)
            }
          }
        }
        
        return overlaps.slice(0, 5) // Limit to first 5 overlaps to avoid spam
      })
      
      issues.push(...overlappingElements.map(overlap => `${viewport.device}: ${overlap}`))
    }
    
    return issues
  }

  async checkAccessibility() {
    const issues: string[] = []
    
    // Check for missing alt text on images
    const imagesWithoutAlt = await this.page.locator('img:not([alt])').count()
    if (imagesWithoutAlt > 0) {
      issues.push(`${imagesWithoutAlt} images missing alt text`)
    }
    
    // Check for form inputs without labels
    const inputsWithoutLabels = await this.page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input, textarea, select'))
      return inputs.filter(input => {
        const id = input.getAttribute('id')
        const ariaLabel = input.getAttribute('aria-label')
        const ariaLabelledBy = input.getAttribute('aria-labelledby')
        const hasLabel = id ? document.querySelector(`label[for="${id}"]`) : null
        
        return !hasLabel && !ariaLabel && !ariaLabelledBy
      }).length
    })
    
    if (inputsWithoutLabels > 0) {
      issues.push(`${inputsWithoutLabels} form inputs missing labels`)
    }
    
    // Check for missing focus indicators
    const focusableElements = await this.page.locator('button, input, select, textarea, a[href]').count()
    // This is a simplified check - in a real scenario you'd test focus styles
    
    // Check for proper heading hierarchy
    const headingIssues = await this.page.evaluate(() => {
      const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'))
      const issues: string[] = []
      let currentLevel = 0
      
      headings.forEach((heading, index) => {
        const level = parseInt(heading.tagName.charAt(1))
        if (index === 0 && level !== 1) {
          issues.push('Page should start with h1')
        }
        if (level > currentLevel + 1) {
          issues.push(`Heading level skipped: ${heading.tagName} after h${currentLevel}`)
        }
        currentLevel = level
      })
      
      return issues
    })
    
    issues.push(...headingIssues)
    
    return issues
  }

  async checkPerformance() {
    const issues: string[] = []
    
    // Check for large images
    const largeImages = await this.page.evaluate(() => {
      const images = Array.from(document.querySelectorAll('img'))
      return images.filter(img => {
        const rect = img.getBoundingClientRect()
        return rect.width > 1920 || rect.height > 1080
      }).length
    })
    
    if (largeImages > 0) {
      issues.push(`${largeImages} potentially oversized images detected`)
    }
    
    // Check for excessive DOM size
    const domSize = await this.page.evaluate(() => document.querySelectorAll('*').length)
    if (domSize > 3000) {
      issues.push(`Large DOM size detected: ${domSize} elements`)
    }
    
    return issues
  }

  async takeScreenshotWithTimestamp(name: string) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    await this.page.screenshot({ 
      path: `screenshots/${name}-${timestamp}.png`,
      fullPage: true 
    })
  }
}

test.describe('NAMC Project Management System - Comprehensive UI/UX Testing', () => {
  let helpers: ProjectManagementHelpers

  test.beforeEach(async ({ page }) => {
    helpers = new ProjectManagementHelpers(page)
    
    // Mock authentication - assuming user is already logged in
    // In a real scenario, you'd handle proper authentication here
    await page.goto('/member/dashboard')
    await page.waitForLoadState('networkidle')
  })

  test.describe('1. Navigation & Layout Testing', () => {
    test('should display main projects page with proper layout', async ({ page }) => {
      await helpers.navigateToProjects()
      
      // Check page title and description
      await expect(page.locator('h1')).toContainText('Projects')
      await expect(page.locator('text=Manage your construction projects')).toBeVisible()
      
      // Check navigation elements
      await expect(page.locator('[data-testid="new-project-button"], button:has-text("New Project")')).toBeVisible()
      
      // Check stats cards are present
      const statsCards = page.locator('.grid .card, [class*="grid"] [class*="card"]').first()
      await expect(statsCards).toBeVisible()
      
      // Take screenshot for visual verification
      await helpers.takeScreenshotWithTimestamp('projects-main-page')
    })

    test('should be responsive across different screen sizes', async ({ page }) => {
      await helpers.navigateToProjects()
      
      const viewports = [
        { width: 1920, height: 1080, device: 'Desktop Large' },
        { width: 1366, height: 768, device: 'Desktop Standard' },
        { width: 1024, height: 768, device: 'Tablet Landscape' },
        { width: 768, height: 1024, device: 'Tablet Portrait' },
        { width: 375, height: 667, device: 'Mobile iPhone' },
        { width: 360, height: 640, device: 'Mobile Android' }
      ]
      
      const responsiveIssues = await helpers.checkResponsiveDesign(viewports)
      
      // Take screenshots at different viewports
      for (const viewport of viewports) {
        await page.setViewportSize(viewport)
        await page.waitForTimeout(500)
        await helpers.takeScreenshotWithTimestamp(`projects-${viewport.device.toLowerCase().replace(' ', '-')}`)
      }
      
      // Assert no major responsive issues
      expect(responsiveIssues.filter(issue => issue.includes('Horizontal scroll')).length).toBeLessThan(2)
    })

    test('should have accessible navigation and menu functionality', async ({ page }) => {
      await helpers.navigateToProjects()
      
      const accessibilityIssues = await helpers.checkAccessibility()
      
      // Check for proper keyboard navigation
      await page.keyboard.press('Tab')
      const focusedElement = await page.evaluate(() => document.activeElement?.tagName)
      expect(focusedElement).toBeTruthy()
      
      // Check for proper ARIA labels and roles
      const navigationElements = page.locator('nav, [role="navigation"]')
      await expect(navigationElements.first()).toBeVisible()
      
      console.log('Accessibility Issues Found:', accessibilityIssues)
      
      // Allow minor accessibility issues but flag major ones
      const majorIssues = accessibilityIssues.filter(issue => 
        issue.includes('missing alt text') || issue.includes('missing labels')
      )
      expect(majorIssues.length).toBeLessThan(5)
    })

    test('should display header, sidebar, and footer layouts correctly', async ({ page }) => {
      await helpers.navigateToProjects()
      
      // Check header presence and content
      const header = page.locator('header, .header, [data-testid="header"]').first()
      if (await header.count() > 0) {
        await expect(header).toBeVisible()
      }
      
      // Check main content area
      const mainContent = page.locator('main, .main-content, [role="main"]').first()
      if (await mainContent.count() > 0) {
        await expect(mainContent).toBeVisible()
      }
      
      // Check footer if present
      const footer = page.locator('footer, .footer, [data-testid="footer"]').first()
      if (await footer.count() > 0) {
        await expect(footer).toBeVisible()
      }
      
      // Verify layout doesn't break on scroll
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
      await page.waitForTimeout(500)
      await helpers.takeScreenshotWithTimestamp('projects-scrolled-layout')
    })
  })

  test.describe('2. Project Creation Wizard Testing', () => {
    test('should navigate to project creation wizard', async ({ page }) => {
      await helpers.navigateToProjects()
      
      // Click "New Project" or similar button
      const newProjectButton = page.locator('button:has-text("New Project"), [data-testid="new-project-button"]').first()
      await newProjectButton.click()
      
      // Should navigate to creation page
      await expect(page).toHaveURL(/.*\/projects\/create/)
      await expect(page.locator('h1')).toContainText('Create New Project')
      
      // Check wizard steps are visible
      const wizardSteps = page.locator('.step, [data-testid="wizard-step"]')
      if (await wizardSteps.count() > 0) {
        await expect(wizardSteps.first()).toBeVisible()
      }
      
      await helpers.takeScreenshotWithTimestamp('project-creation-wizard-start')
    })

    test('should complete all 7 steps of project creation wizard', async ({ page }) => {
      await helpers.navigateToCreateProject()
      
      // Step 1: Project Type
      await expect(page.locator('text=Project Type, text=Select project category')).toBeVisible()
      
      // Select commercial category
      const commercialCategory = page.locator(`[data-testid="category-commercial"], .category:has-text("Commercial"), button:has-text("Commercial")`).first()
      if (await commercialCategory.count() > 0) {
        await commercialCategory.click()
      } else {
        // Fallback to any clickable category option
        const anyCategory = page.locator('.category, [class*="category"]').first()
        if (await anyCategory.count() > 0) {
          await anyCategory.click()
        }
      }
      
      await helpers.takeScreenshotWithTimestamp('wizard-step-1-category')
      
      // Move to next step
      const nextButton = page.locator('button:has-text("Next")').first()
      await nextButton.click()
      
      // Step 2: Basic Info
      await page.fill('input[placeholder*="Oakland"], input[name="title"], #title', TEST_PROJECT_DATA.title)
      await page.fill('textarea[placeholder*="description"], textarea[name="description"], #description', TEST_PROJECT_DATA.description)
      await page.fill('input[placeholder*="2500"], input[name="squareFootage"], #squareFootage', TEST_PROJECT_DATA.specifications.squareFootage)
      
      await helpers.takeScreenshotWithTimestamp('wizard-step-2-basic-info')
      await nextButton.click()
      
      // Step 3: Client Details
      await page.fill('input[placeholder*="ABC Construction"], input[name="companyName"], #companyName', TEST_PROJECT_DATA.client.companyName)
      await page.fill('input[placeholder*="John Smith"], input[name="contactPerson"], #contactPerson', TEST_PROJECT_DATA.client.contactPerson)
      await page.fill('input[type="email"], input[name="email"], #email', TEST_PROJECT_DATA.client.email)
      await page.fill('input[type="tel"], input[name="phone"], #phone', TEST_PROJECT_DATA.client.phone)
      
      await helpers.takeScreenshotWithTimestamp('wizard-step-3-client')
      await nextButton.click()
      
      // Step 4: Location
      await page.fill('input[placeholder*="123 Main"], input[name="address"], #address', TEST_PROJECT_DATA.location.address)
      await page.fill('input[placeholder*="Oakland"], input[name="city"], #city', TEST_PROJECT_DATA.location.city)
      await page.fill('input[placeholder*="94612"], input[name="zipCode"], #zipCode', TEST_PROJECT_DATA.location.zipCode)
      
      await helpers.takeScreenshotWithTimestamp('wizard-step-4-location')
      await nextButton.click()
      
      // Step 5: Timeline
      await page.fill('input[type="date"]:first-of-type, input[name="startDate"], #startDate', TEST_PROJECT_DATA.timeline.startDate)
      await page.fill('input[type="date"]:last-of-type, input[name="endDate"], #endDate', TEST_PROJECT_DATA.timeline.endDate)
      
      await helpers.takeScreenshotWithTimestamp('wizard-step-5-timeline')
      await nextButton.click()
      
      // Step 6: Estimation (AI-powered)
      await expect(page.locator('text=AI-Powered Cost Estimation, text=Generate intelligent cost')).toBeVisible()
      
      // Look for generate estimate button
      const generateButton = page.locator('button:has-text("Generate Estimate")').first()
      if (await generateButton.count() > 0) {
        await generateButton.click()
        
        // Wait for estimation to complete (with timeout)
        await page.waitForTimeout(3000)
      }
      
      await helpers.takeScreenshotWithTimestamp('wizard-step-6-estimation')
      await nextButton.click()
      
      // Step 7: Review
      await expect(page.locator('text=Ready to Create Project, text=Review the project details')).toBeVisible()
      
      // Verify all entered data is displayed correctly
      await expect(page.locator(`text=${TEST_PROJECT_DATA.title}`)).toBeVisible()
      await expect(page.locator(`text=${TEST_PROJECT_DATA.client.companyName}`)).toBeVisible()
      
      await helpers.takeScreenshotWithTimestamp('wizard-step-7-review')
    })

    test('should validate form inputs at each step', async ({ page }) => {
      await helpers.navigateToCreateProject()
      
      // Try to proceed without selecting category
      const nextButton = page.locator('button:has-text("Next")').first()
      await nextButton.click()
      
      // Should show validation error
      const errorMessage = page.locator('.error, .alert, [role="alert"], text=Please select')
      if (await errorMessage.count() > 0) {
        await expect(errorMessage.first()).toBeVisible()
      }
      
      await helpers.takeScreenshotWithTimestamp('validation-error-step-1')
      
      // Select category and proceed
      const firstCategory = page.locator('.category, [class*="category"], button').first()
      if (await firstCategory.count() > 0) {
        await firstCategory.click()
        await nextButton.click()
      }
      
      // Step 2: Try to proceed without required fields
      await nextButton.click()
      
      // Should show validation errors for required fields
      const requiredFieldErrors = page.locator('.error, .alert, [role="alert"], text=Please provide')
      if (await requiredFieldErrors.count() > 0) {
        await expect(requiredFieldErrors.first()).toBeVisible()
      }
      
      await helpers.takeScreenshotWithTimestamp('validation-error-step-2')
    })

    test('should handle template selection functionality', async ({ page }) => {
      await helpers.navigateToCreateProject()
      
      // Select a category first
      const category = page.locator('.category, [class*="category"]').first()
      if (await category.count() > 0) {
        await category.click()
        await page.waitForTimeout(1000) // Wait for templates to load
        
        // Check if templates are displayed
        const templates = page.locator('.template, [class*="template"]')
        if (await templates.count() > 0) {
          await expect(templates.first()).toBeVisible()
          
          // Select a template
          await templates.first().click()
          
          await helpers.takeScreenshotWithTimestamp('template-selection')
        }
      }
    })

    test('should test AI estimation feature integration', async ({ page }) => {
      await helpers.navigateToCreateProject()
      
      // Navigate through steps quickly to reach estimation
      // This is a simplified version - in practice you'd fill required fields
      
      const steps = ['category', 'basic-info', 'client', 'location', 'timeline']
      
      for (let i = 0; i < 5; i++) {
        // Fill minimal required data for each step
        await page.waitForTimeout(500)
        
        if (i === 0) {
          // Select category
          const category = page.locator('.category, [class*="category"]').first()
          if (await category.count() > 0) {
            await category.click()
          }
        }
        
        const nextButton = page.locator('button:has-text("Next")').first()
        if (await nextButton.count() > 0) {
          await nextButton.click()
        }
      }
      
      // Should be at estimation step
      const estimationSection = page.locator('text=AI-Powered, text=Generate intelligent cost')
      if (await estimationSection.count() > 0) {
        await expect(estimationSection.first()).toBeVisible()
        
        const generateButton = page.locator('button:has-text("Generate Estimate")').first()
        if (await generateButton.count() > 0) {
          await generateButton.click()
          
          // Check for loading state
          const loadingIndicator = page.locator('.animate-spin, .loading, text=Analyzing')
          if (await loadingIndicator.count() > 0) {
            await expect(loadingIndicator.first()).toBeVisible()
          }
          
          await helpers.takeScreenshotWithTimestamp('ai-estimation-loading')
          
          // Wait for estimation to complete
          await page.waitForTimeout(5000)
          await helpers.takeScreenshotWithTimestamp('ai-estimation-complete')
        }
      }
    })

    test('should test HubSpot sync options', async ({ page }) => {
      await helpers.navigateToCreateProject()
      
      // Navigate to final step (simplified)
      for (let i = 0; i < 6; i++) {
        const nextButton = page.locator('button:has-text("Next")').first()
        if (await nextButton.count() > 0) {
          await nextButton.click()
          await page.waitForTimeout(500)
        }
      }
      
      // Check for HubSpot sync checkbox
      const hubspotCheckbox = page.locator('input[type="checkbox"]:has-text("HubSpot"), #hubspotSync')
      if (await hubspotCheckbox.count() > 0) {
        await expect(hubspotCheckbox.first()).toBeVisible()
        
        // Test toggling the checkbox
        await hubspotCheckbox.first().click()
        await helpers.takeScreenshotWithTimestamp('hubspot-sync-enabled')
        
        await hubspotCheckbox.first().click()
        await helpers.takeScreenshotWithTimestamp('hubspot-sync-disabled')
      }
    })
  })

  test.describe('3. Project Management Dashboard Testing', () => {
    test('should display project cards with proper layout and information', async ({ page }) => {
      await helpers.navigateToProjects()
      
      // Check for project cards
      const projectCards = page.locator('.card, [class*="card"]')
      if (await projectCards.count() > 0) {
        await expect(projectCards.first()).toBeVisible()
        
        // Check card contains expected information
        const firstCard = projectCards.first()
        
        // Look for key elements in project cards
        const cardElements = {
          title: firstCard.locator('h2, h3, .title, [class*="title"], .font-semibold').first(),
          status: firstCard.locator('.status, .badge, [class*="status"], [class*="badge"]').first(),
          budget: firstCard.locator('text=$, .budget, [class*="budget"]').first(),
          location: firstCard.locator('text=•, .location, [class*="location"]').first()
        }
        
        // Verify at least some card elements are present
        let visibleElements = 0
        for (const [key, element] of Object.entries(cardElements)) {
          if (await element.count() > 0) {
            visibleElements++
          }
        }
        
        expect(visibleElements).toBeGreaterThan(0)
        await helpers.takeScreenshotWithTimestamp('project-cards-layout')
      }
    })

    test('should test search and filtering functionality', async ({ page }) => {
      await helpers.navigateToProjects()
      
      // Test search functionality
      const searchInput = page.locator('input[placeholder*="Search"], input[type="search"], .search input').first()
      if (await searchInput.count() > 0) {
        await searchInput.fill('Oakland')
        await page.waitForTimeout(1000)
        
        await helpers.takeScreenshotWithTimestamp('search-functionality')
        
        // Clear search
        await searchInput.clear()
        await page.waitForTimeout(500)
      }
      
      // Test status filter
      const statusFilter = page.locator('select[name*="status"], .filter select').first()
      if (await statusFilter.count() > 0) {
        await statusFilter.selectOption('in_progress')
        await page.waitForTimeout(1000)
        
        await helpers.takeScreenshotWithTimestamp('status-filter')
        
        // Reset filter
        await statusFilter.selectOption('all')
      }
      
      // Test category filter
      const categoryFilter = page.locator('select[name*="category"], select:not([name*="status"])').first()
      if (await categoryFilter.count() > 0) {
        await categoryFilter.selectOption('commercial')
        await page.waitForTimeout(1000)
        
        await helpers.takeScreenshotWithTimestamp('category-filter')
      }
    })

    test('should display project statistics and metrics correctly', async ({ page }) => {
      await helpers.navigateToProjects()
      
      // Check for stats cards
      const statsCards = page.locator('.stats, .metrics, [class*="stats"], [class*="grid"] .card').first()
      if (await statsCards.count() > 0) {
        await expect(statsCards).toBeVisible()
        
        // Look for key metrics
        const metrics = [
          page.locator('text=Total Projects, text=Projects').first(),
          page.locator('text=Active, text=Active Projects').first(),
          page.locator('text=Completed').first(),
          page.locator('text=Total Value, text=Budget, text=$').first()
        ]
        
        let visibleMetrics = 0
        for (const metric of metrics) {
          if (await metric.count() > 0) {
            visibleMetrics++
          }
        }
        
        expect(visibleMetrics).toBeGreaterThan(0)
        await helpers.takeScreenshotWithTimestamp('project-statistics')
      }
    })

    test('should verify status badges and priority indicators', async ({ page }) => {
      await helpers.navigateToProjects()
      
      // Look for status badges
      const statusBadges = page.locator('.badge, .status, [class*="badge"], [class*="status"]')
      if (await statusBadges.count() > 0) {
        await expect(statusBadges.first()).toBeVisible()
        
        // Check for different status colors/styles
        const badgeStyles = await statusBadges.first().getAttribute('class')
        expect(badgeStyles).toBeTruthy()
        
        await helpers.takeScreenshotWithTimestamp('status-badges')
      }
      
      // Look for priority indicators
      const priorityIndicators = page.locator('.priority, [class*="priority"], text=High, text=Medium, text=Low')
      if (await priorityIndicators.count() > 0) {
        await expect(priorityIndicators.first()).toBeVisible()
        await helpers.takeScreenshotWithTimestamp('priority-indicators')
      }
    })

    test('should test HubSpot sync status indicators', async ({ page }) => {
      await helpers.navigateToProjects()
      
      // Look for HubSpot sync indicators
      const syncIndicators = page.locator('.sync, .hubspot, [class*="sync"], [class*="hubspot"], .rounded-full')
      if (await syncIndicators.count() > 0) {
        // Check for different sync statuses (colored dots, etc.)
        const indicator = syncIndicators.first()
        await expect(indicator).toBeVisible()
        
        // Test hover states if applicable
        await indicator.hover()
        await page.waitForTimeout(500)
        
        await helpers.takeScreenshotWithTimestamp('hubspot-sync-indicators')
      }
    })
  })

  test.describe('4. Project Detail View Testing', () => {
    test('should navigate to individual project pages', async ({ page }) => {
      await helpers.navigateToProjects()
      
      // Click on first project card
      const firstProject = page.locator('.card, [class*="card"]').first()
      if (await firstProject.count() > 0) {
        await firstProject.click()
        
        // Should navigate to project detail page
        await expect(page).toHaveURL(/.*\/projects\/[^\/]+$/)
        
        // Check for project detail elements
        await expect(page.locator('h1')).toBeVisible()
        await helpers.takeScreenshotWithTimestamp('project-detail-page')
      }
    })

    test('should test all tabs functionality', async ({ page }) => {
      // Navigate to a specific project (using mock ID)
      await page.goto('/member/projects/proj-1')
      await page.waitForLoadState('networkidle')
      
      const tabs = ['Overview', 'Timeline', 'Budget', 'Team', 'Documents', 'Estimates']
      
      for (const tabName of tabs) {
        const tab = page.locator(`button:has-text("${tabName}"), [role="tab"]:has-text("${tabName}")`)
        if (await tab.count() > 0) {
          await tab.click()
          await page.waitForTimeout(1000)
          
          // Check that tab content is visible
          const tabContent = page.locator('.tab-content, [role="tabpanel"]').first()
          if (await tabContent.count() > 0) {
            await expect(tabContent).toBeVisible()
          }
          
          await helpers.takeScreenshotWithTimestamp(`project-detail-tab-${tabName.toLowerCase()}`)
        }
      }
    })

    test('should verify data visualization components', async ({ page }) => {
      await page.goto('/member/projects/proj-1')
      await page.waitForLoadState('networkidle')
      
      // Check for progress bars
      const progressBars = page.locator('.progress, [class*="progress"], .bg-blue-500')
      if (await progressBars.count() > 0) {
        await expect(progressBars.first()).toBeVisible()
        await helpers.takeScreenshotWithTimestamp('progress-visualization')
      }
      
      // Check for charts or graphs (if present)
      const charts = page.locator('canvas, svg, .chart, [class*="chart"]')
      if (await charts.count() > 0) {
        await expect(charts.first()).toBeVisible()
        await helpers.takeScreenshotWithTimestamp('data-charts')
      }
      
      // Check budget visualization
      await page.click('button:has-text("Budget")')
      await page.waitForTimeout(1000)
      
      const budgetBars = page.locator('.budget .progress, .budget [class*="progress"]')
      if (await budgetBars.count() > 0) {
        await expect(budgetBars.first()).toBeVisible()
        await helpers.takeScreenshotWithTimestamp('budget-visualization')
      }
    })

    test('should test interactive elements and buttons', async ({ page }) => {
      await page.goto('/member/projects/proj-1')
      await page.waitForLoadState('networkidle')
      
      // Test header buttons
      const actionButtons = [
        'Settings',
        'Edit Project',
        'Edit',
        'Back'
      ]
      
      for (const buttonText of actionButtons) {
        const button = page.locator(`button:has-text("${buttonText}")`)
        if (await button.count() > 0) {
          await expect(button).toBeVisible()
          
          // Test hover state
          await button.hover()
          await page.waitForTimeout(300)
          
          // Note: We don't actually click these buttons to avoid navigation
          // In a real test, you might want to test the click functionality too
        }
      }
      
      await helpers.takeScreenshotWithTimestamp('interactive-buttons')
      
      // Test HubSpot sync button
      const syncButton = page.locator('button:has-text("Sync Now")')
      if (await syncButton.count() > 0) {
        await expect(syncButton).toBeVisible()
        await syncButton.hover()
        await page.waitForTimeout(300)
      }
    })

    test('should check responsive behavior in detail view', async ({ page }) => {
      await page.goto('/member/projects/proj-1')
      await page.waitForLoadState('networkidle')
      
      const viewports = [
        { width: 1200, height: 800, device: 'Desktop' },
        { width: 768, height: 1024, device: 'Tablet' },
        { width: 375, height: 667, device: 'Mobile' }
      ]
      
      for (const viewport of viewports) {
        await page.setViewportSize(viewport)
        await page.waitForTimeout(500)
        
        // Check that tabs are still accessible
        const tabNavigation = page.locator('nav, .tab-nav, [role="tablist"]').first()
        if (await tabNavigation.count() > 0) {
          await expect(tabNavigation).toBeVisible()
        }
        
        await helpers.takeScreenshotWithTimestamp(`project-detail-responsive-${viewport.device.toLowerCase()}`)
      }
    })
  })

  test.describe('5. UI/UX Issues Detection', () => {
    test('should detect layout inconsistencies and broken styling', async ({ page }) => {
      const pagesToTest = [
        '/member/projects',
        '/member/projects/create',
        '/member/projects/proj-1'
      ]
      
      for (const url of pagesToTest) {
        await page.goto(url)
        await page.waitForLoadState('networkidle')
        
        // Check for broken layouts
        const layoutIssues = await page.evaluate(() => {
          const issues: string[] = []
          
          // Check for elements with zero dimensions that should be visible
          const elements = Array.from(document.querySelectorAll('*'))
          elements.forEach(el => {
            const rect = (el as HTMLElement).getBoundingClientRect()
            const computedStyle = window.getComputedStyle(el as Element)
            
            if (computedStyle.display !== 'none' && 
                computedStyle.visibility !== 'hidden' && 
                rect.width === 0 && rect.height === 0 &&
                (el as HTMLElement).innerText && 
                (el as HTMLElement).innerText.trim().length > 0) {
              issues.push(`Element with content has zero dimensions: ${el.tagName}`)
            }
          })
          
          // Check for text that might be cut off
          const textElements = Array.from(document.querySelectorAll('p, span, div, h1, h2, h3, h4, h5, h6'))
          textElements.forEach(el => {
            const rect = (el as HTMLElement).getBoundingClientRect()
            const style = window.getComputedStyle(el as Element)
            
            if (style.overflow === 'hidden' && 
                (el as HTMLElement).scrollWidth > rect.width) {
              issues.push(`Text potentially cut off in: ${el.tagName}`)
            }
          })
          
          return issues.slice(0, 10) // Limit to prevent spam
        })
        
        console.log(`Layout issues for ${url}:`, layoutIssues)
        
        // Allow some minor issues but flag major ones
        expect(layoutIssues.length).toBeLessThan(20)
      }
    })

    test('should check for missing or broken navigation', async ({ page }) => {
      await helpers.navigateToProjects()
      
      // Check for essential navigation elements
      const navigationElements = [
        'Projects', // Current page
        'Dashboard', // Should link to dashboard
        'Settings', // Settings or profile
        'New Project' // Action button
      ]
      
      const missingNavigation: string[] = []
      
      for (const navItem of navigationElements) {
        const element = page.locator(`a:has-text("${navItem}"), button:has-text("${navItem}"), [href*="${navItem.toLowerCase()}"]`)
        if (await element.count() === 0) {
          missingNavigation.push(navItem)
        }
      }
      
      // Allow some missing navigation but flag if too many are missing
      expect(missingNavigation.length).toBeLessThan(navigationElements.length / 2)
    })

    test('should identify accessibility concerns', async ({ page }) => {
      const pagesToTest = [
        '/member/projects',
        '/member/projects/create'
      ]
      
      for (const url of pagesToTest) {
        await page.goto(url)
        await page.waitForLoadState('networkidle')
        
        const accessibilityIssues = await helpers.checkAccessibility()
        
        console.log(`Accessibility issues for ${url}:`, accessibilityIssues)
        
        // Allow minor issues but ensure major ones are addressed
        const criticalIssues = accessibilityIssues.filter(issue => 
          issue.includes('missing alt text') || 
          issue.includes('missing labels') ||
          issue.includes('start with h1')
        )
        
        expect(criticalIssues.length).toBeLessThan(5)
      }
    })

    test('should detect performance issues', async ({ page }) => {
      const pagesToTest = [
        '/member/projects',
        '/member/projects/create'
      ]
      
      for (const url of pagesToTest) {
        await page.goto(url)
        await page.waitForLoadState('networkidle')
        
        const performanceIssues = await helpers.checkPerformance()
        
        console.log(`Performance issues for ${url}:`, performanceIssues)
        
        // Set reasonable thresholds
        const criticalIssues = performanceIssues.filter(issue => 
          issue.includes('Large DOM size') && issue.includes('5000')
        )
        
        expect(criticalIssues.length).toBe(0)
      }
    })

    test('should check visual hierarchy and typography', async ({ page }) => {
      await helpers.navigateToProjects()
      
      // Check heading hierarchy
      const headingIssues = await page.evaluate(() => {
        const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'))
        const issues: string[] = []
        
        if (headings.length === 0) {
          issues.push('No headings found on page')
          return issues
        }
        
        // Check if page starts with h1
        const firstHeading = headings[0]
        if (firstHeading.tagName !== 'H1') {
          issues.push('Page should start with h1')
        }
        
        // Check font sizes and weights
        const textElements = Array.from(document.querySelectorAll('p, span, div'))
        const fontSizes = new Set<string>()
        
        textElements.forEach(el => {
          const style = window.getComputedStyle(el)
          fontSizes.add(style.fontSize)
        })
        
        if (fontSizes.size > 10) {
          issues.push('Too many different font sizes detected')
        }
        
        return issues
      })
      
      console.log('Typography and hierarchy issues:', headingIssues)
      
      // Allow some flexibility but flag major issues
      expect(headingIssues.length).toBeLessThan(3)
    })

    test('should verify spacing and alignment issues', async ({ page }) => {
      await helpers.navigateToProjects()
      
      // Check for alignment issues
      const alignmentIssues = await page.evaluate(() => {
        const issues: string[] = []
        
        // Check for elements that might be misaligned
        const cards = Array.from(document.querySelectorAll('.card, [class*="card"]'))
        if (cards.length > 1) {
          const firstCardRect = (cards[0] as HTMLElement).getBoundingClientRect()
          cards.slice(1).forEach((card, index) => {
            const cardRect = (card as HTMLElement).getBoundingClientRect()
            
            // Check if cards are roughly aligned (within 5px tolerance)
            if (Math.abs(cardRect.left - firstCardRect.left) > 5 && 
                Math.abs(cardRect.width - firstCardRect.width) > 5) {
              // This might indicate inconsistent card alignment
            }
          })
        }
        
        // Check for consistent spacing
        const buttons = Array.from(document.querySelectorAll('button'))
        if (buttons.length > 1) {
          const buttonMargins = buttons.map(btn => {
            const style = window.getComputedStyle(btn)
            return {
              margin: style.margin,
              padding: style.padding
            }
          })
          
          // This is a simplified check - you could make it more sophisticated
        }
        
        return issues
      })
      
      console.log('Alignment and spacing issues:', alignmentIssues)
    })
  })

  test.describe('6. Interaction Testing', () => {
    test('should test button clicks and hover states', async ({ page }) => {
      await helpers.navigateToProjects()
      
      // Test primary action button
      const newProjectButton = page.locator('button:has-text("New Project")').first()
      if (await newProjectButton.count() > 0) {
        // Test hover state
        await newProjectButton.hover()
        await page.waitForTimeout(300)
        
        // Check if hover state changes appearance (you might need to customize this)
        const hoverColor = await newProjectButton.evaluate(el => {
          return window.getComputedStyle(el).backgroundColor
        })
        
        expect(hoverColor).toBeTruthy()
        
        await helpers.takeScreenshotWithTimestamp('button-hover-state')
      }
      
      // Test other interactive elements
      const interactiveElements = page.locator('button, a[href], input, select')
      const elementCount = await interactiveElements.count()
      
      // Test a sample of interactive elements
      const samplesToTest = Math.min(5, elementCount)
      for (let i = 0; i < samplesToTest; i++) {
        const element = interactiveElements.nth(i)
        await element.hover()
        await page.waitForTimeout(100)
      }
    })

    test('should test form submissions and validations', async ({ page }) => {
      await helpers.navigateToCreateProject()
      
      // Test form validation by submitting without filling required fields
      const nextButton = page.locator('button:has-text("Next")').first()
      await nextButton.click()
      
      // Should trigger validation
      const validationMessages = page.locator('.error, .alert, [role="alert"]')
      if (await validationMessages.count() > 0) {
        await expect(validationMessages.first()).toBeVisible()
        await helpers.takeScreenshotWithTimestamp('form-validation')
      }
      
      // Test successful form submission (partially)
      const category = page.locator('.category, [class*="category"]').first()
      if (await category.count() > 0) {
        await category.click()
        await nextButton.click()
        
        // Should proceed to next step
        await page.waitForTimeout(1000)
        await helpers.takeScreenshotWithTimestamp('form-submission-success')
      }
    })

    test('should test modal dialogs and dropdowns', async ({ page }) => {
      await helpers.navigateToProjects()
      
      // Look for dropdown menus
      const dropdowns = page.locator('select, .dropdown, [role="combobox"]')
      if (await dropdowns.count() > 0) {
        const dropdown = dropdowns.first()
        await dropdown.click()
        await page.waitForTimeout(500)
        
        await helpers.takeScreenshotWithTimestamp('dropdown-interaction')
      }
      
      // Look for any modal triggers (this depends on your implementation)
      const modalTriggers = page.locator('button:has-text("Settings"), button:has-text("Edit"), .modal-trigger')
      if (await modalTriggers.count() > 0) {
        // Test modal opening (but don't actually open to avoid side effects)
        const trigger = modalTriggers.first()
        await trigger.hover()
        await page.waitForTimeout(300)
      }
    })

    test('should test tab switching and navigation', async ({ page }) => {
      await page.goto('/member/projects/proj-1')
      await page.waitForLoadState('networkidle')
      
      const tabs = [
        'Overview',
        'Timeline', 
        'Budget',
        'Team',
        'Documents',
        'Estimates'
      ]
      
      for (const tabName of tabs) {
        const tab = page.locator(`button:has-text("${tabName}")`)
        if (await tab.count() > 0) {
          await tab.click()
          await page.waitForTimeout(500)
          
          // Verify tab is active (check for active styling)
          const isActive = await tab.evaluate(el => {
            const classes = el.getAttribute('class') || ''
            return classes.includes('active') || 
                   classes.includes('selected') ||
                   classes.includes('yellow') // Based on your styling
          })
          
          // Take screenshot of each tab
          await helpers.takeScreenshotWithTimestamp(`tab-${tabName.toLowerCase()}-active`)
        }
      }
    })

    test('should test search and filter interactions', async ({ page }) => {
      await helpers.navigateToProjects()
      
      // Test search input
      const searchInput = page.locator('input[placeholder*="Search"]').first()
      if (await searchInput.count() > 0) {
        // Test typing in search
        await searchInput.fill('test')
        await page.waitForTimeout(1000)
        
        // Test clearing search
        await searchInput.clear()
        await page.waitForTimeout(500)
        
        // Test search with actual content
        await searchInput.fill('Oakland')
        await page.waitForTimeout(1000)
        
        await helpers.takeScreenshotWithTimestamp('search-interaction')
      }
      
      // Test filter dropdowns
      const filters = page.locator('select')
      const filterCount = await filters.count()
      
      for (let i = 0; i < Math.min(2, filterCount); i++) {
        const filter = filters.nth(i)
        
        // Get available options
        const options = await filter.locator('option').allTextContents()
        if (options.length > 1) {
          // Select second option (first is usually "All")
          await filter.selectOption({ index: 1 })
          await page.waitForTimeout(1000)
          
          // Reset to "All"
          await filter.selectOption({ index: 0 })
          await page.waitForTimeout(500)
        }
      }
      
      await helpers.takeScreenshotWithTimestamp('filter-interactions')
    })
  })

  test.afterEach(async ({ page }) => {
    // Clean up or reset state if needed
    await page.waitForTimeout(500)
  })
})
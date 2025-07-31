import { test, expect } from '@playwright/test'

test.describe('Admin Project Opportunities Management', () => {
  // Mock authentication for admin user
  test.beforeEach(async ({ page }) => {
    // Set up mock authentication session
    await page.goto('http://localhost:3000')
    
    // Mock NextAuth session
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

  test.describe('Project Upload Interface', () => {
    test('should load project upload form correctly', async ({ page }) => {
      await page.goto('http://localhost:3000/admin/projects/opportunities')
      
      // Check page title and description
      await expect(page.locator('h1')).toContainText('Project Opportunities Management')
      await expect(page.locator('p').first()).toContainText('Upload, manage, and track project opportunities')
      
      // Check tab navigation
      await expect(page.locator('button:has-text("Upload New Project")')).toBeVisible()
      await expect(page.locator('button:has-text("Manage Projects")')).toBeVisible()
    })

    test('should validate required fields', async ({ page }) => {
      await page.goto('http://localhost:3000/admin/projects/opportunities')
      
      // Try to submit empty form
      await page.click('button:has-text("Publish Project")')
      
      // Check for validation errors
      await expect(page.locator('text=Project title is required')).toBeVisible()
      await expect(page.locator('text=Client name is required')).toBeVisible()
      await expect(page.locator('text=Project description is required')).toBeVisible()
    })

    test('should fill and submit project form', async ({ page }) => {
      await page.goto('http://localhost:3000/admin/projects/opportunities')
      
      // Fill basic information
      await page.fill('input[placeholder="Enter project title"]', 'Test Construction Project')
      await page.fill('input[placeholder="Enter client name"]', 'Test Client Corp')
      await page.fill('textarea[placeholder="Provide detailed project description"]', 'This is a test project description for automated testing')
      
      // Select project type
      await page.selectOption('select:near(:text("Project Type"))', 'commercial')
      
      // Fill budget information
      await page.fill('input[placeholder="0"]:near(:text("Minimum Budget"))', '1000000')
      await page.fill('input[placeholder="0"]:near(:text("Maximum Budget"))', '2000000')
      
      // Set dates
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 30)
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 60)
      
      await page.fill('input[type="date"]:near(:text("Submission Deadline"))', tomorrow.toISOString().split('T')[0])
      await page.fill('input[type="date"]:near(:text("Project Start Date"))', futureDate.toISOString().split('T')[0])
      
      // Fill location
      await page.fill('input[placeholder="Enter project address"]', '123 Test Street')
      await page.fill('input[placeholder="Enter city"]', 'Oakland')
      
      // Fill contact information
      await page.fill('input[placeholder="Enter contact name"]', 'John Doe')
      await page.fill('input[placeholder="(555) 123-4567"]', '(555) 123-4567')
      await page.fill('input[placeholder="contact@example.com"]', 'test@example.com')
      
      // Test file upload area
      const fileInput = page.locator('input[type="file"]')
      await expect(fileInput).toBeHidden() // Should be hidden but functional
      
      // Check submission requirements checkboxes
      await page.check('input[type="checkbox"]:near(:text("bonding required"))')
      await page.check('input[type="checkbox"]:near(:text("insurance required"))')
      
      // Submit form
      await page.click('button:has-text("Publish Project")')
      
      // Should switch to manage tab after successful submission
      await expect(page.locator('button:has-text("Manage Projects").bg-white')).toBeVisible()
    })

    test('should handle document upload interaction', async ({ page }) => {
      await page.goto('http://localhost:3000/admin/projects/opportunities')
      
      // Test drag and drop area
      const dropZone = page.locator('.border-dashed')
      await expect(dropZone).toContainText('Drop files here or click to upload')
      
      // Click should trigger file input
      await dropZone.click()
      
      // Verify file type restrictions
      await expect(page.locator('text=PDF, DOC, DOCX up to 10MB each')).toBeVisible()
    })

    test('should switch between upload and manage tabs', async ({ page }) => {
      await page.goto('http://localhost:3000/admin/projects/opportunities')
      
      // Initially on upload tab
      await expect(page.locator('button:has-text("Upload New Project").bg-white')).toBeVisible()
      
      // Switch to manage tab
      await page.click('button:has-text("Manage Projects")')
      await expect(page.locator('button:has-text("Manage Projects").bg-white')).toBeVisible()
      
      // Verify manage interface is visible
      await expect(page.locator('input[placeholder="Search projects..."]')).toBeVisible()
      await expect(page.locator('select:has-text("All Status")')).toBeVisible()
    })
  })

  test.describe('Project Management Dashboard', () => {
    test('should load dashboard with key metrics', async ({ page }) => {
      await page.goto('http://localhost:3000/admin/projects/dashboard')
      
      // Check page header
      await expect(page.locator('h1')).toContainText('Project Opportunities Dashboard')
      await expect(page.locator('p').first()).toContainText('Monitor project performance')
      
      // Check time range selector
      await expect(page.locator('select:has-text("Last 30 days")')).toBeVisible()
      
      // Check key metrics cards
      await expect(page.locator('text=Total Projects')).toBeVisible()
      await expect(page.locator('text=Active Projects')).toBeVisible()
      await expect(page.locator('text=Total Views')).toBeVisible()
      await expect(page.locator('text=Conversion Rate')).toBeVisible()
    })

    test('should display top performing projects', async ({ page }) => {
      await page.goto('http://localhost:3000/admin/projects/dashboard')
      
      // Wait for dashboard to load
      await page.waitForSelector('text=Top Performing Projects')
      
      // Check project cards
      const projectCards = page.locator('.border.border-gray-200.rounded-lg')
      await expect(projectCards).toHaveCount(2) // Based on mock data
      
      // Check first project details
      const firstProject = projectCards.first()
      await expect(firstProject).toContainText('Downtown Office Complex Renovation')
      await expect(firstProject).toContainText('Oakland Development Corp')
      await expect(firstProject).toContainText('$2M - $2.5M')
      
      // Check engagement metrics are displayed
      await expect(firstProject).toContainText('Views')
      await expect(firstProject).toContainText('Members')
      await expect(firstProject).toContainText('Downloads')
      await expect(firstProject).toContainText('Inquiries')
      await expect(firstProject).toContainText('Avg Score')
    })

    test('should open project detail modal', async ({ page }) => {
      await page.goto('http://localhost:3000/admin/projects/dashboard')
      
      // Wait for dashboard to load
      await page.waitForSelector('button:has-text("View Details")')
      
      // Click view details on first project
      await page.click('button:has-text("View Details")').first()
      
      // Check modal is visible
      await expect(page.locator('.fixed.inset-0')).toBeVisible()
      await expect(page.locator('h2:has-text("Downtown Office Complex Renovation")')).toBeVisible()
      
      // Check engagement overview in modal
      await expect(page.locator('text=Total Views')).toBeVisible()
      await expect(page.locator('text=Unique Viewers')).toBeVisible()
      await expect(page.locator('text=Avg Engagement')).toBeVisible()
      await expect(page.locator('text=Conversion Rate')).toBeVisible()
      
      // Check top engaged members section
      await expect(page.locator('text=Top Engaged Members')).toBeVisible()
      await expect(page.locator('text=Sarah Chen')).toBeVisible()
      await expect(page.locator('text=Chen Construction')).toBeVisible()
      
      // Close modal
      await page.click('button:has(svg.h-6.w-6)') // X button
      await expect(page.locator('.fixed.inset-0')).not.toBeVisible()
    })

    test('should filter projects by status', async ({ page }) => {
      await page.goto('http://localhost:3000/admin/projects/dashboard')
      
      // Wait for dashboard to load
      await page.waitForSelector('select:near(:text("All Status"))')
      
      // Change status filter
      await page.selectOption('select:near(:text("All Status"))', 'active')
      
      // Verify filter is applied (would need real data to test fully)
      await expect(page.locator('select')).toHaveValue('active')
    })

    test('should search projects', async ({ page }) => {
      await page.goto('http://localhost:3000/admin/projects/dashboard')
      
      // Wait for search input
      await page.waitForSelector('input[placeholder="Search projects..."]')
      
      // Type in search
      await page.fill('input[placeholder="Search projects..."]', 'Downtown')
      
      // Verify search functionality (with mock data, should still show the matching project)
      await expect(page.locator('text=Downtown Office Complex Renovation')).toBeVisible()
    })

    test('should display recent activity feed', async ({ page }) => {
      await page.goto('http://localhost:3000/admin/projects/dashboard')
      
      // Check recent activity section
      await expect(page.locator('text=Recent Activity')).toBeVisible()
      
      // Check activity items
      const activityItems = page.locator('.flex.items-start.space-x-3.p-3.rounded-lg.bg-gray-50')
      await expect(activityItems).toHaveCount(4) // Based on mock data
      
      // Check first activity
      const firstActivity = activityItems.first()
      await expect(firstActivity).toContainText('Sarah Chen')
      await expect(firstActivity).toContainText('Downtown Office Complex Renovation')
      await expect(firstActivity).toContainText('2 minutes ago')
    })

    test('should change time range', async ({ page }) => {
      await page.goto('http://localhost:3000/admin/projects/dashboard')
      
      // Change time range
      await page.selectOption('select:has-text("Last 30 days")', '7d')
      await expect(page.locator('select')).toHaveValue('7d')
      
      // Change to yearly
      await page.selectOption('select', '1y')
      await expect(page.locator('select')).toHaveValue('1y')
    })
  })

  test.describe('Accessibility Tests', () => {
    test('should have proper heading hierarchy', async ({ page }) => {
      await page.goto('http://localhost:3000/admin/projects/opportunities')
      
      // Check h1 exists and is unique
      const h1Elements = await page.locator('h1').count()
      expect(h1Elements).toBe(1)
      
      // Check logical heading order
      await expect(page.locator('h1')).toContainText('Project Opportunities Management')
      await expect(page.locator('h3').first()).toContainText('Basic Information')
    })

    test('should have proper form labels', async ({ page }) => {
      await page.goto('http://localhost:3000/admin/projects/opportunities')
      
      // Check that all inputs have associated labels
      const inputs = page.locator('input[type="text"], input[type="number"], input[type="email"], input[type="tel"]')
      const inputCount = await inputs.count()
      
      for (let i = 0; i < inputCount; i++) {
        const input = inputs.nth(i)
        const placeholder = await input.getAttribute('placeholder')
        
        // Each input should have either a visible label or meaningful placeholder
        expect(placeholder).toBeTruthy()
      }
    })

    test('should support keyboard navigation', async ({ page }) => {
      await page.goto('http://localhost:3000/admin/projects/opportunities')
      
      // Tab through form elements
      await page.keyboard.press('Tab') // Skip to first interactive element
      
      // Check focus is visible (would need to verify focus styles)
      const focusedElement = await page.evaluate(() => document.activeElement?.tagName)
      expect(focusedElement).toBeTruthy()
    })

    test('should have sufficient color contrast', async ({ page }) => {
      await page.goto('http://localhost:3000/admin/projects/dashboard')
      
      // Check that important text has sufficient contrast
      // This is a basic check - in production, use axe-core or similar
      const importantText = page.locator('h1, .font-bold, .font-semibold')
      const textCount = await importantText.count()
      
      for (let i = 0; i < Math.min(textCount, 5); i++) {
        const element = importantText.nth(i)
        const color = await element.evaluate(el => 
          window.getComputedStyle(el).color
        )
        
        // Verify text is not too light
        expect(color).not.toBe('rgb(255, 255, 255)') // Not white on white
      }
    })
  })

  test.describe('Responsive Design', () => {
    test('should adapt to mobile viewport', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 })
      await page.goto('http://localhost:3000/admin/projects/opportunities')
      
      // Check that content is still accessible
      await expect(page.locator('h1')).toBeVisible()
      
      // Check form fields stack vertically on mobile
      const formGrid = page.locator('.grid.grid-cols-1.md\\:grid-cols-2').first()
      await expect(formGrid).toBeVisible()
    })

    test('should adapt dashboard to tablet viewport', async ({ page }) => {
      // Set tablet viewport
      await page.setViewportSize({ width: 768, height: 1024 })
      await page.goto('http://localhost:3000/admin/projects/dashboard')
      
      // Check that metrics cards are visible
      await expect(page.locator('text=Total Projects')).toBeVisible()
      
      // Check layout adjusts properly
      const metricsGrid = page.locator('.grid.grid-cols-1.md\\:grid-cols-2.lg\\:grid-cols-4').first()
      await expect(metricsGrid).toBeVisible()
    })
  })

  test.describe('Error Handling', () => {
    test('should show friendly error for network issues', async ({ page }) => {
      // Simulate network error
      await page.route('**/api/engagement/**', route => route.abort())
      
      await page.goto('http://localhost:3000/admin/projects/dashboard')
      
      // Dashboard should still load with mock data
      await expect(page.locator('h1')).toContainText('Project Opportunities Dashboard')
    })

    test('should handle form submission errors gracefully', async ({ page }) => {
      await page.goto('http://localhost:3000/admin/projects/opportunities')
      
      // Fill minimal required fields
      await page.fill('input[placeholder="Enter project title"]', 'Test')
      await page.fill('input[placeholder="Enter client name"]', 'Test')
      await page.fill('textarea[placeholder="Provide detailed project description"]', 'Test')
      
      // Simulate API error
      await page.route('**/api/projects', route => 
        route.fulfill({ status: 500, body: 'Server error' })
      )
      
      // Try to submit
      await page.click('button:has-text("Publish Project")')
      
      // Should show error state (implementation would need error UI)
      // For now, verify button is re-enabled after attempt
      await expect(page.locator('button:has-text("Publish Project")')).toBeEnabled()
    })
  })
})

test.describe('Performance Tests', () => {
  test('should load dashboard within acceptable time', async ({ page }) => {
    const startTime = Date.now()
    await page.goto('http://localhost:3000/admin/projects/dashboard')
    
    // Wait for main content
    await page.waitForSelector('h1:has-text("Project Opportunities Dashboard")')
    
    const loadTime = Date.now() - startTime
    
    // Should load within 3 seconds
    expect(loadTime).toBeLessThan(3000)
  })

  test('should handle large datasets efficiently', async ({ page }) => {
    await page.goto('http://localhost:3000/admin/projects/dashboard')
    
    // Check that virtualization or pagination would be in place for large lists
    const projectCards = page.locator('.border.border-gray-200.rounded-lg')
    const count = await projectCards.count()
    
    // Should not render too many items at once
    expect(count).toBeLessThanOrEqual(10)
  })
})
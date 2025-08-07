import { test, expect, devices } from '@playwright/test'

test.describe('Mobile UX Tests', () => {
  test.describe('iPhone 13 Pro', () => {
    test.use({ ...devices['iPhone 13 Pro'] })

    test('should have responsive navigation on mobile', async ({ page }) => {
      await page.goto('/member/dashboard')
      
      // Check mobile navigation menu
      await expect(page.locator('[data-testid="mobile-menu-button"]')).toBeVisible()
      await expect(page.locator('[data-testid="desktop-navigation"]')).not.toBeVisible()
      
      // Open mobile menu
      await page.click('[data-testid="mobile-menu-button"]')
      await expect(page.locator('[data-testid="mobile-menu-overlay"]')).toBeVisible()
      
      // Check navigation items are accessible
      await expect(page.locator('[data-testid="nav-tools"]')).toBeVisible()
      await expect(page.locator('[data-testid="nav-projects"]')).toBeVisible()
      await expect(page.locator('[data-testid="nav-cost-estimator"]')).toBeVisible()
      
      // Close menu by tapping outside
      await page.click('[data-testid="mobile-menu-overlay"]', { position: { x: 50, y: 50 } })
      await expect(page.locator('[data-testid="mobile-menu-overlay"]')).not.toBeVisible()
    })

    test('should optimize camera AI interface for mobile', async ({ page }) => {
      await page.goto('/member/project-intelligence/camera')
      
      // Check mobile camera controls
      await expect(page.locator('[data-testid="mobile-camera-controls"]')).toBeVisible()
      await expect(page.locator('[data-testid="capture-button"]')).toHaveCSS('min-height', '44px')
      
      // Test touch gestures for camera
      const cameraView = page.locator('[data-testid="camera-viewport"]')
      
      // Pinch to zoom (simulated)
      await cameraView.touchscreen.tap(200, 200)
      await page.evaluate(() => {
        const event = new TouchEvent('touchstart', {
          touches: [
            { clientX: 150, clientY: 150, identifier: 0 },
            { clientX: 250, clientY: 250, identifier: 1 }
          ]
        })
        document.dispatchEvent(event)
      })
      
      // Check AI analysis overlay is mobile-optimized
      await page.click('[data-testid="capture-button"]')
      await expect(page.locator('[data-testid="mobile-analysis-overlay"]')).toBeVisible()
      
      // Check text is readable on mobile
      const analysisText = page.locator('[data-testid="material-identification"]')
      await expect(analysisText).toHaveCSS('font-size', /^(14px|16px|18px)$/)
    })

    test('should handle tool reservation on mobile', async ({ page }) => {
      await page.goto('/member/tools')
      
      // Check tool cards are mobile-optimized
      const toolCard = page.locator('[data-testid="tool-card"]').first()
      await expect(toolCard).toBeVisible()
      
      // Check touch targets are large enough (44px minimum)
      const reserveButton = toolCard.locator('[data-testid="reserve-button"]')
      const buttonBox = await reserveButton.boundingBox()
      expect(buttonBox?.height).toBeGreaterThanOrEqual(44)
      expect(buttonBox?.width).toBeGreaterThanOrEqual(44)
      
      // Test swipe gestures on tool list
      await page.touchscreen.tap(200, 300)
      await page.touchscreen.tap(200, 200) // Swipe up
      
      // Open reservation modal
      await page.click('[data-testid="reserve-button"]')
      await expect(page.locator('[data-testid="reservation-modal"]')).toBeVisible()
      
      // Check modal is full-screen on mobile
      const modal = page.locator('[data-testid="reservation-modal"]')
      const modalBox = await modal.boundingBox()
      const viewport = page.viewportSize()
      
      expect(modalBox?.width).toBeCloseTo(viewport?.width || 0, 10)
      expect(modalBox?.height).toBeCloseTo(viewport?.height || 0, 50)
    })

    test('should optimize forms for mobile input', async ({ page }) => {
      await page.goto('/member/cost-estimator')
      
      // Check form inputs are mobile-friendly
      const projectNameInput = page.locator('[data-testid="project-name-input"]')
      await expect(projectNameInput).toHaveAttribute('autocomplete', 'off')
      await expect(projectNameInput).toHaveCSS('font-size', /^(16px|18px)$/) // Prevent zoom on iOS
      
      // Check number inputs have proper keyboard
      const squareFootageInput = page.locator('[data-testid="square-footage-input"]')
      await expect(squareFootageInput).toHaveAttribute('inputmode', 'numeric')
      
      // Test form submission on mobile
      await projectNameInput.fill('Mobile Test Project')
      await page.selectOption('[data-testid="project-type-select"]', 'residential')
      await squareFootageInput.fill('1200')
      
      // Check submit button is accessible
      const submitButton = page.locator('[data-testid="generate-estimate-button"]')
      const submitBox = await submitButton.boundingBox()
      expect(submitBox?.height).toBeGreaterThanOrEqual(44)
      
      await submitButton.click()
      await expect(page.locator('[data-testid="estimate-loading"]')).toBeVisible()
    })

    test('should handle OCR business card scanning on mobile', async ({ page }) => {
      await page.goto('/member/scanner')
      
      // Check camera access button
      const cameraButton = page.locator('[data-testid="camera-scan-button"]')
      await expect(cameraButton).toBeVisible()
      
      // Check file upload option for mobile
      const uploadButton = page.locator('[data-testid="upload-card-button"]')
      await expect(uploadButton).toBeVisible()
      
      // Test file upload
      const fileInput = page.locator('[data-testid="card-file-input"]')
      await fileInput.setInputFiles('tests/fixtures/business-card.jpg')
      
      // Check processing indicator
      await expect(page.locator('[data-testid="processing-indicator"]')).toBeVisible()
      
      // Check results are mobile-optimized
      await expect(page.locator('[data-testid="ocr-results-mobile"]')).toBeVisible()
      
      // Check edit form is touch-friendly
      const editButton = page.locator('[data-testid="edit-contact-button"]')
      await editButton.click()
      
      const editForm = page.locator('[data-testid="contact-edit-form"]')
      await expect(editForm).toBeVisible()
      
      // Check form fields are properly sized
      const nameInput = editForm.locator('[data-testid="first-name-input"]')
      await expect(nameInput).toHaveCSS('min-height', '44px')
    })
  })

  test.describe('iPad Pro', () => {
    test.use({ ...devices['iPad Pro'] })

    test('should adapt layout for tablet view', async ({ page }) => {
      await page.goto('/member/dashboard')
      
      // Check tablet-specific layout
      await expect(page.locator('[data-testid="tablet-sidebar"]')).toBeVisible()
      await expect(page.locator('[data-testid="mobile-menu-button"]')).not.toBeVisible()
      
      // Check grid layout adapts to tablet
      const projectGrid = page.locator('[data-testid="projects-grid"]')
      await expect(projectGrid).toHaveCSS('grid-template-columns', /repeat\(2,/)
    })

    test('should optimize camera interface for tablet', async ({ page }) => {
      await page.goto('/member/project-intelligence/camera')
      
      // Check tablet camera layout
      await expect(page.locator('[data-testid="tablet-camera-layout"]')).toBeVisible()
      
      // Check side panel for analysis results
      await expect(page.locator('[data-testid="analysis-side-panel"]')).toBeVisible()
      
      // Test landscape orientation
      await page.setViewportSize({ width: 1366, height: 1024 })
      await expect(page.locator('[data-testid="landscape-camera-view"]')).toBeVisible()
    })
  })

  test.describe('Android Phone', () => {
    test.use({ ...devices['Pixel 5'] })

    test('should handle Android-specific interactions', async ({ page }) => {
      await page.goto('/member/tools')
      
      // Test Android back button behavior
      await page.click('[data-testid="tool-card"]')
      await expect(page.locator('[data-testid="tool-details"]')).toBeVisible()
      
      // Simulate Android back button
      await page.goBack()
      await expect(page.locator('[data-testid="tool-details"]')).not.toBeVisible()
      
      // Test pull-to-refresh
      await page.touchscreen.tap(200, 100)
      await page.touchscreen.tap(200, 300) // Pull down gesture
      await expect(page.locator('[data-testid="refresh-indicator"]')).toBeVisible()
    })

    test('should optimize for Android keyboard', async ({ page }) => {
      await page.goto('/member/cost-estimator')
      
      // Check Android-specific input attributes
      const emailInput = page.locator('[data-testid="contact-email-input"]')
      if (await emailInput.count() > 0) {
        await expect(emailInput).toHaveAttribute('inputmode', 'email')
      }
      
      // Check number inputs
      const budgetInput = page.locator('[data-testid="budget-input"]')
      if (await budgetInput.count() > 0) {
        await expect(budgetInput).toHaveAttribute('inputmode', 'decimal')
      }
    })
  })

  test.describe('Cross-Device Functionality', () => {
    test('should maintain session across device switches', async ({ page, context }) => {
      // Start on mobile
      await page.setViewportSize({ width: 375, height: 667 })
      await page.goto('/auth/signin')
      
      // Login
      await page.fill('[data-testid="email"]', 'mobile@test.com')
      await page.fill('[data-testid="password"]', 'TestPassword123!')
      await page.click('[data-testid="signin-button"]')
      
      await expect(page).toHaveURL('/member/dashboard')
      
      // Switch to tablet view
      await page.setViewportSize({ width: 1024, height: 768 })
      await page.reload()
      
      // Should still be logged in
      await expect(page).toHaveURL('/member/dashboard')
      await expect(page.locator('[data-testid="user-profile"]')).toBeVisible()
    })

    test('should sync data across viewport changes', async ({ page }) => {
      await page.goto('/member/cost-estimator')
      
      // Fill form on mobile
      await page.setViewportSize({ width: 375, height: 667 })
      await page.fill('[data-testid="project-name-input"]', 'Cross-device Project')
      await page.selectOption('[data-testid="project-type-select"]', 'commercial')
      
      // Switch to desktop
      await page.setViewportSize({ width: 1920, height: 1080 })
      
      // Data should be preserved
      await expect(page.locator('[data-testid="project-name-input"]')).toHaveValue('Cross-device Project')
      await expect(page.locator('[data-testid="project-type-select"]')).toHaveValue('commercial')
    })

    test('should handle orientation changes', async ({ page }) => {
      // Start in portrait
      await page.setViewportSize({ width: 375, height: 667 })
      await page.goto('/member/project-intelligence/camera')
      
      await expect(page.locator('[data-testid="portrait-camera-view"]')).toBeVisible()
      
      // Switch to landscape
      await page.setViewportSize({ width: 667, height: 375 })
      
      await expect(page.locator('[data-testid="landscape-camera-view"]')).toBeVisible()
      
      // Check controls are still accessible
      await expect(page.locator('[data-testid="capture-button"]')).toBeVisible()
      await expect(page.locator('[data-testid="settings-button"]')).toBeVisible()
    })
  })

  test.describe('Performance on Mobile', () => {
    test('should load quickly on mobile networks', async ({ page }) => {
      // Simulate slow 3G
      await page.route('**/*', route => {
        setTimeout(() => route.continue(), 100) // Add 100ms delay
      })
      
      const startTime = Date.now()
      await page.goto('/member/dashboard')
      await page.waitForLoadState('networkidle')
      const loadTime = Date.now() - startTime
      
      // Should load within 5 seconds on slow connection
      expect(loadTime).toBeLessThan(5000)
      
      // Check critical content is visible
      await expect(page.locator('[data-testid="dashboard-header"]')).toBeVisible()
      await expect(page.locator('[data-testid="quick-actions"]')).toBeVisible()
    })

    test('should handle offline scenarios', async ({ page }) => {
      await page.goto('/member/dashboard')
      
      // Go offline
      await page.context().setOffline(true)
      
      // Check offline indicator
      await expect(page.locator('[data-testid="offline-indicator"]')).toBeVisible()
      
      // Check cached content is still available
      await expect(page.locator('[data-testid="dashboard-content"]')).toBeVisible()
      
      // Try to navigate - should show offline message
      await page.click('[data-testid="nav-tools"]')
      await expect(page.locator('[data-testid="offline-message"]')).toBeVisible()
      
      // Go back online
      await page.context().setOffline(false)
      await page.reload()
      
      await expect(page.locator('[data-testid="offline-indicator"]')).not.toBeVisible()
    })
  })
})
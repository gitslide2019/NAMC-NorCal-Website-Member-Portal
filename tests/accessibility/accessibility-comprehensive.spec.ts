import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

test.describe('Comprehensive Accessibility Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Setup accessibility testing environment
    await page.goto('/member/dashboard')
    await page.waitForLoadState('networkidle')
  })

  test('should pass WCAG 2.1 AA compliance on member dashboard', async ({ page }) => {
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze()

    expect(accessibilityScanResults.violations).toEqual([])
  })

  test('should have proper keyboard navigation for tool lending', async ({ page }) => {
    await page.goto('/member/tools')
    
    // Test keyboard navigation through tool catalog
    await page.keyboard.press('Tab')
    await expect(page.locator('[data-testid="search-input"]')).toBeFocused()
    
    await page.keyboard.press('Tab')
    await expect(page.locator('[data-testid="category-filter"]')).toBeFocused()
    
    await page.keyboard.press('Tab')
    await expect(page.locator('[data-testid="first-tool-card"]')).toBeFocused()
    
    // Test Enter key activation
    await page.keyboard.press('Enter')
    await expect(page.locator('[data-testid="tool-details-modal"]')).toBeVisible()
    
    // Test Escape key to close modal
    await page.keyboard.press('Escape')
    await expect(page.locator('[data-testid="tool-details-modal"]')).not.toBeVisible()
  })

  test('should have proper ARIA labels and roles for camera AI interface', async ({ page }) => {
    await page.goto('/member/project-intelligence/camera')
    
    // Check camera controls have proper ARIA labels
    await expect(page.locator('[data-testid="start-camera-button"]')).toHaveAttribute(
      'aria-label', 'Start camera for AI analysis'
    )
    
    await expect(page.locator('[data-testid="capture-frame-button"]')).toHaveAttribute(
      'aria-label', 'Capture frame for analysis'
    )
    
    // Check live region for AI analysis updates
    await expect(page.locator('[data-testid="ai-analysis-live-region"]')).toHaveAttribute(
      'aria-live', 'polite'
    )
    
    // Check video element has proper accessibility attributes
    await expect(page.locator('[data-testid="camera-video"]')).toHaveAttribute(
      'aria-label', 'Live camera feed for construction analysis'
    )
  })

  test('should support screen readers for cost estimation workflow', async ({ page }) => {
    await page.goto('/member/cost-estimator')
    
    // Check form has proper structure
    await expect(page.locator('form[data-testid="cost-estimation-form"]')).toHaveAttribute(
      'role', 'form'
    )
    
    await expect(page.locator('form[data-testid="cost-estimation-form"]')).toHaveAttribute(
      'aria-labelledby', 'cost-estimation-heading'
    )
    
    // Check required fields are properly marked
    await expect(page.locator('[data-testid="project-name-input"]')).toHaveAttribute(
      'aria-required', 'true'
    )
    
    await expect(page.locator('[data-testid="project-type-select"]')).toHaveAttribute(
      'aria-required', 'true'
    )
    
    // Check error messages are associated with fields
    await page.fill('[data-testid="project-name-input"]', '')
    await page.click('[data-testid="generate-estimate-button"]')
    
    await expect(page.locator('[data-testid="project-name-error"]')).toHaveAttribute(
      'role', 'alert'
    )
    
    await expect(page.locator('[data-testid="project-name-input"]')).toHaveAttribute(
      'aria-describedby', 'project-name-error'
    )
  })

  test('should have proper color contrast ratios', async ({ page }) => {
    await page.goto('/member/dashboard')
    
    const contrastResults = await new AxeBuilder({ page })
      .withTags(['color-contrast'])
      .analyze()
    
    expect(contrastResults.violations).toEqual([])
    
    // Test specific high-contrast elements
    const primaryButton = page.locator('[data-testid="primary-action-button"]')
    const buttonStyles = await primaryButton.evaluate(el => {
      const styles = window.getComputedStyle(el)
      return {
        backgroundColor: styles.backgroundColor,
        color: styles.color
      }
    })
    
    // Verify NAMC brand colors meet contrast requirements
    expect(buttonStyles.backgroundColor).toBe('rgb(255, 215, 0)') // NAMC Yellow
    expect(buttonStyles.color).toBe('rgb(26, 26, 26)') // NAMC Black
  })

  test('should support high contrast mode', async ({ page }) => {
    // Enable high contrast mode
    await page.emulateMedia({ colorScheme: 'dark', forcedColors: 'active' })
    await page.goto('/member/dashboard')
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['color-contrast'])
      .analyze()
    
    expect(accessibilityScanResults.violations).toEqual([])
    
    // Verify forced colors are respected
    const cardElement = page.locator('[data-testid="project-card"]').first()
    const cardStyles = await cardElement.evaluate(el => {
      const styles = window.getComputedStyle(el)
      return {
        backgroundColor: styles.backgroundColor,
        borderColor: styles.borderColor
      }
    })
    
    // In forced colors mode, should use system colors
    expect(cardStyles.backgroundColor).not.toBe('rgb(255, 255, 255)')
  })

  test('should handle focus management in modals and overlays', async ({ page }) => {
    await page.goto('/member/tools')
    
    // Open tool details modal
    await page.click('[data-testid="first-tool-card"]')
    await expect(page.locator('[data-testid="tool-details-modal"]')).toBeVisible()
    
    // Focus should be trapped within modal
    const modalCloseButton = page.locator('[data-testid="modal-close-button"]')
    const modalReserveButton = page.locator('[data-testid="modal-reserve-button"]')
    
    await expect(modalCloseButton).toBeFocused()
    
    // Tab should cycle within modal
    await page.keyboard.press('Tab')
    await expect(modalReserveButton).toBeFocused()
    
    await page.keyboard.press('Tab')
    await expect(modalCloseButton).toBeFocused()
    
    // Shift+Tab should reverse cycle
    await page.keyboard.press('Shift+Tab')
    await expect(modalReserveButton).toBeFocused()
    
    // Close modal and verify focus returns
    await page.keyboard.press('Escape')
    await expect(page.locator('[data-testid="tool-details-modal"]')).not.toBeVisible()
    await expect(page.locator('[data-testid="first-tool-card"]')).toBeFocused()
  })

  test('should provide alternative text for images and media', async ({ page }) => {
    await page.goto('/member/dashboard')
    
    // Check all images have alt text
    const images = page.locator('img')
    const imageCount = await images.count()
    
    for (let i = 0; i < imageCount; i++) {
      const image = images.nth(i)
      const altText = await image.getAttribute('alt')
      const ariaLabel = await image.getAttribute('aria-label')
      const ariaLabelledBy = await image.getAttribute('aria-labelledby')
      
      // Image should have alt text, aria-label, or aria-labelledby
      expect(altText || ariaLabel || ariaLabelledBy).toBeTruthy()
    }
    
    // Check video elements have captions or descriptions
    const videos = page.locator('video')
    const videoCount = await videos.count()
    
    for (let i = 0; i < videoCount; i++) {
      const video = videos.nth(i)
      const hasTrack = await video.locator('track').count() > 0
      const ariaLabel = await video.getAttribute('aria-label')
      const ariaDescribedBy = await video.getAttribute('aria-describedby')
      
      expect(hasTrack || ariaLabel || ariaDescribedBy).toBeTruthy()
    }
  })

  test('should support voice control and speech recognition', async ({ page }) => {
    await page.goto('/member/project-intelligence/camera')
    
    // Check for voice control attributes
    await expect(page.locator('[data-testid="voice-capture-button"]')).toHaveAttribute(
      'aria-label', 'Activate voice control for hands-free operation'
    )
    
    // Test voice commands (mocked)
    await page.evaluate(() => {
      // Mock speech recognition
      window.mockSpeechRecognition = {
        start: () => {},
        stop: () => {},
        onresult: null
      }
    })
    
    await page.click('[data-testid="voice-capture-button"]')
    
    // Simulate voice command
    await page.evaluate(() => {
      const event = new CustomEvent('voicecommand', {
        detail: { command: 'capture frame' }
      })
      document.dispatchEvent(event)
    })
    
    // Verify voice command was processed
    await expect(page.locator('[data-testid="voice-feedback"]')).toContainText(
      'Voice command recognized: capture frame'
    )
  })

  test('should handle reduced motion preferences', async ({ page }) => {
    // Set reduced motion preference
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/member/dashboard')
    
    // Check that animations are disabled or reduced
    const animatedElement = page.locator('[data-testid="animated-chart"]')
    const animationDuration = await animatedElement.evaluate(el => {
      const styles = window.getComputedStyle(el)
      return styles.animationDuration
    })
    
    // Should have no animation or very short duration
    expect(animationDuration === '0s' || animationDuration === '0.01s').toBeTruthy()
    
    // Check that auto-playing content is paused
    const autoplayVideo = page.locator('video[autoplay]')
    if (await autoplayVideo.count() > 0) {
      const isPaused = await autoplayVideo.evaluate(video => video.paused)
      expect(isPaused).toBeTruthy()
    }
  })

  test('should provide clear error messages and recovery options', async ({ page }) => {
    await page.goto('/member/cost-estimator')
    
    // Trigger validation errors
    await page.click('[data-testid="generate-estimate-button"]')
    
    // Check error messages are descriptive and actionable
    const errorMessage = page.locator('[data-testid="project-name-error"]')
    await expect(errorMessage).toContainText('Project name is required')
    await expect(errorMessage).toHaveAttribute('role', 'alert')
    
    // Check error summary is provided
    const errorSummary = page.locator('[data-testid="form-error-summary"]')
    await expect(errorSummary).toBeVisible()
    await expect(errorSummary).toHaveAttribute('role', 'alert')
    await expect(errorSummary).toContainText('Please fix the following errors')
    
    // Check errors are linked to fields
    const errorLink = errorSummary.locator('a[href="#project-name-input"]')
    await expect(errorLink).toBeVisible()
    
    await errorLink.click()
    await expect(page.locator('[data-testid="project-name-input"]')).toBeFocused()
  })
})
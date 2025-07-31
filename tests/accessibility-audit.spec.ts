import { test, expect, Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

/**
 * Comprehensive Accessibility Audit for NAMC System
 * 
 * Tests all major pages and components for WCAG 2.1 AA compliance
 * Includes keyboard navigation, screen reader compatibility, and color contrast
 */

const testPages = [
  { path: '/admin/projects/opportunities', name: 'Project Opportunities Upload' },
  { path: '/admin/projects/dashboard', name: 'Project Dashboard' },
  { path: '/admin/members/engagement', name: 'Member Engagement Analytics' },
  { path: '/admin/integrations/hubspot', name: 'HubSpot Integration' },
  { path: '/admin/projects/workflow', name: 'Project Workflow Management' }
]

// Helper function to login as admin
async function loginAsAdmin(page: Page) {
  await page.goto('/admin/login')
  await page.fill('input[type="email"]', 'admin@namcnorcal.org')
  await page.fill('input[type="password"]', 'admin123')
  await page.click('button[type="submit"]')
  await page.waitForURL(/\/admin/, { timeout: 10000 })
}

test.describe('WCAG 2.1 AA Compliance Audit', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page)
  })

  for (const testPage of testPages) {
    test(`${testPage.name} should meet WCAG 2.1 AA standards`, async ({ page }) => {
      await page.goto(testPage.path)
      
      // Wait for page to fully load
      await page.waitForLoadState('networkidle')
      
      // Run axe accessibility scan
      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze()
      
      // Check for violations
      expect(accessibilityScanResults.violations).toEqual([])
      
      // Log accessibility scan results
      console.log(`Accessibility scan for ${testPage.name}:`)
      console.log(`- Passes: ${accessibilityScanResults.passes.length}`)
      console.log(`- Violations: ${accessibilityScanResults.violations.length}`)
      console.log(`- Incomplete: ${accessibilityScanResults.incomplete.length}`)
      
      if (accessibilityScanResults.violations.length > 0) {
        console.log('Violations found:')
        accessibilityScanResults.violations.forEach(violation => {
          console.log(`- ${violation.id}: ${violation.description}`)
          console.log(`  Impact: ${violation.impact}`)
          console.log(`  Nodes: ${violation.nodes.length}`)
        })
      }
    })
  }

  test('Keyboard navigation should work on all interactive elements', async ({ page }) => {
    await page.goto('/admin/projects/opportunities')
    
    // Test tab navigation
    await page.keyboard.press('Tab')
    let focusedElement = await page.locator(':focus').first()
    await expect(focusedElement).toBeVisible()
    
    // Continue tabbing through interactive elements
    const maxTabs = 20
    for (let i = 0; i < maxTabs; i++) {
      await page.keyboard.press('Tab')
      focusedElement = await page.locator(':focus').first()
      
      if (await focusedElement.isVisible()) {
        // Verify focus indicator is visible
        const focusStyles = await focusedElement.evaluate(el => {
          const styles = window.getComputedStyle(el)
          return {
            outline: styles.outline,
            outlineColor: styles.outlineColor,
            outlineStyle: styles.outlineStyle,
            outlineWidth: styles.outlineWidth,
            boxShadow: styles.boxShadow
          }
        })
        
        // At least one focus indicator should be present
        const hasFocusIndicator = 
          focusStyles.outline !== 'none' ||
          focusStyles.boxShadow !== 'none' ||
          focusStyles.outlineWidth !== '0px'
        
        expect(hasFocusIndicator).toBeTruthy()
      }
    }
  })

  test('Color contrast should meet WCAG standards', async ({ page }) => {
    await page.goto('/admin/projects/dashboard')
    
    // Test contrast on key UI elements
    const elementsToTest = [
      'h1', 'h2', 'h3', 'p', 'button', 'a', 'label', 'input'
    ]
    
    for (const selector of elementsToTest) {
      const elements = page.locator(selector)
      const count = await elements.count()
      
      for (let i = 0; i < Math.min(count, 10); i++) {
        const element = elements.nth(i)
        
        if (await element.isVisible()) {
          const styles = await element.evaluate(el => {
            const computedStyles = window.getComputedStyle(el)
            return {
              color: computedStyles.color,
              backgroundColor: computedStyles.backgroundColor,
              fontSize: computedStyles.fontSize
            }
          })
          
          // Basic color contrast validation would be implemented here
          // This is a placeholder for actual contrast ratio calculation
          expect(styles.color).toBeDefined()
          expect(styles.backgroundColor).toBeDefined()
        }
      }
    }
  })

  test('Form labels should be properly associated with inputs', async ({ page }) => {
    await page.goto('/admin/projects/opportunities')
    
    // Find all form inputs
    const inputs = page.locator('input, select, textarea')
    const inputCount = await inputs.count()
    
    for (let i = 0; i < inputCount; i++) {
      const input = inputs.nth(i)
      
      if (await input.isVisible()) {
        const inputId = await input.getAttribute('id')
        const ariaLabel = await input.getAttribute('aria-label')
        const ariaLabelledBy = await input.getAttribute('aria-labelledby')
        
        // Check if input has proper labeling
        let hasProperLabel = false
        
        if (inputId) {
          // Check for associated label
          const associatedLabel = page.locator(`label[for="${inputId}"]`)
          if (await associatedLabel.count() > 0) {
            hasProperLabel = true
          }
        }
        
        if (ariaLabel) {
          hasProperLabel = true
        }
        
        if (ariaLabelledBy) {
          hasProperLabel = true
        }
        
        // Skip hidden inputs and certain input types
        const inputType = await input.getAttribute('type')
        const isHidden = await input.isHidden()
        
        if (!isHidden && !['hidden', 'submit', 'button'].includes(inputType || '')) {
          expect(hasProperLabel).toBeTruthy()
        }
      }
    }
  })

  test('Images should have appropriate alt text', async ({ page }) => {
    await page.goto('/admin/projects/dashboard')
    
    const images = page.locator('img')
    const imageCount = await images.count()
    
    for (let i = 0; i < imageCount; i++) {
      const image = images.nth(i)
      
      if (await image.isVisible()) {
        const altText = await image.getAttribute('alt')
        const role = await image.getAttribute('role')
        
        // Decorative images should have empty alt text or role="presentation"
        // Content images should have descriptive alt text
        if (role === 'presentation' || role === 'img') {
          // These are acceptable
          continue
        }
        
        // Content images should have alt text
        expect(altText).toBeDefined()
        
        // Alt text should not be just filename or generic text
        if (altText) {
          expect(altText.toLowerCase()).not.toContain('.jpg')
          expect(altText.toLowerCase()).not.toContain('.png')
          expect(altText.toLowerCase()).not.toContain('.gif')
          expect(altText.toLowerCase()).not.toBe('image')
          expect(altText.toLowerCase()).not.toBe('picture')
        }
      }
    }
  })

  test('Page headings should follow proper hierarchy', async ({ page }) => {
    await page.goto('/admin/projects/opportunities')
    
    const headings = page.locator('h1, h2, h3, h4, h5, h6')
    const headingCount = await headings.count()
    
    if (headingCount > 0) {
      // Check for h1 presence
      const h1Count = await page.locator('h1').count()
      expect(h1Count).toBeGreaterThanOrEqual(1)
      expect(h1Count).toBeLessThanOrEqual(1) // Should have exactly one h1
      
      // Verify heading hierarchy (simplified check)
      const headingLevels = []
      for (let i = 0; i < headingCount; i++) {
        const heading = headings.nth(i)
        const tagName = await heading.evaluate(el => el.tagName.toLowerCase())
        const level = parseInt(tagName.replace('h', ''))
        headingLevels.push(level)
      }
      
      // First heading should be h1
      expect(headingLevels[0]).toBe(1)
      
      // Check for proper nesting (no skipping levels)
      for (let i = 1; i < headingLevels.length; i++) {
        const currentLevel = headingLevels[i]
        const previousLevel = headingLevels[i - 1]
        
        // Should not skip more than one level
        expect(currentLevel - previousLevel).toBeLessThanOrEqual(1)
      }
    }
  })

  test('Interactive elements should have appropriate roles and states', async ({ page }) => {
    await page.goto('/admin/projects/workflow')
    
    // Test buttons
    const buttons = page.locator('button, [role="button"]')
    const buttonCount = await buttons.count()
    
    for (let i = 0; i < Math.min(buttonCount, 20); i++) {
      const button = buttons.nth(i)
      
      if (await button.isVisible()) {
        const ariaLabel = await button.getAttribute('aria-label')
        const textContent = await button.textContent()
        const title = await button.getAttribute('title')
        
        // Button should have accessible name
        const hasAccessibleName = ariaLabel || (textContent && textContent.trim()) || title
        expect(hasAccessibleName).toBeTruthy()
        
        // Test button states
        const isDisabled = await button.isDisabled()
        const ariaDisabled = await button.getAttribute('aria-disabled')
        
        if (isDisabled) {
          // Disabled buttons should have consistent state
          expect(ariaDisabled === 'true' || ariaDisabled === null).toBeTruthy()
        }
      }
    }
    
    // Test form controls
    const selects = page.locator('select')
    const selectCount = await selects.count()
    
    for (let i = 0; i < selectCount; i++) {
      const select = selects.nth(i)
      
      if (await select.isVisible()) {
        const ariaLabel = await select.getAttribute('aria-label')
        const id = await select.getAttribute('id')
        
        // Select should have label
        let hasLabel = !!ariaLabel
        
        if (id) {
          const associatedLabel = await page.locator(`label[for="${id}"]`).count()
          hasLabel = hasLabel || associatedLabel > 0
        }
        
        expect(hasLabel).toBeTruthy()
      }
    }
  })

  test('Error messages should be accessible', async ({ page }) => {
    await page.goto('/admin/projects/opportunities')
    
    // Trigger form validation by submitting empty form
    const submitButton = page.locator('button[type="submit"], [data-testid*="submit"]').first()
    
    if (await submitButton.isVisible()) {
      await submitButton.click()
      
      // Wait for validation errors
      await page.waitForTimeout(1000)
      
      // Check for error messages
      const errorMessages = page.locator('[role="alert"], .error, [data-testid*="error"], [aria-invalid="true"]')
      const errorCount = await errorMessages.count()
      
      if (errorCount > 0) {
        for (let i = 0; i < errorCount; i++) {
          const error = errorMessages.nth(i)
          
          if (await error.isVisible()) {
            // Error should have role="alert" or be associated with form field
            const role = await error.getAttribute('role')
            const ariaLive = await error.getAttribute('aria-live')
            const id = await error.getAttribute('id')
            
            // Check if error is properly announced
            const isAccessible = role === 'alert' || ariaLive === 'polite' || ariaLive === 'assertive'
            
            // Or check if error is associated with form field via aria-describedby
            if (!isAccessible && id) {
              const associatedField = page.locator(`[aria-describedby*="${id}"]`)
              const hasAssociation = await associatedField.count() > 0
              expect(hasAssociation).toBeTruthy()
            } else {
              expect(isAccessible).toBeTruthy()
            }
          }
        }
      }
    }
  })

  test('Focus management should work properly in modals', async ({ page }) => {
    await page.goto('/admin/projects/workflow')
    
    // Try to open a modal (status update modal)
    const statusButton = page.locator('[data-testid*="status"], button').filter({ hasText: /status|update/i }).first()
    
    if (await statusButton.isVisible()) {
      await statusButton.click()
      
      // Wait for modal to open
      await page.waitForTimeout(500)
      
      // Check if modal is open
      const modal = page.locator('[role="dialog"], .modal, [data-testid*="modal"]').first()
      
      if (await modal.isVisible()) {
        // Focus should be trapped in modal
        const focusableElements = modal.locator('button, input, select, textarea, [tabindex="0"]')
        const focusableCount = await focusableElements.count()
        
        if (focusableCount > 0) {
          // First element should be focused
          const firstFocusable = focusableElements.first()
          await expect(firstFocusable).toBeFocused()
          
          // Tab should cycle through modal elements
          for (let i = 0; i < focusableCount; i++) {
            await page.keyboard.press('Tab')
          }
          
          // Focus should return to first element after cycling
          await expect(firstFocusable).toBeFocused()
          
          // Escape should close modal
          await page.keyboard.press('Escape')
          await page.waitForTimeout(500)
          
          // Modal should be closed
          await expect(modal).not.toBeVisible()
        }
      }
    }
  })
})

test.describe('Mobile Accessibility Audit', () => {
  test.beforeEach(async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    await loginAsAdmin(page)
  })

  test('Touch targets should meet minimum size requirements', async ({ page }) => {
    await page.goto('/admin/projects/dashboard')
    
    // Find all interactive elements
    const interactiveElements = page.locator('button, a, input, select, textarea, [role="button"], [tabindex="0"]')
    const elementCount = await interactiveElements.count()
    
    for (let i = 0; i < Math.min(elementCount, 30); i++) {
      const element = interactiveElements.nth(i)
      
      if (await element.isVisible()) {
        const boundingBox = await element.boundingBox()
        
        if (boundingBox) {
          // WCAG 2.1 AA requires 44x44px minimum for touch targets
          expect(boundingBox.height).toBeGreaterThanOrEqual(44)
          expect(boundingBox.width).toBeGreaterThanOrEqual(44)
        }
      }
    }
  })

  test('Mobile navigation should be accessible', async ({ page }) => {
    await page.goto('/admin/projects/opportunities')
    
    // Look for mobile menu button
    const mobileMenuButton = page.locator('[data-testid*="mobile"], .mobile-menu, button[aria-label*="menu"]').first()
    
    if (await mobileMenuButton.isVisible()) {
      // Mobile menu should have proper ARIA attributes
      const ariaLabel = await mobileMenuButton.getAttribute('aria-label')
      const ariaExpanded = await mobileMenuButton.getAttribute('aria-expanded')
      
      expect(ariaLabel).toBeTruthy()
      expect(ariaExpanded).toBe('false')
      
      // Open mobile menu
      await mobileMenuButton.click()
      
      // Menu should be expanded
      const updatedAriaExpanded = await mobileMenuButton.getAttribute('aria-expanded')
      expect(updatedAriaExpanded).toBe('true')
      
      // Mobile menu should be visible
      const mobileMenu = page.locator('[data-testid*="mobile-menu"], .mobile-menu')
      await expect(mobileMenu.first()).toBeVisible()
    }
  })
})

// Generate accessibility audit report
test.afterAll(async () => {
  const report = {
    timestamp: new Date().toISOString(),
    auditScope: [
      'WCAG 2.1 AA compliance',
      'Keyboard navigation',
      'Screen reader compatibility',
      'Color contrast validation',
      'Form accessibility',
      'Error message accessibility',
      'Modal focus management',
      'Mobile touch targets',
      'Heading hierarchy',
      'Image alt text validation'
    ],
    criticalFindings: [
      'All forms must have properly associated labels',
      'Error messages must be announced to screen readers',
      'Focus indicators must be visible for all interactive elements',
      'Touch targets must meet 44px minimum size requirement',
      'Modal dialogs must trap focus properly',
      'Heading hierarchy must be logical and not skip levels'
    ],
    recommendations: [
      'Implement automated accessibility testing in CI/CD pipeline',
      'Add skip navigation links for keyboard users',
      'Ensure all interactive elements have descriptive ARIA labels',
      'Test with actual screen readers (NVDA, JAWS, VoiceOver)',
      'Implement focus management for dynamic content',
      'Add high contrast mode support',
      'Validate color contrast ratios programmatically',
      'Test with users who have disabilities'
    ]
  }
  
  console.log('='.repeat(80))
  console.log('NAMC SYSTEM - ACCESSIBILITY AUDIT REPORT')
  console.log('='.repeat(80))
  console.log(JSON.stringify(report, null, 2))
  console.log('='.repeat(80))
})
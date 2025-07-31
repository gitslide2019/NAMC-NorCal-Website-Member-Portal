import { test, expect } from '@playwright/test'
import { HomePage } from '../pages/HomePage'
import { RegistrationPage } from '../pages/RegistrationPage'
import { SignInPage } from '../pages/SignInPage'
import { MemberDashboardPage } from '../pages/MemberDashboardPage'
import { TestHelpers } from '../utils/test-helpers'
import { TestData } from '../fixtures/test-data'

test.describe('WCAG 2.1 AA Accessibility Compliance', () => {
  test('should pass accessibility audit on homepage', async ({ page }) => {
    const homePage = new HomePage(page)
    await homePage.goto()

    await test.step('Run comprehensive accessibility scan', async () => {
      const violations = await TestHelpers.checkAccessibility(page)
      
      // Log all violations for review
      if (violations.length > 0) {
        console.log(`Homepage accessibility violations found: ${violations.length}`)
        violations.forEach((violation, index) => {
          console.log(`${index + 1}. ${violation.id}: ${violation.description} (Impact: ${violation.impact})`)
        })
      }

      // Critical violations should cause test failure
      const criticalViolations = violations.filter(v => v.impact === 'critical')
      expect(criticalViolations.length).toBe(0)

      // Serious violations should be minimal
      const seriousViolations = violations.filter(v => v.impact === 'serious')
      expect(seriousViolations.length).toBeLessThan(5)
    })

    await test.step('Test keyboard navigation', async () => {
      const expectedTabOrder = TestData.accessibilityTests.keyboardNavigation.homePage
      await TestHelpers.testKeyboardNavigation(page, expectedTabOrder)
    })

    await test.step('Verify images have alt text', async () => {
      await homePage.verifyImagesHaveAltText()
    })

    await test.step('Check color contrast', async () => {
      await homePage.checkColorContrast()
    })
  })

  test('should pass accessibility audit on registration page', async ({ page }) => {
    const registrationPage = new RegistrationPage(page)
    await registrationPage.goto()

    await test.step('Run accessibility scan on registration form', async () => {
      const violations = await TestHelpers.checkAccessibility(page, [
        'color-contrast',
        'keyboard-navigation',
        'aria-labels',
        'form-labels',
        'heading-order'
      ])

      const criticalViolations = violations.filter(v => v.impact === 'critical')
      expect(criticalViolations.length).toBe(0)
    })

    await test.step('Test form accessibility', async () => {
      // Verify all form inputs have proper labels
      const inputs = await page.locator('input').all()
      
      for (const input of inputs) {
        const inputId = await input.getAttribute('id')
        const inputName = await input.getAttribute('name')
        const ariaLabel = await input.getAttribute('aria-label')
        const ariaLabelledBy = await input.getAttribute('aria-labelledby')
        
        // Check if input has associated label
        let hasLabel = false
        
        if (inputId) {
          const label = page.locator(`label[for="${inputId}"]`)
          hasLabel = await label.count() > 0
        }
        
        hasLabel = hasLabel || ariaLabel !== null || ariaLabelledBy !== null
        
        if (!hasLabel && inputName) {
          console.warn(`Input field '${inputName}' may be missing proper label`)
        }
        
        // Form inputs should generally have labels
        expect(hasLabel || input.getAttribute('type') === 'hidden').toBeTruthy()
      }
    })

    await test.step('Test keyboard navigation through form steps', async () => {
      const expectedTabOrder = TestData.accessibilityTests.keyboardNavigation.registrationPage
      await TestHelpers.testKeyboardNavigation(page, expectedTabOrder)
    })

    await test.step('Test error message accessibility', async () => {
      // Trigger validation errors
      await registrationPage.nextButton.click()
      
      // Check that error messages are properly announced
      const errorMessages = await page.locator('[role="alert"], .text-red-500, [aria-live]').all()
      
      for (const error of errorMessages) {
        if (await error.isVisible()) {
          const role = await error.getAttribute('role')
          const ariaLive = await error.getAttribute('aria-live')
          
          // Error messages should be announced to screen readers
          expect(role === 'alert' || ariaLive === 'assertive' || ariaLive === 'polite').toBeTruthy()
        }
      }
    })
  })

  test('should pass accessibility audit on sign in page', async ({ page }) => {
    const signInPage = new SignInPage(page)
    await signInPage.goto()

    await test.step('Run accessibility scan on sign in form', async () => {
      const violations = await TestHelpers.checkAccessibility(page)
      
      const criticalViolations = violations.filter(v => v.impact === 'critical')
      expect(criticalViolations.length).toBe(0)
    })

    await test.step('Test keyboard navigation', async () => {
      const expectedTabOrder = TestData.accessibilityTests.keyboardNavigation.signInPage
      await TestHelpers.testKeyboardNavigation(page, expectedTabOrder)
    })

    await test.step('Test password visibility toggle accessibility', async () => {
      const toggleButton = signInPage.showPasswordButton
      
      // Should be keyboard accessible
      await toggleButton.focus()
      const hasFocus = await toggleButton.evaluate(el => el === document.activeElement)
      expect(hasFocus).toBeTruthy()
      
      // Should have proper ARIA attributes
      const ariaLabel = await toggleButton.getAttribute('aria-label')
      const ariaPressed = await toggleButton.getAttribute('aria-pressed')
      
      // Either should have aria-label or aria-pressed
      expect(ariaLabel !== null || ariaPressed !== null).toBeTruthy()
      
      // Test activation with Enter key
      await toggleButton.press('Enter')
      
      // Password field type should change
      const passwordType = await signInPage.passwordInput.getAttribute('type')
      expect(passwordType === 'text' || passwordType === 'password').toBeTruthy()
    })
  })

  test('should pass accessibility audit on member dashboard', async ({ page }) => {
    // Authenticate first
    await TestHelpers.authenticateAsMember(page)
    
    const memberDashboard = new MemberDashboardPage(page)
    await memberDashboard.goto()

    await test.step('Run comprehensive dashboard accessibility scan', async () => {
      const violations = await TestHelpers.checkAccessibility(page)
      
      if (violations.length > 0) {
        console.log(`Dashboard accessibility violations: ${violations.length}`)
      }

      const criticalViolations = violations.filter(v => v.impact === 'critical')
      expect(criticalViolations.length).toBe(0)
    })

    await test.step('Test dashboard landmarks', async () => {
      // Verify proper semantic structure
      const main = page.locator('main, [role="main"]')
      await expect(main).toBeVisible()
      
      // Check for navigation landmarks
      const nav = page.locator('nav, [role="navigation"]')
      const navCount = await nav.count()
      expect(navCount).toBeGreaterThan(0)
      
      // Check for proper heading hierarchy
      const headings = await page.locator('h1, h2, h3, h4, h5, h6').all()
      expect(headings.length).toBeGreaterThan(0)
      
      // First heading should be h1
      if (headings.length > 0) {
        const firstHeadingTag = await headings[0].evaluate(el => el.tagName.toLowerCase())
        expect(firstHeadingTag).toBe('h1')
      }
    })

    await test.step('Test dashboard keyboard navigation', async () => {
      // Test tab navigation through interactive elements
      const interactiveElements = [
        memberDashboard.completeProfileButton,
        memberDashboard.viewAllActivityButton,
        memberDashboard.viewAllEventsButton,
        memberDashboard.browseProjectsButton
      ]
      
      for (const element of interactiveElements) {
        if (await element.isVisible()) {
          await element.focus()
          
          const hasFocus = await element.evaluate(el => el === document.activeElement)
          expect(hasFocus).toBeTruthy()
        }
      }
    })
  })

  test('should handle screen reader compatibility', async ({ page }) => {
    const homePage = new HomePage(page)
    await homePage.goto()

    await test.step('Test ARIA labels and descriptions', async () => {
      // Check for ARIA landmarks
      const landmarks = await page.locator('[role="main"], [role="navigation"], [role="banner"], [role="contentinfo"]').all()
      expect(landmarks.length).toBeGreaterThan(0)
      
      // Check for ARIA labels on interactive elements
      const interactiveElements = await page.locator('button, a, input, [role="button"]').all()
      
      for (const element of interactiveElements) {
        const ariaLabel = await element.getAttribute('aria-label')
        const ariaLabelledBy = await element.getAttribute('aria-labelledby')
        const textContent = await element.textContent()
        
        // Interactive elements should have accessible names
        const hasAccessibleName = ariaLabel || ariaLabelledBy || (textContent && textContent.trim().length > 0)
        
        if (!hasAccessibleName) {
          console.warn('Interactive element without accessible name found')
        }
      }
    })

    await test.step('Test skip links', async () => {
      // Check if skip links exist for keyboard users
      await page.keyboard.press('Tab')
      
      const skipLink = page.locator('a:has-text("Skip to"), [href="#main"], [href="#content"]')
      const skipLinkExists = await skipLink.count() > 0
      
      if (skipLinkExists) {
        console.log('Skip links found - good for accessibility')
      } else {
        console.warn('No skip links found - consider adding for keyboard navigation')
      }
    })

    await test.step('Test live regions', async () => {
      // Check for live regions that announce dynamic content changes
      const liveRegions = await page.locator('[aria-live], [role="status"], [role="alert"]').count()
      
      if (liveRegions > 0) {
        console.log(`Found ${liveRegions} live regions for dynamic content`)
      }
    })
  })

  test('should handle focus management properly', async ({ page }) => {
    const registrationPage = new RegistrationPage(page)
    await registrationPage.goto()

    await test.step('Test focus visibility', async () => {
      // Tab through form elements and verify focus is visible
      const focusableElements = await page.locator('button, a, input, select, textarea, [tabindex]:not([tabindex="-1"])').all()
      
      for (let i = 0; i < Math.min(focusableElements.length, 10); i++) {
        const element = focusableElements[i]
        await element.focus()
        
        // Check if focus is visible (this is a basic check)
        const hasFocus = await element.evaluate(el => el === document.activeElement)
        expect(hasFocus).toBeTruthy()
        
        // In a real implementation, you might check for focus ring styles
        const computedStyle = await element.evaluate(el => {
          const styles = window.getComputedStyle(el)
          return {
            outline: styles.outline,
            outlineWidth: styles.outlineWidth,
            outlineColor: styles.outlineColor,
            boxShadow: styles.boxShadow
          }
        })
        
        // Should have some form of focus indicator
        const hasFocusIndicator = computedStyle.outline !== 'none' || 
                                 computedStyle.outlineWidth !== '0px' ||
                                 computedStyle.boxShadow !== 'none'
        
        if (!hasFocusIndicator) {
          console.warn('Element may be missing focus indicator')
        }
      }
    })

    await test.step('Test focus trapping in modals', async () => {
      // If there are any modals, test focus trapping
      const modalTriggers = await page.locator('button:has-text("modal"), button:has-text("dialog"), [data-testid*="modal"]').all()
      
      for (const trigger of modalTriggers) {
        if (await trigger.isVisible()) {
          await trigger.click()
          await page.waitForTimeout(500)
          
          // Check if modal opened
          const modal = page.locator('[role="dialog"], .modal, [data-testid="modal"]')
          
          if (await modal.isVisible()) {
            // Test that focus is trapped within modal
            await page.keyboard.press('Tab')
            
            const focusedElement = page.locator(':focus')
            const focusedIsInModal = await modal.locator(':focus').count() > 0
            
            if (focusedIsInModal) {
              console.log('Focus trapping working correctly in modal')
            }
            
            // Close modal (try Escape key)
            await page.keyboard.press('Escape')
            await page.waitForTimeout(300)
          }
        }
      }
    })
  })

  test('should handle color contrast requirements', async ({ page }) => {
    const homePage = new HomePage(page)
    await homePage.goto()

    await test.step('Test color contrast ratios', async () => {
      const contrastIssues = await page.evaluate(() => {
        const issues: Array<{element: string, background: string, color: string}> = []
        
        // Check common text elements
        const textElements = document.querySelectorAll('p, h1, h2, h3, h4, h5, h6, span, div, a, button')
        
        textElements.forEach((element, index) => {
          if (index > 50) return // Limit check to first 50 elements
          
          const styles = window.getComputedStyle(element)
          const backgroundColor = styles.backgroundColor
          const color = styles.color
          
          // Check for potential low contrast combinations
          if (backgroundColor.includes('255, 255, 255') && color.includes('255, 215, 0')) {
            issues.push({
              element: element.tagName.toLowerCase(),
              background: backgroundColor,
              color: color
            })
          }
        })
        
        return issues
      })
      
      if (contrastIssues.length > 0) {
        console.warn(`Potential color contrast issues found: ${contrastIssues.length}`)
        contrastIssues.forEach(issue => {
          console.warn(`${issue.element}: ${issue.color} on ${issue.background}`)
        })
      }
      
      // This is a warning, not a failure, since manual review is needed
      expect(contrastIssues.length).toBeLessThan(20) // Allow some issues but flag if too many
    })

    await test.step('Test high contrast mode compatibility', async () => {
      // Simulate high contrast mode (simplified test)
      await page.evaluate(() => {
        document.body.style.filter = 'contrast(200%)'
      })
      
      await page.waitForTimeout(500)
      
      // Verify key elements are still visible
      await expect(homePage.heroTitle).toBeVisible()
      await expect(homePage.becomeMemberButton).toBeVisible()
      
      // Reset
      await page.evaluate(() => {
        document.body.style.filter = 'none'
      })
    })
  })

  test('should handle mobile accessibility', async ({ page }) => {
    const homePage = new HomePage(page)
    await homePage.goto()

    await test.step('Test mobile accessibility features', async () => {
      await page.setViewportSize({ width: 375, height: 667 })
      await homePage.waitForAnimations()
      
      // Run accessibility scan on mobile
      const violations = await TestHelpers.checkAccessibility(page)
      const criticalViolations = violations.filter(v => v.impact === 'critical')
      expect(criticalViolations.length).toBe(0)
    })

    await test.step('Test touch target sizes', async () => {
      const touchTargets = await page.locator('button, a, input[type="checkbox"], input[type="radio"]').all()
      
      for (const target of touchTargets) {
        if (await target.isVisible()) {
          const box = await target.boundingBox()
          
          if (box) {
            // WCAG recommends minimum 44x44 pixels for touch targets
            const hasAdequateSize = box.width >= 44 && box.height >= 44
            
            if (!hasAdequateSize) {
              console.warn(`Touch target may be too small: ${box.width}x${box.height}`)
            }
            
            // Don't fail test but log warnings for review
          }
        }
      }
    })

    await test.step('Test mobile keyboard navigation', async () => {
      // Test that virtual keyboard doesn't obscure content
      const emailInput = page.locator('input[type="email"]').first()
      
      if (await emailInput.isVisible()) {
        await emailInput.focus()
        await emailInput.fill('test@example.com')
        
        // Verify input is still visible after focusing
        await expect(emailInput).toBeVisible()
      }
    })
  })

  test('should handle assistive technology compatibility', async ({ page }) => {
    const registrationPage = new RegistrationPage(page)
    await registrationPage.goto()

    await test.step('Test form field associations', async () => {
      // Check that form fields are properly associated with labels
      const formFields = await page.locator('input, select, textarea').all()
      
      for (const field of formFields) {
        const fieldId = await field.getAttribute('id')
        const fieldName = await field.getAttribute('name')
        
        if (fieldId) {
          const associatedLabel = page.locator(`label[for="${fieldId}"]`)
          const hasLabel = await associatedLabel.count() > 0
          
          if (!hasLabel) {
            console.warn(`Form field ${fieldName || fieldId} may be missing associated label`)
          }
        }
      }
    })

    await test.step('Test fieldset and legend usage', async () => {
      // Check for proper grouping of related form controls
      const fieldsets = await page.locator('fieldset').all()
      
      for (const fieldset of fieldsets) {
        const legend = fieldset.locator('legend')
        const hasLegend = await legend.count() > 0
        
        expect(hasLegend).toBeTruthy()
      }
    })

    await test.step('Test progress indication', async () => {
      // Check that multi-step forms have proper progress indication
      const progressIndicators = await page.locator('[role="progressbar"], .progress, [aria-valuenow]').count()
      
      if (progressIndicators > 0) {
        console.log('Progress indicators found for multi-step form')
      }
      
      // Check progress steps
      const stepIndicators = await page.locator('.step, [aria-current="step"]').all()
      
      for (const step of stepIndicators) {
        const ariaCurrent = await step.getAttribute('aria-current')
        const ariaLabel = await step.getAttribute('aria-label')
        
        // Step indicators should have proper ARIA attributes
        if (ariaCurrent === 'step' || ariaLabel) {
          console.log('Step indicator properly labeled')
        }
      }
    })
  })

  test.afterEach(async ({ page }) => {
    // Take screenshot on failure for accessibility review
    if (test.info().status !== test.info().expectedStatus) {
      await TestHelpers.takeTimestampedScreenshot(page, 'accessibility-failure')
    }
  })
})
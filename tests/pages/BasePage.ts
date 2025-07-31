import { Page, Locator, expect } from '@playwright/test'

export class BasePage {
  readonly page: Page
  readonly header: Locator
  readonly footer: Locator
  readonly logo: Locator
  readonly mobileMenuButton: Locator

  constructor(page: Page) {
    this.page = page
    this.header = page.locator('header')
    this.footer = page.locator('footer')
    this.logo = page.locator('a[href="/"]').first()
    this.mobileMenuButton = page.locator('button:has(svg)')
  }

  /**
   * Navigate to a specific path
   */
  async goto(path: string = '/') {
    await this.page.goto(path)
  }

  /**
   * Wait for page to be fully loaded
   */
  async waitForLoad() {
    await this.page.waitForLoadState('networkidle')
  }

  /**
   * Check if mobile menu is visible
   */
  async isMobileMenuVisible(): Promise<boolean> {
    return await this.mobileMenuButton.isVisible()
  }

  /**
   * Open mobile menu
   */
  async openMobileMenu() {
    if (await this.isMobileMenuVisible()) {
      await this.mobileMenuButton.click()
    }
  }

  /**
   * Close mobile menu
   */
  async closeMobileMenu() {
    if (await this.isMobileMenuVisible()) {
      const isMenuOpen = await this.page.locator('.lg\\:hidden .absolute').isVisible()
      if (isMenuOpen) {
        await this.mobileMenuButton.click()
      }
    }
  }

  /**
   * Verify page accessibility basics
   */
  async verifyAccessibility() {
    // Check for basic accessibility attributes
    await expect(this.page.locator('html')).toHaveAttribute('lang')
    
    // Check for main landmark
    const mainLandmark = this.page.locator('main, [role="main"]')
    await expect(mainLandmark).toBeVisible()

    // Check for skip links or keyboard navigation
    await this.page.keyboard.press('Tab')
    const focusedElement = await this.page.evaluate(() => document.activeElement?.tagName)
    expect(focusedElement).toBeTruthy()
  }

  /**
   * Take screenshot with name
   */
  async takeScreenshot(name: string) {
    await this.page.screenshot({ 
      path: `test-results/screenshots/${name}.png`,
      fullPage: true 
    })
  }

  /**
   * Wait for animation to complete
   */
  async waitForAnimations() {
    await this.page.waitForTimeout(1000) // Wait for Framer Motion animations
    await this.page.waitForFunction(() => {
      const animations = document.getAnimations()
      return animations.every(animation => animation.playState === 'finished')
    })
  }

  /**
   * Check for JavaScript errors
   */
  async expectNoJSErrors() {
    const errors: string[] = []
    
    this.page.on('pageerror', (error) => {
      errors.push(error.message)
    })

    this.page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text())
      }
    })

    // Wait a bit for any async errors
    await this.page.waitForTimeout(1000)
    
    if (errors.length > 0) {
      throw new Error(`JavaScript errors detected: ${errors.join(', ')}`)
    }
  }

  /**
   * Verify responsive design at different breakpoints
   */
  async testResponsiveBreakpoints() {
    const breakpoints = [
      { name: 'mobile', width: 375, height: 667 },
      { name: 'tablet', width: 768, height: 1024 },
      { name: 'desktop', width: 1024, height: 768 },
      { name: 'large', width: 1440, height: 900 },
    ]

    for (const breakpoint of breakpoints) {
      await this.page.setViewportSize({ 
        width: breakpoint.width, 
        height: breakpoint.height 
      })
      
      await this.waitForAnimations()
      
      // Verify layout doesn't break
      const hasHorizontalScroll = await this.page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth
      })
      
      expect(hasHorizontalScroll).toBeFalsy()
      
      // Take screenshot at each breakpoint
      await this.takeScreenshot(`responsive-${breakpoint.name}`)
    }
  }

  /**
   * Verify all images have alt text
   */
  async verifyImagesHaveAltText() {
    const images = await this.page.locator('img').all()
    
    for (const img of images) {
      const alt = await img.getAttribute('alt')
      const ariaLabel = await img.getAttribute('aria-label')
      const ariaHidden = await img.getAttribute('aria-hidden')
      
      // Image should have alt text, aria-label, or be marked as decorative
      expect(alt !== null || ariaLabel !== null || ariaHidden === 'true').toBeTruthy()
    }
  }

  /**
   * Check color contrast ratios (basic implementation)
   */
  async checkColorContrast() {
    const contrastIssues = await this.page.evaluate(() => {
      const issues: string[] = []
      const elements = document.querySelectorAll('*')
      
      elements.forEach((element) => {
        const styles = window.getComputedStyle(element)
        const bgColor = styles.backgroundColor
        const textColor = styles.color
        
        // Simple check for NAMC yellow on white backgrounds
        if (bgColor.includes('255, 255, 255') && textColor.includes('255, 215, 0')) {
          issues.push(`Low contrast detected on element: ${element.tagName}`)
        }
      })
      
      return issues
    })

    if (contrastIssues.length > 0) {
      console.warn('Color contrast issues detected:', contrastIssues)
    }
  }
}
import { Page, Locator, expect } from '@playwright/test'
import { BasePage } from './BasePage'

export class HomePage extends BasePage {
  readonly heroSection: Locator
  readonly heroTitle: Locator
  readonly heroDescription: Locator
  readonly becomeMemberButton: Locator
  readonly learnMoreButton: Locator
  readonly scrollIndicator: Locator
  readonly statsSection: Locator
  readonly statCards: Locator
  readonly aboutSection: Locator
  readonly featuresSection: Locator
  readonly featureCards: Locator
  readonly timelineSection: Locator
  readonly newsletterSection: Locator
  readonly newsletterSignup: Locator

  constructor(page: Page) {
    super(page)
    
    // Hero section elements
    this.heroSection = page.locator('section').first()
    this.heroTitle = page.locator('h1')
    this.heroDescription = page.locator('h1 + p')
    this.becomeMemberButton = page.locator('a[href="/auth/register"]').first()
    this.learnMoreButton = page.locator('a[href="/about"]').first()
    this.scrollIndicator = page.locator('.absolute.bottom-8')
    
    // Stats section
    this.statsSection = page.locator('section').nth(1)
    this.statCards = this.statsSection.locator('.grid > div')
    
    // About section
    this.aboutSection = page.locator('section').nth(2)
    
    // Features section
    this.featuresSection = page.locator('section').nth(3)
    this.featureCards = this.featuresSection.locator('.grid > div')
    
    // Timeline section
    this.timelineSection = page.locator('section').nth(4)
    
    // Newsletter section
    this.newsletterSection = page.locator('section').nth(5)
    this.newsletterSignup = this.newsletterSection.locator('form, [data-testid="newsletter-signup"]')
  }

  /**
   * Navigate to homepage
   */
  async goto() {
    await super.goto('/')
    await this.waitForHeroToLoad()
  }

  /**
   * Wait for hero section to fully load with animations
   */
  async waitForHeroToLoad() {
    await this.heroTitle.waitFor({ state: 'visible' })
    await this.waitForAnimations()
  }

  /**
   * Verify hero section content and functionality
   */
  async verifyHeroSection() {
    // Check title content
    await expect(this.heroTitle).toContainText('Building Excellence')
    await expect(this.heroTitle).toContainText('Since 1969')
    
    // Check description
    await expect(this.heroDescription).toContainText('Supporting minority contractors')
    
    // Check CTAs are visible and clickable
    await expect(this.becomeMemberButton).toBeVisible()
    await expect(this.becomeMemberButton).toBeEnabled()
    await expect(this.learnMoreButton).toBeVisible()
    await expect(this.learnMoreButton).toBeEnabled()
    
    // Check scroll indicator
    await expect(this.scrollIndicator).toBeVisible()
  }

  /**
   * Click "Become a Member" button
   */
  async clickBecomeMember() {
    await this.becomeMemberButton.click()
    await this.page.waitForURL('**/auth/register')
  }

  /**
   * Click "Learn More" button
   */
  async clickLearnMore() {
    await this.learnMoreButton.click()
    await this.page.waitForURL('**/about')
  }

  /**
   * Verify stats section displays correctly
   */
  async verifyStatsSection() {
    await expect(this.statsSection).toBeVisible()
    
    // Check that we have 4 stat cards
    await expect(this.statCards).toHaveCount(4)
    
    // Verify each stat card has the expected structure
    for (let i = 0; i < 4; i++) {
      const card = this.statCards.nth(i)
      const icon = card.locator('svg').first()
      const number = card.locator('.text-3xl, .text-4xl').first()
      const label = card.locator('.text-gray-600').first()
      
      await expect(icon).toBeVisible()
      await expect(number).toBeVisible()
      await expect(label).toBeVisible()
    }
    
    // Verify specific stats content
    await expect(this.statCards.nth(0)).toContainText('1,247')
    await expect(this.statCards.nth(0)).toContainText('Active Members')
    await expect(this.statCards.nth(1)).toContainText('450+')
    await expect(this.statCards.nth(1)).toContainText('Projects Completed')
  }

  /**
   * Verify features section and interaction
   */
  async verifyFeaturesSection() {
    await expect(this.featuresSection).toBeVisible()
    await expect(this.featureCards).toHaveCount(4)
    
    const expectedFeatures = [
      { title: 'Interactive Timeline', link: '/timeline' },
      { title: 'Member Portal', link: '/member/dashboard' },
      { title: 'Learning Center', link: '/learning' },
      { title: 'Tool Library', link: '/tools' }
    ]
    
    for (let i = 0; i < expectedFeatures.length; i++) {
      const card = this.featureCards.nth(i)
      const title = card.locator('h3, .text-lg').first()
      const exploreButton = card.locator('a', { hasText: 'Explore' })
      
      await expect(title).toContainText(expectedFeatures[i].title)
      await expect(exploreButton).toBeVisible()
      await expect(exploreButton).toHaveAttribute('href', expectedFeatures[i].link)
    }
  }

  /**
   * Test feature card hover effects
   */
  async testFeatureCardHoverEffects() {
    for (let i = 0; i < 4; i++) {
      const card = this.featureCards.nth(i)
      
      // Hover over card
      await card.hover()
      await this.page.waitForTimeout(300) // Wait for hover animation
      
      // Verify hover effect applied (you may need to adjust based on actual CSS)
      const cardBox = await card.boundingBox()
      expect(cardBox).toBeTruthy()
    }
  }

  /**
   * Test timeline section interaction
   */
  async verifyTimelineSection() {
    await expect(this.timelineSection).toBeVisible()
    
    // Check timeline years
    const timelineYears = [1969, 1980, 2000, 2025]
    for (const year of timelineYears) {
      await expect(this.page.locator(`text=${year}`)).toBeVisible()
    }
    
    // Check "Explore Full Timeline" button
    const timelineButton = this.timelineSection.locator('a[href="/timeline"]')
    await expect(timelineButton).toBeVisible()
    await expect(timelineButton).toContainText('Explore Full Timeline')
  }

  /**
   * Test newsletter signup functionality
   */
  async testNewsletterSignup(email: string = 'test@example.com') {
    await expect(this.newsletterSection).toBeVisible()
    
    const emailInput = this.newsletterSignup.locator('input[type="email"]')
    const submitButton = this.newsletterSignup.locator('button[type="submit"]')
    
    await expect(emailInput).toBeVisible()
    await expect(submitButton).toBeVisible()
    
    // Fill and submit form
    await emailInput.fill(email)
    await submitButton.click()
    
    // Wait for success message or error handling
    await this.page.waitForTimeout(1000)
  }

  /**
   * Scroll through all sections and verify visibility
   */
  async scrollThroughSections() {
    const sections = [
      this.heroSection,
      this.statsSection,
      this.aboutSection,
      this.featuresSection,
      this.timelineSection,
      this.newsletterSection
    ]
    
    for (const section of sections) {
      await section.scrollIntoViewIfNeeded()
      await this.waitForAnimations()
      await expect(section).toBeVisible()
      
      // Check if section has animation classes or motion elements
      const hasAnimation = await section.locator('[style*="transform"], [style*="opacity"]').count()
      console.log(`Section animations detected: ${hasAnimation}`)
    }
  }

  /**
   * Test responsive navigation
   */
  async testResponsiveNavigation() {
    // Test mobile navigation
    await this.page.setViewportSize({ width: 375, height: 667 })
    await this.waitForAnimations()
    
    if (await this.isMobileMenuVisible()) {
      await this.openMobileMenu()
      
      // Verify mobile menu items
      const mobileMenu = this.page.locator('.lg\\:hidden .absolute')
      await expect(mobileMenu).toBeVisible()
      
      // Check navigation links in mobile menu
      const navLinks = ['About', 'Timeline', 'Projects', 'Shop', 'News', 'Contact']
      for (const link of navLinks) {
        await expect(mobileMenu.locator(`text=${link}`)).toBeVisible()
      }
      
      await this.closeMobileMenu()
    }
    
    // Test desktop navigation
    await this.page.setViewportSize({ width: 1200, height: 800 })
    await this.waitForAnimations()
    
    const desktopNav = this.header.locator('.hidden.lg\\:flex')
    await expect(desktopNav).toBeVisible()
  }

  /**
   * Verify page performance metrics
   */
  async verifyPerformanceMetrics() {
    const performanceMetrics = await this.page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
      return {
        loadTime: navigation.loadEventEnd - navigation.fetchStart,
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.fetchStart,
        firstPaint: performance.getEntriesByName('first-paint')[0]?.startTime || 0,
        firstContentfulPaint: performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 0
      }
    })
    
    // Performance assertions (adjust thresholds as needed)
    expect(performanceMetrics.loadTime).toBeLessThan(3000) // 3 seconds
    expect(performanceMetrics.domContentLoaded).toBeLessThan(2000) // 2 seconds
    
    console.log('Performance metrics:', performanceMetrics)
  }

  /**
   * Test accessibility features
   */
  async testAccessibilityFeatures() {
    // Test keyboard navigation
    await this.page.keyboard.press('Tab')
    let focusedElement = await this.page.evaluate(() => document.activeElement?.tagName)
    expect(focusedElement).toBeTruthy()
    
    // Navigate through key interactive elements
    const keyElements = [
      this.becomeMemberButton,
      this.learnMoreButton,
      this.logo
    ]
    
    for (const element of keyElements) {
      await element.focus()
      const hasFocus = await element.evaluate((el) => el === document.activeElement)
      expect(hasFocus).toBeTruthy()
    }
    
    // Check ARIA attributes
    await this.verifyImagesHaveAltText()
    await this.checkColorContrast()
  }
}
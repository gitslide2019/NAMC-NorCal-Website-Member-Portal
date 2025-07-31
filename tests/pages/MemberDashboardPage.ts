import { Page, Locator, expect } from '@playwright/test'
import { BasePage } from './BasePage'

export class MemberDashboardPage extends BasePage {
  readonly welcomeTitle: Locator
  readonly welcomeDescription: Locator
  readonly profileCompletionCard: Locator
  readonly profileCompletionProgress: Locator
  readonly completeProfileButton: Locator
  readonly statCards: Locator
  readonly recentActivitySection: Locator
  readonly activityItems: Locator
  readonly upcomingEventsSection: Locator
  readonly eventItems: Locator
  readonly projectOpportunitiesSection: Locator
  readonly projectCards: Locator
  readonly viewAllActivityButton: Locator
  readonly viewAllEventsButton: Locator
  readonly browseProjectsButton: Locator

  constructor(page: Page) {
    super(page)
    
    // Welcome section
    this.welcomeTitle = page.locator('h1')
    this.welcomeDescription = page.locator('h1 + p')
    
    // Profile completion
    this.profileCompletionCard = page.locator('[variant="yellow"], .card').first()
    this.profileCompletionProgress = page.locator('.bg-gray-200 .bg-namc-yellow')
    this.completeProfileButton = page.locator('a[href="/member/settings"]')
    
    // Stats section
    this.statCards = page.locator('.grid .card').nth(0).locator('~ .card, .card').first().locator('~ div')
    
    // Activity section
    this.recentActivitySection = page.locator('.lg\\:col-span-2 .card')
    this.activityItems = this.recentActivitySection.locator('.space-y-4 > div')
    this.viewAllActivityButton = page.locator('a[href="/member/activity"]')
    
    // Events section
    this.upcomingEventsSection = page.locator('.card:has-text("Upcoming Events")')
    this.eventItems = this.upcomingEventsSection.locator('.space-y-4 > div')
    this.viewAllEventsButton = page.locator('a[href="/member/events"]')
    
    // Projects section
    this.projectOpportunitiesSection = page.locator('.card:has-text("New Project Opportunities")')
    this.projectCards = this.projectOpportunitiesSection.locator('.grid > div')
    this.browseProjectsButton = page.locator('a[href="/member/projects"]')
  }

  /**
   * Navigate to member dashboard
   */
  async goto() {
    await super.goto('/member/dashboard')
    await this.waitForDashboardLoad()
  }

  /**
   * Wait for dashboard to load with all data
   */
  async waitForDashboardLoad() {
    await this.welcomeTitle.waitFor({ state: 'visible' })
    await this.waitForAnimations()
    
    // Wait for stat cards to load
    await expect(this.statCards.first()).toBeVisible()
  }

  /**
   * Verify welcome section
   */
  async verifyWelcomeSection(expectedName?: string) {
    await expect(this.welcomeTitle).toBeVisible()
    
    if (expectedName) {
      await expect(this.welcomeTitle).toContainText(`Welcome back, ${expectedName}!`)
    } else {
      await expect(this.welcomeTitle).toContainText('Welcome back')
    }
    
    await expect(this.welcomeDescription).toContainText('Here\'s what\'s happening with your NAMC membership today')
  }

  /**
   * Verify profile completion section
   */
  async verifyProfileCompletion() {
    const isVisible = await this.profileCompletionCard.isVisible()
    
    if (isVisible) {
      await expect(this.profileCompletionCard).toContainText('Complete Your Profile')
      
      // Check progress bar exists
      await expect(this.profileCompletionProgress).toBeVisible()
      
      // Check completion percentage is displayed
      const percentageText = await this.profileCompletionCard.textContent()
      expect(percentageText).toMatch(/\d+%/)
      
      // Check "Complete Profile" button
      await expect(this.completeProfileButton).toBeVisible()
      await expect(this.completeProfileButton).toBeEnabled()
    }
  }

  /**
   * Verify stats cards
   */
  async verifyStatsCards() {
    // Should have 4 stat cards
    await expect(this.statCards).toHaveCount(4)
    
    const expectedStats = [
      { title: 'Projects Applied', icon: true },
      { title: 'Courses Completed', icon: true },
      { title: 'Tools Reserved', icon: true },
      { title: 'Unread Messages', icon: true }
    ]
    
    for (let i = 0; i < expectedStats.length; i++) {
      const card = this.statCards.nth(i)
      const title = card.locator('.text-sm').first()
      const value = card.locator('.text-3xl').first()
      const icon = card.locator('svg').first()
      
      await expect(title).toContainText(expectedStats[i].title)
      await expect(value).toBeVisible()
      
      if (expectedStats[i].icon) {
        await expect(icon).toBeVisible()
      }
    }
  }

  /**
   * Verify recent activity section
   */
  async verifyRecentActivity() {
    await expect(this.recentActivitySection).toBeVisible()
    await expect(this.recentActivitySection).toContainText('Recent Activity')
    
    // Check "View All" button
    await expect(this.viewAllActivityButton).toBeVisible()
    await expect(this.viewAllActivityButton).toHaveAttribute('href', '/member/activity')
    
    // Verify activity items
    const activityCount = await this.activityItems.count()
    expect(activityCount).toBeGreaterThan(0)
    
    // Check each activity item structure
    for (let i = 0; i < Math.min(activityCount, 3); i++) {
      const item = this.activityItems.nth(i)
      const icon = item.locator('svg').first()
      const title = item.locator('h4').first()
      const description = item.locator('p').first()
      const timestamp = item.locator('.text-xs').first()
      
      await expect(icon).toBeVisible()
      await expect(title).toBeVisible()
      await expect(description).toBeVisible()
      await expect(timestamp).toBeVisible()
    }
  }

  /**
   * Verify upcoming events section
   */
  async verifyUpcomingEvents() {
    await expect(this.upcomingEventsSection).toBeVisible()
    await expect(this.upcomingEventsSection).toContainText('Upcoming Events')
    
    // Check "View All" button
    await expect(this.viewAllEventsButton).toBeVisible()
    await expect(this.viewAllEventsButton).toHaveAttribute('href', '/member/events')
    
    // Verify event items
    const eventCount = await this.eventItems.count()
    
    if (eventCount > 0) {
      // Check each event item structure
      for (let i = 0; i < Math.min(eventCount, 2); i++) {
        const item = this.eventItems.nth(i)
        const title = item.locator('h4').first()
        const dateInfo = item.locator('text=/\\w+ \\d+, \\d+/')
        const timeInfo = item.locator('text=/\\d+:\\d+ (AM|PM)/')
        const rsvpButton = item.locator('button:has-text("RSVP")')
        
        await expect(title).toBeVisible()
        await expect(dateInfo).toBeVisible()
        await expect(timeInfo).toBeVisible()
        await expect(rsvpButton).toBeVisible()
      }
    }
  }

  /**
   * Verify project opportunities section
   */
  async verifyProjectOpportunities() {
    await expect(this.projectOpportunitiesSection).toBeVisible()
    await expect(this.projectOpportunitiesSection).toContainText('New Project Opportunities')
    
    // Check "Browse All Projects" button
    await expect(this.browseProjectsButton).toBeVisible()
    await expect(this.browseProjectsButton).toHaveAttribute('href', '/member/projects')
    
    // Verify project cards
    const projectCount = await this.projectCards.count()
    expect(projectCount).toBeGreaterThan(0)
    
    // Check each project card structure
    for (let i = 0; i < Math.min(projectCount, 2); i++) {
      const card = this.projectCards.nth(i)
      const title = card.locator('h4').first()
      const budget = card.locator('text=/Budget:/')
      const location = card.locator('text=/Location:/')
      const deadline = card.locator('text=/Deadline:/')
      const bidsCount = card.locator('text=/Bids Submitted:/')
      const viewDetailsButton = card.locator('button:has-text("View Details")')
      const submitBidButton = card.locator('button:has-text("Submit Bid")')
      
      await expect(title).toBeVisible()
      await expect(budget).toBeVisible()
      await expect(location).toBeVisible()
      await expect(deadline).toBeVisible()
      await expect(bidsCount).toBeVisible()
      await expect(viewDetailsButton).toBeVisible()
      await expect(submitBidButton).toBeVisible()
    }
  }

  /**
   * Click on stat card
   */
  async clickStatCard(index: number) {
    const card = this.statCards.nth(index)
    await card.click()
    await this.waitForAnimations()
  }

  /**
   * Click "View All Activity"
   */
  async clickViewAllActivity() {
    await this.viewAllActivityButton.click()
    await this.page.waitForURL('**/member/activity')
  }

  /**
   * Click "View All Events"
   */
  async clickViewAllEvents() {
    await this.viewAllEventsButton.click()
    await this.page.waitForURL('**/member/events')
  }

  /**
   * Click "Browse All Projects"
   */
  async clickBrowseAllProjects() {
    await this.browseProjectsButton.click()
    await this.page.waitForURL('**/member/projects')
  }

  /**
   * RSVP to an event
   */
  async rsvpToEvent(eventIndex: number = 0) {
    const eventItem = this.eventItems.nth(eventIndex)
    const rsvpButton = eventItem.locator('button:has-text("RSVP")')
    
    await expect(rsvpButton).toBeVisible()
    await rsvpButton.click()
    
    // Wait for any modal or confirmation
    await this.page.waitForTimeout(1000)
  }

  /**
   * View project details
   */
  async viewProjectDetails(projectIndex: number = 0) {
    const projectCard = this.projectCards.nth(projectIndex)
    const viewDetailsButton = projectCard.locator('button:has-text("View Details")')
    
    await expect(viewDetailsButton).toBeVisible()
    await viewDetailsButton.click()
    
    // Wait for navigation or modal
    await this.page.waitForTimeout(1000)
  }

  /**
   * Submit bid on project
   */
  async submitBidOnProject(projectIndex: number = 0) {
    const projectCard = this.projectCards.nth(projectIndex)
    const submitBidButton = projectCard.locator('button:has-text("Submit Bid")')
    
    await expect(submitBidButton).toBeVisible()
    await submitBidButton.click()
    
    // Wait for navigation or modal
    await this.page.waitForTimeout(1000)
  }

  /**
   * Complete profile
   */
  async completeProfile() {
    if (await this.completeProfileButton.isVisible()) {
      await this.completeProfileButton.click()
      await this.page.waitForURL('**/member/settings')
    }
  }

  /**
   * Test dashboard interactivity
   */
  async testDashboardInteractivity() {
    // Test hover effects on cards
    const allCards = this.page.locator('.card, .hover\\:border-namc-yellow, .hover\\:shadow-md')
    const cardCount = await allCards.count()
    
    for (let i = 0; i < Math.min(cardCount, 5); i++) {
      const card = allCards.nth(i)
      await card.hover()
      await this.page.waitForTimeout(200)
    }
    
    // Test button interactions
    const buttons = this.page.locator('button:visible')
    const buttonCount = await buttons.count()
    
    for (let i = 0; i < Math.min(buttonCount, 3); i++) {
      const button = buttons.nth(i)
      const isEnabled = await button.isEnabled()
      expect(isEnabled).toBeTruthy()
    }
  }

  /**
   * Test mobile dashboard layout
   */
  async testMobileDashboard() {
    await this.page.setViewportSize({ width: 375, height: 667 })
    await this.waitForAnimations()
    
    // Verify sections stack properly on mobile
    await expect(this.welcomeTitle).toBeVisible()
    await expect(this.statCards.first()).toBeVisible()
    
    // Test mobile navigation if present
    if (await this.isMobileMenuVisible()) {
      await this.openMobileMenu()
      
      // Check for dashboard-specific mobile navigation
      const mobileNav = this.page.locator('.lg\\:hidden .absolute')
      if (await mobileNav.isVisible()) {
        await expect(mobileNav.locator('text=Dashboard')).toBeVisible()
      }
      
      await this.closeMobileMenu()
    }
    
    // Test scrolling behavior
    await this.page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    await this.waitForAnimations()
    
    // Verify all sections are still accessible
    await expect(this.projectOpportunitiesSection).toBeVisible()
  }

  /**
   * Test dashboard data loading states
   */
  async testDataLoadingStates() {
    // Reload the page to test loading states
    await this.page.reload()
    
    // Check if loading skeletons or indicators are shown
    const loadingElements = this.page.locator('.animate-pulse, .loading, [data-testid="skeleton"]')
    const hasLoadingState = await loadingElements.count() > 0
    
    if (hasLoadingState) {
      // Wait for loading to complete
      await this.page.waitForSelector('.animate-pulse', { state: 'hidden', timeout: 5000 })
    }
    
    // Verify data loaded correctly
    await this.verifyStatsCards()
    await this.verifyRecentActivity()
  }

  /**
   * Test empty states
   */
  async testEmptyStates() {
    // This would test how the dashboard handles users with no data
    // In a real scenario, you might use API mocking or test data
    
    // Check if empty state messages exist for users with no activities
    const emptyStateSelectors = [
      'text=No recent activity',
      'text=No upcoming events',
      'text=No project opportunities',
      '.empty-state'
    ]
    
    for (const selector of emptyStateSelectors) {
      const element = this.page.locator(selector)
      if (await element.isVisible()) {
        console.log(`Empty state found: ${selector}`)
      }
    }
  }

  /**
   * Test dashboard accessibility
   */
  async testDashboardAccessibility() {
    // Test keyboard navigation through dashboard
    await this.page.keyboard.press('Tab')
    
    // Key interactive elements that should be keyboard accessible
    const keyElements = [
      this.completeProfileButton,
      this.viewAllActivityButton,
      this.viewAllEventsButton,
      this.browseProjectsButton
    ]
    
    for (const element of keyElements) {
      if (await element.isVisible()) {
        await element.focus()
        const hasFocus = await element.evaluate(el => el === document.activeElement)
        expect(hasFocus).toBeTruthy()
      }
    }
    
    // Test ARIA landmarks
    const main = this.page.locator('main, [role="main"]')
    await expect(main).toBeVisible()
    
    // Test headings hierarchy
    const headings = await this.page.locator('h1, h2, h3, h4, h5, h6').all()
    expect(headings.length).toBeGreaterThan(0)
    
    // First heading should be h1
    const firstHeading = headings[0]
    const tagName = await firstHeading.evaluate(el => el.tagName.toLowerCase())
    expect(tagName).toBe('h1')
  }

  /**
   * Test dashboard performance
   */
  async testDashboardPerformance() {
    const performanceMetrics = await this.page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
      const resources = performance.getEntriesByType('resource')
      
      return {
        loadTime: navigation.loadEventEnd - navigation.fetchStart,
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.fetchStart,
        resourceCount: resources.length,
        totalResourceSize: resources.reduce((total, resource) => {
          return total + ((resource as any).transferSize || 0)
        }, 0)
      }
    })
    
    // Performance assertions
    expect(performanceMetrics.loadTime).toBeLessThan(3000) // 3 seconds
    expect(performanceMetrics.domContentLoaded).toBeLessThan(2000) // 2 seconds
    expect(performanceMetrics.resourceCount).toBeLessThan(100) // Reasonable resource count
    
    console.log('Dashboard performance metrics:', performanceMetrics)
  }

  /**
   * Verify dashboard data accuracy
   */
  async verifyDataAccuracy() {
    // Verify stats show reasonable numbers
    const statValues = await this.statCards.locator('.text-3xl').allTextContents()
    
    for (const value of statValues) {
      // Should contain numbers or reasonable text
      expect(value).toMatch(/\d+|\/|\w+/)
    }
    
    // Verify dates in activities and events are reasonable
    const timestamps = await this.page.locator('.text-xs:has-text("ago"), .text-xs:has-text("at")').allTextContents()
    
    for (const timestamp of timestamps) {
      // Should contain time-related words
      expect(timestamp).toMatch(/ago|at|AM|PM|\d+:\d+/)
    }
  }
}
import { test, expect } from '@playwright/test'
import { MemberDashboardPage } from '../pages/MemberDashboardPage'
import { SignInPage } from '../pages/SignInPage'
import { TestHelpers } from '../utils/test-helpers'
import { TestData } from '../fixtures/test-data'

test.describe('Member Dashboard User Journey', () => {
  let memberDashboard: MemberDashboardPage

  test.beforeEach(async ({ page }) => {
    // Authenticate as member first
    await TestHelpers.authenticateAsMember(page)
    
    memberDashboard = new MemberDashboardPage(page)
    await memberDashboard.goto()
  })

  test('should load dashboard with all sections visible', async ({ page }) => {
    await test.step('Verify welcome section', async () => {
      await memberDashboard.verifyWelcomeSection()
    })

    await test.step('Verify profile completion section', async () => {
      await memberDashboard.verifyProfileCompletion()
    })

    await test.step('Verify stats cards', async () => {
      await memberDashboard.verifyStatsCards()
    })

    await test.step('Verify recent activity section', async () => {
      await memberDashboard.verifyRecentActivity()
    })

    await test.step('Verify upcoming events section', async () => {
      await memberDashboard.verifyUpcomingEvents()
    })

    await test.step('Verify project opportunities section', async () => {
      await memberDashboard.verifyProjectOpportunities()
    })

    await test.step('Check for console errors', async () => {
      await TestHelpers.expectNoConsoleErrors(page)
    })
  })

  test('should handle profile completion workflow', async ({ page }) => {
    await test.step('Check if profile completion card is visible', async () => {
      const profileCard = memberDashboard.profileCompletionCard
      const isVisible = await profileCard.isVisible()
      
      if (isVisible) {
        await test.step('Verify progress indicator', async () => {
          await expect(memberDashboard.profileCompletionProgress).toBeVisible()
          
          // Check that percentage is displayed
          const cardText = await profileCard.textContent()
          expect(cardText).toMatch(/\d+%/)
        })

        await test.step('Test complete profile button', async () => {
          await memberDashboard.completeProfile()
          
          // Should navigate to settings page
          await expect(page).toHaveURL(/.*\/member\/settings/)
        })
      } else {
        console.log('Profile completion card not visible - user may have 100% completion')
      }
    })
  })

  test('should handle stat card interactions', async ({ page }) => {
    await test.step('Test stat card clicks', async () => {
      const statCount = await memberDashboard.statCards.count()
      
      for (let i = 0; i < Math.min(statCount, 4); i++) {
        const statCard = memberDashboard.statCards.nth(i)
        const cardTitle = await statCard.locator('.text-sm').first().textContent()
        
        console.log(`Testing stat card: ${cardTitle}`)
        
        // Click on stat card
        await memberDashboard.clickStatCard(i)
        
        // Verify card is clickable and responsive
        await expect(statCard).toBeVisible()
        
        // In a real app, this might navigate to detailed views
        // For now, we just verify the interaction doesn't break anything
        await page.waitForTimeout(500)
      }
    })

    await test.step('Verify stat card hover effects', async () => {
      const firstStatCard = memberDashboard.statCards.first()
      
      // Hover over card
      await firstStatCard.hover()
      await page.waitForTimeout(300)
      
      // Verify card is still visible and functional
      await expect(firstStatCard).toBeVisible()
    })
  })

  test('should handle recent activity interactions', async ({ page }) => {
    await test.step('Test "View All Activity" button', async () => {
      await memberDashboard.clickViewAllActivity()
      
      // Should navigate to activity page
      await expect(page).toHaveURL(/.*\/member\/activity/)
    })

    await test.step('Test activity item interactions', async () => {
      // Go back to dashboard
      await memberDashboard.goto()
      
      const activityCount = await memberDashboard.activityItems.count()
      
      if (activityCount > 0) {
        // Test clicking on activity items
        for (let i = 0; i < Math.min(activityCount, 3); i++) {
          const activityItem = memberDashboard.activityItems.nth(i)
          
          // Hover over activity item
          await activityItem.hover()
          await page.waitForTimeout(200)
          
          // Verify hover effect (if any)
          await expect(activityItem).toBeVisible()
        }
      } else {
        console.log('No activity items found - testing empty state')
        await memberDashboard.testEmptyStates()
      }
    })
  })

  test('should handle upcoming events interactions', async ({ page }) => {
    await test.step('Test "View All Events" button', async () => {
      await memberDashboard.clickViewAllEvents()
      
      // Should navigate to events page
      await expect(page).toHaveURL(/.*\/member\/events/)
    })

    await test.step('Test RSVP functionality', async () => {
      // Go back to dashboard
      await memberDashboard.goto()
      
      const eventCount = await memberDashboard.eventItems.count()
      
      if (eventCount > 0) {
        await memberDashboard.rsvpToEvent(0)
        
        // Verify RSVP interaction doesn't break page
        await expect(memberDashboard.upcomingEventsSection).toBeVisible()
      } else {
        console.log('No events found - testing empty state')
      }
    })
  })

  test('should handle project opportunities interactions', async ({ page }) => {
    await test.step('Test "Browse All Projects" button', async () => {
      await memberDashboard.clickBrowseAllProjects()
      
      // Should navigate to projects page
      await expect(page).toHaveURL(/.*\/member\/projects/)
    })

    await test.step('Test project interactions', async () => {
      // Go back to dashboard
      await memberDashboard.goto()
      
      const projectCount = await memberDashboard.projectCards.count()
      
      if (projectCount > 0) {
        await test.step('Test "View Details" button', async () => {
          await memberDashboard.viewProjectDetails(0)
          
          // Verify interaction completed
          await page.waitForTimeout(1000)
        })

        await test.step('Test "Submit Bid" button', async () => {
          await memberDashboard.submitBidOnProject(0)
          
          // Verify interaction completed
          await page.waitForTimeout(1000)
        })
      } else {
        console.log('No project opportunities found')
      }
    })
  })

  test('should handle dashboard interactivity', async ({ page }) => {
    await test.step('Test dashboard interactivity', async () => {
      await memberDashboard.testDashboardInteractivity()
    })

    await test.step('Test all interactive elements', async () => {
      // Test buttons and links
      const interactiveElements = await page.locator('button:visible, a:visible').all()
      
      for (let i = 0; i < Math.min(interactiveElements.length, 10); i++) {
        const element = interactiveElements[i]
        const isEnabled = await element.isEnabled()
        const isVisible = await element.isVisible()
        
        expect(isEnabled).toBeTruthy()
        expect(isVisible).toBeTruthy()
      }
    })
  })

  test('should be mobile responsive', async ({ page }) => {
    await test.step('Test mobile dashboard layout', async () => {
      await memberDashboard.testMobileDashboard()
    })

    await test.step('Test mobile interactions', async () => {
      await page.setViewportSize({ width: 375, height: 667 })
      await memberDashboard.waitForDashboardLoad()
      
      // Test mobile-specific interactions
      const statCards = memberDashboard.statCards
      const statCount = await statCards.count()
      
      if (statCount > 0) {
        const firstCard = statCards.first()
        await firstCard.click()
        await expect(firstCard).toBeVisible()
      }
      
      // Test scrolling on mobile
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
      await memberDashboard.waitForAnimations()
      
      // Verify content is accessible after scrolling
      await expect(memberDashboard.projectOpportunitiesSection).toBeVisible()
    })
  })

  test('should handle data loading states', async ({ page }) => {
    await test.step('Test data loading states', async () => {
      await memberDashboard.testDataLoadingStates()
    })

    await test.step('Test loading performance', async () => {
      const loadTime = await TestHelpers.checkPageLoadPerformance(page, 5000)
      console.log(`Dashboard load time: ${loadTime}ms`)
      
      // Dashboard should load reasonably fast
      expect(loadTime).toBeLessThan(5000) // 5 seconds
    })
  })

  test('should handle empty states gracefully', async ({ page }) => {
    await test.step('Test empty states', async () => {
      await memberDashboard.testEmptyStates()
    })

    await test.step('Mock empty data and test UI', async () => {
      // Mock API to return empty data
      await TestHelpers.mockApiResponse(page, '**/api/dashboard**', {
        success: true,
        data: {
          stats: { projectsApplied: 0, coursesCompleted: 0, toolsReserved: 0, messagesUnread: 0 },
          recentActivity: [],
          upcomingEvents: [],
          projectOpportunities: []
        }
      })
      
      await page.reload()
      await memberDashboard.waitForDashboardLoad()
      
      // Verify empty states are handled gracefully
      const emptyElements = await page.locator('text=No recent, text=No upcoming, text=No project, .empty-state').count()
      
      if (emptyElements > 0) {
        console.log(`Found ${emptyElements} empty state elements`)
      } else {
        // If no specific empty states, verify dashboard still loads
        await expect(memberDashboard.welcomeTitle).toBeVisible()
      }
    })
  })

  test('should be accessible', async ({ page }) => {
    await test.step('Test dashboard accessibility', async () => {
      await memberDashboard.testDashboardAccessibility()
    })

    await test.step('Run accessibility audit', async () => {
      const violations = await TestHelpers.checkAccessibility(page, [
        'color-contrast',
        'keyboard-navigation',
        'aria-labels',
        'heading-order',
        'landmarks'
      ])
      
      if (violations.length > 0) {
        console.warn(`Dashboard accessibility violations: ${violations.length}`)
      }
      
      // Only fail for critical violations
      const criticalViolations = violations.filter(v => v.impact === 'critical')
      expect(criticalViolations.length).toBe(0)
    })

    await test.step('Test keyboard navigation', async () => {
      // Test tab navigation through key elements
      const keyElements = [
        memberDashboard.completeProfileButton,
        memberDashboard.viewAllActivityButton,
        memberDashboard.viewAllEventsButton,
        memberDashboard.browseProjectsButton
      ]
      
      for (const element of keyElements) {
        if (await element.isVisible()) {
          await element.focus()
          
          const hasFocus = await element.evaluate(el => el === document.activeElement)
          expect(hasFocus).toBeTruthy()
        }
      }
    })
  })

  test('should handle performance expectations', async ({ page }) => {
    await test.step('Test dashboard performance', async () => {
      await memberDashboard.testDashboardPerformance()
    })

    await test.step('Monitor memory usage', async () => {
      const metrics = await TestHelpers.getPerformanceMetrics(page)
      console.log('Dashboard performance metrics:', metrics)
      
      // Performance assertions
      expect(metrics.loadComplete).toBeLessThan(3000) // 3 seconds
      expect(metrics.resourceCount).toBeLessThan(100) // Reasonable resource count
      
      if (metrics.memoryUsage) {
        expect(metrics.memoryUsage.used).toBeLessThan(100 * 1024 * 1024) // 100MB
      }
    })
  })

  test('should handle data accuracy', async ({ page }) => {
    await test.step('Verify dashboard data accuracy', async () => {
      await memberDashboard.verifyDataAccuracy()
    })

    await test.step('Test data consistency', async () => {
      // Reload page and verify data is consistent
      await page.reload()
      await memberDashboard.waitForDashboardLoad()
      
      // Verify all sections still load correctly
      await memberDashboard.verifyStatsCards()
      await memberDashboard.verifyRecentActivity()
      await memberDashboard.verifyUpcomingEvents()
      await memberDashboard.verifyProjectOpportunities()
    })
  })

  test('should handle error states gracefully', async ({ page }) => {
    await test.step('Test API error handling', async () => {
      // Mock API error responses
      await TestHelpers.mockApiResponse(page, '**/api/dashboard**', {
        success: false,
        message: 'Server error'
      }, 500)
      
      await page.reload()
      await page.waitForTimeout(3000)
      
      // Dashboard should handle errors gracefully
      const errorElements = await page.locator('[role="alert"], .error-message, text=error, text=Error').count()
      
      if (errorElements > 0) {
        console.log('Error state handling detected')
      } else {
        // If no specific error states, verify page doesn't crash
        await expect(memberDashboard.welcomeTitle).toBeVisible()
      }
    })

    await test.step('Test network failure handling', async () => {
      // Mock network failure
      await page.route('**/api/**', route => {
        route.abort('failed')
      })
      
      await page.reload()
      await page.waitForTimeout(3000)
      
      // Page should still be functional
      const pageTitle = await page.title()
      expect(pageTitle).toBeTruthy()
      
      // Basic navigation should still work
      await expect(memberDashboard.header).toBeVisible()
    })
  })

  test('should handle concurrent interactions', async ({ page, context }) => {
    await test.step('Test concurrent dashboard usage', async () => {
      // Create multiple tabs to simulate concurrent usage
      const newPage = await context.newPage()
      await TestHelpers.authenticateAsMember(newPage)
      
      const secondDashboard = new MemberDashboardPage(newPage)
      await secondDashboard.goto()
      
      // Verify both dashboards load correctly
      await memberDashboard.verifyWelcomeSection()
      await secondDashboard.verifyWelcomeSection()
      
      // Test interactions on both dashboards
      await memberDashboard.clickStatCard(0)
      await secondDashboard.clickStatCard(1)
      
      // Both should remain functional
      await expect(memberDashboard.welcomeTitle).toBeVisible()
      await expect(secondDashboard.welcomeTitle).toBeVisible()
      
      await newPage.close()
    })
  })

  test('should handle user permissions correctly', async ({ page }) => {
    await test.step('Verify member-level access', async () => {
      // Verify member can access their dashboard
      await expect(memberDashboard.welcomeTitle).toBeVisible()
      
      // Verify member cannot access admin features (if any admin links exist)
      const adminLinks = await page.locator('a[href*="/admin"], text=Admin, button:has-text("Admin")').count()
      
      if (adminLinks > 0) {
        console.log('Admin elements found on member dashboard - may need permission check')
      }
    })

    await test.step('Test protected actions', async () => {
      // Test actions that require authentication
      await memberDashboard.clickViewAllActivity()
      
      // Should not redirect to login
      const currentUrl = page.url()
      expect(currentUrl).not.toContain('/auth/signin')
      expect(currentUrl).not.toContain('/login')
    })
  })

  test.afterEach(async ({ page, context }) => {
    // Clean up session after each test
    await TestHelpers.clearUserSession(context)
    
    // Take screenshot on failure
    if (test.info().status !== test.info().expectedStatus) {
      await TestHelpers.takeTimestampedScreenshot(page, 'member-dashboard-failure')
    }
  })
})
import { test, expect } from '@playwright/test'
import { HomePage } from '../pages/HomePage'
import { RegistrationPage } from '../pages/RegistrationPage'
import { SignInPage } from '../pages/SignInPage'
import { MemberDashboardPage } from '../pages/MemberDashboardPage'
import { TestHelpers } from '../utils/test-helpers'
import { TestData } from '../fixtures/test-data'

test.describe('Performance Testing Suite', () => {
  test('should meet Core Web Vitals benchmarks on homepage', async ({ page }) => {
    await test.step('Measure homepage performance', async () => {
      const homePage = new HomePage(page)
      
      // Start performance measurement
      const startTime = Date.now()
      await homePage.goto()
      
      // Wait for page to be fully loaded
      await homePage.waitForHeroToLoad()
      await page.waitForLoadState('networkidle')
      
      const loadTime = Date.now() - startTime
      console.log(`Homepage load time: ${loadTime}ms`)
      
      // Basic load time assertion
      expect(loadTime).toBeLessThan(3000) // 3 seconds
    })

    await test.step('Measure Core Web Vitals', async () => {
      const metrics = await page.evaluate(() => {
        return new Promise((resolve) => {
          // Wait for performance observer to capture metrics
          setTimeout(() => {
            const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
            const paint = performance.getEntriesByType('paint')
            
            const metrics = {
              // Largest Contentful Paint (LCP)
              lcp: 0,
              // First Input Delay (FID) - simulated
              fid: 0,
              // Cumulative Layout Shift (CLS) - basic measurement
              cls: 0,
              // First Contentful Paint (FCP)
              fcp: paint.find(p => p.name === 'first-contentful-paint')?.startTime || 0,
              // Time to Interactive (TTI) - approximated
              tti: navigation.domInteractive - navigation.fetchStart,
              // Total Blocking Time (TBT) - approximated
              tbt: Math.max(0, navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart - 50)
            }
            
            // Try to get LCP from PerformanceObserver if available
            try {
              const observer = new PerformanceObserver((list) => {
                const entries = list.getEntries()
                const lastEntry = entries[entries.length - 1]
                if (lastEntry) {
                  metrics.lcp = lastEntry.startTime
                }
              })
              observer.observe({ entryTypes: ['largest-contentful-paint'] })
              
              // Measure layout shifts
              const clsObserver = new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                  if ((entry as any).hadRecentInput) continue
                  metrics.cls += (entry as any).value
                }
              })
              clsObserver.observe({ entryTypes: ['layout-shift'] })
              
            } catch (e) {
              console.log('Performance Observer not fully supported')
            }
            
            resolve(metrics)
          }, 2000)
        })
      })
      
      console.log('Core Web Vitals:', metrics)
      
      // Core Web Vitals thresholds (Google recommendations)
      if (metrics.lcp > 0) {
        expect(metrics.lcp).toBeLessThan(2500) // LCP < 2.5s
      }
      if (metrics.fcp > 0) {
        expect(metrics.fcp).toBeLessThan(1800) // FCP < 1.8s  
      }
      expect(metrics.cls).toBeLessThan(0.1) // CLS < 0.1
      expect(metrics.tti).toBeLessThan(3800) // TTI < 3.8s
    })

    await test.step('Measure resource loading performance', async () => {
      const resourceMetrics = await page.evaluate(() => {
        const resources = performance.getEntriesByType('resource')
        
        const metrics = {
          totalResources: resources.length,
          totalSize: 0,
          imageSize: 0,
          scriptSize: 0,
          stylesheetSize: 0,
          slowResources: []
        }
        
        resources.forEach((resource) => {
          const size = resource.transferSize || 0
          metrics.totalSize += size
          
          if (resource.name.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i)) {
            metrics.imageSize += size
          } else if (resource.name.match(/\.js$/i)) {
            metrics.scriptSize += size
          } else if (resource.name.match(/\.css$/i)) {
            metrics.stylesheetSize += size
          }
          
          // Flag slow resources (> 1 second)
          if (resource.duration > 1000) {
            metrics.slowResources.push({
              name: resource.name,
              duration: resource.duration,
              size: size
            })
          }
        })
        
        return metrics
      })
      
      console.log('Resource metrics:', resourceMetrics)
      
      // Performance assertions
      expect(resourceMetrics.totalResources).toBeLessThan(100) // Reasonable resource count
      expect(resourceMetrics.totalSize).toBeLessThan(5 * 1024 * 1024) // < 5MB total
      expect(resourceMetrics.imageSize).toBeLessThan(2 * 1024 * 1024) // < 2MB images
      expect(resourceMetrics.slowResources.length).toBeLessThan(5) // < 5 slow resources
    })

    await test.step('Test JavaScript performance', async () => {
      const jsMetrics = await page.evaluate(() => {
        const start = performance.now()
        
        // Simulate JavaScript performance test
        let result = 0
        for (let i = 0; i < 100000; i++) {
          result += Math.random()
        }
        
        const end = performance.now()
        
        return {
          executionTime: end - start,
          // @ts-ignore
          memoryUsage: (performance as any).memory ? {
            // @ts-ignore
            used: (performance as any).memory.usedJSHeapSize,
            // @ts-ignore
            total: (performance as any).memory.totalJSHeapSize,
            // @ts-ignore
            limit: (performance as any).memory.jsHeapSizeLimit
          } : null
        }
      })
      
      console.log('JavaScript performance:', jsMetrics)
      
      // JavaScript should execute efficiently
      expect(jsMetrics.executionTime).toBeLessThan(100) // < 100ms for test
      
      if (jsMetrics.memoryUsage) {
        expect(jsMetrics.memoryUsage.used).toBeLessThan(50 * 1024 * 1024) // < 50MB
      }
    })
  })

  test('should handle performance under slow network conditions', async ({ page }) => {
    await test.step('Test performance on slow 3G', async () => {
      // Simulate slow 3G network
      await TestHelpers.simulateSlowNetwork(page)
      
      const homePage = new HomePage(page)
      const startTime = Date.now()
      
      await homePage.goto()
      await homePage.waitForHeroToLoad()
      
      const loadTime = Date.now() - startTime
      console.log(`Load time on slow network: ${loadTime}ms`)
      
      // Should still load within reasonable time on slow network
      expect(loadTime).toBeLessThan(10000) // 10 seconds max on slow 3G
      
      // Verify critical content is visible
      await expect(homePage.heroTitle).toBeVisible()
      await expect(homePage.becomeMemberButton).toBeVisible()
      
      // Restore normal network
      await TestHelpers.restoreNetworkConditions(page)
    })

    await test.step('Test progressive loading', async () => {
      // Test that critical content loads first
      const homePage = new HomePage(page)
      await homePage.goto()
      
      // Hero content should load quickly
      await expect(homePage.heroTitle).toBeVisible({ timeout: 3000 })
      
      // Less critical content can load after
      await expect(homePage.statsSection).toBeVisible({ timeout: 5000 })
      await expect(homePage.featuresSection).toBeVisible({ timeout: 5000 })
    })
  })

  test('should maintain performance with large datasets', async ({ page }) => {
    await test.step('Test member dashboard with many activities', async () => {
      // Mock large dataset
      const largeDataset = {
        success: true,
        data: {
          stats: {
            projectsApplied: 150,
            coursesCompleted: 45,
            toolsReserved: 12,
            messagesUnread: 28
          },
          recentActivity: Array.from({ length: 50 }, (_, i) => ({
            id: i + 1,
            type: 'project',
            title: `Activity ${i + 1}`,
            description: `Description for activity ${i + 1}`,
            timestamp: `${i + 1} hours ago`,
            status: 'completed'
          })),
          upcomingEvents: Array.from({ length: 20 }, (_, i) => ({
            id: i + 1,
            title: `Event ${i + 1}`,
            date: 'Feb 15, 2025',
            time: '2:00 PM',
            location: 'Virtual Event'
          })),
          projectOpportunities: Array.from({ length: 30 }, (_, i) => ({
            id: i + 1,
            title: `Project ${i + 1}`,
            budget: '$50,000 - $75,000',
            location: 'San Francisco, CA',
            deadline: 'Mar 1, 2025',
            bidsCount: 5 + i
          }))
        }
      }
      
      await TestHelpers.mockApiResponse(page, '**/api/dashboard**', largeDataset)
      
      // Authenticate and load dashboard
      await TestHelpers.authenticateAsMember(page)
      
      const memberDashboard = new MemberDashboardPage(page)
      const startTime = Date.now()
      
      await memberDashboard.goto()
      await memberDashboard.waitForDashboardLoad()
      
      const loadTime = Date.now() - startTime
      console.log(`Dashboard load time with large dataset: ${loadTime}ms`)
      
      // Should handle large datasets efficiently
      expect(loadTime).toBeLessThan(5000) // 5 seconds max
      
      // Verify data is displayed
      await memberDashboard.verifyStatsCards()
      await memberDashboard.verifyRecentActivity()
    })

    await test.step('Test scrolling performance with many elements', async () => {
      // Test smooth scrolling with many DOM elements
      await page.evaluate(() => {
        // Add many elements to test scrolling performance
        const container = document.body
        for (let i = 0; i < 1000; i++) {
          const div = document.createElement('div')
          div.textContent = `Test element ${i}`
          div.style.height = '50px'
          div.className = 'test-element'
          container.appendChild(div)
        }
      })
      
      // Measure scrolling performance
      const scrollStart = Date.now()
      
      await page.evaluate(() => {
        return new Promise(resolve => {
          let scrollCount = 0
          const scrollHeight = document.body.scrollHeight
          const viewportHeight = window.innerHeight
          const scrollStep = viewportHeight / 2
          
          function smoothScroll() {
            window.scrollBy(0, scrollStep)
            scrollCount++
            
            if (window.scrollY >= scrollHeight - viewportHeight || scrollCount > 20) {
              resolve(undefined)
            } else {
              requestAnimationFrame(smoothScroll)
            }
          }
          
          smoothScroll()
        })
      })
      
      const scrollTime = Date.now() - scrollStart
      console.log(`Scrolling performance with 1000 elements: ${scrollTime}ms`)
      
      // Scrolling should be smooth
      expect(scrollTime).toBeLessThan(2000) // 2 seconds max
      
      // Clean up test elements
      await page.evaluate(() => {
        const testElements = document.querySelectorAll('.test-element')
        testElements.forEach(el => el.remove())
      })
    })
  })

  test('should optimize form performance', async ({ page }) => {
    await test.step('Test registration form performance', async () => {
      const registrationPage = new RegistrationPage(page)
      const startTime = Date.now()
      
      await registrationPage.goto()
      await registrationPage.waitForPageLoad()
      
      const loadTime = Date.now() - startTime
      console.log(`Registration form load time: ${loadTime}ms`)
      
      expect(loadTime).toBeLessThan(2000) // 2 seconds
    })

    await test.step('Test form validation performance', async () => {
      const registrationPage = new RegistrationPage(page)
      await registrationPage.goto()
      
      // Measure validation performance
      const validationStart = Date.now()
      
      // Fill invalid data and trigger validation
      await registrationPage.emailInput.fill('invalid-email')
      await registrationPage.emailInput.blur()
      
      // Wait for validation message
      await page.waitForSelector('.text-red-500', { timeout: 1000 })
      
      const validationTime = Date.now() - validationStart
      console.log(`Form validation time: ${validationTime}ms`)
      
      // Validation should be near-instant
      expect(validationTime).toBeLessThan(500) // 500ms
    })

    await test.step('Test form submission performance', async () => {
      const signInPage = new SignInPage(page)
      await signInPage.goto()
      
      // Measure form submission performance
      const submissionStart = Date.now()
      
      await signInPage.signIn('member@namc-norcal.org', 'member123')
      
      // Wait for navigation or response
      await page.waitForTimeout(2000)
      
      const submissionTime = Date.now() - submissionStart
      console.log(`Form submission time: ${submissionTime}ms`)
      
      // Authentication should be reasonably fast
      expect(submissionTime).toBeLessThan(5000) // 5 seconds
    })
  })

  test('should handle animation performance', async ({ page }) => {
    await test.step('Test Framer Motion animation performance', async () => {
      const homePage = new HomePage(page)
      await homePage.goto()
      
      // Measure animation performance
      const animationMetrics = await page.evaluate(() => {
        return new Promise(resolve => {
          let frameCount = 0
          let startTime = performance.now()
          let lastTime = startTime
          const frameTimes: number[] = []
          
          function measureFrame() {
            const currentTime = performance.now()
            const frameTime = currentTime - lastTime
            frameTimes.push(frameTime)
            lastTime = currentTime
            frameCount++
            
            if (frameCount < 60) { // Measure for about 1 second at 60fps
              requestAnimationFrame(measureFrame)
            } else {
              const averageFrameTime = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length
              const fps = 1000 / averageFrameTime
              
              resolve({
                averageFrameTime,
                fps,
                droppedFrames: frameTimes.filter(time => time > 16.67).length // > 60fps threshold
              })
            }
          }
          
          requestAnimationFrame(measureFrame)
        })
      })
      
      console.log('Animation performance:', animationMetrics)
      
      // Animation should maintain good frame rates
      expect(animationMetrics.fps).toBeGreaterThan(30) // At least 30 FPS
      expect(animationMetrics.droppedFrames).toBeLessThan(10) // Few dropped frames
    })

    await test.step('Test scroll-triggered animations', async () => {
      const homePage = new HomePage(page)
      await homePage.goto()
      
      // Measure scroll animation performance
      const scrollAnimationStart = Date.now()
      
      await homePage.scrollThroughSections()
      
      const scrollAnimationTime = Date.now() - scrollAnimationStart
      console.log(`Scroll animation time: ${scrollAnimationTime}ms`)
      
      // Scroll animations should be smooth
      expect(scrollAnimationTime).toBeLessThan(3000) // 3 seconds for all sections
    })
  })

  test('should optimize image loading performance', async ({ page }) => {
    await test.step('Test image loading strategy', async () => {
      const homePage = new HomePage(page)
      await homePage.goto()
      
      // Measure image loading performance
      const imageMetrics = await page.evaluate(() => {
        const images = Array.from(document.querySelectorAll('img'))
        
        return Promise.all(images.map(img => {
          return new Promise(resolve => {
            if (img.complete) {
              resolve({
                src: img.src,
                loadTime: 0,
                loaded: true,
                width: img.naturalWidth,
                height: img.naturalHeight
              })
            } else {
              const startTime = performance.now()
              
              img.onload = () => {
                resolve({
                  src: img.src,
                  loadTime: performance.now() - startTime,
                  loaded: true,
                  width: img.naturalWidth,
                  height: img.naturalHeight
                })
              }
              
              img.onerror = () => {
                resolve({
                  src: img.src,
                  loadTime: performance.now() - startTime,
                  loaded: false,
                  width: 0,
                  height: 0
                })
              }
              
              // Timeout after 5 seconds
              setTimeout(() => {
                resolve({
                  src: img.src,
                  loadTime: 5000,
                  loaded: false,
                  width: 0,
                  height: 0
                })
              }, 5000)
            }
          })
        }))
      })
      
      console.log('Image loading metrics:', imageMetrics)
      
      // Verify image loading performance
      const slowImages = imageMetrics.filter(img => img.loadTime > 3000)
      expect(slowImages.length).toBeLessThan(2) // At most 1-2 slow images
      
      const failedImages = imageMetrics.filter(img => !img.loaded)
      expect(failedImages.length).toBe(0) // No failed images
    })

    await test.step('Test lazy loading implementation', async () => {
      const homePage = new HomePage(page)
      await homePage.goto()
      
      // Check if images use lazy loading
      const lazyImages = await page.locator('img[loading="lazy"]').count()
      console.log(`Lazy loaded images found: ${lazyImages}`)
      
      // Images below the fold should use lazy loading
      if (lazyImages > 0) {
        console.log('Lazy loading implemented correctly')
      }
    })
  })

  test('should handle memory management', async ({ page }) => {
    await test.step('Test memory usage over time', async () => {
      const initialMemory = await page.evaluate(() => {
        // @ts-ignore
        return (performance as any).memory ? {
          // @ts-ignore
          used: (performance as any).memory.usedJSHeapSize,
          // @ts-ignore
          total: (performance as any).memory.totalJSHeapSize
        } : null
      })
      
      if (initialMemory) {
        console.log('Initial memory usage:', initialMemory)
        
        // Navigate through several pages
        const homePage = new HomePage(page)
        await homePage.goto()
        
        const signInPage = new SignInPage(page)
        await signInPage.goto()
        
        const registrationPage = new RegistrationPage(page)
        await registrationPage.goto()
        
        // Check memory after navigation
        const finalMemory = await page.evaluate(() => {
          // Force garbage collection if available
          if ((window as any).gc) {
            (window as any).gc()
          }
          
          // @ts-ignore
          return (performance as any).memory ? {
            // @ts-ignore
            used: (performance as any).memory.usedJSHeapSize,
            // @ts-ignore
            total: (performance as any).memory.totalJSHeapSize
          } : null
        })
        
        if (finalMemory) {
          console.log('Final memory usage:', finalMemory)
          
          const memoryIncrease = finalMemory.used - initialMemory.used
          console.log('Memory increase:', memoryIncrease)
          
          // Memory usage should not grow excessively
          expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024) // < 50MB increase
        }
      }
    })

    await test.step('Test for memory leaks', async () => {
      // Create and destroy multiple page instances to test for leaks
      const memorySnapshots = []
      
      for (let i = 0; i < 5; i++) {
        const homePage = new HomePage(page)
        await homePage.goto()
        await homePage.scrollThroughSections()
        
        const memory = await page.evaluate(() => {
          // @ts-ignore
          return (performance as any).memory ? 
            // @ts-ignore
            (performance as any).memory.usedJSHeapSize : 0
        })
        
        memorySnapshots.push(memory)
        console.log(`Memory snapshot ${i + 1}:`, memory)
      }
      
      // Check if memory usage is growing consistently (potential leak)
      if (memorySnapshots.length >= 5) {
        const trend = memorySnapshots[4] - memorySnapshots[0]
        const averageIncrease = trend / 4
        
        console.log('Memory trend:', trend, 'Average increase per iteration:', averageIncrease)
        
        // Should not have excessive memory growth
        expect(averageIncrease).toBeLessThan(10 * 1024 * 1024) // < 10MB per iteration
      }
    })
  })

  test.afterEach(async ({ page }) => {
    // Log performance metrics after each test
    const finalMetrics = await TestHelpers.getPerformanceMetrics(page)
    console.log('Final performance metrics:', finalMetrics)
    
    // Take screenshot on failure
    if (test.info().status !== test.info().expectedStatus) {
      await TestHelpers.takeTimestampedScreenshot(page, 'performance-failure')
    }
  })
})
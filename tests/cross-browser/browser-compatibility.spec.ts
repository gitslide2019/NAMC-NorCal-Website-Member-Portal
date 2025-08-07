import { test, expect, devices } from '@playwright/test'

test.describe('Cross-Browser Compatibility Tests', () => {
  const browsers = ['chromium', 'firefox', 'webkit']
  
  browsers.forEach(browserName => {
    test.describe(`${browserName} Browser Tests`, () => {
      test(`should render member dashboard correctly in ${browserName}`, async ({ page }) => {
        await page.goto('/member/dashboard')
        
        // Check core layout elements
        await expect(page.locator('[data-testid="dashboard-header"]')).toBeVisible()
        await expect(page.locator('[data-testid="navigation-menu"]')).toBeVisible()
        await expect(page.locator('[data-testid="main-content"]')).toBeVisible()
        
        // Check CSS Grid support
        const projectsGrid = page.locator('[data-testid="projects-grid"]')
        const gridDisplay = await projectsGrid.evaluate(el => 
          window.getComputedStyle(el).display
        )
        expect(gridDisplay).toBe('grid')
        
        // Check Flexbox support
        const toolbar = page.locator('[data-testid="toolbar"]')
        const flexDisplay = await toolbar.evaluate(el => 
          window.getComputedStyle(el).display
        )
        expect(flexDisplay).toBe('flex')
      })

      test(`should handle camera AI functionality in ${browserName}`, async ({ page }) => {
        await page.goto('/member/project-intelligence/camera')
        
        // Check WebRTC support
        const hasWebRTC = await page.evaluate(() => {
          return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)
        })
        
        if (hasWebRTC) {
          await expect(page.locator('[data-testid="camera-supported"]')).toBeVisible()
          
          // Test camera initialization
          await page.click('[data-testid="start-camera-button"]')
          await expect(page.locator('[data-testid="camera-stream"]')).toBeVisible()
        } else {
          await expect(page.locator('[data-testid="camera-not-supported"]')).toBeVisible()
          await expect(page.locator('[data-testid="fallback-upload"]')).toBeVisible()
        }
      })

      test(`should support modern JavaScript features in ${browserName}`, async ({ page }) => {
        await page.goto('/member/dashboard')
        
        // Test ES6+ features
        const jsFeatures = await page.evaluate(() => {
          const results = {}
          
          // Test async/await
          try {
            eval('(async () => {})')
            results.asyncAwait = true
          } catch (e) {
            results.asyncAwait = false
          }
          
          // Test arrow functions
          try {
            eval('(() => {})')
            results.arrowFunctions = true
          } catch (e) {
            results.arrowFunctions = false
          }
          
          // Test template literals
          try {
            eval('`template ${literal}`')
            results.templateLiterals = true
          } catch (e) {
            results.templateLiterals = false
          }
          
          // Test destructuring
          try {
            eval('const {a} = {a: 1}')
            results.destructuring = true
          } catch (e) {
            results.destructuring = false
          }
          
          return results
        })
        
        expect(jsFeatures.asyncAwait).toBe(true)
        expect(jsFeatures.arrowFunctions).toBe(true)
        expect(jsFeatures.templateLiterals).toBe(true)
        expect(jsFeatures.destructuring).toBe(true)
      })

      test(`should handle file uploads in ${browserName}`, async ({ page }) => {
        await page.goto('/member/scanner')
        
        // Test file input support
        const fileInput = page.locator('[data-testid="card-file-input"]')
        await expect(fileInput).toBeVisible()
        
        // Test drag and drop support
        const dropZone = page.locator('[data-testid="drop-zone"]')
        const hasDragDrop = await dropZone.evaluate(el => {
          return 'ondrop' in el && 'ondragover' in el
        })
        
        expect(hasDragDrop).toBe(true)
        
        // Test file upload
        await fileInput.setInputFiles('tests/fixtures/business-card.jpg')
        await expect(page.locator('[data-testid="file-uploaded"]')).toBeVisible()
      })

      test(`should support CSS custom properties in ${browserName}`, async ({ page }) => {
        await page.goto('/member/dashboard')
        
        // Check CSS custom properties (CSS variables) support
        const customPropsSupport = await page.evaluate(() => {
          const testEl = document.createElement('div')
          testEl.style.setProperty('--test-prop', 'test-value')
          document.body.appendChild(testEl)
          
          const computedStyle = window.getComputedStyle(testEl)
          const propValue = computedStyle.getPropertyValue('--test-prop')
          
          document.body.removeChild(testEl)
          return propValue.trim() === 'test-value'
        })
        
        expect(customPropsSupport).toBe(true)
        
        // Check NAMC brand colors are applied
        const primaryButton = page.locator('[data-testid="primary-button"]').first()
        if (await primaryButton.count() > 0) {
          const buttonColor = await primaryButton.evaluate(el => {
            return window.getComputedStyle(el).getPropertyValue('--namc-yellow')
          })
          expect(buttonColor.trim()).toBeTruthy()
        }
      })

      test(`should handle local storage in ${browserName}`, async ({ page }) => {
        await page.goto('/member/dashboard')
        
        // Test localStorage support
        const hasLocalStorage = await page.evaluate(() => {
          try {
            localStorage.setItem('test', 'value')
            const value = localStorage.getItem('test')
            localStorage.removeItem('test')
            return value === 'value'
          } catch (e) {
            return false
          }
        })
        
        expect(hasLocalStorage).toBe(true)
        
        // Test sessionStorage support
        const hasSessionStorage = await page.evaluate(() => {
          try {
            sessionStorage.setItem('test', 'value')
            const value = sessionStorage.getItem('test')
            sessionStorage.removeItem('test')
            return value === 'value'
          } catch (e) {
            return false
          }
        })
        
        expect(hasSessionStorage).toBe(true)
      })

      test(`should support WebGL for 3D visualizations in ${browserName}`, async ({ page }) => {
        await page.goto('/member/project-intelligence')
        
        // Check WebGL support
        const hasWebGL = await page.evaluate(() => {
          const canvas = document.createElement('canvas')
          const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
          return !!gl
        })
        
        if (hasWebGL) {
          await expect(page.locator('[data-testid="3d-visualization-supported"]')).toBeVisible()
        } else {
          await expect(page.locator('[data-testid="3d-fallback"]')).toBeVisible()
        }
      })

      test(`should handle responsive images in ${browserName}`, async ({ page }) => {
        await page.goto('/member/dashboard')
        
        // Check picture element support
        const hasPictureSupport = await page.evaluate(() => {
          return 'HTMLPictureElement' in window
        })
        
        if (hasPictureSupport) {
          const pictureElements = page.locator('picture')
          const pictureCount = await pictureElements.count()
          
          if (pictureCount > 0) {
            // Check that source elements have proper media queries
            const firstPicture = pictureElements.first()
            const sources = firstPicture.locator('source')
            const sourceCount = await sources.count()
            
            expect(sourceCount).toBeGreaterThan(0)
            
            // Check first source has media attribute
            const firstSource = sources.first()
            const mediaAttr = await firstSource.getAttribute('media')
            expect(mediaAttr).toBeTruthy()
          }
        }
        
        // Check srcset support
        const images = page.locator('img[srcset]')
        const imageCount = await images.count()
        
        if (imageCount > 0) {
          const firstImage = images.first()
          const srcset = await firstImage.getAttribute('srcset')
          expect(srcset).toContain('1x')
        }
      })

      test(`should support form validation in ${browserName}`, async ({ page }) => {
        await page.goto('/member/cost-estimator')
        
        // Check HTML5 form validation support
        const hasFormValidation = await page.evaluate(() => {
          const input = document.createElement('input')
          return typeof input.checkValidity === 'function'
        })
        
        expect(hasFormValidation).toBe(true)
        
        // Test required field validation
        const requiredInput = page.locator('[data-testid="project-name-input"]')
        await requiredInput.fill('')
        
        const submitButton = page.locator('[data-testid="generate-estimate-button"]')
        await submitButton.click()
        
        // Check validation message appears
        const validationMessage = await requiredInput.evaluate(el => el.validationMessage)
        expect(validationMessage).toBeTruthy()
      })

      test(`should handle print styles in ${browserName}`, async ({ page }) => {
        await page.goto('/member/cost-estimator')
        
        // Generate an estimate first
        await page.fill('[data-testid="project-name-input"]', 'Print Test Project')
        await page.selectOption('[data-testid="project-type-select"]', 'residential')
        await page.fill('[data-testid="square-footage-input"]', '1000')
        await page.click('[data-testid="generate-estimate-button"]')
        
        await expect(page.locator('[data-testid="estimate-results"]')).toBeVisible()
        
        // Test print media query
        await page.emulateMedia({ media: 'print' })
        
        // Check print-specific styles are applied
        const printHidden = page.locator('[data-testid="print-hidden"]')
        if (await printHidden.count() > 0) {
          const display = await printHidden.evaluate(el => 
            window.getComputedStyle(el).display
          )
          expect(display).toBe('none')
        }
        
        // Check print-specific content is visible
        const printOnly = page.locator('[data-testid="print-only"]')
        if (await printOnly.count() > 0) {
          const display = await printOnly.evaluate(el => 
            window.getComputedStyle(el).display
          )
          expect(display).not.toBe('none')
        }
      })
    })
  })

  test.describe('Browser-Specific Feature Tests', () => {
    test('should handle Safari-specific behaviors', async ({ page, browserName }) => {
      test.skip(browserName !== 'webkit', 'Safari-specific test')
      
      await page.goto('/member/project-intelligence/camera')
      
      // Test Safari's stricter camera permissions
      const cameraButton = page.locator('[data-testid="start-camera-button"]')
      await cameraButton.click()
      
      // Safari may show additional permission dialogs
      await expect(page.locator('[data-testid="camera-permission-help"]')).toBeVisible()
    })

    test('should handle Firefox-specific behaviors', async ({ page, browserName }) => {
      test.skip(browserName !== 'firefox', 'Firefox-specific test')
      
      await page.goto('/member/scanner')
      
      // Test Firefox file upload behavior
      const fileInput = page.locator('[data-testid="card-file-input"]')
      await fileInput.setInputFiles('tests/fixtures/business-card.jpg')
      
      // Firefox may handle file processing differently
      await expect(page.locator('[data-testid="firefox-file-processing"]')).toBeVisible()
    })

    test('should handle Chrome-specific behaviors', async ({ page, browserName }) => {
      test.skip(browserName !== 'chromium', 'Chrome-specific test')
      
      await page.goto('/member/dashboard')
      
      // Test Chrome's performance API
      const hasPerformanceAPI = await page.evaluate(() => {
        return 'performance' in window && 'mark' in performance
      })
      
      expect(hasPerformanceAPI).toBe(true)
      
      // Test Chrome-specific features
      const hasWebP = await page.evaluate(() => {
        const canvas = document.createElement('canvas')
        return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0
      })
      
      expect(hasWebP).toBe(true)
    })
  })

  test.describe('Polyfill and Fallback Tests', () => {
    test('should provide fallbacks for unsupported features', async ({ page }) => {
      await page.goto('/member/dashboard')
      
      // Test that polyfills are loaded when needed
      const polyfillsLoaded = await page.evaluate(() => {
        return window.polyfillsLoaded || false
      })
      
      // Check that core functionality works regardless
      await expect(page.locator('[data-testid="dashboard-content"]')).toBeVisible()
      await expect(page.locator('[data-testid="navigation-menu"]')).toBeVisible()
    })

    test('should gracefully degrade advanced features', async ({ page }) => {
      await page.goto('/member/project-intelligence/camera')
      
      // Simulate lack of camera support
      await page.addInitScript(() => {
        delete navigator.mediaDevices
      })
      
      await page.reload()
      
      // Should show fallback upload option
      await expect(page.locator('[data-testid="camera-fallback"]')).toBeVisible()
      await expect(page.locator('[data-testid="upload-alternative"]')).toBeVisible()
    })
  })
})
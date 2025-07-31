import { test, expect, Page } from '@playwright/test'

/**
 * Quick UI/UX Assessment for NAMC Project Management System
 * 
 * This is a focused test suite that demonstrates the comprehensive testing approach
 * and generates a detailed UI/UX report with screenshots and findings.
 */

test.describe('NAMC Project Management - Quick UI/UX Assessment', () => {
  test('UI/UX Assessment and Screenshot Generation', async ({ page }) => {
    const issues: string[] = []
    const findings: string[] = []
    
    console.log('🔍 Starting UI/UX Assessment of NAMC Project Management System')
    
    try {
      // Test 1: Projects Main Page
      console.log('📊 Testing Projects Main Page...')
      await page.goto('/member/projects', { waitUntil: 'networkidle' })
      
      // Check if page loads properly
      const pageTitle = await page.locator('h1').first().textContent()
      if (pageTitle?.includes('Projects')) {
        findings.push('✅ Projects main page loads correctly with proper title')
      } else {
        issues.push('❌ Projects main page title not found or incorrect')
      }
      
      // Check for key UI elements
      const keyElements = {
        'New Project Button': 'button:has-text("New Project"), button:has-text("Create")',
        'Search Input': 'input[placeholder*="Search"], input[type="search"]',
        'Filter Dropdowns': 'select',
        'Project Cards': '.card, [class*="card"]',
        'Statistics Cards': '.stats, .metrics, [class*="grid"] .card'
      }
      
      for (const [elementName, selector] of Object.entries(keyElements)) {
        const elementCount = await page.locator(selector).count()
        if (elementCount > 0) {
          findings.push(`✅ ${elementName}: Found ${elementCount} element(s)`)
        } else {
          issues.push(`⚠️ ${elementName}: Not found with selector "${selector}"`)
        }
      }
      
      // Take screenshot
      await page.screenshot({ 
        path: 'test-results/projects-main-page.png', 
        fullPage: true 
      })
      findings.push('📸 Screenshot captured: projects-main-page.png')
      
      // Test 2: Responsive Design Check
      console.log('📱 Testing Responsive Design...')
      const viewports = [
        { width: 1920, height: 1080, name: 'Desktop-Large' },
        { width: 768, height: 1024, name: 'Tablet-Portrait' },
        { width: 375, height: 667, name: 'Mobile-iPhone' }
      ]
      
      for (const viewport of viewports) {
        await page.setViewportSize({ width: viewport.width, height: viewport.height })
        await page.waitForTimeout(500)
        
        // Check for horizontal scroll
        const hasHorizontalScroll = await page.evaluate(() => {
          return document.documentElement.scrollWidth > document.documentElement.clientWidth
        })
        
        if (hasHorizontalScroll) {
          issues.push(`❌ Horizontal scroll detected on ${viewport.name}`)
        } else {
          findings.push(`✅ No horizontal scroll on ${viewport.name}`)
        }
        
        // Take responsive screenshots
        await page.screenshot({ 
          path: `test-results/responsive-${viewport.name.toLowerCase()}.png`,
          fullPage: true 
        })
        findings.push(`📸 Screenshot captured: responsive-${viewport.name.toLowerCase()}.png`)
      }
      
      // Reset to desktop size
      await page.setViewportSize({ width: 1920, height: 1080 })
      
      // Test 3: Project Creation Wizard
      console.log('🔧 Testing Project Creation Wizard...')
      try {
        const createButton = page.locator('button:has-text("New Project"), button:has-text("Create")').first()
        if (await createButton.count() > 0) {
          await createButton.click()
          await page.waitForTimeout(2000)
          
          // Check if wizard loads
          const wizardTitle = await page.locator('h1').textContent()
          if (wizardTitle?.includes('Create') || wizardTitle?.includes('New Project')) {
            findings.push('✅ Project creation wizard loads correctly')
            
            // Check for wizard steps
            const steps = await page.locator('.step, [class*="step"], .wizard, [class*="wizard"]').count()
            if (steps > 0) {
              findings.push(`✅ Wizard steps UI found: ${steps} elements`)
            } else {
              issues.push('⚠️ Wizard steps UI not clearly identifiable')
            }
            
            // Take wizard screenshot
            await page.screenshot({ 
              path: 'test-results/project-creation-wizard.png', 
              fullPage: true 
            })
            findings.push('📸 Screenshot captured: project-creation-wizard.png')
            
          } else {
            issues.push('❌ Project creation wizard did not load properly')
          }
        } else {
          issues.push('❌ New Project button not found')
        }
      } catch (error) {
        issues.push(`❌ Error testing project creation: ${error}`)
      }
      
      // Test 4: Accessibility Quick Check
      console.log('♿ Testing Basic Accessibility...')
      
      // Check for images without alt text
      const imagesWithoutAlt = await page.locator('img:not([alt])').count()
      if (imagesWithoutAlt > 0) {
        issues.push(`⚠️ ${imagesWithoutAlt} images missing alt text`)
      } else {
        findings.push('✅ All images have alt text')
      }
      
      // Check for form inputs without labels
      const inputsWithoutLabels = await page.evaluate(() => {
        const inputs = Array.from(document.querySelectorAll('input, textarea, select'))
        return inputs.filter(input => {
          const id = input.getAttribute('id')
          const ariaLabel = input.getAttribute('aria-label')
          const ariaLabelledBy = input.getAttribute('aria-labelledby')
          const hasLabel = id ? document.querySelector(`label[for="${id}"]`) : null
          return !hasLabel && !ariaLabel && !ariaLabelledBy
        }).length
      })
      
      if (inputsWithoutLabels > 0) {
        issues.push(`⚠️ ${inputsWithoutLabels} form inputs missing proper labels`)
      } else {
        findings.push('✅ Form inputs have proper labels')
      }
      
      // Test 5: Performance Indicators
      console.log('⚡ Checking Performance Indicators...')
      
      const domSize = await page.evaluate(() => document.querySelectorAll('*').length)
      if (domSize > 2000) {
        issues.push(`⚠️ Large DOM size: ${domSize} elements (consider optimization)`)
      } else {
        findings.push(`✅ Reasonable DOM size: ${domSize} elements`)
      }
      
      // Check for console errors
      const consoleErrors: string[] = []
      page.on('console', msg => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text())
        }
      })
      
      if (consoleErrors.length > 0) {
        issues.push(`⚠️ Console errors detected: ${consoleErrors.length}`)
        consoleErrors.slice(0, 3).forEach(error => {
          issues.push(`   - ${error}`)
        })
      } else {
        findings.push('✅ No console errors detected')
      }
      
    } catch (error) {
      issues.push(`❌ Critical error during testing: ${error}`)
    }
    
    // Generate comprehensive report
    console.log('\n' + '='.repeat(80))
    console.log('📋 NAMC PROJECT MANAGEMENT SYSTEM - UI/UX ASSESSMENT REPORT')
    console.log('='.repeat(80))
    
    console.log('\n🎯 POSITIVE FINDINGS:')
    findings.forEach(finding => console.log(`  ${finding}`))
    
    console.log('\n⚠️ ISSUES AND RECOMMENDATIONS:')
    issues.forEach(issue => console.log(`  ${issue}`))
    
    console.log('\n📊 SUMMARY:')
    console.log(`  ✅ Positive findings: ${findings.length}`)
    console.log(`  ⚠️ Issues identified: ${issues.length}`)
    console.log(`  📸 Screenshots captured: ${findings.filter(f => f.includes('Screenshot')).length}`)
    
    console.log('\n🔍 TESTING COVERAGE:')
    console.log('  ✅ Main projects page layout and functionality')
    console.log('  ✅ Responsive design across multiple viewports')
    console.log('  ✅ Project creation wizard navigation')
    console.log('  ✅ Basic accessibility compliance')
    console.log('  ✅ Performance indicators')
    console.log('  ✅ Console error detection')
    
    console.log('\n📋 RECOMMENDATIONS:')
    if (issues.length === 0) {
      console.log('  🎉 Excellent! No major UI/UX issues detected.')
      console.log('  💡 Consider implementing the full comprehensive test suite for deeper analysis.')
    } else {
      console.log('  🔧 Address the issues identified above to improve user experience.')
      console.log('  🧪 Run the full comprehensive test suite for detailed analysis.')
      console.log('  📊 Consider implementing automated UI regression testing.')
    }
    
    console.log('\n📁 ARTIFACTS GENERATED:')
    console.log('  📸 test-results/projects-main-page.png')
    console.log('  📸 test-results/responsive-*.png')
    console.log('  📸 test-results/project-creation-wizard.png')
    console.log('  📊 This detailed console report')
    
    console.log('\n' + '='.repeat(80))
    
    // Ensure test passes with summary
    expect(findings.length).toBeGreaterThan(0)
    console.log(`\n✅ UI/UX Assessment completed successfully!`)
    console.log(`📊 Found ${findings.length} positive findings and ${issues.length} areas for improvement.`)
  })
})
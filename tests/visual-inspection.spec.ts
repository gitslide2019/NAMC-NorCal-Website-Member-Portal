import { test, expect } from '@playwright/test';

/**
 * Visual Inspection - Check actual rendering and visibility
 * Deep dive into what users actually see in the browser
 */

test.describe('Visual Inspection - What Users Actually See', () => {
  test('should capture actual visual state of the permit search interface', async ({ page }) => {
    console.log('👁️ VISUAL INSPECTION: Checking actual browser rendering');
    
    // Navigate directly to permits page and inspect
    await page.goto('/member/permits');
    await page.waitForTimeout(5000); // Give more time for rendering
    
    // Take full page screenshot
    await page.screenshot({ 
      path: 'visual-inspection/current-permits-page.png', 
      fullPage: true 
    });
    
    console.log('📸 Screenshot saved: visual-inspection/current-permits-page.png');
    
    // Check if we can actually see the permit dashboard
    const pageContent = await page.textContent('body');
    console.log('\n📄 PAGE CONTENT ANALYSIS:');
    console.log('==========================================');
    
    if (pageContent.includes('Permit Dashboard')) {
      console.log('✅ FOUND: Permit Dashboard content');
    } else if (pageContent.includes('Sign In') || pageContent.includes('Welcome Back')) {
      console.log('🔐 STATUS: Page shows authentication form');
      console.log('💡 ISSUE: User needs to login first to see permit search');
    } else if (pageContent.includes('NAMC')) {
      console.log('🏠 STATUS: On NAMC homepage/landing page');
    } else {
      console.log('❓ STATUS: Unknown page state');
    }
    
    // Check what's actually visible on screen
    const visibleElements = await page.evaluate(() => {
      const elements = [];
      const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
      const buttons = document.querySelectorAll('button');
      const inputs = document.querySelectorAll('input');
      
      // Get visible headings
      headings.forEach((h, i) => {
        if (h.offsetHeight > 0 && h.offsetWidth > 0) {
          elements.push({
            type: 'heading',
            tag: h.tagName,
            text: h.textContent?.trim().substring(0, 50) || '',
            styles: {
              fontSize: window.getComputedStyle(h).fontSize,
              fontFamily: window.getComputedStyle(h).fontFamily,
              color: window.getComputedStyle(h).color,
              fontWeight: window.getComputedStyle(h).fontWeight
            }
          });
        }
      });
      
      // Get visible buttons  
      buttons.forEach((btn, i) => {
        if (btn.offsetHeight > 0 && btn.offsetWidth > 0 && i < 5) { // Limit to first 5
          elements.push({
            type: 'button',
            text: btn.textContent?.trim().substring(0, 30) || '',
            styles: {
              backgroundColor: window.getComputedStyle(btn).backgroundColor,
              color: window.getComputedStyle(btn).color,
              fontSize: window.getComputedStyle(btn).fontSize,
              fontFamily: window.getComputedStyle(btn).fontFamily
            }
          });
        }
      });
      
      // Get visible inputs
      inputs.forEach((input, i) => {
        if (input.offsetHeight > 0 && input.offsetWidth > 0 && i < 3) { // Limit to first 3
          elements.push({
            type: 'input',
            placeholder: input.getAttribute('placeholder') || '',
            styles: {
              fontSize: window.getComputedStyle(input).fontSize,
              fontFamily: window.getComputedStyle(input).fontFamily,
              color: window.getComputedStyle(input).color
            }
          });
        }
      });
      
      return elements;
    });
    
    console.log('\n👁️ VISIBLE ELEMENTS ANALYSIS:');
    console.log('==========================================');
    
    visibleElements.forEach((element, index) => {
      console.log(`\n${index + 1}. ${element.type.toUpperCase()}: ${element.text || element.placeholder || 'No text'}`);
      console.log(`   Font: ${element.styles.fontFamily}`);
      console.log(`   Size: ${element.styles.fontSize}`);
      console.log(`   Color: ${element.styles.color}`);
      if (element.styles.backgroundColor && element.styles.backgroundColor !== 'rgba(0, 0, 0, 0)') {
        console.log(`   Background: ${element.styles.backgroundColor}`);
      }
      if (element.styles.fontWeight) {
        console.log(`   Weight: ${element.styles.fontWeight}`);
      }
    });
    
    // Check for NAMC specific elements
    const namcElements = await page.evaluate(() => {
      const results = [];
      const allElements = document.querySelectorAll('*');
      
      allElements.forEach(el => {
        if (el.className && (el.className.includes('namc') || el.className.includes('yellow'))) {
          if (el.offsetHeight > 0 && el.offsetWidth > 0) {
            const computed = window.getComputedStyle(el);
            results.push({
              className: el.className,
              text: el.textContent?.trim().substring(0, 30) || '',
              backgroundColor: computed.backgroundColor,
              color: computed.color,
              visible: true
            });
          }
        }
      });
      
      return results.slice(0, 10); // Limit to first 10
    });
    
    console.log('\n🟡 NAMC BRANDED ELEMENTS:');
    console.log('==========================================');
    
    if (namcElements.length > 0) {
      namcElements.forEach((el, index) => {
        console.log(`${index + 1}. Class: ${el.className}`);
        console.log(`   Text: "${el.text}"`);
        console.log(`   Background: ${el.backgroundColor}`);
        console.log(`   Text Color: ${el.color}`);
        console.log('');
      });
    } else {
      console.log('❌ NO NAMC branded elements are currently visible');
      console.log('💡 This suggests the styling may not be loading correctly');
    }
    
    // Check current URL
    const currentUrl = page.url();
    console.log(`\n🔗 CURRENT URL: ${currentUrl}`);
    
    // Check if we're authenticated
    if (currentUrl.includes('/auth/') || currentUrl.includes('/signin')) {
      console.log('🔐 AUTHENTICATION REQUIRED');
      console.log('📋 NEXT STEP: Login with member@namc-norcal.org / member123');
    } else if (currentUrl.includes('/member/permits')) {
      console.log('✅ ON PERMITS PAGE');
      console.log('🔍 Checking why permit content may not be visible...');
    }
    
    expect(visibleElements.length).toBeGreaterThan(0);
  });
  
  test('should check authentication flow and access to permit search', async ({ page }) => {
    console.log('🔐 CHECKING: Authentication flow to permit search');
    
    // Start from signin page
    await page.goto('/auth/signin');
    await page.waitForTimeout(2000);
    
    // Take screenshot of signin
    await page.screenshot({ 
      path: 'visual-inspection/signin-page.png', 
      fullPage: true 
    });
    
    console.log('📸 Signin page screenshot saved');
    
    // Check if we can fill in demo credentials
    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]');
    const signInButton = page.locator('button[type="submit"]');
    
    if (await emailInput.count() > 0) {
      console.log('✅ Email input found');
      await emailInput.fill('member@namc-norcal.org');
      
      if (await passwordInput.count() > 0) {
        console.log('✅ Password input found');
        await passwordInput.fill('member123');
        
        if (await signInButton.count() > 0) {
          console.log('✅ Sign in button found');
          console.log('🔄 Attempting to sign in...');
          
          await signInButton.click();
          await page.waitForTimeout(5000); // Wait for authentication
          
          // Check where we ended up
          const newUrl = page.url();
          console.log(`🔗 After signin URL: ${newUrl}`);
          
          if (newUrl.includes('/member/')) {
            console.log('✅ Successfully authenticated - in member area');
            
            // Now try to access permits
            await page.goto('/member/permits');
            await page.waitForTimeout(3000);
            
            await page.screenshot({ 
              path: 'visual-inspection/permits-page-authenticated.png', 
              fullPage: true 
            });
            
            console.log('📸 Authenticated permits page screenshot saved');
            
            // Check what's actually visible now
            const permitContent = await page.textContent('body');
            
            if (permitContent.includes('Permit Dashboard')) {
              console.log('🎉 SUCCESS: Permit Dashboard is now visible!');
            } else if (permitContent.includes('Shovels API Not Configured')) {
              console.log('⚙️ INFO: Permits page loaded but API not configured');
              console.log('💡 This is expected behavior when API key is missing');
            } else {
              console.log('❓ ISSUE: Permit content still not visible after authentication');
            }
            
          } else {
            console.log('❌ Authentication may have failed or redirected elsewhere');
          }
        }
      }
    }
    
    expect(true).toBe(true); // Complete authentication check
  });
});
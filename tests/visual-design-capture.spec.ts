import { test, expect } from '@playwright/test';

/**
 * Visual Design Capture - Screenshots for Design Review
 * Captures key interface states for visual design analysis
 */

test.describe('Visual Design Documentation', () => {
  test('should capture key interface screenshots for design review', async ({ page }) => {
    console.log('📸 CAPTURING: Visual Design Screenshots');
    
    // 1. Homepage/Landing Design
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ 
      path: 'design-screenshots/01-homepage-landing.png', 
      fullPage: true 
    });
    console.log('✅ Captured: Homepage landing design');
    
    // 2. Authentication Page Design  
    await page.goto('/auth/signin');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ 
      path: 'design-screenshots/02-signin-page.png', 
      fullPage: true 
    });
    console.log('✅ Captured: Authentication page design');
    
    // 3. Mobile Authentication View
    await page.setViewportSize({ width: 375, height: 667 });
    await page.screenshot({ 
      path: 'design-screenshots/03-signin-mobile.png', 
      fullPage: true 
    });
    console.log('✅ Captured: Mobile authentication design');
    
    // 4. Tablet View
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.screenshot({ 
      path: 'design-screenshots/04-signin-tablet.png', 
      fullPage: true 
    });
    console.log('✅ Captured: Tablet authentication design');
    
    // 5. Desktop View (reset)
    await page.setViewportSize({ width: 1200, height: 800 });
    
    // 6. Permits Page (if accessible)
    await page.goto('/member/permits');
    await page.waitForTimeout(3000);
    await page.screenshot({ 
      path: 'design-screenshots/05-permits-page.png', 
      fullPage: true 
    });
    console.log('✅ Captured: Permits page design');
    
    // 7. Color Scheme Analysis
    const colorAnalysis = await page.evaluate(() => {
      const elements = document.querySelectorAll('[class*="namc-yellow"], [class*="namc-black"], [class*="yellow"]');
      const colors = [];
      
      elements.forEach((el, index) => {
        if (index < 10) { // Limit to first 10 for analysis
          const computed = window.getComputedStyle(el);
          colors.push({
            className: el.className,
            backgroundColor: computed.backgroundColor,
            color: computed.color,
            borderColor: computed.borderColor
          });
        }
      });
      
      return colors;
    });
    
    console.log('🎨 NAMC Color Analysis:');
    colorAnalysis.forEach((color, index) => {
      console.log(`  ${index + 1}. ${color.className}`);
      console.log(`     Background: ${color.backgroundColor}`);
      console.log(`     Text: ${color.color}`);
      console.log(`     Border: ${color.borderColor}`);
    });
    
    console.log('\n📊 VISUAL DESIGN CAPTURE COMPLETE');
    console.log('Screenshots saved to: design-screenshots/');
    console.log('Review files:');
    console.log('  • 01-homepage-landing.png');
    console.log('  • 02-signin-page.png');
    console.log('  • 03-signin-mobile.png');
    console.log('  • 04-signin-tablet.png');
    console.log('  • 05-permits-page.png');
    
    expect(colorAnalysis.length).toBeGreaterThan(0);
  });
  
  test('should analyze NAMC brand color implementation', async ({ page }) => {
    console.log('🎨 ANALYZING: NAMC Brand Colors');
    
    await page.goto('/auth/signin');
    await page.waitForLoadState('networkidle');
    
    // Check for specific NAMC colors
    const namcColors = await page.evaluate(() => {
      const results = {
        namcYellow: '#FFD700',
        accentYellow: '#FFA500', 
        namcBlack: '#1A1A1A',
        lightYellow: '#FFF8DC'
      };
      
      const foundColors = {
        namcYellow: 0,
        accentYellow: 0,
        namcBlack: 0,
        lightYellow: 0,
        other: []
      };
      
      // Check all elements for NAMC colors
      const allElements = document.querySelectorAll('*');
      allElements.forEach(el => {
        const computed = window.getComputedStyle(el);
        const bgColor = computed.backgroundColor;
        const textColor = computed.color;
        const borderColor = computed.borderColor;
        
        [bgColor, textColor, borderColor].forEach(color => {
          if (color.includes('255, 215, 0') || color.includes('#FFD700')) {
            foundColors.namcYellow++;
          } else if (color.includes('255, 165, 0') || color.includes('#FFA500')) {
            foundColors.accentYellow++;
          } else if (color.includes('26, 26, 26') || color.includes('#1A1A1A')) {
            foundColors.namcBlack++;
          } else if (color.includes('255, 248, 220') || color.includes('#FFF8DC')) {
            foundColors.lightYellow++;
          }
        });
      });
      
      return foundColors;
    });
    
    console.log('📊 NAMC Color Usage Analysis:');
    console.log(`  🟡 NAMC Yellow (#FFD700): ${namcColors.namcYellow} instances`);
    console.log(`  🟠 Accent Yellow (#FFA500): ${namcColors.accentYellow} instances`);
    console.log(`  ⚫ NAMC Black (#1A1A1A): ${namcColors.namcBlack} instances`);
    console.log(`  🟨 Light Yellow (#FFF8DC): ${namcColors.lightYellow} instances`);
    
    const totalBrandColors = namcColors.namcYellow + namcColors.accentYellow + 
                            namcColors.namcBlack + namcColors.lightYellow;
    
    console.log(`\n✅ Total NAMC Brand Color Usage: ${totalBrandColors} instances`);
    
    if (totalBrandColors > 10) {
      console.log('🎊 EXCELLENT: Strong NAMC brand color implementation');
    } else if (totalBrandColors > 5) {
      console.log('✅ GOOD: Adequate NAMC brand color usage');
    } else {
      console.log('⚠️ NEEDS IMPROVEMENT: Limited NAMC brand color usage');
    }
    
    expect(totalBrandColors).toBeGreaterThan(5);
  });
});
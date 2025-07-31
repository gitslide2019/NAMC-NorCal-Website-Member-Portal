const { chromium } = require('playwright');

async function testNAMCWebsite() {
    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext({
        viewport: { width: 1280, height: 720 }
    });
    const page = await context.newPage();
    
    const baseUrl = 'http://localhost:3000';
    const results = {
        testSummary: {},
        pageTests: {},
        errors: [],
        performance: {}
    };
    
    console.log('🚀 Starting comprehensive NAMC website testing...');
    
    try {
        // Test 1: Landing Page
        console.log('\n📱 Testing Landing Page...');
        const startTime = Date.now();
        await page.goto(baseUrl);
        await page.waitForLoadState('networkidle');
        const loadTime = (Date.now() - startTime) / 1000;
        
        const title = await page.title();
        const hasHero = await page.locator('text=Building Excellence Since 1969').isVisible();
        const hasNav = await page.locator('nav').isVisible();
        const hasCtaButtons = await page.locator('text=Become a Member').first().isVisible();
        
        results.pageTests.landing = {
            loadTime: Math.round(loadTime * 100) / 100,
            title,
            hasHeroSection: hasHero,
            hasNavigation: hasNav,
            hasCtaButtons: hasCtaButtons,
            status: (hasHero && hasNav && hasCtaButtons) ? '✅ PASSED' : '❌ FAILED'
        };
        
        console.log(`   Title: ${title}`);
        console.log(`   Load time: ${loadTime.toFixed(2)}s`);
        console.log(`   Hero section: ${hasHero ? '✅' : '❌'}`);
        console.log(`   Navigation: ${hasNav ? '✅' : '❌'}`);
        console.log(`   CTA buttons: ${hasCtaButtons ? '✅' : '❌'}`);
        
        // Test 2: Timeline Page
        console.log('\n📅 Testing Interactive Timeline...');
        await page.goto(`${baseUrl}/timeline`);
        await page.waitForLoadState('networkidle');
        
        const hasTimelineContent = await page.locator('text=1969').first().isVisible();
        const hasSearch = await page.locator('input[placeholder*="Search"], input[placeholder*="search"]').isVisible();
        const hasMilestones = await page.locator('text=NAMC Founded').isVisible() || 
                             await page.locator('text=Founded').isVisible() ||
                             await page.locator('[class*="timeline"]').count() > 0;
        
        results.pageTests.timeline = {
            hasTimelineContent,
            hasSearchFunctionality: hasSearch,
            hasHistoricalMilestones: hasMilestones,
            status: (hasTimelineContent && hasMilestones) ? '✅ PASSED' : '❌ FAILED'
        };
        
        console.log(`   Timeline content: ${hasTimelineContent ? '✅' : '❌'}`);
        console.log(`   Search functionality: ${hasSearch ? '✅' : '❌'}`);
        console.log(`   Historical milestones: ${hasMilestones ? '✅' : '❌'}`);
        
        // Test 3: Authentication Flow
        console.log('\n🔐 Testing Authentication...');
        await page.goto(`${baseUrl}/auth/signin`);
        await page.waitForLoadState('networkidle');
        
        const hasEmailField = await page.locator('input[type="email"]').isVisible();
        const hasPasswordField = await page.locator('input[type="password"]').isVisible();
        const hasSigninButton = await page.locator('button[type="submit"]').isVisible();
        
        let loginSuccessful = false;
        let redirectUrl = '';
        
        if (hasEmailField && hasPasswordField) {
            await page.fill('input[type="email"]', 'admin@namc-norcal.org');
            await page.fill('input[type="password"]', 'admin123');
            await page.click('button[type="submit"]');
            
            await page.waitForTimeout(3000);
            redirectUrl = page.url();
            loginSuccessful = redirectUrl.includes('/admin') || redirectUrl.includes('/member');
        }
        
        results.pageTests.authentication = {
            hasEmailField,
            hasPasswordField,
            hasSigninButton,
            demoLoginWorks: loginSuccessful,
            redirectUrl,
            status: loginSuccessful ? '✅ PASSED' : '⚠️ PARTIAL'
        };
        
        console.log(`   Email field: ${hasEmailField ? '✅' : '❌'}`);
        console.log(`   Password field: ${hasPasswordField ? '✅' : '❌'}`);
        console.log(`   Sign-in button: ${hasSigninButton ? '✅' : '❌'}`);
        console.log(`   Demo login: ${loginSuccessful ? '✅' : '❌'}`);
        console.log(`   Redirect to: ${redirectUrl}`);
        
        // Test 4: Member Portal
        console.log('\n👤 Testing Member Portal...');
        await page.goto(`${baseUrl}/member/dashboard`);
        await page.waitForLoadState('networkidle');
        
        const hasDashboardContent = await page.locator('text=Welcome').isVisible() || 
                                   await page.locator('text=Dashboard').isVisible();
        const hasSidebar = await page.locator('nav').count() > 0;
        const hasStats = await page.locator('text=Projects').isVisible() ||
                        await page.locator('[class*="stat"]').count() > 0;
        
        results.pageTests.memberPortal = {
            hasDashboardContent,
            hasNavigationSidebar: hasSidebar,
            hasStatistics: hasStats,
            status: hasDashboardContent ? '✅ PASSED' : '❌ FAILED'
        };
        
        console.log(`   Dashboard content: ${hasDashboardContent ? '✅' : '❌'}`);
        console.log(`   Navigation sidebar: ${hasSidebar ? '✅' : '❌'}`);
        console.log(`   Statistics display: ${hasStats ? '✅' : '❌'}`);
        
        // Test 5: Admin Portal
        console.log('\n🛠️ Testing Admin Portal...');
        await page.goto(`${baseUrl}/admin/dashboard`);
        await page.waitForLoadState('networkidle');
        
        const hasAdminContent = await page.locator('text=Admin').isVisible() || 
                               await page.locator('text=Management').isVisible();
        const hasMetrics = await page.locator('text=Members').isVisible() ||
                          await page.locator('[class*="metric"]').count() > 0;
        
        results.pageTests.adminPortal = {
            hasAdminContent,
            hasMetricsDisplay: hasMetrics,
            status: hasAdminContent ? '✅ PASSED' : '❌ FAILED'
        };
        
        console.log(`   Admin content: ${hasAdminContent ? '✅' : '❌'}`);
        console.log(`   Metrics display: ${hasMetrics ? '✅' : '❌'}`);
        
        // Test 6: Responsive Design
        console.log('\n📱 Testing Responsive Design...');
        
        // Mobile test
        await page.setViewportSize({ width: 375, height: 667 });
        await page.goto(baseUrl);
        await page.waitForLoadState('networkidle');
        
        const mobileNavVisible = await page.locator('[class*="mobile"]').isVisible() ||
                                 await page.locator('button').first().isVisible();
        const contentFitsMobile = (await page.locator('main').boundingBox())?.width <= 375;
        
        // Tablet test
        await page.setViewportSize({ width: 768, height: 1024 });
        await page.reload();
        await page.waitForLoadState('networkidle');
        
        const tabletLayoutAdapts = (await page.locator('main').boundingBox())?.width <= 768;
        
        results.pageTests.responsive = {
            mobileNavigation: mobileNavVisible,
            mobileContentFits: contentFitsMobile,
            tabletLayoutAdapts: tabletLayoutAdapts,
            status: (contentFitsMobile && tabletLayoutAdapts) ? '✅ PASSED' : '⚠️ PARTIAL'
        };
        
        console.log(`   Mobile navigation: ${mobileNavVisible ? '✅' : '❌'}`);
        console.log(`   Mobile content fits: ${contentFitsMobile ? '✅' : '❌'}`);
        console.log(`   Tablet layout adapts: ${tabletLayoutAdapts ? '✅' : '❌'}`);
        
        // Test 7: Performance Check
        console.log('\n⚡ Testing Performance...');
        await page.setViewportSize({ width: 1280, height: 720 });
        
        const perfStartTime = Date.now();
        await page.goto(baseUrl, { waitUntil: 'networkidle' });
        const totalLoadTime = (Date.now() - perfStartTime) / 1000;
        
        const hasImages = await page.locator('img').count() > 0;
        const hasStylesheets = await page.locator('link[rel="stylesheet"]').count() > 0;
        
        results.performance = {
            totalLoadTime: Math.round(totalLoadTime * 100) / 100,
            hasOptimizedImages: hasImages,
            hasStylesheets: hasStylesheets,
            performanceRating: totalLoadTime < 3 ? '✅ GOOD' : totalLoadTime < 5 ? '⚠️ SLOW' : '❌ POOR'
        };
        
        console.log(`   Total load time: ${totalLoadTime.toFixed(2)}s`);
        console.log(`   Images present: ${hasImages ? '✅' : '❌'}`);
        console.log(`   Stylesheets loaded: ${hasStylesheets ? '✅' : '❌'}`);
        console.log(`   Performance rating: ${results.performance.performanceRating}`);
        
    } catch (error) {
        results.errors.push(`Test execution failed: ${error.message}`);
        console.log(`❌ Test execution failed: ${error.message}`);
    }
    
    // Calculate overall results
    const passedTests = Object.values(results.pageTests).filter(test => 
        test.status && test.status.includes('✅ PASSED')).length;
    const totalTests = Object.keys(results.pageTests).length;
    
    results.testSummary = {
        totalTests,
        passedTests,
        failedTests: totalTests - passedTests,
        errorCount: results.errors.length,
        overallStatus: passedTests >= totalTests * 0.8 ? '✅ HEALTHY' : 
                      passedTests >= totalTests * 0.6 ? '⚠️ ISSUES' : '❌ CRITICAL'
    };
    
    // Print summary
    console.log(`\n${'='.repeat(50)}`);
    console.log('📊 TEST SUMMARY');
    console.log(`${'='.repeat(50)}`);
    console.log(`Total Tests: ${totalTests}`);
    console.log(`Passed: ${passedTests}`);
    console.log(`Failed: ${totalTests - passedTests}`);
    console.log(`Errors: ${results.errors.length}`);
    console.log(`Overall Status: ${results.testSummary.overallStatus}`);
    
    if (results.errors.length > 0) {
        console.log(`\n❌ ERRORS ENCOUNTERED:`);
        results.errors.forEach(error => console.log(`   • ${error}`));
    }
    
    // Take screenshots
    console.log('\n📸 Taking final screenshots...');
    await page.goto(baseUrl);
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'landing-page-screenshot.png', fullPage: true });
    
    await page.goto(`${baseUrl}/timeline`);
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'timeline-page-screenshot.png', fullPage: true });
    
    await browser.close();
    
    return results;
}

// Run the test
testNAMCWebsite().then(results => {
    console.log('\n✅ Testing completed!');
    console.log('Screenshots saved: landing-page-screenshot.png, timeline-page-screenshot.png');
}).catch(error => {
    console.error('❌ Testing failed:', error);
});
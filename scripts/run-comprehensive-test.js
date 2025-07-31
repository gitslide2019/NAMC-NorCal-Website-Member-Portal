#!/usr/bin/env node

/**
 * Comprehensive Test Runner for NAMC System
 * 
 * This script runs all Playwright tests and generates a detailed report
 * of the system's functionality and integration points.
 */

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

console.log('🚀 NAMC Comprehensive System Test Runner')
console.log('=' .repeat(50))

// Configuration
const config = {
  testTimeout: 300000, // 5 minutes per test
  workers: 1, // Run tests sequentially for comprehensive testing
  retries: 1, // Retry failed tests once
  browsers: ['chromium'], // Start with Chromium, can expand to others
  baseURL: process.env.BASE_URL || 'http://localhost:3000',
  outputDir: './test-results/comprehensive',
  reportDir: './playwright-report/comprehensive'
}

// Ensure required directories exist
const dirs = [config.outputDir, config.reportDir, './screenshots']
dirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
    console.log(`📁 Created directory: ${dir}`)
  }
})

// Pre-test setup
console.log('\n🔧 Pre-test Setup')
console.log('-'.repeat(20))

try {
  // Check if the application is running
  console.log('🌐 Checking application availability...')
  execSync(`curl -f ${config.baseURL} || echo "Application may not be running"`, { stdio: 'inherit' })
  
  // Run database migrations if needed
  console.log('🗄️  Ensuring database is ready...')
  // Uncomment if you have migration scripts
  // execSync('npm run db:migrate', { stdio: 'inherit' })
  
  console.log('✅ Pre-test setup completed')
} catch (error) {
  console.warn('⚠️  Pre-test setup had issues, continuing anyway...')
}

// Main test execution
console.log('\n🧪 Running Comprehensive Tests')
console.log('-'.repeat(30))

const testCommands = {
  comprehensive: {
    name: 'Complete System Walkthrough',
    command: `npx playwright test tests/comprehensive-system-test.spec.ts --timeout=${config.testTimeout} --workers=${config.workers} --retries=${config.retries}`,
    description: 'Tests all major features end-to-end'
  },
  accessibility: {
    name: 'Accessibility Compliance',
    command: `npx playwright test tests/accessibility-audit.spec.ts --timeout=120000`,
    description: 'WCAG 2.1 AA compliance testing'
  },
  userStories: {
    name: 'User Story Validation',
    command: `npx playwright test tests/user-stories-audit.spec.ts --timeout=180000`,
    description: 'Complete user journey testing'
  }
}

const results = {}

for (const [key, test] of Object.entries(testCommands)) {
  console.log(`\n▶️  Running: ${test.name}`)
  console.log(`   ${test.description}`)
  
  const startTime = Date.now()
  
  try {
    // Set environment variables for this test run
    const env = {
      ...process.env,
      PLAYWRIGHT_HTML_REPORT: `${config.reportDir}/${key}`,
      PLAYWRIGHT_JUNIT_OUTPUT_NAME: `${config.outputDir}/${key}-results.xml`
    }
    
    execSync(test.command, { 
      stdio: 'inherit',
      env,
      cwd: process.cwd()
    })
    
    const duration = Date.now() - startTime
    results[key] = {
      status: 'PASSED',
      duration: `${(duration / 1000).toFixed(2)}s`,
      description: test.description
    }
    
    console.log(`✅ ${test.name} - PASSED (${results[key].duration})`)
    
  } catch (error) {
    const duration = Date.now() - startTime
    results[key] = {
      status: 'FAILED',
      duration: `${(duration / 1000).toFixed(2)}s`,
      description: test.description,
      error: error.message
    }
    
    console.log(`❌ ${test.name} - FAILED (${results[key].duration})`)
    console.log(`   Error: ${error.message}`)
  }
}

// Generate final report
console.log('\n📊 Test Execution Summary')
console.log('=' .repeat(50))

const passedTests = Object.values(results).filter(r => r.status === 'PASSED').length
const failedTests = Object.values(results).filter(r => r.status === 'FAILED').length
const totalTests = Object.keys(results).length

console.log(`📈 Overall Results: ${passedTests}/${totalTests} tests passed`)
console.log(`⏱️  Total execution time: ${Object.values(results).reduce((sum, r) => sum + parseFloat(r.duration), 0).toFixed(2)}s`)

// Detailed results
console.log('\n📋 Detailed Results:')
for (const [testName, result] of Object.entries(results)) {
  const icon = result.status === 'PASSED' ? '✅' : '❌'
  console.log(`   ${icon} ${testName}: ${result.status} (${result.duration})`)
  console.log(`      ${result.description}`)
  if (result.error) {
    console.log(`      Error: ${result.error}`)
  }
}

// Generate JSON report
const jsonReport = {
  timestamp: new Date().toISOString(),
  configuration: config,
  results: results,
  summary: {
    total: totalTests,
    passed: passedTests,
    failed: failedTests,
    passRate: `${((passedTests / totalTests) * 100).toFixed(1)}%`
  },
  systemInfo: {
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch,
    cwd: process.cwd()
  }
}

const reportPath = path.join(config.outputDir, 'comprehensive-test-report.json')
fs.writeFileSync(reportPath, JSON.stringify(jsonReport, null, 2))
console.log(`\n💾 Detailed report saved to: ${reportPath}`)

// Generate HTML summary
const htmlReport = `
<!DOCTYPE html>
<html>
<head>
    <title>NAMC Comprehensive Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #1e3a8a; color: white; padding: 20px; border-radius: 8px; }
        .summary { background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0; }
        .test-result { margin: 10px 0; padding: 10px; border-left: 4px solid #ccc; }
        .passed { border-left-color: #10b981; background: #ecfdf5; }
        .failed { border-left-color: #ef4444; background: #fef2f2; }
        .timestamp { color: #6b7280; font-size: 14px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🏗️ NAMC System Comprehensive Test Report</h1>
        <p class="timestamp">Generated on ${new Date().toLocaleString()}</p>
    </div>
    
    <div class="summary">
        <h2>📊 Test Summary</h2>
        <p><strong>Total Tests:</strong> ${totalTests}</p>
        <p><strong>Passed:</strong> ${passedTests}</p>
        <p><strong>Failed:</strong> ${failedTests}</p>
        <p><strong>Pass Rate:</strong> ${jsonReport.summary.passRate}</p>
    </div>
    
    <h2>📋 Test Results</h2>
    ${Object.entries(results).map(([name, result]) => `
        <div class="test-result ${result.status.toLowerCase()}">
            <h3>${result.status === 'PASSED' ? '✅' : '❌'} ${name}</h3>
            <p><strong>Status:</strong> ${result.status}</p>
            <p><strong>Duration:</strong> ${result.duration}</p>
            <p><strong>Description:</strong> ${result.description}</p>
            ${result.error ? `<p><strong>Error:</strong> ${result.error}</p>` : ''}
        </div>
    `).join('')}
    
    <div style="margin-top: 40px; padding: 20px; background: #f9fafb; border-radius: 8px; border: 1px solid #e5e7eb;">
        <h3>🔍 How to View Detailed Results</h3>
        <ul>
            <li><strong>HTML Reports:</strong> Open <code>playwright-report/comprehensive/index.html</code></li>
            <li><strong>Screenshots:</strong> Check <code>test-results/comprehensive/</code> directory</li>
            <li><strong>Test Artifacts:</strong> Available in <code>test-results/</code></li>
        </ul>
    </div>
</body>
</html>
`

const htmlReportPath = path.join(config.outputDir, 'comprehensive-test-report.html')
fs.writeFileSync(htmlReportPath, htmlReport)
console.log(`📄 HTML report saved to: ${htmlReportPath}`)

// Final status
console.log('\n🎯 Next Steps:')
if (failedTests > 0) {
  console.log('   ❌ Some tests failed. Please review the detailed reports.')
  console.log('   🔍 Check screenshots and traces in the test-results directory.')
  console.log('   🛠️  Fix issues and re-run tests.')
  process.exit(1)
} else {
  console.log('   ✅ All tests passed! System is functioning correctly.')
  console.log('   📊 Review the HTML report for detailed insights.')
  console.log('   🚀 System is ready for deployment or further development.')
}

console.log(`\n📖 View reports:`)
console.log(`   HTML: file://${path.resolve(htmlReportPath)}`)
console.log(`   JSON: ${path.resolve(reportPath)}`)
console.log('\n🏁 Test execution completed!')
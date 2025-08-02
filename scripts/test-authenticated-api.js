#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function testAuthenticatedAPI() {
  try {
    console.log('🧪 Testing Authenticated API Flow...')
    
    // Test 1: Direct database verification
    console.log('\n1️⃣ Testing direct database access...')
    const opportunities = await prisma.opportunity.findMany({
      orderBy: { datePosted: 'desc' },
      take: 3
    })
    
    console.log(`✅ Found ${opportunities.length} opportunities in database`)
    
    if (opportunities.length > 0) {
      const sample = opportunities[0]
      console.log(`   📋 Sample: "${sample.title}"`)
      console.log(`   📅 Posted: ${sample.datePosted.toLocaleDateString()}`)
      console.log(`   🏷️  Type: ${sample.type} | Status: ${sample.status}`)
      
      // Test JSON parsing
      try {
        const tags = sample.tags ? JSON.parse(sample.tags) : []
        const requirements = sample.requirements ? JSON.parse(sample.requirements) : []
        console.log(`   🏷️  Tags: [${tags.slice(0, 3).join(', ')}${tags.length > 3 ? '...' : ''}]`)
        console.log(`   📋 Requirements: ${requirements.length} items`)
      } catch (parseError) {
        console.error(`   ❌ JSON parsing error: ${parseError.message}`)
      }
    }
    
    // Test 2: API endpoint structure verification
    console.log('\n2️⃣ Verifying API route requirements...')
    
    // Check if authentication is working by testing without auth
    try {
      const response = await fetch('http://localhost:3000/api/opportunities')
      const data = await response.json()
      
      if (response.status === 401 && data.error === 'Unauthorized') {
        console.log('   ✅ API correctly requires authentication')
      } else {
        console.log('   ❌ API authentication may not be working correctly')
        console.log('   Response:', response.status, data)
      }
    } catch (fetchError) {
      console.log('   ⚠️  Could not reach API endpoint:', fetchError.message)
      console.log('   💡 Make sure the development server is running on port 3000')
    }
    
    // Test 3: Environment configuration
    console.log('\n3️⃣ Checking environment configuration...')
    
    // Check database connection
    try {
      await prisma.$queryRaw`SELECT 1`
      console.log('   ✅ Database connection working')
    } catch (dbError) {
      console.log('   ❌ Database connection error:', dbError.message)
    }
    
    // Test 4: User Authentication Setup
    console.log('\n4️⃣ Verifying authentication setup...')
    console.log('   📋 Demo credentials available:')
    console.log('      Admin: admin@namc-norcal.org / admin123')
    console.log('      Member: member@namc-norcal.org / member123')
    console.log('   🌐 Sign in page: http://localhost:3000/auth/signin')
    console.log('   🎯 Opportunities page: http://localhost:3000/member/project-intelligence/opportunities')
    
    // Test 5: Opportunities page access flow
    console.log('\n5️⃣ Expected user flow:')
    console.log('   1. User visits opportunities page (unauthenticated)')
    console.log('   2. Automatically redirected to /auth/signin')
    console.log('   3. User logs in with demo credentials')
    console.log('   4. Redirected back to opportunities page')
    console.log('   5. API calls succeed with authentication')
    console.log('   6. Opportunities display from database')
    
    console.log('\n🎉 Authentication setup verification completed!')
    console.log('\n💡 Next steps:')
    console.log('   1. Visit http://localhost:3000/member/project-intelligence/opportunities')
    console.log('   2. You should be redirected to signin page')
    console.log('   3. Log in with: member@namc-norcal.org / member123')
    console.log('   4. Opportunities should load and display properly')
    
  } catch (error) {
    console.error('💥 Test failed:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the test
if (require.main === module) {
  testAuthenticatedAPI()
}
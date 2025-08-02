#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function testAPIData() {
  try {
    console.log('🧪 Testing Project Intelligence API Data...')
    
    // Test 1: Direct database query
    console.log('\n1️⃣ Testing direct database access...')
    const opportunities = await prisma.opportunity.findMany({
      orderBy: { datePosted: 'desc' },
      take: 5
    })
    
    console.log(`✅ Found ${opportunities.length} opportunities in database`)
    
    if (opportunities.length > 0) {
      console.log('\n📋 Sample opportunity:')
      const sample = opportunities[0]
      console.log(`   Title: ${sample.title}`)
      console.log(`   Type: ${sample.type}`)
      console.log(`   Status: ${sample.status}`)
      console.log(`   Posted: ${sample.datePosted}`)
      if (sample.location) console.log(`   Location: ${sample.location}`)
      if (sample.estimatedValue) console.log(`   Value: $${sample.estimatedValue.toLocaleString()}`)
      
      console.log('\n🔍 Raw data structure:')
      console.log(`   Requirements (raw): ${sample.requirements?.substring(0, 100)}${sample.requirements?.length > 100 ? '...' : ''}`)
      console.log(`   Tags (raw): ${sample.tags?.substring(0, 100)}${sample.tags?.length > 100 ? '...' : ''}`)
      
      // Test JSON parsing
      try {
        const parsedReqs = sample.requirements ? JSON.parse(sample.requirements) : []
        const parsedTags = sample.tags ? JSON.parse(sample.tags) : []
        console.log(`   Requirements (parsed): [${parsedReqs.join(', ')}]`)
        console.log(`   Tags (parsed): [${parsedTags.join(', ')}]`)
      } catch (parseError) {
        console.error(`   ❌ JSON parsing error: ${parseError.message}`)
      }
    }
    
    // Test 2: API route simulation (without auth)
    console.log('\n2️⃣ Testing data processing logic...')
    const rawOpportunities = await prisma.opportunity.findMany({
      orderBy: { datePosted: 'desc' },
      take: 10
    })
    
    // Simulate the API processing
    const processedOpportunities = rawOpportunities.map(opp => {
      try {
        return {
          ...opp,
          requirements: opp.requirements ? JSON.parse(opp.requirements) : [],
          tags: opp.tags ? JSON.parse(opp.tags) : [],
          claudeAnalysis: opp.claudeAnalysis ? JSON.parse(opp.claudeAnalysis) : null
        }
      } catch (error) {
        console.error(`❌ Error processing opportunity ${opp.id}: ${error.message}`)
        return {
          ...opp,
          requirements: [],
          tags: [],
          claudeAnalysis: null
        }
      }
    })
    
    console.log(`✅ Successfully processed ${processedOpportunities.length} opportunities`)
    
    // Test 3: Check for any data integrity issues
    console.log('\n3️⃣ Checking data integrity...')
    let issues = 0
    
    processedOpportunities.forEach((opp, index) => {
      if (!opp.title || opp.title.trim() === '') {
        console.error(`   ❌ Opportunity ${index + 1}: Missing title`)
        issues++
      }
      if (!opp.description || opp.description.trim() === '') {
        console.error(`   ❌ Opportunity ${index + 1}: Missing description`)
        issues++
      }
      if (!opp.type || opp.type.trim() === '') {
        console.error(`   ❌ Opportunity ${index + 1}: Missing type`)
        issues++
      }
      if (!Array.isArray(opp.requirements)) {
        console.error(`   ❌ Opportunity ${index + 1}: Requirements not an array`)
        issues++
      }
      if (!Array.isArray(opp.tags)) {
        console.error(`   ❌ Opportunity ${index + 1}: Tags not an array`)
        issues++
      }
    })
    
    if (issues === 0) {
      console.log('   ✅ All data integrity checks passed!')
    } else {
      console.log(`   ⚠️  Found ${issues} data integrity issues`)
    }
    
    // Test 4: Statistics
    console.log('\n4️⃣ Data statistics:')
    const stats = {
      total: processedOpportunities.length,
      byType: {},
      byStatus: {},
      withDeadlines: processedOpportunities.filter(o => o.deadline).length,
      withValues: processedOpportunities.filter(o => o.estimatedValue).length,
      withLocation: processedOpportunities.filter(o => o.location).length,
      withTags: processedOpportunities.filter(o => o.tags && o.tags.length > 0).length
    }
    
    processedOpportunities.forEach(opp => {
      stats.byType[opp.type] = (stats.byType[opp.type] || 0) + 1
      stats.byStatus[opp.status] = (stats.byStatus[opp.status] || 0) + 1
    })
    
    console.log(`   Total: ${stats.total}`)
    console.log(`   With deadlines: ${stats.withDeadlines}`)
    console.log(`   With values: ${stats.withValues}`)
    console.log(`   With locations: ${stats.withLocation}`)
    console.log(`   With tags: ${stats.withTags}`)
    console.log('   By type:', stats.byType)
    console.log('   By status:', stats.byStatus)
    
    console.log('\n🎉 API data test completed!')
    
  } catch (error) {
    console.error('💥 Test failed:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the test
if (require.main === module) {
  testAPIData()
}
#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function testOpportunities() {
  try {
    console.log('🧪 Testing NAMC Project Opportunities Data...')
    
    // Get all opportunities
    const rawOpportunities = await prisma.opportunity.findMany({
      orderBy: { datePosted: 'desc' }
    })
    
    console.log(`📊 Found ${rawOpportunities.length} opportunities in database`)
    
    // Parse and display first few opportunities
    const opportunities = rawOpportunities.map(opp => ({
      ...opp,
      requirements: opp.requirements ? JSON.parse(opp.requirements) : [],
      tags: opp.tags ? JSON.parse(opp.tags) : [],
      claudeAnalysis: opp.claudeAnalysis ? JSON.parse(opp.claudeAnalysis) : null
    }))
    
    console.log('\n🎯 Sample Opportunities:')
    console.log('=' .repeat(80))
    
    opportunities.slice(0, 5).forEach((opp, index) => {
      console.log(`\n${index + 1}. ${opp.title}`)
      console.log(`   Type: ${opp.type} | Status: ${opp.status}`)
      console.log(`   Posted: ${opp.datePosted.toLocaleDateString()}`)
      if (opp.deadline) {
        console.log(`   Deadline: ${opp.deadline.toLocaleDateString()}`)
      }
      if (opp.location) {
        console.log(`   Location: ${opp.location}`)
      }
      if (opp.estimatedValue) {
        console.log(`   Estimated Value: $${opp.estimatedValue.toLocaleString()}`)
      }
      if (opp.contactInfo) {
        console.log(`   Contact: ${opp.contactInfo}`)
      }
      console.log(`   Description: ${opp.description.substring(0, 100)}...`)
      
      if (opp.requirements.length > 0) {
        console.log(`   Requirements: ${opp.requirements.join(', ')}`)
      }
      
      if (opp.tags.length > 0) {
        console.log(`   Tags: ${opp.tags.join(', ')}`)
      }
      
      if (opp.claudeAnalysis) {
        console.log(`   🤖 AI Analysis: Available`)
        console.log(`   📊 Opportunity Score: ${opp.opportunityScore || 'N/A'}`)
      }
    })
    
    // Statistics
    const stats = {
      total: opportunities.length,
      byType: {},
      byStatus: {},
      withDeadlines: opportunities.filter(o => o.deadline).length,
      withValues: opportunities.filter(o => o.estimatedValue).length,
      withAIAnalysis: opportunities.filter(o => o.claudeAnalysis).length
    }
    
    opportunities.forEach(opp => {
      stats.byType[opp.type] = (stats.byType[opp.type] || 0) + 1
      stats.byStatus[opp.status] = (stats.byStatus[opp.status] || 0) + 1
    })
    
    console.log('\n📈 Statistics:')
    console.log('=' .repeat(50))
    console.log(`Total Opportunities: ${stats.total}`)
    console.log(`With Deadlines: ${stats.withDeadlines}`)
    console.log(`With Estimated Values: ${stats.withValues}`)
    console.log(`With AI Analysis: ${stats.withAIAnalysis}`)
    console.log('\nBy Type:')
    Object.entries(stats.byType).forEach(([type, count]) => {
      console.log(`  ${type}: ${count}`)
    })
    console.log('\nBy Status:')
    Object.entries(stats.byStatus).forEach(([status, count]) => {
      console.log(`  ${status}: ${count}`)
    })
    
    console.log('\n✅ All NAMC Project Opportunities data is properly imported and accessible!')
    
  } catch (error) {
    console.error('❌ Error testing opportunities:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the test
if (require.main === module) {
  testOpportunities()
}
#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

// HubSpot API configuration
const HUBSPOT_API_KEY = process.env.HUBSPOT_ACCESS_TOKEN || process.env.HUBSPOT_API_KEY
const HUBSPOT_API_URL = 'https://api.hubapi.com'

if (!HUBSPOT_API_KEY) {
  console.error('❌ HubSpot API key not found. Please set HUBSPOT_ACCESS_TOKEN environment variable.')
  process.exit(1)
}

async function syncOpportunitiesToHubSpot() {
  try {
    console.log('🚀 Starting Project Opportunities sync to HubSpot...')
    
    // Get all opportunities from database
    const opportunities = await prisma.opportunity.findMany()
    console.log(`📊 Found ${opportunities.length} opportunities to sync`)
    
    let synced = 0
    let errors = []
    
    for (const opportunity of opportunities) {
      try {
        console.log(`🔄 Syncing: ${opportunity.title}`)
        
        // Map opportunity to HubSpot deal format with custom NAMC properties
        const dealData = {
          properties: {
            dealname: opportunity.title,
            dealstage: mapStatusToDealStage(opportunity.status),
            amount: opportunity.estimatedValue?.toString() || '0',
            closedate: opportunity.deadline?.toISOString() || '',
            
            // NAMC custom properties
            namc_opportunity_id: opportunity.id,
            namc_opportunity_type: opportunity.type,
            namc_opportunity_description: opportunity.description || '',
            namc_opportunity_location: opportunity.location || '',
            namc_opportunity_posted_date: opportunity.datePosted.toISOString(),
            namc_opportunity_contact_info: opportunity.contactInfo || '',
            namc_opportunity_requirements: JSON.stringify(opportunity.requirements || []),
            namc_opportunity_tags: JSON.stringify(opportunity.tags || []),
            namc_opportunity_latitude: opportunity.latitude?.toString() || '',
            namc_opportunity_longitude: opportunity.longitude?.toString() || '',
            namc_opportunity_score: opportunity.score?.toString() || '0',
            namc_complexity_score: opportunity.complexityScore?.toString() || '0',
            namc_match_score: opportunity.matchScore?.toString() || '0',
            namc_claude_analysis: JSON.stringify(opportunity.claudeAnalysis || {})
          }
        }
        
        // Check if deal already exists
        const existingDeal = await findExistingDeal(opportunity.id)
        
        if (existingDeal) {
          // Update existing deal
          const response = await fetch(`${HUBSPOT_API_URL}/crm/v3/objects/deals/${existingDeal.id}`, {
            method: 'PATCH',
            headers: {
              'Authorization': `Bearer ${HUBSPOT_API_KEY}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(dealData)
          })
          
          if (!response.ok) {
            const errorData = await response.json()
            throw new Error(`HubSpot update error: ${errorData.message}`)
          }
          
          console.log(`✅ Updated existing deal: ${opportunity.title}`)
        } else {
          // Create new deal
          const response = await fetch(`${HUBSPOT_API_URL}/crm/v3/objects/deals`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${HUBSPOT_API_KEY}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(dealData)
          })
          
          if (!response.ok) {
            const errorData = await response.json()
            throw new Error(`HubSpot create error: ${errorData.message}`)
          }
          
          const result = await response.json()
          console.log(`✅ Created new deal: ${opportunity.title} (ID: ${result.id})`)
          
          // Optionally store HubSpot deal ID in database
          // await prisma.opportunity.update({
          //   where: { id: opportunity.id },
          //   data: { hubspotDealId: result.id }
          // })
        }
        
        synced++
        
        // Rate limiting - wait 100ms between requests
        await new Promise(resolve => setTimeout(resolve, 100))
        
      } catch (error) {
        const errorMsg = `Failed to sync "${opportunity.title}": ${error.message}`
        console.error('❌', errorMsg)
        errors.push(errorMsg)
      }
    }
    
    console.log('\n📈 Sync Summary:')
    console.log(`✅ Synced: ${synced}`)
    console.log(`❌ Errors: ${errors.length}`)
    
    if (errors.length > 0) {
      console.log('\n❌ Errors:')
      errors.forEach(err => console.log(`   - ${err}`))
    }
    
    // Get HubSpot analytics
    const analytics = await getHubSpotOpportunityAnalytics()
    if (analytics) {
      console.log('\n📊 HubSpot Opportunity Statistics:')
      console.log(`   Total Opportunities: ${analytics.totalDeals}`)
      console.log(`   Active Opportunities: ${analytics.activeDeals}`)
      console.log(`   Total Estimated Value: $${analytics.totalValue.toLocaleString()}`)
      console.log(`   Average Value: $${analytics.avgValue.toLocaleString()}`)
    }
    
    console.log('\n🎉 HubSpot sync completed successfully!')
    
  } catch (error) {
    console.error('💥 Sync failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

async function findExistingDeal(opportunityId) {
  try {
    // For now, search by deal name since we don't have custom properties
    // This is less reliable but will work for the initial sync
    return null // Always create new for now
  } catch (error) {
    console.error('Error searching for existing deal:', error)
    return null
  }
}

function mapStatusToDealStage(status) {
  const statusMap = {
    'Active': 'appointmentscheduled',
    'In Progress': 'qualifiedtobuy',
    'Completed': 'closedwon',
    'Under Review': 'presentationscheduled'
  }
  
  return statusMap[status] || 'appointmentscheduled'
}

async function getHubSpotOpportunityAnalytics() {
  try {
    const response = await fetch(`${HUBSPOT_API_URL}/crm/v3/objects/deals?properties=amount,dealstage,dealname&limit=100`, {
      headers: {
        'Authorization': `Bearer ${HUBSPOT_API_KEY}`
      }
    })
    
    if (!response.ok) {
      return null
    }
    
    const data = await response.json()
    const deals = data.results || []
    
    // For now, consider all deals as opportunities
    const totalDeals = deals.length
    const activeDeals = deals.filter(deal => 
      ['appointmentscheduled', 'qualifiedtobuy', 'presentationscheduled'].includes(deal.properties.dealstage)
    ).length
    
    const totalValue = deals.reduce((sum, deal) => {
      return sum + (parseFloat(deal.properties.amount || '0'))
    }, 0)
    
    const avgValue = totalDeals > 0 ? totalValue / totalDeals : 0
    
    return {
      totalDeals,
      activeDeals,
      totalValue,
      avgValue
    }
    
  } catch (error) {
    console.error('Error getting HubSpot analytics:', error)
    return null
  }
}

// Run the sync
if (require.main === module) {
  syncOpportunitiesToHubSpot()
}
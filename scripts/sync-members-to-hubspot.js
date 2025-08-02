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

async function syncMembersToHubSpot() {
  try {
    console.log('🚀 Starting Member Directory sync to HubSpot...')
    
    // Get all users from database
    const members = await prisma.user.findMany()
    console.log(`📊 Found ${members.length} members to sync`)
    
    let synced = 0
    let errors = []
    
    for (const member of members) {
      try {
        console.log(`🔄 Syncing: ${member.name || member.email}`)
        
        // Split name into first and last
        const nameParts = (member.name || '').split(' ')
        const firstName = nameParts[0] || ''
        const lastName = nameParts.slice(1).join(' ') || ''
        
        // Parse location into city/state
        const locationParts = (member.location || '').split(',')
        const city = locationParts[0]?.trim() || ''
        const state = locationParts[1]?.trim() || ''
        
        // Map member to HubSpot contact format (with custom NAMC properties)
        const contactData = {
          properties: {
            email: member.email,
            firstname: firstName,
            lastname: lastName,
            company: member.company || '',
            phone: member.phone || '',
            website: member.website || '',
            city: city,
            state: state,
            
            // NAMC custom properties
            namc_member_id: member.id,
            namc_member_type: member.memberType,
            namc_join_date: member.createdAt.toISOString(),
            namc_last_active: member.updatedAt.toISOString(),
            namc_is_active: member.isActive ? 'true' : 'false',
            namc_location: member.location || ''
          }
        }
        
        // Check if contact already exists
        const existingContact = await findExistingContact(member.email)
        
        if (existingContact) {
          // Update existing contact
          const response = await fetch(`${HUBSPOT_API_URL}/crm/v3/objects/contacts/${existingContact.id}`, {
            method: 'PATCH',
            headers: {
              'Authorization': `Bearer ${HUBSPOT_API_KEY}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(contactData)
          })
          
          if (!response.ok) {
            const errorData = await response.json()
            throw new Error(`HubSpot update error: ${errorData.message}`)
          }
          
          console.log(`✅ Updated existing contact: ${member.name || member.email}`)
        } else {
          // Create new contact
          const response = await fetch(`${HUBSPOT_API_URL}/crm/v3/objects/contacts`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${HUBSPOT_API_KEY}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(contactData)
          })
          
          if (!response.ok) {
            const errorData = await response.json()
            throw new Error(`HubSpot create error: ${errorData.message}`)
          }
          
          const result = await response.json()
          console.log(`✅ Created new contact: ${member.name || member.email} (ID: ${result.id})`)
        }
        
        // Sync company information if available
        if (member.company) {
          await syncMemberCompany(member)
        }
        
        synced++
        
        // Rate limiting - wait 100ms between requests
        await new Promise(resolve => setTimeout(resolve, 100))
        
      } catch (error) {
        const errorMsg = `Failed to sync "${member.name || member.email}": ${error.message}`
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
    const analytics = await getHubSpotMemberAnalytics()
    if (analytics) {
      console.log('\n📊 HubSpot Member Statistics:')
      console.log(`   Total Contacts: ${analytics.totalContacts}`)
      console.log(`   Active Members: ${analytics.activeMembers}`)
      console.log(`   Premium Members: ${analytics.premiumMembers}`)
      console.log(`   Executive Members: ${analytics.executiveMembers}`)
      console.log(`   Companies: ${analytics.totalCompanies}`)
    }
    
    console.log('\n🎉 HubSpot member sync completed successfully!')
    
  } catch (error) {
    console.error('💥 Sync failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

async function findExistingContact(email) {
  try {
    const response = await fetch(`${HUBSPOT_API_URL}/crm/v3/objects/contacts/${email}?idProperty=email`, {
      headers: {
        'Authorization': `Bearer ${HUBSPOT_API_KEY}`
      }
    })
    
    if (response.ok) {
      const contact = await response.json()
      return contact
    }
    
    return null
  } catch (error) {
    // Contact not found is expected for new contacts
    return null
  }
}

async function syncMemberCompany(member) {
  try {
    if (!member.company) return
    
    // Check if company already exists
    const searchData = {
      filterGroups: [{
        filters: [{
          propertyName: 'name',
          operator: 'EQ',
          value: member.company
        }]
      }]
    }
    
    const searchResponse = await fetch(`${HUBSPOT_API_URL}/crm/v3/objects/companies/search`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${HUBSPOT_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(searchData)
    })
    
    if (searchResponse.ok) {
      const searchResult = await searchResponse.json()
      
      if (searchResult.results.length === 0) {
        // Create new company
        const locationParts = (member.location || '').split(',')
        const city = locationParts[0]?.trim() || ''
        const state = locationParts[1]?.trim() || ''
        
        const companyData = {
          properties: {
            name: member.company,
            city: city,
            state: state,
            phone: member.phone || '',
            website: member.website || '',
            
            // NAMC-specific properties
            // NAMC custom properties for companies
            namc_member_company: 'true',
            namc_company_member_count: '1',
            namc_company_tier: getCompanyTier(member.memberType),
            domain: member.website ? member.website.replace(/^https?:\/\//, '') : undefined
          }
        }
        
        const createResponse = await fetch(`${HUBSPOT_API_URL}/crm/v3/objects/companies`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${HUBSPOT_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(companyData)
        })
        
        if (createResponse.ok) {
          console.log(`  ✅ Created company: ${member.company}`)
        }
      }
    }
    
  } catch (error) {
    console.error(`Error syncing company ${member.company}:`, error)
  }
}

function getLifecycleStage(memberType) {
  const stageMap = {
    'REGULAR': 'customer',
    'PREMIUM': 'customer', 
    'EXECUTIVE': 'customer',
    'ADMIN': 'other'
  }
  
  return stageMap[memberType] || 'subscriber'
}

function getCompanyTier(memberType) {
  const tierMap = {
    'REGULAR': 'SMALL',
    'PREMIUM': 'MEDIUM',
    'EXECUTIVE': 'LARGE',
    'ADMIN': 'ENTERPRISE'
  }
  
  return tierMap[memberType] || 'SMALL'
}

async function getHubSpotMemberAnalytics() {
  try {
    // Get contacts with NAMC properties
    const contactsResponse = await fetch(`${HUBSPOT_API_URL}/crm/v3/objects/contacts?properties=email,namc_member_id,namc_member_type,namc_is_active&limit=100`, {
      headers: {
        'Authorization': `Bearer ${HUBSPOT_API_KEY}`
      }
    })
    
    // Get companies with NAMC properties
    const companiesResponse = await fetch(`${HUBSPOT_API_URL}/crm/v3/objects/companies?properties=name,namc_member_company&limit=100`, {
      headers: {
        'Authorization': `Bearer ${HUBSPOT_API_KEY}`
      }
    })
    
    if (!contactsResponse.ok) {
      return null
    }
    
    const contactsData = await contactsResponse.json()
    const contacts = contactsData.results || []
    
    // Filter for NAMC members using custom properties
    const members = contacts.filter(contact => contact.properties.namc_member_id)
    
    const totalContacts = members.length
    const activeMembers = members.filter(member => 
      member.properties.namc_is_active === 'true'
    ).length
    
    const premiumMembers = members.filter(member => 
      member.properties.namc_member_type === 'PREMIUM'
    ).length
    
    const executiveMembers = members.filter(member => 
      member.properties.namc_member_type === 'EXECUTIVE'
    ).length
    
    let totalCompanies = 0
    if (companiesResponse.ok) {
      const companiesData = await companiesResponse.json()
      const companies = companiesData.results || []
      totalCompanies = companies.filter(company => 
        company.properties.namc_member_company === 'true'
      ).length
    }
    
    return {
      totalContacts,
      activeMembers,
      premiumMembers,
      executiveMembers,
      totalCompanies
    }
    
  } catch (error) {
    console.error('Error getting HubSpot member analytics:', error)
    return null
  }
}

// Run the sync
if (require.main === module) {
  syncMembersToHubSpot()
}
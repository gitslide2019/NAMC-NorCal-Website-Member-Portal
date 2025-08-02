const asyncHandler = require('express-async-handler')
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

// HubSpot API configuration
const HUBSPOT_API_KEY = process.env.HUBSPOT_ACCESS_TOKEN || process.env.HUBSPOT_API_KEY
const HUBSPOT_API_URL = 'https://api.hubapi.com'

/**
 * @desc    Sync all opportunities to HubSpot
 * @route   POST /api/hubspot/sync-opportunities
 * @access  Admin
 */
const syncOpportunities = asyncHandler(async (req, res) => {
  if (!HUBSPOT_API_KEY) {
    return res.status(400).json({
      success: false,
      message: 'HubSpot API key not configured'
    })
  }

  try {
    // Get all opportunities from database
    const opportunities = await prisma.opportunity.findMany()
    
    let synced = 0
    let errors = []

    for (const opportunity of opportunities) {
      try {
        // Map opportunity to HubSpot deal format
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

        // Create new deal in HubSpot
        const response = await fetch(`${HUBSPOT_API_URL}/crm/v3/objects/deals`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${HUBSPOT_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(dealData)
        })

        if (response.ok) {
          synced++
        } else {
          const errorData = await response.json()
          errors.push(`${opportunity.title}: ${errorData.message}`)
        }

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 100))

      } catch (error) {
        errors.push(`${opportunity.title}: ${error.message}`)
      }
    }

    res.json({
      success: true,
      message: 'Opportunities sync completed',
      data: {
        totalOpportunities: opportunities.length,
        synced,
        errors: errors.length,
        errorDetails: errors
      }
    })

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to sync opportunities',
      error: error.message
    })
  }
})

/**
 * @desc    Sync all members to HubSpot
 * @route   POST /api/hubspot/sync-members
 * @access  Admin
 */
const syncMembers = asyncHandler(async (req, res) => {
  if (!HUBSPOT_API_KEY) {
    return res.status(400).json({
      success: false,
      message: 'HubSpot API key not configured'
    })
  }

  try {
    // Get all members from database
    const members = await prisma.user.findMany()
    
    let synced = 0
    let errors = []

    for (const member of members) {
      try {
        // Split name into first and last
        const nameParts = (member.name || '').split(' ')
        const firstName = nameParts[0] || ''
        const lastName = nameParts.slice(1).join(' ') || ''
        
        // Parse location into city/state
        const locationParts = (member.location || '').split(',')
        const city = locationParts[0]?.trim() || ''
        const state = locationParts[1]?.trim() || ''

        // Map member to HubSpot contact format
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
        
        let response
        if (existingContact) {
          // Update existing contact
          response = await fetch(`${HUBSPOT_API_URL}/crm/v3/objects/contacts/${existingContact.id}`, {
            method: 'PATCH',
            headers: {
              'Authorization': `Bearer ${HUBSPOT_API_KEY}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(contactData)
          })
        } else {
          // Create new contact
          response = await fetch(`${HUBSPOT_API_URL}/crm/v3/objects/contacts`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${HUBSPOT_API_KEY}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(contactData)
          })
        }

        if (response.ok) {
          synced++
          
          // Also sync company if available
          if (member.company) {
            await syncMemberCompany(member)
          }
        } else {
          const errorData = await response.json()
          errors.push(`${member.name || member.email}: ${errorData.message}`)
        }

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 100))

      } catch (error) {
        errors.push(`${member.name || member.email}: ${error.message}`)
      }
    }

    res.json({
      success: true,
      message: 'Members sync completed',
      data: {
        totalMembers: members.length,
        synced,
        errors: errors.length,
        errorDetails: errors
      }
    })

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to sync members',
      error: error.message
    })
  }
})

/**
 * @desc    Get opportunities from HubSpot
 * @route   GET /api/hubspot/opportunities
 * @access  Private
 */
const getOpportunitiesFromHubSpot = asyncHandler(async (req, res) => {
  if (!HUBSPOT_API_KEY) {
    return res.status(400).json({
      success: false,
      message: 'HubSpot API key not configured'
    })
  }

  try {
    const response = await fetch(`${HUBSPOT_API_URL}/crm/v3/objects/deals?properties=dealname,amount,dealstage,closedate,namc_opportunity_id,namc_opportunity_type,namc_opportunity_description,namc_opportunity_location,namc_opportunity_posted_date,namc_opportunity_contact_info,namc_opportunity_requirements,namc_opportunity_tags,namc_opportunity_latitude,namc_opportunity_longitude&limit=100`, {
      headers: {
        'Authorization': `Bearer ${HUBSPOT_API_KEY}`
      }
    })

    if (!response.ok) {
      throw new Error('Failed to fetch opportunities from HubSpot')
    }

    const data = await response.json()
    const deals = data.results || []

    // Transform HubSpot deals back to opportunity format
    const opportunities = deals
      .filter(deal => deal.properties.namc_opportunity_id) // Only NAMC opportunities
      .map(deal => ({
        id: deal.properties.namc_opportunity_id,
        title: deal.properties.dealname,
        description: deal.properties.namc_opportunity_description,
        type: deal.properties.namc_opportunity_type,
        location: deal.properties.namc_opportunity_location,
        estimatedValue: parseFloat(deal.properties.amount || '0'),
        deadline: deal.properties.closedate ? new Date(deal.properties.closedate) : null,
        status: mapDealStageToStatus(deal.properties.dealstage),
        datePosted: deal.properties.namc_opportunity_posted_date ? new Date(deal.properties.namc_opportunity_posted_date) : null,
        contactInfo: deal.properties.namc_opportunity_contact_info,
        requirements: deal.properties.namc_opportunity_requirements ? JSON.parse(deal.properties.namc_opportunity_requirements) : [],
        tags: deal.properties.namc_opportunity_tags ? JSON.parse(deal.properties.namc_opportunity_tags) : [],
        latitude: deal.properties.namc_opportunity_latitude ? parseFloat(deal.properties.namc_opportunity_latitude) : null,
        longitude: deal.properties.namc_opportunity_longitude ? parseFloat(deal.properties.namc_opportunity_longitude) : null,
        hubspotDealId: deal.id
      }))

    res.json({
      success: true,
      data: opportunities,
      total: opportunities.length
    })

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get opportunities from HubSpot',
      error: error.message
    })
  }
})

/**
 * @desc    Get members from HubSpot
 * @route   GET /api/hubspot/members
 * @access  Private
 */
const getMembersFromHubSpot = asyncHandler(async (req, res) => {
  if (!HUBSPOT_API_KEY) {
    return res.status(400).json({
      success: false,
      message: 'HubSpot API key not configured'
    })
  }

  try {
    const response = await fetch(`${HUBSPOT_API_URL}/crm/v3/objects/contacts?properties=email,firstname,lastname,company,phone,website,city,state,namc_member_id,namc_member_type,namc_join_date,namc_last_active,namc_is_active,namc_location&limit=100`, {
      headers: {
        'Authorization': `Bearer ${HUBSPOT_API_KEY}`
      }
    })

    if (!response.ok) {
      throw new Error('Failed to fetch members from HubSpot')
    }

    const data = await response.json()
    const contacts = data.results || []

    // Transform HubSpot contacts back to member format
    const members = contacts
      .filter(contact => contact.properties.namc_member_id) // Only NAMC members
      .map(contact => ({
        id: contact.properties.namc_member_id,
        email: contact.properties.email,
        name: `${contact.properties.firstname || ''} ${contact.properties.lastname || ''}`.trim(),
        company: contact.properties.company,
        phone: contact.properties.phone,
        website: contact.properties.website,
        location: contact.properties.namc_location || `${contact.properties.city || ''}, ${contact.properties.state || ''}`.replace(/, $/, ''),
        memberType: contact.properties.namc_member_type,
        isActive: contact.properties.namc_is_active === 'true',
        createdAt: contact.properties.namc_join_date ? new Date(contact.properties.namc_join_date) : null,
        updatedAt: contact.properties.namc_last_active ? new Date(contact.properties.namc_last_active) : null,
        hubspotContactId: contact.id
      }))

    res.json({
      success: true,
      data: members,
      total: members.length
    })

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get members from HubSpot',
      error: error.message
    })
  }
})

/**
 * @desc    Get HubSpot sync status and analytics
 * @route   GET /api/hubspot/status
 * @access  Admin
 */
const getHubSpotStatus = asyncHandler(async (req, res) => {
  if (!HUBSPOT_API_KEY) {
    return res.json({
      success: true,
      data: {
        connected: false,
        message: 'HubSpot API key not configured'
      }
    })
  }

  try {
    // Test HubSpot connection
    const testResponse = await fetch(`${HUBSPOT_API_URL}/crm/v3/objects/contacts?limit=1`, {
      headers: {
        'Authorization': `Bearer ${HUBSPOT_API_KEY}`
      }
    })

    if (!testResponse.ok) {
      throw new Error('HubSpot connection failed')
    }

    // Get counts from database
    const [opportunityCount, memberCount] = await Promise.all([
      prisma.opportunity.count(),
      prisma.user.count()
    ])

    // Get counts from HubSpot
    const [dealsResponse, contactsResponse] = await Promise.all([
      fetch(`${HUBSPOT_API_URL}/crm/v3/objects/deals?properties=namc_opportunity_id&limit=100`, {
        headers: { 'Authorization': `Bearer ${HUBSPOT_API_KEY}` }
      }),
      fetch(`${HUBSPOT_API_URL}/crm/v3/objects/contacts?properties=namc_member_id&limit=100`, {
        headers: { 'Authorization': `Bearer ${HUBSPOT_API_KEY}` }
      })
    ])

    const dealsData = await dealsResponse.json()
    const contactsData = await contactsResponse.json()

    const hubspotOpportunities = (dealsData.results || []).filter(deal => deal.properties.namc_opportunity_id).length
    const hubspotMembers = (contactsData.results || []).filter(contact => contact.properties.namc_member_id).length

    res.json({
      success: true,
      data: {
        connected: true,
        database: {
          opportunities: opportunityCount,
          members: memberCount
        },
        hubspot: {
          opportunities: hubspotOpportunities,
          members: hubspotMembers
        },
        syncStatus: {
          opportunitiesInSync: opportunityCount === hubspotOpportunities,
          membersInSync: memberCount === hubspotMembers
        }
      }
    })

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get HubSpot status',
      error: error.message
    })
  }
})

// Helper functions
async function findExistingContact(email) {
  try {
    const response = await fetch(`${HUBSPOT_API_URL}/crm/v3/objects/contacts/${email}?idProperty=email`, {
      headers: {
        'Authorization': `Bearer ${HUBSPOT_API_KEY}`
      }
    })

    if (response.ok) {
      return await response.json()
    }
    return null
  } catch (error) {
    return null
  }
}

async function syncMemberCompany(member) {
  try {
    if (!member.company) return

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
        namc_member_company: 'true',
        namc_company_member_count: '1',
        namc_company_tier: getCompanyTier(member.memberType)
      }
    }

    await fetch(`${HUBSPOT_API_URL}/crm/v3/objects/companies`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${HUBSPOT_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(companyData)
    })
  } catch (error) {
    console.error(`Error syncing company ${member.company}:`, error)
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

function mapDealStageToStatus(dealStage) {
  const stageMap = {
    'appointmentscheduled': 'Active',
    'qualifiedtobuy': 'In Progress',
    'closedwon': 'Completed',
    'presentationscheduled': 'Under Review'
  }
  return stageMap[dealStage] || 'Active'
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

module.exports = {
  syncOpportunities,
  syncMembers,
  getOpportunitiesFromHubSpot,
  getMembersFromHubSpot,
  getHubSpotStatus
}
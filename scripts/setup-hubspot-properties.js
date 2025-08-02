#!/usr/bin/env node

// HubSpot API configuration
const HUBSPOT_API_KEY = process.env.HUBSPOT_ACCESS_TOKEN || process.env.HUBSPOT_API_KEY
const HUBSPOT_API_URL = 'https://api.hubapi.com'

if (!HUBSPOT_API_KEY) {
  console.error('❌ HubSpot API key not found. Please set HUBSPOT_ACCESS_TOKEN environment variable.')
  process.exit(1)
}

async function setupHubSpotProperties() {
  try {
    console.log('🚀 Setting up HubSpot custom properties for NAMC...')
    
    // Define deal properties for opportunities
    const dealProperties = [
      {
        name: 'namc_opportunity_id',
        label: 'NAMC Opportunity ID',
        description: 'Internal NAMC opportunity identifier',
        groupName: 'namc_opportunities',
        type: 'string',
        fieldType: 'text'
      },
      {
        name: 'namc_opportunity_type',
        label: 'NAMC Opportunity Type',
        description: 'Type of NAMC opportunity (Construction, Training, Outreach)',
        groupName: 'namc_opportunities',
        type: 'enumeration',
        fieldType: 'select',
        options: [
          { label: 'Construction', value: 'Construction' },
          { label: 'Training', value: 'Training' },
          { label: 'Outreach', value: 'Outreach' },
          { label: 'Other', value: 'Other' }
        ]
      },
      {
        name: 'namc_opportunity_description',
        label: 'NAMC Opportunity Description',
        description: 'Detailed description of the opportunity',
        groupName: 'namc_opportunities',
        type: 'string',
        fieldType: 'textarea'
      },
      {
        name: 'namc_opportunity_location',
        label: 'NAMC Opportunity Location',
        description: 'Geographic location of the opportunity',
        groupName: 'namc_opportunities',
        type: 'string',
        fieldType: 'text'
      },
      {
        name: 'namc_opportunity_posted_date',
        label: 'NAMC Opportunity Posted Date',
        description: 'Date when the opportunity was posted',
        groupName: 'namc_opportunities',
        type: 'datetime',
        fieldType: 'date'
      },
      {
        name: 'namc_opportunity_contact_info',
        label: 'NAMC Opportunity Contact Info',
        description: 'Contact information for the opportunity',
        groupName: 'namc_opportunities',
        type: 'string',
        fieldType: 'text'
      },
      {
        name: 'namc_opportunity_requirements',
        label: 'NAMC Opportunity Requirements',
        description: 'Requirements and qualifications needed (JSON)',
        groupName: 'namc_opportunities',
        type: 'string',
        fieldType: 'textarea'
      },
      {
        name: 'namc_opportunity_tags',
        label: 'NAMC Opportunity Tags',
        description: 'Tags associated with the opportunity (JSON)',
        groupName: 'namc_opportunities',
        type: 'string',
        fieldType: 'textarea'
      },
      {
        name: 'namc_opportunity_latitude',
        label: 'NAMC Opportunity Latitude',
        description: 'Geographic latitude for mapping',
        groupName: 'namc_opportunities',
        type: 'string',
        fieldType: 'text'
      },
      {
        name: 'namc_opportunity_longitude',
        label: 'NAMC Opportunity Longitude',
        description: 'Geographic longitude for mapping',
        groupName: 'namc_opportunities',
        type: 'string',
        fieldType: 'text'
      },
      {
        name: 'namc_opportunity_score',
        label: 'NAMC Opportunity Score',
        description: 'AI-generated opportunity score',
        groupName: 'namc_opportunities',
        type: 'number',
        fieldType: 'number'
      },
      {
        name: 'namc_complexity_score',
        label: 'NAMC Complexity Score',
        description: 'AI-generated complexity score',
        groupName: 'namc_opportunities',
        type: 'number',
        fieldType: 'number'
      },
      {
        name: 'namc_match_score',
        label: 'NAMC Match Score',
        description: 'AI-generated member match score',
        groupName: 'namc_opportunities',
        type: 'number',
        fieldType: 'number'
      },
      {
        name: 'namc_claude_analysis',
        label: 'NAMC Claude Analysis',
        description: 'AI analysis data (JSON)',
        groupName: 'namc_opportunities',
        type: 'string',
        fieldType: 'textarea'
      }
    ]
    
    // Define contact properties for members
    const contactProperties = [
      {
        name: 'namc_member_id',
        label: 'NAMC Member ID',
        description: 'Internal NAMC member identifier',
        groupName: 'namc_members',
        type: 'string',
        fieldType: 'text'
      },
      {
        name: 'namc_member_type',
        label: 'NAMC Member Type',
        description: 'Type of NAMC membership',
        groupName: 'namc_members',
        type: 'enumeration',
        fieldType: 'select',
        options: [
          { label: 'Regular', value: 'REGULAR' },
          { label: 'Premium', value: 'PREMIUM' },
          { label: 'Executive', value: 'EXECUTIVE' },
          { label: 'Admin', value: 'ADMIN' }
        ]
      },
      {
        name: 'namc_join_date',
        label: 'NAMC Join Date',
        description: 'Date when member joined NAMC',
        groupName: 'namc_members',
        type: 'datetime',
        fieldType: 'date'
      },
      {
        name: 'namc_last_active',
        label: 'NAMC Last Active',
        description: 'Last activity date in NAMC portal',
        groupName: 'namc_members',
        type: 'datetime',
        fieldType: 'date'
      },
      {
        name: 'namc_is_active',
        label: 'NAMC Is Active',
        description: 'Whether the member is currently active',
        groupName: 'namc_members',
        type: 'bool',
        fieldType: 'booleancheckbox',
        options: [
          { label: 'Active', value: 'true' },
          { label: 'Inactive', value: 'false' }
        ]
      },
      {
        name: 'namc_location',
        label: 'NAMC Location',
        description: 'Member location/service area',
        groupName: 'namc_members',
        type: 'string',
        fieldType: 'text'
      }
    ]
    
    // Define company properties
    const companyProperties = [
      {
        name: 'namc_member_company',
        label: 'NAMC Member Company',
        description: 'Whether this company has NAMC members',
        groupName: 'namc_companies',
        type: 'bool',
        fieldType: 'booleancheckbox',
        options: [
          { label: 'Yes', value: 'true' },
          { label: 'No', value: 'false' }
        ]
      },
      {
        name: 'namc_company_member_count',
        label: 'NAMC Company Member Count',
        description: 'Number of NAMC members at this company',
        groupName: 'namc_companies',
        type: 'number',
        fieldType: 'number'
      },
      {
        name: 'namc_company_tier',
        label: 'NAMC Company Tier',
        description: 'Company tier based on member types',
        groupName: 'namc_companies',
        type: 'enumeration',
        fieldType: 'select',
        options: [
          { label: 'Small', value: 'SMALL' },
          { label: 'Medium', value: 'MEDIUM' },
          { label: 'Large', value: 'LARGE' },
          { label: 'Enterprise', value: 'ENTERPRISE' }
        ]
      }
    ]
    
    // Create property groups first
    await createPropertyGroup('deals', 'namc_opportunities', 'NAMC Opportunities', 'Properties related to NAMC project opportunities')
    await createPropertyGroup('contacts', 'namc_members', 'NAMC Members', 'Properties related to NAMC members')
    await createPropertyGroup('companies', 'namc_companies', 'NAMC Companies', 'Properties related to NAMC member companies')
    
    // Create deal properties
    console.log('\n📋 Creating deal properties for opportunities...')
    for (const property of dealProperties) {
      await createProperty('deals', property)
      await new Promise(resolve => setTimeout(resolve, 200)) // Rate limiting
    }
    
    // Create contact properties
    console.log('\n👥 Creating contact properties for members...')
    for (const property of contactProperties) {
      await createProperty('contacts', property)
      await new Promise(resolve => setTimeout(resolve, 200)) // Rate limiting
    }
    
    // Create company properties
    console.log('\n🏢 Creating company properties...')
    for (const property of companyProperties) {
      await createProperty('companies', property)
      await new Promise(resolve => setTimeout(resolve, 200)) // Rate limiting
    }
    
    console.log('\n🎉 HubSpot properties setup completed successfully!')
    console.log('\n📝 Next steps:')
    console.log('   1. Run sync-opportunities-to-hubspot.js')
    console.log('   2. Run sync-members-to-hubspot.js')
    console.log('   3. Update portal to read from HubSpot')
    
  } catch (error) {
    console.error('💥 Setup failed:', error)
    process.exit(1)
  }
}

async function createPropertyGroup(objectType, groupName, displayName, description) {
  try {
    const groupData = {
      name: groupName,
      label: displayName,
      displayName: displayName,
      description: description
    }
    
    const response = await fetch(`${HUBSPOT_API_URL}/crm/v3/properties/${objectType}/groups`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${HUBSPOT_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(groupData)
    })
    
    if (response.ok) {
      console.log(`✅ Created property group: ${displayName}`)
    } else if (response.status === 409) {
      console.log(`ℹ️  Property group already exists: ${displayName}`)
    } else {
      const errorData = await response.json()
      console.error(`❌ Failed to create property group ${displayName}:`, errorData.message)
    }
    
  } catch (error) {
    console.error(`Error creating property group ${displayName}:`, error)
  }
}

async function createProperty(objectType, property) {
  try {
    const propertyData = {
      name: property.name,
      label: property.label,
      description: property.description,
      groupName: property.groupName,
      type: property.type,
      fieldType: property.fieldType,
      options: property.options || undefined
    }
    
    const response = await fetch(`${HUBSPOT_API_URL}/crm/v3/properties/${objectType}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${HUBSPOT_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(propertyData)
    })
    
    if (response.ok) {
      console.log(`  ✅ Created property: ${property.label}`)
    } else if (response.status === 409) {
      console.log(`  ℹ️  Property already exists: ${property.label}`)
    } else {
      const errorData = await response.json()
      console.error(`  ❌ Failed to create property ${property.label}:`, errorData.message)
    }
    
  } catch (error) {
    console.error(`Error creating property ${property.label}:`, error)
  }
}

// Run the setup
if (require.main === module) {
  setupHubSpotProperties()
}
#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client')
const fs = require('fs')
const path = require('path')
const { parse } = require('csv-parse/sync')

const prisma = new PrismaClient()

async function importOpportunities() {
  try {
    console.log('🚀 Starting NAMC Project Opportunities Import...')
    
    // Path to CSV file
    const csvPath = path.join(__dirname, '..', 'NAMC_Project_Opportunities_2025-08-01.csv')
    
    console.log('📁 Reading CSV file:', csvPath)
    
    if (!fs.existsSync(csvPath)) {
      console.error('❌ CSV file not found:', csvPath)
      process.exit(1)
    }
    
    // Read and parse CSV
    const csvContent = fs.readFileSync(csvPath, 'utf-8')
    const rawData = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    })
    
    console.log('📊 Found', rawData.length, 'opportunities in CSV')
    
    let imported = 0
    let skipped = 0
    const errors = []
    
    for (const raw of rawData) {
      try {
        // Process the opportunity
        const processedOpp = processRawOpportunity(raw)
        
        // Check if already exists
        const existing = await prisma.opportunity.findFirst({
          where: {
            title: processedOpp.title,
            datePosted: processedOpp.datePosted
          }
        })
        
        if (existing) {
          console.log('⏭️  Skipping existing:', processedOpp.title)
          skipped++
          continue
        }
        
        // Create new opportunity
        await prisma.opportunity.create({
          data: {
            title: processedOpp.title,
            description: processedOpp.description,
            type: processedOpp.type,
            status: processedOpp.status,
            datePosted: processedOpp.datePosted,
            deadline: processedOpp.deadline,
            contactInfo: processedOpp.contactInfo,
            location: processedOpp.location,
            estimatedValue: processedOpp.estimatedValue,
            requirements: JSON.stringify(processedOpp.requirements || []),
            tags: JSON.stringify(processedOpp.tags || [])
          }
        })
        
        console.log('✅ Imported:', processedOpp.title)
        imported++
        
      } catch (error) {
        const errorMsg = `Error processing "${raw.Subject}": ${error.message}`
        console.error('❌', errorMsg)
        errors.push(errorMsg)
      }
    }
    
    console.log('\n📈 Import Summary:')
    console.log(`✅ Imported: ${imported}`)
    console.log(`⏭️  Skipped: ${skipped}`)
    console.log(`❌ Errors: ${errors.length}`)
    
    if (errors.length > 0) {
      console.log('\n❌ Errors:')
      errors.forEach(err => console.log(`   - ${err}`))
    }
    
    // Show final stats
    const stats = await getOpportunityStats()
    console.log('\n📊 Database Statistics:')
    console.log(`   Total Opportunities: ${stats.total}`)
    console.log(`   Active: ${stats.active}`)
    console.log(`   By Type:`, stats.byType)
    console.log(`   Total Estimated Value: $${stats.totalValue.toLocaleString()}`)
    
    console.log('\n🎉 Import completed successfully!')
    
  } catch (error) {
    console.error('💥 Import failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

function processRawOpportunity(raw) {
  const datePosted = parseDate(raw.Date)
  let deadline = undefined
  if (raw['Deadline/Event Date'] && raw['Deadline/Event Date'].trim() !== '' && raw['Deadline/Event Date'] !== 'Not specified' && raw['Deadline/Event Date'] !== 'Ongoing') {
    const parsedDeadline = parseDate(raw['Deadline/Event Date'])
    if (!isNaN(parsedDeadline.getTime())) {
      deadline = parsedDeadline
    }
  }
  const location = extractLocation(raw.Description)
  const estimatedValue = extractEstimatedValue(raw.Description)
  const requirements = extractRequirements(raw.Description)
  const tags = generateTags(raw)
  const status = mapStatus(raw.Status)
  const type = mapType(raw.Type)

  return {
    title: raw.Subject.trim(),
    description: raw.Description.trim(),
    type,
    status,
    datePosted,
    deadline,
    contactInfo: raw['Contact Info'] !== 'Not specified' ? raw['Contact Info'] : undefined,
    location,
    estimatedValue,
    requirements,
    tags
  }
}

function parseDate(dateStr) {
  try {
    if (dateStr.includes(',')) {
      const datePart = dateStr.split(' - ')[0].trim()
      return new Date(datePart)
    }
    return new Date(dateStr)
  } catch (error) {
    console.warn('Could not parse date:', dateStr, 'using current date')
    return new Date()
  }
}

function extractLocation(description) {
  const locationPatterns = [
    /Location:\s*([^.]+)/i,
    /in\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*,?\s*[A-Z]{2})/,
    /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+County/i,
    /(Oakland|San Francisco|Berkeley|San Jose|Fremont|Alameda|Contra Costa|Solano|Del Norte|Eureka)/i
  ]

  for (const pattern of locationPatterns) {
    const match = description.match(pattern)
    if (match) {
      return match[1].trim()
    }
  }
  return undefined
}

function extractEstimatedValue(description) {
  const valuePatterns = [
    /\$(\d+(?:,\d{3})*(?:\.\d{2})?)[KkMm]?/,
    /valuation[:\s]*\$(\d+(?:,\d{3})*)/i
  ]

  for (const pattern of valuePatterns) {
    const match = description.match(pattern)
    if (match) {
      let value = parseFloat(match[1].replace(/,/g, ''))
      if (match[0].toLowerCase().includes('k')) {
        value *= 1000
      } else if (match[0].toLowerCase().includes('m')) {
        value *= 1000000
      }
      return value
    }
  }
  return undefined
}

function extractRequirements(description) {
  const requirements = []

  if (description.toLowerCase().includes('license')) {
    const licenseMatch = description.match(/License type:\s*([^.]+)/i)
    if (licenseMatch) {
      requirements.push(`License: ${licenseMatch[1].trim()}`)
    } else {
      requirements.push('Valid license required')
    }
  }

  if (description.toLowerCase().includes('dbe')) {
    requirements.push('DBE participation required')
  }

  if (description.toLowerCase().includes('qualified')) {
    requirements.push('Pre-qualification required')
  }

  return requirements
}

function generateTags(raw) {
  const tags = [raw.Type.toLowerCase()]
  const content = (raw.Subject + ' ' + raw.Description).toLowerCase()

  const tagMap = {
    'caltrans': 'Caltrans',
    'ucsf': 'UCSF',
    'kaiser': 'Kaiser',
    'mccarthy': 'McCarthy',
    'swinerton': 'Swinerton',
    'architectural': 'Architecture',
    'engineering': 'Engineering',
    'design': 'Design',
    'construction': 'Construction',
    'fiber optic': 'Fiber Optic',
    'compliance': 'Compliance',
    'training': 'Training',
    'networking': 'Networking',
    'mixer': 'Networking',
    'webinar': 'Education',
    'ai': 'AI/Technology',
    'virtual': 'Virtual Event',
    'in-person': 'In-Person Event'
  }

  for (const [keyword, tag] of Object.entries(tagMap)) {
    if (content.includes(keyword)) {
      tags.push(tag)
    }
  }

  if (raw['Deadline/Event Date']) {
    const deadline = parseDate(raw['Deadline/Event Date'])
    const daysUntil = Math.ceil((deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    
    if (daysUntil < 7) {
      tags.push('Urgent')
    } else if (daysUntil < 30) {
      tags.push('Soon')
    }
  }

  return [...new Set(tags)]
}

function mapStatus(status) {
  const statusMap = {
    'Active': 'Active',
    'In Progress': 'In Progress',
    'Completed': 'Completed',
    'Under Review': 'Under Review'
  }
  return statusMap[status] || 'Active'
}

function mapType(type) {
  const typeMap = {
    'Construction': 'Construction',
    'Training': 'Training',
    'Outreach': 'Outreach'
  }
  return typeMap[type] || 'Other'
}

async function getOpportunityStats() {
  const opportunities = await prisma.opportunity.findMany()

  const stats = {
    total: opportunities.length,
    active: opportunities.filter(op => op.status === 'Active').length,
    byType: {},
    totalValue: 0
  }

  opportunities.forEach(op => {
    stats.byType[op.type] = (stats.byType[op.type] || 0) + 1
    if (op.estimatedValue) {
      stats.totalValue += op.estimatedValue
    }
  })

  return stats
}

// Run the import
if (require.main === module) {
  importOpportunities()
}
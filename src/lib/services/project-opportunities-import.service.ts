import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'
import { parse } from 'csv-parse/sync'

interface RawOpportunityData {
  Date: string
  Sender: string
  Subject: string
  Type: string
  Description: string
  'Deadline/Event Date': string
  'Contact Info': string
  Status: string
}

interface ProcessedOpportunity {
  title: string
  description: string
  type: 'Construction' | 'Training' | 'Outreach' | 'Other'
  status: 'Active' | 'In Progress' | 'Completed' | 'Under Review'
  datePosted: Date
  deadline?: Date
  contactInfo?: string
  sender: string
  location?: string
  estimatedValue?: number
  requirements?: string[]
  tags?: string[]
}

export class ProjectOpportunitiesImportService {
  private prisma: PrismaClient

  constructor() {
    this.prisma = new PrismaClient()
  }

  /**
   * Import project opportunities from CSV file
   */
  async importFromCSV(csvFilePath: string): Promise<{ imported: number; errors: string[] }> {
    try {
      console.log('Starting import of project opportunities from:', csvFilePath)
      
      // Read and parse CSV file
      const csvContent = fs.readFileSync(csvFilePath, 'utf-8')
      const rawData: RawOpportunityData[] = parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true
      })

      console.log('Parsed', rawData.length, 'opportunities from CSV')

      const errors: string[] = []
      let imported = 0

      for (const rawOpportunity of rawData) {
        try {
          const processedOpportunity = this.processRawOpportunity(rawOpportunity)
          
          // Check if opportunity already exists
          const existing = await this.prisma.opportunity.findFirst({
            where: {
              title: processedOpportunity.title,
              datePosted: processedOpportunity.datePosted
            }
          })

          if (existing) {
            console.log('Opportunity already exists, skipping:', processedOpportunity.title)
            continue
          }

          // Create new opportunity
          await this.prisma.opportunity.create({
            data: {
              title: processedOpportunity.title,
              description: processedOpportunity.description,
              type: processedOpportunity.type,
              status: processedOpportunity.status,
              datePosted: processedOpportunity.datePosted,
              deadline: processedOpportunity.deadline,
              contactInfo: processedOpportunity.contactInfo,
              location: processedOpportunity.location,
              estimatedValue: processedOpportunity.estimatedValue,
              requirements: JSON.stringify(processedOpportunity.requirements || []),
              tags: JSON.stringify(processedOpportunity.tags || []),
              // AI analysis fields - will be populated later
              claudeAnalysis: null,
              opportunityScore: null,
              complexityScore: null,
              matchScore: null
            }
          })

          imported++
          console.log('Imported opportunity:', processedOpportunity.title)
        } catch (error) {
          const errorMsg = `Error processing opportunity "${rawOpportunity.Subject}": ${error instanceof Error ? error.message : 'Unknown error'}`
          console.error(errorMsg)
          errors.push(errorMsg)
        }
      }

      console.log('Import completed:', imported, 'imported,', errors.length, 'errors')
      return { imported, errors }
    } catch (error) {
      console.error('Error importing opportunities:', error)
      throw new Error(`Failed to import opportunities: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Process raw CSV data into structured opportunity
   */
  private processRawOpportunity(raw: RawOpportunityData): ProcessedOpportunity {
    // Parse dates
    const datePosted = this.parseDate(raw.Date)
    const deadline = raw['Deadline/Event Date'] ? this.parseDate(raw['Deadline/Event Date']) : undefined

    // Extract location from description
    const location = this.extractLocation(raw.Description)

    // Estimate value from description
    const estimatedValue = this.extractEstimatedValue(raw.Description)

    // Extract requirements and generate tags
    const requirements = this.extractRequirements(raw.Description)
    const tags = this.generateTags(raw)

    // Map status
    const status = this.mapStatus(raw.Status)

    // Map type
    const type = this.mapType(raw.Type)

    return {
      title: raw.Subject.trim(),
      description: raw.Description.trim(),
      type,
      status,
      datePosted,
      deadline,
      contactInfo: raw['Contact Info'] !== 'Not specified' ? raw['Contact Info'] : undefined,
      sender: raw.Sender.trim(),
      location,
      estimatedValue,
      requirements,
      tags
    }
  }

  /**
   * Parse date string to Date object
   */
  private parseDate(dateStr: string): Date {
    try {
      // Handle various date formats
      if (dateStr.includes(',')) {
        // Format: "Jul 29, 2025" or "Aug 28, 2025 - 10:00 AM"
        const datePart = dateStr.split(' - ')[0].trim()
        return new Date(datePart)
      }
      
      return new Date(dateStr)
    } catch (error) {
      console.warn('Could not parse date:', dateStr, 'using current date')
      return new Date()
    }
  }

  /**
   * Extract location information from description
   */
  private extractLocation(description: string): string | undefined {
    const locationPatterns = [
      /Location:\s*([^.]+)/i,
      /in\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*,?\s*[A-Z]{2})/,
      /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+County/i,
      /(Oakland|San Francisco|Berkeley|San Jose|Fremont|Alameda|Contra Costa|Solano|Del Norte)/i
    ]

    for (const pattern of locationPatterns) {
      const match = description.match(pattern)
      if (match) {
        return match[1].trim()
      }
    }

    return undefined
  }

  /**
   * Extract estimated value from description
   */
  private extractEstimatedValue(description: string): number | undefined {
    const valuePatterns = [
      /\$(\d+(?:,\d{3})*(?:\.\d{2})?)[KkMm]?/,
      /valuation[:\s]*\$(\d+(?:,\d{3})*)/i,
      /(\d+(?:,\d{3})*)\s*(?:thousand|million|billion)/i
    ]

    for (const pattern of valuePatterns) {
      const match = description.match(pattern)
      if (match) {
        let value = parseFloat(match[1].replace(/,/g, ''))
        
        // Handle K/M suffixes
        if (match[0].toLowerCase().includes('k')) {
          value *= 1000
        } else if (match[0].toLowerCase().includes('m')) {
          value *= 1000000
        } else if (description.toLowerCase().includes('million')) {
          value *= 1000000
        } else if (description.toLowerCase().includes('thousand')) {
          value *= 1000
        }
        
        return value
      }
    }

    return undefined
  }

  /**
   * Extract requirements from description
   */
  private extractRequirements(description: string): string[] {
    const requirements: string[] = []

    // License requirements
    if (description.toLowerCase().includes('license')) {
      const licenseMatch = description.match(/License type:\s*([^.]+)/i)
      if (licenseMatch) {
        requirements.push(`License: ${licenseMatch[1].trim()}`)
      } else {
        requirements.push('Valid license required')
      }
    }

    // DBE requirements
    if (description.toLowerCase().includes('dbe')) {
      requirements.push('DBE participation required')
    }

    // Qualification requirements
    if (description.toLowerCase().includes('qualified')) {
      requirements.push('Pre-qualification required')
    }

    // Registration requirements
    if (description.toLowerCase().includes('registration')) {
      requirements.push('Registration required')
    }

    return requirements
  }

  /**
   * Generate tags based on opportunity content
   */
  private generateTags(raw: RawOpportunityData): string[] {
    const tags: string[] = []

    // Type-based tags
    tags.push(raw.Type.toLowerCase())

    // Content-based tags
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

    // Deadline urgency
    if (raw['Deadline/Event Date']) {
      const deadline = this.parseDate(raw['Deadline/Event Date'])
      const daysUntil = Math.ceil((deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      
      if (daysUntil < 7) {
        tags.push('Urgent')
      } else if (daysUntil < 30) {
        tags.push('Soon')
      }
    }

    return [...new Set(tags)] // Remove duplicates
  }

  /**
   * Map CSV status to database enum
   */
  private mapStatus(status: string): 'Active' | 'In Progress' | 'Completed' | 'Under Review' {
    const statusMap: Record<string, 'Active' | 'In Progress' | 'Completed' | 'Under Review'> = {
      'Active': 'Active',
      'In Progress': 'In Progress',
      'Completed': 'Completed',
      'Under Review': 'Under Review'
    }

    return statusMap[status] || 'Active'
  }

  /**
   * Map CSV type to database enum
   */
  private mapType(type: string): 'Construction' | 'Training' | 'Outreach' | 'Other' {
    const typeMap: Record<string, 'Construction' | 'Training' | 'Outreach' | 'Other'> = {
      'Construction': 'Construction',
      'Training': 'Training',
      'Outreach': 'Outreach'
    }

    return typeMap[type] || 'Other'
  }

  /**
   * Get opportunities statistics
   */
  async getOpportunityStats(): Promise<{
    total: number
    active: number
    byType: Record<string, number>
    byStatus: Record<string, number>
    totalValue: number
  }> {
    const opportunities = await this.prisma.opportunity.findMany()

    const stats = {
      total: opportunities.length,
      active: opportunities.filter(op => op.status === 'Active').length,
      byType: {} as Record<string, number>,
      byStatus: {} as Record<string, number>,
      totalValue: 0
    }

    opportunities.forEach(op => {
      // Count by type
      stats.byType[op.type] = (stats.byType[op.type] || 0) + 1
      
      // Count by status
      stats.byStatus[op.status] = (stats.byStatus[op.status] || 0) + 1
      
      // Sum estimated values
      if (op.estimatedValue) {
        stats.totalValue += op.estimatedValue
      }
    })

    return stats
  }

  /**
   * Clean up - close database connection
   */
  async disconnect(): Promise<void> {
    await this.prisma.$disconnect()
  }
}

export default ProjectOpportunitiesImportService
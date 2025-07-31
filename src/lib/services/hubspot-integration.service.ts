import { PrismaClient } from '@prisma/client'
import { notificationService } from './notification.service'

// HubSpot Integration Service for NAMC Member Portal
// Integrates engagement tracking with HubSpot CRM for automated workflows

interface HubSpotContact {
  id: string
  email: string
  firstname: string
  lastname: string
  company: string
  phone?: string
  website?: string
  city?: string
  state?: string
  // NAMC-specific custom properties
  namc_member_id: string
  namc_member_type: 'REGULAR' | 'PREMIUM' | 'EXECUTIVE'
  namc_engagement_score: number
  namc_risk_level: 'low' | 'medium' | 'high'
  namc_last_project_view: string
  namc_total_project_views: number
  namc_total_downloads: number
  namc_total_inquiries: number
  namc_preferred_categories: string
  namc_activity_streak: number
  namc_join_date: string
  namc_last_engagement_date: string
  lifecycle_stage: string
  lead_status: string
}

interface HubSpotDeal {
  id: string
  dealname: string
  amount: number
  dealstage: string
  pipeline: string
  closedate: string
  // NAMC-specific custom properties
  namc_project_id: string
  namc_project_title: string
  namc_project_budget_range: string
  namc_project_deadline: string
  namc_member_engagement_score: number
  namc_inquiry_date: string
  namc_contact_method: string
  namc_project_category: string
}

interface HubSpotCompany {
  id: string
  name: string
  domain?: string
  city?: string
  state?: string
  phone?: string
  // NAMC-specific custom properties
  namc_member_companies: string
  namc_total_members: number
  namc_avg_engagement_score: number
  namc_total_project_inquiries: number
  namc_preferred_project_types: string
  namc_company_tier: 'SMALL' | 'MEDIUM' | 'LARGE' | 'ENTERPRISE'
}

interface EngagementSyncData {
  memberId: string
  email: string
  engagementScore: number
  riskLevel: 'low' | 'medium' | 'high'
  lastActivity: string
  totalViews: number
  totalDownloads: number
  totalInquiries: number
  preferredCategories: string[]
  activityStreak: number
}

interface ProjectInquiryData {
  memberId: string
  memberEmail: string
  memberName: string
  projectId: string
  projectTitle: string
  projectBudget: string
  projectDeadline: string
  projectCategory: string
  inquiryType: 'view' | 'download' | 'inquiry' | 'interest'
  engagementScore: number
  contactMethod?: string
  message?: string
}

export class HubSpotIntegrationService {
  private prisma: PrismaClient
  private hubspotApiKey: string
  private hubspotApiUrl = 'https://api.hubapi.com'

  constructor() {
    this.prisma = new PrismaClient()
    this.hubspotApiKey = process.env.HUBSPOT_API_KEY || ''
    
    if (!this.hubspotApiKey) {
      console.warn('HubSpot API key not found. Integration features will be disabled.')
    }
  }

  /**
   * Sync member engagement data to HubSpot contact
   */
  async syncMemberEngagement(engagementData: EngagementSyncData): Promise<boolean> {
    try {
      if (!this.hubspotApiKey) {
        console.log('HubSpot integration disabled - API key not configured')
        return false
      }

      // Find or create HubSpot contact
      const contactId = await this.findOrCreateContact(engagementData)
      
      if (!contactId) {
        throw new Error(`Failed to find or create HubSpot contact for ${engagementData.email}`)
      }

      // Update contact with engagement data
      const updateData = {
        properties: {
          namc_member_id: engagementData.memberId,
          namc_engagement_score: engagementData.engagementScore.toString(),
          namc_risk_level: engagementData.riskLevel,
          namc_last_engagement_date: engagementData.lastActivity,
          namc_total_project_views: engagementData.totalViews.toString(),
          namc_total_downloads: engagementData.totalDownloads.toString(),
          namc_total_inquiries: engagementData.totalInquiries.toString(),
          namc_preferred_categories: engagementData.preferredCategories.join(', '),
          namc_activity_streak: engagementData.activityStreak.toString(),
          // Update lifecycle stage based on engagement
          lifecycle_stage: this.getLifecycleStage(engagementData.engagementScore),
          // Update lead status based on risk level
          lead_status: this.getLeadStatus(engagementData.riskLevel)
        }
      }

      const response = await fetch(`${this.hubspotApiUrl}/crm/v3/objects/contacts/${contactId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${this.hubspotApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(`HubSpot API error: ${errorData.message}`)
      }

      // Trigger workflows based on engagement changes
      await this.triggerEngagementWorkflows(contactId, engagementData)

      console.log(`Successfully synced engagement data for member ${engagementData.memberId}`)
      return true

    } catch (error) {
      console.error('Error syncing member engagement to HubSpot:', error)
      
      // Send failure notification
      await notificationService.notifyHubSpotSyncFailed(
        'member_engagement',
        error instanceof Error ? error.message : 'Unknown error'
      ).catch(notifyError => {
        console.error('Failed to send HubSpot sync failure notification:', notifyError)
      })
      
      return false
    }
  }

  /**
   * Create HubSpot deal from project inquiry
   */
  async createProjectInquiryDeal(inquiryData: ProjectInquiryData): Promise<string | null> {
    try {
      if (!this.hubspotApiKey) {
        console.log('HubSpot integration disabled - API key not configured')
        return null
      }

      // Find contact ID
      const contactId = await this.findContactByEmail(inquiryData.memberEmail)
      if (!contactId) {
        console.error(`Contact not found for email: ${inquiryData.memberEmail}`)
        return null
      }

      // Determine deal stage based on inquiry type
      const dealStage = this.getDealStage(inquiryData.inquiryType)
      const dealAmount = this.estimateDealAmount(inquiryData.projectBudget)

      const dealData = {
        properties: {
          dealname: `${inquiryData.projectTitle} - ${inquiryData.memberName}`,
          amount: dealAmount.toString(),
          dealstage: dealStage,
          pipeline: 'namc_project_pipeline',
          closedate: inquiryData.projectDeadline,
          // NAMC custom properties
          namc_project_id: inquiryData.projectId,
          namc_project_title: inquiryData.projectTitle,
          namc_project_budget_range: inquiryData.projectBudget,
          namc_project_deadline: inquiryData.projectDeadline,
          namc_member_engagement_score: inquiryData.engagementScore.toString(),
          namc_inquiry_date: new Date().toISOString(),
          namc_contact_method: inquiryData.contactMethod || 'Portal',
          namc_project_category: inquiryData.projectCategory
        },
        associations: [
          {
            to: { id: contactId },
            types: [
              {
                associationCategory: 'HUBSPOT_DEFINED',
                associationTypeId: 3 // Contact to Deal association
              }
            ]
          }
        ]
      }

      const response = await fetch(`${this.hubspotApiUrl}/crm/v3/objects/deals`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.hubspotApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(dealData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(`HubSpot deal creation error: ${errorData.message}`)
      }

      const dealResult = await response.json()
      
      // Add note to deal if message provided
      if (inquiryData.message) {
        await this.addNoteToEngagement(dealResult.id, 'deal', inquiryData.message)
      }

      console.log(`Successfully created HubSpot deal ${dealResult.id} for project inquiry`)
      return dealResult.id

    } catch (error) {
      console.error('Error creating HubSpot deal:', error)
      return null
    }
  }

  /**
   * Bulk sync engagement data for multiple members
   */
  async bulkSyncEngagement(engagementDataList: EngagementSyncData[]): Promise<{ success: number, failed: number }> {
    let success = 0
    let failed = 0

    // Process in batches to avoid rate limits
    const batchSize = 10
    for (let i = 0; i < engagementDataList.length; i += batchSize) {
      const batch = engagementDataList.slice(i, i + batchSize)
      
      const promises = batch.map(async (data) => {
        try {
          const result = await this.syncMemberEngagement(data)
          return result
        } catch (error) {
          console.error(`Failed to sync member ${data.memberId}:`, error)
          return false
        }
      })

      const results = await Promise.all(promises)
      success += results.filter(r => r).length
      failed += results.filter(r => !r).length

      // Rate limiting delay
      if (i + batchSize < engagementDataList.length) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }

    console.log(`Bulk sync completed: ${success} successful, ${failed} failed`)
    
    // Send completion notification
    await notificationService.notifyHubSpotSyncCompleted(
      'bulk_member_sync',
      success,
      failed
    ).catch(error => {
      console.error('Failed to send HubSpot sync completion notification:', error)
    })
    
    return { success, failed }
  }

  /**
   * Create or update company in HubSpot
   */
  async syncCompanyData(companyData: {
    name: string
    domain?: string
    city?: string
    state?: string
    phone?: string
    memberCount: number
    avgEngagementScore: number
    totalInquiries: number
    preferredTypes: string[]
    tier: 'SMALL' | 'MEDIUM' | 'LARGE' | 'ENTERPRISE'
  }): Promise<string | null> {
    try {
      if (!this.hubspotApiKey) return null

      const companyProps = {
        properties: {
          name: companyData.name,
          domain: companyData.domain,
          city: companyData.city,
          state: companyData.state,
          phone: companyData.phone,
          namc_total_members: companyData.memberCount.toString(),
          namc_avg_engagement_score: companyData.avgEngagementScore.toString(),
          namc_total_project_inquiries: companyData.totalInquiries.toString(),
          namc_preferred_project_types: companyData.preferredTypes.join(', '),
          namc_company_tier: companyData.tier
        }
      }

      // Try to find existing company first
      const searchResponse = await fetch(`${this.hubspotApiUrl}/crm/v3/objects/companies/search`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.hubspotApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          filterGroups: [
            {
              filters: [
                {
                  propertyName: 'name',
                  operator: 'EQ',
                  value: companyData.name
                }
              ]
            }
          ]
        })
      })

      if (searchResponse.ok) {
        const searchResult = await searchResponse.json()
        if (searchResult.results && searchResult.results.length > 0) {
          // Update existing company
          const companyId = searchResult.results[0].id
          const updateResponse = await fetch(`${this.hubspotApiUrl}/crm/v3/objects/companies/${companyId}`, {
            method: 'PATCH',
            headers: {
              'Authorization': `Bearer ${this.hubspotApiKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(companyProps)
          })

          if (updateResponse.ok) {
            return companyId
          }
        }
      }

      // Create new company
      const createResponse = await fetch(`${this.hubspotApiUrl}/crm/v3/objects/companies`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.hubspotApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(companyProps)
      })

      if (createResponse.ok) {
        const result = await createResponse.json()
        return result.id
      }

      return null

    } catch (error) {
      console.error('Error syncing company data:', error)
      return null
    }
  }

  /**
   * Get engagement analytics from HubSpot
   */
  async getHubSpotEngagementAnalytics(): Promise<{
    totalContacts: number
    activeContacts: number
    highEngagementContacts: number
    atRiskContacts: number
    avgEngagementScore: number
    totalDeals: number
    avgDealValue: number
  } | null> {
    try {
      if (!this.hubspotApiKey) return null

      // Get contact analytics
      const contactsResponse = await fetch(`${this.hubspotApiUrl}/crm/v3/objects/contacts?properties=namc_engagement_score,namc_risk_level,namc_last_engagement_date&limit=100`, {
        headers: {
          'Authorization': `Bearer ${this.hubspotApiKey}`
        }
      })

      // Get deals analytics
      const dealsResponse = await fetch(`${this.hubspotApiUrl}/crm/v3/objects/deals?properties=amount,dealstage,namc_project_id&limit=100`, {
        headers: {
          'Authorization': `Bearer ${this.hubspotApiKey}`
        }
      })

      if (!contactsResponse.ok || !dealsResponse.ok) {
        throw new Error('Failed to fetch HubSpot analytics')
      }

      const contactsData = await contactsResponse.json()
      const dealsData = await dealsResponse.json()

      // Process contact data
      const contacts = contactsData.results || []
      const totalContacts = contacts.length
      let activeContacts = 0
      let highEngagementContacts = 0
      let atRiskContacts = 0
      let totalEngagementScore = 0

      contacts.forEach((contact: any) => {
        const engagementScore = parseFloat(contact.properties.namc_engagement_score || '0')
        const riskLevel = contact.properties.namc_risk_level
        const lastEngagement = contact.properties.namc_last_engagement_date

        totalEngagementScore += engagementScore

        if (lastEngagement && new Date(lastEngagement) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)) {
          activeContacts++
        }

        if (engagementScore >= 80) {
          highEngagementContacts++
        }

        if (riskLevel === 'high') {
          atRiskContacts++
        }
      })

      // Process deals data
      const deals = dealsData.results || []
      const totalDeals = deals.length
      const totalDealValue = deals.reduce((sum: number, deal: any) => {
        return sum + (parseFloat(deal.properties.amount || '0'))
      }, 0)

      return {
        totalContacts,
        activeContacts,
        highEngagementContacts,
        atRiskContacts,
        avgEngagementScore: totalContacts > 0 ? totalEngagementScore / totalContacts : 0,
        totalDeals,
        avgDealValue: totalDeals > 0 ? totalDealValue / totalDeals : 0
      }

    } catch (error) {
      console.error('Error fetching HubSpot analytics:', error)
      return null
    }
  }

  // Private helper methods

  private async findOrCreateContact(engagementData: EngagementSyncData): Promise<string | null> {
    try {
      // Try to find existing contact
      const contactId = await this.findContactByEmail(engagementData.email)
      if (contactId) {
        return contactId
      }

      // Create new contact
      const member = await this.prisma.user.findUnique({
        where: { id: engagementData.memberId }
      })

      if (!member) {
        throw new Error(`Member not found: ${engagementData.memberId}`)
      }

      const createData = {
        properties: {
          email: engagementData.email,
          firstname: member.firstName || '',
          lastname: member.lastName || '',
          company: member.company || '',
          phone: member.phone || '',
          city: member.location?.split(',')[0] || '',
          state: member.location?.split(',')[1]?.trim() || '',
          namc_member_id: engagementData.memberId,
          namc_member_type: member.memberType,
          namc_join_date: member.createdAt.toISOString(),
          lifecycle_stage: 'subscriber'
        }
      }

      const response = await fetch(`${this.hubspotApiUrl}/crm/v3/objects/contacts`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.hubspotApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(createData)
      })

      if (response.ok) {
        const result = await response.json()
        return result.id
      }

      return null

    } catch (error) {
      console.error('Error finding or creating contact:', error)
      return null
    }
  }

  private async findContactByEmail(email: string): Promise<string | null> {
    try {
      const response = await fetch(`${this.hubspotApiUrl}/crm/v3/objects/contacts/${email}?idProperty=email`, {
        headers: {
          'Authorization': `Bearer ${this.hubspotApiKey}`
        }
      })

      if (response.ok) {
        const contact = await response.json()
        return contact.id
      }

      return null

    } catch (error) {
      console.error('Error finding contact by email:', error)
      return null
    }
  }

  private getLifecycleStage(engagementScore: number): string {
    if (engagementScore >= 80) return 'customer'
    if (engagementScore >= 60) return 'opportunity'
    if (engagementScore >= 40) return 'marketingqualifiedlead'
    return 'subscriber'
  }

  private getLeadStatus(riskLevel: string): string {
    switch (riskLevel) {
      case 'low': return 'ENGAGED'
      case 'medium': return 'FOLLOW_UP'
      case 'high': return 'AT_RISK'
      default: return 'NEW'
    }
  }

  private getDealStage(inquiryType: string): string {
    switch (inquiryType) {
      case 'inquiry': return 'qualified_proposal'
      case 'interest': return 'qualified_opportunity'
      case 'download': return 'initial_interest'
      case 'view': return 'awareness'
      default: return 'awareness'
    }
  }

  private estimateDealAmount(budgetRange: string): number {
    // Extract numbers from budget range and estimate
    const matches = budgetRange.match(/\$?([\d,]+(?:\.\d+)?)[MK]?/g)
    if (!matches) return 0

    const amounts = matches.map(match => {
      let num = parseFloat(match.replace(/[$,]/g, ''))
      if (match.includes('M')) num *= 1000000
      if (match.includes('K')) num *= 1000
      return num
    })

    return amounts.length > 1 ? (amounts[0] + amounts[1]) / 2 : amounts[0]
  }

  private async triggerEngagementWorkflows(contactId: string, engagementData: EngagementSyncData): Promise<void> {
    try {
      // Trigger workflows based on engagement changes
      const workflows = []

      // High engagement workflow
      if (engagementData.engagementScore >= 80) {
        workflows.push('high_engagement_workflow')
      }

      // At-risk workflow
      if (engagementData.riskLevel === 'high') {
        workflows.push('at_risk_member_workflow')
      }

      // Activity streak workflow
      if (engagementData.activityStreak >= 7) {
        workflows.push('active_member_recognition_workflow')
      }

      // Execute workflows (placeholder - would integrate with HubSpot workflows API)
      for (const workflowId of workflows) {
        console.log(`Triggering workflow ${workflowId} for contact ${contactId}`)
        // Implementation would depend on specific HubSpot workflow IDs
      }

    } catch (error) {
      console.error('Error triggering workflows:', error)
    }
  }

  private async addNoteToEngagement(objectId: string, objectType: 'contact' | 'deal', note: string): Promise<void> {
    try {
      const noteData = {
        engagement: {
          active: true,
          type: 'NOTE'
        },
        metadata: {
          body: note
        },
        associations: {
          contactIds: objectType === 'contact' ? [objectId] : [],
          dealIds: objectType === 'deal' ? [objectId] : []
        }
      }

      await fetch(`${this.hubspotApiUrl}/engagements/v1/engagements`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.hubspotApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(noteData)
      })

    } catch (error) {
      console.error('Error adding note:', error)
    }
  }

  async disconnect(): Promise<void> {
    await this.prisma.$disconnect()
  }
}
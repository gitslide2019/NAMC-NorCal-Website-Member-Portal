/**
 * HubSpot Member Service Integration
 * Automatically syncs NAMC NorCal member data to HubSpot CRM as a value-added service
 * Members get this as part of their membership benefits - no manual action required
 */

import HubSpotService from '@/services/hubspot.service'

interface NAMCMember {
  id: string
  email: string
  firstName: string
  lastName: string
  company?: string
  phone?: string
  specialties: string[]
  licenseNumber?: string
  yearsExperience?: number
  membershipTier: 'Bronze' | 'Silver' | 'Gold' | 'Platinum'
  membershipStatus: 'Active' | 'Pending' | 'Suspended'
  joinDate: string
  lastLogin?: string
  serviceAreas?: string
  website?: string
  certifications?: string[]
}

export class HubSpotMemberService {
  private hubspotService: HubSpotService

  constructor() {
    const apiKey = process.env.HUBSPOT_ACCESS_TOKEN
    if (!apiKey) {
      throw new Error('HubSpot API key not configured for member service')
    }
    this.hubspotService = new HubSpotService(apiKey)
  }

  /**
   * Automatically sync member to HubSpot when they access the portal
   * This runs in the background as a member service benefit
   */
  async autoSyncMember(member: NAMCMember): Promise<{
    success: boolean
    contactId?: string
    message: string
    isNewContact: boolean
  }> {
    try {
      // Check if contact already exists
      const existingContact = await this.hubspotService.findContactByEmail(member.email)
      const isNewContact = !existingContact

      // Prepare member data for HubSpot
      const hubspotData = {
        id: member.id,
        email: member.email,
        firstName: member.firstName,
        lastName: member.lastName,
        companyName: member.company,
        phone: member.phone,
        jobTitle: 'NAMC NorCal Member',
        specialties: member.specialties,
        membership: {
          tier: member.membershipTier,
          status: member.membershipStatus
        },
        profile: {
          yearsExperience: member.yearsExperience,
          licenseNumber: member.licenseNumber,
          serviceAreas: member.serviceAreas,
          website: member.website,
          joinDate: member.joinDate,
          lastLogin: member.lastLogin
        },
        certifications: member.certifications?.map(cert => ({ name: cert }))
      }

      // Sync to HubSpot
      const contact = await this.hubspotService.syncContact(hubspotData)

      // Add to NAMC member list if new contact
      if (isNewContact && contact.id) {
        await this.addToNAMCMemberList(contact.id)
      }

      // Tag with membership tier
      if (contact.id) {
        await this.tagMembershipTier(contact.id, member.membershipTier)
      }

      return {
        success: true,
        contactId: contact.id,
        message: isNewContact 
          ? 'Member added to HubSpot CRM as part of membership services'
          : 'Member profile updated in HubSpot CRM',
        isNewContact
      }

    } catch (error) {
      console.error('HubSpot member sync error:', error)
      return {
        success: false,
        message: `Member service sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        isNewContact: false
      }
    }
  }

  /**
   * Create a project opportunity deal for a member automatically
   * When members apply to projects through the portal
   */
  async createProjectOpportunity(member: NAMCMember, projectData: {
    projectId: string
    projectName: string
    projectType: string
    estimatedValue: number
    location: string
    deadline: string
    description?: string
  }): Promise<{
    success: boolean
    dealId?: string
    message: string
  }> {
    try {
      // First ensure member is synced to HubSpot
      await this.autoSyncMember(member)

      // Create deal for the project opportunity
      const deal = await this.hubspotService.createDeal({
        projectId: projectData.projectId,
        memberId: member.id,
        dealName: `${projectData.projectName} - ${member.company || member.firstName + ' ' + member.lastName}`,
        amount: projectData.estimatedValue,
        closeDate: projectData.deadline,
        projectType: projectData.projectType,
        location: projectData.location,
        budgetRange: this.getBudgetRange(projectData.estimatedValue)
      })

      // Associate deal with member contact
      const memberContact = await this.hubspotService.findContactByEmail(member.email)
      if (memberContact?.id && deal.id) {
        await this.hubspotService.associateContactWithDeal(memberContact.id, deal.id)
      }

      return {
        success: true,
        dealId: deal.id,
        message: 'Project opportunity tracked in HubSpot CRM for member services'
      }

    } catch (error) {
      console.error('HubSpot project opportunity error:', error)
      return {
        success: false,
        message: `Project tracking failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }

  /**
   * Track member engagement and activities
   * Runs automatically when members use portal features
   */
  async trackMemberActivity(member: NAMCMember, activity: {
    type: 'portal_login' | 'project_view' | 'project_apply' | 'resource_download' | 'event_rsvp' | 'directory_search'
    details: string
    timestamp?: Date
  }): Promise<void> {
    try {
      const memberContact = await this.hubspotService.findContactByEmail(member.email)
      
      if (memberContact?.id) {
        // In a full implementation, this would create HubSpot activities/engagements
        // For now, we'll update the last activity date
        await this.hubspotService.updateContact(memberContact.id, {
          properties: {
            last_portal_activity: new Date().toISOString(),
            portal_activity_type: activity.type,
            portal_activity_details: activity.details
          }
        })
      }
    } catch (error) {
      console.error('HubSpot activity tracking error:', error)
      // Don't throw - activity tracking shouldn't break member experience
    }
  }

  /**
   * Get member's HubSpot data for dashboard display
   */
  async getMemberHubSpotData(memberEmail: string): Promise<{
    contact?: any
    deals?: any[]
    activities?: any[]
    stats?: {
      totalDeals: number
      totalValue: number
      activeDeals: number
      lastActivity: string | null
    }
  }> {
    try {
      const contact = await this.hubspotService.findContactByEmail(memberEmail)
      
      if (!contact) {
        return { contact: null, deals: [], activities: [], stats: undefined }
      }

      // In a full implementation, these would be actual HubSpot API calls
      // For now, return structured data format
      return {
        contact,
        deals: [], // Would fetch deals associated with contact
        activities: [], // Would fetch recent activities
        stats: {
          totalDeals: 0,
          totalValue: 0,
          activeDeals: 0,
          lastActivity: null
        }
      }

    } catch (error) {
      console.error('HubSpot member data fetch error:', error)
      return { contact: null, deals: [], activities: [], stats: undefined }
    }
  }

  /**
   * Bulk sync all NAMC members to HubSpot
   * For initial setup or periodic maintenance
   */
  async bulkSyncMembers(members: NAMCMember[]): Promise<{
    successful: number
    failed: number
    results: Array<{ email: string; success: boolean; message: string }>
  }> {
    const results = []
    let successful = 0
    let failed = 0

    for (const member of members) {
      const result = await this.autoSyncMember(member)
      results.push({
        email: member.email,
        success: result.success,
        message: result.message
      })
      
      if (result.success) {
        successful++
      } else {
        failed++
      }

      // Rate limiting - wait between requests
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    return { successful, failed, results }
  }

  // Private helper methods
  private async addToNAMCMemberList(contactId: string): Promise<void> {
    try {
      // Add contact to NAMC Members list in HubSpot
      // This would use a specific HubSpot list ID for NAMC members
      const namcMembersListId = process.env.HUBSPOT_NAMC_MEMBERS_LIST_ID
      if (namcMembersListId) {
        await this.hubspotService.addContactToList(namcMembersListId, contactId)
      }
    } catch (error) {
      console.error('Error adding to NAMC members list:', error)
    }
  }

  private async tagMembershipTier(contactId: string, tier: string): Promise<void> {
    try {
      // Update membership tier property
      await this.hubspotService.updateContact(contactId, {
        properties: {
          membership_tier: tier,
          namc_member: 'true',
          member_type: 'NAMC NorCal'
        }
      })
    } catch (error) {
      console.error('Error tagging membership tier:', error)
    }
  }

  private getBudgetRange(amount: number): string {
    if (amount < 50000) return '$0-$50k'
    if (amount < 100000) return '$50k-$100k'
    if (amount < 250000) return '$100k-$250k'
    if (amount < 500000) return '$250k-$500k'
    if (amount < 1000000) return '$500k-$1M'
    return '$1M+'
  }
}

export default HubSpotMemberService
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]/route'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// HubSpot API configuration
const HUBSPOT_API_KEY = process.env.HUBSPOT_ACCESS_TOKEN || process.env.HUBSPOT_API_KEY
const HUBSPOT_API_URL = 'https://api.hubapi.com'

export async function POST(request: NextRequest) {
  try {
    // Check authentication and admin role
    const session = await getServerSession(authOptions)
    if (!session || session.user.memberType !== 'ADMIN') {
      return NextResponse.json(
        { success: false, message: 'Admin access required' },
        { status: 403 }
      )
    }

    if (!HUBSPOT_API_KEY) {
      return NextResponse.json(
        { success: false, message: 'HubSpot API key not configured' },
        { status: 400 }
      )
    }

    // Get all members from database
    const members = await prisma.user.findMany()
    
    let synced = 0
    let errors: string[] = []

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
        errors.push(`${member.name || member.email}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    return NextResponse.json({
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
    console.error('HubSpot sync error:', error)
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to sync members',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}

async function findExistingContact(email: string) {
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

async function syncMemberCompany(member: any) {
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

function getCompanyTier(memberType: string): string {
  const tierMap: Record<string, string> = {
    'REGULAR': 'SMALL',
    'PREMIUM': 'MEDIUM',
    'EXECUTIVE': 'LARGE',
    'ADMIN': 'ENTERPRISE'
  }
  return tierMap[memberType] || 'SMALL'
}
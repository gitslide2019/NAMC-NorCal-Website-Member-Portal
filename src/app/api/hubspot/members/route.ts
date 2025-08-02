import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// HubSpot API configuration
const HUBSPOT_API_KEY = process.env.HUBSPOT_ACCESS_TOKEN || process.env.HUBSPOT_API_KEY
const HUBSPOT_API_URL = 'https://api.hubapi.com'

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      )
    }

    // Try to get data from HubSpot first, fallback to database
    let members: any[] = []
    let source = 'database'

    if (HUBSPOT_API_KEY) {
      try {
        const response = await fetch(`${HUBSPOT_API_URL}/crm/v3/objects/contacts?properties=email,firstname,lastname,company,phone,website,city,state,namc_member_id,namc_member_type,namc_join_date,namc_last_active,namc_is_active,namc_location&limit=100`, {
          headers: {
            'Authorization': `Bearer ${HUBSPOT_API_KEY}`
          }
        })

        if (response.ok) {
          const data = await response.json()
          const contacts = data.results || []

          // Transform HubSpot contacts back to member format
          members = contacts
            .filter((contact: any) => contact.properties.namc_member_id) // Only NAMC members
            .map((contact: any) => ({
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

          source = 'hubspot'
        }
      } catch (hubspotError) {
        console.warn('Failed to fetch from HubSpot, falling back to database:', hubspotError)
      }
    }

    // Fallback to database if HubSpot failed or no data
    if (members.length === 0) {
      const dbMembers = await prisma.user.findMany({
        where: { isActive: true },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          name: true,
          company: true,
          phone: true,
          website: true,
          location: true,
          memberType: true,
          isActive: true,
          createdAt: true,
          updatedAt: true
        }
      })
      members = dbMembers
      source = 'database'
    }

    return NextResponse.json({
      success: true,
      data: members,
      total: members.length,
      source
    })

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to get members',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}
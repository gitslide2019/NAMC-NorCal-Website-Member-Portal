import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import HubSpotService from '@/services/hubspot.service'

interface TestResult {
  name: string
  status: 'success' | 'failure' | 'warning'
  message: string
  data?: any
  duration?: number
}

export async function GET() {
  const startTime = Date.now()
  const results: TestResult[] = []

  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 401 })
    }

    // Check HubSpot API configuration
    const hubspotApiKey = process.env.HUBSPOT_ACCESS_TOKEN
    const portalId = process.env.HUBSPOT_PORTAL_ID

    if (!hubspotApiKey) {
      results.push({
        name: 'Environment Configuration',
        status: 'failure',
        message: 'HUBSPOT_ACCESS_TOKEN not configured in environment variables'
      })
    } else {
      results.push({
        name: 'API Key Configuration',
        status: 'success',
        message: 'HubSpot API key is configured',
        data: { keyLength: hubspotApiKey.length, masked: hubspotApiKey.substring(0, 8) + '...' }
      })
    }

    if (!portalId) {
      results.push({
        name: 'Portal ID Configuration',
        status: 'warning',
        message: 'HUBSPOT_PORTAL_ID not configured (optional)'
      })
    } else {
      results.push({
        name: 'Portal ID Configuration',
        status: 'success',
        message: 'HubSpot Portal ID is configured',
        data: { portalId }
      })
    }

    if (!hubspotApiKey) {
      return NextResponse.json({
        success: false,
        totalTests: results.length,
        passed: results.filter(r => r.status === 'success').length,
        failed: results.filter(r => r.status === 'failure').length,
        warnings: results.filter(r => r.status === 'warning').length,
        results,
        message: 'Cannot proceed with API tests - missing configuration'
      })
    }

    const hubspotService = new HubSpotService(hubspotApiKey)

    // Test 1: Basic API connectivity
    try {
      const testStart = Date.now()
      const contacts = await hubspotService.makeRequest('/crm/v3/objects/contacts?limit=1')
      const duration = Date.now() - testStart
      
      results.push({
        name: 'API Connectivity',
        status: 'success',
        message: 'Successfully connected to HubSpot API',
        data: { responseTime: `${duration}ms`, contactsFound: contacts.results?.length || 0 },
        duration
      })
    } catch (error) {
      results.push({
        name: 'API Connectivity',
        status: 'failure',
        message: `Failed to connect to HubSpot API: ${error instanceof Error ? error.message : 'Unknown error'}`
      })
    }

    // Test 2: Contact permissions
    try {
      const testStart = Date.now()
      const testContact = {
        properties: {
          email: 'test@namctest.org',
          firstname: 'Test',
          lastname: 'Contact',
          company: 'NAMC Test Company'
        }
      }
      
      const created = await hubspotService.createContact(testContact)
      const duration = Date.now() - testStart
      
      results.push({
        name: 'Contact Creation Permissions',
        status: 'success',
        message: 'Successfully created test contact',
        data: { contactId: created.id, duration: `${duration}ms` },
        duration
      })

      // Clean up test contact
      try {
        await hubspotService.makeRequest(`/crm/v3/objects/contacts/${created.id}`, 'DELETE')
      } catch (cleanupError) {
        // Ignore cleanup errors
      }
    } catch (error) {
      results.push({
        name: 'Contact Creation Permissions',
        status: 'failure',
        message: `Failed to create contact: ${error instanceof Error ? error.message : 'Unknown error'}`
      })
    }

    // Test 3: Deal permissions
    try {
      const testStart = Date.now()
      const testDeal = {
        properties: {
          dealname: 'NAMC Test Deal',
          dealstage: 'appointmentscheduled',
          pipeline: 'default',
          amount: '50000',
          closedate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        }
      }
      
      const created = await hubspotService.makeRequest('/crm/v3/objects/deals', 'POST', testDeal)
      const duration = Date.now() - testStart
      
      results.push({
        name: 'Deal Creation Permissions',
        status: 'success',
        message: 'Successfully created test deal',
        data: { dealId: created.id, duration: `${duration}ms` },
        duration
      })

      // Clean up test deal
      try {
        await hubspotService.makeRequest(`/crm/v3/objects/deals/${created.id}`, 'DELETE')
      } catch (cleanupError) {
        // Ignore cleanup errors
      }
    } catch (error) {
      results.push({
        name: 'Deal Creation Permissions',
        status: 'failure',
        message: `Failed to create deal: ${error instanceof Error ? error.message : 'Unknown error'}`
      })
    }

    // Test 4: Search functionality
    try {
      const testStart = Date.now()
      const searchResult = await hubspotService.makeRequest(
        '/crm/v3/objects/contacts/search',
        'POST',
        {
          filterGroups: [{
            filters: [{
              propertyName: 'email',
              operator: 'CONTAINS_TOKEN',
              value: 'test'
            }]
          }],
          limit: 5
        }
      )
      const duration = Date.now() - testStart
      
      results.push({
        name: 'Search Functionality',
        status: 'success',
        message: 'Successfully executed search query',
        data: { 
          resultsFound: searchResult.results?.length || 0,
          duration: `${duration}ms`
        },
        duration
      })
    } catch (error) {
      results.push({
        name: 'Search Functionality',
        status: 'failure',
        message: `Failed to execute search: ${error instanceof Error ? error.message : 'Unknown error'}`
      })
    }

    // Test 5: Custom properties check
    try {
      const testStart = Date.now()
      const properties = await hubspotService.makeRequest('/crm/v3/properties/contacts')
      const duration = Date.now() - testStart
      
      const namcProperties = properties.results?.filter((prop: any) => 
        prop.name.includes('namc') || prop.name.includes('membership') || prop.name.includes('specialties')
      ) || []
      
      results.push({
        name: 'Custom Properties',
        status: namcProperties.length > 0 ? 'success' : 'warning',
        message: namcProperties.length > 0 
          ? `Found ${namcProperties.length} NAMC-specific custom properties`
          : 'No NAMC-specific custom properties found',
        data: { 
          totalProperties: properties.results?.length || 0,
          namcProperties: namcProperties.map((p: any) => p.name),
          duration: `${duration}ms`
        },
        duration
      })
    } catch (error) {
      results.push({
        name: 'Custom Properties',
        status: 'failure',
        message: `Failed to retrieve properties: ${error instanceof Error ? error.message : 'Unknown error'}`
      })
    }

    // Test 6: Rate limiting check
    try {
      const testStart = Date.now()
      const promises = Array(5).fill(null).map(() => 
        hubspotService.makeRequest('/crm/v3/objects/contacts?limit=1')
      )
      
      await Promise.all(promises)
      const duration = Date.now() - testStart
      
      results.push({
        name: 'Rate Limiting Handling',
        status: 'success',
        message: 'Successfully handled multiple concurrent requests',
        data: { 
          concurrentRequests: 5,
          totalDuration: `${duration}ms`,
          averagePerRequest: `${Math.round(duration / 5)}ms`
        },
        duration
      })
    } catch (error) {
      results.push({
        name: 'Rate Limiting Handling',
        status: 'warning',
        message: `Rate limiting or concurrent request issue: ${error instanceof Error ? error.message : 'Unknown error'}`
      })
    }

    const totalTime = Date.now() - startTime
    const summary = {
      success: true,
      totalTests: results.length,
      passed: results.filter(r => r.status === 'success').length,
      failed: results.filter(r => r.status === 'failure').length,
      warnings: results.filter(r => r.status === 'warning').length,
      totalDuration: `${totalTime}ms`,
      averageDuration: `${Math.round(totalTime / results.length)}ms`,
      results
    }

    return NextResponse.json(summary)

  } catch (error) {
    console.error('HubSpot test error:', error)
    return NextResponse.json({
      success: false,
      error: 'Test execution failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      results
    }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 401 })
    }

    const { testType, testData } = await req.json()
    const hubspotApiKey = process.env.HUBSPOT_ACCESS_TOKEN

    if (!hubspotApiKey) {
      return NextResponse.json({
        error: 'HubSpot API key not configured'
      }, { status: 500 })
    }

    const hubspotService = new HubSpotService(hubspotApiKey)
    let result

    switch (testType) {
      case 'sync_member':
        result = await hubspotService.syncContact(testData)
        break
      
      case 'create_deal':
        result = await hubspotService.createDeal(testData)
        break
      
      case 'search_contacts':
        result = await hubspotService.findContactByEmail(testData.email)
        break
      
      default:
        return NextResponse.json({
          error: 'Invalid test type'
        }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      testType,
      result
    })

  } catch (error) {
    console.error('HubSpot specific test error:', error)
    return NextResponse.json({
      success: false,
      error: 'Test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
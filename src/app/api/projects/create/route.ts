import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { ConstructionProject } from '@/types/construction-project.types'

/**
 * Create new construction project with HubSpot integration
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    const body = await request.json()
    const {
      title,
      description,
      category,
      subcategory,
      client,
      location,
      specifications,
      timeline,
      budget,
      permits = [],
      autoSyncHubSpot = true
    } = body
    
    // Validate required fields
    if (!title || !description || !category || !client || !location || !timeline) {
      return NextResponse.json(
        { success: false, error: 'Missing required project fields' },
        { status: 400 }
      )
    }
    
    if (!client.companyName || !client.email) {
      return NextResponse.json(
        { success: false, error: 'Client company name and email are required' },
        { status: 400 }
      )
    }
    
    if (!location.address || !location.city || !location.state) {
      return NextResponse.json(
        { success: false, error: 'Complete address information is required' },
        { status: 400 }
      )
    }
    
    // Generate project ID
    const projectId = `PROJ-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    
    // Create construction project object
    const constructionProject: ConstructionProject = {
      id: projectId,
      title,
      description,
      category,
      subcategory,
      client: {
        id: client.id || `CLIENT-${Date.now()}`,
        companyName: client.companyName,
        contactPerson: client.contactPerson || '',
        email: client.email,
        phone: client.phone || '',
        hubspotContactId: client.hubspotContactId,
        hubspotCompanyId: client.hubspotCompanyId
      },
      location: {
        address: location.address,
        city: location.city,
        state: location.state,
        zipCode: location.zipCode || '',
        coordinates: location.coordinates || { lat: 0, lng: 0 },
        parcelNumber: location.parcelNumber,
        lotSize: location.lotSize,
        zoningType: location.zoningType
      },
      specifications: {
        squareFootage: specifications?.squareFootage,
        stories: specifications?.stories || 1,
        units: specifications?.units,
        parkingSpaces: specifications?.parkingSpaces,
        specialRequirements: specifications?.specialRequirements || [],
        greenCertifications: specifications?.greenCertifications || []
      },
      budget: {
        estimated: budget?.estimated || {
          materials: 0,
          labor: 0,
          equipment: 0,
          permits: 0,
          subcontractors: 0,
          overhead: 0,
          other: 0,
          total: 0
        },
        contracted: budget?.contracted || {
          materials: 0,
          labor: 0,
          equipment: 0,
          permits: 0,
          subcontractors: 0,
          overhead: 0,
          other: 0,
          total: 0
        },
        actual: {
          materials: 0,
          labor: 0,
          equipment: 0,
          permits: 0,
          subcontractors: 0,
          overhead: 0,
          other: 0,
          total: 0
        },
        contingency: budget?.contingency || 10,
        profitMargin: budget?.profitMargin || 15,
        changeOrders: [],
        paymentSchedule: budget?.paymentSchedule || []
      },
      timeline: {
        estimatedStartDate: new Date(timeline.estimatedStartDate),
        estimatedEndDate: new Date(timeline.estimatedEndDate),
        currentPhase: 'planning',
        phases: timeline.phases || [],
        milestones: timeline.milestones || [],
        criticalPath: [],
        weatherDays: timeline.weatherDays || 0,
        bufferDays: timeline.bufferDays || 0
      },
      team: [],
      resources: [],
      permits: permits.map((permit: any) => ({
        id: `PERMIT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: permit.type,
        status: 'not_required',
        cost: permit.cost || 0,
        inspectionRequired: permit.inspectionRequired || false,
        documents: []
      })),
      inspections: [],
      documents: [],
      drawings: [],
      hubspotSyncStatus: autoSyncHubSpot ? 'pending' : 'disabled',
      status: 'draft',
      priority: 'medium',
      riskLevel: 'low',
      contractSigned: false,
      createdBy: session.user.id,
      createdAt: new Date(),
      updatedAt: new Date()
    }
    
    // In a real implementation, save to database
    // await saveProjectToDatabase(constructionProject)
    
    let response: any = {
      success: true,
      data: {
        project: constructionProject,
        created: true,
        hubspotSync: autoSyncHubSpot ? 'pending' : 'disabled'
      }
    }
    
    // Sync with HubSpot if enabled
    if (autoSyncHubSpot) {
      try {
        // This would integrate with the HubSpot service
        // const hubspotResult = await hubspotProjectService.syncProjectToHubSpot(constructionProject)
        
        // Mock HubSpot sync result
        const mockHubSpotResult = {
          dealId: `HS-DEAL-${Date.now()}`,
          contactId: client.hubspotContactId || `HS-CONTACT-${Date.now()}`,
          companyId: client.hubspotCompanyId || `HS-COMPANY-${Date.now()}`,
          syncStatus: 'success',
          syncedAt: new Date()
        }
        
        response.data.hubspotSync = mockHubSpotResult
        
        // Update project with HubSpot IDs
        constructionProject.hubspotDealId = mockHubSpotResult.dealId
        constructionProject.client.hubspotContactId = mockHubSpotResult.contactId
        constructionProject.client.hubspotCompanyId = mockHubSpotResult.companyId
        constructionProject.hubspotSyncStatus = 'synced'
        constructionProject.lastHubspotSync = new Date()
        
      } catch (hubspotError) {
        console.error('HubSpot sync failed:', hubspotError)
        response.warnings = ['Project created but HubSpot sync failed']
        constructionProject.hubspotSyncStatus = 'error'
      }
    }
    
    return NextResponse.json(response, { status: 201 })
    
  } catch (error) {
    console.error('Error creating project:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to create project',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

/**
 * Get project creation templates and presets
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    
    // Project templates by category
    const templates = {
      residential: [
        {
          id: 'single-family-home',
          name: 'Single Family Home',
          description: 'New construction single family residence',
          specifications: {
            squareFootage: 2500,
            stories: 2,
            units: 1,
            parkingSpaces: 2
          },
          defaultPhases: [
            'Site Preparation',
            'Foundation',
            'Framing',
            'Roofing',
            'MEP Systems',
            'Interior Finishes',
            'Final Inspections'
          ]
        },
        {
          id: 'home-addition',
          name: 'Home Addition',
          description: 'Addition to existing residential structure',
          specifications: {
            squareFootage: 800,
            stories: 1,
            units: 1
          },
          defaultPhases: [
            'Planning & Permits',
            'Site Preparation',
            'Foundation',
            'Framing',
            'Integration',
            'Finishes'
          ]
        }
      ],
      commercial: [
        {
          id: 'office-building',
          name: 'Office Building',
          description: 'Commercial office space construction',
          specifications: {
            squareFootage: 15000,
            stories: 3,
            parkingSpaces: 50
          },
          defaultPhases: [
            'Site Work',
            'Foundation',
            'Structure',
            'Building Envelope',
            'MEP Systems',
            'Interior Build-out',
            'Commissioning'
          ]
        },
        {
          id: 'retail-space',
          name: 'Retail Space',
          description: 'Commercial retail construction',
          specifications: {
            squareFootage: 5000,
            stories: 1,
            parkingSpaces: 25
          },
          defaultPhases: [
            'Site Preparation',
            'Foundation',
            'Structure',
            'MEP Systems',
            'Interior Finishes',
            'Final Inspections'
          ]
        }
      ],
      industrial: [
        {
          id: 'warehouse',
          name: 'Warehouse Facility',
          description: 'Industrial warehouse construction',
          specifications: {
            squareFootage: 50000,
            stories: 1,
            parkingSpaces: 20
          },
          defaultPhases: [
            'Site Development',
            'Foundation',
            'Pre-engineered Building',
            'Utilities',
            'Loading Docks',
            'Final Systems'
          ]
        }
      ]
    }
    
    // Common permit types by category
    const permitTypes = {
      residential: [
        { type: 'Building Permit', required: true, estimatedCost: 2500 },
        { type: 'Electrical Permit', required: true, estimatedCost: 500 },
        { type: 'Plumbing Permit', required: true, estimatedCost: 400 },
        { type: 'Mechanical Permit', required: true, estimatedCost: 300 }
      ],
      commercial: [
        { type: 'Building Permit', required: true, estimatedCost: 15000 },
        { type: 'Electrical Permit', required: true, estimatedCost: 2000 },
        { type: 'Plumbing Permit', required: true, estimatedCost: 1500 },
        { type: 'Mechanical Permit', required: true, estimatedCost: 2500 },
        { type: 'Fire Safety Permit', required: true, estimatedCost: 1000 },
        { type: 'ADA Compliance Review', required: true, estimatedCost: 500 }
      ],
      industrial: [
        { type: 'Building Permit', required: true, estimatedCost: 25000 },
        { type: 'Environmental Review', required: true, estimatedCost: 5000 },
        { type: 'Electrical Permit', required: true, estimatedCost: 5000 },
        { type: 'Utility Connections', required: true, estimatedCost: 3000 }
      ]
    }
    
    const response: any = {
      success: true,
      data: {
        templates: category ? templates[category as keyof typeof templates] || [] : templates,
        permitTypes: category ? permitTypes[category as keyof typeof permitTypes] || [] : permitTypes,
        categories: [
          { value: 'residential', label: 'Residential', icon: 'home' },
          { value: 'commercial', label: 'Commercial', icon: 'building' },
          { value: 'industrial', label: 'Industrial', icon: 'factory' },
          { value: 'infrastructure', label: 'Infrastructure', icon: 'road' }
        ]
      }
    }
    
    return NextResponse.json(response)
    
  } catch (error) {
    console.error('Error fetching project templates:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch project templates' },
      { status: 500 }
    )
  }
}
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// Mock project data with HubSpot-style workflow actions and tasks
const mockProjects = [
  {
    id: '1',
    title: 'Oakland Community Center Renovation',
    description: 'Complete renovation of community center including accessibility upgrades, new HVAC system, and modern interior design.',
    client: 'Oakland Unified School District',
    category: 'commercial',
    budget: {
      allocated: 850000,
      spent: 425000,
      remaining: 425000,
      percentage: 50
    },
    timeline: {
      startDate: '2024-01-15',
      endDate: '2024-08-30',
      currentPhase: 'Construction',
      progress: 65
    },
    status: 'in_progress',
    priority: 'high',
    team: [
      { name: 'John Martinez', role: 'Project Manager', company: 'Martinez Construction LLC' },
      { name: 'Sarah Chen', role: 'Electrical Lead', company: 'Chen Electrical Services' },
      { name: 'Robert Johnson', role: 'Plumbing Lead', company: 'Johnson Plumbing Co.' }
    ],
    workflows: [
      {
        id: 'wf_1',
        name: 'Project Initiation',
        status: 'completed',
        completedDate: '2024-01-20',
        tasks: [
          { id: 't1', name: 'Site Assessment', status: 'completed', assignee: 'John Martinez', completedDate: '2024-01-18' },
          { id: 't2', name: 'Permit Applications', status: 'completed', assignee: 'Legal Team', completedDate: '2024-01-20' },
          { id: 't3', name: 'Budget Approval', status: 'completed', assignee: 'Finance', completedDate: '2024-01-19' }
        ]
      },
      {
        id: 'wf_2',
        name: 'Design & Planning',
        status: 'completed',
        completedDate: '2024-03-15',
        tasks: [
          { id: 't4', name: 'Architectural Plans', status: 'completed', assignee: 'Design Team', completedDate: '2024-02-28' },
          { id: 't5', name: 'Engineering Review', status: 'completed', assignee: 'Engineers', completedDate: '2024-03-10' },
          { id: 't6', name: 'Client Approval', status: 'completed', assignee: 'John Martinez', completedDate: '2024-03-15' }
        ]
      },
      {
        id: 'wf_3',
        name: 'Construction Phase 1',
        status: 'completed',
        completedDate: '2024-05-20',
        tasks: [
          { id: 't7', name: 'Demolition', status: 'completed', assignee: 'Demo Crew', completedDate: '2024-04-15' },
          { id: 't8', name: 'Foundation Work', status: 'completed', assignee: 'Foundation Team', completedDate: '2024-05-10' },
          { id: 't9', name: 'Structural Framing', status: 'completed', assignee: 'Framing Crew', completedDate: '2024-05-20' }
        ]
      },
      {
        id: 'wf_4',
        name: 'MEP Installation',
        status: 'in_progress',
        progress: 75,
        tasks: [
          { id: 't10', name: 'Electrical Rough-in', status: 'completed', assignee: 'Sarah Chen', completedDate: '2024-06-30' },
          { id: 't11', name: 'Plumbing Installation', status: 'in_progress', assignee: 'Robert Johnson', progress: 80 },
          { id: 't12', name: 'HVAC Installation', status: 'pending', assignee: 'HVAC Team' }
        ]
      },
      {
        id: 'wf_5',
        name: 'Finishing Work',
        status: 'pending',
        tasks: [
          { id: 't13', name: 'Drywall & Paint', status: 'pending', assignee: 'Finishing Crew' },
          { id: 't14', name: 'Flooring Installation', status: 'pending', assignee: 'Flooring Team' },
          { id: 't15', name: 'Final Inspections', status: 'pending', assignee: 'QA Team' }
        ]
      }
    ],
    milestones: [
      { name: 'Project Kickoff', date: '2024-01-15', status: 'completed' },
      { name: 'Design Approval', date: '2024-03-15', status: 'completed' },
      { name: 'Phase 1 Complete', date: '2024-05-20', status: 'completed' },
      { name: 'MEP Complete', date: '2024-07-15', status: 'upcoming' },
      { name: 'Project Completion', date: '2024-08-30', status: 'upcoming' }
    ],
    location: {
      address: '2150 International Blvd, Oakland, CA 94606',
      city: 'Oakland',
      state: 'CA',
      coordinates: { lat: 37.7749, lng: -122.4194 }
    },
    documents: [
      { name: 'Project Contract', type: 'contract', uploadDate: '2024-01-10' },
      { name: 'Building Permits', type: 'permit', uploadDate: '2024-01-20' },
      { name: 'Architectural Plans', type: 'plans', uploadDate: '2024-02-28' }
    ],
    createdAt: '2024-01-10',
    updatedAt: '2024-07-25'
  },
  {
    id: '2',
    title: 'San Francisco Affordable Housing Complex',
    description: 'New construction of 120-unit affordable housing complex with sustainable design features and community spaces.',
    client: 'SF Housing Authority',
    category: 'residential',
    budget: {
      allocated: 2400000,
      spent: 960000,
      remaining: 1440000,
      percentage: 40
    },
    timeline: {
      startDate: '2024-03-01',
      endDate: '2025-02-28',
      currentPhase: 'Foundation',
      progress: 35
    },
    status: 'in_progress',
    priority: 'high',
    team: [
      { name: 'Maria Rodriguez', role: 'Site Manager', company: 'Rodriguez Construction' },
      { name: 'David Kim', role: 'Safety Coordinator', company: 'Kim Safety Solutions' },
      { name: 'Lisa Davis', role: 'Quality Control', company: 'Davis QC Services' }
    ],
    workflows: [
      {
        id: 'wf_6',
        name: 'Pre-Construction',
        status: 'completed',
        completedDate: '2024-03-20',
        tasks: [
          { id: 't16', name: 'Site Survey', status: 'completed', assignee: 'Survey Team', completedDate: '2024-03-05' },
          { id: 't17', name: 'Soil Testing', status: 'completed', assignee: 'Geo Engineers', completedDate: '2024-03-15' },
          { id: 't18', name: 'Utility Connections', status: 'completed', assignee: 'Utility Crew', completedDate: '2024-03-20' }
        ]
      },
      {
        id: 'wf_7',
        name: 'Foundation Work',
        status: 'in_progress',
        progress: 60,
        tasks: [
          { id: 't19', name: 'Excavation', status: 'completed', assignee: 'Excavation Crew', completedDate: '2024-04-30' },
          { id: 't20', name: 'Foundation Pour', status: 'in_progress', assignee: 'Concrete Team', progress: 70 },
          { id: 't21', name: 'Basement Waterproofing', status: 'pending', assignee: 'Waterproof Team' }
        ]
      },
      {
        id: 'wf_8',
        name: 'Structural Work',
        status: 'pending',
        tasks: [
          { id: 't22', name: 'Steel Frame Erection', status: 'pending', assignee: 'Steel Crew' },
          { id: 't23', name: 'Concrete Floors', status: 'pending', assignee: 'Concrete Team' },
          { id: 't24', name: 'Roof Installation', status: 'pending', assignee: 'Roofing Team' }
        ]
      }
    ],
    milestones: [
      { name: 'Ground Breaking', date: '2024-03-01', status: 'completed' },
      { name: 'Foundation Complete', date: '2024-06-15', status: 'upcoming' },
      { name: 'Structure Complete', date: '2024-10-30', status: 'upcoming' },
      { name: 'Move-in Ready', date: '2025-02-28', status: 'upcoming' }
    ],
    location: {
      address: '1875 Mission St, San Francisco, CA 94103',
      city: 'San Francisco',
      state: 'CA',
      coordinates: { lat: 37.7749, lng: -122.4194 }
    },
    documents: [
      { name: 'Development Agreement', type: 'contract', uploadDate: '2024-02-15' },
      { name: 'Environmental Impact Report', type: 'environmental', uploadDate: '2024-02-20' },
      { name: 'Construction Drawings', type: 'plans', uploadDate: '2024-02-25' }
    ],
    createdAt: '2024-02-10',
    updatedAt: '2024-07-25'
  },
  {
    id: '3',
    title: 'Berkeley Solar Installation Project',
    description: 'Large-scale commercial solar panel installation for UC Berkeley campus buildings with battery storage systems.',
    client: 'UC Berkeley Facilities',
    category: 'industrial',
    budget: {
      allocated: 1200000,
      spent: 240000,
      remaining: 960000,
      percentage: 20
    },
    timeline: {
      startDate: '2024-06-01',
      endDate: '2024-12-15',
      currentPhase: 'Planning',
      progress: 15
    },
    status: 'in_progress',
    priority: 'medium',
    team: [
      { name: 'David Kim', role: 'Solar Lead', company: 'Kim Solar Solutions' },
      { name: 'Patricia Wilson', role: 'Electrical Engineer', company: 'Wilson Engineering' },
      { name: 'Anthony Garcia', role: 'Installation Manager', company: 'Garcia Solar Install' }
    ],
    workflows: [
      {
        id: 'wf_9',
        name: 'Site Assessment',
        status: 'completed',
        completedDate: '2024-06-20',
        tasks: [
          { id: 't25', name: 'Roof Inspections', status: 'completed', assignee: 'Inspection Team', completedDate: '2024-06-10' },
          { id: 't26', name: 'Electrical Assessment', status: 'completed', assignee: 'Patricia Wilson', completedDate: '2024-06-15' },
          { id: 't27', name: 'Structural Analysis', status: 'completed', assignee: 'Structural Engineers', completedDate: '2024-06-20' }
        ]
      },
      {
        id: 'wf_10',
        name: 'System Design',
        status: 'in_progress',
        progress: 80,
        tasks: [
          { id: 't28', name: 'Panel Layout Design', status: 'completed', assignee: 'Design Team', completedDate: '2024-07-10' },
          { id: 't29', name: 'Electrical Schematics', status: 'in_progress', assignee: 'Patricia Wilson', progress: 90 },
          { id: 't30', name: 'Battery Storage Design', status: 'pending', assignee: 'Storage Engineers' }
        ]
      }
    ],
    milestones: [
      { name: 'Contract Signing', date: '2024-05-15', status: 'completed' },
      { name: 'Design Approval', date: '2024-08-01', status: 'upcoming' },
      { name: 'Installation Start', date: '2024-09-01', status: 'upcoming' },
      { name: 'System Commissioning', date: '2024-12-15', status: 'upcoming' }
    ],
    location: {
      address: 'UC Berkeley Campus, Berkeley, CA 94720',
      city: 'Berkeley',
      state: 'CA',
      coordinates: { lat: 37.8719, lng: -122.2585 }
    },
    documents: [
      { name: 'Solar Installation Contract', type: 'contract', uploadDate: '2024-05-10' },
      { name: 'Structural Reports', type: 'engineering', uploadDate: '2024-06-20' },
      { name: 'System Specifications', type: 'specs', uploadDate: '2024-07-01' }
    ],
    createdAt: '2024-05-01',
    updatedAt: '2024-07-25'
  }
]

export async function GET(request: NextRequest) {
  try {
    // Check if user is authenticated
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get search parameters
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const category = searchParams.get('category')
    const priority = searchParams.get('priority')
    const search = searchParams.get('search')

    let filteredProjects = mockProjects

    // Apply search filter
    if (search) {
      const searchLower = search.toLowerCase()
      filteredProjects = filteredProjects.filter(project =>
        project.title.toLowerCase().includes(searchLower) ||
        project.description.toLowerCase().includes(searchLower) ||
        project.client.toLowerCase().includes(searchLower)
      )
    }

    // Apply status filter
    if (status) {
      filteredProjects = filteredProjects.filter(project =>
        project.status === status
      )
    }

    // Apply category filter
    if (category) {
      filteredProjects = filteredProjects.filter(project =>
        project.category === category
      )
    }

    // Apply priority filter
    if (priority) {
      filteredProjects = filteredProjects.filter(project =>
        project.priority === priority
      )
    }

    // Calculate aggregate stats
    const totalBudget = filteredProjects.reduce((sum, p) => sum + p.budget.allocated, 0)
    const totalSpent = filteredProjects.reduce((sum, p) => sum + p.budget.spent, 0)
    const averageProgress = filteredProjects.reduce((sum, p) => sum + p.timeline.progress, 0) / filteredProjects.length

    return NextResponse.json({
      success: true,
      data: {
        projects: filteredProjects,
        total: filteredProjects.length,
        stats: {
          totalBudget,
          totalSpent,
          averageProgress: Math.round(averageProgress),
          activeProjects: filteredProjects.filter(p => p.status === 'in_progress').length,
          completedProjects: filteredProjects.filter(p => p.status === 'completed').length
        },
        filters: {
          statuses: ['open', 'in_progress', 'completed', 'on_hold'],
          categories: ['residential', 'commercial', 'industrial'],
          priorities: ['low', 'medium', 'high', 'critical']
        }
      }
    })

  } catch (error) {
    console.error('Error fetching projects:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}
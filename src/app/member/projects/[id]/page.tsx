'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft,
  Edit,
  Download,
  Send,
  Share,
  Clock,
  DollarSign,
  Users,
  MapPin,
  Calendar,
  FileText,
  AlertTriangle,
  CheckCircle,
  Circle,
  TrendingUp,
  TrendingDown,
  Building,
  Zap,
  Settings,
  MoreVertical,
  Eye,
  RefreshCw,
  ExternalLink
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { ConstructionProject, ConstructionEstimate, ProjectMilestone } from '@/types/construction-project.types'
import toast from 'react-hot-toast'

interface ProjectData {
  project: ConstructionProject
  estimates: ConstructionEstimate[]
  hubspotSyncStatus: {
    dealId?: string
    contactId?: string
    companyId?: string
    lastSync?: string
    status: 'synced' | 'pending' | 'failed' | 'disabled'
  }
}

interface TabProps {
  activeTab: string
  onTabChange: (tab: string) => void
}

const TABS = [
  { id: 'overview', label: 'Overview', icon: Building },
  { id: 'timeline', label: 'Timeline', icon: Calendar },
  { id: 'budget', label: 'Budget', icon: DollarSign },
  { id: 'team', label: 'Team', icon: Users },
  { id: 'documents', label: 'Documents', icon: FileText },
  { id: 'estimates', label: 'Estimates', icon: TrendingUp }
]

function TabNavigation({ activeTab, onTabChange }: TabProps) {
  return (
    <div className="border-b border-gray-200">
      <nav className="flex space-x-8">
        {TABS.map((tab) => {
          const IconComponent = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`
                flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors
                ${activeTab === tab.id
                  ? 'border-yellow-500 text-yellow-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              <IconComponent className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}

function StatusBadge({ status, priority }: { status: string; priority?: string }) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800'
      case 'estimating': return 'bg-blue-100 text-blue-800'
      case 'quoted': return 'bg-purple-100 text-purple-800'
      case 'contracted': return 'bg-green-100 text-green-800'
      case 'in_progress': return 'bg-yellow-100 text-yellow-800'
      case 'completed': return 'bg-green-100 text-green-800'
      case 'on_hold': return 'bg-orange-100 text-orange-800'
      case 'cancelled': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'low': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="flex space-x-2">
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(status)}`}>
        {status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
      </span>
      {priority && (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(priority)}`}>
          {priority} Priority
        </span>
      )}
    </div>
  )
}

function OverviewTab({ projectData }: { projectData: ProjectData }) {
  const { project, hubspotSyncStatus } = projectData
  const progress = calculateProjectProgress(project)

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Budget</p>
                <p className="text-2xl font-bold text-gray-900">
                  ${project.budget.estimated.total.toLocaleString()}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
            <div className="mt-2">
              <div className="flex items-center text-sm text-gray-500">
                <span>Spent: ${project.budget.actual.total.toLocaleString()}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Progress</p>
                <p className="text-2xl font-bold text-gray-900">{progress}%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-600" />
            </div>
            <div className="mt-2">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Days Remaining</p>
                <p className="text-2xl font-bold text-gray-900">
                  {Math.max(0, Math.ceil((project.timeline.estimatedEndDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))}
                </p>
              </div>
              <Clock className="h-8 w-8 text-orange-600" />
            </div>
            <div className="mt-2">
              <div className="flex items-center text-sm text-gray-500">
                <span>End: {project.timeline.estimatedEndDate.toLocaleDateString()}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Team Members</p>
                <p className="text-2xl font-bold text-gray-900">{project.team.length}</p>
              </div>
              <Users className="h-8 w-8 text-purple-600" />
            </div>
            <div className="mt-2">
              <div className="flex items-center text-sm text-gray-500">
                <span>Active roles</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Project Info and Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Project Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-medium text-gray-900">Description</h4>
              <p className="text-gray-600 mt-1">{project.description}</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium text-gray-900">Category</h4>
                <p className="text-gray-600 capitalize">{project.category}</p>
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Size</h4>
                <p className="text-gray-600">{project.specifications.squareFootage?.toLocaleString()} sq ft</p>
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Stories</h4>
                <p className="text-gray-600">{project.specifications.stories}</p>
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Risk Level</h4>
                <p className="text-gray-600 capitalize">{project.riskLevel}</p>
              </div>
            </div>

            <div>
              <h4 className="font-medium text-gray-900 mb-2">Status</h4>
              <StatusBadge status={project.status} priority={project.priority} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Client & Location</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-medium text-gray-900">Client</h4>
              <div className="mt-1 space-y-1">
                <p className="text-gray-900 font-medium">{project.client.companyName}</p>
                <p className="text-gray-600">{project.client.contactPerson}</p>
                <p className="text-gray-600">{project.client.email}</p>
                <p className="text-gray-600">{project.client.phone}</p>
              </div>
            </div>

            <div>
              <h4 className="font-medium text-gray-900">Location</h4>
              <div className="mt-1 space-y-1">
                <p className="text-gray-600">{project.location.address}</p>
                <p className="text-gray-600">{project.location.city}, {project.location.state} {project.location.zipCode}</p>
                {project.location.parcelNumber && (
                  <p className="text-gray-600">Parcel: {project.location.parcelNumber}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* HubSpot Integration Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>HubSpot Integration</CardTitle>
            <Button variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              Sync Now
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={`w-3 h-3 rounded-full ${
                hubspotSyncStatus.status === 'synced' ? 'bg-green-500' :
                hubspotSyncStatus.status === 'pending' ? 'bg-yellow-500' :
                hubspotSyncStatus.status === 'failed' ? 'bg-red-500' : 'bg-gray-500'
              }`} />
              <div>
                <span className="font-medium capitalize">{hubspotSyncStatus.status}</span>
                {hubspotSyncStatus.lastSync && (
                  <span className="text-gray-500 text-sm ml-2">
                    Last sync: {new Date(hubspotSyncStatus.lastSync).toLocaleString()}
                  </span>
                )}
              </div>
            </div>
            
            {hubspotSyncStatus.dealId && (
              <div className="flex space-x-2">
                <Button variant="outline" size="sm">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  View Deal
                </Button>
                <Button variant="outline" size="sm">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  View Contact
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function TimelineTab({ project }: { project: ConstructionProject }) {
  const sortedMilestones = [...project.timeline.milestones].sort((a, b) => 
    new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime()
  )

  const getMilestoneIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-5 h-5 text-green-600" />
      case 'in_progress': return <Clock className="w-5 h-5 text-yellow-600" />
      case 'delayed': return <AlertTriangle className="w-5 h-5 text-red-600" />
      default: return <Circle className="w-5 h-5 text-gray-400" />
    }
  }

  return (
    <div className="space-y-6">
      {/* Timeline Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Project Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="text-center">
              <div className="text-2xl font-bold">{project.timeline.estimatedStartDate.toLocaleDateString()}</div>
              <div className="text-sm text-gray-600">Start Date</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{project.timeline.estimatedEndDate.toLocaleDateString()}</div>
              <div className="text-sm text-gray-600">End Date</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">
                {Math.ceil((project.timeline.estimatedEndDate.getTime() - project.timeline.estimatedStartDate.getTime()) / (1000 * 60 * 60 * 24))} days
              </div>
              <div className="text-sm text-gray-600">Total Duration</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <span className="text-sm font-medium text-gray-700">Weather Days:</span>
              <span className="ml-2">{project.timeline.weatherDays}</span>
            </div>
            <div>
              <span className="text-sm font-medium text-gray-700">Buffer Days:</span>
              <span className="ml-2">{project.timeline.bufferDays}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Milestones */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Project Milestones</CardTitle>
            <Button variant="outline" size="sm">
              <Edit className="w-4 h-4 mr-2" />
              Edit Timeline
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {sortedMilestones.map((milestone, index) => (
              <div key={milestone.id} className="flex items-start space-x-4 p-4 border border-gray-200 rounded-lg">
                <div className="flex-shrink-0 mt-1">
                  {getMilestoneIcon(milestone.status)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium text-gray-900">{milestone.name}</h4>
                    <div className="flex items-center space-x-2">
                      {milestone.isCritical && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          Critical Path
                        </span>
                      )}
                      <span className="text-sm text-gray-500">
                        {new Date(milestone.targetDate).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  
                  {milestone.description && (
                    <p className="text-sm text-gray-600 mt-1">{milestone.description}</p>
                  )}
                  
                  {milestone.deliverables.length > 0 && (
                    <div className="mt-2">
                      <span className="text-xs font-medium text-gray-700">Deliverables:</span>
                      <ul className="text-xs text-gray-600 ml-2 mt-1">
                        {milestone.deliverables.map((deliverable, idx) => (
                          <li key={idx}>• {deliverable}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {milestone.dependencies.length > 0 && (
                    <div className="mt-2">
                      <span className="text-xs font-medium text-gray-700">Dependencies:</span>
                      <span className="text-xs text-gray-600 ml-2">{milestone.dependencies.join(', ')}</span>
                    </div>
                  )}
                  
                  {milestone.completedDate && (
                    <div className="mt-2 text-xs text-green-600">
                      Completed: {new Date(milestone.completedDate).toLocaleDateString()}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function BudgetTab({ project }: { project: ConstructionProject }) {
  const budgetUtilization = project.budget.estimated.total > 0 
    ? (project.budget.actual.total / project.budget.estimated.total) * 100 
    : 0

  const getBudgetCategories = () => [
    { name: 'Materials', estimated: project.budget.estimated.materials, actual: project.budget.actual.materials },
    { name: 'Labor', estimated: project.budget.estimated.labor, actual: project.budget.actual.labor },
    { name: 'Equipment', estimated: project.budget.estimated.equipment, actual: project.budget.actual.equipment },
    { name: 'Permits', estimated: project.budget.estimated.permits, actual: project.budget.actual.permits },
    { name: 'Subcontractors', estimated: project.budget.estimated.subcontractors, actual: project.budget.actual.subcontractors },
    { name: 'Overhead', estimated: project.budget.estimated.overhead, actual: project.budget.actual.overhead },
    { name: 'Other', estimated: project.budget.estimated.other, actual: project.budget.actual.other }
  ]

  return (
    <div className="space-y-6">
      {/* Budget Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                ${project.budget.estimated.total.toLocaleString()}
              </div>
              <div className="text-sm text-gray-600">Estimated Budget</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                ${project.budget.actual.total.toLocaleString()}
              </div>
              <div className="text-sm text-gray-600">Actual Spent</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <div className={`text-2xl font-bold ${
                budgetUtilization > 100 ? 'text-red-600' : 
                budgetUtilization > 80 ? 'text-yellow-600' : 'text-green-600'
              }`}>
                {budgetUtilization.toFixed(1)}%
              </div>
              <div className="text-sm text-gray-600">Budget Utilization</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Budget Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Budget Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {getBudgetCategories().map((category) => (
              <div key={category.name} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">{category.name}</span>
                    <div className="text-sm space-x-4">
                      <span className="text-gray-600">
                        Estimated: ${category.estimated.toLocaleString()}
                      </span>
                      <span className="text-gray-900 font-medium">
                        Actual: ${category.actual.toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-300 ${
                        category.estimated > 0 && (category.actual / category.estimated) > 1 
                          ? 'bg-red-500' 
                          : 'bg-blue-500'
                      }`}
                      style={{ 
                        width: category.estimated > 0 
                          ? `${Math.min(100, (category.actual / category.estimated) * 100)}%`
                          : '0%'
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Change Orders */}
      {project.budget.changeOrders.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Change Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {project.budget.changeOrders.map((changeOrder, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div>
                    <div className="font-medium">{changeOrder.description}</div>
                    <div className="text-sm text-gray-600">
                      Status: {changeOrder.status} | Requested: {changeOrder.requestedDate.toLocaleDateString()}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-lg">${changeOrder.cost.toLocaleString()}</div>
                    <div className="text-sm text-gray-600">
                      {changeOrder.approved ? 'Approved' : 'Pending'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function calculateProjectProgress(project: ConstructionProject): number {
  if (project.timeline.milestones.length === 0) return 0
  
  const completedMilestones = project.timeline.milestones.filter(m => m.status === 'completed')
  return Math.round((completedMilestones.length / project.timeline.milestones.length) * 100)
}

export default function ProjectDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('overview')
  const [loading, setLoading] = useState(true)
  const [projectData, setProjectData] = useState<ProjectData | null>(null)

  useEffect(() => {
    fetchProjectData()
  }, [params.id])

  const fetchProjectData = async () => {
    try {
      setLoading(true)
      
      // In a real implementation, this would fetch from your database
      // For now, we'll create mock data based on the project structure
      const mockProject: ConstructionProject = {
        id: params.id as string,
        title: "Oakland Community Center Renovation",
        description: "Complete renovation of the Oakland Community Center including HVAC upgrades, electrical improvements, and accessibility enhancements.",
        category: 'commercial',
        subcategory: 'renovation',
        client: {
          id: 'client-123',
          companyName: 'Oakland Parks & Recreation',
          contactPerson: 'Sarah Johnson',
          email: 'sarah.johnson@oaklandparks.gov',
          phone: '(510) 555-0123',
          hubspotContactId: 'hs-contact-456',
          hubspotCompanyId: 'hs-company-789'
        },
        location: {
          address: '1801 Oak Street',
          city: 'Oakland',
          state: 'CA',
          zipCode: '94612',
          coordinates: { lat: 37.8044, lng: -122.2712 },
          parcelNumber: '012-345-678',
          lotSize: 15000,
          zoningType: 'C-2'
        },
        specifications: {
          squareFootage: 8500,
          stories: 2,
          units: 1,
          parkingSpaces: 25,
          specialRequirements: ['ADA Compliance', 'Green Building Standards'],
          greenCertifications: ['LEED Silver']
        },
        budget: {
          estimated: {
            materials: 85000,
            labor: 65000,
            equipment: 15000,
            permits: 8000,
            subcontractors: 45000,
            overhead: 25000,
            other: 7000,
            total: 250000
          },
          contracted: {
            materials: 85000,
            labor: 65000,
            equipment: 15000,
            permits: 8000,
            subcontractors: 45000,
            overhead: 25000,
            other: 7000,
            total: 250000
          },
          actual: {
            materials: 45000,
            labor: 32000,
            equipment: 8000,
            permits: 8000,
            subcontractors: 22000,
            overhead: 12000,
            other: 3000,
            total: 130000
          },
          contingency: 10,
          profitMargin: 15,
          changeOrders: [
            {
              id: 'co-1',
              description: 'Additional electrical outlets in conference room',
              cost: 2500,
              status: 'approved',
              requestedDate: new Date('2024-01-15'),
              approved: true,
              approvedDate: new Date('2024-01-18')
            }
          ],
          paymentSchedule: []
        },
        timeline: {
          estimatedStartDate: new Date('2024-02-01'),
          estimatedEndDate: new Date('2024-05-15'),
          currentPhase: 'in_progress',
          phases: ['Planning', 'Demolition', 'Infrastructure', 'Construction', 'Finishes', 'Final'],
          milestones: [
            {
              id: 'milestone-1',
              name: 'Permit Approval',
              description: 'All required permits approved by city',
              targetDate: new Date('2024-01-25'),
              completedDate: new Date('2024-01-23'),
              status: 'completed',
              phase: 'planning',
              isCritical: true,
              dependencies: [],
              deliverables: ['Building Permit', 'Electrical Permit', 'Plumbing Permit'],
              assignedTo: ['project-manager']
            },
            {
              id: 'milestone-2',
              name: 'Demolition Complete',
              description: 'Interior demolition and site preparation',
              targetDate: new Date('2024-02-15'),
              completedDate: new Date('2024-02-14'),
              status: 'completed',
              phase: 'demolition',
              isCritical: true,
              dependencies: ['milestone-1'],
              deliverables: ['Debris Removal', 'Site Safety Setup'],
              assignedTo: ['site-supervisor']
            },
            {
              id: 'milestone-3',
              name: 'HVAC Installation',
              description: 'Complete HVAC system installation',
              targetDate: new Date('2024-03-20'),
              status: 'in_progress',
              phase: 'infrastructure',
              isCritical: true,
              dependencies: ['milestone-2'],
              deliverables: ['Ductwork', 'Equipment Installation', 'System Testing'],
              assignedTo: ['hvac-contractor']
            },
            {
              id: 'milestone-4',
              name: 'Electrical Upgrades',
              description: 'Electrical panel upgrades and new wiring',
              targetDate: new Date('2024-03-25'),
              status: 'pending',
              phase: 'infrastructure',
              isCritical: true,
              dependencies: ['milestone-2'],
              deliverables: ['Panel Upgrade', 'New Circuits', 'Code Compliance'],
              assignedTo: ['electrician']
            },
            {
              id: 'milestone-5',
              name: 'Final Inspection',
              description: 'Final city inspection and certificate of occupancy',
              targetDate: new Date('2024-05-10'),
              status: 'pending',
              phase: 'final',
              isCritical: true,
              dependencies: ['milestone-3', 'milestone-4'],
              deliverables: ['Inspection Report', 'Certificate of Occupancy'],
              assignedTo: ['project-manager']
            }
          ],
          criticalPath: ['milestone-1', 'milestone-2', 'milestone-3', 'milestone-5'],
          weatherDays: 5,
          bufferDays: 10
        },
        team: [
          {
            id: 'pm-1',
            name: 'Mike Rodriguez',
            role: 'project_manager',
            email: 'mike@constructionco.com',
            phone: '(510) 555-0456',
            company: 'Rodriguez Construction',
            specialization: 'Commercial Renovation',
            licenseNumber: 'C-1234567',
            hourlyRate: 85,
            hubspotContactId: 'hs-pm-123'
          },
          {
            id: 'sup-1',
            name: 'Janet Chen',
            role: 'site_supervisor',
            email: 'janet@constructionco.com',
            phone: '(510) 555-0789',
            company: 'Rodriguez Construction',
            specialization: 'Site Management'
          }
        ],
        resources: [],
        permits: [
          {
            id: 'permit-1',
            type: 'Building Permit',
            status: 'approved',
            permitNumber: 'BP-2024-0156',
            cost: 5000,
            appliedDate: new Date('2024-01-10'),
            approvalDate: new Date('2024-01-23'),
            expirationDate: new Date('2024-07-23'),
            inspectionRequired: true,
            documents: []
          }
        ],
        inspections: [],
        documents: [],
        drawings: [],
        status: 'in_progress',
        priority: 'high',
        riskLevel: 'medium',
        contractSigned: true,
        contractSignedDate: new Date('2024-01-30'),
        hubspotDealId: 'hs-deal-789',
        hubspotSyncStatus: 'synced',
        lastHubspotSync: new Date(),
        createdBy: 'user-123',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date()
      }

      const mockData: ProjectData = {
        project: mockProject,
        estimates: [],
        hubspotSyncStatus: {
          dealId: 'hs-deal-789',
          contactId: 'hs-contact-456',
          companyId: 'hs-company-789',
          lastSync: new Date().toISOString(),
          status: 'synced'
        }
      }

      setProjectData(mockData)
    } catch (error) {
      console.error('Error fetching project data:', error)
      toast.error('Failed to load project data')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading project data...</p>
        </div>
      </div>
    )
  }

  if (!projectData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Project Not Found</h1>
          <p className="text-gray-600 mb-4">The requested project could not be found.</p>
          <Button onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    )
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return <OverviewTab projectData={projectData} />
      case 'timeline':
        return <TimelineTab project={projectData.project} />
      case 'budget':
        return <BudgetTab project={projectData.project} />
      case 'team':
        return <div>Team tab content (to be implemented)</div>
      case 'documents':
        return <div>Documents tab content (to be implemented)</div>
      case 'estimates':
        return <div>Estimates tab content (to be implemented)</div>
      default:
        return <OverviewTab projectData={projectData} />
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                onClick={() => router.back()}
                className="flex items-center space-x-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{projectData.project.title}</h1>
                <div className="flex items-center space-x-4 mt-1">
                  <StatusBadge status={projectData.project.status} priority={projectData.project.priority} />
                  <span className="text-gray-500">•</span>
                  <span className="text-gray-600">ID: {projectData.project.id}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Button variant="outline">
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </Button>
              <Button>
                <Edit className="w-4 h-4 mr-2" />
                Edit Project
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />
      </div>

      {/* Tab Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            {renderTabContent()}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  Plus,
  Search,
  Filter,
  Calendar,
  DollarSign,
  Users,
  MapPin,
  Clock,
  TrendingUp,
  TrendingDown,
  Building,
  Home,
  Factory,
  Eye,
  Edit,
  MoreVertical,
  AlertTriangle,
  CheckCircle,
  Zap
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { ConstructionProject } from '@/types/construction-project.types'
import toast from 'react-hot-toast'

interface ProjectSummary {
  id: string
  title: string
  category: 'residential' | 'commercial' | 'industrial' | 'infrastructure'
  status: string
  priority: string
  client: {
    companyName: string
    contactPerson: string
  }
  location: {
    city: string
    state: string
  }
  budget: {
    estimated: number
    actual: number
  }
  timeline: {
    startDate: Date
    endDate: Date
    progress: number
  }
  team: {
    count: number
    projectManager: string
  }
  hubspotStatus: 'synced' | 'pending' | 'failed' | 'disabled'
  createdAt: Date
  updatedAt: Date
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
    <div className="flex space-x-1">
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(status)}`}>
        {status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
      </span>
      {priority && priority !== 'medium' && (
        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(priority)}`}>
          {priority}
        </span>
      )}
    </div>
  )
}

function CategoryIcon({ category }: { category: string }) {
  switch (category) {
    case 'residential': return <Home className="w-5 h-5 text-blue-600" />
    case 'commercial': return <Building className="w-5 h-5 text-purple-600" />
    case 'industrial': return <Factory className="w-5 h-5 text-orange-600" />
    case 'infrastructure': return <MapPin className="w-5 h-5 text-green-600" />
    default: return <Building className="w-5 h-5 text-gray-600" />
  }
}

function ProjectCard({ project, onView }: { project: ProjectSummary; onView: (id: string) => void }) {
  const daysRemaining = Math.max(0, Math.ceil((project.timeline.endDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))
  const budgetUtilization = project.budget.estimated > 0 ? (project.budget.actual / project.budget.estimated) * 100 : 0
  const isOverBudget = budgetUtilization > 100
  const isBehindSchedule = project.timeline.progress < 50 && daysRemaining < 30 // Simple heuristic

  return (
    <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => onView(project.id)}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3">
            <CategoryIcon category={project.category} />
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg font-semibold truncate">{project.title}</CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                {project.client.companyName} • {project.location.city}, {project.location.state}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {/* Warning indicators */}
            {isOverBudget && (
              <AlertTriangle className="w-4 h-4 text-red-500" title="Over Budget" />
            )}
            {isBehindSchedule && (
              <Clock className="w-4 h-4 text-orange-500" title="Behind Schedule" />
            )}
            {/* HubSpot sync status */}
            <div className={`w-2 h-2 rounded-full ${
              project.hubspotStatus === 'synced' ? 'bg-green-500' :
              project.hubspotStatus === 'pending' ? 'bg-yellow-500' :
              project.hubspotStatus === 'failed' ? 'bg-red-500' : 'bg-gray-500'
            }`} title={`HubSpot: ${project.hubspotStatus}`} />
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Status and Progress */}
        <div className="flex items-center justify-between">
          <StatusBadge status={project.status} priority={project.priority} />
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <span>{project.timeline.progress}% Complete</span>
            <div className="w-16 bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${project.timeline.progress}%` }}
              />
            </div>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div className="text-center">
            <div className="flex items-center justify-center mb-1">
              <DollarSign className="w-4 h-4 text-green-600 mr-1" />
              <span className={`font-semibold ${isOverBudget ? 'text-red-600' : 'text-gray-900'}`}>
                ${project.budget.estimated.toLocaleString()}
              </span>
            </div>
            <div className="text-gray-500">Budget</div>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center mb-1">
              <Calendar className="w-4 h-4 text-blue-600 mr-1" />
              <span className={`font-semibold ${isBehindSchedule ? 'text-orange-600' : 'text-gray-900'}`}>
                {daysRemaining}d
              </span>
            </div>
            <div className="text-gray-500">Remaining</div>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center mb-1">
              <Users className="w-4 h-4 text-purple-600 mr-1" />
              <span className="font-semibold text-gray-900">{project.team.count}</span>
            </div>
            <div className="text-gray-500">Team</div>
          </div>
        </div>

        {/* Project Manager */}
        <div className="text-sm text-gray-600">
          <span className="font-medium">PM:</span> {project.team.projectManager || 'Not assigned'}
        </div>

        {/* Timeline */}
        <div className="text-xs text-gray-500">
          {project.timeline.startDate.toLocaleDateString()} - {project.timeline.endDate.toLocaleDateString()}
        </div>
      </CardContent>
    </Card>
  )
}

export default function ProjectsPage() {
  const router = useRouter()
  const [projects, setProjects] = useState<ProjectSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')

  useEffect(() => {
    fetchProjects()
  }, [])

  const fetchProjects = async () => {
    try {
      setLoading(true)
      
      // Mock data - in real implementation, this would come from your API
      const mockProjects: ProjectSummary[] = [
        {
          id: 'proj-1',
          title: 'Oakland Community Center Renovation',
          category: 'commercial',
          status: 'in_progress',
          priority: 'high',
          client: {
            companyName: 'Oakland Parks & Recreation',
            contactPerson: 'Sarah Johnson'
          },
          location: {
            city: 'Oakland',
            state: 'CA'
          },
          budget: {
            estimated: 250000,
            actual: 130000
          },
          timeline: {
            startDate: new Date('2024-02-01'),
            endDate: new Date('2024-05-15'),
            progress: 65
          },
          team: {
            count: 8,
            projectManager: 'Mike Rodriguez'
          },
          hubspotStatus: 'synced',
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date()
        },
        {
          id: 'proj-2',
          title: 'Sunset District Family Home',
          category: 'residential',
          status: 'quoted',
          priority: 'medium',
          client: {
            companyName: 'Johnson Family Trust',
            contactPerson: 'David Johnson'
          },
          location: {
            city: 'San Francisco',
            state: 'CA'
          },
          budget: {
            estimated: 485000,
            actual: 0
          },
          timeline: {
            startDate: new Date('2024-03-01'),
            endDate: new Date('2024-08-30'),
            progress: 0
          },
          team: {
            count: 0,
            projectManager: ''
          },
          hubspotStatus: 'pending',
          createdAt: new Date('2024-01-15'),
          updatedAt: new Date()
        },
        {
          id: 'proj-3',
          title: 'Fremont Industrial Warehouse',
          category: 'industrial',
          status: 'completed',
          priority: 'low',
          client: {
            companyName: 'Bay Area Logistics',
            contactPerson: 'Maria Garcia'
          },
          location: {
            city: 'Fremont',
            state: 'CA'
          },
          budget: {
            estimated: 750000,
            actual: 725000
          },
          timeline: {
            startDate: new Date('2023-09-01'),
            endDate: new Date('2024-01-15'),
            progress: 100
          },
          team: {
            count: 12,
            projectManager: 'Janet Chen'
          },
          hubspotStatus: 'synced',
          createdAt: new Date('2023-08-01'),
          updatedAt: new Date('2024-01-20')
        },
        {
          id: 'proj-4',
          title: 'Berkeley Tech Office Build-out',
          category: 'commercial',
          status: 'draft',
          priority: 'medium',
          client: {
            companyName: 'InnovateTech Solutions',
            contactPerson: 'Alex Kim'
          },
          location: {
            city: 'Berkeley',
            state: 'CA'
          },
          budget: {
            estimated: 320000,
            actual: 0
          },
          timeline: {
            startDate: new Date('2024-04-01'),
            endDate: new Date('2024-07-15'),
            progress: 0
          },
          team: {
            count: 0,
            projectManager: ''
          },
          hubspotStatus: 'disabled',
          createdAt: new Date('2024-01-20'),
          updatedAt: new Date()
        }
      ]

      setProjects(mockProjects)
      
    } catch (error) {
      console.error('Error fetching projects:', error)
      toast.error('Failed to load projects')
    } finally {
      setLoading(false)
    }
  }

  const filteredProjects = projects.filter(project => {
    const matchesSearch = project.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         project.client.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         project.location.city.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = statusFilter === 'all' || project.status === statusFilter
    const matchesCategory = categoryFilter === 'all' || project.category === categoryFilter
    
    return matchesSearch && matchesStatus && matchesCategory
  })

  const getProjectStats = () => {
    const total = projects.length
    const active = projects.filter(p => ['in_progress', 'contracted'].includes(p.status)).length
    const completed = projects.filter(p => p.status === 'completed').length
    const totalBudget = projects.reduce((sum, p) => sum + p.budget.estimated, 0)
    
    return { total, active, completed, totalBudget }
  }

  const handleViewProject = (projectId: string) => {
    router.push(`/member/projects/${projectId}`)
  }

  const stats = getProjectStats()

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your projects...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
              <p className="text-gray-600 mt-1">Manage your construction projects and track progress</p>
            </div>
            <Button
              onClick={() => router.push('/member/projects/create')}
              className="flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>New Project</span>
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Projects</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                </div>
                <Building className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Projects</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.active}</p>
                </div>
                <Zap className="h-8 w-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Completed</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.completed}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Value</p>
                  <p className="text-2xl font-bold text-gray-900">
                    ${stats.totalBudget.toLocaleString()}
                  </p>
                </div>
                <DollarSign className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Search */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search projects, clients, or locations..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
                >
                  <option value="all">All Statuses</option>
                  <option value="draft">Draft</option>
                  <option value="estimating">Estimating</option>
                  <option value="quoted">Quoted</option>
                  <option value="contracted">Contracted</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="on_hold">On Hold</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <div>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
                >
                  <option value="all">All Categories</option>
                  <option value="residential">Residential</option>
                  <option value="commercial">Commercial</option>
                  <option value="industrial">Industrial</option>
                  <option value="infrastructure">Infrastructure</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Projects Grid */}
        {filteredProjects.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProjects.map((project) => (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <ProjectCard project={project} onView={handleViewProject} />
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            {projects.length === 0 ? (
              <div>
                <Building className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No projects yet</h3>
                <p className="text-gray-600 mb-4">Get started by creating your first construction project</p>
                <Button onClick={() => router.push('/member/projects/create')}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create First Project
                </Button>
              </div>
            ) : (
              <div>
                <Search className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No projects found</h3>
                <p className="text-gray-600 mb-4">Try adjusting your search or filters</p>
                <div className="flex justify-center space-x-3">
                  <Button variant="outline" onClick={() => setSearchTerm('')}>
                    Clear Search
                  </Button>
                  <Button variant="outline" onClick={() => {
                    setStatusFilter('all')
                    setCategoryFilter('all')
                  }}>
                    Clear Filters
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
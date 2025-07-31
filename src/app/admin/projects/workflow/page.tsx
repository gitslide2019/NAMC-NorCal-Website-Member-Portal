'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useSession } from 'next-auth/react'
import ErrorBoundary from '@/components/ui/ErrorBoundary'
import { DashboardSkeleton } from '@/components/ui/LoadingSkeleton'
import SkipNavigation from '@/components/ui/SkipNavigation'
import MobileNavigation from '@/components/ui/MobileNavigation'
import VirtualizedList from '@/components/ui/VirtualizedList'
import { 
  Workflow,
  GitBranch,
  Clock,
  User,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Pause,
  Play,
  Square,
  Archive,
  Filter,
  Search,
  Plus,
  Edit,
  Eye,
  UserPlus,
  Target,
  Flag,
  ChevronRight,
  Building,
  MapPin,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Activity,
  Settings,
  Download,
  X,
  RefreshCw
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import Button from '@/components/ui/Button'

// Types matching the service
type ProjectStatus = 
  | 'draft' | 'review' | 'approved' | 'active' | 'applications_open' 
  | 'applications_closed' | 'evaluation' | 'awarded' | 'in_progress' 
  | 'on_hold' | 'completed' | 'cancelled' | 'archived'

type ProjectPhase = 
  | 'planning' | 'procurement' | 'selection' | 'execution' | 'closeout' | 'maintenance'

interface ProjectWorkflow {
  id: string
  projectId: string
  status: ProjectStatus
  previousStatus?: ProjectStatus
  assignedTo?: string
  assignedBy?: string
  dueDate?: string
  priority: 'low' | 'medium' | 'high' | 'critical'
  phase: ProjectPhase
  progress: number
  blockers: string[]
  dependencies: string[]
  milestones: ProjectMilestone[]
  statusHistory: StatusChange[]
  automationRules: WorkflowRule[]
  metadata: Record<string, any>
  createdAt: string
  updatedAt: string
  projectTitle: string
  projectClient: string
}

interface ProjectMilestone {
  id: string
  title: string
  description: string
  dueDate: string
  completed: boolean
  completedAt?: string
  completedBy?: string
  dependencies: string[]
  deliverables: string[]
}

interface StatusChange {
  id: string
  fromStatus: ProjectStatus
  toStatus: ProjectStatus
  changedBy: string
  changedAt: string
  reason: string
  notes?: string
  automated: boolean
  triggerEvent?: string
}

interface WorkflowRule {
  id: string
  name: string
  trigger: any
  conditions: any[]
  actions: any[]
  enabled: boolean
  priority: number
}

export default function ProjectWorkflowManagement() {
  const { data: session } = useSession()
  const [projects, setProjects] = useState<ProjectWorkflow[]>([])
  const [selectedProject, setSelectedProject] = useState<ProjectWorkflow | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isOnline, setIsOnline] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [phaseFilter, setPhaseFilter] = useState<string>('all')
  const [priorityFilter, setPriorityFilter] = useState<string>('all')
  const [assignedToFilter, setAssignedToFilter] = useState<string>('all')
  const [showOverdueOnly, setShowOverdueOnly] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null)
  const [showStatusModal, setShowStatusModal] = useState(false)
  const [newStatus, setNewStatus] = useState<ProjectStatus>('active')
  const [statusReason, setStatusReason] = useState('')
  const [statusNotes, setStatusNotes] = useState('')

  // Debounced search
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchTerm)
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearchTerm(searchTerm), 300)
    return () => clearTimeout(timer)
  }, [searchTerm])

  // Network status monitoring
  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Load projects
  useEffect(() => {
    const loadProjects = async () => {
      try {
        setLoading(true)
        setError(null)

        const params = new URLSearchParams()
        if (statusFilter !== 'all') params.append('status', statusFilter)
        if (phaseFilter !== 'all') params.append('phase', phaseFilter)
        if (priorityFilter !== 'all') params.append('priority', priorityFilter)
        if (assignedToFilter !== 'all') params.append('assignedTo', assignedToFilter)
        if (showOverdueOnly) params.append('overdue', 'true')

        const response = await fetch(`/api/projects/workflow?${params.toString()}`)
        const data = await response.json()

        if (data.success) {
          setProjects(data.data.projects || [])
        } else {
          throw new Error(data.error || 'Failed to load projects')
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load projects')
      } finally {
        setLoading(false)
      }
    }

    loadProjects()
  }, [statusFilter, phaseFilter, priorityFilter, assignedToFilter, showOverdueOnly])

  const getStatusColor = (status: ProjectStatus) => {
    const statusColors: Record<ProjectStatus, string> = {
      'draft': 'text-gray-600 bg-gray-100',
      'review': 'text-blue-600 bg-blue-100',
      'approved': 'text-green-600 bg-green-100',
      'active': 'text-emerald-600 bg-emerald-100',
      'applications_open': 'text-cyan-600 bg-cyan-100',
      'applications_closed': 'text-orange-600 bg-orange-100',
      'evaluation': 'text-purple-600 bg-purple-100',
      'awarded': 'text-indigo-600 bg-indigo-100',
      'in_progress': 'text-blue-600 bg-blue-100',
      'on_hold': 'text-yellow-600 bg-yellow-100',
      'completed': 'text-green-600 bg-green-100',
      'cancelled': 'text-red-600 bg-red-100',
      'archived': 'text-gray-600 bg-gray-100'
    }
    return statusColors[status] || 'text-gray-600 bg-gray-100'
  }

  const getPhaseColor = (phase: ProjectPhase) => {
    const phaseColors: Record<ProjectPhase, string> = {
      'planning': 'text-blue-600',
      'procurement': 'text-purple-600',
      'selection': 'text-orange-600',
      'execution': 'text-green-600',
      'closeout': 'text-gray-600',
      'maintenance': 'text-indigo-600'
    }
    return phaseColors[phase] || 'text-gray-600'
  }

  const getPriorityColor = (priority: string) => {
    const priorityColors: Record<string, string> = {
      'low': 'text-green-600 bg-green-100',
      'medium': 'text-yellow-600 bg-yellow-100',
      'high': 'text-orange-600 bg-orange-100',
      'critical': 'text-red-600 bg-red-100'
    }
    return priorityColors[priority] || 'text-gray-600 bg-gray-100'
  }

  const getStatusIcon = (status: ProjectStatus) => {
    const statusIcons: Record<ProjectStatus, React.ReactNode> = {
      'draft': <Edit className="h-4 w-4" />,
      'review': <Eye className="h-4 w-4" />,
      'approved': <CheckCircle className="h-4 w-4" />,
      'active': <Play className="h-4 w-4" />,
      'applications_open': <User className="h-4 w-4" />,
      'applications_closed': <UserPlus className="h-4 w-4" />,
      'evaluation': <Target className="h-4 w-4" />,
      'awarded': <Flag className="h-4 w-4" />,
      'in_progress': <Activity className="h-4 w-4" />,
      'on_hold': <Pause className="h-4 w-4" />,
      'completed': <CheckCircle className="h-4 w-4" />,
      'cancelled': <X className="h-4 w-4" />,
      'archived': <Archive className="h-4 w-4" />
    }
    return statusIcons[status] || <Square className="h-4 w-4" />
  }

  const formatStatusName = (status: ProjectStatus) => {
    return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
  }

  const formatPhaseName = (phase: ProjectPhase) => {
    return phase.charAt(0).toUpperCase() + phase.slice(1)
  }

  const isOverdue = (project: ProjectWorkflow) => {
    if (!project.dueDate) return false
    return new Date(project.dueDate) < new Date() && 
           !['completed', 'cancelled', 'archived'].includes(project.status)
  }

  const getFilteredProjects = () => {
    return projects.filter(project => {
      const matchesSearch = 
        project.projectTitle.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        project.projectClient.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        project.status.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
      
      return matchesSearch
    })
  }

  const handleStatusUpdate = async () => {
    if (!selectedProject || !newStatus || !statusReason) return

    try {
      setUpdatingStatus(selectedProject.id)
      setError(null)

      const response = await fetch('/api/projects/workflow', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          projectId: selectedProject.projectId,
          newStatus,
          reason: statusReason,
          notes: statusNotes
        })
      })

      const data = await response.json()

      if (data.success) {
        // Refresh projects list
        const updatedProjects = projects.map(p => 
          p.id === selectedProject.id 
            ? { ...p, status: newStatus, progress: getProgressFromStatus(newStatus) }
            : p
        )
        setProjects(updatedProjects)
        
        setShowStatusModal(false)
        setSelectedProject(null)
        setStatusReason('')
        setStatusNotes('')
      } else {
        throw new Error(data.error || 'Failed to update status')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Status update failed')
    } finally {
      setUpdatingStatus(null)
    }
  }

  const getProgressFromStatus = (status: ProjectStatus): number => {
    const statusProgressMap: Record<ProjectStatus, number> = {
      'draft': 5, 'review': 10, 'approved': 15, 'active': 20,
      'applications_open': 30, 'applications_closed': 40, 'evaluation': 50,
      'awarded': 60, 'in_progress': 75, 'on_hold': 75,
      'completed': 100, 'cancelled': 0, 'archived': 100
    }
    return statusProgressMap[status] || 0
  }

  if (loading) {
    return (
      <ErrorBoundary>
        <SkipNavigation />
        <MobileNavigation />
        <DashboardSkeleton />
      </ErrorBoundary>
    )
  }

  if (error) {
    return (
      <ErrorBoundary>
        <SkipNavigation />
        <MobileNavigation />
        <div className="p-6">
          <div className="max-w-md mx-auto text-center">
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
              <div className="text-red-600 mb-4">
                <AlertTriangle className="h-12 w-12 mx-auto" />
              </div>
              <h2 className="text-lg font-semibold text-red-900 mb-2">Error Loading Workflows</h2>
              <p className="text-red-700 mb-4">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 min-h-[44px]"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      </ErrorBoundary>
    )
  }

  const filteredProjects = getFilteredProjects()

  return (
    <ErrorBoundary>
      <SkipNavigation />
      <MobileNavigation />
      {!isOnline && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
          <div className="flex">
            <AlertTriangle className="h-5 w-5 text-yellow-400 mr-3 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-yellow-800">Limited Connectivity</h3>
              <p className="text-sm text-yellow-700 mt-1">You're currently offline. Workflow features may not work properly.</p>
            </div>
          </div>
        </div>
      )}
      <main id="main-content" className="p-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-inter font-bold text-gray-900 mb-2" tabIndex={-1}>
                Project Workflow Management
              </h1>
              <p className="text-gray-600">
                Manage project lifecycles, status transitions, and workflow automation
              </p>
            </div>
            
            <div className="flex items-center space-x-4">
              <Button 
                className="bg-namc-gold text-white hover:bg-namc-gold/90 min-h-[44px]"
                aria-label="Create new project workflow"
              >
                <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
                New Workflow
              </Button>
              
              <Button 
                variant="outline"
                className="min-h-[44px]"
                aria-label="Export workflow report"
              >
                <Download className="h-4 w-4 mr-2" aria-hidden="true" />
                Export
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          {[
            {
              title: 'Total Projects',
              value: projects.length,
              icon: Workflow,
              color: 'text-blue-600',
              bgColor: 'bg-blue-100'
            },
            {
              title: 'Active',
              value: projects.filter(p => ['active', 'applications_open', 'in_progress'].includes(p.status)).length,
              icon: Play,
              color: 'text-green-600',
              bgColor: 'bg-green-100'
            },
            {
              title: 'In Progress',
              value: projects.filter(p => p.status === 'in_progress').length,
              icon: Activity,
              color: 'text-purple-600',
              bgColor: 'bg-purple-100'
            },
            {
              title: 'Overdue',
              value: projects.filter(p => isOverdue(p)).length,
              icon: AlertTriangle,
              color: 'text-red-600',
              bgColor: 'bg-red-100'
            },
            {
              title: 'Completed',
              value: projects.filter(p => p.status === 'completed').length,
              icon: CheckCircle,
              color: 'text-emerald-600',
              bgColor: 'bg-emerald-100'
            }
          ].map((stat, index) => (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 * (index + 1) }}
            >
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 mb-2">{stat.title}</p>
                      <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                    </div>
                    <div className={`p-3 rounded-full ${stat.bgColor}`}>
                      <stat.icon className={stat.color} size={24} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Filters */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Filter className="mr-2" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <label htmlFor="search-projects" className="sr-only">Search projects</label>
                <input
                  id="search-projects"
                  type="text"
                  placeholder="Search projects..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-namc-gold w-full min-h-[44px]"
                  aria-label="Search projects by title, client, or status"
                />
              </div>

              <div>
                <label htmlFor="status-filter" className="sr-only">Filter by status</label>
                <select
                  id="status-filter"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-namc-gold min-h-[44px]"
                  aria-label="Filter projects by status"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="in_progress">In Progress</option>  
                  <option value="completed">Completed</option>
                  <option value="on_hold">On Hold</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <div>
                <label htmlFor="phase-filter" className="sr-only">Filter by phase</label>
                <select
                  id="phase-filter"
                  value={phaseFilter}
                  onChange={(e) => setPhaseFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-namc-gold min-h-[44px]"
                  aria-label="Filter projects by phase"
                >
                  <option value="all">All Phases</option>
                  <option value="planning">Planning</option>
                  <option value="procurement">Procurement</option>
                  <option value="selection">Selection</option>
                  <option value="execution">Execution</option>
                  <option value="closeout">Closeout</option>
                </select>
              </div>

              <div>
                <label htmlFor="priority-filter" className="sr-only">Filter by priority</label>
                <select
                  id="priority-filter"
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-namc-gold min-h-[44px]"
                  aria-label="Filter projects by priority"
                >
                  <option value="all">All Priorities</option>
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="overdue-filter"
                  checked={showOverdueOnly}
                  onChange={(e) => setShowOverdueOnly(e.target.checked)}
                  className="h-4 w-4 text-namc-gold focus:ring-namc-gold border-gray-300 rounded"
                />
                <label htmlFor="overdue-filter" className="ml-2 text-sm text-gray-700">
                  Overdue only
                </label>
              </div>

              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm('')
                  setStatusFilter('all')
                  setPhaseFilter('all') 
                  setPriorityFilter('all')
                  setShowOverdueOnly(false)
                }}
                className="min-h-[44px]"
                aria-label="Clear all filters"
              >
                Clear Filters
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Projects List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center">
                <GitBranch className="mr-2" />
                Project Workflows ({filteredProjects.length})
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.location.reload()}
                className="min-h-[44px]"
                aria-label="Refresh project list"
              >
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-96">
              <VirtualizedList
                items={filteredProjects}
                itemHeight={140}
                renderItem={(project: ProjectWorkflow, index: number) => (
                  <div className="border border-gray-200 rounded-lg p-4 mb-2 hover:border-namc-gold transition-colors">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h4 className="font-semibold text-gray-900">{project.projectTitle}</h4>
                          <span className={`px-2 py-1 text-xs rounded-full flex items-center space-x-1 ${getStatusColor(project.status)}`}>
                            {getStatusIcon(project.status)}
                            <span>{formatStatusName(project.status)}</span>
                          </span>
                          <span className={`px-2 py-1 text-xs rounded-full ${getPriorityColor(project.priority)}`}>
                            {project.priority.toUpperCase()}
                          </span>
                          {isOverdue(project) && (
                            <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800">
                              OVERDUE
                            </span>
                          )}
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600 mb-3">
                          <div className="flex items-center">
                            <Building className="h-4 w-4 mr-1" />
                            {project.projectClient}
                          </div>
                          <div className="flex items-center">
                            <GitBranch className={`h-4 w-4 mr-1 ${getPhaseColor(project.phase)}`} />
                            {formatPhaseName(project.phase)}
                          </div>
                          <div className="flex items-center">
                            <TrendingUp className="h-4 w-4 mr-1 text-blue-600" />
                            {project.progress}% Complete
                          </div>
                          {project.dueDate && (
                            <div className="flex items-center">
                              <Calendar className="h-4 w-4 mr-1" />
                              {new Date(project.dueDate).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedProject(project)}
                          className="min-h-[44px]"
                          aria-label={`View details for ${project.projectTitle}`}
                        >
                          <Eye className="h-4 w-4 mr-1" aria-hidden="true" />
                          Details
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedProject(project)
                            setShowStatusModal(true)
                          }}
                          disabled={updatingStatus === project.id}
                          className="min-h-[44px]"
                          aria-label={`Update status for ${project.projectTitle}`}
                        >
                          {updatingStatus === project.id ? (
                            <RefreshCw className="h-4 w-4 animate-spin" aria-hidden="true" />
                          ) : (
                            <Settings className="h-4 w-4 mr-1" aria-hidden="true" />
                          )}
                          Status
                        </Button>
                      </div>
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                      <div 
                        className="bg-namc-gold h-2 rounded-full transition-all duration-300" 
                        style={{ width: `${project.progress}%` }}
                      ></div>
                    </div>

                    {/* Milestones Summary */}
                    {project.milestones.length > 0 && (
                      <div className="flex items-center text-xs text-gray-600">
                        <Target className="h-3 w-3 mr-1" />
                        {project.milestones.filter(m => m.completed).length}/{project.milestones.length} milestones completed
                      </div>
                    )}
                  </div>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Status Update Modal */}
        {showStatusModal && selectedProject && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2 }}
              className="bg-white rounded-lg max-w-md w-full p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Update Project Status</h3>
                <button
                  onClick={() => {
                    setShowStatusModal(false)
                    setSelectedProject(null)
                    setStatusReason('')
                    setStatusNotes('')
                  }}
                  className="text-gray-400 hover:text-gray-600 min-h-[44px] min-w-[44px] flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-namc-gold focus:ring-offset-2 rounded-md"
                  aria-label="Close status update modal"
                >
                  <X className="h-6 w-6" aria-hidden="true" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600 mb-2">
                    <strong>{selectedProject.projectTitle}</strong>
                  </p>
                  <p className="text-sm text-gray-500">
                    Current Status: <span className="font-medium">{formatStatusName(selectedProject.status)}</span>
                  </p>
                </div>

                <div>
                  <label htmlFor="new-status" className="block text-sm font-medium text-gray-700 mb-2">
                    New Status <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="new-status"
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value as ProjectStatus)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-namc-gold min-h-[44px]"
                    required
                  >
                    <option value="active">Active</option>
                    <option value="applications_open">Applications Open</option>
                    <option value="applications_closed">Applications Closed</option>
                    <option value="evaluation">Evaluation</option>
                    <option value="awarded">Awarded</option>
                    <option value="in_progress">In Progress</option>
                    <option value="on_hold">On Hold</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="status-reason" className="block text-sm font-medium text-gray-700 mb-2">
                    Reason <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="status-reason"
                    type="text"
                    value={statusReason}
                    onChange={(e) => setStatusReason(e.target.value)}
                    placeholder="Brief reason for status change"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-namc-gold min-h-[44px]"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="status-notes" className="block text-sm font-medium text-gray-700 mb-2">
                    Additional Notes
                  </label>
                  <textarea
                    id="status-notes"
                    value={statusNotes}
                    onChange={(e) => setStatusNotes(e.target.value)}
                    placeholder="Optional additional details"
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-namc-gold"
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowStatusModal(false)
                      setSelectedProject(null)
                      setStatusReason('')
                      setStatusNotes('')
                    }}
                    className="min-h-[44px]"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleStatusUpdate}
                    disabled={!statusReason || updatingStatus === selectedProject.id}
                    className="bg-namc-gold text-white hover:bg-namc-gold/90 min-h-[44px]"
                  >
                    {updatingStatus === selectedProject.id ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      'Update Status'
                    )}
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </main>
    </ErrorBoundary>
  )
}
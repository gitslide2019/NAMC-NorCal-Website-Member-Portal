import { useState, useCallback } from 'react'

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
  projectTitle?: string
  projectClient?: string
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

interface WorkflowFilters {
  status?: ProjectStatus[]
  phase?: ProjectPhase[]
  assignedTo?: string
  priority?: string[]
  overdue?: boolean
}

interface UseProjectWorkflowReturn {
  // State
  workflows: ProjectWorkflow[]
  selectedWorkflow: ProjectWorkflow | null
  loading: boolean
  updating: boolean
  error: string | null
  
  // Actions
  loadWorkflows: (filters?: WorkflowFilters) => Promise<void>
  loadWorkflow: (projectId: string) => Promise<void>
  createWorkflow: (data: {
    projectId: string
    initialStatus?: ProjectStatus
    priority?: 'low' | 'medium' | 'high' | 'critical'
    dueDate?: Date
    assignedTo?: string
    automationRules?: WorkflowRule[]
  }) => Promise<string | null>
  updateStatus: (
    projectId: string,
    newStatus: ProjectStatus,
    reason: string,
    notes?: string
  ) => Promise<boolean>
  assignUser: (
    projectId: string,
    userId: string,
    role: 'owner' | 'manager' | 'coordinator' | 'reviewer' | 'observer',
    permissions?: string[]
  ) => Promise<boolean>
  addMilestone: (
    projectId: string,
    milestone: {
      title: string
      description: string
      dueDate: Date
      dependencies?: string[]
      deliverables?: string[]
    }
  ) => Promise<string | null>
  completeMilestone: (projectId: string, milestoneId: string) => Promise<boolean>
  setSelectedWorkflow: (workflow: ProjectWorkflow | null) => void
  clearError: () => void
}

export function useProjectWorkflow(): UseProjectWorkflowReturn {
  const [workflows, setWorkflows] = useState<ProjectWorkflow[]>([])
  const [selectedWorkflow, setSelectedWorkflow] = useState<ProjectWorkflow | null>(null)
  const [loading, setLoading] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const loadWorkflows = useCallback(async (filters: WorkflowFilters = {}) => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams()
      if (filters.status) params.append('status', filters.status.join(','))
      if (filters.phase) params.append('phase', filters.phase.join(','))
      if (filters.assignedTo) params.append('assignedTo', filters.assignedTo)
      if (filters.priority) params.append('priority', filters.priority.join(','))
      if (filters.overdue) params.append('overdue', 'true')

      const response = await fetch(`/api/projects/workflow?${params.toString()}`)
      const data = await response.json()

      if (data.success) {
        setWorkflows(data.data.projects || [])
      } else {
        throw new Error(data.error || 'Failed to load workflows')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load workflows')
    } finally {
      setLoading(false)
    }
  }, [])

  const loadWorkflow = useCallback(async (projectId: string) => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/projects/workflow?projectId=${projectId}`)
      const data = await response.json()

      if (data.success) {
        setSelectedWorkflow(data.data)
      } else {
        throw new Error(data.error || 'Failed to load workflow')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load workflow')
    } finally {
      setLoading(false)
    }
  }, [])

  const createWorkflow = useCallback(async (workflowData: {
    projectId: string
    initialStatus?: ProjectStatus
    priority?: 'low' | 'medium' | 'high' | 'critical'
    dueDate?: Date
    assignedTo?: string
    automationRules?: WorkflowRule[]
  }) => {
    try {
      setUpdating(true)
      setError(null)

      const response = await fetch('/api/projects/workflow', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...workflowData,
          dueDate: workflowData.dueDate?.toISOString()
        })
      })

      const data = await response.json()

      if (data.success) {
        // Refresh workflows if we have them loaded
        if (workflows.length > 0) {
          await loadWorkflows()
        }
        return data.data.workflowId
      } else {
        throw new Error(data.error || 'Failed to create workflow')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create workflow')
      return null
    } finally {
      setUpdating(false)
    }
  }, [workflows.length, loadWorkflows])

  const updateStatus = useCallback(async (
    projectId: string,
    newStatus: ProjectStatus,
    reason: string,
    notes?: string
  ) => {
    try {
      setUpdating(true)
      setError(null)

      const response = await fetch('/api/projects/workflow', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          projectId,
          newStatus,
          reason,
          notes
        })
      })

      const data = await response.json()

      if (data.success) {
        // Update workflows list if loaded
        setWorkflows(prev => prev.map(w => 
          w.projectId === projectId 
            ? { ...w, status: newStatus, progress: getProgressFromStatus(newStatus) }
            : w
        ))
        
        // Update selected workflow if it matches
        if (selectedWorkflow?.projectId === projectId) {
          setSelectedWorkflow(prev => prev ? {
            ...prev,
            status: newStatus,
            progress: getProgressFromStatus(newStatus)
          } : null)
        }
        
        return true
      } else {
        throw new Error(data.error || 'Failed to update status')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status')
      return false
    } finally {
      setUpdating(false)
    }
  }, [selectedWorkflow])

  const assignUser = useCallback(async (
    projectId: string,
    userId: string,
    role: 'owner' | 'manager' | 'coordinator' | 'reviewer' | 'observer',
    permissions: string[] = []
  ) => {
    try {
      setUpdating(true)
      setError(null)

      const response = await fetch('/api/projects/assignments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          projectId,
          userId,
          role,
          permissions
        })
      })

      const data = await response.json()

      if (data.success) {
        // Update workflows list if loaded
        if (role === 'owner' || role === 'manager') {
          setWorkflows(prev => prev.map(w => 
            w.projectId === projectId 
              ? { ...w, assignedTo: userId }
              : w
          ))
        }
        
        return true
      } else {
        throw new Error(data.error || 'Failed to assign user')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to assign user')
      return false
    } finally {
      setUpdating(false)
    }
  }, [])

  const addMilestone = useCallback(async (
    projectId: string,
    milestone: {
      title: string
      description: string
      dueDate: Date
      dependencies?: string[]
      deliverables?: string[]
    }
  ) => {
    try {
      setUpdating(true)
      setError(null)

      const response = await fetch('/api/projects/milestones', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          projectId,
          ...milestone,
          dueDate: milestone.dueDate.toISOString()
        })
      })

      const data = await response.json()

      if (data.success) {
        // Refresh the workflow if it's currently selected
        if (selectedWorkflow?.projectId === projectId) {
          await loadWorkflow(projectId)
        }
        
        return data.data.milestoneId
      } else {
        throw new Error(data.error || 'Failed to add milestone')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add milestone')
      return null
    } finally {
      setUpdating(false)
    }
  }, [selectedWorkflow, loadWorkflow])

  const completeMilestone = useCallback(async (projectId: string, milestoneId: string) => {
    try {
      setUpdating(true)
      setError(null)

      const response = await fetch('/api/projects/milestones', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          projectId,
          milestoneId,
          action: 'complete'
        })
      })

      const data = await response.json()

      if (data.success) {
        // Refresh the workflow if it's currently selected
        if (selectedWorkflow?.projectId === projectId) {
          await loadWorkflow(projectId)
        }
        
        return true
      } else {
        throw new Error(data.error || 'Failed to complete milestone')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete milestone')
      return false
    } finally {
      setUpdating(false)
    }
  }, [selectedWorkflow, loadWorkflow])

  return {
    // State
    workflows,
    selectedWorkflow,
    loading,
    updating,
    error,
    
    // Actions
    loadWorkflows,
    loadWorkflow,
    createWorkflow,
    updateStatus,
    assignUser,
    addMilestone,
    completeMilestone,
    setSelectedWorkflow,
    clearError
  }
}

// Helper function to calculate progress from status
function getProgressFromStatus(status: ProjectStatus): number {
  const statusProgressMap: Record<ProjectStatus, number> = {
    'draft': 5,
    'review': 10,
    'approved': 15,
    'active': 20,
    'applications_open': 30,
    'applications_closed': 40,
    'evaluation': 50,
    'awarded': 60,
    'in_progress': 75,
    'on_hold': 75,
    'completed': 100,
    'cancelled': 0,
    'archived': 100
  }
  return statusProgressMap[status] || 0
}

// Utility functions for workflow management
export const workflowUtils = {
  formatStatusName: (status: ProjectStatus) => {
    return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
  },

  formatPhaseName: (phase: ProjectPhase) => {
    return phase.charAt(0).toUpperCase() + phase.slice(1)
  },

  isOverdue: (workflow: ProjectWorkflow) => {
    if (!workflow.dueDate) return false
    return new Date(workflow.dueDate) < new Date() && 
           !['completed', 'cancelled', 'archived'].includes(workflow.status)
  },

  getStatusColor: (status: ProjectStatus) => {
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
  },

  getPriorityColor: (priority: string) => {
    const priorityColors: Record<string, string> = {
      'low': 'text-green-600 bg-green-100',
      'medium': 'text-yellow-600 bg-yellow-100',
      'high': 'text-orange-600 bg-orange-100',
      'critical': 'text-red-600 bg-red-100'
    }
    return priorityColors[priority] || 'text-gray-600 bg-gray-100'
  },

  getValidTransitions: (currentStatus: ProjectStatus): ProjectStatus[] => {
    const validTransitions: Record<ProjectStatus, ProjectStatus[]> = {
      'draft': ['review', 'cancelled'],
      'review': ['approved', 'draft', 'cancelled'],
      'approved': ['active', 'review', 'cancelled'],
      'active': ['applications_open', 'on_hold', 'cancelled'],
      'applications_open': ['applications_closed', 'on_hold', 'cancelled'],
      'applications_closed': ['evaluation', 'applications_open', 'cancelled'],
      'evaluation': ['awarded', 'applications_open', 'cancelled'],
      'awarded': ['in_progress', 'cancelled'],
      'in_progress': ['completed', 'on_hold', 'cancelled'],
      'on_hold': ['in_progress', 'cancelled'],
      'completed': ['archived'],
      'cancelled': ['archived'],
      'archived': []
    }
    return validTransitions[currentStatus] || []
  }
}
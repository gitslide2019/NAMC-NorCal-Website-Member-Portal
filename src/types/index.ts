// User types
export interface User {
  id: string
  email: string
  name: string
  company?: string
  role: 'member' | 'admin'
  memberType?: 'regular' | 'premium' | 'enterprise'
  profileCompleted: boolean
  createdAt: Date
  updatedAt: Date
}

// Project types
export interface Project {
  id: string
  title: string
  description: string
  budget: {
    min: number
    max: number
  }
  location: {
    city: string
    state: string
    address?: string
  }
  deadline: Date
  category: 'residential' | 'commercial' | 'industrial'
  permits: Permit[]
  bids: Bid[]
  status: 'open' | 'in_progress' | 'completed' | 'cancelled'
  createdAt: Date
  updatedAt: Date
}

export interface Permit {
  id: string
  type: string
  status: 'pending' | 'approved' | 'rejected'
  applicationDate: Date
  approvalDate?: Date
  documents?: string[]
}

export interface Bid {
  id: string
  projectId: string
  userId: string
  amount: number
  proposal: string
  status: 'pending' | 'accepted' | 'rejected'
  submittedAt: Date
}

// Course types
export interface Course {
  id: string
  title: string
  description: string
  instructor: string
  price: number
  duration: string
  level: 'beginner' | 'intermediate' | 'advanced'
  category: string
  thumbnail: string
  enrollments: number
  rating: number
  modules: CourseModule[]
}

export interface CourseModule {
  id: string
  title: string
  duration: string
  lessons: Lesson[]
}

export interface Lesson {
  id: string
  title: string
  type: 'video' | 'document' | 'quiz'
  content: string
  duration?: string
}

// Tool types
export interface Tool {
  id: string
  name: string
  category: string
  description: string
  dailyRate: number
  location: string
  condition: 'excellent' | 'good' | 'fair'
  availability: ToolAvailability[]
  images: string[]
}

export interface ToolAvailability {
  startDate: Date
  endDate: Date
  available: boolean
}

// Event types
export interface Event {
  id: string
  title: string
  description: string
  type: 'meeting' | 'training' | 'networking' | 'committee'
  startDate: Date
  endDate: Date
  location: string
  virtual: boolean
  capacity: number
  registrations: number
  rsvpDeadline: Date
}

// Timeline types
export interface TimelineEvent {
  id: string
  year: number
  title: string
  description: string
  category: 'founding' | 'milestone' | 'project' | 'policy' | 'expansion'
  images?: string[]
  featured: boolean
}

// Member directory types
export interface Member {
  id: string
  name: string
  company: string
  email: string
  phone: string
  specialties: string[]
  licenseNumber: string
  yearsExperience: number
  serviceAreas: string
  website: string
  image: string
  joinDate: string
  status: 'active' | 'inactive'
}

// Dashboard stats
export interface DashboardStats {
  totalMembers: number
  activeProjects: number
  completedProjects: number
  totalRevenue: number
  memberGrowth: number
  projectGrowth: number
}

// Project workflow types
export interface ProjectTask {
  id: string
  name: string
  status: 'pending' | 'in_progress' | 'completed'
  assignee: string
  progress?: number
  completedDate?: string
}

export interface ProjectWorkflow {
  id: string
  name: string
  status: 'pending' | 'in_progress' | 'completed'
  progress?: number
  completedDate?: string
  tasks: ProjectTask[]
}

export interface ProjectBudget {
  allocated: number
  spent: number
  remaining: number
  percentage: number
}

export interface ProjectTimeline {
  startDate: string
  endDate: string
  currentPhase: string
  progress: number
}

export interface ProjectTeamMember {
  name: string
  role: string
  company: string
}

export interface ProjectMilestone {
  name: string
  date: string
  status: 'completed' | 'upcoming' | 'overdue'
}

export interface ProjectLocation {
  address: string
  city: string
  state: string
  coordinates: {
    lat: number
    lng: number
  }
}

export interface ProjectDocument {
  name: string
  type: string
  uploadDate: string
}

export interface DetailedProject {
  id: string
  title: string
  description: string
  client: string
  category: 'residential' | 'commercial' | 'industrial'
  budget: ProjectBudget
  timeline: ProjectTimeline
  status: 'open' | 'in_progress' | 'completed' | 'on_hold'
  priority: 'low' | 'medium' | 'high' | 'critical'
  team: ProjectTeamMember[]
  workflows: ProjectWorkflow[]
  milestones: ProjectMilestone[]
  location: ProjectLocation
  documents: ProjectDocument[]
  createdAt: string
  updatedAt: string
}

export interface ProjectStats {
  totalBudget: number
  totalSpent: number
  averageProgress: number
  activeProjects: number
  completedProjects: number
}

// Enhanced Task Management Types
export interface ProjectTaskAssignment {
  id: string
  taskId: string
  memberId: string
  memberName: string
  memberEmail: string
  role: 'owner' | 'assignee' | 'reviewer' | 'observer'
  assignedAt: Date
  assignedBy: string
  estimatedHours?: number
  actualHours?: number
  notes?: string
}

export interface ProjectTaskComment {
  id: string
  taskId: string
  authorId: string
  authorName: string
  content: string
  createdAt: Date
  updatedAt: Date
  attachments?: string[]
}

export interface ProjectTaskDependency {
  id: string
  taskId: string
  dependsOnTaskId: string
  type: 'finish_to_start' | 'start_to_start' | 'finish_to_finish' | 'start_to_finish'
}

export interface EnhancedProjectTask {
  id: string
  projectId: string
  name: string
  description?: string
  status: 'not_started' | 'in_progress' | 'on_hold' | 'completed' | 'cancelled'
  priority: 'low' | 'medium' | 'high' | 'critical'
  category: 'planning' | 'design' | 'development' | 'testing' | 'deployment' | 'documentation' | 'review'
  assignments: ProjectTaskAssignment[]
  comments: ProjectTaskComment[]
  dependencies: ProjectTaskDependency[]
  progress: number // 0-100
  estimatedHours?: number
  actualHours?: number
  startDate?: Date
  dueDate?: Date
  completedDate?: Date
  createdBy: string
  createdAt: Date
  updatedAt: Date
  hubspotTaskId?: string // HubSpot task ID for sync
  tags?: string[]
  attachments?: string[]
}

export interface EnhancedProjectWorkflow {
  id: string
  projectId: string
  name: string
  description?: string
  status: 'active' | 'completed' | 'paused' | 'cancelled'
  progress: number // 0-100
  startDate?: Date
  endDate?: Date
  completedDate?: Date
  tasks: EnhancedProjectTask[]
  order: number
  createdAt: Date
  updatedAt: Date
}

export interface ProjectCollaborator {
  id: string
  projectId: string
  memberId: string
  memberName: string
  memberEmail: string
  role: 'owner' | 'manager' | 'contributor' | 'viewer'
  permissions: ProjectPermission[]
  addedAt: Date
  addedBy: string
}

export interface ProjectPermission {
  action: 'create_task' | 'assign_task' | 'edit_task' | 'delete_task' | 'view_financials' | 'edit_project' | 'manage_collaborators'
  granted: boolean
}

export interface ProjectActivity {
  id: string
  projectId: string
  userId: string
  userName: string
  action: 'created' | 'updated' | 'task_created' | 'task_assigned' | 'task_completed' | 'comment_added' | 'file_uploaded'
  description: string
  metadata?: Record<string, any>
  createdAt: Date
}

export interface ProjectNotification {
  id: string
  projectId: string
  taskId?: string
  recipientId: string
  type: 'task_assigned' | 'task_due' | 'task_completed' | 'project_updated' | 'comment_added'
  title: string
  message: string
  read: boolean
  sentAt: Date
  readAt?: Date
  actionUrl?: string
}

export interface HubSpotTaskSync {
  id: string
  projectTaskId: string
  hubspotTaskId: string
  hubspotContactId?: string
  lastSyncAt: Date
  syncStatus: 'success' | 'failed' | 'pending'
  errorMessage?: string
}

export interface HubSpotProjectSync {
  id: string
  projectId: string
  hubspotDealId: string
  hubspotCompanyId?: string
  lastSyncAt: Date
  syncStatus: 'success' | 'failed' | 'pending'
  errorMessage?: string
}

// Enhanced Project with full task management
export interface EnhancedProject extends Omit<DetailedProject, 'workflows'> {
  collaborators: ProjectCollaborator[]
  workflows: EnhancedProjectWorkflow[]
  activities: ProjectActivity[]
  notifications: ProjectNotification[]
  hubspotSync?: HubSpotProjectSync
  taskCount: {
    total: number
    completed: number
    inProgress: number
    overdue: number
  }
  settings: {
    allowMemberSelfAssign: boolean
    requireApprovalForTasks: boolean
    enableTimeTracking: boolean
    enableAutomaticNotifications: boolean
    defaultTaskDuration: number // in hours
  }
}
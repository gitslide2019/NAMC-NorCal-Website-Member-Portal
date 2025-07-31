/**
 * Construction Project Types
 * 
 * Comprehensive type definitions for construction project management
 * with HubSpot CRM integration and AI-powered features
 */

// Construction-specific project extension
export interface ConstructionProject {
  id: string
  title: string
  description: string
  category: 'residential' | 'commercial' | 'industrial' | 'infrastructure'
  subcategory?: string // e.g., 'single-family', 'retail', 'warehouse', 'roads'
  
  // Client Information (synced with HubSpot)
  client: {
    id: string
    companyName: string
    contactPerson: string
    email: string
    phone: string
    hubspotContactId?: string
    hubspotCompanyId?: string
  }
  
  // Location Details
  location: {
    address: string
    city: string
    state: string
    zipCode: string
    coordinates: {
      lat: number
      lng: number
    }
    parcelNumber?: string
    lotSize?: number // in square feet
    zoningType?: string
  }
  
  // Project Specifications
  specifications: {
    squareFootage?: number
    stories?: number
    units?: number // for multi-family or commercial
    parkingSpaces?: number
    specialRequirements?: string[]
    greenCertifications?: string[] // LEED, Energy Star, etc.
  }
  
  // Budget & Financial
  budget: ConstructionBudget
  
  // Timeline
  timeline: ConstructionTimeline
  
  // Team & Resources
  team: ProjectTeamMember[]
  resources: ProjectResource[]
  
  // Permits & Compliance
  permits: ConstructionPermit[]
  inspections: ProjectInspection[]
  
  // Documentation
  documents: ProjectDocument[]
  drawings: ProjectDrawing[]
  
  // HubSpot Integration
  hubspotDealId?: string
  hubspotSyncStatus: 'pending' | 'synced' | 'error'
  lastHubspotSync?: Date
  
  // Status & Metadata
  status: ProjectStatus
  priority: 'low' | 'medium' | 'high' | 'critical'
  riskLevel: 'low' | 'medium' | 'high'
  contractSigned: boolean
  contractSignedDate?: Date
  
  // Tracking
  createdBy: string
  createdAt: Date
  updatedAt: Date
  completedAt?: Date
}

export interface ConstructionBudget {
  estimated: BudgetBreakdown
  contracted: BudgetBreakdown
  actual: BudgetBreakdown
  contingency: number // percentage
  profitMargin: number // percentage
  changeOrders: ChangeOrder[]
  paymentSchedule: PaymentMilestone[]
}

export interface BudgetBreakdown {
  materials: number
  labor: number
  equipment: number
  permits: number
  subcontractors: number
  overhead: number
  other: number
  total: number
}

export interface ChangeOrder {
  id: string
  number: string
  description: string
  reason: 'client_request' | 'unforeseen_condition' | 'code_requirement' | 'error_omission'
  cost: number
  status: 'pending' | 'approved' | 'rejected'
  requestedDate: Date
  approvedDate?: Date
  approvedBy?: string
}

export interface PaymentMilestone {
  id: string
  name: string
  description: string
  amount: number
  percentage: number
  dueDate: Date
  status: 'pending' | 'invoiced' | 'paid'
  invoiceNumber?: string
  paidDate?: Date
}

export interface ConstructionTimeline {
  estimatedStartDate: Date
  estimatedEndDate: Date
  actualStartDate?: Date
  actualEndDate?: Date
  currentPhase: ProjectPhase
  phases: ProjectPhase[]
  milestones: ProjectMilestone[]
  criticalPath: string[] // milestone IDs
  weatherDays: number
  bufferDays: number
}

export interface ProjectPhase {
  id: string
  name: string
  description?: string
  startDate: Date
  endDate: Date
  progress: number // 0-100
  status: 'not_started' | 'in_progress' | 'completed' | 'delayed'
  dependencies: string[] // phase IDs
  milestones: string[] // milestone IDs
}

export interface ProjectMilestone {
  id: string
  name: string
  description?: string
  phase: string // phase ID
  targetDate: Date
  completedDate?: Date
  status: 'pending' | 'in_progress' | 'completed' | 'delayed'
  dependencies: string[] // other milestone IDs
  assignedTo?: string[]
  deliverables: string[]
  isCritical: boolean
  hubspotTaskId?: string
}

export interface ProjectTeamMember {
  id: string
  userId: string
  name: string
  email: string
  phone?: string
  company: string
  role: 'project_manager' | 'site_supervisor' | 'architect' | 'engineer' | 'subcontractor' | 'inspector'
  specialization?: string
  licenseNumber?: string
  insurance?: {
    carrier: string
    policyNumber: string
    expirationDate: Date
  }
  hubspotContactId?: string
  assignedTasks: string[]
  hourlyRate?: number
  totalHours?: number
}

export interface ProjectResource {
  id: string
  type: 'material' | 'equipment' | 'tool'
  name: string
  description?: string
  quantity: number
  unit: string
  supplier?: string
  cost: number
  status: 'planned' | 'ordered' | 'delivered' | 'in_use' | 'returned'
  deliveryDate?: Date
  location?: string
}

export interface ConstructionPermit {
  id: string
  type: string // building, electrical, plumbing, mechanical, etc.
  permitNumber?: string
  status: 'not_required' | 'pending' | 'submitted' | 'approved' | 'rejected' | 'expired'
  submitDate?: Date
  approvalDate?: Date
  expirationDate?: Date
  cost: number
  inspectionRequired: boolean
  documents: string[] // document IDs
  notes?: string
}

export interface ProjectInspection {
  id: string
  type: string
  permitId?: string
  scheduledDate: Date
  completedDate?: Date
  inspector?: string
  status: 'scheduled' | 'passed' | 'failed' | 'pending_reinspection'
  findings?: string
  correctiveActions?: string[]
  documents: string[]
}

export interface ProjectDocument {
  id: string
  name: string
  type: 'contract' | 'permit' | 'plan' | 'spec' | 'report' | 'invoice' | 'photo' | 'other'
  category: string
  fileUrl: string
  fileSize: number
  uploadedBy: string
  uploadedAt: Date
  version?: string
  isLatest: boolean
  hubspotAttachmentId?: string
}

export interface ProjectDrawing {
  id: string
  title: string
  type: 'architectural' | 'structural' | 'electrical' | 'plumbing' | 'mechanical' | 'site'
  drawingNumber: string
  revision: string
  scale?: string
  fileUrl: string
  uploadedBy: string
  uploadedAt: Date
  approvedBy?: string
  approvedDate?: Date
}

export type ProjectStatus = 
  | 'draft'
  | 'estimating'
  | 'quoted'
  | 'negotiating'
  | 'contracted'
  | 'permitting'
  | 'scheduled'
  | 'in_progress'
  | 'on_hold'
  | 'completed'
  | 'closed'
  | 'cancelled'

// AI Estimation Types
export interface ConstructionEstimate {
  id: string
  projectId: string
  version: number
  createdAt: Date
  createdBy: string
  
  // Cost Breakdown
  costBreakdown: EstimateCostBreakdown
  
  // AI Analysis
  aiAnalysis: {
    confidence: number // 0-100
    assumptions: string[]
    risks: EstimateRisk[]
    recommendations: string[]
    comparableProjects: ComparableProject[]
  }
  
  // Adjustments
  regionalAdjustment: number // percentage
  seasonalAdjustment: number // percentage
  complexityFactor: number // multiplier
  
  // Validity
  validUntil: Date
  status: 'draft' | 'final' | 'expired'
  approvedBy?: string
  approvedDate?: Date
}

export interface EstimateCostBreakdown {
  // Direct Costs
  materials: MaterialEstimate[]
  labor: LaborEstimate[]
  equipment: EquipmentEstimate[]
  subcontractors: SubcontractorEstimate[]
  
  // Indirect Costs
  permits: number
  insurance: number
  bonding: number
  overhead: number
  
  // Summary
  subtotal: number
  contingency: number
  profitMargin: number
  total: number
}

export interface MaterialEstimate {
  category: string
  items: {
    name: string
    quantity: number
    unit: string
    unitCost: number
    totalCost: number
    supplier?: string
  }[]
  subtotal: number
}

export interface LaborEstimate {
  trade: string
  workers: number
  hours: number
  rate: number
  overtime?: number
  total: number
}

export interface EquipmentEstimate {
  name: string
  type: 'rental' | 'owned'
  duration: number
  unit: 'hour' | 'day' | 'week' | 'month'
  rate: number
  total: number
}

export interface SubcontractorEstimate {
  trade: string
  scope: string
  company?: string
  amount: number
  includesMaterials: boolean
}

export interface EstimateRisk {
  category: 'cost' | 'schedule' | 'quality' | 'safety' | 'regulatory'
  description: string
  probability: 'low' | 'medium' | 'high'
  impact: 'low' | 'medium' | 'high'
  mitigation?: string
}

export interface ComparableProject {
  title: string
  location: string
  completedDate: Date
  size: number
  cost: number
  costPerSqFt: number
  similarity: number // 0-100
}

// HubSpot Sync Types
export interface ProjectHubSpotSync {
  projectId: string
  hubspotDealId: string
  lastSyncAt: Date
  syncDirection: 'to_hubspot' | 'from_hubspot' | 'bidirectional'
  syncedFields: string[]
  syncErrors?: SyncError[]
}

export interface SyncError {
  field: string
  error: string
  occurredAt: Date
  resolved: boolean
}

// Webhook Event Types
export interface ProjectWebhookEvent {
  id: string
  projectId: string
  eventType: ProjectEventType
  data: any
  createdAt: Date
  processed: boolean
  processedAt?: Date
}

export type ProjectEventType = 
  | 'project.created'
  | 'project.updated'
  | 'project.status_changed'
  | 'project.team_member_added'
  | 'project.team_member_removed'
  | 'project.milestone_completed'
  | 'project.document_uploaded'
  | 'project.permit_approved'
  | 'project.inspection_completed'
  | 'project.budget_updated'
  | 'project.change_order_created'
  | 'project.payment_received'
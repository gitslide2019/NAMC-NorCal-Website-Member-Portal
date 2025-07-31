'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { 
  Upload, 
  FileText, 
  Plus, 
  Save, 
  Eye,
  Calendar,
  DollarSign,
  MapPin,
  Users,
  Building,
  AlertCircle,
  CheckCircle,
  X,
  Download,
  Filter,
  Search,
  Info,
  Loader2
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import ErrorBoundary from '@/components/ui/ErrorBoundary'
import VirtualizedList from '@/components/ui/VirtualizedList'
import SkipNavigation from '@/components/ui/SkipNavigation'
import { useAutoSave } from '@/hooks/useAutoSave'
import { debounce } from 'lodash'

// Types for project opportunities
interface ProjectOpportunity {
  id?: string
  title: string
  description: string
  client: string
  projectType: 'residential' | 'commercial' | 'industrial' | 'government'
  budgetMin: number
  budgetMax: number
  location: {
    address: string
    city: string
    state: string
    coordinates?: { lat: number; lng: number }
  }
  deadline: string
  startDate: string
  estimatedDuration: number
  opportunityType: 'open_bid' | 'invitation_only' | 'pre_qualified' | 'negotiated'
  minorityParticipationRequirement: number
  requiredCertifications: string[]
  submissionRequirements: {
    bondingRequired: boolean
    insuranceRequired: boolean
    prequalificationRequired: boolean
    siteVisitRequired: boolean
  }
  evaluationCriteria: {
    price: number
    experience: number
    schedule: number
    minority_participation: number
  }
  visibilitySettings: 'public' | 'members_only' | 'tier_restricted' | 'invitation_only'
  allowedMemberTiers: string[]
  contactPerson: string
  contactPhone: string
  contactEmail: string
  preBidMeeting?: string
  questionsDeadline?: string
  submissionMethod: 'online' | 'email' | 'physical' | 'hybrid'
  documents: File[]
  status: 'draft' | 'active' | 'closed' | 'cancelled'
  priority: 'low' | 'medium' | 'high' | 'critical'
}

const initialProjectState: ProjectOpportunity = {
  title: '',
  description: '',
  client: '',
  projectType: 'commercial',
  budgetMin: 0,
  budgetMax: 0,
  location: {
    address: '',
    city: '',
    state: 'CA'
  },
  deadline: '',
  startDate: '',
  estimatedDuration: 0,
  opportunityType: 'open_bid',
  minorityParticipationRequirement: 0,
  requiredCertifications: [],
  submissionRequirements: {
    bondingRequired: false,
    insuranceRequired: false,
    prequalificationRequired: false,
    siteVisitRequired: false
  },
  evaluationCriteria: {
    price: 40,
    experience: 30,
    schedule: 20,
    minority_participation: 10
  },
  visibilitySettings: 'members_only',
  allowedMemberTiers: ['bronze', 'silver', 'gold', 'platinum'],
  contactPerson: '',
  contactPhone: '',
  contactEmail: '',
  submissionMethod: 'online',
  documents: [],
  status: 'draft',
  priority: 'medium'
}

function ProjectOpportunitiesContent() {
  const { data: session } = useSession()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'upload' | 'manage'>('upload')
  const [projectData, setProjectData] = useState<ProjectOpportunity>(initialProjectState)
  const [uploadedProjects, setUploadedProjects] = useState<ProjectOpportunity[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<{[key: string]: string}>({})
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterType, setFilterType] = useState<string>('all')
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [showSaveIndicator, setShowSaveIndicator] = useState(false)
  const [networkError, setNetworkError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const mainContentRef = useRef<HTMLDivElement>(null)

  // Mock data for existing projects
  const existingProjects: ProjectOpportunity[] = [
    {
      id: '1',
      title: 'Downtown Office Complex Renovation',
      description: 'Complete renovation of 50,000 sq ft office building',
      client: 'Oakland Development Corp',
      projectType: 'commercial',
      budgetMin: 2000000,
      budgetMax: 2500000,
      location: { address: '123 Main St', city: 'Oakland', state: 'CA' },
      deadline: '2025-09-15',
      startDate: '2025-10-01',
      estimatedDuration: 180,
      opportunityType: 'open_bid',
      minorityParticipationRequirement: 30,
      requiredCertifications: ['General Contractor License', 'OSHA 30'],
      submissionRequirements: {
        bondingRequired: true,
        insuranceRequired: true,
        prequalificationRequired: true,
        siteVisitRequired: true
      },
      evaluationCriteria: {
        price: 40,
        experience: 30,
        schedule: 20,
        minority_participation: 10
      },
      visibilitySettings: 'members_only',
      allowedMemberTiers: ['silver', 'gold', 'platinum'],
      contactPerson: 'Sarah Johnson',
      contactPhone: '(510) 555-0123',
      contactEmail: 'sarah.johnson@oaklanddev.com',
      submissionMethod: 'online',
      documents: [],
      status: 'active',
      priority: 'high'
    }
  ]

  // Auto-save functionality
  const saveDraft = useCallback(async (data: ProjectOpportunity) => {
    try {
      const response = await fetch('/api/projects/drafts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      if (!response.ok) throw new Error('Failed to save draft')
    } catch (error) {
      console.error('Auto-save failed:', error)
    }
  }, [])

  const { saveNow, isSaving, loadDraft, clearDraft } = useAutoSave({
    data: projectData,
    onSave: saveDraft,
    enabled: hasUnsavedChanges,
    storageKey: 'namc-project-draft'
  })

  // Load draft on component mount
  useEffect(() => {
    const draft = loadDraft()
    if (draft && window.confirm('You have an unsaved draft. Would you like to restore it?')) {
      setProjectData(draft)
      setHasUnsavedChanges(true)
    }
  }, [loadDraft])

  // Track unsaved changes
  useEffect(() => {
    const hasChanges = JSON.stringify(projectData) !== JSON.stringify(initialProjectState)
    setHasUnsavedChanges(hasChanges)
  }, [projectData])

  // Prevent navigation with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault()
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?'
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [hasUnsavedChanges])

  // Debounced search
  const debouncedSearch = useCallback(
    debounce((value: string) => setSearchTerm(value), 300),
    []
  )

  const handleInputChange = (field: string, value: any) => {
    setProjectData(prev => ({
      ...prev,
      [field]: value
    }))
    
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }))
    }

    // Clear network error on input change
    if (networkError) {
      setNetworkError(null)
    }
  }

  const handleNestedInputChange = (parent: string, field: string, value: any) => {
    setProjectData(prev => ({
      ...prev,
      [parent]: {
        ...prev[parent as keyof ProjectOpportunity] as any,
        [field]: value
      }
    }))
  }

  const handleFileUpload = (files: FileList | null) => {
    if (files) {
      const fileArray = Array.from(files)
      setProjectData(prev => ({
        ...prev,
        documents: [...prev.documents, ...fileArray]
      }))
    }
  }

  const removeDocument = (index: number) => {
    setProjectData(prev => ({
      ...prev,
      documents: prev.documents.filter((_, i) => i !== index)
    }))
  }

  const validateForm = (): boolean => {
    const newErrors: {[key: string]: string} = {}

    if (!projectData.title.trim()) newErrors.title = 'Project title is required'
    if (!projectData.description.trim()) newErrors.description = 'Project description is required'
    if (!projectData.client.trim()) newErrors.client = 'Client name is required'
    if (!projectData.budgetMin || projectData.budgetMin <= 0) newErrors.budgetMin = 'Minimum budget must be greater than 0'
    if (!projectData.budgetMax || projectData.budgetMax <= projectData.budgetMin) {
      newErrors.budgetMax = 'Maximum budget must be greater than minimum budget'
    }
    if (!projectData.location.address.trim()) newErrors.address = 'Project address is required'
    if (!projectData.location.city.trim()) newErrors.city = 'City is required'
    if (!projectData.deadline) newErrors.deadline = 'Submission deadline is required'
    if (!projectData.startDate) newErrors.startDate = 'Project start date is required'
    if (!projectData.contactPerson.trim()) newErrors.contactPerson = 'Contact person is required'
    if (!projectData.contactEmail.trim()) newErrors.contactEmail = 'Contact email is required'
    if (!projectData.contactPhone.trim()) newErrors.contactPhone = 'Contact phone is required'

    // Validate evaluation criteria total to 100%
    const criteriaTotal = Object.values(projectData.evaluationCriteria).reduce((sum, val) => sum + val, 0)
    if (criteriaTotal !== 100) {
      newErrors.evaluationCriteria = 'Evaluation criteria must total 100%'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (status: 'draft' | 'active') => {
    if (!validateForm()) return

    setIsSubmitting(true)
    setNetworkError(null)
    
    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ...projectData, status })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      
      if (result.success) {
        // Show success indicator
        setShowSaveIndicator(true)
        setTimeout(() => setShowSaveIndicator(false), 3000)
        
        // Clear draft from localStorage
        clearDraft()
        
        // Reset form and navigate
        setProjectData(initialProjectState)
        setHasUnsavedChanges(false)
        setActiveTab('manage')
      } else {
        throw new Error(result.message || 'Failed to save project')
      }
      
    } catch (error) {
      console.error('Error saving project:', error)
      setNetworkError(
        error instanceof Error 
          ? error.message 
          : 'Failed to save project. Please check your connection and try again.'
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const filteredProjects = [...existingProjects, ...uploadedProjects].filter(project => {
    const matchesSearch = project.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         project.client.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = filterStatus === 'all' || project.status === filterStatus
    const matchesType = filterType === 'all' || project.projectType === filterType
    
    return matchesSearch && matchesStatus && matchesType
  })

  return (
    <>
      <SkipNavigation />
      <div className="p-6" ref={mainContentRef}>
        <div id="main-content" tabIndex={-1}>
        {/* Status Indicators */}
        <AnimatePresence>
          {showSaveIndicator && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="fixed top-4 right-4 z-50 bg-green-500 text-white px-4 py-2 rounded-md shadow-lg flex items-center"
              role="status"
              aria-live="polite"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Project saved successfully!
            </motion.div>
          )}

          {networkError && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 bg-red-50 border border-red-200 rounded-md p-4"
              role="alert"
              aria-live="assertive"
            >
              <div className="flex items-start">
                <AlertCircle className="h-5 w-5 text-red-400 mr-3 mt-0.5" />
                <div>
                  <h3 className="text-sm font-medium text-red-800">Network Error</h3>
                  <p className="text-sm text-red-700 mt-1">{networkError}</p>
                  <button
                    onClick={() => setNetworkError(null)}
                    className="text-sm text-red-600 hover:text-red-800 underline mt-2"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {hasUnsavedChanges && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 bg-yellow-50 border border-yellow-200 rounded-md p-4"
              role="status"
              aria-live="polite"
            >
              <div className="flex items-start">
                <Info className="h-5 w-5 text-yellow-600 mr-3 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-yellow-800">
                    You have unsaved changes. 
                    {isSaving && (
                      <span className="inline-flex items-center ml-2">
                        <Loader2 className="h-3 w-3 animate-spin mr-1" />
                        Auto-saving...
                      </span>
                    )}
                  </p>
                </div>
                <button
                  onClick={saveNow}
                  className="text-sm text-yellow-600 hover:text-yellow-800 font-medium"
                  disabled={isSaving}
                >
                  Save Now
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-inter font-bold text-gray-900 mb-2">
            Project Opportunities Management
          </h1>
          <p className="text-gray-600">
            Upload, manage, and track project opportunities for NAMC members
          </p>
        </motion.div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg mb-8 w-fit">
        <button
          onClick={() => setActiveTab('upload')}
          className={`px-6 py-2 rounded-md transition-colors ${
            activeTab === 'upload'
              ? 'bg-white text-namc-gold shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Upload className="inline-block w-4 h-4 mr-2" />
          Upload New Project
        </button>
        <button
          onClick={() => setActiveTab('manage')}
          className={`px-6 py-2 rounded-md transition-colors ${
            activeTab === 'manage'
              ? 'bg-white text-namc-gold shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <FileText className="inline-block w-4 h-4 mr-2" />
          Manage Projects ({filteredProjects.length})
        </button>
      </div>

      {activeTab === 'upload' && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Plus className="mr-2" />
                Create New Project Opportunity
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-8">
              {/* Basic Information */}
              <div>
                <h3 className="text-lg font-semibold mb-4 text-gray-900">Basic Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="project-title" className="block text-sm font-medium text-gray-700 mb-2">
                      Project Title <span className="text-red-500" aria-label="required">*</span>
                    </label>
                    <input
                      id="project-title"
                      type="text"
                      value={projectData.title}
                      onChange={(e) => handleInputChange('title', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-namc-gold focus:ring-offset-1 min-h-[44px] ${
                        errors.title ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Enter project title"
                      aria-required="true"
                      aria-invalid={!!errors.title}
                      aria-describedby={errors.title ? "title-error" : undefined}
                    />
                    {errors.title && (
                      <p id="title-error" role="alert" className="text-red-500 text-xs mt-1">
                        {errors.title}
                      </p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="client-name" className="block text-sm font-medium text-gray-700 mb-2">
                      Client <span className="text-red-500" aria-label="required">*</span>
                    </label>
                    <input
                      id="client-name"
                      type="text"
                      value={projectData.client}
                      onChange={(e) => handleInputChange('client', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-namc-gold focus:ring-offset-1 min-h-[44px] ${
                        errors.client ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Enter client name"
                      aria-required="true"
                      aria-invalid={!!errors.client}
                      aria-describedby={errors.client ? "client-error" : undefined}
                    />
                    {errors.client && (
                      <p id="client-error" role="alert" className="text-red-500 text-xs mt-1">
                        {errors.client}
                      </p>
                    )}
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Project Description *
                    </label>
                    <textarea
                      value={projectData.description}
                      onChange={(e) => handleInputChange('description', e.target.value)}
                      rows={4}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-namc-gold ${
                        errors.description ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Provide detailed project description"
                    />
                    {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Project Type
                    </label>
                    <select
                      value={projectData.projectType}
                      onChange={(e) => handleInputChange('projectType', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-namc-gold"
                    >
                      <option value="residential">Residential</option>
                      <option value="commercial">Commercial</option>
                      <option value="industrial">Industrial</option>
                      <option value="government">Government</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Opportunity Type
                    </label>
                    <select
                      value={projectData.opportunityType}
                      onChange={(e) => handleInputChange('opportunityType', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-namc-gold"
                    >
                      <option value="open_bid">Open Bid</option>
                      <option value="invitation_only">Invitation Only</option>
                      <option value="pre_qualified">Pre-Qualified</option>
                      <option value="negotiated">Negotiated</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Budget and Timeline */}
              <div>
                <h3 className="text-lg font-semibold mb-4 text-gray-900">Budget and Timeline</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Minimum Budget *
                    </label>
                    <input
                      type="number"
                      value={projectData.budgetMin}
                      onChange={(e) => handleInputChange('budgetMin', parseFloat(e.target.value) || 0)}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-namc-gold ${
                        errors.budgetMin ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="0"
                    />
                    {errors.budgetMin && <p className="text-red-500 text-xs mt-1">{errors.budgetMin}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Maximum Budget *
                    </label>
                    <input
                      type="number"
                      value={projectData.budgetMax}
                      onChange={(e) => handleInputChange('budgetMax', parseFloat(e.target.value) || 0)}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-namc-gold ${
                        errors.budgetMax ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="0"
                    />
                    {errors.budgetMax && <p className="text-red-500 text-xs mt-1">{errors.budgetMax}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Submission Deadline *
                    </label>
                    <input
                      type="date"
                      value={projectData.deadline}
                      onChange={(e) => handleInputChange('deadline', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-namc-gold ${
                        errors.deadline ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    {errors.deadline && <p className="text-red-500 text-xs mt-1">{errors.deadline}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Project Start Date *
                    </label>
                    <input
                      type="date"
                      value={projectData.startDate}
                      onChange={(e) => handleInputChange('startDate', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-namc-gold ${
                        errors.startDate ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    {errors.startDate && <p className="text-red-500 text-xs mt-1">{errors.startDate}</p>}
                  </div>
                </div>
              </div>

              {/* Location */}
              <div>
                <h3 className="text-lg font-semibold mb-4 text-gray-900">Project Location</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Address *
                    </label>
                    <input
                      type="text"
                      value={projectData.location.address}
                      onChange={(e) => handleNestedInputChange('location', 'address', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-namc-gold ${
                        errors.address ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Enter project address"
                    />
                    {errors.address && <p className="text-red-500 text-xs mt-1">{errors.address}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      City *
                    </label>
                    <input
                      type="text"
                      value={projectData.location.city}
                      onChange={(e) => handleNestedInputChange('location', 'city', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-namc-gold ${
                        errors.city ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Enter city"
                    />
                    {errors.city && <p className="text-red-500 text-xs mt-1">{errors.city}</p>}
                  </div>
                </div>
              </div>

              {/* Requirements */}
              <div>
                <h3 className="text-lg font-semibold mb-4 text-gray-900">Project Requirements</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Minority Participation Requirement (%)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={projectData.minorityParticipationRequirement}
                      onChange={(e) => handleInputChange('minorityParticipationRequirement', parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-namc-gold"
                      placeholder="0"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Required Certifications
                    </label>
                    <textarea
                      value={projectData.requiredCertifications.join(', ')}
                      onChange={(e) => handleInputChange('requiredCertifications', e.target.value.split(', ').filter(cert => cert.trim()))}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-namc-gold"
                      placeholder="Enter certifications separated by commas"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Submission Requirements
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {Object.entries(projectData.submissionRequirements).map(([key, value]) => (
                        <label key={key} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={value}
                            onChange={(e) => handleNestedInputChange('submissionRequirements', key, e.target.checked)}
                            className="form-checkbox text-namc-gold"
                          />
                          <span className="text-sm text-gray-700 capitalize">
                            {key.replace(/([A-Z])/g, ' $1').toLowerCase()}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div>
                <h3 className="text-lg font-semibold mb-4 text-gray-900">Contact Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Contact Person *
                    </label>
                    <input
                      type="text"
                      value={projectData.contactPerson}
                      onChange={(e) => handleInputChange('contactPerson', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-namc-gold ${
                        errors.contactPerson ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Enter contact name"
                    />
                    {errors.contactPerson && <p className="text-red-500 text-xs mt-1">{errors.contactPerson}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      value={projectData.contactPhone}
                      onChange={(e) => handleInputChange('contactPhone', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-namc-gold ${
                        errors.contactPhone ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="(555) 123-4567"
                    />
                    {errors.contactPhone && <p className="text-red-500 text-xs mt-1">{errors.contactPhone}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      value={projectData.contactEmail}
                      onChange={(e) => handleInputChange('contactEmail', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-namc-gold ${
                        errors.contactEmail ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="contact@example.com"
                    />
                    {errors.contactEmail && <p className="text-red-500 text-xs mt-1">{errors.contactEmail}</p>}
                  </div>
                </div>
              </div>

              {/* Document Upload */}
              <div>
                <h3 className="text-lg font-semibold mb-4 text-gray-900">Project Documents</h3>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                  <div className="text-center">
                    <Upload className="mx-auto h-12 w-12 text-gray-400" />
                    <div className="mt-4">
                      <label htmlFor="file-upload" className="cursor-pointer">
                        <span className="mt-2 block text-sm font-medium text-gray-900">
                          Drop files here or click to upload
                        </span>
                        <span className="mt-1 block text-sm text-gray-500">
                          PDF, DOC, DOCX up to 10MB each
                        </span>
                      </label>
                      <input
                        id="file-upload"
                        ref={fileInputRef}
                        type="file"
                        multiple
                        accept=".pdf,.doc,.docx"
                        onChange={(e) => handleFileUpload(e.target.files)}
                        className="hidden"
                      />
                    </div>
                  </div>
                </div>

                {projectData.documents.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {projectData.documents.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <div className="flex items-center space-x-2">
                          <FileText className="h-4 w-4 text-gray-400" />
                          <span className="text-sm text-gray-900">{file.name}</span>
                        </div>
                        <button
                          onClick={() => removeDocument(index)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Form Actions */}
              <div className="flex justify-between items-center pt-6 border-t">
                <div className="text-sm text-gray-600">
                  {hasUnsavedChanges && (
                    <span className="flex items-center">
                      <Info className="h-4 w-4 mr-1" />
                      Unsaved changes
                      {isSaving && (
                        <span className="ml-2 flex items-center">
                          <Loader2 className="h-3 w-3 animate-spin mr-1" />
                          Auto-saving...
                        </span>
                      )}
                    </span>
                  )}
                </div>
                <div className="flex space-x-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (hasUnsavedChanges && !window.confirm('Are you sure you want to reset? You will lose all unsaved changes.')) {
                        return
                      }
                      setProjectData(initialProjectState)
                      setHasUnsavedChanges(false)
                      clearDraft()
                    }}
                    disabled={isSubmitting}
                    className="min-h-[44px]"
                  >
                    Reset Form
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleSubmit('draft')}
                    disabled={isSubmitting}
                    className="min-h-[44px]"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving Draft...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Save as Draft
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={() => handleSubmit('active')}
                    disabled={isSubmitting}
                    className="bg-namc-gold text-white hover:bg-namc-gold/90 min-h-[44px]"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Publishing...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Publish Project
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {activeTab === 'manage' && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Filters and Search */}
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
                <div className="flex-1 max-w-md">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <input
                      id="search-projects"
                      type="text"
                      placeholder="Search projects..."
                      onChange={(e) => debouncedSearch(e.target.value)}
                      className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-namc-gold focus:ring-offset-1 min-h-[44px]"
                      aria-label="Search projects"
                    />
                  </div>
                </div>
                
                <div className="flex space-x-4">
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-namc-gold"
                  >
                    <option value="all">All Status</option>
                    <option value="draft">Draft</option>
                    <option value="active">Active</option>
                    <option value="closed">Closed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                  
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-namc-gold"
                  >
                    <option value="all">All Types</option>
                    <option value="residential">Residential</option>
                    <option value="commercial">Commercial</option>
                    <option value="industrial">Industrial</option>
                    <option value="government">Government</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Projects List */}
          {filteredProjects.length > 20 ? (
            <div className="h-[600px]">
              <VirtualizedList
                items={filteredProjects}
                itemHeight={180}
                renderItem={(project) => (
                  <Card key={project.id} className="hover:shadow-md transition-shadow m-2">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h3 className="text-lg font-semibold text-gray-900">
                              {project.title}
                            </h3>
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              project.status === 'active' ? 'bg-green-100 text-green-800' :
                              project.status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
                              project.status === 'closed' ? 'bg-gray-100 text-gray-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {project.status.charAt(0).toUpperCase() + project.status.slice(1)}
                            </span>
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              project.priority === 'critical' ? 'bg-red-100 text-red-800' :
                              project.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                              project.priority === 'medium' ? 'bg-blue-100 text-blue-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {project.priority} priority
                            </span>
                          </div>
                          
                          <p className="text-gray-600 mb-3">{project.description}</p>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div className="flex items-center text-gray-600">
                              <Building className="h-4 w-4 mr-1" />
                              {project.client}
                            </div>
                            <div className="flex items-center text-gray-600">
                              <DollarSign className="h-4 w-4 mr-1" />
                              {formatCurrency(project.budgetMin)} - {formatCurrency(project.budgetMax)}
                            </div>
                            <div className="flex items-center text-gray-600">
                              <Calendar className="h-4 w-4 mr-1" />
                              Due: {new Date(project.deadline).toLocaleDateString()}
                            </div>
                            <div className="flex items-center text-gray-600">
                              <MapPin className="h-4 w-4 mr-1" />
                              {project.location.city}, {project.location.state}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex space-x-2 ml-4">
                          <Button variant="outline" size="sm" className="min-h-[44px]">
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                          <Button variant="outline" size="sm" className="min-h-[44px]">
                            <Download className="h-4 w-4 mr-1" />
                            Export
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              />
            </div>
          ) : (
            <div className="space-y-4">
              {filteredProjects.map((project) => (
                <Card key={project.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {project.title}
                          </h3>
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            project.status === 'active' ? 'bg-green-100 text-green-800' :
                            project.status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
                            project.status === 'closed' ? 'bg-gray-100 text-gray-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {project.status.charAt(0).toUpperCase() + project.status.slice(1)}
                          </span>
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            project.priority === 'critical' ? 'bg-red-100 text-red-800' :
                            project.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                            project.priority === 'medium' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {project.priority} priority
                          </span>
                        </div>
                        
                        <p className="text-gray-600 mb-3">{project.description}</p>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div className="flex items-center text-gray-600">
                            <Building className="h-4 w-4 mr-1" />
                            {project.client}
                          </div>
                          <div className="flex items-center text-gray-600">
                            <DollarSign className="h-4 w-4 mr-1" />
                            {formatCurrency(project.budgetMin)} - {formatCurrency(project.budgetMax)}
                          </div>
                          <div className="flex items-center text-gray-600">
                            <Calendar className="h-4 w-4 mr-1" />
                            Due: {new Date(project.deadline).toLocaleDateString()}
                          </div>
                          <div className="flex items-center text-gray-600">
                            <MapPin className="h-4 w-4 mr-1" />
                            {project.location.city}, {project.location.state}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex space-x-2 ml-4">
                        <Button variant="outline" size="sm" className="min-h-[44px]">
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        <Button variant="outline" size="sm" className="min-h-[44px]">
                          <Download className="h-4 w-4 mr-1" />
                          Export
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {filteredProjects.length === 0 && (
            <Card>
              <CardContent className="p-12 text-center">
                <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No projects found</h3>
                <p className="text-gray-600 mb-4">
                  {searchTerm || filterStatus !== 'all' || filterType !== 'all'
                    ? 'No projects match your current filters.'
                    : 'Get started by creating your first project opportunity.'}
                </p>
                <Button
                  onClick={() => setActiveTab('upload')}
                  className="bg-namc-gold text-white hover:bg-namc-gold/90"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create New Project
                </Button>
              </CardContent>
            </Card>
          )}
        </motion.div>
      )}
        </div>
      </div>
    </>
  )
}

// Main component with error boundary
export default function ProjectOpportunitiesAdmin() {
  return (
    <ErrorBoundary>
      <ProjectOpportunitiesContent />
    </ErrorBoundary>
  )
}
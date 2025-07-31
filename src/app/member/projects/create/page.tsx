'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ArrowLeft, 
  ArrowRight, 
  Check, 
  AlertCircle,
  Building,
  Home,
  Factory,
  MapPin,
  Calendar,
  DollarSign,
  Users,
  FileText,
  Zap,
  Download,
  Send,
  Share,
  Bot
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { ConstructionProject, ConstructionEstimate } from '@/types/construction-project.types'
import toast from 'react-hot-toast'

interface ProjectTemplate {
  id: string
  name: string
  description: string
  specifications: {
    squareFootage: number
    stories: number
    units?: number
    parkingSpaces?: number
  }
  defaultPhases: string[]
}

interface PermitType {
  type: string
  required: boolean
  estimatedCost: number
}

const WIZARD_STEPS = [
  { id: 1, title: 'Project Type', description: 'Select project category and template' },
  { id: 2, title: 'Basic Info', description: 'Project title, description, and specifications' },
  { id: 3, title: 'Client Details', description: 'Client information and contact details' },
  { id: 4, title: 'Location', description: 'Project site address and details' },
  { id: 5, title: 'Timeline', description: 'Project schedule and milestones' },
  { id: 6, title: 'Estimation', description: 'AI-powered cost estimation' },
  { id: 7, title: 'Review', description: 'Review and finalize project creation' }
]

export default function CreateProjectPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [templates, setTemplates] = useState<ProjectTemplate[]>([])
  const [permitTypes, setPermitTypes] = useState<PermitType[]>([])
  const [estimate, setEstimate] = useState<ConstructionEstimate | null>(null)
  const [estimating, setEstimating] = useState(false)
  
  // Form data
  const [projectData, setProjectData] = useState({
    // Step 1: Project Type
    category: '' as 'residential' | 'commercial' | 'industrial' | 'infrastructure' | '',
    subcategory: '',
    templateId: '',
    
    // Step 2: Basic Info
    title: '',
    description: '',
    specifications: {
      squareFootage: 0,
      stories: 1,
      units: 1,
      parkingSpaces: 0,
      specialRequirements: [] as string[],
      greenCertifications: [] as string[]
    },
    
    // Step 3: Client Details
    client: {
      companyName: '',
      contactPerson: '',
      email: '',
      phone: '',
      hubspotContactId: '',
      hubspotCompanyId: ''
    },
    
    // Step 4: Location
    location: {
      address: '',
      city: '',
      state: 'CA',
      zipCode: '',
      coordinates: { lat: 0, lng: 0 },
      parcelNumber: '',
      lotSize: 0,
      zoningType: ''
    },
    
    // Step 5: Timeline
    timeline: {
      estimatedStartDate: '',
      estimatedEndDate: '',
      weatherDays: 0,
      bufferDays: 0,
      milestones: [] as any[]
    },
    
    // Settings
    autoSyncHubSpot: true,
    generateEstimate: true
  })

  useEffect(() => {
    fetchTemplates()
  }, [])

  useEffect(() => {
    if (projectData.category) {
      fetchTemplatesForCategory(projectData.category)
    }
  }, [projectData.category])

  const fetchTemplates = async () => {
    try {
      const response = await fetch('/api/projects/create')
      const result = await response.json()
      
      if (result.success) {
        setTemplates(result.data.templates.residential || [])
        setPermitTypes(result.data.permitTypes.residential || [])
      }
    } catch (error) {
      console.error('Error fetching templates:', error)
      toast.error('Failed to load project templates')
    }
  }

  const fetchTemplatesForCategory = async (category: string) => {
    try {
      const response = await fetch(`/api/projects/create?category=${category}`)
      const result = await response.json()
      
      if (result.success) {
        setTemplates(result.data.templates || [])
        setPermitTypes(result.data.permitTypes || [])
      }
    } catch (error) {
      console.error('Error fetching category templates:', error)
    }
  }

  const generateEstimate = async () => {
    setEstimating(true)
    try {
      const response = await fetch('/api/projects/estimate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectData: {
            ...projectData,
            id: 'draft',
            permits: permitTypes.filter(p => p.required).map(p => ({ type: p.type, cost: p.estimatedCost }))
          },
          includeTimeline: true,
          includePDF: false
        })
      })
      
      const result = await response.json()
      
      if (result.success) {
        setEstimate(result.data.estimate)
        toast.success(`Estimate generated with ${result.data.confidence}% confidence`)
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      console.error('Error generating estimate:', error)
      toast.error('Failed to generate cost estimate')
    } finally {
      setEstimating(false)
    }
  }

  const handleNext = async () => {
    if (currentStep < WIZARD_STEPS.length) {
      // Validate current step
      if (!validateStep(currentStep)) {
        return
      }
      
      // Generate estimate on step 6
      if (currentStep === 5 && projectData.generateEstimate) {
        await generateEstimate()
      }
      
      setCurrentStep(prev => prev + 1)
    }
  }

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1)
    }
  }

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        if (!projectData.category) {
          toast.error('Please select a project category')
          return false
        }
        break
      case 2:
        if (!projectData.title || !projectData.description) {
          toast.error('Please provide project title and description')
          return false
        }
        if (!projectData.specifications.squareFootage) {
          toast.error('Please specify the project square footage')
          return false
        }
        break
      case 3:
        if (!projectData.client.companyName || !projectData.client.email) {
          toast.error('Please provide client company name and email')
          return false
        }
        break
      case 4:
        if (!projectData.location.address || !projectData.location.city) {
          toast.error('Please provide complete address information')
          return false
        }
        break
      case 5:
        if (!projectData.timeline.estimatedStartDate || !projectData.timeline.estimatedEndDate) {
          toast.error('Please provide project start and end dates')
          return false
        }
        break
    }
    return true
  }

  const handleSubmit = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/projects/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...projectData,
          permits: permitTypes.filter(p => p.required),
          estimate: estimate
        })
      })
      
      const result = await response.json()
      
      if (result.success) {
        toast.success('Project created successfully!')
        router.push(`/member/projects/${result.data.project.id}`)
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      console.error('Error creating project:', error)
      toast.error('Failed to create project')
    } finally {
      setLoading(false)
    }
  }

  const applyTemplate = (template: ProjectTemplate) => {
    setProjectData(prev => ({
      ...prev,
      templateId: template.id,
      specifications: {
        ...prev.specifications,
        ...template.specifications
      },
      timeline: {
        ...prev.timeline,
        milestones: template.defaultPhases.map((phase, index) => ({
          id: `milestone-${index}`,
          name: phase,
          description: `Complete ${phase.toLowerCase()} phase`,
          targetDate: new Date(Date.now() + (index + 1) * 30 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'pending',
          isCritical: index < 3, // First 3 phases are critical
          dependencies: index > 0 ? [`milestone-${index - 1}`] : [],
          deliverables: []
        }))
      }
    }))
  }

  const downloadEstimatePDF = async () => {
    try {
      const response = await fetch('/api/projects/estimate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectData: { ...projectData, id: 'draft' },
          includePDF: true,
          companyInfo: {
            name: 'Your Construction Company',
            email: 'estimates@yourcompany.com',
            phone: '(555) 123-4567',
            license: 'C-123456'
          }
        })
      })
      
      const result = await response.json()
      
      if (result.success && result.data.pdf) {
        // Convert base64 to blob and download
        const binaryString = atob(result.data.pdf.data)
        const bytes = new Uint8Array(binaryString.length)
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i)
        }
        const blob = new Blob([bytes], { type: 'application/pdf' })
        
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = result.data.pdf.filename
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        
        toast.success('Estimate PDF downloaded successfully')
      }
    } catch (error) {
      console.error('Error downloading PDF:', error)
      toast.error('Failed to download estimate PDF')
    }
  }

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Select Project Category</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { value: 'residential', label: 'Residential', icon: Home },
                  { value: 'commercial', label: 'Commercial', icon: Building },
                  { value: 'industrial', label: 'Industrial', icon: Factory },
                  { value: 'infrastructure', label: 'Infrastructure', icon: MapPin }
                ].map((category) => {
                  const IconComponent = category.icon
                  return (
                    <Card
                      key={category.value}
                      className={`cursor-pointer transition-all hover:shadow-md ${
                        projectData.category === category.value ? 'ring-2 ring-yellow-500 bg-yellow-50' : ''
                      }`}
                      onClick={() => setProjectData(prev => ({ ...prev, category: category.value as any }))}
                    >
                      <CardContent className="p-6 text-center">
                        <IconComponent className="w-8 h-8 mx-auto mb-2 text-gray-600" />
                        <div className="font-medium">{category.label}</div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </div>
            
            {projectData.category && templates.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-4">Choose a Template (Optional)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {templates.map((template) => (
                    <Card
                      key={template.id}
                      className={`cursor-pointer transition-all hover:shadow-md ${
                        projectData.templateId === template.id ? 'ring-2 ring-yellow-500 bg-yellow-50' : ''
                      }`}
                      onClick={() => applyTemplate(template)}
                    >
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base">{template.name}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-gray-600 mb-3">{template.description}</p>
                        <div className="text-xs text-gray-500">
                          <div>Size: {template.specifications.squareFootage.toLocaleString()} sq ft</div>
                          <div>Stories: {template.specifications.stories}</div>
                          {template.specifications.units && (
                            <div>Units: {template.specifications.units}</div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        )

      case 2:
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Project Title *
                </label>
                <Input
                  value={projectData.title}
                  onChange={(e) => setProjectData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g., Oakland Community Center Renovation"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Subcategory
                </label>
                <select
                  value={projectData.subcategory}
                  onChange={(e) => setProjectData(prev => ({ ...prev, subcategory: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
                >
                  <option value="">Select subcategory...</option>
                  {projectData.category === 'residential' && (
                    <>
                      <option value="single-family">Single Family Home</option>
                      <option value="multi-family">Multi-Family</option>
                      <option value="addition">Home Addition</option>
                      <option value="renovation">Renovation</option>
                    </>
                  )}
                  {projectData.category === 'commercial' && (
                    <>
                      <option value="office">Office Building</option>
                      <option value="retail">Retail Space</option>
                      <option value="restaurant">Restaurant</option>
                      <option value="warehouse">Warehouse</option>
                    </>
                  )}
                </select>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Project Description *
              </label>
              <textarea
                value={projectData.description}
                onChange={(e) => setProjectData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Provide a detailed description of the project scope, objectives, and key requirements..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
                rows={4}
              />
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-4">Project Specifications</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Square Footage *
                  </label>
                  <Input
                    type="number"
                    value={projectData.specifications.squareFootage}
                    onChange={(e) => setProjectData(prev => ({
                      ...prev,
                      specifications: { ...prev.specifications, squareFootage: parseInt(e.target.value) || 0 }
                    }))}
                    placeholder="2500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Stories
                  </label>
                  <Input
                    type="number"
                    value={projectData.specifications.stories}
                    onChange={(e) => setProjectData(prev => ({
                      ...prev,
                      specifications: { ...prev.specifications, stories: parseInt(e.target.value) || 1 }
                    }))}
                    placeholder="2"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Units
                  </label>
                  <Input
                    type="number"
                    value={projectData.specifications.units}
                    onChange={(e) => setProjectData(prev => ({
                      ...prev,
                      specifications: { ...prev.specifications, units: parseInt(e.target.value) || 1 }
                    }))}
                    placeholder="1"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Parking Spaces
                  </label>
                  <Input
                    type="number"
                    value={projectData.specifications.parkingSpaces}
                    onChange={(e) => setProjectData(prev => ({
                      ...prev,
                      specifications: { ...prev.specifications, parkingSpaces: parseInt(e.target.value) || 0 }
                    }))}
                    placeholder="4"
                  />
                </div>
              </div>
            </div>
          </div>
        )

      case 3:
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Company Name *
                </label>
                <Input
                  value={projectData.client.companyName}
                  onChange={(e) => setProjectData(prev => ({
                    ...prev,
                    client: { ...prev.client, companyName: e.target.value }
                  }))}
                  placeholder="ABC Construction Inc."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Contact Person
                </label>
                <Input
                  value={projectData.client.contactPerson}
                  onChange={(e) => setProjectData(prev => ({
                    ...prev,
                    client: { ...prev.client, contactPerson: e.target.value }
                  }))}
                  placeholder="John Smith"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address *
                </label>
                <Input
                  type="email"
                  value={projectData.client.email}
                  onChange={(e) => setProjectData(prev => ({
                    ...prev,
                    client: { ...prev.client, email: e.target.value }
                  }))}
                  placeholder="john@abcconstruction.com"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number
                </label>
                <Input
                  type="tel"
                  value={projectData.client.phone}
                  onChange={(e) => setProjectData(prev => ({
                    ...prev,
                    client: { ...prev.client, phone: e.target.value }
                  }))}
                  placeholder="(555) 123-4567"
                />
              </div>
            </div>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <Zap className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-blue-900">HubSpot Integration</h4>
                  <p className="text-sm text-blue-700 mt-1">
                    We'll automatically search for existing contacts in HubSpot and create new ones if needed.
                    This ensures seamless CRM integration and workflow automation.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )

      case 4:
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Street Address *
              </label>
              <Input
                value={projectData.location.address}
                onChange={(e) => setProjectData(prev => ({
                  ...prev,
                  location: { ...prev.location, address: e.target.value }
                }))}
                placeholder="123 Main Street"
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  City *
                </label>
                <Input
                  value={projectData.location.city}
                  onChange={(e) => setProjectData(prev => ({
                    ...prev,
                    location: { ...prev.location, city: e.target.value }
                  }))}
                  placeholder="Oakland"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  State *
                </label>
                <select
                  value={projectData.location.state}
                  onChange={(e) => setProjectData(prev => ({
                    ...prev,
                    location: { ...prev.location, state: e.target.value }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
                >
                  <option value="CA">California</option>
                  <option value="NV">Nevada</option>
                  <option value="OR">Oregon</option>
                  <option value="WA">Washington</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ZIP Code
                </label>
                <Input
                  value={projectData.location.zipCode}
                  onChange={(e) => setProjectData(prev => ({
                    ...prev,
                    location: { ...prev.location, zipCode: e.target.value }
                  }))}
                  placeholder="94612"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Parcel Number
                </label>
                <Input
                  value={projectData.location.parcelNumber}
                  onChange={(e) => setProjectData(prev => ({
                    ...prev,
                    location: { ...prev.location, parcelNumber: e.target.value }
                  }))}
                  placeholder="123-456-789"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Lot Size (sq ft)
                </label>
                <Input
                  type="number"
                  value={projectData.location.lotSize}
                  onChange={(e) => setProjectData(prev => ({
                    ...prev,
                    location: { ...prev.location, lotSize: parseInt(e.target.value) || 0 }
                  }))}
                  placeholder="7500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Zoning Type
                </label>
                <Input
                  value={projectData.location.zoningType}
                  onChange={(e) => setProjectData(prev => ({
                    ...prev,
                    location: { ...prev.location, zoningType: e.target.value }
                  }))}
                  placeholder="R-1"
                />
              </div>
            </div>
          </div>
        )

      case 5:
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Estimated Start Date *
                </label>
                <Input
                  type="date"
                  value={projectData.timeline.estimatedStartDate}
                  onChange={(e) => setProjectData(prev => ({
                    ...prev,
                    timeline: { ...prev.timeline, estimatedStartDate: e.target.value }
                  }))}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Estimated End Date *
                </label>
                <Input
                  type="date"
                  value={projectData.timeline.estimatedEndDate}
                  onChange={(e) => setProjectData(prev => ({
                    ...prev,
                    timeline: { ...prev.timeline, estimatedEndDate: e.target.value }
                  }))}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Weather Contingency Days
                </label>
                <Input
                  type="number"
                  value={projectData.timeline.weatherDays}
                  onChange={(e) => setProjectData(prev => ({
                    ...prev,
                    timeline: { ...prev.timeline, weatherDays: parseInt(e.target.value) || 0 }
                  }))}
                  placeholder="10"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Buffer Days
                </label>
                <Input
                  type="number"
                  value={projectData.timeline.bufferDays}
                  onChange={(e) => setProjectData(prev => ({
                    ...prev,
                    timeline: { ...prev.timeline, bufferDays: parseInt(e.target.value) || 0 }
                  }))}
                  placeholder="5"
                />
              </div>
            </div>
            
            {projectData.timeline.milestones.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-4">Project Milestones</h3>
                <div className="space-y-3">
                  {projectData.timeline.milestones.slice(0, 5).map((milestone, index) => (
                    <div key={milestone.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full ${milestone.isCritical ? 'bg-red-500' : 'bg-blue-500'}`} />
                        <span className="font-medium">{milestone.name}</span>
                        {milestone.isCritical && (
                          <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">Critical</span>
                        )}
                      </div>
                      <span className="text-sm text-gray-500">
                        {new Date(milestone.targetDate).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                  {projectData.timeline.milestones.length > 5 && (
                    <div className="text-sm text-gray-500 text-center">
                      +{projectData.timeline.milestones.length - 5} more milestones
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )

      case 6:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <Bot className="w-16 h-16 mx-auto mb-4 text-yellow-600" />
              <h3 className="text-xl font-semibold mb-2">AI-Powered Cost Estimation</h3>
              <p className="text-gray-600 mb-6">
                Generate intelligent cost estimates using machine learning and regional data
              </p>
              
              {!estimate && !estimating && (
                <Button onClick={generateEstimate} className="px-8 py-3">
                  <Zap className="w-5 h-5 mr-2" />
                  Generate Estimate
                </Button>
              )}
              
              {estimating && (
                <div className="flex items-center justify-center space-x-2">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-600"></div>
                  <span>Analyzing project data...</span>
                </div>
              )}
            </div>
            
            {estimate && (
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <div className="text-center mb-6">
                  <div className="text-3xl font-bold text-green-600">
                    ${estimate.costBreakdown.total.toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-500">Total Project Estimate</div>
                  <div className="text-sm text-blue-600 mt-1">
                    {estimate.aiAnalysis.confidence}% Confidence Score
                  </div>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="text-center">
                    <div className="font-semibold text-lg">
                      ${estimate.costBreakdown.materials.reduce((sum, m) => sum + m.subtotal, 0).toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-600">Materials</div>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold text-lg">
                      ${estimate.costBreakdown.labor.reduce((sum, l) => sum + l.total, 0).toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-600">Labor</div>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold text-lg">
                      ${estimate.costBreakdown.equipment.reduce((sum, e) => sum + e.total, 0).toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-600">Equipment</div>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold text-lg">
                      ${estimate.costBreakdown.subcontractors.reduce((sum, s) => sum + s.amount, 0).toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-600">Subcontractors</div>
                  </div>
                </div>
                
                <div className="flex justify-center space-x-4">
                  <Button variant="outline" onClick={downloadEstimatePDF}>
                    <Download className="w-4 h-4 mr-2" />
                    Download PDF
                  </Button>
                  <Button variant="outline">
                    <Send className="w-4 h-4 mr-2" />
                    Send to Client
                  </Button>
                  <Button variant="outline">
                    <Share className="w-4 h-4 mr-2" />
                    Share Link
                  </Button>
                </div>
              </div>
            )}
          </div>
        )

      case 7:
        return (
          <div className="space-y-6">
            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
              <div className="flex items-center space-x-3 mb-4">
                <Check className="w-6 h-6 text-green-600" />
                <h3 className="text-lg font-semibold text-green-900">Ready to Create Project</h3>
              </div>
              <p className="text-green-700">
                Review the project details below and click "Create Project" to finalize.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Project Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div><strong>Title:</strong> {projectData.title}</div>
                  <div><strong>Category:</strong> {projectData.category}</div>
                  <div><strong>Size:</strong> {projectData.specifications.squareFootage.toLocaleString()} sq ft</div>
                  <div><strong>Stories:</strong> {projectData.specifications.stories}</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Client Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div><strong>Company:</strong> {projectData.client.companyName}</div>
                  <div><strong>Contact:</strong> {projectData.client.contactPerson}</div>
                  <div><strong>Email:</strong> {projectData.client.email}</div>
                  <div><strong>Phone:</strong> {projectData.client.phone}</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Location</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div><strong>Address:</strong> {projectData.location.address}</div>
                  <div><strong>City:</strong> {projectData.location.city}, {projectData.location.state}</div>
                  <div><strong>ZIP:</strong> {projectData.location.zipCode}</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Timeline</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div><strong>Start:</strong> {new Date(projectData.timeline.estimatedStartDate).toLocaleDateString()}</div>
                  <div><strong>End:</strong> {new Date(projectData.timeline.estimatedEndDate).toLocaleDateString()}</div>
                  <div><strong>Duration:</strong> {Math.ceil((new Date(projectData.timeline.estimatedEndDate).getTime() - new Date(projectData.timeline.estimatedStartDate).getTime()) / (1000 * 60 * 60 * 24))} days</div>
                </CardContent>
              </Card>
            </div>
            
            {estimate && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Cost Estimate</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600 mb-2">
                    ${estimate.costBreakdown.total.toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-600">
                    Confidence: {estimate.aiAnalysis.confidence}% | Valid until: {new Date(estimate.validUntil).toLocaleDateString()}
                  </div>
                </CardContent>
              </Card>
            )}
            
            <div className="flex items-center space-x-3 p-4 bg-blue-50 rounded-lg">
              <input
                type="checkbox"
                id="hubspotSync"
                checked={projectData.autoSyncHubSpot}
                onChange={(e) => setProjectData(prev => ({ ...prev, autoSyncHubSpot: e.target.checked }))}
                className="w-4 h-4 text-yellow-600"
              />
              <label htmlFor="hubspotSync" className="text-sm text-blue-900">
                Automatically sync project and client data to HubSpot CRM
              </label>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Create New Project</h1>
              <p className="text-gray-600 mt-1">{WIZARD_STEPS[currentStep - 1].description}</p>
            </div>
            <Button
              variant="outline"
              onClick={() => router.back()}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Cancel</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Progress Indicator */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center justify-between mb-8">
          {WIZARD_STEPS.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div className={`
                w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium
                ${currentStep > step.id ? 'bg-green-500 text-white' : 
                  currentStep === step.id ? 'bg-yellow-500 text-white' : 
                  'bg-gray-200 text-gray-600'}
              `}>
                {currentStep > step.id ? <Check className="w-5 h-5" /> : step.id}
              </div>
              <div className="ml-3">
                <div className="text-sm font-medium text-gray-900">{step.title}</div>
              </div>
              {index < WIZARD_STEPS.length - 1 && (
                <div className={`ml-6 h-px w-16 ${currentStep > step.id ? 'bg-green-500' : 'bg-gray-300'}`} />
              )}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <Card>
          <CardContent className="p-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                {renderStep()}
              </motion.div>
            </AnimatePresence>
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between mt-8">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentStep === 1}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Previous</span>
          </Button>

          {currentStep < WIZARD_STEPS.length ? (
            <Button onClick={handleNext} className="flex items-center space-x-2">
              <span>Next</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={loading}
              className="flex items-center space-x-2"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              <span>Create Project</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
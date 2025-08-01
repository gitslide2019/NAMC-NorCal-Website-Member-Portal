'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Calculator,
  ArrowLeft,
  Building,
  DollarSign,
  Clock,
  MapPin,
  FileText,
  Zap,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Upload,
  Sparkles,
  Brain,
  Target,
  BarChart3,
  Download,
  RefreshCw,
  Plus,
  Edit3
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'

interface ProjectInput {
  projectName: string
  description: string
  location: string
  projectType: string
  estimatedArea?: number
  stories?: number
  scope: string[]
  timeline?: number
  specialRequirements: string[]
}

interface CostEstimate {
  id: string
  projectName: string
  estimatedCost: {
    low: number
    high: number
    confidence: number
  }
  breakdown: {
    category: string
    cost: number
    percentage: number
    confidence: number
    notes?: string
  }[]
  laborCosts: {
    category: string
    hours: number
    rate: number
    total: number
  }[]
  materialCosts: {
    item: string
    quantity: number
    unit: string
    unitCost: number
    total: number
  }[]
  timeline: {
    phase: string
    duration: number
    startWeek: number
  }[]
  riskFactors: string[]
  recommendations: string[]
  confidence: number
  createdAt: Date
  lastUpdated: Date
}

const PROJECT_TYPES = [
  'Commercial Office',
  'Retail Space',
  'Warehouse/Industrial',
  'Multi-Family Residential',
  'Single Family Residential',
  'Medical Facility',
  'Educational Facility',
  'Restaurant/Food Service',
  'Mixed Use Development',
  'Renovation/Remodel',
  'Tenant Improvement',
  'Infrastructure'
]

const SCOPE_OPTIONS = [
  'Foundation Work',
  'Structural Framing',
  'Roofing',
  'Exterior Walls',
  'Interior Partitions',
  'Electrical Systems',
  'Plumbing Systems',
  'HVAC Systems',
  'Fire Protection',
  'Flooring',
  'Painting',
  'Site Work',
  'Landscaping',
  'Permits & Inspections'
]

export default function CostEstimationPage() {
  const router = useRouter()
  const [estimates, setEstimates] = useState<CostEstimate[]>([])
  const [showNewEstimate, setShowNewEstimate] = useState(false)
  const [loading, setLoading] = useState(false)
  const [selectedEstimate, setSelectedEstimate] = useState<CostEstimate | null>(null)

  const [projectInput, setProjectInput] = useState<ProjectInput>({
    projectName: '',
    description: '',
    location: '',
    projectType: '',
    estimatedArea: undefined,
    stories: undefined,
    scope: [],
    timeline: undefined,
    specialRequirements: []
  })

  const [newRequirement, setNewRequirement] = useState('')

  useEffect(() => {
    loadExistingEstimates()
  }, [])

  const loadExistingEstimates = async () => {
    // Mock data for demonstration
    const mockEstimates: CostEstimate[] = [
      {
        id: '1',
        projectName: 'Downtown Office Renovation',
        estimatedCost: {
          low: 450000,
          high: 650000,
          confidence: 0.82
        },
        breakdown: [
          { category: 'General Construction', cost: 350000, percentage: 64, confidence: 0.85 },
          { category: 'Electrical', cost: 85000, percentage: 15, confidence: 0.80 },
          { category: 'HVAC', cost: 75000, percentage: 14, confidence: 0.75 },
          { category: 'Permits & Fees', cost: 40000, percentage: 7, confidence: 0.90 }
        ],
        laborCosts: [
          { category: 'General Labor', hours: 2400, rate: 65, total: 156000 },
          { category: 'Skilled Trades', hours: 800, rate: 85, total: 68000 }
        ],
        materialCosts: [
          { item: 'Framing Lumber', quantity: 15000, unit: 'bf', unitCost: 2.5, total: 37500 },
          { item: 'Electrical Wire', quantity: 5000, unit: 'ft', unitCost: 1.2, total: 6000 }
        ],
        timeline: [
          { phase: 'Demolition', duration: 2, startWeek: 1 },
          { phase: 'Rough Construction', duration: 8, startWeek: 3 },
          { phase: 'Finishes', duration: 6, startWeek: 11 }
        ],
        riskFactors: ['Potential asbestos', 'Limited parking during construction'],
        recommendations: ['Schedule environmental assessment', 'Coordinate with building management'],
        confidence: 0.82,
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        lastUpdated: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
      }
    ]
    setEstimates(mockEstimates)
  }

  const generateEstimate = async () => {
    if (!projectInput.projectName || !projectInput.description || !projectInput.location) {
      alert('Please fill in all required fields')
      return
    }

    setLoading(true)
    try {
      // In production, this would call the Claude construction assistant service
      const response = await fetch('/api/construction-assistant/estimate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ projectInput })
      })

      if (response.ok) {
        const newEstimate = await response.json()
        setEstimates(prev => [newEstimate, ...prev])
        setShowNewEstimate(false)
        resetForm()
      } else {
        // Mock estimate generation for demo
        const mockEstimate: CostEstimate = {
          id: Date.now().toString(),
          projectName: projectInput.projectName,
          estimatedCost: {
            low: Math.floor(Math.random() * 200000) + 100000,
            high: Math.floor(Math.random() * 300000) + 200000,
            confidence: Math.random() * 0.3 + 0.7
          },
          breakdown: [
            { category: 'General Construction', cost: 250000, percentage: 60, confidence: 0.85 },
            { category: 'Electrical', cost: 65000, percentage: 16, confidence: 0.80 },
            { category: 'HVAC', cost: 55000, percentage: 13, confidence: 0.75 },
            { category: 'Permits & Fees', cost: 45000, percentage: 11, confidence: 0.90 }
          ],
          laborCosts: [
            { category: 'General Labor', hours: 1800, rate: 60, total: 108000 },
            { category: 'Skilled Trades', hours: 600, rate: 80, total: 48000 }
          ],
          materialCosts: [
            { item: 'Materials Package', quantity: 1, unit: 'lot', unitCost: 85000, total: 85000 }
          ],
          timeline: [
            { phase: 'Planning & Permits', duration: 3, startWeek: 1 },
            { phase: 'Construction', duration: 12, startWeek: 4 },
            { phase: 'Completion', duration: 2, startWeek: 16 }
          ],
          riskFactors: ['Weather delays', 'Material cost volatility'],
          recommendations: ['Early material procurement', 'Flexible timeline'],
          confidence: 0.78,
          createdAt: new Date(),
          lastUpdated: new Date()
        }
        setEstimates(prev => [mockEstimate, ...prev])
        setShowNewEstimate(false)
        resetForm()
      }
    } catch (error) {
      console.error('Error generating estimate:', error)
      alert('Failed to generate estimate. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setProjectInput({
      projectName: '',
      description: '',
      location: '',
      projectType: '',
      estimatedArea: undefined,
      stories: undefined,
      scope: [],
      timeline: undefined,
      specialRequirements: []
    })
    setNewRequirement('')
  }

  const toggleScope = (scopeItem: string) => {
    setProjectInput(prev => ({
      ...prev,
      scope: prev.scope.includes(scopeItem)
        ? prev.scope.filter(item => item !== scopeItem)
        : [...prev.scope, scopeItem]
    }))
  }

  const addRequirement = () => {
    if (newRequirement.trim()) {
      setProjectInput(prev => ({
        ...prev,
        specialRequirements: [...prev.specialRequirements, newRequirement.trim()]
      }))
      setNewRequirement('')
    }
  }

  const removeRequirement = (index: number) => {
    setProjectInput(prev => ({
      ...prev,
      specialRequirements: prev.specialRequirements.filter((_, i) => i !== index)
    }))
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600 bg-green-100'
    if (confidence >= 0.6) return 'text-yellow-600 bg-yellow-100'
    return 'text-red-600 bg-red-100'
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
                size="sm"
                onClick={() => router.back()}
                className="flex items-center space-x-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </Button>
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-gradient-to-br from-green-500 to-blue-600 rounded-full">
                  <Calculator className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">AI Cost Estimation</h1>
                  <p className="text-gray-600">Generate accurate project estimates with AI and RS Means data</p>
                </div>
              </div>
            </div>
            
            <Button
              onClick={() => setShowNewEstimate(true)}
              className="flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>New Estimate</span>
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Estimates</p>
                  <p className="text-2xl font-bold text-gray-900">{estimates.length}</p>
                </div>
                <FileText className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Avg Confidence</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {estimates.length > 0 
                      ? Math.round(estimates.reduce((sum, est) => sum + est.confidence, 0) / estimates.length * 100)
                      : 0}%
                  </p>
                </div>
                <Target className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Value</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(estimates.reduce((sum, est) => sum + est.estimatedCost.high, 0))}
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">AI Powered</p>
                  <p className="text-2xl font-bold text-gray-900">100%</p>
                  <p className="text-xs text-orange-600">Claude + RS Means</p>
                </div>
                <Sparkles className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* New Estimate Modal */}
        <AnimatePresence>
          {showNewEstimate && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
              >
                <div className="p-6 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-gradient-to-br from-green-500 to-blue-600 rounded-full">
                        <Brain className="w-5 h-5 text-white" />
                      </div>
                      <h2 className="text-xl font-semibold text-gray-900">Generate AI Cost Estimate</h2>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => setShowNewEstimate(false)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      ×
                    </Button>
                  </div>
                </div>

                <div className="p-6 space-y-6">
                  {/* Basic Information */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Project Name *
                      </label>
                      <Input
                        value={projectInput.projectName}
                        onChange={(e) => setProjectInput(prev => ({ ...prev, projectName: e.target.value }))}
                        placeholder="Enter project name"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Location *
                      </label>
                      <Input
                        value={projectInput.location}
                        onChange={(e) => setProjectInput(prev => ({ ...prev, location: e.target.value }))}
                        placeholder="City, State"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Project Type *
                      </label>
                      <select
                        value={projectInput.projectType}
                        onChange={(e) => setProjectInput(prev => ({ ...prev, projectType: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-sm"
                      >
                        <option value="">Select project type</option>
                        {PROJECT_TYPES.map(type => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Estimated Area (sq ft)
                      </label>
                      <Input
                        type="number"
                        value={projectInput.estimatedArea || ''}
                        onChange={(e) => setProjectInput(prev => ({ 
                          ...prev, 
                          estimatedArea: e.target.value ? parseInt(e.target.value) : undefined 
                        }))}
                        placeholder="Square footage"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Number of Stories
                      </label>
                      <Input
                        type="number"
                        value={projectInput.stories || ''}
                        onChange={(e) => setProjectInput(prev => ({ 
                          ...prev, 
                          stories: e.target.value ? parseInt(e.target.value) : undefined 
                        }))}
                        placeholder="Stories"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Timeline (weeks)
                      </label>
                      <Input
                        type="number"
                        value={projectInput.timeline || ''}
                        onChange={(e) => setProjectInput(prev => ({ 
                          ...prev, 
                          timeline: e.target.value ? parseInt(e.target.value) : undefined 
                        }))}
                        placeholder="Expected duration"
                      />
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Project Description *
                    </label>
                    <textarea
                      value={projectInput.description}
                      onChange={(e) => setProjectInput(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Detailed description of the project scope and requirements..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      rows={4}
                    />
                  </div>

                  {/* Scope Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Project Scope
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {SCOPE_OPTIONS.map(scope => (
                        <label key={scope} className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={projectInput.scope.includes(scope)}
                            onChange={() => toggleScope(scope)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700">{scope}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Special Requirements */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Special Requirements
                    </label>
                    <div className="flex space-x-2 mb-2">
                      <Input
                        value={newRequirement}
                        onChange={(e) => setNewRequirement(e.target.value)}
                        placeholder="Add special requirement..."
                        onKeyPress={(e) => e.key === 'Enter' && addRequirement()}
                      />
                      <Button onClick={addRequirement} size="sm">
                        Add
                      </Button>
                    </div>
                    {projectInput.specialRequirements.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {projectInput.specialRequirements.map((req, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800"
                          >
                            {req}
                            <button
                              onClick={() => removeRequirement(index)}
                              className="ml-2 text-blue-600 hover:text-blue-800"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
                  <Button
                    variant="outline"
                    onClick={() => setShowNewEstimate(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={generateEstimate}
                    disabled={loading}
                    className="flex items-center space-x-2"
                  >
                    {loading ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Zap className="w-4 h-4" />
                    )}
                    <span>Generate AI Estimate</span>
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Estimates List */}
        <div className="space-y-6">
          {estimates.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Calculator className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No estimates yet</h3>
                <p className="text-gray-600 mb-6">
                  Create your first AI-powered cost estimate to get started.
                </p>
                <Button onClick={() => setShowNewEstimate(true)}>
                  Create First Estimate
                </Button>
              </CardContent>
            </Card>
          ) : (
            estimates.map((estimate) => (
              <motion.div
                key={estimate.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {estimate.projectName}
                          </h3>
                          <span className={`px-2 py-1 text-xs rounded-full font-medium ${getConfidenceColor(estimate.confidence)}`}>
                            {Math.round(estimate.confidence * 100)}% Confidence
                          </span>
                        </div>
                        <div className="flex items-center space-x-4 text-sm text-gray-600">
                          <span>{new Date(estimate.createdAt).toLocaleDateString()}</span>
                          <span>•</span>
                          <span>Last updated {new Date(estimate.lastUpdated).toLocaleDateString()}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Button variant="outline" size="sm">
                          <Edit3 className="w-4 h-4 mr-1" />
                          Edit
                        </Button>
                        <Button variant="outline" size="sm">
                          <Download className="w-4 h-4 mr-1" />
                          Export
                        </Button>
                      </div>
                    </div>

                    {/* Cost Summary */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                      <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-4">
                        <div className="flex items-center space-x-2 mb-2">
                          <DollarSign className="w-5 h-5 text-green-600" />
                          <span className="text-sm font-medium text-gray-700">Estimated Cost Range</span>
                        </div>
                        <div className="text-2xl font-bold text-gray-900">
                          {formatCurrency(estimate.estimatedCost.low)} - {formatCurrency(estimate.estimatedCost.high)}
                        </div>
                      </div>

                      <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-4">
                        <div className="flex items-center space-x-2 mb-2">
                          <BarChart3 className="w-5 h-5 text-purple-600" />
                          <span className="text-sm font-medium text-gray-700">Timeline</span>
                        </div>
                        <div className="text-2xl font-bold text-gray-900">
                          {estimate.timeline.reduce((sum, phase) => sum + phase.duration, 0)} weeks
                        </div>
                      </div>

                      <div className="bg-gradient-to-r from-orange-50 to-yellow-50 rounded-lg p-4">
                        <div className="flex items-center space-x-2 mb-2">
                          <Target className="w-5 h-5 text-orange-600" />
                          <span className="text-sm font-medium text-gray-700">Risk Level</span>
                        </div>
                        <div className="text-2xl font-bold text-gray-900">
                          {estimate.riskFactors.length === 0 ? 'Low' : 
                           estimate.riskFactors.length <= 2 ? 'Medium' : 'High'}
                        </div>
                      </div>
                    </div>

                    {/* Cost Breakdown */}
                    <div className="mb-6">
                      <h4 className="text-sm font-medium text-gray-700 mb-3">Cost Breakdown</h4>
                      <div className="space-y-2">
                        {estimate.breakdown.map((item, index) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center space-x-3">
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: `hsl(${index * 60}, 70%, 50%)` }}
                              />
                              <span className="text-sm font-medium text-gray-900">{item.category}</span>
                            </div>
                            <div className="flex items-center space-x-4">
                              <span className="text-sm text-gray-600">{item.percentage}%</span>
                              <span className="text-sm font-medium text-gray-900">
                                {formatCurrency(item.cost)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* AI Insights */}
                    <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 border border-blue-200">
                      <div className="flex items-center space-x-2 mb-3">
                        <Sparkles className="w-4 h-4 text-blue-600" />
                        <span className="text-sm font-medium text-blue-900">AI Insights & Recommendations</span>
                      </div>
                      
                      {estimate.riskFactors.length > 0 && (
                        <div className="mb-3">
                          <div className="text-xs text-gray-600 mb-1">Risk Factors</div>
                          <div className="flex flex-wrap gap-2">
                            {estimate.riskFactors.map((risk, index) => (
                              <span key={index} className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded-full">
                                {risk}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {estimate.recommendations.length > 0 && (
                        <div>
                          <div className="text-xs text-gray-600 mb-1">Recommendations</div>
                          <div className="flex flex-wrap gap-2">
                            {estimate.recommendations.map((rec, index) => (
                              <span key={index} className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                                {rec}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
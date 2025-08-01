'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search,
  Filter,
  MapPin,
  Calendar,
  DollarSign,
  Building,
  User,
  ArrowLeft,
  Zap,
  Target,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  Brain,
  Star,
  Bookmark,
  Eye,
  Download,
  RefreshCw,
  Map as MapIcon,
  List,
  Sparkles
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { useShovelsAPI } from '@/hooks/useShovelsAPI'
import MapboxProjectsView from '@/components/ui/MapboxProjectsView'

interface PermitWithAI {
  id: string
  permit_number: string
  permit_type: string
  status: 'issued' | 'pending' | 'expired' | 'rejected' | 'under_review'
  issued_date: string
  expiration_date?: string
  valuation: number
  description: string
  address: {
    street: string
    city: string
    state: string
    zip: string
    latitude?: number
    longitude?: number
  }
  contractor?: {
    name: string
    license_number?: string
    phone?: string
  }
  owner?: {
    name: string
    phone?: string
  }
  // AI Analysis Fields
  claudeAnalysis?: {
    opportunityScore: number
    complexityScore: number
    riskFactors: string[]
    projectComplexity: 'LOW' | 'MEDIUM' | 'HIGH'
    competitionLevel: 'LOW' | 'MEDIUM' | 'HIGH'
    timelineEstimate: number
    keyRequirements: string[]
    recommendations: string[]
    costRangeEstimate?: {
      low: number
      high: number
      confidence: number
    }
  }
  analysisDate?: Date
  isWatched?: boolean
}

interface SearchFilters {
  searchTerm: string
  city: string
  permitType: string
  status: string
  dateRange: string
  minValuation: string
  maxValuation: string
  aiAnalysis: boolean
  minOpportunityScore: number
}

export default function IntelligentPermitsPage() {
  const router = useRouter()
  const { searchPermits, config: shovelsConfig } = useShovelsAPI()
  
  const [permits, setPermits] = useState<PermitWithAI[]>([])
  const [loading, setLoading] = useState(false)
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list')
  const [showFilters, setShowFilters] = useState(false)
  const [selectedPermit, setSelectedPermit] = useState<PermitWithAI | null>(null)
  
  const [filters, setFilters] = useState<SearchFilters>({
    searchTerm: '',
    city: '',
    permitType: '',
    status: '',
    dateRange: '30days',
    minValuation: '',
    maxValuation: '',
    aiAnalysis: true,
    minOpportunityScore: 0.6
  })

  const [stats, setStats] = useState({
    totalFound: 0,
    highOpportunity: 0,
    avgValue: 0,
    analyzed: 0
  })

  useEffect(() => {
    if (shovelsConfig.isConfigured) {
      searchPermitsWithAI()
    }
  }, [shovelsConfig.isConfigured])

  const searchPermitsWithAI = async () => {
    if (!shovelsConfig.isConfigured) return

    setLoading(true)
    try {
      const searchParams: any = {
        state: 'CA',
        limit: filters.aiAnalysis ? 20 : 50 // Limit for AI analysis due to cost
      }

      if (filters.city) searchParams.city = filters.city
      if (filters.permitType) searchParams.permitType = filters.permitType
      if (filters.status) searchParams.status = filters.status
      if (filters.minValuation) searchParams.minValuation = parseFloat(filters.minValuation)
      if (filters.maxValuation) searchParams.maxValuation = parseFloat(filters.maxValuation)
      
      // Date range
      if (filters.dateRange) {
        const now = new Date()
        let dateFrom = new Date()
        
        switch (filters.dateRange) {
          case '7days':
            dateFrom.setDate(now.getDate() - 7)
            break
          case '30days':
            dateFrom.setDate(now.getDate() - 30)
            break
          case '90days':
            dateFrom.setDate(now.getDate() - 90)
            break
        }
        
        searchParams.dateFrom = dateFrom.toISOString().split('T')[0]
      }

      const results = await searchPermits(searchParams)
      
      // Mock AI analysis for demo (in production, this would call the permit analysis service)
      const permitsWithAI = results.map((permit: any) => ({
        ...permit,
        claudeAnalysis: filters.aiAnalysis ? {
          opportunityScore: Math.random() * 0.4 + 0.5, // 0.5-0.9
          complexityScore: Math.random(),
          riskFactors: ['Permit timeline risk', 'Market competition'].slice(0, Math.floor(Math.random() * 2) + 1),
          projectComplexity: ['LOW', 'MEDIUM', 'HIGH'][Math.floor(Math.random() * 3)] as 'LOW' | 'MEDIUM' | 'HIGH',
          competitionLevel: ['LOW', 'MEDIUM', 'HIGH'][Math.floor(Math.random() * 3)] as 'LOW' | 'MEDIUM' | 'HIGH',
          timelineEstimate: Math.floor(Math.random() * 120) + 30,
          keyRequirements: ['Licensed contractor required', 'Electrical inspection needed'].slice(0, Math.floor(Math.random() * 2) + 1),
          recommendations: ['Submit bid early', 'Emphasize local experience'],
          costRangeEstimate: {
            low: permit.valuation * 0.8,
            high: permit.valuation * 1.2,
            confidence: Math.random() * 0.3 + 0.7
          }
        } : undefined,
        analysisDate: filters.aiAnalysis ? new Date() : undefined,
        isWatched: Math.random() > 0.8
      }))

      // Filter by AI criteria
      const filteredPermits = permitsWithAI.filter((permit: PermitWithAI) => {
        if (filters.searchTerm) {
          const searchLower = filters.searchTerm.toLowerCase()
          const matches = 
            permit.description?.toLowerCase().includes(searchLower) ||
            permit.permit_number?.toLowerCase().includes(searchLower) ||
            permit.address?.street?.toLowerCase().includes(searchLower) ||
            permit.contractor?.name?.toLowerCase().includes(searchLower)
          if (!matches) return false
        }

        if (filters.aiAnalysis && permit.claudeAnalysis) {
          if (permit.claudeAnalysis.opportunityScore < filters.minOpportunityScore) {
            return false
          }
        }

        return true
      })

      // Sort by opportunity score if AI analysis is enabled
      if (filters.aiAnalysis) {
        filteredPermits.sort((a, b) => 
          (b.claudeAnalysis?.opportunityScore || 0) - (a.claudeAnalysis?.opportunityScore || 0)
        )
      }

      setPermits(filteredPermits)

      // Calculate stats
      const totalValue = filteredPermits.reduce((sum, p) => sum + (p.valuation || 0), 0)
      const highOpportunityCount = filteredPermits.filter(p => 
        p.claudeAnalysis && p.claudeAnalysis.opportunityScore > 0.8
      ).length
      const analyzedCount = filteredPermits.filter(p => p.claudeAnalysis).length

      setStats({
        totalFound: filteredPermits.length,
        highOpportunity: highOpportunityCount,
        avgValue: filteredPermits.length > 0 ? totalValue / filteredPermits.length : 0,
        analyzed: analyzedCount
      })

    } catch (error) {
      console.error('Error searching permits:', error)
    } finally {
      setLoading(false)
    }
  }

  const getOpportunityScoreColor = (score: number) => {
    if (score >= 0.8) return 'text-green-600 bg-green-100'
    if (score >= 0.6) return 'text-yellow-600 bg-yellow-100'
    return 'text-red-600 bg-red-100'
  }

  const getComplexityColor = (complexity: string) => {
    switch (complexity) {
      case 'LOW': return 'text-green-600 bg-green-100'
      case 'MEDIUM': return 'text-yellow-600 bg-yellow-100'
      case 'HIGH': return 'text-red-600 bg-red-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const handleWatchPermit = (permitId: string) => {
    setPermits(prev => prev.map(permit => 
      permit.id === permitId 
        ? { ...permit, isWatched: !permit.isWatched }
        : permit
    ))
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
                <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full">
                  <Brain className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Intelligent Permit Discovery</h1>
                  <p className="text-gray-600">AI-powered permit search with opportunity analysis</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <div className="flex items-center bg-gray-100 rounded-lg p-1">
                <Button
                  variant={viewMode === 'list' ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                  className="px-3 py-1"
                >
                  <List className="w-4 h-4 mr-1" />
                  List
                </Button>
                <Button
                  variant={viewMode === 'map' ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('map')}
                  className="px-3 py-1"
                >
                  <MapIcon className="w-4 h-4 mr-1" />
                  Map
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Permits Found</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalFound}</p>
                </div>
                <Search className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">High Opportunity</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.highOpportunity}</p>
                  <p className="text-xs text-green-600">80%+ match score</p>
                </div>
                <Target className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Avg Valuation</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(stats.avgValue)}
                  </p>
                </div>
                <DollarSign className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">AI Analyzed</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.analyzed}</p>
                  <p className="text-xs text-blue-600">With insights</p>
                </div>
                <Sparkles className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="space-y-4">
              {/* Main Search */}
              <div className="flex gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <Input
                    type="text"
                    placeholder="Search permits by description, number, address, or contractor..."
                    value={filters.searchTerm}
                    onChange={(e) => setFilters(prev => ({ ...prev, searchTerm: e.target.value }))}
                    className="pl-10"
                  />
                </div>
                <Button
                  variant="outline"
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center space-x-2"
                >
                  <Filter className="w-4 h-4" />
                  <span>Filters</span>
                </Button>
                <Button
                  onClick={searchPermitsWithAI}
                  disabled={loading || !shovelsConfig.isConfigured}
                  className="flex items-center space-x-2"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  <span>Search</span>
                </Button>
              </div>

              {/* Advanced Filters */}
              <AnimatePresence>
                {showFilters && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="border-t pt-4"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                        <Input
                          type="text"
                          placeholder="e.g. San Francisco"
                          value={filters.city}
                          onChange={(e) => setFilters(prev => ({ ...prev, city: e.target.value }))}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Permit Type</label>
                        <select
                          value={filters.permitType}
                          onChange={(e) => setFilters(prev => ({ ...prev, permitType: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-sm"
                        >
                          <option value="">All Types</option>
                          <option value="building">Building</option>
                          <option value="electrical">Electrical</option>
                          <option value="plumbing">Plumbing</option>
                          <option value="mechanical">Mechanical</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                        <select
                          value={filters.status}
                          onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-sm"
                        >
                          <option value="">All Status</option>
                          <option value="issued">Issued</option>
                          <option value="pending">Pending</option>
                          <option value="under_review">Under Review</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Time Period</label>
                        <select
                          value={filters.dateRange}
                          onChange={(e) => setFilters(prev => ({ ...prev, dateRange: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-sm"
                        >
                          <option value="7days">Last 7 Days</option>
                          <option value="30days">Last 30 Days</option>
                          <option value="90days">Last 90 Days</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">AI Analysis</label>
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={filters.aiAnalysis}
                            onChange={(e) => setFilters(prev => ({ ...prev, aiAnalysis: e.target.checked }))}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="ml-2 text-sm text-gray-700">Include AI insights</span>
                        </label>
                      </div>
                    </div>

                    {filters.aiAnalysis && (
                      <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                        <div className="flex items-center space-x-4">
                          <div className="flex-1">
                            <label className="block text-sm font-medium text-blue-800 mb-1">
                              Minimum Opportunity Score: {(filters.minOpportunityScore * 100).toFixed(0)}%
                            </label>
                            <input
                              type="range"
                              min="0"
                              max="1"
                              step="0.1"
                              value={filters.minOpportunityScore}
                              onChange={(e) => setFilters(prev => ({ ...prev, minOpportunityScore: parseFloat(e.target.value) }))}
                              className="w-full"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {viewMode === 'list' ? (
          <div className="space-y-4">
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Searching permits with AI analysis...</p>
              </div>
            ) : permits.length > 0 ? (
              permits.map((permit) => (
                <motion.div
                  key={permit.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all duration-200"
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">
                            Permit #{permit.permit_number}
                          </h3>
                          <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                            {permit.permit_type}
                          </span>
                          <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">
                            {permit.status.replace('_', ' ').toUpperCase()}
                          </span>
                          {permit.claudeAnalysis && (
                            <span className={`px-2 py-1 text-xs rounded-full font-medium ${getOpportunityScoreColor(permit.claudeAnalysis.opportunityScore)}`}>
                              {(permit.claudeAnalysis.opportunityScore * 100).toFixed(0)}% Match
                            </span>
                          )}
                        </div>
                        <p className="text-gray-600 mb-3">{permit.description}</p>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleWatchPermit(permit.id)}
                          className={`${permit.isWatched ? 'text-yellow-600 border-yellow-600' : ''}`}
                        >
                          <Bookmark className={`w-4 h-4 ${permit.isWatched ? 'fill-current' : ''}`} />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedPermit(permit)}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          Details
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 text-sm">
                      <div className="flex items-center space-x-2 text-gray-600">
                        <MapPin className="w-4 h-4" />
                        <span>{permit.address.street}, {permit.address.city}</span>
                      </div>
                      <div className="flex items-center space-x-2 text-gray-600">
                        <DollarSign className="w-4 h-4" />
                        <span>{formatCurrency(permit.valuation)}</span>
                      </div>
                      <div className="flex items-center space-x-2 text-gray-600">
                        <Calendar className="w-4 h-4" />
                        <span>{new Date(permit.issued_date).toLocaleDateString()}</span>
                      </div>
                    </div>

                    {permit.claudeAnalysis && (
                      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 border border-blue-200">
                        <div className="flex items-center space-x-2 mb-3">
                          <Sparkles className="w-4 h-4 text-blue-600" />
                          <span className="text-sm font-medium text-blue-900">AI Analysis</span>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                          <div>
                            <div className="text-xs text-gray-600 mb-1">Complexity</div>
                            <span className={`px-2 py-1 text-xs rounded-full ${getComplexityColor(permit.claudeAnalysis.projectComplexity)}`}>
                              {permit.claudeAnalysis.projectComplexity}
                            </span>
                          </div>
                          <div>
                            <div className="text-xs text-gray-600 mb-1">Competition</div>
                            <span className={`px-2 py-1 text-xs rounded-full ${getComplexityColor(permit.claudeAnalysis.competitionLevel)}`}>
                              {permit.claudeAnalysis.competitionLevel}
                            </span>
                          </div>
                          <div>
                            <div className="text-xs text-gray-600 mb-1">Timeline</div>
                            <span className="text-sm font-medium text-gray-900">
                              ~{permit.claudeAnalysis.timelineEstimate} days
                            </span>
                          </div>
                        </div>

                        {permit.claudeAnalysis.recommendations.length > 0 && (
                          <div>
                            <div className="text-xs text-gray-600 mb-2">AI Recommendations</div>
                            <div className="flex flex-wrap gap-2">
                              {permit.claudeAnalysis.recommendations.slice(0, 2).map((rec, index) => (
                                <span key={index} className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                                  {rec}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="text-center py-12">
                <Search className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No permits found</h3>
                <p className="text-gray-600 mb-4">
                  Try adjusting your search criteria or check back later for new permits.
                </p>
                {!shovelsConfig.isConfigured && (
                  <Button onClick={() => router.push('/member/settings/permits')}>
                    Configure Shovels API
                  </Button>
                )}
              </div>
            )}
          </div>
        ) : (
          <Card>
            <CardContent className="p-6">
              <MapboxProjectsView
                projects={[]} // We'd need to convert permits to projects format
                permits={permits}
                showPermits={true}
                searchTerm={filters.searchTerm}
                statusFilter={filters.status}
                categoryFilter="all"
                onPermitSelect={(permit) => console.log('Selected permit:', permit)}
                className="h-96"
              />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Target,
  Search,
  Filter,
  Plus,
  Brain,
  Calendar,
  MapPin,
  DollarSign,
  Clock,
  ArrowRight,
  Building2,
  Users,
  Lightbulb,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Download,
  RefreshCw,
  Eye,
  Star,
  Tag
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/select'

interface Opportunity {
  id: string
  title: string
  description: string
  type: 'Construction' | 'Training' | 'Outreach' | 'Other'
  status: 'Active' | 'In Progress' | 'Completed' | 'Under Review'
  datePosted: string
  deadline?: string
  contactInfo?: string
  location?: string
  estimatedValue?: number
  requirements: string[]
  tags: string[]
  claudeAnalysis?: any
  opportunityScore?: number
  complexityScore?: number
  matchScore?: number
}

interface OpportunityStats {
  total: number
  active: number
  byType: Record<string, number>
  byStatus: Record<string, number>
  totalValue: number
}

const typeColors = {
  Construction: 'bg-blue-500',
  Training: 'bg-green-500',
  Outreach: 'bg-purple-500',
  Other: 'bg-gray-500'
}

const statusColors = {
  Active: 'bg-green-100 text-green-800',
  'In Progress': 'bg-yellow-100 text-yellow-800',
  Completed: 'bg-gray-100 text-gray-800',
  'Under Review': 'bg-blue-100 text-blue-800'
}

export default function ProjectOpportunitiesPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [opportunities, setOpportunities] = useState<Opportunity[]>([])
  const [stats, setStats] = useState<OpportunityStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [importing, setImporting] = useState(false)
  const [analyzing, setAnalyzing] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [sortBy, setSortBy] = useState('datePosted')
  const [sortOrder, setSortOrder] = useState('desc')
  const [page, setPage] = useState(1)
  const [showImportSuccess, setShowImportSuccess] = useState(false)

  // Redirect to login if not authenticated
  useEffect(() => {
    if (status === 'loading') return // Still loading
    
    if (!session) {
      router.push('/auth/signin')
      return
    }
  }, [session, status, router])

  useEffect(() => {
    if (session && status === 'authenticated') {
      loadOpportunities()
      loadStats()
    }
  }, [session, status, searchTerm, filterType, filterStatus, sortBy, sortOrder, page])

  const loadOpportunities = async () => {
    if (!session) return
    
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        ...(searchTerm && { search: searchTerm }),
        ...(filterType !== 'all' && { type: filterType }),
        ...(filterStatus !== 'all' && { status: filterStatus }),
        sortBy,
        sortOrder
      })

      const response = await fetch(`/api/opportunities?${params}`)
      
      if (response.status === 401) {
        router.push('/auth/signin')
        return
      }
      
      const data = await response.json()

      if (data.success) {
        setOpportunities(data.data.opportunities)
        console.log('✅ Loaded opportunities:', data.data.opportunities.length)
      } else {
        console.error('❌ Failed to load opportunities:', data.error)
      }
    } catch (error) {
      console.error('Error loading opportunities:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    if (!session) return
    
    try {
      const response = await fetch('/api/opportunities/import')
      
      if (response.status === 401) {
        router.push('/auth/signin')
        return
      }
      
      const data = await response.json()

      if (data.success) {
        setStats(data.data)
        console.log('✅ Loaded stats:', data.data)
      } else {
        console.error('❌ Failed to load stats:', data.error)
      }
    } catch (error) {
      console.error('Error loading stats:', error)
    }
  }

  const importOpportunities = async () => {
    if (!session) return
    
    try {
      setImporting(true)
      const response = await fetch('/api/opportunities/import', {
        method: 'POST'
      })

      if (response.status === 401) {
        router.push('/auth/signin')
        return
      }

      const data = await response.json()

      if (data.success) {
        setShowImportSuccess(true)
        await loadOpportunities()
        await loadStats()
        
        setTimeout(() => setShowImportSuccess(false), 5000)
        console.log('✅ Successfully imported opportunities')
      } else {
        console.error('❌ Import failed:', data.error)
      }
    } catch (error) {
      console.error('Error importing opportunities:', error)
    } finally {
      setImporting(false)
    }
  }

  const analyzeOpportunity = async (opportunityId: string) => {
    if (!session) return
    
    try {
      setAnalyzing(opportunityId)
      const response = await fetch('/api/opportunities', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          opportunityId,
          action: 'analyze'
        })
      })

      if (response.status === 401) {
        router.push('/auth/signin')
        return
      }

      const data = await response.json()

      if (data.success) {
        // Update the opportunity in the list
        setOpportunities(prev => 
          prev.map(opp => 
            opp.id === opportunityId ? data.data : opp
          )
        )
        console.log('✅ Analyzed opportunity:', data.data.title)
      } else {
        console.error('❌ Failed to analyze opportunity:', data.error)
      }
    } catch (error) {
      console.error('Error analyzing opportunity:', error)
    } finally {
      setAnalyzing(null)
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 0.8) return 'text-green-600'
    if (score >= 0.6) return 'text-yellow-600'
    return 'text-red-600'
  }

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`
    }
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}K`
    }
    return `$${value.toLocaleString()}`
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  // Show loading while checking authentication
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-purple-600" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  // Redirect to login if not authenticated
  if (!session) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-8 h-8 mx-auto mb-4 text-yellow-600" />
          <p className="text-gray-600">Redirecting to login...</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading project opportunities...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-white bg-opacity-20 rounded-full">
                  <Target className="w-8 h-8" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold">Project Opportunities</h1>
                  <p className="text-purple-100 mt-1">
                    Real NAMC NorCal opportunities with AI-powered matching and analysis
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <Button
                  onClick={importOpportunities}
                  disabled={importing}
                  className="bg-white text-purple-600 hover:bg-gray-100"
                >
                  {importing ? (
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4 mr-2" />
                  )}
                  Import Latest Data
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Import Success Banner */}
      <AnimatePresence>
        {showImportSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="bg-green-500 text-white p-4"
          >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-5 h-5" />
                <span>Successfully imported project opportunities from NAMC NorCal data!</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        {stats && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
          >
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Opportunities</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                    <p className="text-xs text-blue-600">{stats.active} active</p>
                  </div>
                  <Target className="h-8 w-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Construction Projects</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.byType.Construction || 0}</p>
                    <p className="text-xs text-green-600">High value opportunities</p>
                  </div>
                  <Building2 className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Training & Events</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {(stats.byType.Training || 0) + (stats.byType.Outreach || 0)}
                    </p>
                    <p className="text-xs text-purple-600">Networking opportunities</p>
                  </div>
                  <Users className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Est. Total Value</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {stats.totalValue > 0 ? formatCurrency(stats.totalValue) : 'TBD'}
                    </p>
                    <p className="text-xs text-orange-600">Pipeline potential</p>
                  </div>
                  <DollarSign className="h-8 w-8 text-orange-600" />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Search and Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="bg-white rounded-lg shadow-sm p-6 mb-8"
        >
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search opportunities..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select
              value={filterType}
              onValueChange={setFilterType}
            >
              <option value="all">All Types</option>
              <option value="Construction">Construction</option>
              <option value="Training">Training</option>
              <option value="Outreach">Outreach</option>
              <option value="Other">Other</option>
            </Select>

            <Select
              value={filterStatus}
              onValueChange={setFilterStatus}
            >
              <option value="all">All Status</option>
              <option value="Active">Active</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
              <option value="Under Review">Under Review</option>
            </Select>

            <Select
              value={`${sortBy}-${sortOrder}`}
              onValueChange={(value) => {
                const [newSortBy, newSortOrder] = value.split('-')
                setSortBy(newSortBy)
                setSortOrder(newSortOrder)
              }}
            >
              <option value="datePosted-desc">Newest First</option>
              <option value="datePosted-asc">Oldest First</option>
              <option value="deadline-asc">Deadline Soon</option>
              <option value="estimatedValue-desc">Highest Value</option>
              <option value="opportunityScore-desc">Best Match</option>
            </Select>
          </div>
        </motion.div>

        {/* Opportunities List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="space-y-6"
        >
          {opportunities.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Target className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Opportunities Found</h3>
                <p className="text-gray-600 mb-4">
                  {stats?.total === 0 
                    ? "Import the latest NAMC NorCal opportunities to get started."
                    : "Try adjusting your search or filter criteria."
                  }
                </p>
                {stats?.total === 0 && (
                  <Button onClick={importOpportunities} disabled={importing}>
                    {importing ? (
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4 mr-2" />
                    )}
                    Import Opportunities
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            opportunities.map((opportunity, index) => (
              <motion.div
                key={opportunity.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 * index }}
              >
                <Card className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <div className={`p-2 ${typeColors[opportunity.type]} rounded-lg`}>
                            <Building2 className="w-4 h-4 text-white" />
                          </div>
                          <h3 className="text-lg font-semibold text-gray-900">
                            {opportunity.title}
                          </h3>
                          <Badge className={statusColors[opportunity.status]}>
                            {opportunity.status}
                          </Badge>
                        </div>
                        
                        <p className="text-gray-600 mb-4 line-clamp-2">
                          {opportunity.description}
                        </p>

                        {/* Metadata */}
                        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 mb-4">
                          <div className="flex items-center space-x-1">
                            <Calendar className="w-4 h-4" />
                            <span>Posted {formatDate(opportunity.datePosted)}</span>
                          </div>
                          {opportunity.deadline && (
                            <div className="flex items-center space-x-1">
                              <Clock className="w-4 h-4" />
                              <span>Due {formatDate(opportunity.deadline)}</span>
                            </div>
                          )}
                          {opportunity.location && (
                            <div className="flex items-center space-x-1">
                              <MapPin className="w-4 h-4" />
                              <span>{opportunity.location}</span>
                            </div>
                          )}
                          {opportunity.estimatedValue && (
                            <div className="flex items-center space-x-1">
                              <DollarSign className="w-4 h-4" />
                              <span>{formatCurrency(opportunity.estimatedValue)}</span>
                            </div>
                          )}
                        </div>

                        {/* Tags */}
                        {opportunity.tags.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-4">
                            {opportunity.tags.slice(0, 5).map(tag => (
                              <Badge key={tag} variant="secondary" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                            {opportunity.tags.length > 5 && (
                              <Badge variant="secondary" className="text-xs">
                                +{opportunity.tags.length - 5} more
                              </Badge>
                            )}
                          </div>
                        )}

                        {/* Requirements */}
                        {opportunity.requirements.length > 0 && (
                          <div className="mb-4">
                            <h4 className="text-sm font-medium text-gray-700 mb-2">Requirements:</h4>
                            <ul className="text-sm text-gray-600 space-y-1">
                              {opportunity.requirements.slice(0, 3).map((req, idx) => (
                                <li key={idx} className="flex items-start space-x-2">
                                  <CheckCircle className="w-3 h-3 text-green-500 mt-0.5 flex-shrink-0" />
                                  <span>{req}</span>
                                </li>
                              ))}
                              {opportunity.requirements.length > 3 && (
                                <li className="text-xs text-gray-500">
                                  +{opportunity.requirements.length - 3} more requirements
                                </li>
                              )}
                            </ul>
                          </div>
                        )}
                      </div>

                      {/* AI Analysis Panel */}
                      <div className="ml-6 flex-shrink-0 w-64">
                        {opportunity.claudeAnalysis ? (
                          <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg p-4">
                            <div className="flex items-center space-x-2 mb-3">
                              <Brain className="w-5 h-5 text-purple-600" />
                              <span className="font-medium text-purple-800">AI Analysis</span>
                            </div>
                            
                            {opportunity.opportunityScore && (
                              <div className="mb-2">
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-gray-600">Match Score</span>
                                  <span className={`font-semibold ${getScoreColor(opportunity.opportunityScore)}`}>
                                    {Math.round(opportunity.opportunityScore * 100)}%
                                  </span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                                  <div 
                                    className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full"
                                    style={{ width: `${opportunity.opportunityScore * 100}%` }}
                                  />
                                </div>
                              </div>
                            )}

                            {opportunity.complexityScore && (
                              <div className="mb-3">
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-gray-600">Complexity</span>
                                  <span className="text-gray-800">
                                    {opportunity.complexityScore > 0.7 ? 'High' : 
                                     opportunity.complexityScore > 0.4 ? 'Medium' : 'Low'}
                                  </span>
                                </div>
                              </div>
                            )}

                            <Button
                              size="sm"
                              variant="outline"
                              className="w-full text-purple-600 border-purple-200 hover:bg-purple-50"
                            >
                              <Eye className="w-4 h-4 mr-2" />
                              View Analysis
                            </Button>
                          </div>
                        ) : (
                          <div className="bg-gray-50 rounded-lg p-4 text-center">
                            <Brain className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                            <p className="text-sm text-gray-600 mb-3">Get AI insights for this opportunity</p>
                            <Button
                              size="sm"
                              onClick={() => analyzeOpportunity(opportunity.id)}
                              disabled={analyzing === opportunity.id}
                              className="w-full"
                            >
                              {analyzing === opportunity.id ? (
                                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                              ) : (
                                <Lightbulb className="w-4 h-4 mr-2" />
                              )}
                              Analyze with AI
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action Footer */}
                    <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                      <div className="flex items-center space-x-4">
                        {opportunity.contactInfo && opportunity.contactInfo !== 'Not specified' && (
                          <span className="text-sm text-gray-600">
                            Contact: {opportunity.contactInfo}
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Button variant="outline" size="sm">
                          <Star className="w-4 h-4 mr-2" />
                          Save
                        </Button>
                        <Button size="sm">
                          <ArrowRight className="w-4 h-4 mr-2" />
                          View Details
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))
          )}
        </motion.div>
      </div>
    </div>
  )
}

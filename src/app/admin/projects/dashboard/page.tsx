'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { useSession } from 'next-auth/react'
import ErrorBoundary from '@/components/ui/ErrorBoundary'
import { DashboardSkeleton } from '@/components/ui/LoadingSkeleton'
import SkipNavigation from '@/components/ui/SkipNavigation'
import MobileNavigation from '@/components/ui/MobileNavigation'
import { 
  BarChart3, 
  Users, 
  Eye,
  Download,
  MessageSquare,
  DollarSign,
  Calendar,
  TrendingUp,
  TrendingDown,
  Activity,
  Target,
  Clock,
  CheckCircle,
  AlertTriangle,
  Filter,
  Search,
  ExternalLink,
  FileText,
  MapPin,
  Building,
  X
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import Button from '@/components/ui/Button'

// Types for dashboard data
interface ProjectMetrics {
  id: string
  title: string
  client: string
  status: 'draft' | 'active' | 'closed' | 'cancelled'
  budgetRange: string
  location: string
  deadline: string
  engagementMetrics: {
    totalViews: number
    uniqueViewers: number
    totalDownloads: number
    totalInquiries: number
    avgEngagementScore: number
    highEngagementMembers: number
    mediumEngagementMembers: number
    lowEngagementMembers: number
    conversionRate: number
  }
  topEngagedMembers: Array<{
    userId: string
    name: string
    company: string
    engagementScore: number
  }>
  trendsData: Array<{
    date: string
    views: number
    avgScore: number
  }>
}

interface DashboardStats {
  totalProjects: number
  activeProjects: number
  totalMembers: number
  avgEngagementScore: number
  totalViews: number
  totalDownloads: number
  totalInquiries: number
  conversionRate: number
  topPerformingProjects: ProjectMetrics[]
  recentActivity: Array<{
    id: string
    type: 'view' | 'download' | 'inquiry' | 'interest'
    projectTitle: string
    memberName: string
    timestamp: string
  }>
}

export default function ProjectDashboard() {
  const { data: session } = useSession()
  const [dashboardData, setDashboardData] = useState<DashboardStats | null>(null)
  const [selectedProject, setSelectedProject] = useState<ProjectMetrics | null>(null)
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d')
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [error, setError] = useState<string | null>(null)
  const [isOnline, setIsOnline] = useState(true)

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

  // Mock data - in production, this would come from API
  const mockDashboardData: DashboardStats = {
    totalProjects: 24,
    activeProjects: 18,
    totalMembers: 156,
    avgEngagementScore: 67.5,
    totalViews: 3247,
    totalDownloads: 892,
    totalInquiries: 143,
    conversionRate: 18.2,
    topPerformingProjects: [
      {
        id: '1',
        title: 'Downtown Office Complex Renovation',
        client: 'Oakland Development Corp',
        status: 'active',
        budgetRange: '$2M - $2.5M',
        location: 'Oakland, CA',
        deadline: '2025-09-15',
        engagementMetrics: {
          totalViews: 847,
          uniqueViewers: 89,
          totalDownloads: 234,
          totalInquiries: 28,
          avgEngagementScore: 78.3,
          highEngagementMembers: 23,
          mediumEngagementMembers: 45,
          lowEngagementMembers: 21,
          conversionRate: 24.7
        },
        topEngagedMembers: [
          { userId: '1', name: 'Sarah Chen', company: 'Chen Construction', engagementScore: 95 },
          { userId: '2', name: 'Marcus Rivera', company: 'Rivera Builders', engagementScore: 92 },
          { userId: '3', name: 'Jennifer Adams', company: 'Adams Contracting', engagementScore: 88 }
        ],
        trendsData: [
          { date: '2025-07-01', views: 45, avgScore: 72 },
          { date: '2025-07-02', views: 52, avgScore: 74 },
          { date: '2025-07-03', views: 38, avgScore: 76 },
          { date: '2025-07-04', views: 61, avgScore: 78 },
          { date: '2025-07-05', views: 48, avgScore: 80 }
        ]
      },
      {
        id: '2',
        title: 'Sustainable Housing Development',
        client: 'Green Valley Communities',
        status: 'active',
        budgetRange: '$5M - $7M',
        location: 'San Francisco, CA',
        deadline: '2025-10-30',
        engagementMetrics: {
          totalViews: 623,
          uniqueViewers: 67,
          totalDownloads: 178,
          totalInquiries: 19,
          avgEngagementScore: 71.8,
          highEngagementMembers: 18,
          mediumEngagementMembers: 34,
          lowEngagementMembers: 15,
          conversionRate: 19.4
        },
        topEngagedMembers: [
          { userId: '4', name: 'David Kim', company: 'Eco Build Solutions', engagementScore: 91 },
          { userId: '5', name: 'Lisa Torres', company: 'Torres Engineering', engagementScore: 87 },
          { userId: '6', name: 'Robert Chang', company: 'Chang Development', engagementScore: 84 }
        ],
        trendsData: [
          { date: '2025-07-01', views: 35, avgScore: 68 },
          { date: '2025-07-02', views: 42, avgScore: 70 },
          { date: '2025-07-03', views: 48, avgScore: 72 },
          { date: '2025-07-04', views: 39, avgScore: 73 },
          { date: '2025-07-05', views: 44, avgScore: 75 }
        ]
      }
    ],
    recentActivity: [
      {
        id: '1',
        type: 'inquiry',
        projectTitle: 'Downtown Office Complex Renovation',
        memberName: 'Sarah Chen',
        timestamp: '2 minutes ago'
      },
      {
        id: '2',
        type: 'download',
        projectTitle: 'Sustainable Housing Development',
        memberName: 'David Kim',
        timestamp: '15 minutes ago'
      },
      {
        id: '3',
        type: 'view',
        projectTitle: 'Municipal Bridge Repair',
        memberName: 'Jennifer Adams',
        timestamp: '28 minutes ago'
      },
      {
        id: '4',
        type: 'interest',
        projectTitle: 'Downtown Office Complex Renovation',
        memberName: 'Marcus Rivera',
        timestamp: '1 hour ago'
      }
    ]
  }

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true)
        setError(null)
        
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        if (!isOnline) {
          throw new Error('No internet connection. Please check your network.')
        }
        
        setDashboardData(mockDashboardData)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load dashboard data')
      } finally {
        setLoading(false)
      }
    }

    loadDashboardData()
  }, [timeRange, isOnline])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-100'
      case 'draft': return 'text-yellow-600 bg-yellow-100'
      case 'closed': return 'text-gray-600 bg-gray-100'
      case 'cancelled': return 'text-red-600 bg-red-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'view': return <Eye className="h-4 w-4" />
      case 'download': return <Download className="h-4 w-4" />
      case 'inquiry': return <MessageSquare className="h-4 w-4" />
      case 'interest': return <Activity className="h-4 w-4" />
      default: return <Activity className="h-4 w-4" />
    }
  }

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'view': return 'text-blue-600'
      case 'download': return 'text-green-600'
      case 'inquiry': return 'text-purple-600'
      case 'interest': return 'text-orange-600'
      default: return 'text-gray-600'
    }
  }

  const formatCurrency = (amount: string) => {
    return amount
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
              <h2 className="text-lg font-semibold text-red-900 mb-2">Error Loading Dashboard</h2>
              <p className="text-red-700 mb-4">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      </ErrorBoundary>
    )
  }

  if (!dashboardData) return null

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
              <p className="text-sm text-yellow-700 mt-1">You're currently offline. Some features may not work properly.</p>
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
              Project Opportunities Dashboard
            </h1>
            <p className="text-gray-600">
              Monitor project performance, member engagement, and conversion metrics
            </p>
          </div>
          
          <div className="flex items-center space-x-4">
            <label htmlFor="time-range" className="sr-only">Select time range</label>
            <select
              id="time-range"
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as any)}
              className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-namc-gold min-h-[44px]"
              aria-label="Select time range for dashboard data"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="1y">Last year</option>
            </select>
            
            <Button 
              className="bg-namc-gold text-white hover:bg-namc-gold/90 min-h-[44px]"
              aria-label="Export dashboard report"
            >
              <Download className="h-4 w-4 mr-2" aria-hidden="true" />
              Export Report
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[
          {
            title: 'Total Projects',
            value: dashboardData.totalProjects,
            change: '+12%',
            changeType: 'positive',
            icon: FileText,
            color: 'text-blue-600',
            bgColor: 'bg-blue-100'
          },
          {
            title: 'Active Projects',
            value: dashboardData.activeProjects,
            change: '+8%',
            changeType: 'positive',
            icon: CheckCircle,
            color: 'text-green-600',
            bgColor: 'bg-green-100'
          },
          {
            title: 'Total Views',
            value: dashboardData.totalViews,
            change: '+24%',
            changeType: 'positive',
            icon: Eye,
            color: 'text-purple-600',
            bgColor: 'bg-purple-100'
          },
          {
            title: 'Conversion Rate',
            value: `${dashboardData.conversionRate}%`,
            change: '+3.2%',
            changeType: 'positive',
            icon: Target,
            color: 'text-orange-600',
            bgColor: 'bg-orange-100'
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
                    <p className="text-3xl font-bold text-gray-900 mb-2">{stat.value}</p>
                    <div className="flex items-center">
                      <TrendingUp 
                        className={`mr-1 ${stat.changeType === 'positive' ? 'text-green-500' : 'text-red-500'}`} 
                        size={16} 
                      />
                      <span 
                        className={`text-sm font-medium ${
                          stat.changeType === 'positive' ? 'text-green-600' : 'text-red-600'
                        }`}
                      >
                        {stat.change} from last period
                      </span>
                    </div>
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

      <div className="grid lg:grid-cols-3 gap-8 mb-8">
        {/* Top Performing Projects */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="lg:col-span-2"
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center">
                  <BarChart3 className="mr-2" />
                  Top Performing Projects
                </div>
                <div className="flex items-center space-x-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <label htmlFor="project-search" className="sr-only">Search projects</label>
                    <input
                      id="project-search"
                      type="text"
                      placeholder="Search projects..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-namc-gold text-sm min-h-[44px]"
                      aria-label="Search projects by title"
                    />
                  </div>
                  <label htmlFor="status-filter" className="sr-only">Filter by project status</label>
                  <select
                    id="status-filter"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-namc-gold text-sm min-h-[44px]"
                    aria-label="Filter projects by status"
                  >
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="draft">Draft</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {dashboardData.topPerformingProjects
                  .filter(project => 
                    (statusFilter === 'all' || project.status === statusFilter) &&
                    project.title.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
                  )
                  .map((project) => (
                  <div key={project.id} className="border border-gray-200 rounded-lg p-4 hover:border-namc-gold transition-colors">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h4 className="font-semibold text-gray-900">{project.title}</h4>
                          <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(project.status)}`}>
                            {project.status.charAt(0).toUpperCase() + project.status.slice(1)}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600 mb-3">
                          <div className="flex items-center">
                            <Building className="h-4 w-4 mr-1" />
                            {project.client}
                          </div>
                          <div className="flex items-center">
                            <DollarSign className="h-4 w-4 mr-1" />
                            {project.budgetRange}
                          </div>
                          <div className="flex items-center">
                            <Calendar className="h-4 w-4 mr-1" />
                            {new Date(project.deadline).toLocaleDateString()}
                          </div>
                          <div className="flex items-center">
                            <MapPin className="h-4 w-4 mr-1" />
                            {project.location}
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedProject(project)}
                        className="min-h-[44px]"
                        aria-label={`View details for ${project.title}`}
                      >
                        <Eye className="h-4 w-4 mr-1" aria-hidden="true" />
                        View Details
                      </Button>
                    </div>
                    
                    {/* Engagement Metrics */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                      <div className="text-center">
                        <div className="text-lg font-semibold text-blue-600">
                          {project.engagementMetrics.totalViews}
                        </div>
                        <div className="text-gray-600">Views</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-semibold text-green-600">
                          {project.engagementMetrics.uniqueViewers}
                        </div>
                        <div className="text-gray-600">Members</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-semibold text-purple-600">
                          {project.engagementMetrics.totalDownloads}
                        </div>
                        <div className="text-gray-600">Downloads</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-semibold text-orange-600">
                          {project.engagementMetrics.totalInquiries}
                        </div>
                        <div className="text-gray-600">Inquiries</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-semibold text-namc-gold">
                          {project.engagementMetrics.avgEngagementScore.toFixed(1)}
                        </div>
                        <div className="text-gray-600">Avg Score</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Activity className="mr-2" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {dashboardData.recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-start space-x-3 p-3 rounded-lg bg-gray-50">
                    <div className={`p-1 rounded ${getActivityColor(activity.type)}`}>
                      {getActivityIcon(activity.type)}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm">
                        <span className="font-medium">{activity.memberName}</span>
                        <span className="text-gray-600"> {activity.type}ed </span>
                        <span className="font-medium">{activity.projectTitle}</span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">{activity.timestamp}</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Project Detail Modal */}
      {selectedProject && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2 }}
            className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="p-6 border-b">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    {selectedProject.title}
                  </h2>
                  <p className="text-gray-600">{selectedProject.client}</p>
                </div>
                <button
                  onClick={() => setSelectedProject(null)}
                  className="text-gray-400 hover:text-gray-600 min-h-[44px] min-w-[44px] flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-namc-gold focus:ring-offset-2 rounded-md"
                  aria-label="Close project details modal"
                >
                  <X className="h-6 w-6" aria-hidden="true" />
                </button>
              </div>
            </div>

            <div className="p-6">
              {/* Engagement Overview */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {selectedProject.engagementMetrics.totalViews}
                  </div>
                  <div className="text-sm text-gray-600">Total Views</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {selectedProject.engagementMetrics.uniqueViewers}
                  </div>
                  <div className="text-sm text-gray-600">Unique Viewers</div>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">
                    {selectedProject.engagementMetrics.avgEngagementScore.toFixed(1)}
                  </div>
                  <div className="text-sm text-gray-600">Avg Engagement</div>
                </div>
                <div className="text-center p-4 bg-orange-50 rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">
                    {selectedProject.engagementMetrics.conversionRate.toFixed(1)}%
                  </div>
                  <div className="text-sm text-gray-600">Conversion Rate</div>
                </div>
              </div>

              {/* Top Engaged Members */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold mb-4">Top Engaged Members</h3>
                <div className="space-y-3">
                  {selectedProject.topEngagedMembers.map((member, index) => (
                    <div key={member.userId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-namc-gold text-white rounded-full flex items-center justify-center text-sm font-medium">
                          {index + 1}
                        </div>
                        <div>
                          <div className="font-medium">{member.name}</div>
                          <div className="text-sm text-gray-600">{member.company}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-namc-gold">{member.engagementScore}</div>
                        <div className="text-xs text-gray-600">Engagement Score</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3">
                <Button 
                  variant="outline"
                  className="min-h-[44px]"
                  aria-label={`View full project details for ${selectedProject.title}`}
                >
                  <ExternalLink className="h-4 w-4 mr-2" aria-hidden="true" />
                  View Project
                </Button>
                <Button 
                  variant="outline"
                  className="min-h-[44px]"
                  aria-label={`Export engagement data for ${selectedProject.title}`}
                >
                  <Download className="h-4 w-4 mr-2" aria-hidden="true" />
                  Export Data
                </Button>
                <Button 
                  className="bg-namc-gold text-white hover:bg-namc-gold/90 min-h-[44px]"
                  aria-label={`Contact engaged members for ${selectedProject.title}`}
                >
                  <MessageSquare className="h-4 w-4 mr-2" aria-hidden="true" />
                  Contact Members
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
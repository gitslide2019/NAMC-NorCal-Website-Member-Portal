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
  Users, 
  TrendingUp,
  TrendingDown,
  Activity,
  Eye,
  Download,
  MessageSquare,
  Clock,
  Calendar,
  BarChart3,
  PieChart,
  Filter,
  Search,
  UserCheck,
  UserX,
  Star,
  AlertTriangle,
  ExternalLink,
  Mail,
  Phone,
  Building,
  MapPin,
  Award,
  Target,
  Zap,
  X
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import Button from '@/components/ui/Button'

// Types for member engagement data
interface MemberEngagement {
  id: string
  name: string
  email: string
  company: string
  memberType: 'REGULAR' | 'PREMIUM' | 'EXECUTIVE'
  joinDate: string
  location: string
  phone?: string
  engagementMetrics: {
    totalViews: number
    uniqueProjectsViewed: number
    totalDownloads: number
    totalInquiries: number
    avgEngagementScore: number
    lastActiveDate: string
    activityStreak: number
    preferredCategories: string[]
    responseRate: number
    networkingScore: number
  }
  engagementTrend: 'increasing' | 'decreasing' | 'stable'
  riskLevel: 'low' | 'medium' | 'high'
  recentActivity: Array<{
    id: string
    type: 'view' | 'download' | 'inquiry' | 'interest' | 'login'
    projectTitle?: string
    timestamp: string
    duration?: number
  }>
  projects: Array<{
    id: string
    title: string
    engagementScore: number
    interactions: number
    lastInteraction: string
  }>
}

interface EngagementAnalytics {
  totalMembers: number
  activeMembers: number
  atRiskMembers: number
  avgEngagementScore: number
  engagementDistribution: {
    high: number
    medium: number
    low: number
    inactive: number
  }
  topEngagedMembers: MemberEngagement[]
  atRiskMembers: MemberEngagement[]
  engagementTrends: Array<{
    date: string
    activeMembers: number
    avgScore: number
    newMembers: number
  }>
  categoryEngagement: Array<{
    category: string
    memberCount: number
    avgScore: number
    growth: number
  }>
}

export default function MemberEngagementAnalytics() {
  const { data: session } = useSession()
  const [analyticsData, setAnalyticsData] = useState<EngagementAnalytics | null>(null)
  const [selectedMember, setSelectedMember] = useState<MemberEngagement | null>(null)
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isOnline, setIsOnline] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [memberTypeFilter, setMemberTypeFilter] = useState<string>('all')
  const [riskFilter, setRiskFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<string>('engagement')

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
  const mockMemberEngagement: MemberEngagement[] = [
    {
      id: '1',
      name: 'Sarah Chen',
      email: 'sarah.chen@chenconstructors.com',
      company: 'Chen Construction',
      memberType: 'PREMIUM',
      joinDate: '2024-01-15',
      location: 'Oakland, CA',
      phone: '(510) 555-0123',
      engagementMetrics: {
        totalViews: 247,
        uniqueProjectsViewed: 18,
        totalDownloads: 45,
        totalInquiries: 12,
        avgEngagementScore: 92,
        lastActiveDate: '2025-07-30',
        activityStreak: 15,
        preferredCategories: ['Commercial', 'Sustainable'],
        responseRate: 85,
        networkingScore: 78
      },
      engagementTrend: 'increasing',
      riskLevel: 'low',
      recentActivity: [
        { id: '1', type: 'view', projectTitle: 'Downtown Office Complex', timestamp: '2 hours ago', duration: 180 },
        { id: '2', type: 'download', projectTitle: 'Sustainable Housing Development', timestamp: '1 day ago' },
        { id: '3', type: 'inquiry', projectTitle: 'Municipal Bridge Repair', timestamp: '2 days ago' }
      ],
      projects: [
        { id: '1', title: 'Downtown Office Complex', engagementScore: 95, interactions: 8, lastInteraction: '2 hours ago' },
        { id: '2', title: 'Sustainable Housing Development', engagementScore: 88, interactions: 5, lastInteraction: '1 day ago' }
      ]
    },
    {
      id: '2',
      name: 'Marcus Rivera',
      email: 'marcus@riverabuilders.com',
      company: 'Rivera Builders',
      memberType: 'EXECUTIVE',
      joinDate: '2023-08-22',
      location: 'San Francisco, CA',
      phone: '(415) 555-0456',
      engagementMetrics: {
        totalViews: 198,
        uniqueProjectsViewed: 24,
        totalDownloads: 38,
        totalInquiries: 15,
        avgEngagementScore: 89,
        lastActiveDate: '2025-07-29',
        activityStreak: 8,
        preferredCategories: ['Infrastructure', 'Commercial'],
        responseRate: 92,
        networkingScore: 85
      },
      engagementTrend: 'stable',
      riskLevel: 'low',
      recentActivity: [
        { id: '4', type: 'interest', projectTitle: 'Highway Expansion', timestamp: '4 hours ago' },
        { id: '5', type: 'view', projectTitle: 'School Modernization', timestamp: '1 day ago', duration: 145 }
      ],
      projects: [
        { id: '3', title: 'Highway Expansion', engagementScore: 91, interactions: 12, lastInteraction: '4 hours ago' }
      ]
    },
    {
      id: '3',
      name: 'Jennifer Adams',
      email: 'jadams@adamscontracting.com',
      company: 'Adams Contracting',
      memberType: 'REGULAR',
      joinDate: '2024-03-10',
      location: 'Sacramento, CA',
      engagementMetrics: {
        totalViews: 89,
        uniqueProjectsViewed: 12,
        totalDownloads: 15,
        totalInquiries: 3,
        avgEngagementScore: 58,
        lastActiveDate: '2025-07-25',
        activityStreak: 0,
        preferredCategories: ['Residential'],
        responseRate: 67,
        networkingScore: 45
      },
      engagementTrend: 'decreasing',
      riskLevel: 'medium',
      recentActivity: [
        { id: '6', type: 'login', timestamp: '5 days ago' },
        { id: '7', type: 'view', projectTitle: 'Residential Complex', timestamp: '1 week ago', duration: 62 }
      ],
      projects: [
        { id: '4', title: 'Residential Complex', engagementScore: 61, interactions: 3, lastInteraction: '1 week ago' }
      ]
    },
    {
      id: '4',
      name: 'David Kim',
      email: 'dkim@ecobuild.com',
      company: 'Eco Build Solutions',
      memberType: 'PREMIUM',
      joinDate: '2023-11-05',
      location: 'San Jose, CA',
      engagementMetrics: {
        totalViews: 35,
        uniqueProjectsViewed: 5,
        totalDownloads: 8,
        totalInquiries: 1,
        avgEngagementScore: 28,
        lastActiveDate: '2025-07-10',
        activityStreak: 0,
        preferredCategories: ['Sustainable'],
        responseRate: 33,
        networkingScore: 22
      },
      engagementTrend: 'decreasing',
      riskLevel: 'high',
      recentActivity: [
        { id: '8', type: 'login', timestamp: '20 days ago' }
      ],
      projects: []
    }
  ]

  const mockAnalyticsData: EngagementAnalytics = {
    totalMembers: 156,
    activeMembers: 89,
    atRiskMembers: 23,
    avgEngagementScore: 67.2,
    engagementDistribution: {
      high: 34,
      medium: 55,
      low: 44,
      inactive: 23
    },
    topEngagedMembers: mockMemberEngagement.slice(0, 2),
    atRiskMembers: mockMemberEngagement.slice(2),
    engagementTrends: [
      { date: '2025-07-01', activeMembers: 82, avgScore: 65.2, newMembers: 3 },
      { date: '2025-07-08', activeMembers: 85, avgScore: 66.1, newMembers: 5 },
      { date: '2025-07-15', activeMembers: 87, avgScore: 66.8, newMembers: 2 },
      { date: '2025-07-22', activeMembers: 89, avgScore: 67.2, newMembers: 4 },
      { date: '2025-07-29', activeMembers: 89, avgScore: 67.2, newMembers: 1 }
    ],
    categoryEngagement: [
      { category: 'Commercial', memberCount: 45, avgScore: 72.5, growth: 8.2 },
      { category: 'Infrastructure', memberCount: 38, avgScore: 69.8, growth: 5.1 },
      { category: 'Residential', memberCount: 42, avgScore: 63.2, growth: -2.3 },
      { category: 'Sustainable', memberCount: 31, avgScore: 71.9, growth: 12.4 }
    ]
  }

  useEffect(() => {
    const loadAnalyticsData = async () => {
      try {
        setLoading(true)
        setError(null)
        
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1200))
        
        if (!isOnline) {
          throw new Error('No internet connection. Please check your network.')
        }
        
        setAnalyticsData(mockAnalyticsData)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load analytics data')
      } finally {
        setLoading(false)
      }
    }

    loadAnalyticsData()
  }, [timeRange, isOnline])

  const getEngagementColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-100'
    if (score >= 60) return 'text-yellow-600 bg-yellow-100'
    if (score >= 40) return 'text-orange-600 bg-orange-100'
    return 'text-red-600 bg-red-100'
  }

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low': return 'text-green-600 bg-green-100'
      case 'medium': return 'text-yellow-600 bg-yellow-100'
      case 'high': return 'text-red-600 bg-red-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'increasing': return <TrendingUp className="h-4 w-4 text-green-600" />
      case 'decreasing': return <TrendingDown className="h-4 w-4 text-red-600" />
      case 'stable': return <Activity className="h-4 w-4 text-blue-600" />
      default: return <Activity className="h-4 w-4 text-gray-600" />
    }
  }

  const getMemberTypeColor = (type: string) => {
    switch (type) {
      case 'EXECUTIVE': return 'text-purple-600 bg-purple-100'
      case 'PREMIUM': return 'text-blue-600 bg-blue-100'
      case 'REGULAR': return 'text-gray-600 bg-gray-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getFilteredMembers = () => {
    if (!analyticsData) return []
    
    const allMembers = [...analyticsData.topEngagedMembers, ...analyticsData.atRiskMembers]
    
    return allMembers
      .filter(member => {
        const matchesSearch = member.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
                             member.company.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
                             member.email.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
        const matchesType = memberTypeFilter === 'all' || member.memberType === memberTypeFilter
        const matchesRisk = riskFilter === 'all' || member.riskLevel === riskFilter
        
        return matchesSearch && matchesType && matchesRisk
      })
      .sort((a, b) => {
        switch (sortBy) {
          case 'engagement':
            return b.engagementMetrics.avgEngagementScore - a.engagementMetrics.avgEngagementScore
          case 'activity':
            return new Date(b.engagementMetrics.lastActiveDate).getTime() - new Date(a.engagementMetrics.lastActiveDate).getTime()
          case 'name':
            return a.name.localeCompare(b.name)
          case 'company':
            return a.company.localeCompare(b.company)
          default:
            return 0
        }
      })
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
              <h2 className="text-lg font-semibold text-red-900 mb-2">Error Loading Analytics</h2>
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

  if (!analyticsData) return null

  const filteredMembers = getFilteredMembers()

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
                Member Engagement Analytics
              </h1>
              <p className="text-gray-600">
                Monitor member activity, engagement patterns, and identify members at risk
              </p>
            </div>
            
            <div className="flex items-center space-x-4">
              <label htmlFor="time-range-engagement" className="sr-only">Select time range</label>
              <select
                id="time-range-engagement"
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value as any)}
                className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-namc-gold min-h-[44px]"
                aria-label="Select time range for engagement analytics"
              >
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="90d">Last 90 days</option>
                <option value="1y">Last year</option>
              </select>
              
              <Button 
                className="bg-namc-gold text-white hover:bg-namc-gold/90 min-h-[44px]"
                aria-label="Export engagement analytics report"
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
              title: 'Total Members',
              value: analyticsData.totalMembers,
              change: '+5',
              changeType: 'positive',
              icon: Users,
              color: 'text-blue-600',
              bgColor: 'bg-blue-100'
            },
            {
              title: 'Active Members',
              value: analyticsData.activeMembers,
              change: '+12',
              changeType: 'positive',
              icon: UserCheck,
              color: 'text-green-600',
              bgColor: 'bg-green-100'
            },
            {
              title: 'At Risk Members',
              value: analyticsData.atRiskMembers,
              change: '-3',
              changeType: 'positive',
              icon: UserX,
              color: 'text-red-600',
              bgColor: 'bg-red-100'
            },
            {
              title: 'Avg Engagement',
              value: `${analyticsData.avgEngagementScore.toFixed(1)}`,
              change: '+2.1',
              changeType: 'positive',
              icon: Target,
              color: 'text-purple-600',
              bgColor: 'bg-purple-100'
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
          {/* Member List */}
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
                    <Users className="mr-2" />
                    Member Engagement Overview
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <label htmlFor="member-search" className="sr-only">Search members</label>
                      <input
                        id="member-search"
                        type="text"
                        placeholder="Search members..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-namc-gold text-sm min-h-[44px]"
                        aria-label="Search members by name, company, or email"
                      />
                    </div>
                    <label htmlFor="member-type-filter" className="sr-only">Filter by member type</label>
                    <select
                      id="member-type-filter"
                      value={memberTypeFilter}
                      onChange={(e) => setMemberTypeFilter(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-namc-gold text-sm min-h-[44px]"
                      aria-label="Filter members by membership type"
                    >
                      <option value="all">All Types</option>
                      <option value="REGULAR">Regular</option>
                      <option value="PREMIUM">Premium</option>
                      <option value="EXECUTIVE">Executive</option>
                    </select>
                    <label htmlFor="risk-filter" className="sr-only">Filter by risk level</label>
                    <select
                      id="risk-filter"
                      value={riskFilter}
                      onChange={(e) => setRiskFilter(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-namc-gold text-sm min-h-[44px]"
                      aria-label="Filter members by risk level"
                    >
                      <option value="all">All Risk Levels</option>
                      <option value="low">Low Risk</option>
                      <option value="medium">Medium Risk</option>
                      <option value="high">High Risk</option>
                    </select>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-4 flex items-center space-x-4">
                  <label htmlFor="sort-by" className="text-sm font-medium text-gray-700">Sort by:</label>
                  <select
                    id="sort-by"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-namc-gold text-sm min-h-[44px]"
                    aria-label="Sort members by criteria"
                  >
                    <option value="engagement">Engagement Score</option>
                    <option value="activity">Last Activity</option>
                    <option value="name">Name</option>
                    <option value="company">Company</option>
                  </select>
                </div>

                <div className="h-96">
                  <VirtualizedList
                    items={filteredMembers}
                    itemHeight={120}
                    renderItem={(member: MemberEngagement, index: number) => (
                      <div className="border border-gray-200 rounded-lg p-4 mb-2 hover:border-namc-gold transition-colors">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <h4 className="font-semibold text-gray-900">{member.name}</h4>
                              <span className={`px-2 py-1 text-xs rounded-full ${getMemberTypeColor(member.memberType)}`}>
                                {member.memberType}
                              </span>
                              <span className={`px-2 py-1 text-xs rounded-full ${getRiskColor(member.riskLevel)}`}>
                                {member.riskLevel} risk
                              </span>
                              {getTrendIcon(member.engagementTrend)}
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-sm text-gray-600 mb-2">
                              <div className="flex items-center">
                                <Building className="h-3 w-3 mr-1" />
                                {member.company}
                              </div>
                              <div className="flex items-center">
                                <MapPin className="h-3 w-3 mr-1" />
                                {member.location}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className={`text-lg font-bold ${getEngagementColor(member.engagementMetrics.avgEngagementScore).split(' ')[0]}`}>
                              {member.engagementMetrics.avgEngagementScore}
                            </div>
                            <div className="text-xs text-gray-600">Engagement</div>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-4 gap-4 text-xs">
                          <div className="text-center">
                            <div className="font-semibold text-blue-600">{member.engagementMetrics.totalViews}</div>
                            <div className="text-gray-600">Views</div>
                          </div>
                          <div className="text-center">
                            <div className="font-semibold text-green-600">{member.engagementMetrics.totalDownloads}</div>
                            <div className="text-gray-600">Downloads</div>
                          </div>
                          <div className="text-center">
                            <div className="font-semibold text-purple-600">{member.engagementMetrics.totalInquiries}</div>
                            <div className="text-gray-600">Inquiries</div>
                          </div>
                          <div className="text-center">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedMember(member)}
                              className="min-h-[36px] text-xs"
                              aria-label={`View detailed analytics for ${member.name}`}
                            >
                              Details
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Engagement Distribution */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
          >
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <PieChart className="mr-2" />
                  Engagement Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { level: 'High (80+)', count: analyticsData.engagementDistribution.high, color: 'bg-green-500' },
                    { level: 'Medium (60-79)', count: analyticsData.engagementDistribution.medium, color: 'bg-yellow-500' },
                    { level: 'Low (40-59)', count: analyticsData.engagementDistribution.low, color: 'bg-orange-500' },
                    { level: 'Inactive (<40)', count: analyticsData.engagementDistribution.inactive, color: 'bg-red-500' }
                  ].map((item) => (
                    <div key={item.level} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`w-4 h-4 rounded ${item.color}`}></div>
                        <span className="text-sm text-gray-700">{item.level}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-semibold">{item.count}</span>
                        <span className="text-xs text-gray-500">
                          ({((item.count / analyticsData.totalMembers) * 100).toFixed(1)}%)
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Category Engagement */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart3 className="mr-2" />
                  Category Engagement
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analyticsData.categoryEngagement.map((category) => (
                    <div key={category.category} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{category.category}</span>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-gray-600">{category.avgScore.toFixed(1)}</span>
                          <div className="flex items-center">
                            {category.growth > 0 ? (
                              <TrendingUp className="h-3 w-3 text-green-500" />
                            ) : (
                              <TrendingDown className="h-3 w-3 text-red-500" />
                            )}
                            <span className={`text-xs ${category.growth > 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {Math.abs(category.growth).toFixed(1)}%
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-namc-gold h-2 rounded-full" 
                          style={{ width: `${(category.avgScore / 100) * 100}%` }}
                        ></div>
                      </div>
                      <div className="text-xs text-gray-500">{category.memberCount} members</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Member Detail Modal */}
        {selectedMember && (
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
                      {selectedMember.name}
                    </h2>
                    <p className="text-gray-600">{selectedMember.company}</p>
                    <div className="flex items-center space-x-4 mt-2">
                      <span className={`px-2 py-1 text-xs rounded-full ${getMemberTypeColor(selectedMember.memberType)}`}>
                        {selectedMember.memberType} Member
                      </span>
                      <span className={`px-2 py-1 text-xs rounded-full ${getRiskColor(selectedMember.riskLevel)}`}>
                        {selectedMember.riskLevel} Risk
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedMember(null)}
                    className="text-gray-400 hover:text-gray-600 min-h-[44px] min-w-[44px] flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-namc-gold focus:ring-offset-2 rounded-md"
                    aria-label="Close member details modal"
                  >
                    <X className="h-6 w-6" aria-hidden="true" />
                  </button>
                </div>
              </div>

              <div className="p-6">
                {/* Contact Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Contact Information</h3>
                    <div className="space-y-3">
                      <div className="flex items-center space-x-3">
                        <Mail className="h-4 w-4 text-gray-400" />
                        <span className="text-sm">{selectedMember.email}</span>
                      </div>
                      {selectedMember.phone && (
                        <div className="flex items-center space-x-3">
                          <Phone className="h-4 w-4 text-gray-400" />
                          <span className="text-sm">{selectedMember.phone}</span>
                        </div>
                      )}
                      <div className="flex items-center space-x-3">
                        <MapPin className="h-4 w-4 text-gray-400" />
                        <span className="text-sm">{selectedMember.location}</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <span className="text-sm">Joined {new Date(selectedMember.joinDate).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold mb-4">Engagement Metrics</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-3 bg-blue-50 rounded-lg">
                        <div className="text-xl font-bold text-blue-600">{selectedMember.engagementMetrics.totalViews}</div>
                        <div className="text-xs text-gray-600">Total Views</div>
                      </div>
                      <div className="text-center p-3 bg-green-50 rounded-lg">
                        <div className="text-xl font-bold text-green-600">{selectedMember.engagementMetrics.totalDownloads}</div>
                        <div className="text-xs text-gray-600">Downloads</div>
                      </div>
                      <div className="text-center p-3 bg-purple-50 rounded-lg">
                        <div className="text-xl font-bold text-purple-600">{selectedMember.engagementMetrics.totalInquiries}</div>
                        <div className="text-xs text-gray-600">Inquiries</div>
                      </div>
                      <div className="text-center p-3 bg-namc-gold/20 rounded-lg">
                        <div className="text-xl font-bold text-namc-gold">{selectedMember.engagementMetrics.avgEngagementScore}</div>
                        <div className="text-xs text-gray-600">Engagement</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Recent Activity */}
                <div className="mb-8">
                  <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
                  <div className="space-y-3">
                    {selectedMember.recentActivity.map((activity) => (
                      <div key={activity.id} className="flex items-start space-x-3 p-3 rounded-lg bg-gray-50">
                        <div className="p-1 rounded">
                          {activity.type === 'view' && <Eye className="h-4 w-4 text-blue-600" />}
                          {activity.type === 'download' && <Download className="h-4 w-4 text-green-600" />}
                          {activity.type === 'inquiry' && <MessageSquare className="h-4 w-4 text-purple-600" />}
                          {activity.type === 'interest' && <Activity className="h-4 w-4 text-orange-600" />}
                          {activity.type === 'login' && <Activity className="h-4 w-4 text-gray-600" />}
                        </div>
                        <div className="flex-1">
                          <div className="text-sm">
                            <span className="font-medium">
                              {activity.type === 'login' ? 'Logged in' : `${activity.type}ed ${activity.projectTitle}`}
                            </span>
                            {activity.duration && (
                              <span className="text-gray-600"> • {Math.floor(activity.duration / 60)}m {activity.duration % 60}s</span>
                            )}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">{activity.timestamp}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Interested Projects */}
                {selectedMember.projects.length > 0 && (
                  <div className="mb-8">
                    <h3 className="text-lg font-semibold mb-4">Project Engagement</h3>
                    <div className="space-y-3">
                      {selectedMember.projects.map((project) => (
                        <div key={project.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div>
                            <div className="font-medium text-sm">{project.title}</div>
                            <div className="text-xs text-gray-600">{project.interactions} interactions • Last: {project.lastInteraction}</div>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold text-namc-gold">{project.engagementScore}</div>
                            <div className="text-xs text-gray-600">Score</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex justify-end space-x-3">
                  <Button 
                    variant="outline"
                    className="min-h-[44px]"
                    aria-label={`Send email to ${selectedMember.name}`}
                  >
                    <Mail className="h-4 w-4 mr-2" aria-hidden="true" />
                    Send Email
                  </Button>
                  <Button 
                    variant="outline"
                    className="min-h-[44px]"
                    aria-label={`View full profile for ${selectedMember.name}`}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" aria-hidden="true" />
                    View Profile
                  </Button>
                  <Button 
                    className="bg-namc-gold text-white hover:bg-namc-gold/90 min-h-[44px]"
                    aria-label={`Export engagement data for ${selectedMember.name}`}
                  >
                    <Download className="h-4 w-4 mr-2" aria-hidden="true" />
                    Export Data
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
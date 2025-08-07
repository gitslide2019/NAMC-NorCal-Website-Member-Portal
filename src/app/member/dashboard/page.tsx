'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { 
  TrendingUp, 
  Users, 
  FolderOpen, 
  Calendar,
  ArrowRight,
  CheckCircle,
  Clock,
  AlertCircle,
  MessageSquare,
  Wrench,
  BookOpen,
  ShoppingBag,
  Target,
  Camera,
  Calculator,
  Award,
  Building,
  DollarSign,
  Activity,
  BarChart3,
  Settings,
  Bell,
  Star,
  Zap,
  TrendingDown,
  Plus,
  Eye,
  FileText,
  MapPin,
  Briefcase
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import HubSpotDashboardWidget from '@/components/hubspot/HubSpotDashboardWidget'
import { EngagementScoreWidget, CompactEngagementScoreWidget } from '@/components/ui/EngagementScoreWidget'
import { RecommendationsWidget, HighPriorityRecommendationsWidget } from '@/components/ui/RecommendationsWidget'
import { useAutoHubSpotSync, useHubSpotActivityTracking } from '@/hooks/useAutoHubSpotSync'
import { useCrossFeatureIntegration } from '@/hooks/useCrossFeatureIntegration'

interface DashboardData {
  profile: {
    completionPercentage: number;
    missingFields: string[];
    memberSince: string;
    memberType: string;
  };
  stats: {
    projectsActive: number;
    projectsCompleted: number;
    tasksAssigned: number;
    tasksCompleted: number;
    toolsReserved: number;
    coursesInProgress: number;
    coursesCompleted: number;
    badgesEarned: number;
    messagesUnread: number;
    estimatesCreated: number;
    shopOrders: number;
    communityPosts: number;
  };
  quickActions: Array<{
    id: string;
    title: string;
    description: string;
    icon: any;
    href: string;
    color: string;
    bgColor: string;
    priority: 'high' | 'medium' | 'low';
  }>;
  recentActivity: Array<{
    id: string;
    type: string;
    title: string;
    description: string;
    timestamp: string;
    status: string;
    feature: string;
    href?: string;
  }>;
  upcomingDeadlines: Array<{
    id: string;
    title: string;
    type: 'project' | 'task' | 'course' | 'tool' | 'payment';
    dueDate: string;
    priority: 'high' | 'medium' | 'low';
    href: string;
  }>;
  progressTracking: {
    onboardingProgress: number;
    profileCompletion: number;
    monthlyGoals: {
      projectApplications: { current: number; target: number };
      courseCompletions: { current: number; target: number };
      networkingConnections: { current: number; target: number };
      toolUsage: { current: number; target: number };
    };
  };
}

export default function MemberDashboard() {
  const { data: session } = useSession()
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [activeView, setActiveView] = useState<'overview' | 'analytics' | 'progress'>('overview')
  
  // Automatically sync member to HubSpot as part of membership service
  const hubspotSync = useAutoHubSpotSync()
  const { trackActivity } = useHubSpotActivityTracking()
  const { analytics, fetchAnalytics } = useCrossFeatureIntegration()

  // Load dashboard data
  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setIsLoading(true)
        
        // Fetch unified dashboard data
        const response = await fetch('/api/integration/analytics?dashboard=true')
        if (response.ok) {
          const result = await response.json()
          if (result.success) {
            setDashboardData(result)
          } else {
            setDashboardData(getMockDashboardData())
          }
        } else {
          // Fallback to mock data for development
          setDashboardData(getMockDashboardData())
        }
        
        // Fetch cross-feature analytics
        await fetchAnalytics()
        
      } catch (error) {
        console.error('Error loading dashboard data:', error)
        setDashboardData(getMockDashboardData())
      } finally {
        setIsLoading(false)
      }
    }

    if (session?.user) {
      loadDashboardData()
      
      // Track dashboard view
      trackActivity({
        type: 'portal_login',
        details: 'Member viewed unified dashboard'
      })
    }
  }, [session, trackActivity, fetchAnalytics])

  // Mock data function for development
  const getMockDashboardData = (): DashboardData => ({
    profile: {
      completionPercentage: 85,
      missingFields: ['Business License Upload', 'Insurance Certificate'],
      memberSince: '2024-01-15',
      memberType: 'Professional'
    },
    stats: {
      projectsActive: 3,
      projectsCompleted: 12,
      tasksAssigned: 8,
      tasksCompleted: 24,
      toolsReserved: 2,
      coursesInProgress: 2,
      coursesCompleted: 8,
      badgesEarned: 5,
      messagesUnread: 3,
      estimatesCreated: 15,
      shopOrders: 4,
      communityPosts: 7
    },
    quickActions: [
      {
        id: 'create-estimate',
        title: 'Create Cost Estimate',
        description: 'Use AI-powered tools for accurate project estimates',
        icon: Calculator,
        href: '/member/cost-estimator',
        color: 'text-blue-600',
        bgColor: 'bg-blue-100',
        priority: 'high'
      },
      {
        id: 'camera-estimate',
        title: 'Camera Estimate',
        description: 'Get instant estimates using your camera',
        icon: Camera,
        href: '/member/project-intelligence/camera',
        color: 'text-green-600',
        bgColor: 'bg-green-100',
        priority: 'high'
      },
      {
        id: 'browse-tools',
        title: 'Browse Tools',
        description: 'Reserve equipment for your projects',
        icon: Wrench,
        href: '/member/tools',
        color: 'text-orange-600',
        bgColor: 'bg-orange-100',
        priority: 'medium'
      },
      {
        id: 'view-projects',
        title: 'Project Opportunities',
        description: 'Find new projects to bid on',
        icon: Target,
        href: '/member/projects',
        color: 'text-purple-600',
        bgColor: 'bg-purple-100',
        priority: 'high'
      },
      {
        id: 'learning',
        title: 'Continue Learning',
        description: 'Complete courses and earn badges',
        icon: BookOpen,
        href: '/member/learning',
        color: 'text-indigo-600',
        bgColor: 'bg-indigo-100',
        priority: 'medium'
      },
      {
        id: 'shop',
        title: 'Member Shop',
        description: 'Browse exclusive member products',
        icon: ShoppingBag,
        href: '/member/shop',
        color: 'text-pink-600',
        bgColor: 'bg-pink-100',
        priority: 'low'
      }
    ],
    recentActivity: [
      {
        id: '1',
        type: 'project',
        title: 'Applied to Downtown Office Renovation',
        description: 'Your bid has been submitted and is under review',
        timestamp: '2 hours ago',
        status: 'pending',
        feature: 'projects',
        href: '/member/projects/123'
      },
      {
        id: '2',
        type: 'course',
        title: 'Completed Advanced Project Management',
        description: 'Certificate available for download',
        timestamp: '1 day ago',
        status: 'completed',
        feature: 'learning',
        href: '/member/learning/certificates'
      },
      {
        id: '3',
        type: 'tool',
        title: 'Tool reservation approved',
        description: 'Excavator CAT 320 reserved for Aug 15-20',
        timestamp: '2 days ago',
        status: 'approved',
        feature: 'tools',
        href: '/member/tools/reservations'
      },
      {
        id: '4',
        type: 'estimate',
        title: 'Cost estimate created',
        description: 'Residential foundation project - $85,000',
        timestamp: '3 days ago',
        status: 'completed',
        feature: 'cost-estimation',
        href: '/member/cost-estimator/estimates/456'
      }
    ],
    upcomingDeadlines: [
      {
        id: '1',
        title: 'Downtown Office Renovation Bid',
        type: 'project',
        dueDate: '2025-08-20',
        priority: 'high',
        href: '/member/projects/123'
      },
      {
        id: '2',
        title: 'Safety Training Course',
        type: 'course',
        dueDate: '2025-08-25',
        priority: 'medium',
        href: '/member/learning/courses/safety'
      },
      {
        id: '3',
        title: 'Tool Return - Excavator',
        type: 'tool',
        dueDate: '2025-08-20',
        priority: 'high',
        href: '/member/tools/reservations'
      }
    ],
    progressTracking: {
      onboardingProgress: 90,
      profileCompletion: 85,
      monthlyGoals: {
        projectApplications: { current: 3, target: 5 },
        courseCompletions: { current: 1, target: 2 },
        networkingConnections: { current: 8, target: 10 },
        toolUsage: { current: 2, target: 3 }
      }
    }
  })

  const getActivityIcon = (type: string, status: string) => {
    const iconProps = { size: 20 }
    
    if (status === 'completed') return <CheckCircle className="text-green-500" {...iconProps} />
    if (status === 'pending') return <Clock className="text-yellow-500" {...iconProps} />
    if (status === 'approved') return <CheckCircle className="text-green-500" {...iconProps} />
    
    switch (type) {
      case 'project': return <Target className="text-blue-500" {...iconProps} />
      case 'course': return <BookOpen className="text-indigo-500" {...iconProps} />
      case 'tool': return <Wrench className="text-orange-500" {...iconProps} />
      case 'estimate': return <Calculator className="text-green-500" {...iconProps} />
      default: return <AlertCircle className="text-gray-500" {...iconProps} />
    }
  }

  const getDeadlinePriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'border-l-red-500 bg-red-50'
      case 'medium': return 'border-l-yellow-500 bg-yellow-50'
      case 'low': return 'border-l-blue-500 bg-blue-50'
      default: return 'border-l-gray-500 bg-gray-50'
    }
  }

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <span className="ml-4 text-gray-600">Loading your dashboard...</span>
        </div>
      </div>
    )
  }

  if (!dashboardData) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Failed to load dashboard</h3>
          <p className="text-gray-600 mb-4">Please try refreshing the page</p>
          <Button onClick={() => window.location.reload()}>
            Refresh Dashboard
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-8"
      >
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6">
          <div>
            <h1 className="text-3xl font-inter font-bold text-gray-900 mb-2">
              Welcome back, {session?.user?.name?.split(' ')[0]}!
            </h1>
            <p className="text-gray-600">
              Your unified NAMC member dashboard - everything you need in one place.
            </p>
          </div>
          
          <div className="flex items-center space-x-4 mt-4 lg:mt-0">
            <CompactEngagementScoreWidget />
            <div className="flex space-x-2">
              <Button
                variant={activeView === 'overview' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveView('overview')}
              >
                Overview
              </Button>
              <Button
                variant={activeView === 'analytics' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveView('analytics')}
              >
                Analytics
              </Button>
              <Button
                variant={activeView === 'progress' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveView('progress')}
              >
                Progress
              </Button>
            </div>
          </div>
        </div>

        {/* Member Status Bar */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Star className="h-5 w-5 text-yellow-500" />
                <span className="font-medium text-gray-900">{dashboardData.profile.memberType} Member</span>
              </div>
              <div className="text-sm text-gray-600">
                Since {new Date(dashboardData.profile.memberSince).toLocaleDateString()}
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Bell className="h-4 w-4 text-gray-400" />
              <span className="text-sm text-gray-600">
                {dashboardData.stats.messagesUnread} unread messages
              </span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* High Priority Recommendations */}
      <HighPriorityRecommendationsWidget className="mb-8" />

      {/* Profile Completion Alert */}
      {dashboardData.profile.completionPercentage < 100 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mb-8"
        >
          <Card variant="yellow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <AlertCircle className="h-5 w-5 text-yellow-600" />
                    <h3 className="font-semibold text-gray-900">
                      Complete Your Profile ({dashboardData.profile.completionPercentage}%)
                    </h3>
                  </div>
                  <p className="text-gray-600 text-sm mb-3">
                    Unlock all member benefits by completing your profile setup
                  </p>
                  <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                    <div 
                      className="bg-namc-yellow h-2 rounded-full transition-all duration-300"
                      style={{ width: `${dashboardData.profile.completionPercentage}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-500">
                    Missing: {dashboardData.profile.missingFields.join(', ')}
                  </p>
                </div>
                <Link href="/member/settings">
                  <Button variant="secondary" size="sm">
                    Complete Profile
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Main Content Based on Active View */}
      {activeView === 'overview' && (
        <>
          {/* Quick Actions Grid */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mb-8"
          >
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {dashboardData.quickActions
                .sort((a, b) => {
                  const priorityOrder = { high: 3, medium: 2, low: 1 }
                  return priorityOrder[b.priority] - priorityOrder[a.priority]
                })
                .map((action, index) => (
                <motion.div
                  key={action.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.1 * index }}
                >
                  <Link href={action.href}>
                    <Card className="hover:shadow-lg transition-all duration-200 cursor-pointer group">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div className={`p-3 rounded-full ${action.bgColor} group-hover:scale-110 transition-transform`}>
                            <action.icon className={`${action.color} h-6 w-6`} />
                          </div>
                          {action.priority === 'high' && (
                            <span className="bg-red-100 text-red-800 text-xs font-medium px-2 py-1 rounded-full">
                              High Priority
                            </span>
                          )}
                        </div>
                        <h3 className="font-semibold text-gray-900 mb-2">{action.title}</h3>
                        <p className="text-sm text-gray-600 mb-4">{action.description}</p>
                        <div className="flex items-center text-sm font-medium text-blue-600 group-hover:text-blue-700">
                          Get Started
                          <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Stats Overview */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mb-8"
          >
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Your Activity</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {[
                { label: 'Active Projects', value: dashboardData.stats.projectsActive, icon: FolderOpen, color: 'text-blue-600', bgColor: 'bg-blue-100' },
                { label: 'Tasks Assigned', value: dashboardData.stats.tasksAssigned, icon: CheckCircle, color: 'text-green-600', bgColor: 'bg-green-100' },
                { label: 'Tools Reserved', value: dashboardData.stats.toolsReserved, icon: Wrench, color: 'text-orange-600', bgColor: 'bg-orange-100' },
                { label: 'Courses Active', value: dashboardData.stats.coursesInProgress, icon: BookOpen, color: 'text-indigo-600', bgColor: 'bg-indigo-100' },
                { label: 'Badges Earned', value: dashboardData.stats.badgesEarned, icon: Award, color: 'text-yellow-600', bgColor: 'bg-yellow-100' },
                { label: 'Estimates Created', value: dashboardData.stats.estimatesCreated, icon: Calculator, color: 'text-purple-600', bgColor: 'bg-purple-100' }
              ].map((stat, index) => (
                <Card key={stat.label} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className={`p-2 rounded-full ${stat.bgColor}`}>
                        <stat.icon className={`${stat.color} h-4 w-4`} />
                      </div>
                    </div>
                    <p className="text-2xl font-bold text-gray-900 mb-1">{stat.value}</p>
                    <p className="text-xs text-gray-600">{stat.label}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </motion.div>

          {/* Main Content Grid */}
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Recent Activity */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="lg:col-span-2"
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Activity className="h-5 w-5 text-blue-600" />
                      Recent Activity
                    </div>
                    <Link href="/member/activity">
                      <Button variant="outline" size="sm">
                        View All
                      </Button>
                    </Link>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {dashboardData.recentActivity.map((activity) => (
                      <div key={activity.id} className="flex items-start space-x-4 p-4 rounded-lg hover:bg-gray-50 transition-colors">
                        {getActivityIcon(activity.type, activity.status)}
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium text-gray-900">{activity.title}</h4>
                            <span className="text-xs text-gray-500">{activity.timestamp}</span>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">{activity.description}</p>
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-xs text-blue-600 capitalize">{activity.feature}</span>
                            {activity.href && (
                              <Link href={activity.href}>
                                <Button variant="outline" size="sm" className="text-xs">
                                  View
                                  <Eye className="ml-1 h-3 w-3" />
                                </Button>
                              </Link>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Sidebar */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.5 }}
              className="space-y-6"
            >
              {/* Upcoming Deadlines */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Clock className="h-5 w-5 text-red-600" />
                    Upcoming Deadlines
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {dashboardData.upcomingDeadlines.map((deadline) => (
                      <div key={deadline.id} className={`border-l-4 rounded-lg p-3 ${getDeadlinePriorityColor(deadline.priority)}`}>
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="font-medium text-gray-900 text-sm">{deadline.title}</h4>
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            deadline.priority === 'high' 
                              ? 'bg-red-100 text-red-800'
                              : deadline.priority === 'medium'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {deadline.priority}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 mb-2">
                          Due: {new Date(deadline.dueDate).toLocaleDateString()}
                        </p>
                        <Link href={deadline.href}>
                          <Button size="sm" variant="outline" className="w-full text-xs">
                            View Details
                          </Button>
                        </Link>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Recommendations */}
              <RecommendationsWidget maxRecommendations={3} />
            </motion.div>
          </div>
        </>
      )}

      {activeView === 'analytics' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-8"
        >
          {/* Engagement Score */}
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <EngagementScoreWidget />
            </div>
            <div>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <BarChart3 className="h-5 w-5 text-blue-600" />
                    Monthly Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Projects Completed</span>
                      <span className="font-semibold">{dashboardData.stats.projectsCompleted}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Tasks Completed</span>
                      <span className="font-semibold">{dashboardData.stats.tasksCompleted}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Courses Completed</span>
                      <span className="font-semibold">{dashboardData.stats.coursesCompleted}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Community Posts</span>
                      <span className="font-semibold">{dashboardData.stats.communityPosts}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Feature Usage Analytics */}
          <Card>
            <CardHeader>
              <CardTitle>Feature Usage Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  { feature: 'Project Management', usage: 85, trend: 'up' },
                  { feature: 'Cost Estimation', usage: 72, trend: 'up' },
                  { feature: 'Tool Lending', usage: 45, trend: 'stable' },
                  { feature: 'Learning Platform', usage: 68, trend: 'up' }
                ].map((item) => (
                  <div key={item.feature} className="text-center">
                    <div className="relative w-20 h-20 mx-auto mb-3">
                      <svg className="w-20 h-20 transform -rotate-90">
                        <circle
                          cx="40"
                          cy="40"
                          r="30"
                          stroke="currentColor"
                          strokeWidth="6"
                          fill="transparent"
                          className="text-gray-200"
                        />
                        <circle
                          cx="40"
                          cy="40"
                          r="30"
                          stroke="currentColor"
                          strokeWidth="6"
                          fill="transparent"
                          strokeDasharray={`${item.usage * 1.88} 188`}
                          className="text-blue-600"
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-lg font-semibold">{item.usage}%</span>
                      </div>
                    </div>
                    <h4 className="font-medium text-gray-900 mb-1">{item.feature}</h4>
                    <div className="flex items-center justify-center space-x-1">
                      {item.trend === 'up' ? (
                        <TrendingUp className="h-4 w-4 text-green-500" />
                      ) : item.trend === 'down' ? (
                        <TrendingDown className="h-4 w-4 text-red-500" />
                      ) : (
                        <Activity className="h-4 w-4 text-gray-400" />
                      )}
                      <span className="text-xs text-gray-500 capitalize">{item.trend}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {activeView === 'progress' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-8"
        >
          {/* Progress Overview */}
          <div className="grid md:grid-cols-2 gap-8">
            <Card>
              <CardHeader>
                <CardTitle>Onboarding Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Overall Progress</span>
                    <span className="text-sm text-gray-600">{dashboardData.progressTracking.onboardingProgress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className="bg-green-500 h-3 rounded-full transition-all duration-300"
                      style={{ width: `${dashboardData.progressTracking.onboardingProgress}%` }}
                    ></div>
                  </div>
                  <p className="text-sm text-gray-600">
                    You're almost done! Complete the remaining steps to unlock all features.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Profile Completion</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Profile Complete</span>
                    <span className="text-sm text-gray-600">{dashboardData.progressTracking.profileCompletion}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className="bg-blue-500 h-3 rounded-full transition-all duration-300"
                      style={{ width: `${dashboardData.progressTracking.profileCompletion}%` }}
                    ></div>
                  </div>
                  <Link href="/member/settings">
                    <Button size="sm" variant="outline" className="w-full">
                      Complete Profile
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Monthly Goals */}
          <Card>
            <CardHeader>
              <CardTitle>Monthly Goals</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                {Object.entries(dashboardData.progressTracking.monthlyGoals).map(([key, goal]) => (
                  <div key={key} className="text-center">
                    <div className="relative w-16 h-16 mx-auto mb-3">
                      <svg className="w-16 h-16 transform -rotate-90">
                        <circle
                          cx="32"
                          cy="32"
                          r="24"
                          stroke="currentColor"
                          strokeWidth="4"
                          fill="transparent"
                          className="text-gray-200"
                        />
                        <circle
                          cx="32"
                          cy="32"
                          r="24"
                          stroke="currentColor"
                          strokeWidth="4"
                          fill="transparent"
                          strokeDasharray={`${(goal.current / goal.target) * 150} 150`}
                          className="text-green-500"
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-sm font-semibold">{goal.current}/{goal.target}</span>
                      </div>
                    </div>
                    <h4 className="font-medium text-gray-900 text-sm capitalize">
                      {key.replace(/([A-Z])/g, ' $1').trim()}
                    </h4>
                    <p className="text-xs text-gray-500 mt-1">
                      {Math.round((goal.current / goal.target) * 100)}% Complete
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* HubSpot Integration Status */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.6 }}
        className="mt-8"
      >
        {hubspotSync.isInitialized && (
          <div className={`mb-6 p-4 rounded-lg border ${
            hubspotSync.syncSuccess 
              ? 'bg-green-50 border-green-200' 
              : hubspotSync.error 
              ? 'bg-red-50 border-red-200'
              : 'bg-blue-50 border-blue-200'
          }`}>
            <div className="flex items-center space-x-2">
              {hubspotSync.isSyncing ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              ) : hubspotSync.syncSuccess ? (
                <CheckCircle className="w-4 h-4 text-green-600" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-600" />
              )}
              <p className={`text-sm font-medium ${
                hubspotSync.syncSuccess ? 'text-green-800' : 
                hubspotSync.error ? 'text-red-800' : 'text-blue-800'
              }`}>
                {hubspotSync.isSyncing 
                  ? 'Syncing your profile to HubSpot CRM...'
                  : hubspotSync.syncSuccess 
                  ? `✓ Your profile is synced to HubSpot CRM as part of your NAMC membership services ${hubspotSync.isNewContact ? '(New contact created)' : '(Profile updated)'}`
                  : `HubSpot sync failed: ${hubspotSync.error}`
                }
              </p>
            </div>
            {hubspotSync.lastSyncTime && (
              <p className="text-xs text-gray-600 mt-1">
                Last synced: {hubspotSync.lastSyncTime.toLocaleString()}
              </p>
            )}
          </div>
        )}

        <HubSpotDashboardWidget />
      </motion.div>
    </div>
  )
}
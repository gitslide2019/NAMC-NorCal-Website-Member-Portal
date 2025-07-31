'use client'

import React from 'react'
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
  MessageSquare
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import HubSpotDashboardWidget from '@/components/hubspot/HubSpotDashboardWidget'
import { useAutoHubSpotSync, useHubSpotActivityTracking } from '@/hooks/useAutoHubSpotSync'

// Mock data - in production, this would come from your API
const dashboardData = {
  profile: {
    completionPercentage: 85,
    missingFields: ['Business License Upload', 'Insurance Certificate']
  },
  stats: {
    projectsApplied: 12,
    coursesInProgress: 3,
    coursesCompleted: 8,
    toolsReserved: 2,
    messagesUnread: 5
  },
  recentActivity: [
    {
      id: 1,
      type: 'project',
      title: 'Applied to Downtown Office Renovation',
      description: 'Your bid has been submitted and is under review',
      timestamp: '2 hours ago',
      status: 'pending'
    },
    {
      id: 2,
      type: 'course',
      title: 'Completed Advanced Project Management',
      description: 'Certificate available for download',
      timestamp: '1 day ago',
      status: 'completed'
    },
    {
      id: 3,
      type: 'tool',
      title: 'Tool reservation approved',
      description: 'Excavator CAT 320 reserved for Aug 15-20',
      timestamp: '2 days ago',
      status: 'approved'
    }
  ],
  upcomingEvents: [
    {
      id: 1,
      title: 'Monthly Networking Mixer',
      date: 'Aug 15, 2025',
      time: '6:00 PM',
      location: 'Oakland Convention Center',
      type: 'networking'
    },
    {
      id: 2,
      title: 'Safety Training Workshop',
      date: 'Aug 20, 2025',
      time: '9:00 AM',
      location: 'Virtual Event',
      type: 'training'
    }
  ],
  projectOpportunities: [
    {
      id: 1,
      title: 'Residential Foundation Project',
      budget: '$75,000 - $100,000',
      location: 'Oakland, CA',
      deadline: 'Aug 20, 2025',
      bidsCount: 8
    },
    {
      id: 2,
      title: 'Commercial HVAC Installation',
      budget: '$150,000 - $200,000',
      location: 'San Francisco, CA',
      deadline: 'Aug 25, 2025',
      bidsCount: 12
    }
  ]
}

export default function MemberDashboard() {
  const { data: session } = useSession()
  
  // Automatically sync member to HubSpot as part of membership service
  const hubspotSync = useAutoHubSpotSync()
  const { trackActivity } = useHubSpotActivityTracking()

  // Track dashboard view
  React.useEffect(() => {
    if (session?.user) {
      trackActivity({
        type: 'portal_login',
        details: 'Member viewed dashboard'
      })
    }
  }, [session, trackActivity])

  const statCards = [
    {
      title: 'Projects Applied',
      value: dashboardData.stats.projectsApplied,
      icon: FolderOpen,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    {
      title: 'Courses Completed',
      value: `${dashboardData.stats.coursesCompleted}/${dashboardData.stats.coursesCompleted + dashboardData.stats.coursesInProgress}`,
      icon: TrendingUp,
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    },
    {
      title: 'Tools Reserved',
      value: dashboardData.stats.toolsReserved,
      icon: Users,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100'
    },
    {
      title: 'Unread Messages',
      value: dashboardData.stats.messagesUnread,
      icon: MessageSquare,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100'
    }
  ]

  const getActivityIcon = (type: string, status: string) => {
    if (status === 'completed') return <CheckCircle className="text-green-500" size={20} />
    if (status === 'pending') return <Clock className="text-yellow-500" size={20} />
    if (status === 'approved') return <CheckCircle className="text-green-500" size={20} />
    return <AlertCircle className="text-gray-500" size={20} />
  }

  return (
    <div className="p-6">
      {/* Welcome Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-inter font-bold text-gray-900 mb-2">
          Welcome back, {session?.user?.name?.split(' ')[0]}!
        </h1>
        <p className="text-gray-600">
          Here's what's happening with your NAMC membership today.
        </p>
      </motion.div>

      {/* Profile Completion */}
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
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">
                    Complete Your Profile ({dashboardData.profile.completionPercentage}%)
                  </h3>
                  <p className="text-gray-600 text-sm mb-3">
                    Finish setting up your profile to access all member benefits
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
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 * (index + 2) }}
          >
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-2">{stat.title}</p>
                    <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
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

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="lg:col-span-2"
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Recent Activity
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
                      <h4 className="font-medium text-gray-900">{activity.title}</h4>
                      <p className="text-sm text-gray-600 mt-1">{activity.description}</p>
                      <p className="text-xs text-gray-500 mt-2">{activity.timestamp}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Upcoming Events */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.7 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Upcoming Events
                <Link href="/member/events">
                  <Button variant="outline" size="sm">
                    View All
                  </Button>
                </Link>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {dashboardData.upcomingEvents.map((event) => (
                  <div key={event.id} className="p-4 border border-gray-200 rounded-lg hover:border-namc-yellow transition-colors">
                    <h4 className="font-medium text-gray-900 mb-2">{event.title}</h4>
                    <div className="space-y-1 text-sm text-gray-600">
                      <p className="flex items-center">
                        <Calendar size={14} className="mr-2" />
                        {event.date} at {event.time}
                      </p>
                      <p className="flex items-center">
                        <Users size={14} className="mr-2" />
                        {event.location}
                      </p>
                    </div>
                    <div className="mt-3">
                      <Button variant="outline" size="sm" className="w-full">
                        RSVP
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* HubSpot Member Service Integration */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.8 }}
        className="mt-8"
      >
        {/* HubSpot Sync Status */}
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

        {/* HubSpot Dashboard Widget */}
        <HubSpotDashboardWidget />
      </motion.div>

      {/* Project Opportunities */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.9 }}
        className="mt-8"
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              New Project Opportunities
              <Link href="/member/projects">
                <Button variant="outline" size="sm">
                  Browse All Projects
                  <ArrowRight className="ml-2" size={16} />
                </Button>
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              {dashboardData.projectOpportunities.map((project) => (
                <div 
                  key={project.id} 
                  className="p-6 border border-gray-200 rounded-lg hover:border-namc-yellow transition-all duration-200 hover:shadow-md"
                  onClick={() => {
                    trackActivity({
                      type: 'project_view',
                      details: `Viewed project: ${project.title}`
                    })
                  }}
                >
                  <h4 className="font-semibold text-gray-900 mb-3">{project.title}</h4>
                  <div className="space-y-2 text-sm text-gray-600 mb-4">
                    <p><strong>Budget:</strong> {project.budget}</p>
                    <p><strong>Location:</strong> {project.location}</p>
                    <p><strong>Deadline:</strong> {project.deadline}</p>
                    <p><strong>Bids Submitted:</strong> {project.bidsCount}</p>
                  </div>
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm" className="flex-1">
                      View Details
                    </Button>
                    <Button 
                      size="sm" 
                      className="flex-1"
                      onClick={(e) => {
                        e.stopPropagation()
                        trackActivity({
                          type: 'project_apply',
                          details: `Applied to project: ${project.title}`
                        })
                      }}
                    >
                      Submit Bid
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
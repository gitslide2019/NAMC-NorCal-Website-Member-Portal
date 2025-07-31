'use client'

import { motion } from 'framer-motion'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { 
  Users, 
  FolderOpen, 
  DollarSign, 
  TrendingUp,
  UserPlus,
  AlertTriangle,
  CheckCircle,
  Clock,
  BarChart3,
  Eye,
  Edit,
  Trash2,
  Settings
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import Button from '@/components/ui/Button'

// Mock data - in production, this would come from your API
const dashboardData = {
  stats: {
    totalMembers: 1247,
    memberGrowth: 15.3,
    activeProjects: 45,
    projectGrowth: 8.7,
    totalRevenue: 452000,
    revenueGrowth: 22.1,
    pendingApprovals: 12,
    approvalChange: -5
  },
  recentMembers: [
    {
      id: 1,
      name: 'Sarah Chen',
      company: 'Chen Construction LLC',
      email: 'sarah@chenconst.com',
      status: 'pending',
      joinedDate: '2025-07-28'
    },
    {
      id: 2,
      name: 'Marcus Johnson',
      company: 'MJ Electrical Services',
      email: 'marcus@mjelectrical.com',
      status: 'approved',
      joinedDate: '2025-07-27'
    },
    {
      id: 3,
      name: 'Elena Rodriguez',
      company: 'Rodriguez Roofing',
      email: 'elena@rodriguezroofing.com',
      status: 'pending',
      joinedDate: '2025-07-26'
    }
  ],
  recentProjects: [
    {
      id: 1,
      title: 'Downtown Office Complex',
      budget: '$2,500,000',
      bids: 18,
      status: 'active',
      deadline: '2025-08-15'
    },
    {
      id: 2,
      title: 'Residential Development Phase 2',
      budget: '$1,800,000',
      bids: 12,
      status: 'review',
      deadline: '2025-08-20'
    },
    {
      id: 3,
      title: 'Municipal Bridge Repair',
      budget: '$750,000',
      bids: 8,
      status: 'active',
      deadline: '2025-08-25'
    }
  ],
  systemAlerts: [
    {
      id: 1,
      type: 'warning',
      title: 'High Server Load',
      description: 'Server response time is above normal thresholds',
      timestamp: '10 minutes ago'
    },
    {
      id: 2,
      type: 'info',
      title: 'Scheduled Maintenance',
      description: 'System maintenance scheduled for this weekend',
      timestamp: '2 hours ago'
    }
  ]
}

export default function AdminDashboard() {
  const { data: session } = useSession()

  const statCards = [
    {
      title: 'Total Members',
      value: dashboardData.stats.totalMembers.toLocaleString(),
      change: `+${dashboardData.stats.memberGrowth}%`,
      changeType: 'positive',
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    {
      title: 'Active Projects',
      value: dashboardData.stats.activeProjects,
      change: `+${dashboardData.stats.projectGrowth}%`,
      changeType: 'positive',
      icon: FolderOpen,
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    },
    {
      title: 'Monthly Revenue',
      value: `$${(dashboardData.stats.totalRevenue / 1000).toFixed(0)}k`,
      change: `+${dashboardData.stats.revenueGrowth}%`,
      changeType: 'positive',
      icon: DollarSign,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100'
    },
    {
      title: 'Pending Approvals',
      value: dashboardData.stats.pendingApprovals,
      change: `${dashboardData.stats.approvalChange}`,
      changeType: 'negative',
      icon: Clock,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100'
    }
  ]

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="text-green-500" size={16} />
      case 'pending':
        return <Clock className="text-yellow-500" size={16} />
      case 'active':
        return <CheckCircle className="text-green-500" size={16} />
      case 'review':
        return <Clock className="text-yellow-500" size={16} />
      default:
        return <AlertTriangle className="text-gray-500" size={16} />
    }
  }

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'warning':
        return <AlertTriangle className="text-yellow-500" size={20} />
      case 'error':
        return <AlertTriangle className="text-red-500" size={20} />
      case 'info':
        return <CheckCircle className="text-blue-500" size={20} />
      default:
        return <AlertTriangle className="text-gray-500" size={20} />
    }
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
          Admin Dashboard
        </h1>
        <p className="text-gray-600">
          Welcome back, {session?.user?.name}. Here's your NAMC system overview.
        </p>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((stat, index) => (
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
                        {stat.change} from last month
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
        {/* Recent Members */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Recent Members
                <Link href="/admin/members">
                  <Button variant="outline" size="sm">
                    View All
                  </Button>
                </Link>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {dashboardData.recentMembers.map((member) => (
                  <div key={member.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                        <span className="text-gray-600 font-medium text-sm">
                          {member.name.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{member.name}</p>
                        <p className="text-sm text-gray-600">{member.company}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(member.status)}
                      <span className="text-xs text-gray-500 capitalize">{member.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent Projects */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Recent Projects
                <Link href="/admin/projects">
                  <Button variant="outline" size="sm">
                    View All
                  </Button>
                </Link>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {dashboardData.recentProjects.map((project) => (
                  <div key={project.id} className="p-3 border border-gray-200 rounded-lg hover:border-namc-yellow transition-colors">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-medium text-gray-900 text-sm">{project.title}</h4>
                      {getStatusIcon(project.status)}
                    </div>
                    <div className="space-y-1 text-xs text-gray-600">
                      <p><strong>Budget:</strong> {project.budget}</p>
                      <p><strong>Bids:</strong> {project.bids}</p>
                      <p><strong>Deadline:</strong> {project.deadline}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* System Alerts */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.7 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>System Alerts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {dashboardData.systemAlerts.map((alert) => (
                  <div key={alert.id} className="flex items-start space-x-3 p-3 rounded-lg bg-gray-50">
                    {getAlertIcon(alert.type)}
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900 text-sm">{alert.title}</h4>
                      <p className="text-xs text-gray-600 mt-1">{alert.description}</p>
                      <p className="text-xs text-gray-500 mt-2">{alert.timestamp}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.8 }}
      >
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Link href="/admin/members/approve">
                <Button variant="outline" className="w-full h-20 flex flex-col items-center justify-center space-y-2">
                  <UserPlus size={24} />
                  <span className="text-sm">Approve Members</span>
                </Button>
              </Link>
              <Link href="/admin/projects/new">
                <Button variant="outline" className="w-full h-20 flex flex-col items-center justify-center space-y-2">
                  <FolderOpen size={24} />
                  <span className="text-sm">New Project</span>
                </Button>
              </Link>
              <Link href="/admin/analytics">
                <Button variant="outline" className="w-full h-20 flex flex-col items-center justify-center space-y-2">
                  <BarChart3 size={24} />
                  <span className="text-sm">View Analytics</span>
                </Button>
              </Link>
              <Link href="/admin/settings">
                <Button variant="outline" className="w-full h-20 flex flex-col items-center justify-center space-y-2">
                  <Settings size={24} />
                  <span className="text-sm">System Settings</span>
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
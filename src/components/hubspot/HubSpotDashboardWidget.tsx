'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  Activity, 
  TrendingUp, 
  Users, 
  DollarSign,
  RefreshCw,
  ExternalLink,
  Calendar,
  Mail,
  Phone,
  Building,
  Clock,
  CheckCircle,
  AlertCircle
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { useSession } from 'next-auth/react'

interface HubSpotContact {
  id: string
  properties: {
    firstname?: string
    lastname?: string
    email?: string
    phone?: string
    company?: string
    membership_tier?: string
    membership_status?: string
    createdate?: string
    lastmodifieddate?: string
  }
}

interface HubSpotDeal {
  id: string
  properties: {
    dealname?: string
    amount?: string
    dealstage?: string
    closedate?: string
    createdate?: string
    pipeline?: string
  }
}

interface HubSpotActivity {
  id: string
  type: string
  timestamp: string
  properties: {
    subject?: string
    body?: string
  }
}

interface DashboardData {
  contact: HubSpotContact | null
  deals: HubSpotDeal[]
  activities: HubSpotActivity[]
  stats: {
    totalDeals: number
    totalValue: number
    activeDeals: number
    lastActivity: string | null
  }
}

export default function HubSpotDashboardWidget() {
  const { data: session } = useSession()
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)

  const fetchHubSpotData = async () => {
    if (!session?.user?.email) return

    setIsLoading(true)
    setError(null)

    try {
      // Simulate HubSpot API calls (in real implementation, these would be actual API calls)
      await new Promise(resolve => setTimeout(resolve, 1500)) // Simulate API delay

      // Mock data that would come from HubSpot
      const mockContact: HubSpotContact = {
        id: '12345',
        properties: {
          firstname: session.user.name?.split(' ')[0] || 'John',
          lastname: session.user.name?.split(' ').slice(1).join(' ') || 'Doe',
          email: session.user.email,
          phone: '(415) 555-0123',
          company: 'NAMC Construction Co',
          membership_tier: 'Gold',
          membership_status: 'Active',
          createdate: '2024-01-15T10:30:00.000Z',
          lastmodifieddate: new Date().toISOString()
        }
      }

      const mockDeals: HubSpotDeal[] = [
        {
          id: 'deal_1',
          properties: {
            dealname: 'Oakland Community Center Renovation',
            amount: '850000',
            dealstage: 'negotiation',
            closedate: '2025-03-15',
            createdate: '2024-11-01T09:00:00.000Z',
            pipeline: 'default'
          }
        },
        {
          id: 'deal_2',
          properties: {
            dealname: 'SF Residential Complex',
            amount: '1200000',
            dealstage: 'proposal',
            closedate: '2025-04-30',
            createdate: '2024-12-01T14:30:00.000Z',
            pipeline: 'default'
          }
        },
        {
          id: 'deal_3',
          properties: {
            dealname: 'Berkeley Solar Installation',
            amount: '650000',
            dealstage: 'closed-won',
            closedate: '2024-12-15',
            createdate: '2024-10-15T11:15:00.000Z',
            pipeline: 'default'
          }
        }
      ]

      const mockActivities: HubSpotActivity[] = [
        {
          id: 'activity_1',
          type: 'email',
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          properties: {
            subject: 'Project proposal follow-up',
            body: 'Thank you for reviewing our proposal for the Oakland Community Center project.'
          }
        },
        {
          id: 'activity_2',
          type: 'call',
          timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
          properties: {
            subject: 'Project discussion call',
            body: '30-minute call to discuss project requirements and timeline.'
          }
        },
        {
          id: 'activity_3',
          type: 'meeting',
          timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          properties: {
            subject: 'Site visit and assessment',
            body: 'On-site meeting to assess project scope and requirements.'
          }
        }
      ]

      const totalValue = mockDeals.reduce((sum, deal) => sum + parseInt(deal.properties.amount || '0'), 0)
      const activeDeals = mockDeals.filter(deal => 
        deal.properties.dealstage !== 'closed-won' && deal.properties.dealstage !== 'closed-lost'
      ).length

      setDashboardData({
        contact: mockContact,
        deals: mockDeals,
        activities: mockActivities,
        stats: {
          totalDeals: mockDeals.length,
          totalValue,
          activeDeals,
          lastActivity: mockActivities[0]?.timestamp || null
        }
      })
      setLastRefresh(new Date())

    } catch (err) {
      setError('Failed to fetch HubSpot data')
      console.error('HubSpot fetch error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchHubSpotData()
  }, [session?.user?.email])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getDealStageColor = (stage: string) => {
    switch (stage) {
      case 'closed-won':
        return 'bg-green-100 text-green-800'
      case 'closed-lost':
        return 'bg-red-100 text-red-800'
      case 'negotiation':
        return 'bg-yellow-100 text-yellow-800'
      case 'proposal':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'email':
        return <Mail className="w-4 h-4" />
      case 'call':
        return <Phone className="w-4 h-4" />
      case 'meeting':
        return <Calendar className="w-4 h-4" />
      default:
        return <Activity className="w-4 h-4" />
    }
  }

  if (error) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <div className="flex items-center space-x-2 text-red-600">
            <AlertCircle className="w-5 h-5" />
            <p>{error}</p>
          </div>
          <Button 
            onClick={fetchHubSpotData} 
            className="mt-4"
            variant="outline"
          >
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
            <Activity className="w-6 h-6" />
            <span>HubSpot Integration</span>
          </h2>
          <p className="text-gray-600">Real-time CRM data and project opportunities</p>
        </div>
        <div className="flex items-center space-x-2">
          {lastRefresh && (
            <span className="text-sm text-gray-500">
              Last updated: {lastRefresh.toLocaleTimeString()}
            </span>
          )}
          <Button
            onClick={fetchHubSpotData}
            disabled={isLoading}
            variant="outline"
            size="sm"
            className="flex items-center space-x-1"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {dashboardData && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <DollarSign className="w-8 h-8 text-green-600" />
                  <div>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatCurrency(dashboardData.stats.totalValue)}
                    </p>
                    <p className="text-sm text-gray-600">Total Pipeline Value</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="w-8 h-8 text-blue-600" />
                  <div>
                    <p className="text-2xl font-bold text-gray-900">
                      {dashboardData.stats.activeDeals}
                    </p>
                    <p className="text-sm text-gray-600">Active Deals</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <Building className="w-8 h-8 text-purple-600" />
                  <div>
                    <p className="text-2xl font-bold text-gray-900">
                      {dashboardData.stats.totalDeals}
                    </p>
                    <p className="text-sm text-gray-600">Total Projects</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <Clock className="w-8 h-8 text-orange-600" />
                  <div>
                    <p className="text-sm font-bold text-gray-900">
                      {dashboardData.stats.lastActivity 
                        ? formatDateTime(dashboardData.stats.lastActivity)
                        : 'No activity'
                      }
                    </p>
                    <p className="text-sm text-gray-600">Last Activity</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      )}

      {isLoading && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
                  <div className="space-y-2">
                    <div className="h-3 bg-gray-200 rounded"></div>
                    <div className="h-3 bg-gray-200 rounded w-5/6"></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {dashboardData && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Deals */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center space-x-2">
                  <DollarSign className="w-5 h-5" />
                  <span>Recent Deals</span>
                </CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open('https://app.hubspot.com/contacts/243384888/deals', '_blank')}
                  className="flex items-center space-x-1"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>View All</span>
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {dashboardData.deals.map((deal, index) => (
                  <motion.div
                    key={deal.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 + index * 0.1 }}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div>
                      <h4 className="font-medium text-gray-900">
                        {deal.properties.dealname}
                      </h4>
                      <p className="text-sm text-gray-600">
                        Close Date: {deal.properties.closedate ? formatDate(deal.properties.closedate) : 'TBD'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-900">
                        {formatCurrency(parseInt(deal.properties.amount || '0'))}
                      </p>
                      <span className={`inline-block px-2 py-1 text-xs rounded-full ${getDealStageColor(deal.properties.dealstage || '')}`}>
                        {deal.properties.dealstage?.replace('-', ' ').toUpperCase()}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </CardContent>
            </Card>
          </motion.div>

          {/* Recent Activities */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Activity className="w-5 h-5" />
                  <span>Recent Activities</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {dashboardData.activities.map((activity, index) => (
                  <motion.div
                    key={activity.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.7 + index * 0.1 }}
                    className="flex items-start space-x-3"
                  >
                    <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      {getActivityIcon(activity.type)}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">
                        {activity.properties.subject}
                      </h4>
                      <p className="text-sm text-gray-600 mt-1">
                        {activity.properties.body}
                      </p>
                      <p className="text-xs text-gray-500 mt-2">
                        {formatDateTime(activity.timestamp)}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      )}

      {dashboardData?.contact && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
        >
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center space-x-2">
                <Users className="w-5 h-5" />
                <span>HubSpot Contact Profile</span>
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(`https://app.hubspot.com/contacts/243384888/contact/${dashboardData.contact?.id}`, '_blank')}
                className="flex items-center space-x-1"
              >
                <ExternalLink className="w-3 h-3" />
                <span>View in HubSpot</span>
              </Button>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Contact Information</h4>
                  <div className="space-y-2 text-sm">
                    <p><strong>Name:</strong> {dashboardData.contact.properties.firstname} {dashboardData.contact.properties.lastname}</p>
                    <p><strong>Email:</strong> {dashboardData.contact.properties.email}</p>
                    <p><strong>Phone:</strong> {dashboardData.contact.properties.phone || 'Not provided'}</p>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Company Information</h4>
                  <div className="space-y-2 text-sm">
                    <p><strong>Company:</strong> {dashboardData.contact.properties.company || 'Not provided'}</p>
                    <p><strong>Membership:</strong> {dashboardData.contact.properties.membership_tier} ({dashboardData.contact.properties.membership_status})</p>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Timeline</h4>
                  <div className="space-y-2 text-sm">
                    <p><strong>Created:</strong> {dashboardData.contact.properties.createdate ? formatDate(dashboardData.contact.properties.createdate) : 'Unknown'}</p>
                    <p><strong>Last Modified:</strong> {dashboardData.contact.properties.lastmodifieddate ? formatDate(dashboardData.contact.properties.lastmodifieddate) : 'Unknown'}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  )
}
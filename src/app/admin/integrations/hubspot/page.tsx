'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useSession } from 'next-auth/react'
import ErrorBoundary from '@/components/ui/ErrorBoundary'
import { DashboardSkeleton } from '@/components/ui/LoadingSkeleton'
import SkipNavigation from '@/components/ui/SkipNavigation'
import MobileNavigation from '@/components/ui/MobileNavigation'
import { 
  Cloud,
  RefreshCw,
  Users,
  TrendingUp,
  DollarSign,
  Activity,
  CheckCircle,
  AlertTriangle,
  Clock,
  Settings,
  Sync,
  Database,
  BarChart3,
  UserCheck,
  Target,
  Zap,
  Calendar,
  Filter,
  Download,
  ExternalLink,
  Play,
  Pause,
  X
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import Button from '@/components/ui/Button'

interface HubSpotAnalytics {
  totalContacts: number
  activeContacts: number
  highEngagementContacts: number
  atRiskContacts: number
  avgEngagementScore: number
  totalDeals: number
  avgDealValue: number
}

interface SyncStatus {
  hubspotConnected: boolean
  lastSyncTime?: string
  analytics?: HubSpotAnalytics
}

interface SyncResult {
  totalProcessed: number
  successful: number
  failed: number
  results?: Array<{
    memberId: string
    success: boolean
    error?: string
  }>
}

export default function HubSpotIntegrationPage() {
  const { data: session } = useSession()
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isOnline, setIsOnline] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [syncResults, setSyncResults] = useState<SyncResult | null>(null)
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(false)
  const [syncInterval, setSyncInterval] = useState<'1h' | '6h' | '24h'>('6h')
  const [selectedMembers, setSelectedMembers] = useState<string[]>([])
  const [showAdvanced, setShowAdvanced] = useState(false)

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

  // Load HubSpot sync status
  useEffect(() => {
    const loadSyncStatus = async () => {
      try {
        setLoading(true)
        setError(null)

        const response = await fetch('/api/hubspot/sync-engagement')
        const data = await response.json()

        if (data.success) {
          setSyncStatus(data.data)
        } else {
          throw new Error(data.error || 'Failed to load sync status')
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load HubSpot status')
      } finally {
        setLoading(false)
      }
    }

    loadSyncStatus()
  }, [])

  const handleFullSync = async () => {
    try {
      setSyncing(true)
      setSyncResults(null)
      setError(null)

      const response = await fetch('/api/hubspot/sync-engagement', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ syncAll: true })
      })

      const data = await response.json()

      if (data.success) {
        setSyncResults(data.data)
        // Refresh sync status
        const statusResponse = await fetch('/api/hubspot/sync-engagement')
        const statusData = await statusResponse.json()
        if (statusData.success) {
          setSyncStatus(statusData.data)
        }
      } else {
        throw new Error(data.error || 'Sync failed')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sync operation failed')
    } finally {
      setSyncing(false)
    }
  }

  const handleSelectiveSync = async () => {
    if (selectedMembers.length === 0) {
      setError('Please select members to sync')
      return
    }

    try {
      setSyncing(true)
      setSyncResults(null)
      setError(null)

      const response = await fetch('/api/hubspot/sync-engagement', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ memberIds: selectedMembers })
      })

      const data = await response.json()

      if (data.success) {
        setSyncResults(data.data)
        setSelectedMembers([])
      } else {
        throw new Error(data.error || 'Selective sync failed')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Selective sync failed')
    } finally {
      setSyncing(false)
    }
  }

  const testConnection = async () => {
    try {
      setError(null)
      
      const response = await fetch('/api/hubspot/sync-engagement')
      const data = await response.json()

      if (data.success && data.data.hubspotConnected) {
        alert('HubSpot connection successful!')
      } else {
        alert('HubSpot connection failed. Please check your API configuration.')
      }
    } catch (err) {
      alert('Connection test failed: ' + (err instanceof Error ? err.message : 'Unknown error'))
    }
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
              <h2 className="text-lg font-semibold text-red-900 mb-2">Integration Error</h2>
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
              <p className="text-sm text-yellow-700 mt-1">You're currently offline. Integration features may not work properly.</p>
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
                HubSpot Integration
              </h1>
              <p className="text-gray-600">
                Sync member engagement data with HubSpot CRM for automated workflows
              </p>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className={`px-3 py-2 rounded-full text-sm font-medium ${
                syncStatus?.hubspotConnected 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${
                    syncStatus?.hubspotConnected ? 'bg-green-600' : 'bg-red-600'
                  }`}></div>
                  <span>
                    {syncStatus?.hubspotConnected ? 'Connected' : 'Disconnected'}
                  </span>
                </div>
              </div>
              
              <Button 
                onClick={testConnection}
                variant="outline"
                className="min-h-[44px]"
                aria-label="Test HubSpot connection"
              >
                <Zap className="h-4 w-4 mr-2" aria-hidden="true" />
                Test Connection
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Connection Status & Analytics */}
        {syncStatus?.hubspotConnected && syncStatus.analytics && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[
              {
                title: 'HubSpot Contacts',
                value: syncStatus.analytics.totalContacts,
                change: `${syncStatus.analytics.activeContacts} active`,
                icon: Users,
                color: 'text-blue-600',
                bgColor: 'bg-blue-100'
              },
              {
                title: 'High Engagement',
                value: syncStatus.analytics.highEngagementContacts,
                change: `${((syncStatus.analytics.highEngagementContacts / syncStatus.analytics.totalContacts) * 100).toFixed(1)}%`,
                icon: TrendingUp,
                color: 'text-green-600',
                bgColor: 'bg-green-100'
              },
              {
                title: 'At Risk Members',
                value: syncStatus.analytics.atRiskContacts,
                change: `${((syncStatus.analytics.atRiskContacts / syncStatus.analytics.totalContacts) * 100).toFixed(1)}%`,
                icon: AlertTriangle,
                color: 'text-red-600',
                bgColor: 'bg-red-100'
              },
              {
                title: 'Avg Deal Value',
                value: `$${(syncStatus.analytics.avgDealValue / 1000).toFixed(0)}K`,
                change: `${syncStatus.analytics.totalDeals} deals`,
                icon: DollarSign,
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
                        <p className="text-sm text-gray-600">{stat.change}</p>
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
        )}

        <div className="grid lg:grid-cols-3 gap-8 mb-8">
          {/* Sync Operations */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="lg:col-span-2"
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Sync className="mr-2" />
                  Sync Operations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Full Sync */}
                  <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div>
                      <h4 className="font-semibold text-gray-900">Full Member Sync</h4>
                      <p className="text-sm text-gray-600">
                        Sync all member engagement data to HubSpot contacts
                      </p>
                    </div>
                    <Button
                      onClick={handleFullSync}
                      disabled={syncing || !syncStatus?.hubspotConnected}
                      className="bg-namc-gold text-white hover:bg-namc-gold/90 min-h-[44px]"
                      aria-label="Start full member sync to HubSpot"
                    >
                      {syncing ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" aria-hidden="true" />
                          Syncing...
                        </>
                      ) : (
                        <>
                          <Database className="h-4 w-4 mr-2" aria-hidden="true" />
                          Full Sync
                        </>
                      )}
                    </Button>
                  </div>

                  {/* Selective Sync */}
                  <div className="p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h4 className="font-semibold text-gray-900">Selective Sync</h4>
                        <p className="text-sm text-gray-600">
                          Sync specific members based on criteria
                        </p>
                      </div>
                      <Button
                        onClick={() => setShowAdvanced(!showAdvanced)}
                        variant="outline"
                        className="min-h-[44px]"
                        aria-label="Toggle advanced sync options"
                      >
                        <Settings className="h-4 w-4 mr-2" aria-hidden="true" />
                        Advanced
                      </Button>
                    </div>

                    {showAdvanced && (
                      <div className="space-y-4 mb-4 p-4 bg-gray-50 rounded-lg">
                        <div>
                          <label htmlFor="sync-criteria" className="block text-sm font-medium text-gray-700 mb-2">
                            Sync Criteria
                          </label>
                          <select
                            id="sync-criteria"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-namc-gold min-h-[44px]"
                            aria-label="Select criteria for selective sync"
                          >
                            <option value="high-engagement">High Engagement Members (80+)</option>
                            <option value="at-risk">At Risk Members</option>
                            <option value="recent-activity">Recent Activity (Last 7 days)</option>
                            <option value="no-recent-activity">No Recent Activity (30+ days)</option>
                            <option value="custom">Custom Selection</option>
                          </select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label htmlFor="member-type-sync" className="block text-sm font-medium text-gray-700 mb-2">
                              Member Type
                            </label>
                            <select
                              id="member-type-sync"
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-namc-gold min-h-[44px]"
                              aria-label="Filter by member type for sync"
                            >
                              <option value="all">All Types</option>
                              <option value="REGULAR">Regular</option>
                              <option value="PREMIUM">Premium</option>
                              <option value="EXECUTIVE">Executive</option>
                            </select>
                          </div>

                          <div>
                            <label htmlFor="date-range-sync" className="block text-sm font-medium text-gray-700 mb-2">
                              Activity Range
                            </label>
                            <select
                              id="date-range-sync"
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-namc-gold min-h-[44px]"
                              aria-label="Select activity date range for sync"
                            >
                              <option value="7d">Last 7 days</option>
                              <option value="30d">Last 30 days</option>
                              <option value="90d">Last 90 days</option>
                              <option value="all">All time</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="flex justify-end">
                      <Button
                        onClick={handleSelectiveSync}
                        disabled={syncing || !syncStatus?.hubspotConnected}
                        variant="outline"
                        className="min-h-[44px]"
                        aria-label="Start selective member sync"
                      >
                        {syncing ? (
                          <>
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" aria-hidden="true" />
                            Syncing...
                          </>
                        ) : (
                          <>
                            <UserCheck className="h-4 w-4 mr-2" aria-hidden="true" />
                            Selective Sync
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Auto Sync Settings */}
                  <div className="p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h4 className="font-semibold text-gray-900">Automatic Sync</h4>
                        <p className="text-sm text-gray-600">
                          Automatically sync engagement data on a schedule
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-600">
                          {autoSyncEnabled ? 'Enabled' : 'Disabled'}
                        </span>
                        <button
                          onClick={() => setAutoSyncEnabled(!autoSyncEnabled)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-namc-gold focus:ring-offset-2 ${
                            autoSyncEnabled ? 'bg-namc-gold' : 'bg-gray-200'
                          }`}
                          aria-label={`${autoSyncEnabled ? 'Disable' : 'Enable'} automatic sync`}
                          aria-pressed={autoSyncEnabled}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              autoSyncEnabled ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>
                    </div>

                    {autoSyncEnabled && (
                      <div>
                        <label htmlFor="sync-interval" className="block text-sm font-medium text-gray-700 mb-2">
                          Sync Interval
                        </label>
                        <select
                          id="sync-interval"
                          value={syncInterval}
                          onChange={(e) => setSyncInterval(e.target.value as '1h' | '6h' | '24h')}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-namc-gold min-h-[44px]"
                          aria-label="Select automatic sync interval"
                        >
                          <option value="1h">Every hour</option>
                          <option value="6h">Every 6 hours</option>
                          <option value="24h">Daily</option>
                        </select>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Sync Results & Status */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
          >
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Activity className="mr-2" />
                  Sync Results
                </CardTitle>
              </CardHeader>
              <CardContent>
                {syncResults ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-3 bg-green-50 rounded-lg">
                        <div className="text-lg font-bold text-green-600">
                          {syncResults.successful}
                        </div>
                        <div className="text-xs text-gray-600">Successful</div>
                      </div>
                      <div className="text-center p-3 bg-red-50 rounded-lg">
                        <div className="text-lg font-bold text-red-600">
                          {syncResults.failed}
                        </div>
                        <div className="text-xs text-gray-600">Failed</div>
                      </div>
                    </div>
                    
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-900">
                        {syncResults.totalProcessed}
                      </div>
                      <div className="text-sm text-gray-600">Total Processed</div>
                    </div>

                    <div className="pt-4 border-t">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full min-h-[44px]"
                        aria-label="Download detailed sync results"
                      >
                        <Download className="h-4 w-4 mr-2" aria-hidden="true" />
                        Download Report
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No sync operations performed yet</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Zap className="mr-2" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Button
                    variant="outline"
                    className="w-full justify-start min-h-[44px]"
                    onClick={() => window.open('https://app.hubspot.com', '_blank')}
                    aria-label="Open HubSpot dashboard in new tab"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" aria-hidden="true" />
                    Open HubSpot
                  </Button>
                  
                  <Button
                    variant="outline"
                    className="w-full justify-start min-h-[44px]"
                    aria-label="View integration logs"
                  >
                    <Activity className="h-4 w-4 mr-2" aria-hidden="true" />
                    View Logs
                  </Button>
                  
                  <Button
                    variant="outline"
                    className="w-full justify-start min-h-[44px]"
                    aria-label="Configure integration settings"
                  >
                    <Settings className="h-4 w-4 mr-2" aria-hidden="true" />
                    Settings
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Integration Help */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.7 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Integration Guide</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">What Gets Synced</h4>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li className="flex items-center">
                      <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                      Member engagement scores
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                      Project interaction data
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                      Risk level assessments
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                      Activity trends and streaks
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                      Project inquiry deals
                    </li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">Automated Workflows</h4>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li className="flex items-center">
                      <Target className="h-4 w-4 text-blue-500 mr-2" />
                      High engagement recognition
                    </li>
                    <li className="flex items-center">
                      <Target className="h-4 w-4 text-blue-500 mr-2" />
                      At-risk member outreach
                    </li>
                    <li className="flex items-center">
                      <Target className="h-4 w-4 text-blue-500 mr-2" />
                      Project inquiry follow-up
                    </li>
                    <li className="flex items-center">
                      <Target className="h-4 w-4 text-blue-500 mr-2" />
                      Activity streak rewards
                    </li>
                    <li className="flex items-center">
                      <Target className="h-4 w-4 text-blue-500 mr-2" />
                      Lifecycle stage updates
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </main>
    </ErrorBoundary>
  )
}
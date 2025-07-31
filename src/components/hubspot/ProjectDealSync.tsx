'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { 
  DollarSign, 
  CheckCircle, 
  XCircle, 
  RefreshCw,
  Building,
  Calendar,
  MapPin,
  User,
  FileText,
  ExternalLink,
  Eye,
  EyeOff,
  TrendingUp
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { useSession } from 'next-auth/react'
import { useHubSpotSync } from '@/hooks/useHubSpot'

interface ProjectDealData {
  projectId: string
  memberId: string
  dealName: string
  amount: number
  closeDate: string
  projectType?: string
  location?: string
  budgetRange?: string
}

interface DealSyncResult {
  success: boolean
  dealId?: string
  message: string
  hubspotUrl?: string
  data?: any
}

export default function ProjectDealSync() {
  const { data: session } = useSession()
  const [dealData, setDealData] = useState<ProjectDealData>({
    projectId: 'proj_' + Date.now(),
    memberId: session?.user?.id || 'member_' + Date.now(),
    dealName: 'Oakland Community Center Renovation',
    amount: 850000,
    closeDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 90 days from now
    projectType: 'Commercial',
    location: 'Oakland, CA',
    budgetRange: '$500k-$1M'
  })

  const [syncResult, setSyncResult] = useState<DealSyncResult | null>(null)
  const [isVisible, setIsVisible] = useState(false)
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null)

  const { createDeal, isSyncing, error } = useHubSpotSync({
    onSuccess: (data) => {
      setSyncResult({
        success: true,
        dealId: data.result?.id,
        message: 'Deal successfully created in HubSpot',
        hubspotUrl: data.result?.id ? `https://app.hubspot.com/contacts/243384888/deal/${data.result.id}` : undefined,
        data: data.result
      })
      setLastSyncTime(new Date())
    },
    onError: (error) => {
      setSyncResult({
        success: false,
        message: `Deal creation failed: ${error.message}`,
        data: error
      })
    }
  })

  const handleCreateDeal = async () => {
    setSyncResult(null)
    try {
      await createDeal(dealData)
    } catch (err) {
      // Error is handled by the hook
    }
  }

  const handleInputChange = (field: keyof ProjectDealData, value: string | number) => {
    setDealData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const getSyncStatusIcon = () => {
    if (isSyncing) {
      return <RefreshCw className="w-5 h-5 animate-spin text-blue-500" />
    }
    if (syncResult?.success) {
      return <CheckCircle className="w-5 h-5 text-green-500" />
    }
    if (syncResult && !syncResult.success) {
      return <XCircle className="w-5 h-5 text-red-500" />
    }
    return <DollarSign className="w-5 h-5 text-gray-400" />
  }

  const getSyncStatusText = () => {
    if (isSyncing) return 'Creating deal in HubSpot...'
    if (syncResult?.success) return 'Deal successfully created in HubSpot'
    if (syncResult && !syncResult.success) return 'Deal creation failed'
    if (lastSyncTime) return `Last created: ${lastSyncTime.toLocaleString()}`
    return 'Ready to create deal'
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center space-x-2">
            <DollarSign className="w-5 h-5" />
            <span>Project-to-Deal Conversion Testing</span>
          </CardTitle>
          <p className="text-sm text-gray-600 mt-1">
            Test project opportunity conversion to HubSpot deals
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsVisible(!isVisible)}
            className="flex items-center space-x-1"
          >
            {isVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            <span>{isVisible ? 'Hide' : 'Show'}</span>
          </Button>
        </div>
      </CardHeader>

      {isVisible && (
        <CardContent className="space-y-6">
          {/* Sync Status */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`p-4 rounded-lg border ${
              syncResult?.success 
                ? 'bg-green-50 border-green-200'
                : syncResult && !syncResult.success
                ? 'bg-red-50 border-red-200'
                : isSyncing
                ? 'bg-blue-50 border-blue-200'
                : 'bg-gray-50 border-gray-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {getSyncStatusIcon()}
                <div>
                  <p className="font-medium text-gray-900">{getSyncStatusText()}</p>
                  {syncResult?.message && (
                    <p className="text-sm text-gray-600 mt-1">{syncResult.message}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {syncResult?.hubspotUrl && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(syncResult.hubspotUrl, '_blank')}
                    className="flex items-center space-x-1"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>View Deal in HubSpot</span>
                  </Button>
                )}
                <Button
                  onClick={handleCreateDeal}
                  disabled={isSyncing}
                  className="flex items-center space-x-2"
                >
                  <DollarSign className="w-4 h-4" />
                  <span>Create Deal in HubSpot</span>
                </Button>
              </div>
            </div>
          </motion.div>

          {/* Deal Data Form */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Project Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 flex items-center space-x-2">
                <Building className="w-5 h-5" />
                <span>Project Information</span>
              </h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <FileText className="w-4 h-4 inline mr-1" />
                  Deal Name
                </label>
                <Input
                  value={dealData.dealName}
                  onChange={(e) => handleInputChange('dealName', e.target.value)}
                  placeholder="Oakland Community Center Renovation"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Project Type
                </label>
                <select
                  value={dealData.projectType || ''}
                  onChange={(e) => handleInputChange('projectType', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
                >
                  <option value="">Select Type</option>
                  <option value="Residential">Residential</option>
                  <option value="Commercial">Commercial</option>
                  <option value="Industrial">Industrial</option>
                  <option value="Infrastructure">Infrastructure</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <MapPin className="w-4 h-4 inline mr-1" />
                  Location
                </label>
                <Input
                  value={dealData.location || ''}
                  onChange={(e) => handleInputChange('location', e.target.value)}
                  placeholder="Oakland, CA"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Project ID
                  </label>
                  <Input
                    value={dealData.projectId}
                    onChange={(e) => handleInputChange('projectId', e.target.value)}
                    placeholder="proj_12345"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Member ID
                  </label>
                  <Input
                    value={dealData.memberId}
                    onChange={(e) => handleInputChange('memberId', e.target.value)}
                    placeholder="member_456"
                  />
                </div>
              </div>
            </div>

            {/* Financial Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 flex items-center space-x-2">
                <TrendingUp className="w-5 h-5" />
                <span>Financial Information</span>
              </h3>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <DollarSign className="w-4 h-4 inline mr-1" />
                  Deal Amount
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                  <Input
                    type="number"
                    value={dealData.amount}
                    onChange={(e) => handleInputChange('amount', parseInt(e.target.value) || 0)}
                    placeholder="850000"
                    className="pl-8"
                  />
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  Formatted: {formatCurrency(dealData.amount)}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Budget Range
                </label>
                <select
                  value={dealData.budgetRange || ''}
                  onChange={(e) => handleInputChange('budgetRange', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
                >
                  <option value="">Select Range</option>
                  <option value="$0-$50k">$0 - $50k</option>
                  <option value="$50k-$100k">$50k - $100k</option>
                  <option value="$100k-$250k">$100k - $250k</option>
                  <option value="$250k-$500k">$250k - $500k</option>
                  <option value="$500k-$1M">$500k - $1M</option>
                  <option value="$1M+">$1M+</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  Expected Close Date
                </label>
                <Input
                  type="date"
                  value={dealData.closeDate}
                  onChange={(e) => handleInputChange('closeDate', e.target.value)}
                />
              </div>

              {/* Deal Preview */}
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">Deal Summary</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Amount:</span>
                    <span className="font-medium">{formatCurrency(dealData.amount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Type:</span>
                    <span className="font-medium">{dealData.projectType || 'Not specified'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Location:</span>
                    <span className="font-medium">{dealData.location || 'Not specified'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Close Date:</span>
                    <span className="font-medium">
                      {new Date(dealData.closeDate).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Raw Data Preview */}
          {syncResult?.data && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6"
            >
              <h3 className="text-lg font-medium text-gray-900 mb-3">HubSpot Deal Response</h3>
              <div className="bg-gray-100 rounded-lg p-4 overflow-x-auto">
                <pre className="text-xs text-gray-800">
                  {JSON.stringify(syncResult.data, null, 2)}
                </pre>
              </div>
            </motion.div>
          )}

          {/* Error Details */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg"
            >
              <div className="flex items-center space-x-2 mb-2">
                <XCircle className="w-5 h-5 text-red-500" />
                <h3 className="text-lg font-medium text-red-800">Deal Creation Error</h3>
              </div>
              <p className="text-red-700">{error.message}</p>
            </motion.div>
          )}

          {/* Instructions */}
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="text-lg font-medium text-blue-800 mb-2">Testing Instructions</h3>
            <ol className="list-decimal list-inside text-blue-700 space-y-1 text-sm">
              <li>Modify the project and financial data fields above</li>
              <li>Click "Create Deal in HubSpot" to convert the project to a deal</li>
              <li>Check the creation status and click "View Deal in HubSpot" to see the deal</li>
              <li>Test different project types, amounts, and date scenarios</li>
              <li>Test with various member IDs to verify contact associations</li>
              <li>Verify deal pipeline stage and properties in HubSpot</li>
            </ol>
          </div>
        </CardContent>
      )}
    </Card>
  )
}
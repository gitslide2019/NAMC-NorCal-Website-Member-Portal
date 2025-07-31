'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { 
  Sync, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  RefreshCw,
  User,
  Building,
  Mail,
  Phone,
  Award,
  Calendar,
  ExternalLink,
  Eye,
  EyeOff
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { useSession } from 'next-auth/react'
import { useHubSpotSync } from '@/hooks/useHubSpot'

interface MemberProfileData {
  userId: string
  properties: {
    firstname: string
    lastname: string
    email: string
    company?: string
    phone?: string
    jobtitle?: string
    specialties?: string
    membership_tier?: string
    membership_status?: string
    years_experience?: string
    certifications?: string
  }
}

interface SyncResult {
  success: boolean
  contactId?: string
  message: string
  hubspotUrl?: string
  data?: any
}

export default function MemberProfileSync() {
  const { data: session } = useSession()
  const [profileData, setProfileData] = useState<MemberProfileData>({
    userId: session?.user?.id || 'test_user_' + Date.now(),
    properties: {
      firstname: session?.user?.name?.split(' ')[0] || 'John',
      lastname: session?.user?.name?.split(' ').slice(1).join(' ') || 'Doe',
      email: session?.user?.email || 'john.doe@namcnorcal.org',
      company: 'NAMC Test Construction Co',
      phone: '(415) 555-0123',
      jobtitle: 'Project Manager',
      specialties: 'Residential Construction, Commercial Construction',
      membership_tier: 'Gold',
      membership_status: 'Active',
      years_experience: '15',
      certifications: 'OSHA 30, PMP, LEED AP'
    }
  })

  const [syncResult, setSyncResult] = useState<SyncResult | null>(null)
  const [isVisible, setIsVisible] = useState(false)
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null)

  const { syncContact, isSyncing, error } = useHubSpotSync({
    onSuccess: (data) => {
      setSyncResult({
        success: true,
        contactId: data.contact?.id,
        message: 'Profile successfully synced to HubSpot',
        hubspotUrl: data.contact?.id ? `https://app.hubspot.com/contacts/243384888/contact/${data.contact.id}` : undefined,
        data: data.contact
      })
      setLastSyncTime(new Date())
    },
    onError: (error) => {
      setSyncResult({
        success: false,
        message: `Sync failed: ${error.message}`,
        data: error
      })
    }
  })

  const handleSync = async () => {
    setSyncResult(null)
    try {
      await syncContact(profileData)
    } catch (err) {
      // Error is handled by the hook
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setProfileData(prev => ({
      ...prev,
      properties: {
        ...prev.properties,
        [field]: value
      }
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
    return <Sync className="w-5 h-5 text-gray-400" />
  }

  const getSyncStatusText = () => {
    if (isSyncing) return 'Syncing to HubSpot...'
    if (syncResult?.success) return 'Successfully synced to HubSpot'
    if (syncResult && !syncResult.success) return 'Sync failed'
    if (lastSyncTime) return `Last synced: ${lastSyncTime.toLocaleString()}`
    return 'Ready to sync'
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center space-x-2">
            <User className="w-5 h-5" />
            <span>Member Profile HubSpot Sync</span>
          </CardTitle>
          <p className="text-sm text-gray-600 mt-1">
            Test member profile synchronization with HubSpot CRM
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
                    <span>View in HubSpot</span>
                  </Button>
                )}
                <Button
                  onClick={handleSync}
                  disabled={isSyncing}
                  className="flex items-center space-x-2"
                >
                  <Sync className="w-4 h-4" />
                  <span>Sync to HubSpot</span>
                </Button>
              </div>
            </div>
          </motion.div>

          {/* Profile Data Form */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Personal Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 flex items-center space-x-2">
                <User className="w-5 h-5" />
                <span>Personal Information</span>
              </h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    First Name
                  </label>
                  <Input
                    value={profileData.properties.firstname}
                    onChange={(e) => handleInputChange('firstname', e.target.value)}
                    placeholder="John"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Last Name
                  </label>
                  <Input
                    value={profileData.properties.lastname}
                    onChange={(e) => handleInputChange('lastname', e.target.value)}
                    placeholder="Doe"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Mail className="w-4 h-4 inline mr-1" />
                  Email Address
                </label>
                <Input
                  type="email"
                  value={profileData.properties.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="john.doe@namcnorcal.org"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Phone className="w-4 h-4 inline mr-1" />
                  Phone Number
                </label>
                <Input
                  value={profileData.properties.phone || ''}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  placeholder="(415) 555-0123"
                />
              </div>
            </div>

            {/* Professional Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 flex items-center space-x-2">
                <Building className="w-5 h-5" />
                <span>Professional Information</span>
              </h3>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Company Name
                </label>
                <Input
                  value={profileData.properties.company || ''}
                  onChange={(e) => handleInputChange('company', e.target.value)}
                  placeholder="NAMC Test Construction Co"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Job Title
                </label>
                <Input
                  value={profileData.properties.jobtitle || ''}
                  onChange={(e) => handleInputChange('jobtitle', e.target.value)}
                  placeholder="Project Manager"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Specialties
                </label>
                <Input
                  value={profileData.properties.specialties || ''}
                  onChange={(e) => handleInputChange('specialties', e.target.value)}
                  placeholder="Residential Construction, Commercial Construction"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Calendar className="w-4 h-4 inline mr-1" />
                    Years Experience
                  </label>
                  <Input
                    type="number"
                    value={profileData.properties.years_experience || ''}
                    onChange={(e) => handleInputChange('years_experience', e.target.value)}
                    placeholder="15"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Membership Tier
                  </label>
                  <select
                    value={profileData.properties.membership_tier || ''}
                    onChange={(e) => handleInputChange('membership_tier', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  >
                    <option value="">Select Tier</option>
                    <option value="Bronze">Bronze</option>
                    <option value="Silver">Silver</option>
                    <option value="Gold">Gold</option>
                    <option value="Platinum">Platinum</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Award className="w-4 h-4 inline mr-1" />
                  Certifications
                </label>
                <Input
                  value={profileData.properties.certifications || ''}
                  onChange={(e) => handleInputChange('certifications', e.target.value)}
                  placeholder="OSHA 30, PMP, LEED AP"
                />
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
              <h3 className="text-lg font-medium text-gray-900 mb-3">HubSpot Response Data</h3>
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
                <h3 className="text-lg font-medium text-red-800">Sync Error</h3>
              </div>
              <p className="text-red-700">{error.message}</p>
            </motion.div>
          )}

          {/* Instructions */}
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="text-lg font-medium text-blue-800 mb-2">Testing Instructions</h3>
            <ol className="list-decimal list-inside text-blue-700 space-y-1 text-sm">
              <li>Modify the profile data fields above to test different data scenarios</li>
              <li>Click "Sync to HubSpot" to send the data to HubSpot CRM</li>
              <li>Check the sync status and click "View in HubSpot" to see the contact</li>
              <li>Test duplicate email handling by syncing the same email multiple times</li>
              <li>Test data updates by changing fields and syncing again</li>
            </ol>
          </div>
        </CardContent>
      )}
    </Card>
  )
}
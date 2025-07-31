import { useState, useCallback } from 'react'

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

interface UseHubSpotIntegrationReturn {
  // State
  syncStatus: SyncStatus | null
  loading: boolean
  syncing: boolean
  error: string | null
  syncResults: SyncResult | null
  
  // Actions
  loadSyncStatus: () => Promise<void>
  syncAllMembers: () => Promise<void>
  syncSpecificMembers: (memberIds: string[]) => Promise<void>
  createProjectDeal: (dealData: {
    memberId: string
    memberEmail: string
    memberName: string
    projectId: string
    projectTitle: string
    projectBudget?: string
    projectDeadline?: string
    projectCategory?: string
    inquiryType?: string
    contactMethod?: string
    message?: string
  }) => Promise<string | null>
  testConnection: () => Promise<boolean>
  clearError: () => void
  clearResults: () => void
}

export function useHubSpotIntegration(): UseHubSpotIntegrationReturn {
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [syncResults, setSyncResults] = useState<SyncResult | null>(null)

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const clearResults = useCallback(() => {
    setSyncResults(null)
  }, [])

  const loadSyncStatus = useCallback(async () => {
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
  }, [])

  const syncAllMembers = useCallback(async () => {
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
        // Refresh sync status after successful sync
        await loadSyncStatus()
      } else {
        throw new Error(data.error || 'Full sync failed')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Full sync operation failed')
    } finally {
      setSyncing(false)
    }
  }, [loadSyncStatus])

  const syncSpecificMembers = useCallback(async (memberIds: string[]) => {
    if (memberIds.length === 0) {
      setError('No members selected for sync')
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
        body: JSON.stringify({ memberIds })
      })

      const data = await response.json()

      if (data.success) {
        setSyncResults(data.data)
      } else {
        throw new Error(data.error || 'Selective sync failed')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Selective sync failed')
    } finally {
      setSyncing(false)
    }
  }, [])

  const createProjectDeal = useCallback(async (dealData: {
    memberId: string
    memberEmail: string
    memberName: string
    projectId: string
    projectTitle: string
    projectBudget?: string
    projectDeadline?: string
    projectCategory?: string
    inquiryType?: string
    contactMethod?: string
    message?: string
  }) => {
    try {
      setError(null)

      const response = await fetch('/api/hubspot/create-deal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(dealData)
      })

      const data = await response.json()

      if (data.success) {
        // Optionally refresh sync status to reflect new deal
        await loadSyncStatus()
        return data.data.dealId
      } else {
        throw new Error(data.error || 'Failed to create project deal')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Deal creation failed')
      return null
    }
  }, [loadSyncStatus])

  const testConnection = useCallback(async () => {
    try {
      setError(null)
      
      const response = await fetch('/api/hubspot/sync-engagement')
      const data = await response.json()

      if (data.success && data.data.hubspotConnected) {
        return true
      } else {
        setError('HubSpot connection failed. Please check your API configuration.')
        return false
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection test failed')
      return false
    }
  }, [])

  return {
    // State
    syncStatus,
    loading,
    syncing,
    error,
    syncResults,
    
    // Actions
    loadSyncStatus,
    syncAllMembers,
    syncSpecificMembers,
    createProjectDeal,
    testConnection,
    clearError,
    clearResults
  }
}

// Utility function to automatically create deals when members show interest
export async function autoCreateDealFromEngagement(
  engagementData: {
    memberId: string
    memberEmail: string
    memberName: string
    projectId: string
    projectTitle: string
    projectBudget?: string
    projectDeadline?: string
    projectCategory?: string
    engagementScore: number
  }
): Promise<string | null> {
  // Only create deals for high engagement (80+ score) to avoid noise
  if (engagementData.engagementScore < 80) {
    return null
  }

  try {
    const response = await fetch('/api/hubspot/create-deal', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ...engagementData,
        inquiryType: 'interest',
        contactMethod: 'Portal',
        message: `High engagement detected (${engagementData.engagementScore} score) - automatically created from member activity tracking.`
      })
    })

    const data = await response.json()
    return data.success ? data.data.dealId : null
  } catch (error) {
    console.error('Auto deal creation failed:', error)
    return null
  }
}

// Utility function to sync a member's engagement immediately after significant activity
export async function syncMemberAfterActivity(
  memberId: string,
  activityType: 'view' | 'download' | 'inquiry' | 'interest'
): Promise<boolean> {
  // Only sync for high-value activities to avoid excessive API calls
  const highValueActivities = ['inquiry', 'interest']
  if (!highValueActivities.includes(activityType)) {
    return true // Skip sync but don't report as failure
  }

  try {
    const response = await fetch('/api/hubspot/sync-engagement', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ memberIds: [memberId] })
    })

    const data = await response.json()
    return data.success && data.data.successful > 0
  } catch (error) {
    console.error('Activity-triggered sync failed:', error)
    return false
  }
}
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'

/**
 * Automatic HubSpot sync hook for NAMC members
 * This runs automatically when members access the portal
 * It's a value-added service included with their membership
 */

interface HubSpotSyncStatus {
  isInitialized: boolean
  isSyncing: boolean
  syncSuccess: boolean
  contactId?: string
  isNewContact?: boolean
  error?: string
  lastSyncTime?: Date
}

export function useAutoHubSpotSync() {
  const { data: session, status } = useSession()
  const [syncStatus, setSyncStatus] = useState<HubSpotSyncStatus>({
    isInitialized: false,
    isSyncing: false,
    syncSuccess: false
  })

  useEffect(() => {
    // Only sync when session is loaded and user is authenticated
    if (status === 'loading' || !session?.user) return

    const syncMemberToHubSpot = async () => {
      setSyncStatus(prev => ({ ...prev, isSyncing: true }))
      
      try {
        const response = await fetch('/api/member/hubspot-sync', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        })

        const result = await response.json()

        if (result.success) {
          setSyncStatus(prev => ({
            ...prev,
            isInitialized: true,
            isSyncing: false,
            syncSuccess: true,
            contactId: result.data.contactId,
            isNewContact: result.data.isNewContact,
            lastSyncTime: new Date(),
            error: undefined
          }))

          // Store sync status in localStorage to avoid re-syncing on every page load
          localStorage.setItem('hubspot_sync_status', JSON.stringify({
            lastSync: new Date().toISOString(),
            contactId: result.data.contactId
          }))

        } else {
          throw new Error(result.error || 'Sync failed')
        }

      } catch (error) {
        console.error('Auto HubSpot sync failed:', error)
        setSyncStatus(prev => ({
          ...prev,
          isInitialized: true,
          isSyncing: false,
          syncSuccess: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }))
      }
    }

    // Check if we already synced recently (within last hour)
    const lastSync = localStorage.getItem('hubspot_sync_status')
    if (lastSync) {
      try {
        const syncData = JSON.parse(lastSync)
        const lastSyncDate = new Date(syncData.lastSync)
        const hourAgo = new Date(Date.now() - 60 * 60 * 1000)
        
        if (lastSyncDate > hourAgo) {
          // Recently synced, no need to sync again
          setSyncStatus({
            isInitialized: true,
            isSyncing: false,
            syncSuccess: true,
            contactId: syncData.contactId,
            lastSyncTime: lastSyncDate
          })
          return
        }
      } catch (e) {
        // Invalid data in localStorage, proceed with sync
      }
    }

    // Perform automatic sync
    syncMemberToHubSpot()

  }, [session, status])

  return syncStatus
}

/**
 * Hook to track member activities in HubSpot
 */
export function useHubSpotActivityTracking() {
  const { data: session } = useSession()

  const trackActivity = async (activity: {
    type: 'portal_login' | 'project_view' | 'project_apply' | 'resource_download' | 'event_rsvp' | 'directory_search'
    details: string
  }) => {
    if (!session?.user) return

    try {
      await fetch('/api/member/hubspot-activity', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          activity: {
            ...activity,
            timestamp: new Date().toISOString()
          }
        })
      })
    } catch (error) {
      console.error('Activity tracking failed:', error)
      // Don't throw - activity tracking shouldn't break user experience
    }
  }

  return { trackActivity }
}

/**
 * Hook to fetch member's HubSpot data for dashboard
 */
export function useHubSpotMemberData() {
  const { data: session } = useSession()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchHubSpotData = async () => {
    if (!session?.user) return

    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/member/hubspot-sync')
      const result = await response.json()

      if (result.success) {
        setData(result.data)
      } else {
        throw new Error(result.error)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch HubSpot data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchHubSpotData()
  }, [session])

  return {
    data,
    loading,
    error,
    refresh: fetchHubSpotData
  }
}
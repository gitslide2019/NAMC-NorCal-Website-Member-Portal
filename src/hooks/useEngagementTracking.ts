import React, { useEffect, useRef, useCallback } from 'react'
import { useSession } from 'next-auth/react'

/**
 * Custom hook for tracking member engagement with projects
 * Provides easy-to-use methods for tracking various engagement activities
 */

interface TrackingOptions {
  projectId: string
  enableViewTracking?: boolean
  enableScrollTracking?: boolean
  viewDurationThreshold?: number // minimum seconds before tracking a view
  scrollThreshold?: number // percentage of page scrolled before tracking
}

interface EngagementHookReturn {
  trackView: (data?: Partial<ViewTrackingData>) => Promise<void>
  trackInterest: (data: InterestTrackingData) => Promise<void>
  trackDocumentAccess: (data: DocumentTrackingData) => Promise<void>
  trackInquiry: (data: InquiryTrackingData) => Promise<void>
  startViewTracking: () => void
  stopViewTracking: () => void
  isTracking: boolean
}

interface ViewTrackingData {
  referrerSource?: string
  viewDuration?: number
  pagesViewed?: string[]
}

interface InterestTrackingData {
  interestLevel: 'high' | 'medium' | 'low'
  interestType: 'viewing' | 'bookmark' | 'inquiry' | 'bid_intent'
  notes?: string
  metadata?: Record<string, any>
}

interface DocumentTrackingData {
  documentId: string
  accessType: 'view' | 'download' | 'print'
}

interface InquiryTrackingData {
  inquiryType: 'question' | 'clarification' | 'site_visit' | 'meeting'
  subject: string
  message: string
  priorityLevel?: 'low' | 'medium' | 'high' | 'urgent'
}

export function useEngagementTracking(options: TrackingOptions): EngagementHookReturn {
  const { data: session } = useSession()
  const {
    projectId,
    enableViewTracking = true,
    enableScrollTracking = true,
    viewDurationThreshold = 10, // 10 seconds
    scrollThreshold = 50 // 50%
  } = options

  // Refs for tracking state
  const viewStartTime = useRef<number | null>(null)
  const maxScrollPercentage = useRef<number>(0)
  const pagesViewed = useRef<Set<string>>(new Set())
  const isTracking = useRef<boolean>(false)
  const trackingInterval = useRef<NodeJS.Timeout | null>(null)

  // API call helper
  const trackActivity = useCallback(async (type: string, data: any) => {
    if (!session?.user) return

    try {
      const response = await fetch('/api/engagement/track', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type,
          data: {
            ...data,
            projectId
          }
        }),
      })

      if (!response.ok) {
        throw new Error(`Failed to track ${type}`)
      }

      const result = await response.json()
      return result
    } catch (error) {
      console.error(`Error tracking ${type}:`, error)
      throw error
    }
  }, [session, projectId])

  // Track project view
  const trackView = useCallback(async (data: Partial<ViewTrackingData> = {}) => {
    const viewDuration = viewStartTime.current 
      ? Math.floor((Date.now() - viewStartTime.current) / 1000)
      : 0

    if (viewDuration < viewDurationThreshold) {
      return // Don't track very short views
    }

    const viewData: ViewTrackingData = {
      viewDuration,
      pagesViewed: Array.from(pagesViewed.current),
      referrerSource: document.referrer || 'direct',
      ...data
    }

    await trackActivity('view', viewData)
  }, [trackActivity, viewDurationThreshold])

  // Track interest level
  const trackInterest = useCallback(async (data: InterestTrackingData) => {
    await trackActivity('interest', data)
  }, [trackActivity])

  // Track document access
  const trackDocumentAccess = useCallback(async (data: DocumentTrackingData) => {
    await trackActivity('document', data)
  }, [trackActivity])

  // Track inquiry
  const trackInquiry = useCallback(async (data: InquiryTrackingData) => {
    await trackActivity('inquiry', data)
  }, [trackActivity])

  // Get current page identifier
  const getCurrentPage = useCallback(() => {
    const path = window.location.pathname
    const hash = window.location.hash
    return hash ? `${path}${hash}` : path
  }, [])

  // Handle scroll tracking
  const handleScroll = useCallback(() => {
    if (!enableScrollTracking) return

    const scrollTop = window.pageYOffset || document.documentElement.scrollTop
    const scrollHeight = document.documentElement.scrollHeight - window.innerHeight
    const scrollPercentage = scrollHeight > 0 ? Math.round((scrollTop / scrollHeight) * 100) : 0

    maxScrollPercentage.current = Math.max(maxScrollPercentage.current, scrollPercentage)

    // Track page as viewed if scrolled past threshold
    if (scrollPercentage >= scrollThreshold) {
      pagesViewed.current.add(getCurrentPage())
    }
  }, [enableScrollTracking, scrollThreshold, getCurrentPage])

  // Start view tracking
  const startViewTracking = useCallback(() => {
    if (!session?.user || isTracking.current) return

    viewStartTime.current = Date.now()
    maxScrollPercentage.current = 0
    pagesViewed.current.clear()
    pagesViewed.current.add(getCurrentPage())
    isTracking.current = true

    // Set up scroll tracking
    if (enableScrollTracking) {
      window.addEventListener('scroll', handleScroll, { passive: true })
      // Initial scroll check
      handleScroll()
    }

    // Set up periodic view updates (every 30 seconds)
    trackingInterval.current = setInterval(() => {
      if (isTracking.current) {
        trackView().catch(console.error)
      }
    }, 30000)
  }, [session, enableScrollTracking, handleScroll, getCurrentPage, trackView])

  // Stop view tracking
  const stopViewTracking = useCallback(async () => {
    if (!isTracking.current) return

    isTracking.current = false

    // Clear interval
    if (trackingInterval.current) {
      clearInterval(trackingInterval.current)
      trackingInterval.current = null
    }

    // Remove scroll listener
    if (enableScrollTracking) {
      window.removeEventListener('scroll', handleScroll)
    }

    // Track final view with complete data
    await trackView()

    // Reset state
    viewStartTime.current = null
    maxScrollPercentage.current = 0
    pagesViewed.current.clear()
  }, [enableScrollTracking, handleScroll, trackView])

  // Auto-start tracking when enabled
  useEffect(() => {
    if (enableViewTracking && session?.user && projectId) {
      startViewTracking()
    }

    return () => {
      stopViewTracking()
    }
  }, [enableViewTracking, session, projectId, startViewTracking, stopViewTracking])

  // Handle page visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && isTracking.current) {
        // Track view when page becomes hidden
        trackView().catch(console.error)
      } else if (document.visibilityState === 'visible' && enableViewTracking) {
        // Restart tracking when page becomes visible
        viewStartTime.current = Date.now()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [enableViewTracking, trackView])

  // Handle beforeunload to track final view
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (isTracking.current) {
        // Use navigator.sendBeacon for reliable tracking on page unload
        const viewDuration = viewStartTime.current 
          ? Math.floor((Date.now() - viewStartTime.current) / 1000)
          : 0

        if (viewDuration >= viewDurationThreshold) {
          const data = JSON.stringify({
            type: 'view',
            data: {
              projectId,
              viewDuration,
              pagesViewed: Array.from(pagesViewed.current),
              referrerSource: document.referrer || 'direct'
            }
          })

          navigator.sendBeacon('/api/engagement/track', data)
        }
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [projectId, viewDurationThreshold])

  return {
    trackView,
    trackInterest,
    trackDocumentAccess,
    trackInquiry,
    startViewTracking,
    stopViewTracking,
    isTracking: isTracking.current
  }
}

// Higher-order component for automatic engagement tracking
export function withEngagementTracking<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  trackingOptions: TrackingOptions
) {
  return function EnhancedComponent(props: P) {
    const engagement = useEngagementTracking(trackingOptions)

    return React.createElement(WrappedComponent, { ...props, engagement } as any)
  }
}
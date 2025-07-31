import { useEffect, useRef, useCallback } from 'react'
import { debounce } from 'lodash'

interface AutoSaveOptions {
  data: any
  onSave: (data: any) => Promise<void>
  delay?: number
  enabled?: boolean
  storageKey?: string
}

export function useAutoSave({
  data,
  onSave,
  delay = 30000, // 30 seconds default
  enabled = true,
  storageKey
}: AutoSaveOptions) {
  const savedDataRef = useRef<string>('')
  const isSavingRef = useRef(false)

  // Save to localStorage for recovery
  const saveToLocalStorage = useCallback((data: any) => {
    if (storageKey) {
      try {
        localStorage.setItem(storageKey, JSON.stringify({
          data,
          timestamp: new Date().toISOString()
        }))
      } catch (error) {
        console.error('Failed to save to localStorage:', error)
      }
    }
  }, [storageKey])

  // Load from localStorage
  const loadFromLocalStorage = useCallback(() => {
    if (!storageKey) return null
    
    try {
      const stored = localStorage.getItem(storageKey)
      if (stored) {
        const { data, timestamp } = JSON.parse(stored)
        const age = Date.now() - new Date(timestamp).getTime()
        // Only return if less than 24 hours old
        if (age < 24 * 60 * 60 * 1000) {
          return data
        }
      }
    } catch (error) {
      console.error('Failed to load from localStorage:', error)
    }
    return null
  }, [storageKey])

  // Clear localStorage
  const clearLocalStorage = useCallback(() => {
    if (storageKey) {
      localStorage.removeItem(storageKey)
    }
  }, [storageKey])

  // Debounced save function
  const debouncedSave = useRef(
    debounce(async (data: any) => {
      if (isSavingRef.current) return
      
      const currentData = JSON.stringify(data)
      if (currentData === savedDataRef.current) return
      
      isSavingRef.current = true
      try {
        await onSave(data)
        savedDataRef.current = currentData
        // Clear localStorage after successful save
        clearLocalStorage()
      } catch (error) {
        console.error('Auto-save failed:', error)
        // Keep in localStorage if save failed
        saveToLocalStorage(data)
      } finally {
        isSavingRef.current = false
      }
    }, 2000) // 2 second debounce
  ).current

  // Effect for auto-save
  useEffect(() => {
    if (!enabled) return

    const autoSaveTimer = setInterval(() => {
      debouncedSave(data)
    }, delay)

    // Save on visibility change
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        debouncedSave.flush()
      }
    }

    // Save before unload
    const handleBeforeUnload = () => {
      debouncedSave.flush()
      saveToLocalStorage(data)
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      clearInterval(autoSaveTimer)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('beforeunload', handleBeforeUnload)
      debouncedSave.cancel()
    }
  }, [data, delay, enabled, debouncedSave, saveToLocalStorage])

  // Save immediately when data changes
  useEffect(() => {
    if (enabled) {
      saveToLocalStorage(data)
      debouncedSave(data)
    }
  }, [data, enabled, debouncedSave, saveToLocalStorage])

  return {
    saveNow: () => debouncedSave.flush(),
    isSaving: isSavingRef.current,
    loadDraft: loadFromLocalStorage,
    clearDraft: clearLocalStorage
  }
}
'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  Map, 
  Settings, 
  Save, 
  TestTube,
  CheckCircle,
  AlertCircle,
  ArrowLeft
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import Button from '@/components/ui/Button'
import MapConfiguration from '@/components/ui/MapConfiguration'

interface MapSettings {
  apiKey: string
  defaultCenter: { latitude: number; longitude: number }
  defaultZoom: number
  enabledLayers: string[]
  isConfigured: boolean
}

export default function MapSettingsPage() {
  const router = useRouter()
  const [settings, setSettings] = useState<MapSettings>({
    apiKey: '',
    defaultCenter: { latitude: 37.7749, longitude: -122.4194 }, // San Francisco
    defaultZoom: 10,
    enabledLayers: ['projects', 'team_locations'],
    isConfigured: false
  })
  const [isSaving, setIsSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle')

  // Load existing settings
  useEffect(() => {
    const loadSettings = () => {
      try {
        const saved = localStorage.getItem('namc-map-settings')
        if (saved) {
          const parsedSettings = JSON.parse(saved)
          setSettings(prev => ({
            ...prev,
            ...parsedSettings,
            isConfigured: !!parsedSettings.apiKey
          }))
        }
      } catch (error) {
        console.error('Failed to load map settings:', error)
      }
    }

    loadSettings()
  }, [])

  const handleConfigSave = async (config: {
    apiKey: string
    defaultCenter: { latitude: number; longitude: number }
    defaultZoom: number
    enabledLayers: string[]
  }) => {
    setIsSaving(true)
    setSaveStatus('idle')

    try {
      // Save to localStorage (in a real app, this would be an API call)
      const newSettings: MapSettings = {
        ...config,
        isConfigured: !!config.apiKey.trim()
      }

      localStorage.setItem('namc-map-settings', JSON.stringify(newSettings))
      setSettings(newSettings)
      setSaveStatus('success')

      // Auto-hide success message after 3 seconds
      setTimeout(() => setSaveStatus('idle'), 3000)

    } catch (error) {
      console.error('Failed to save map settings:', error)
      setSaveStatus('error')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-4 mb-4">
            <Button
              variant="outline"
              onClick={() => router.back()}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </Button>
          </div>

          <div className="flex items-center space-x-3">
            <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-full">
              <Map className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Map Settings
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Configure ArcGIS integration for project location mapping
              </p>
            </div>
          </div>
        </div>

        {/* Status Banner */}
        {settings.isConfigured ? (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4"
          >
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
              <div>
                <h3 className="font-medium text-green-800 dark:text-green-200">
                  Map Integration Active
                </h3>
                <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                  Your ArcGIS integration is configured and ready to use. Project locations will be displayed on interactive maps.
                </p>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4"
          >
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              <div>
                <h3 className="font-medium text-orange-800 dark:text-orange-200">
                  Map Integration Not Configured
                </h3>
                <p className="text-sm text-orange-700 dark:text-orange-300 mt-1">
                  Add your ArcGIS API key below to enable interactive project location mapping.
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Save Status */}
        {saveStatus !== 'idle' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`mb-6 p-4 rounded-lg border ${
              saveStatus === 'success'
                ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
            }`}
          >
            <div className="flex items-center space-x-2">
              {saveStatus === 'success' ? (
                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
              )}
              <p className={`font-medium ${
                saveStatus === 'success'
                  ? 'text-green-800 dark:text-green-200'
                  : 'text-red-800 dark:text-red-200'
              }`}>
                {saveStatus === 'success'
                  ? 'Settings saved successfully!'
                  : 'Failed to save settings. Please try again.'
                }
              </p>
            </div>
          </motion.div>
        )}

        {/* Configuration Component */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <MapConfiguration
            onConfigSave={handleConfigSave}
            initialConfig={settings}
            className="p-6"
          />
        </div>

        {/* Footer Actions */}
        <div className="mt-8 flex items-center justify-between p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {settings.isConfigured ? (
              <p>
                Map integration is active with {settings.enabledLayers.length} enabled layer{settings.enabledLayers.length !== 1 ? 's' : ''}
              </p>
            ) : (
              <p>
                Configure your ArcGIS API key to enable project location mapping
              </p>
            )}
          </div>

          <div className="flex items-center space-x-2">
            {settings.isConfigured && (
              <Button
                variant="outline"
                onClick={() => router.push('/member/projects')}
                className="flex items-center space-x-2"
              >
                <Map className="w-4 h-4" />
                <span>View Project Map</span>
              </Button>
            )}
          </div>
        </div>

        {/* Help Section */}
        <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6 border border-blue-200 dark:border-blue-800">
          <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-3">
            Getting Started with ArcGIS Integration
          </h3>
          <div className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
            <p>
              <strong>1. Get an API Key:</strong> Visit the ArcGIS Developers Portal to create a free API key
            </p>
            <p>
              <strong>2. Configure Settings:</strong> Enter your API key and adjust default map settings above
            </p>
            <p>
              <strong>3. Enable Layers:</strong> Choose which map layers to display (projects, team locations, etc.)
            </p>
            <p>
              <strong>4. Test & Save:</strong> Use the test button to verify your API key works, then save
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
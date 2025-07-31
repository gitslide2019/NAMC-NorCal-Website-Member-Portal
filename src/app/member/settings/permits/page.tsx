'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  Building, 
  Key, 
  Settings, 
  CheckCircle,
  AlertCircle,
  ArrowLeft,
  ExternalLink,
  FileText,
  Activity,
  TestTube,
  Save
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { useShovelsAPI } from '@/hooks/useShovelsAPI'

export default function PermitSettingsPage() {
  const router = useRouter()
  const { config, updateConfig, testConnection } = useShovelsAPI()
  const [apiKey, setApiKey] = useState('')
  const [showApiKey, setShowApiKey] = useState(false)
  const [isTestingConnection, setIsTestingConnection] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [isSaving, setIsSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle')

  useEffect(() => {
    setApiKey(config.apiKey || '')
  }, [config])

  const handleTestConnection = async () => {
    if (!apiKey.trim()) {
      setConnectionStatus('error')
      return
    }

    setIsTestingConnection(true)
    setConnectionStatus('idle')

    try {
      // Temporarily update config for testing
      const tempConfig = { ...config, apiKey: apiKey.trim(), isConfigured: true }
      updateConfig(tempConfig)
      
      const isValid = await testConnection()
      setConnectionStatus(isValid ? 'success' : 'error')
    } catch (error) {
      console.error('Connection test failed:', error)
      setConnectionStatus('error')
    } finally {
      setIsTestingConnection(false)
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    setSaveStatus('idle')

    try {
      updateConfig({
        apiKey: apiKey.trim(),
        isConfigured: !!apiKey.trim()
      })
      
      setSaveStatus('success')
      
      // Auto-hide success message after 3 seconds
      setTimeout(() => setSaveStatus('idle'), 3000)
    } catch (error) {
      console.error('Failed to save configuration:', error)
      setSaveStatus('error')
    } finally {
      setIsSaving(false)
    }
  }

  const isConfigValid = apiKey.trim().length > 0

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 py-8">
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
            <div className="p-3 bg-orange-100 dark:bg-orange-900 rounded-full">
              <Building className="w-8 h-8 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Permit Data Settings
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Configure Shovels API integration for construction permit tracking
              </p>
            </div>
          </div>
        </div>

        {/* Status Banner */}
        {config.isConfigured ? (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4"
          >
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
              <div>
                <h3 className="font-medium text-green-800 dark:text-green-200">
                  Shovels API Integration Active
                </h3>
                <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                  Your permit data integration is configured and ready. Access comprehensive building permit and inspection data.
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
                  Permit Integration Not Configured
                </h3>
                <p className="text-sm text-orange-700 dark:text-orange-300 mt-1">
                  Add your Shovels API key below to enable construction permit tracking and building information.
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
                  ? 'Configuration saved successfully!'
                  : 'Failed to save configuration. Please try again.'
                }
              </p>
            </div>
          </motion.div>
        )}

        {/* API Configuration */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 mb-6">
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <Key className="w-5 h-5 mr-2" />
              Shovels API Configuration
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Shovels API Key
                </label>
                <div className="relative">
                  <Input
                    type={showApiKey ? 'text' : 'password'}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="Enter your Shovels API key"
                    className="pr-20"
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center space-x-1 pr-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="p-1"
                      title={showApiKey ? 'Hide API key' : 'Show API key'}
                    >
                      {showApiKey ? '👁️' : '🙈'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleTestConnection}
                      disabled={!apiKey.trim() || isTestingConnection}
                      className="p-1"
                      title="Test API key"
                    >
                      {isTestingConnection ? (
                        <div className="w-4 h-4 border-2 border-gray-300 border-t-orange-600 rounded-full animate-spin" />
                      ) : connectionStatus === 'success' ? (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      ) : connectionStatus === 'error' ? (
                        <AlertCircle className="w-4 h-4 text-red-600" />
                      ) : (
                        <TestTube className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>
                
                {connectionStatus === 'success' && (
                  <p className="text-sm text-green-600 dark:text-green-400 mt-2 flex items-center">
                    <CheckCircle className="w-4 h-4 mr-1" />
                    API key is valid and working
                  </p>
                )}
                
                {connectionStatus === 'error' && (
                  <p className="text-sm text-red-600 dark:text-red-400 mt-2 flex items-center">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    Invalid API key or connection failed
                  </p>
                )}

                <div className="mt-3 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-md">
                  <div className="flex items-start space-x-2">
                    <Building className="w-4 h-4 text-orange-600 dark:text-orange-400 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-orange-800 dark:text-orange-200">
                      <p className="font-medium mb-1">Need a Shovels API Key?</p>
                      <p>
                        Visit{' '}
                        <a 
                          href="https://www.shovels.ai/" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="underline hover:no-underline inline-flex items-center"
                        >
                          Shovels.ai
                          <ExternalLink className="w-3 h-3 ml-1" />
                        </a>
                        {' '}to sign up for access to construction permit data, building information, and contractor details.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Features Overview */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 mb-6">
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Available Features
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start space-x-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                  <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white">Building Permits</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Access comprehensive permit data including status, valuations, and timelines
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                  <Activity className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white">Inspection Tracking</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Monitor inspection schedules, results, and compliance status
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                  <Building className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white">Property Information</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Detailed building data, square footage, and property characteristics
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg">
                  <Settings className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white">Contractor Details</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Access contractor information, licensing, and performance history
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-6 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-lg p-6">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {config.isConfigured ? (
              <p>Shovels API integration is active and ready to use</p>
            ) : (
              <p>Configure your API key to enable permit data tracking</p>
            )}
          </div>
          
          <div className="flex items-center space-x-3">
            {config.isConfigured && (
              <Button
                variant="outline"
                onClick={() => router.push('/member/projects')}
                className="flex items-center space-x-2"
              >
                <FileText className="w-4 h-4" />
                <span>View Permit Dashboard</span>
              </Button>
            )}
            
            <Button
              onClick={handleSave}
              disabled={!isConfigValid || isSaving}
              className="flex items-center space-x-2"
            >
              {isSaving ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>{isSaving ? 'Saving...' : 'Save Configuration'}</span>
            </Button>
          </div>
        </div>

        {/* Configuration Preview */}
        {isConfigValid && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800"
          >
            <div className="flex items-start space-x-2">
              <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-medium text-green-800 dark:text-green-200">
                  Configuration Ready
                </h4>
                <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                  Your Shovels API integration is configured and ready to provide construction permit data, 
                  building information, and contractor details for your NAMC projects.
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Help Section */}
        <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6 border border-blue-200 dark:border-blue-800">
          <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-3">
            Getting Started with Shovels Integration
          </h3>
          <div className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
            <p>
              <strong>1. Get API Access:</strong> Sign up at Shovels.ai to get your API key for construction data
            </p>
            <p>
              <strong>2. Configure Integration:</strong> Enter your API key above and test the connection
            </p>
            <p>
              <strong>3. Enable Features:</strong> Access permit tracking, inspection monitoring, and building data
            </p>
            <p>
              <strong>4. Monitor Projects:</strong> View permit status and compliance information for your projects
            </p>
          </div>
          
          <div className="mt-4 pt-4 border-t border-blue-200 dark:border-blue-700">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <strong>For NAMC Members:</strong> This integration helps track construction permits, monitor compliance, 
              and access detailed building information to support your contracting projects and client relationships.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
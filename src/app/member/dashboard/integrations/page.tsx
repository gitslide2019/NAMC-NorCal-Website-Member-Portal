'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { 
  ArrowLeft,
  Map,
  Building,
  Activity,
  BarChart3,
  Settings,
  ExternalLink
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import Button from '@/components/ui/Button'
import IntegrationStatus from '@/components/ui/IntegrationStatus'
import { useArcGISIntegration } from '@/hooks/useArcGISIntegration'
import { useShovelsAPI } from '@/hooks/useShovelsAPI'

export default function IntegrationDashboard() {
  const router = useRouter()
  const arcgis = useArcGISIntegration()
  const shovels = useShovelsAPI()

  const quickActions = [
    {
      title: 'Project Map View',
      description: 'View all projects on interactive maps',
      icon: Map,
      href: '/member/projects',
      enabled: arcgis.isConfigured,
      color: 'bg-blue-500'
    },
    {
      title: 'Permit Dashboard',
      description: 'Track construction permits and compliance',
      icon: Building,
      href: '/member/permits',
      enabled: shovels.config.isConfigured,
      color: 'bg-orange-500'
    },
    {
      title: 'Combined Map View',
      description: 'See projects and permits together',
      icon: Activity,
      href: '/member/map',
      enabled: arcgis.isConfigured && shovels.config.isConfigured,
      color: 'bg-green-500'
    },
    {
      title: 'Analytics Dashboard',
      description: 'View comprehensive analytics and reports',
      icon: BarChart3,
      href: '/member/analytics',
      enabled: true,
      color: 'bg-purple-500'
    }
  ]

  const configurationLinks = [
    {
      title: 'ArcGIS Settings',
      description: 'Configure mapping and location services',
      icon: Map,
      href: '/member/settings/map',
      status: arcgis.isConfigured ? 'configured' : 'needs_setup'
    },
    {
      title: 'Shovels Settings',
      description: 'Configure permit data and building information',
      icon: Building,
      href: '/member/settings/permits',
      status: shovels.config.isConfigured ? 'configured' : 'needs_setup'
    }
  ]

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 py-8">
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

          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              API Integrations Dashboard
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Manage your ArcGIS and Shovels API integrations for enhanced project management
            </p>
          </div>
        </div>

        {/* Integration Status */}
        <div className="mb-8">
          <IntegrationStatus />
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Quick Actions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {quickActions.map((action, index) => {
              const Icon = action.icon
              return (
                <motion.div
                  key={action.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`relative overflow-hidden rounded-lg border-2 transition-all ${
                    action.enabled
                      ? 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 cursor-pointer'
                      : 'border-gray-200 dark:border-gray-700 opacity-50 cursor-not-allowed'
                  }`}
                >
                  <div 
                    className={`p-6 bg-white dark:bg-gray-800 ${action.enabled ? 'hover:bg-gray-50 dark:hover:bg-gray-750' : ''}`}
                    onClick={() => action.enabled && router.push(action.href)}
                  >
                    <div className="flex items-center space-x-3 mb-4">
                      <div className={`p-2 rounded-lg ${action.color}`}>
                        <Icon className="w-5 h-5 text-white" />
                      </div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {action.title}
                      </h3>
                    </div>
                    
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                      {action.description}
                    </p>

                    {action.enabled ? (
                      <div className="flex items-center text-sm text-blue-600 dark:text-blue-400">
                        <span>Open</span>
                        <ExternalLink className="w-3 h-3 ml-1" />
                      </div>
                    ) : (
                      <div className="text-sm text-gray-500 dark:text-gray-500">
                        Requires configuration
                      </div>
                    )}
                  </div>

                  {!action.enabled && (
                    <div className="absolute inset-0 bg-gray-200 dark:bg-gray-700 opacity-20 pointer-events-none" />
                  )}
                </motion.div>
              )
            })}
          </div>
        </div>

        {/* Configuration */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Configuration
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {configurationLinks.map((config, index) => {
              const Icon = config.icon
              return (
                <motion.div
                  key={config.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 + index * 0.1 }}
                  className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => router.push(config.href)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-lg ${
                        config.status === 'configured' ? 'bg-green-100 dark:bg-green-900' : 'bg-yellow-100 dark:bg-yellow-900'
                      }`}>
                        <Icon className={`w-5 h-5 ${
                          config.status === 'configured' ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'
                        }`} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          {config.title}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {config.description}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        config.status === 'configured'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                      }`}>
                        {config.status === 'configured' ? 'Configured' : 'Setup Required'}
                      </span>
                      <Settings className="w-4 h-4 text-gray-400" />
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>

        {/* Environment Variables Info */}
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6 border border-blue-200 dark:border-blue-800">
          <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-3">
            Environment Configuration
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">
                Current Status
              </h4>
              <div className="space-y-2 text-sm text-blue-700 dark:text-blue-300">
                <div className="flex justify-between">
                  <span>ArcGIS API Key:</span>
                  <span className={arcgis.isConfigured ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                    {arcgis.isConfigured ? '✓ Loaded' : '✗ Missing'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Shovels API Key:</span>
                  <span className={shovels.config.isConfigured ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                    {shovels.config.isConfigured ? '✓ Loaded' : '✗ Missing'}
                  </span>
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">
                Expected Variables
              </h4>
              <div className="space-y-1 text-sm text-blue-700 dark:text-blue-300">
                <code className="block bg-blue-100 dark:bg-blue-800 px-2 py-1 rounded text-xs">
                  NEXT_PUBLIC_ARCGIS_API_KEY
                </code>
                <code className="block bg-blue-100 dark:bg-blue-800 px-2 py-1 rounded text-xs">
                  NEXT_PUBLIC_SHOVELS_API_KEY
                </code>
              </div>
            </div>
          </div>
          
          <p className="text-sm text-blue-700 dark:text-blue-300 mt-4">
            These environment variables are automatically detected and used by the system. 
            No additional configuration is needed once they're set in your <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">.env.local</code> file.
          </p>
        </div>
      </div>
    </div>
  )
}
import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  Map,
  Building,
  Settings,
  Eye,
  TestTube,
  Activity,
  ExternalLink
} from 'lucide-react';
import { motion } from 'framer-motion';
import Button from './Button';
import { useArcGISIntegration } from '@/hooks/useArcGISIntegration';
import { useShovelsAPI } from '@/hooks/useShovelsAPI';

interface IntegrationStatusProps {
  className?: string;
  showActions?: boolean;
}

const IntegrationStatus: React.FC<IntegrationStatusProps> = ({
  className = '',
  showActions = true
}) => {
  const arcgis = useArcGISIntegration();
  const shovels = useShovelsAPI();
  
  const [arcgisStatus, setArcgisStatus] = useState<'checking' | 'connected' | 'error' | 'not_configured'>('checking');
  const [shovelsStatus, setShovelsStatus] = useState<'checking' | 'connected' | 'error' | 'not_configured'>('checking');
  const [testResults, setTestResults] = useState<any>({});

  // Test both integrations on mount
  useEffect(() => {
    const testIntegrations = async () => {
      // Test ArcGIS
      if (arcgis.isConfigured) {
        try {
          const arcgisWorking = await arcgis.testConnection();
          setArcgisStatus(arcgisWorking ? 'connected' : 'error');
        } catch (error) {
          setArcgisStatus('error');
        }
      } else {
        setArcgisStatus('not_configured');
      }

      // Test Shovels
      if (shovels.config.isConfigured) {
        try {
          const shovelsWorking = await shovels.testConnection();
          setShovelsStatus(shovelsWorking ? 'connected' : 'error');
        } catch (error) {
          setShovelsStatus('error');
        }
      } else {
        setShovelsStatus('not_configured');
      }
    };

    if (arcgis.isLoaded && shovels.isLoaded) {
      testIntegrations();
    }
  }, [arcgis.isLoaded, shovels.isLoaded, arcgis.isConfigured, shovels.config.isConfigured]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
        return <CheckCircle2 className="w-5 h-5 text-green-600" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'not_configured':
        return <AlertCircle className="w-5 h-5 text-yellow-600" />;
      case 'checking':
      default:
        return <Activity className="w-5 h-5 text-blue-600 animate-pulse" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected':
        return 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20';
      case 'error':
        return 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20';
      case 'not_configured':
        return 'border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-900/20';
      case 'checking':
      default:
        return 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20';
    }
  };

  const getStatusText = (status: string, integration: string) => {
    switch (status) {
      case 'connected':
        return `${integration} integration is active and working`;
      case 'error':
        return `${integration} connection failed - check API key`;
      case 'not_configured':
        return `${integration} API key not configured`;
      case 'checking':
      default:
        return `Testing ${integration} connection...`;
    }
  };

  const runQuickTests = async () => {
    const results: any = {};

    // Test ArcGIS geocoding
    if (arcgisStatus === 'connected') {
      try {
        const coords = await arcgis.geocodeAddress('1 Market St, San Francisco, CA');
        results.arcgis_geocoding = coords ? 'success' : 'failed';
        results.arcgis_coords = coords;
      } catch (error) {
        results.arcgis_geocoding = 'failed';
        results.arcgis_error = error.message;
      }
    }

    // Test Shovels permit search
    if (shovelsStatus === 'connected') {
      try {
        const permits = await shovels.searchPermits({
          city: 'San Francisco',
          state: 'CA',
          limit: 5
        });
        results.shovels_search = permits.length > 0 ? 'success' : 'no_results';
        results.shovels_count = permits.length;
      } catch (error) {
        results.shovels_search = 'failed';
        results.shovels_error = error.message;
      }
    }

    setTestResults(results);
  };

  const overallStatus = arcgisStatus === 'connected' && shovelsStatus === 'connected' ? 'fully_integrated' :
                       arcgisStatus === 'connected' || shovelsStatus === 'connected' ? 'partially_integrated' :
                       'not_integrated';

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Overall Status Header */}
      <div className="text-center">
        <div className="flex items-center justify-center mb-4">
          <div className={`p-4 rounded-full ${
            overallStatus === 'fully_integrated' ? 'bg-green-100 dark:bg-green-900' :
            overallStatus === 'partially_integrated' ? 'bg-yellow-100 dark:bg-yellow-900' :
            'bg-gray-100 dark:bg-gray-800'
          }`}>
            {overallStatus === 'fully_integrated' ? (
              <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
            ) : overallStatus === 'partially_integrated' ? (
              <AlertCircle className="w-8 h-8 text-yellow-600 dark:text-yellow-400" />
            ) : (
              <Settings className="w-8 h-8 text-gray-600 dark:text-gray-400" />
            )}
          </div>
        </div>
        
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          {overallStatus === 'fully_integrated' ? 'All Integrations Active' :
           overallStatus === 'partially_integrated' ? 'Partial Integration' :
           'Setup Required'}
        </h2>
        
        <p className="text-gray-600 dark:text-gray-400">
          {overallStatus === 'fully_integrated' ? 'Both ArcGIS and Shovels APIs are configured and working correctly' :
           overallStatus === 'partially_integrated' ? 'Some integrations need attention' :
           'Configure your API keys to enable full functionality'}
        </p>
      </div>

      {/* Integration Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* ArcGIS Status */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`rounded-lg border-2 p-6 ${getStatusColor(arcgisStatus)}`}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <Map className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                ArcGIS Maps
              </h3>
            </div>
            {getStatusIcon(arcgisStatus)}
          </div>
          
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            {getStatusText(arcgisStatus, 'ArcGIS')}
          </p>

          <div className="space-y-2 text-xs text-gray-500 dark:text-gray-500">
            <div className="flex justify-between">
              <span>API Key:</span>
              <span>{arcgis.settings.apiKey ? '✓ Configured' : '✗ Missing'}</span>
            </div>
            <div className="flex justify-between">
              <span>Default Center:</span>
              <span>{arcgis.settings.defaultCenter.latitude.toFixed(4)}, {arcgis.settings.defaultCenter.longitude.toFixed(4)}</span>
            </div>
            <div className="flex justify-between">
              <span>Enabled Layers:</span>
              <span>{arcgis.settings.enabledLayers.length} layers</span>
            </div>
          </div>

          {arcgisStatus === 'connected' && testResults.arcgis_geocoding && (
            <div className="mt-4 p-3 bg-green-100 dark:bg-green-900/30 rounded-md">
              <p className="text-xs text-green-800 dark:text-green-200">
                ✓ Geocoding test: {testResults.arcgis_geocoding === 'success' ? 'Working' : 'Failed'}
                {testResults.arcgis_coords && (
                  <span className="block mt-1">
                    Coordinates: {testResults.arcgis_coords.latitude.toFixed(4)}, {testResults.arcgis_coords.longitude.toFixed(4)}
                  </span>
                )}
              </p>
            </div>
          )}
        </motion.div>

        {/* Shovels Status */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className={`rounded-lg border-2 p-6 ${getStatusColor(shovelsStatus)}`}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <Building className="w-6 h-6 text-orange-600 dark:text-orange-400" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Shovels Permits
              </h3>
            </div>
            {getStatusIcon(shovelsStatus)}
          </div>
          
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            {getStatusText(shovelsStatus, 'Shovels')}
          </p>

          <div className="space-y-2 text-xs text-gray-500 dark:text-gray-500">
            <div className="flex justify-between">
              <span>API Key:</span>
              <span>{shovels.config.apiKey ? '✓ Configured' : '✗ Missing'}</span>
            </div>
            <div className="flex justify-between">
              <span>Base URL:</span>
              <span>{new URL(shovels.config.baseUrl).hostname}</span>
            </div>
            <div className="flex justify-between">
              <span>Configuration:</span>
              <span>{shovels.config.isConfigured ? '✓ Ready' : '✗ Needs setup'}</span>
            </div>
          </div>

          {shovelsStatus === 'connected' && testResults.shovels_search && (
            <div className="mt-4 p-3 bg-green-100 dark:bg-green-900/30 rounded-md">
              <p className="text-xs text-green-800 dark:text-green-200">
                ✓ Search test: {testResults.shovels_search === 'success' ? 'Working' : 
                                testResults.shovels_search === 'no_results' ? 'Connected (no results)' : 'Failed'}
                {testResults.shovels_count !== undefined && (
                  <span className="block mt-1">
                    Found {testResults.shovels_count} permits in SF
                  </span>
                )}
              </p>
            </div>
          )}
        </motion.div>
      </div>

      {/* Actions */}
      {showActions && (
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          {overallStatus === 'fully_integrated' && (
            <>
              <Button
                onClick={runQuickTests}
                className="flex items-center space-x-2"
              >
                <TestTube className="w-4 h-4" />
                <span>Run Integration Tests</span>
              </Button>

              <Button
                variant="outline"
                onClick={() => window.location.href = '/member/projects'}
                className="flex items-center space-x-2"
              >
                <Eye className="w-4 h-4" />
                <span>View Project Maps</span>
              </Button>
            </>
          )}

          {arcgisStatus !== 'connected' && (
            <Button
              variant="outline"
              onClick={() => window.location.href = '/member/settings/map'}
              className="flex items-center space-x-2"
            >
              <Map className="w-4 h-4" />
              <span>Configure ArcGIS</span>
            </Button>
          )}

          {shovelsStatus !== 'connected' && (
            <Button
              variant="outline"
              onClick={() => window.location.href = '/member/settings/permits'}
              className="flex items-center space-x-2"
            >
              <Building className="w-4 h-4" />
              <span>Configure Shovels</span>
            </Button>
          )}
        </div>
      )}

      {/* Environment Variable Info */}
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
        <div className="flex items-start space-x-2">
          <Settings className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="font-medium text-blue-900 dark:text-blue-100">
              Environment Configuration
            </h4>
            <p className="text-sm text-blue-800 dark:text-blue-200 mt-1">
              Both API keys are configured via environment variables. The system automatically detects and uses:
            </p>
            <ul className="text-sm text-blue-800 dark:text-blue-200 mt-2 space-y-1">
              <li>• <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">NEXT_PUBLIC_ARCGIS_API_KEY</code> for mapping functionality</li>
              <li>• <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">NEXT_PUBLIC_SHOVELS_API_KEY</code> for permit data</li>
            </ul>
            <p className="text-xs text-blue-700 dark:text-blue-300 mt-2">
              No additional configuration needed - the integrations will work automatically once the environment variables are loaded.
            </p>
          </div>
        </div>
      </div>

      {/* Feature Overview */}
      {overallStatus === 'fully_integrated' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <h4 className="font-medium text-gray-900 dark:text-white mb-2">Interactive Maps</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              View projects and permits on interactive ArcGIS maps with real-time data
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <h4 className="font-medium text-gray-900 dark:text-white mb-2">Permit Tracking</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Monitor construction permits, inspections, and compliance status
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <h4 className="font-medium text-gray-900 dark:text-white mb-2">Location Services</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Automatic address geocoding and geographic data enrichment
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default IntegrationStatus;
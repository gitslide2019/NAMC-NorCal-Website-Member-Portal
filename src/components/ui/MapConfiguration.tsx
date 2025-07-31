import React, { useState } from 'react';
import { 
  Map, 
  Key, 
  Settings, 
  Eye, 
  EyeOff, 
  Check, 
  AlertCircle,
  Info,
  ExternalLink
} from 'lucide-react';
import { motion } from 'framer-motion';
import Button from './Button';
import Input from './Input';

interface MapConfigurationProps {
  onConfigSave: (config: {
    apiKey: string;
    defaultCenter: { latitude: number; longitude: number };
    defaultZoom: number;
    enabledLayers: string[];
  }) => void;
  initialConfig?: {
    apiKey?: string;
    defaultCenter?: { latitude: number; longitude: number };
    defaultZoom?: number;
    enabledLayers?: string[];
  };
  className?: string;
}

const MapConfiguration: React.FC<MapConfigurationProps> = ({
  onConfigSave,
  initialConfig,
  className = ''
}) => {
  const [apiKey, setApiKey] = useState(initialConfig?.apiKey || '');
  const [showApiKey, setShowApiKey] = useState(false);
  const [defaultCenter, setDefaultCenter] = useState(
    initialConfig?.defaultCenter || { latitude: 37.7749, longitude: -122.4194 }
  );
  const [defaultZoom, setDefaultZoom] = useState(initialConfig?.defaultZoom || 10);
  const [enabledLayers, setEnabledLayers] = useState<string[]>(
    initialConfig?.enabledLayers || ['projects', 'team_locations']
  );
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const availableLayers = [
    { id: 'projects', name: 'Project Sites', description: 'Show all project locations on the map' },
    { id: 'team_locations', name: 'Team Locations', description: 'Show current team member locations' },
    { id: 'traffic', name: 'Traffic Layer', description: 'Display real-time traffic information' },
    { id: 'permits', name: 'Permits & Inspections', description: 'Show permit and inspection locations' },
    { id: 'utilities', name: 'Utilities', description: 'Display utility lines and infrastructure' },
    { id: 'demographics', name: 'Demographics', description: 'Show demographic and census data' }
  ];

  const handleLayerToggle = (layerId: string) => {
    setEnabledLayers(prev => 
      prev.includes(layerId)
        ? prev.filter(id => id !== layerId)
        : [...prev, layerId]
    );
  };

  const testConnection = async () => {
    if (!apiKey.trim()) {
      setConnectionStatus('error');
      return;
    }

    setIsTestingConnection(true);
    setConnectionStatus('idle');

    try {
      // Test the API key by making a simple request
      const response = await fetch(
        `https://geocode-api.arcgis.com/arcgis/rest/services/World/GeocodeServer?f=json&token=${apiKey}`
      );
      
      if (response.ok) {
        setConnectionStatus('success');
      } else {
        setConnectionStatus('error');
      }
    } catch (error) {
      console.error('ArcGIS connection test failed:', error);
      setConnectionStatus('error');
    } finally {
      setIsTestingConnection(false);
    }
  };

  const handleSave = () => {
    onConfigSave({
      apiKey: apiKey.trim(),
      defaultCenter,
      defaultZoom,
      enabledLayers
    });
  };

  const isConfigValid = apiKey.trim().length > 0 && 
                       defaultCenter.latitude >= -90 && defaultCenter.latitude <= 90 &&
                       defaultCenter.longitude >= -180 && defaultCenter.longitude <= 180 &&
                       defaultZoom >= 1 && defaultZoom <= 20;

  return (
    <div className={`max-w-4xl mx-auto space-y-6 ${className}`}>
      {/* Header */}
      <div className="text-center">
        <div className="flex items-center justify-center mb-4">
          <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-full">
            <Map className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          ArcGIS Map Configuration
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Configure your ArcGIS integration for project location mapping
        </p>
      </div>

      {/* API Key Configuration */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
          <Key className="w-5 h-5 mr-2" />
          API Key Configuration
        </h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              ArcGIS API Key
            </label>
            <div className="relative">
              <Input
                type={showApiKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter your ArcGIS API key"
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
                  {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={testConnection}
                  disabled={!apiKey.trim() || isTestingConnection}
                  className="p-1"
                  title="Test API key"
                >
                  {isTestingConnection ? (
                    <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
                  ) : connectionStatus === 'success' ? (
                    <Check className="w-4 h-4 text-green-600" />
                  ) : connectionStatus === 'error' ? (
                    <AlertCircle className="w-4 h-4 text-red-600" />
                  ) : (
                    <Settings className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
            
            {connectionStatus === 'success' && (
              <p className="text-sm text-green-600 dark:text-green-400 mt-2 flex items-center">
                <Check className="w-4 h-4 mr-1" />
                API key is valid and working
              </p>
            )}
            
            {connectionStatus === 'error' && (
              <p className="text-sm text-red-600 dark:text-red-400 mt-2 flex items-center">
                <AlertCircle className="w-4 h-4 mr-1" />
                Invalid API key or connection failed
              </p>
            )}

            <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md">
              <div className="flex items-start space-x-2">
                <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-800 dark:text-blue-200">
                  <p className="font-medium mb-1">Need an ArcGIS API Key?</p>
                  <p>
                    Visit the{' '}
                    <a 
                      href="https://developers.arcgis.com/api-keys/" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="underline hover:no-underline inline-flex items-center"
                    >
                      ArcGIS Developers Portal
                      <ExternalLink className="w-3 h-3 ml-1" />
                    </a>
                    {' '}to create a free API key. You'll need to sign up for a developer account.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Map Defaults */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Default Map Settings
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Default Latitude
            </label>
            <Input
              type="number"
              value={defaultCenter.latitude}
              onChange={(e) => setDefaultCenter(prev => ({ 
                ...prev, 
                latitude: parseFloat(e.target.value) || 0 
              }))}
              step="0.000001"
              min="-90"
              max="90"
              placeholder="37.7749"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Default Longitude
            </label>
            <Input
              type="number"
              value={defaultCenter.longitude}
              onChange={(e) => setDefaultCenter(prev => ({ 
                ...prev, 
                longitude: parseFloat(e.target.value) || 0 
              }))}
              step="0.000001"
              min="-180"
              max="180"
              placeholder="-122.4194"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Default Zoom Level
            </label>
            <Input
              type="number"
              value={defaultZoom}
              onChange={(e) => setDefaultZoom(parseInt(e.target.value) || 10)}
              min="1"
              max="20"
              placeholder="10"
            />
          </div>
        </div>

        <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            <strong>Current center:</strong> San Francisco Bay Area (lat: {defaultCenter.latitude.toFixed(6)}, lng: {defaultCenter.longitude.toFixed(6)}, zoom: {defaultZoom})
          </p>
        </div>
      </div>

      {/* Layer Configuration */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Map Layers
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Choose which layers to enable by default on your maps
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {availableLayers.map((layer) => (
            <div
              key={layer.id}
              className={`p-4 rounded-lg border-2 transition-all cursor-pointer ${
                enabledLayers.includes(layer.id)
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
              }`}
              onClick={() => handleLayerToggle(layer.id)}
            >
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-gray-900 dark:text-white">
                  {layer.name}
                </h4>
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                  enabledLayers.includes(layer.id)
                    ? 'border-blue-500 bg-blue-500'
                    : 'border-gray-300 dark:border-gray-600'
                }`}>
                  {enabledLayers.includes(layer.id) && (
                    <Check className="w-3 h-3 text-white" />
                  )}
                </div>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {layer.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-6 border-t border-gray-200 dark:border-gray-700">
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {enabledLayers.length} layer{enabledLayers.length !== 1 ? 's' : ''} enabled
        </div>
        
        <div className="flex items-center space-x-3">
          <Button
            variant="outline"
            onClick={() => {
              setApiKey('');
              setDefaultCenter({ latitude: 37.7749, longitude: -122.4194 });
              setDefaultZoom(10);
              setEnabledLayers(['projects', 'team_locations']);
              setConnectionStatus('idle');
            }}
          >
            Reset to Defaults
          </Button>
          
          <Button
            onClick={handleSave}
            disabled={!isConfigValid}
            className="flex items-center space-x-2"
          >
            <Settings className="w-4 h-4" />
            <span>Save Configuration</span>
          </Button>
        </div>
      </div>

      {/* Preview */}
      {isConfigValid && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800"
        >
          <div className="flex items-start space-x-2">
            <Check className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-medium text-green-800 dark:text-green-200">
                Configuration Ready
              </h4>
              <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                Your ArcGIS map integration is configured and ready to use. Maps will center on{' '}
                ({defaultCenter.latitude.toFixed(4)}, {defaultCenter.longitude.toFixed(4)}) with {enabledLayers.length} enabled layers.
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default MapConfiguration;
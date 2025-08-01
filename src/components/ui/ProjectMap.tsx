import React, { useEffect, useRef, useState } from 'react';
import { 
  Map as MapIcon, 
  Layers, 
  Navigation, 
  MapPin, 
  Maximize2, 
  Minimize2,
  Settings,
  Filter,
  Search
} from 'lucide-react';
import { motion } from 'framer-motion';
import Button from './Button';
import Input from './Input';

// Types for ArcGIS integration
interface ProjectLocation {
  id: string;
  projectId: string;
  name: string;
  address: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  status: 'planned' | 'active' | 'completed' | 'on_hold';
  projectType: 'construction' | 'renovation' | 'inspection' | 'meeting';
  startDate: string;
  endDate?: string;
  assignedTeam: string[];
  description?: string;
}

// ArcGIS types will be handled by the actual @arcgis/core package
// Using type assertions to avoid TypeScript conflicts

interface MapLayer {
  id: string;
  name: string;
  visible: boolean;
  type: 'projects' | 'team_locations' | 'traffic' | 'permits' | 'utilities';
  color: string;
}

interface ProjectMapProps {
  apiKey: string;
  projects: ProjectLocation[];
  onProjectSelect?: (project: ProjectLocation) => void;
  onLocationUpdate?: (projectId: string, coordinates: { latitude: number; longitude: number }) => void;
  center?: { latitude: number; longitude: number };
  zoom?: number;
  height?: string;
  showControls?: boolean;
  allowEdit?: boolean;
  className?: string;
}

const ProjectMap: React.FC<ProjectMapProps> = ({
  apiKey,
  projects,
  onProjectSelect,
  onLocationUpdate,
  center = { latitude: 37.7749, longitude: -122.4194 }, // San Francisco default
  zoom = 10,
  height = '400px',
  showControls = true,
  allowEdit = false,
  className = ''
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<any>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<ProjectLocation | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showLayerPanel, setShowLayerPanel] = useState(false);
  const [mapLayers, setMapLayers] = useState<MapLayer[]>([
    { id: 'projects', name: 'Project Sites', visible: true, type: 'projects', color: '#3B82F6' },
    { id: 'team_locations', name: 'Team Locations', visible: false, type: 'team_locations', color: '#10B981' },
    { id: 'traffic', name: 'Traffic', visible: false, type: 'traffic', color: '#F59E0B' },
    { id: 'permits', name: 'Permits', visible: false, type: 'permits', color: '#8B5CF6' },
    { id: 'utilities', name: 'Utilities', visible: false, type: 'utilities', color: '#EF4444' }
  ]);

  // Filter projects based on search query
  const filteredProjects = projects.filter(project =>
    project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    project.address.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Initialize ArcGIS Map
  useEffect(() => {
    if (!mapRef.current || !apiKey) return;

    const initializeMap = async () => {
      try {
        // Load ArcGIS API with type assertions
        const [Map, MapView, Graphic, Point, SimpleMarkerSymbol, PopupTemplate] = await Promise.all([
          import('@arcgis/core/Map').then(m => m.default),
          import('@arcgis/core/views/MapView').then(m => m.default),
          import('@arcgis/core/Graphic').then(m => m.default),
          import('@arcgis/core/geometry/Point').then(m => m.default),
          import('@arcgis/core/symbols/SimpleMarkerSymbol').then(m => m.default),
          import('@arcgis/core/PopupTemplate').then(m => m.default)
        ]) as [any, any, any, any, any, any];

        // Configure API key
        const { default: esriConfig } = await import('@arcgis/core/config');
        (esriConfig as any).apiKey = apiKey;

        // Create map
        const mapInstance = new Map({
          basemap: 'streets-navigation-vector'
        });

        // Create map view
        const view = new MapView({
          container: mapRef.current,
          map: mapInstance,
          center: [center.longitude, center.latitude],
          zoom: zoom,
          ui: {
            components: showControls ? ['zoom', 'compass'] : []
          }
        });

        // Add project markers
        filteredProjects.forEach(project => {
          const point = new Point({
            longitude: project.coordinates.longitude,
            latitude: project.coordinates.latitude
          });

          const symbol = new SimpleMarkerSymbol({
            color: getProjectColor(project.status),
            size: '12px',
            outline: {
              color: 'white',
              width: 2
            }
          });

          const popupTemplate = new PopupTemplate({
            title: project.name,
            content: `
              <div class="p-4">
                <p><strong>Address:</strong> ${project.address}</p>
                <p><strong>Status:</strong> ${project.status.replace('_', ' ').toUpperCase()}</p>
                <p><strong>Type:</strong> ${project.projectType.replace('_', ' ').toUpperCase()}</p>
                <p><strong>Start Date:</strong> ${new Date(project.startDate).toLocaleDateString()}</p>
                ${project.endDate ? `<p><strong>End Date:</strong> ${new Date(project.endDate).toLocaleDateString()}</p>` : ''}
                ${project.description ? `<p><strong>Description:</strong> ${project.description}</p>` : ''}
              </div>
            `
          });

          const graphic = new Graphic({
            geometry: point,
            symbol: symbol,
            popupTemplate: popupTemplate,
            attributes: {
              projectId: project.id,
              name: project.name
            }
          });

          view.graphics.add(graphic);
        });

        // Handle click events
        view.on('click', (event: any) => {
          view.hitTest(event).then((response: any) => {
            if (response.results.length > 0) {
              const result = response.results[0];
              const graphic = (result as any).graphic;
              const projectId = graphic?.attributes?.projectId;
              
              if (projectId && onProjectSelect) {
                const project = projects.find(p => p.id === projectId);
                if (project) {
                  setSelectedProject(project);
                  onProjectSelect(project);
                }
              }
            }
          });
        });

        setMap({ instance: mapInstance, view });

      } catch (error) {
        console.error('Failed to initialize ArcGIS map:', error);
      }
    };

    initializeMap();
  }, [apiKey, center, zoom, showControls]);

  // Update markers when projects change
  useEffect(() => {
    if (!map?.view) return;

    // Clear existing graphics
    map.view.graphics.removeAll();

    // Add updated project markers
    filteredProjects.forEach(async (project) => {
      try {
        const [Point, SimpleMarkerSymbol, Graphic, PopupTemplate] = await Promise.all([
          import('@arcgis/core/geometry/Point').then(m => m.default),
          import('@arcgis/core/symbols/SimpleMarkerSymbol').then(m => m.default),
          import('@arcgis/core/Graphic').then(m => m.default),
          import('@arcgis/core/PopupTemplate').then(m => m.default)
        ]) as [any, any, any, any];

        const point = new Point({
          longitude: project.coordinates.longitude,
          latitude: project.coordinates.latitude
        });

        const symbol = new SimpleMarkerSymbol({
          color: getProjectColor(project.status),
          size: '12px',
          outline: {
            color: 'white',
            width: 2
          }
        });

        const popupTemplate = new PopupTemplate({
          title: project.name,
          content: `
            <div class="p-4">
              <p><strong>Address:</strong> ${project.address}</p>
              <p><strong>Status:</strong> ${project.status.replace('_', ' ').toUpperCase()}</p>
              <p><strong>Type:</strong> ${project.projectType.replace('_', ' ').toUpperCase()}</p>
              <p><strong>Start Date:</strong> ${new Date(project.startDate).toLocaleDateString()}</p>
              ${project.endDate ? `<p><strong>End Date:</strong> ${new Date(project.endDate).toLocaleDateString()}</p>` : ''}
              ${project.description ? `<p><strong>Description:</strong> ${project.description}</p>` : ''}
            </div>
          `
        });

        const graphic = new Graphic({
          geometry: point,
          symbol: symbol,
          popupTemplate: popupTemplate,
          attributes: {
            projectId: project.id,
            name: project.name
          }
        });

        map.view.graphics.add(graphic);
      } catch (error) {
        console.error('Error adding project marker:', error);
      }
    });
  }, [filteredProjects, map]);

  const getProjectColor = (status: string) => {
    switch (status) {
      case 'planned': return '#6B7280'; // Gray
      case 'active': return '#3B82F6'; // Blue
      case 'completed': return '#10B981'; // Green
      case 'on_hold': return '#F59E0B'; // Orange
      default: return '#6B7280';
    }
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const toggleLayer = (layerId: string) => {
    setMapLayers(prev => prev.map(layer => 
      layer.id === layerId ? { ...layer, visible: !layer.visible } : layer
    ));
  };

  const goToProject = (project: ProjectLocation) => {
    if (map?.view) {
      map.view.goTo({
        center: [project.coordinates.longitude, project.coordinates.latitude],
        zoom: 15
      });
      setSelectedProject(project);
      if (onProjectSelect) {
        onProjectSelect(project);
      }
    }
  };

  return (
    <div className={`relative ${className}`}>
      {/* Map Container */}
      <div 
        className={`relative rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 ${
          isFullscreen ? 'fixed inset-0 z-50 rounded-none' : ''
        }`}
        style={{ height: isFullscreen ? '100vh' : height }}
      >
        {/* Map */}
        <div ref={mapRef} className="w-full h-full" />

        {/* Map Controls */}
        {showControls && (
          <div className="absolute top-4 right-4 flex flex-col space-y-2">
            <Button
              variant="outline"
              size="sm"
              onClick={toggleFullscreen}
              className="bg-white dark:bg-gray-800 shadow-md"
              title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowLayerPanel(!showLayerPanel)}
              className="bg-white dark:bg-gray-800 shadow-md"
              title="Toggle layers"
            >
              <Layers className="w-4 h-4" />
            </Button>
          </div>
        )}

        {/* Search Bar */}
        <div className="absolute top-4 left-4 w-80">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              type="text"
              placeholder="Search projects by name or address..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-white dark:bg-gray-800 shadow-md"
            />
          </div>
        </div>

        {/* Layer Panel */}
        {showLayerPanel && (
          <motion.div
            initial={{ opacity: 0, x: 300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 300 }}
            className="absolute top-16 right-4 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-4"
          >
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Map Layers</h3>
            <div className="space-y-2">
              {mapLayers.map((layer) => (
                <label key={layer.id} className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={layer.visible}
                    onChange={() => toggleLayer(layer.id)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: layer.color }}
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{layer.name}</span>
                </label>
              ))}
            </div>
          </motion.div>
        )}

        {/* Project List */}
        {searchQuery && (
          <div className="absolute top-16 left-4 w-80 max-h-64 overflow-y-auto bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
            {filteredProjects.length > 0 ? (
              <div className="p-2">
                {filteredProjects.map((project) => (
                  <button
                    key={project.id}
                    onClick={() => goToProject(project)}
                    className="w-full text-left p-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <div 
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: getProjectColor(project.status) }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {project.name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {project.address}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                No projects found matching "{searchQuery}"
              </div>
            )}
          </div>
        )}

        {/* Legend */}
        <div className="absolute bottom-4 left-4 bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-3">
          <div className="flex items-center space-x-4 text-xs">
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 rounded-full bg-gray-500" />
              <span className="text-gray-600 dark:text-gray-400">Planned</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              <span className="text-gray-600 dark:text-gray-400">Active</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span className="text-gray-600 dark:text-gray-400">Completed</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 rounded-full bg-orange-500" />
              <span className="text-gray-600 dark:text-gray-400">On Hold</span>
            </div>
          </div>
        </div>
      </div>

      {/* Selected Project Info */}
      {selectedProject && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {selectedProject.name}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {selectedProject.address}
              </p>
              <div className="flex items-center space-x-4 mt-2">
                <span className={`px-2 py-1 text-xs rounded-full ${
                  selectedProject.status === 'active' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                  selectedProject.status === 'completed' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                  selectedProject.status === 'on_hold' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' :
                  'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                }`}>
                  {selectedProject.status.replace('_', ' ').toUpperCase()}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {selectedProject.projectType.replace('_', ' ').toUpperCase()}
                </span>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedProject(null)}
              className="ml-4"
            >
              ×
            </Button>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default ProjectMap;
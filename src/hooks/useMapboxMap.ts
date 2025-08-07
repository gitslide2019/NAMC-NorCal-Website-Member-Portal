import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import { arcgisService, SpatialAnalysisResult } from '@/lib/services/arcgis-online.service';

// Set Mapbox access token
mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN!;

export interface MapboxMapOptions {
  center?: [number, number];
  zoom?: number;
  style?: string;
  showArcGISData?: boolean;
  enableInteractiveAnalysis?: boolean;
}

export interface ProjectLocation {
  id: string;
  name: string;
  coordinates: [number, number];
  type: 'residential' | 'commercial' | 'industrial';
  status: 'planning' | 'active' | 'completed';
  budget?: number;
  socialImpact?: {
    jobsCreated: number;
    trainingHours: number;
    localHirePercentage: number;
  };
}

export interface MapInteractionData {
  coordinates: [number, number];
  spatialAnalysis?: SpatialAnalysisResult;
  nearbyProjects?: ProjectLocation[];
  businessOpportunities?: any[];
}

export const useMapboxMap = (
  containerRef: React.RefObject<HTMLDivElement>,
  options: MapboxMapOptions = {}
) => {
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<MapInteractionData | null>(null);
  const [arcgisDataLayers, setArcgisDataLayers] = useState<string[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const {
    center = [-122.4194, 37.7749], // Default to San Francisco
    zoom = 10,
    style = 'mapbox://styles/mapbox/streets-v12',
    showArcGISData = true,
    enableInteractiveAnalysis = true
  } = options;

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style,
      center,
      zoom,
      attributionControl: false
    });

    // Add navigation controls
    map.addControl(new mapboxgl.NavigationControl(), 'top-right');

    // Add fullscreen control
    map.addControl(new mapboxgl.FullscreenControl(), 'top-right');

    // Add scale control
    map.addControl(new mapboxgl.ScaleControl(), 'bottom-left');

    map.on('load', () => {
      setIsLoaded(true);
      
      if (showArcGISData) {
        initializeArcGISLayers(map);
      }
      
      if (enableInteractiveAnalysis) {
        setupInteractiveAnalysis(map);
      }
    });

    mapRef.current = map;

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [containerRef, center, zoom, style, showArcGISData, enableInteractiveAnalysis]);

  // Initialize ArcGIS data layers
  const initializeArcGISLayers = (map: mapboxgl.Map) => {
    // Add demographic data layer
    map.addSource('demographic-data', {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: []
      }
    });

    // Add market analysis layer
    map.addSource('market-analysis', {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: []
      }
    });

    // Add business opportunity layer
    map.addSource('business-opportunities', {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: []
      }
    });

    // Style demographic data layer
    map.addLayer({
      id: 'demographic-heatmap',
      type: 'heatmap',
      source: 'demographic-data',
      paint: {
        'heatmap-weight': [
          'interpolate',
          ['linear'],
          ['get', 'population'],
          0, 0,
          100000, 1
        ],
        'heatmap-intensity': [
          'interpolate',
          ['linear'],
          ['zoom'],
          0, 1,
          15, 3
        ],
        'heatmap-color': [
          'interpolate',
          ['linear'],
          ['heatmap-density'],
          0, 'rgba(33,102,172,0)',
          0.2, 'rgb(103,169,207)',
          0.4, 'rgb(209,229,240)',
          0.6, 'rgb(253,219,199)',
          0.8, 'rgb(239,138,98)',
          1, 'rgb(178,24,43)'
        ],
        'heatmap-radius': [
          'interpolate',
          ['linear'],
          ['zoom'],
          0, 2,
          15, 20
        ]
      }
    });

    // Style market analysis layer
    map.addLayer({
      id: 'market-analysis-circles',
      type: 'circle',
      source: 'market-analysis',
      paint: {
        'circle-radius': [
          'interpolate',
          ['linear'],
          ['get', 'opportunityScore'],
          0, 5,
          100, 20
        ],
        'circle-color': [
          'interpolate',
          ['linear'],
          ['get', 'opportunityScore'],
          0, '#ff0000',
          50, '#ffff00',
          100, '#00ff00'
        ],
        'circle-opacity': 0.7,
        'circle-stroke-width': 2,
        'circle-stroke-color': '#ffffff'
      }
    });

    // Style business opportunities layer
    map.addLayer({
      id: 'business-opportunities',
      type: 'symbol',
      source: 'business-opportunities',
      layout: {
        'icon-image': 'marker-15',
        'icon-size': 1.5,
        'text-field': ['get', 'name'],
        'text-font': ['Open Sans Semibold', 'Arial Unicode MS Bold'],
        'text-offset': [0, 1.25],
        'text-anchor': 'top'
      },
      paint: {
        'text-color': '#000000',
        'text-halo-color': '#ffffff',
        'text-halo-width': 2
      }
    });

    setArcgisDataLayers(['demographic-heatmap', 'market-analysis-circles', 'business-opportunities']);
  };

  // Setup interactive analysis
  const setupInteractiveAnalysis = (map: mapboxgl.Map) => {
    map.on('click', async (e) => {
      if (!enableInteractiveAnalysis) return;

      const coordinates: [number, number] = [e.lngLat.lng, e.lngLat.lat];
      setIsAnalyzing(true);

      try {
        // Perform spatial analysis at clicked location
        const spatialAnalysis = await arcgisService.performSpatialAnalysis(
          coordinates[1],
          coordinates[0]
        );

        // Get nearby projects (mock data for now)
        const nearbyProjects = await getNearbyProjects(coordinates);

        // Get business opportunities
        const businessOpportunities = await getBusinessOpportunities(coordinates);

        const interactionData: MapInteractionData = {
          coordinates,
          spatialAnalysis,
          nearbyProjects,
          businessOpportunities
        };

        setSelectedLocation(interactionData);

        // Add popup with analysis results
        showAnalysisPopup(map, coordinates, interactionData);

        // Update ArcGIS data layers with new analysis
        updateArcGISLayers(map, spatialAnalysis);

      } catch (error) {
        console.error('Error performing spatial analysis:', error);
      } finally {
        setIsAnalyzing(false);
      }
    });

    // Change cursor on hover
    map.on('mouseenter', 'market-analysis-circles', () => {
      map.getCanvas().style.cursor = 'pointer';
    });

    map.on('mouseleave', 'market-analysis-circles', () => {
      map.getCanvas().style.cursor = '';
    });
  };

  // Show analysis popup
  const showAnalysisPopup = (
    map: mapboxgl.Map,
    coordinates: [number, number],
    data: MapInteractionData
  ) => {
    const { spatialAnalysis } = data;
    if (!spatialAnalysis) return;

    const popupContent = `
      <div class="p-4 max-w-sm">
        <h3 class="font-bold text-lg mb-2">Location Analysis</h3>
        <div class="space-y-2">
          <div>
            <span class="font-semibold">Opportunity Score:</span>
            <span class="ml-2 px-2 py-1 rounded text-sm ${
              spatialAnalysis.businessOpportunityScore > 70 
                ? 'bg-green-100 text-green-800' 
                : spatialAnalysis.businessOpportunityScore > 40 
                ? 'bg-yellow-100 text-yellow-800' 
                : 'bg-red-100 text-red-800'
            }">
              ${spatialAnalysis.businessOpportunityScore}/100
            </span>
          </div>
          <div>
            <span class="font-semibold">Population:</span>
            <span class="ml-2">${spatialAnalysis.demographics.population.toLocaleString()}</span>
          </div>
          <div>
            <span class="font-semibold">Median Income:</span>
            <span class="ml-2">$${spatialAnalysis.demographics.medianIncome.toLocaleString()}</span>
          </div>
          <div>
            <span class="font-semibold">Construction Permits:</span>
            <span class="ml-2">${spatialAnalysis.marketAnalysis.constructionActivity.permitCount}</span>
          </div>
          ${spatialAnalysis.riskFactors.length > 0 ? `
            <div>
              <span class="font-semibold text-red-600">Risk Factors:</span>
              <ul class="ml-4 mt-1 text-sm">
                ${spatialAnalysis.riskFactors.slice(0, 2).map(risk => `<li>• ${risk}</li>`).join('')}
              </ul>
            </div>
          ` : ''}
          ${spatialAnalysis.recommendations.length > 0 ? `
            <div>
              <span class="font-semibold text-green-600">Recommendations:</span>
              <ul class="ml-4 mt-1 text-sm">
                ${spatialAnalysis.recommendations.slice(0, 2).map(rec => `<li>• ${rec}</li>`).join('')}
              </ul>
            </div>
          ` : ''}
        </div>
      </div>
    `;

    new mapboxgl.Popup({ closeOnClick: true })
      .setLngLat(coordinates)
      .setHTML(popupContent)
      .addTo(map);
  };

  // Update ArcGIS data layers
  const updateArcGISLayers = (map: mapboxgl.Map, analysis: SpatialAnalysisResult) => {
    // Update demographic data
    const demographicFeature = {
      type: 'Feature' as const,
      geometry: {
        type: 'Point' as const,
        coordinates: [analysis.location.longitude, analysis.location.latitude]
      },
      properties: {
        population: analysis.demographics.population,
        medianIncome: analysis.demographics.medianIncome,
        householdCount: analysis.demographics.householdCount
      }
    };

    // Update market analysis data
    const marketFeature = {
      type: 'Feature' as const,
      geometry: {
        type: 'Point' as const,
        coordinates: [analysis.location.longitude, analysis.location.latitude]
      },
      properties: {
        opportunityScore: analysis.businessOpportunityScore,
        permitCount: analysis.marketAnalysis.constructionActivity.permitCount,
        competitorCount: analysis.marketAnalysis.competitorDensity.contractorCount
      }
    };

    // Update sources
    const demographicSource = map.getSource('demographic-data') as mapboxgl.GeoJSONSource;
    if (demographicSource) {
      demographicSource.setData({
        type: 'FeatureCollection',
        features: [demographicFeature]
      });
    }

    const marketSource = map.getSource('market-analysis') as mapboxgl.GeoJSONSource;
    if (marketSource) {
      marketSource.setData({
        type: 'FeatureCollection',
        features: [marketFeature]
      });
    }
  };

  // Add project locations to map
  const addProjectLocations = (projects: ProjectLocation[]) => {
    if (!mapRef.current || !isLoaded) return;

    const map = mapRef.current;

    // Remove existing project source if it exists
    if (map.getSource('projects')) {
      map.removeLayer('project-markers');
      map.removeSource('projects');
    }

    // Create GeoJSON features from projects
    const features = projects.map(project => ({
      type: 'Feature' as const,
      geometry: {
        type: 'Point' as const,
        coordinates: project.coordinates
      },
      properties: {
        id: project.id,
        name: project.name,
        type: project.type,
        status: project.status,
        budget: project.budget || 0,
        jobsCreated: project.socialImpact?.jobsCreated || 0
      }
    }));

    // Add source
    map.addSource('projects', {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features
      }
    });

    // Add layer
    map.addLayer({
      id: 'project-markers',
      type: 'circle',
      source: 'projects',
      paint: {
        'circle-radius': [
          'case',
          ['==', ['get', 'status'], 'completed'], 8,
          ['==', ['get', 'status'], 'active'], 10,
          6
        ],
        'circle-color': [
          'case',
          ['==', ['get', 'status'], 'completed'], '#10b981',
          ['==', ['get', 'status'], 'active'], '#3b82f6',
          '#6b7280'
        ],
        'circle-stroke-width': 2,
        'circle-stroke-color': '#ffffff'
      }
    });

    // Add click handler for project markers
    map.on('click', 'project-markers', (e) => {
      const feature = e.features?.[0];
      if (!feature) return;

      const coordinates = (feature.geometry as any).coordinates.slice();
      const properties = feature.properties;

      const popupContent = `
        <div class="p-3">
          <h4 class="font-bold">${properties?.name}</h4>
          <p class="text-sm text-gray-600 capitalize">${properties?.type} • ${properties?.status}</p>
          ${properties?.budget ? `<p class="text-sm">Budget: $${properties.budget.toLocaleString()}</p>` : ''}
          ${properties?.jobsCreated ? `<p class="text-sm">Jobs Created: ${properties.jobsCreated}</p>` : ''}
        </div>
      `;

      new mapboxgl.Popup()
        .setLngLat(coordinates)
        .setHTML(popupContent)
        .addTo(map);
    });
  };

  // Toggle ArcGIS data layer visibility
  const toggleArcGISLayer = (layerId: string, visible: boolean) => {
    if (!mapRef.current || !isLoaded) return;

    const visibility = visible ? 'visible' : 'none';
    mapRef.current.setLayoutProperty(layerId, 'visibility', visibility);
  };

  // Fly to location
  const flyToLocation = (coordinates: [number, number], zoom?: number) => {
    if (!mapRef.current) return;

    mapRef.current.flyTo({
      center: coordinates,
      zoom: zoom || 14,
      duration: 2000
    });
  };

  // Get service area analysis
  const analyzeServiceArea = async (
    center: [number, number],
    radius: number,
    projectType: string = 'residential'
  ) => {
    try {
      setIsAnalyzing(true);
      const analysis = await arcgisService.performSpatialAnalysis(
        center[1],
        center[0],
        projectType
      );

      // Add service area circle to map
      if (mapRef.current && isLoaded) {
        const map = mapRef.current;
        
        // Remove existing service area if it exists
        if (map.getSource('service-area')) {
          map.removeLayer('service-area-fill');
          map.removeLayer('service-area-line');
          map.removeSource('service-area');
        }

        // Create circle geometry
        const circleFeature = createCircleFeature(center, radius);

        map.addSource('service-area', {
          type: 'geojson',
          data: circleFeature
        });

        map.addLayer({
          id: 'service-area-fill',
          type: 'fill',
          source: 'service-area',
          paint: {
            'fill-color': '#3b82f6',
            'fill-opacity': 0.1
          }
        });

        map.addLayer({
          id: 'service-area-line',
          type: 'line',
          source: 'service-area',
          paint: {
            'line-color': '#3b82f6',
            'line-width': 2,
            'line-dasharray': [2, 2]
          }
        });
      }

      return analysis;
    } catch (error) {
      console.error('Error analyzing service area:', error);
      throw error;
    } finally {
      setIsAnalyzing(false);
    }
  };

  return {
    map: mapRef.current,
    isLoaded,
    selectedLocation,
    arcgisDataLayers,
    isAnalyzing,
    addProjectLocations,
    toggleArcGISLayer,
    flyToLocation,
    analyzeServiceArea
  };
};

// Helper functions
const getNearbyProjects = async (coordinates: [number, number]): Promise<ProjectLocation[]> => {
  // Mock implementation - replace with actual API call
  return [
    {
      id: '1',
      name: 'Residential Complex A',
      coordinates: [coordinates[0] + 0.01, coordinates[1] + 0.01],
      type: 'residential',
      status: 'active',
      budget: 250000,
      socialImpact: {
        jobsCreated: 15,
        trainingHours: 120,
        localHirePercentage: 80
      }
    },
    {
      id: '2',
      name: 'Commercial Plaza B',
      coordinates: [coordinates[0] - 0.01, coordinates[1] - 0.01],
      type: 'commercial',
      status: 'planning',
      budget: 500000
    }
  ];
};

const getBusinessOpportunities = async (coordinates: [number, number]): Promise<any[]> => {
  // Mock implementation - replace with actual API call
  return [
    {
      id: '1',
      title: 'New Development Opportunity',
      type: 'residential',
      estimatedValue: 300000,
      timeline: '6 months'
    }
  ];
};

const createCircleFeature = (center: [number, number], radiusInMeters: number) => {
  const points = 64;
  const coords = [];
  const distanceX = radiusInMeters / (111320 * Math.cos(center[1] * Math.PI / 180));
  const distanceY = radiusInMeters / 110540;

  for (let i = 0; i < points; i++) {
    const theta = (i / points) * (2 * Math.PI);
    const x = distanceX * Math.cos(theta);
    const y = distanceY * Math.sin(theta);
    coords.push([center[0] + x, center[1] + y]);
  }
  coords.push(coords[0]); // Close the polygon

  return {
    type: 'Feature',
    geometry: {
      type: 'Polygon',
      coordinates: [coords]
    }
  };
};
import { useState, useEffect, useCallback } from 'react';

interface MapSettings {
  apiKey: string;
  defaultCenter: { latitude: number; longitude: number };
  defaultZoom: number;
  enabledLayers: string[];
  isConfigured: boolean;
}

interface ArcGISIntegration {
  settings: MapSettings;
  isLoaded: boolean;
  isConfigured: boolean;
  updateSettings: (newSettings: Partial<MapSettings>) => void;
  testConnection: () => Promise<boolean>;
  geocodeAddress: (address: string) => Promise<{ latitude: number; longitude: number } | null>;
  reverseGeocode: (lat: number, lng: number) => Promise<string | null>;
}

const DEFAULT_SETTINGS: MapSettings = {
  apiKey: '',
  defaultCenter: { latitude: 37.7749, longitude: -122.4194 }, // San Francisco
  defaultZoom: 10,
  enabledLayers: ['projects', 'team_locations'],
  isConfigured: false
};

export const useArcGISIntegration = (): ArcGISIntegration => {
  const [settings, setSettings] = useState<MapSettings>(DEFAULT_SETTINGS);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load settings from environment and localStorage on mount
  useEffect(() => {
    const loadSettings = () => {
      try {
        // Check for environment variable first
        const envApiKey = process.env.NEXT_PUBLIC_ARCGIS_API_KEY;
        
        // Check localStorage for user configuration
        const saved = localStorage.getItem('namc-map-settings');
        let savedConfig: any = {};
        
        if (saved) {
          savedConfig = JSON.parse(saved);
        }

        const finalSettings = {
          ...DEFAULT_SETTINGS,
          ...savedConfig,
          apiKey: envApiKey || savedConfig.apiKey || '',
        };

        finalSettings.isConfigured = !!finalSettings.apiKey.trim();

        setSettings(finalSettings);
      } catch (error) {
        console.error('Failed to load ArcGIS settings:', error);
      } finally {
        setIsLoaded(true);
      }
    };

    loadSettings();
  }, []);

  const updateSettings = useCallback((newSettings: Partial<MapSettings>) => {
    const updatedSettings = {
      ...settings,
      ...newSettings,
      isConfigured: !!(newSettings.apiKey ?? settings.apiKey)?.trim()
    };

    setSettings(updatedSettings);
    
    try {
      // Save to localStorage (excluding environment variables)
      const configToSave: any = { ...updatedSettings };
      if (process.env.NEXT_PUBLIC_ARCGIS_API_KEY) {
        delete configToSave.apiKey; // Don't override env var
      }
      localStorage.setItem('namc-map-settings', JSON.stringify(configToSave));
    } catch (error) {
      console.error('Failed to save ArcGIS settings:', error);
    }
  }, [settings]);

  const testConnection = useCallback(async (): Promise<boolean> => {
    if (!settings.apiKey?.trim()) {
      return false;
    }

    try {
      const response = await fetch(
        `https://geocode-api.arcgis.com/arcgis/rest/services/World/GeocodeServer?f=json&token=${settings.apiKey}`
      );
      
      return response.ok;
    } catch (error) {
      console.error('ArcGIS connection test failed:', error);
      return false;
    }
  }, [settings.apiKey]);

  const geocodeAddress = useCallback(async (address: string): Promise<{ latitude: number; longitude: number } | null> => {
    if (!settings.apiKey?.trim() || !address.trim()) {
      return null;
    }

    try {
      const encodedAddress = encodeURIComponent(address);
      const url = `https://geocode-api.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates?singleLine=${encodedAddress}&f=json&token=${settings.apiKey}&maxLocations=1`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Geocoding failed: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.candidates && data.candidates.length > 0) {
        const candidate = data.candidates[0];
        return {
          latitude: candidate.location.y,
          longitude: candidate.location.x
        };
      }

      return null;
    } catch (error) {
      console.error('Geocoding failed:', error);
      return null;
    }
  }, [settings.apiKey]);

  const reverseGeocode = useCallback(async (lat: number, lng: number): Promise<string | null> => {
    if (!settings.apiKey?.trim()) {
      return null;
    }

    try {
      const url = `https://geocode-api.arcgis.com/arcgis/rest/services/World/GeocodeServer/reverseGeocode?location=${lng},${lat}&f=json&token=${settings.apiKey}`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Reverse geocoding failed: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.address) {
        const { address } = data;
        const parts = [];
        
        if (address.Address) parts.push(address.Address);
        if (address.City) parts.push(address.City);
        if (address.Region) parts.push(address.Region);
        if (address.CountryCode) parts.push(address.CountryCode);
        
        return parts.join(', ');
      }

      return null;
    } catch (error) {
      console.error('Reverse geocoding failed:', error);
      return null;
    }
  }, [settings.apiKey]);

  return {
    settings,
    isLoaded,
    isConfigured: settings.isConfigured,
    updateSettings,
    testConnection,
    geocodeAddress,
    reverseGeocode
  };
};

// Utility function to add coordinates to project data
export const enrichProjectsWithCoordinates = async (
  projects: any[],
  geocodeAddress: (address: string) => Promise<{ latitude: number; longitude: number } | null>
): Promise<any[]> => {
  const enrichedProjects = await Promise.all(
    projects.map(async (project) => {
      // Skip if already has coordinates
      if (project.location?.coordinates?.lat && project.location?.coordinates?.lng) {
        return project;
      }

      // Try to geocode the address
      if (project.location?.address && project.location?.city && project.location?.state) {
        const fullAddress = `${project.location.address}, ${project.location.city}, ${project.location.state}`;
        const coordinates = await geocodeAddress(fullAddress);
        
        if (coordinates) {
          return {
            ...project,
            location: {
              ...project.location,
              coordinates: {
                lat: coordinates.latitude,
                lng: coordinates.longitude
              }
            }
          };
        }
      }

      // Fallback: add random coordinates around San Francisco Bay Area for demo
      const baseLat = 37.7749;
      const baseLng = -122.4194;
      const randomLat = baseLat + (Math.random() - 0.5) * 0.5; // ~50km radius
      const randomLng = baseLng + (Math.random() - 0.5) * 0.5;

      return {
        ...project,
        location: {
          ...project.location,
          coordinates: {
            lat: randomLat,
            lng: randomLng
          }
        }
      };
    })
  );

  return enrichedProjects;
};

// Custom hook for project location management
export const useProjectLocations = (projects: any[]) => {
  const { geocodeAddress, isConfigured } = useArcGISIntegration();
  const [enrichedProjects, setEnrichedProjects] = useState<any[]>([]);
  const [isEnriching, setIsEnriching] = useState(false);

  useEffect(() => {
    if (!isConfigured || projects.length === 0) {
      setEnrichedProjects(projects);
      return;
    }

    const enrichProjects = async () => {
      setIsEnriching(true);
      try {
        const enriched = await enrichProjectsWithCoordinates(projects, geocodeAddress);
        setEnrichedProjects(enriched);
      } catch (error) {
        console.error('Failed to enrich projects with coordinates:', error);
        setEnrichedProjects(projects);
      } finally {
        setIsEnriching(false);
      }
    };

    enrichProjects();
  }, [projects, geocodeAddress, isConfigured]);

  return {
    enrichedProjects,
    isEnriching,
    isConfigured
  };
};

export default useArcGISIntegration;
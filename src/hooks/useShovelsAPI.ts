import { useState, useEffect, useCallback } from 'react';

// Shovels API types
interface ShovelsPermit {
  id: string;
  permit_number: string;
  permit_type: string;
  status: 'issued' | 'pending' | 'expired' | 'rejected' | 'under_review';
  issued_date: string;
  expiration_date?: string;
  valuation: number;
  description: string;
  address: {
    street: string;
    city: string;
    state: string;
    zip: string;
    latitude?: number;
    longitude?: number;
  };
  contractor?: {
    name: string;
    license_number?: string;
    phone?: string;
  };
  owner?: {
    name: string;
    phone?: string;
  };
  fees?: {
    total: number;
    paid: number;
    outstanding: number;
  };
  inspections?: ShovelsInspection[];
}

interface ShovelsInspection {
  id: string;
  type: string;
  status: 'scheduled' | 'passed' | 'failed' | 'cancelled';
  scheduled_date?: string;
  completed_date?: string;
  inspector?: string;
  notes?: string;
}

interface ShovelsBuilding {
  id: string;
  address: {
    street: string;
    city: string;
    state: string;
    zip: string;
    latitude?: number;
    longitude?: number;
  };
  property_type: string;
  year_built?: number;
  square_footage?: number;
  lot_size?: number;
  bedrooms?: number;
  bathrooms?: number;
  stories?: number;
  permits: ShovelsPermit[];
}

interface ShovelsAPIConfig {
  apiKey: string;
  baseUrl: string;
  isConfigured: boolean;
}

interface ShovelsAPIHook {
  config: ShovelsAPIConfig;
  isLoaded: boolean;
  updateConfig: (newConfig: Partial<ShovelsAPIConfig>) => void;
  searchPermits: (params: {
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
    permitType?: string;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
    limit?: number;
  }) => Promise<ShovelsPermit[]>;
  getBuildingInfo: (address: string) => Promise<ShovelsBuilding | null>;
  getPermitDetails: (permitId: string) => Promise<ShovelsPermit | null>;
  getPermitsByContractor: (contractorName: string) => Promise<ShovelsPermit[]>;
  testConnection: () => Promise<boolean>;
}

const DEFAULT_CONFIG: ShovelsAPIConfig = {
  apiKey: '',
  baseUrl: 'https://api.shovels.ai/v1',
  isConfigured: false
};

export const useShovelsAPI = (): ShovelsAPIHook => {
  const [config, setConfig] = useState<ShovelsAPIConfig>(DEFAULT_CONFIG);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load configuration from environment and localStorage
  useEffect(() => {
    const loadConfig = () => {
      try {
        // Check for environment variable first
        const envApiKey = process.env.NEXT_PUBLIC_SHOVELS_API_KEY;
        
        // Check localStorage for user configuration
        const saved = localStorage.getItem('namc-shovels-config');
        let savedConfig = {};
        
        if (saved) {
          savedConfig = JSON.parse(saved);
        }

        const finalConfig = {
          ...DEFAULT_CONFIG,
          ...savedConfig,
          apiKey: envApiKey || savedConfig.apiKey || '',
        };

        finalConfig.isConfigured = !!finalConfig.apiKey.trim();

        setConfig(finalConfig);
      } catch (error) {
        console.error('Failed to load Shovels API configuration:', error);
      } finally {
        setIsLoaded(true);
      }
    };

    loadConfig();
  }, []);

  const updateConfig = useCallback((newConfig: Partial<ShovelsAPIConfig>) => {
    const updatedConfig = {
      ...config,
      ...newConfig,
      isConfigured: !!(newConfig.apiKey ?? config.apiKey)?.trim()
    };

    setConfig(updatedConfig);
    
    try {
      // Save to localStorage (excluding environment variables)
      const configToSave = { ...updatedConfig };
      if (process.env.NEXT_PUBLIC_SHOVELS_API_KEY) {
        delete configToSave.apiKey; // Don't override env var
      }
      localStorage.setItem('namc-shovels-config', JSON.stringify(configToSave));
    } catch (error) {
      console.error('Failed to save Shovels API configuration:', error);
    }
  }, [config]);

  const makeAPIRequest = useCallback(async (endpoint: string, params: Record<string, any> = {}) => {
    if (!config.apiKey) {
      throw new Error('Shovels API key not configured');
    }

    const url = new URL(`${config.baseUrl}${endpoint}`);
    
    // Add query parameters
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.append(key, value.toString());
      }
    });

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Shovels API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }, [config.apiKey, config.baseUrl]);

  const searchPermits = useCallback(async (params: {
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
    permitType?: string;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
    limit?: number;
  }): Promise<ShovelsPermit[]> => {
    try {
      const response = await makeAPIRequest('/permits', {
        address: params.address,
        city: params.city,
        state: params.state,
        zip: params.zip,
        permit_type: params.permitType,
        status: params.status,
        issued_date_from: params.dateFrom,
        issued_date_to: params.dateTo,
        limit: params.limit || 50
      });

      return response.permits || [];
    } catch (error) {
      console.error('Failed to search permits:', error);
      return [];
    }
  }, [makeAPIRequest]);

  const getBuildingInfo = useCallback(async (address: string): Promise<ShovelsBuilding | null> => {
    try {
      const response = await makeAPIRequest('/buildings', { address });
      return response.building || null;
    } catch (error) {
      console.error('Failed to get building info:', error);
      return null;
    }
  }, [makeAPIRequest]);

  const getPermitDetails = useCallback(async (permitId: string): Promise<ShovelsPermit | null> => {
    try {
      const response = await makeAPIRequest(`/permits/${permitId}`);
      return response.permit || null;
    } catch (error) {
      console.error('Failed to get permit details:', error);
      return null;
    }
  }, [makeAPIRequest]);

  const getPermitsByContractor = useCallback(async (contractorName: string): Promise<ShovelsPermit[]> => {
    try {
      const response = await makeAPIRequest('/permits', {
        contractor_name: contractorName,
        limit: 100
      });
      return response.permits || [];
    } catch (error) {
      console.error('Failed to get permits by contractor:', error);
      return [];
    }
  }, [makeAPIRequest]);

  const testConnection = useCallback(async (): Promise<boolean> => {
    if (!config.apiKey?.trim()) {
      return false;
    }

    try {
      await makeAPIRequest('/permits', { limit: 1 });
      return true;
    } catch (error) {
      console.error('Shovels API connection test failed:', error);
      return false;
    }
  }, [makeAPIRequest]);

  return {
    config,
    isLoaded,
    updateConfig,
    searchPermits,
    getBuildingInfo,
    getPermitDetails,
    getPermitsByContractor,
    testConnection
  };
};

// Hook for project-specific permit tracking
export const useProjectPermits = (projectAddress?: string, projectCity?: string, projectState?: string) => {
  const { searchPermits, getBuildingInfo, isLoaded: apiLoaded, config } = useShovelsAPI();
  const [permits, setPermits] = useState<ShovelsPermit[]>([]);
  const [buildingInfo, setBuildingInfo] = useState<ShovelsBuilding | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPermits = useCallback(async () => {
    if (!config.isConfigured || !projectAddress) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Search for permits at the project address
      const [permitResults, buildingResults] = await Promise.all([
        searchPermits({
          address: projectAddress,
          city: projectCity,
          state: projectState,
          limit: 50
        }),
        getBuildingInfo(`${projectAddress}, ${projectCity}, ${projectState}`)
      ]);

      setPermits(permitResults);
      setBuildingInfo(buildingResults);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch permit data');
      console.error('Error fetching project permits:', err);
    } finally {
      setIsLoading(false);
    }
  }, [searchPermits, getBuildingInfo, config.isConfigured, projectAddress, projectCity, projectState]);

  useEffect(() => {
    if (apiLoaded && config.isConfigured && projectAddress) {
      fetchPermits();
    }
  }, [apiLoaded, config.isConfigured, projectAddress, fetchPermits]);

  return {
    permits,
    buildingInfo,
    isLoading,
    error,
    refetch: fetchPermits,
    isConfigured: config.isConfigured
  };
};

export default useShovelsAPI;
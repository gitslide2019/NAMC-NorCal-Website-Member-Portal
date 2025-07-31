import React, { useState, useEffect, useMemo } from 'react';
import {
  Map,
  FileText,
  Building,
  Filter,
  Search,
  Calendar,
  DollarSign,
  User,
  Eye,
  Layers,
  MapPin,
  Activity,
  CheckCircle,
  Clock,
  XCircle,
  AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Button from './Button';
import Input from './Input';
import ProjectMap from './ProjectMap';
import { useShovelsAPI } from '@/hooks/useShovelsAPI';
import { useArcGISIntegration } from '@/hooks/useArcGISIntegration';

interface PermitMapViewProps {
  searchArea?: {
    city?: string;
    state?: string;
    zip?: string;
  };
  className?: string;
}

interface PermitLocation {
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
  permitData?: any;
}

const PermitMapView: React.FC<PermitMapViewProps> = ({
  searchArea,
  className = ''
}) => {
  const { searchPermits, config: shovelsConfig } = useShovelsAPI();
  const { settings: arcgisSettings, geocodeAddress } = useArcGISIntegration();
  
  const [permits, setPermits] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPermit, setSelectedPermit] = useState<any | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    status: '',
    type: '',
    dateRange: '',
    minValue: '',
    maxValue: ''
  });

  // Transform permits data for map display
  const permitLocations = useMemo(() => {
    return permits.map(permit => ({
      id: permit.id || permit.permit_number,
      projectId: permit.id || permit.permit_number,
      name: permit.permit_number || 'Unknown Permit',
      address: permit.address ? 
        `${permit.address.street}, ${permit.address.city}, ${permit.address.state}` : 
        'Address not available',
      coordinates: {
        latitude: permit.address?.latitude || 37.7749 + (Math.random() - 0.5) * 0.1,
        longitude: permit.address?.longitude || -122.4194 + (Math.random() - 0.5) * 0.1
      },
      status: mapPermitStatus(permit.status),
      projectType: mapPermitType(permit.permit_type),
      startDate: permit.issued_date || new Date().toISOString(),
      endDate: permit.expiration_date,
      assignedTeam: permit.contractor ? [permit.contractor.name] : [],
      description: permit.description || 'No description available',
      permitData: permit
    }));
  }, [permits]);

  // Map permit status to project status
  function mapPermitStatus(status: string): 'planned' | 'active' | 'completed' | 'on_hold' {
    switch (status) {
      case 'issued':
        return 'active';
      case 'pending':
      case 'under_review':
        return 'planned';
      case 'expired':
        return 'completed';
      case 'rejected':
        return 'on_hold';
      default:
        return 'planned';
    }
  }

  // Map permit type to project type
  function mapPermitType(type: string): 'construction' | 'renovation' | 'inspection' | 'meeting' {
    if (!type) return 'construction';
    
    const lowerType = type.toLowerCase();
    if (lowerType.includes('renovation') || lowerType.includes('remodel')) return 'renovation';
    if (lowerType.includes('inspection')) return 'inspection';
    return 'construction';
  }

  // Fetch permits based on search area and filters
  const fetchPermits = async () => {
    if (!shovelsConfig.isConfigured) return;

    setIsLoading(true);
    try {
      const params: any = {
        limit: 100
      };

      // Add search area parameters
      if (searchArea?.city) params.city = searchArea.city;
      if (searchArea?.state) params.state = searchArea.state;
      if (searchArea?.zip) params.zip = searchArea.zip;

      // Add filters
      if (filters.status) {
        // Map UI status back to API status
        switch (filters.status) {
          case 'active':
            params.status = 'issued';
            break;
          case 'planned':
            params.status = 'pending';
            break;
          case 'completed':
            params.status = 'expired';
            break;
          case 'on_hold':
            params.status = 'rejected';
            break;
        }
      }
      
      if (filters.type) params.permitType = filters.type;
      
      // Date range filtering
      if (filters.dateRange) {
        const now = new Date();
        let dateFrom = new Date();
        
        switch (filters.dateRange) {
          case '30days':
            dateFrom.setDate(now.getDate() - 30);
            break;
          case '6months':
            dateFrom.setMonth(now.getMonth() - 6);
            break;
          case '1year':
            dateFrom.setFullYear(now.getFullYear() - 1);
            break;
        }
        
        params.dateFrom = dateFrom.toISOString().split('T')[0];
      }

      const results = await searchPermits(params);
      
      // Enrich permits with coordinates if they don't have them
      const enrichedPermits = await Promise.all(
        results.map(async (permit) => {
          if (!permit.address?.latitude && permit.address?.street && arcgisSettings.isConfigured) {
            const fullAddress = `${permit.address.street}, ${permit.address.city}, ${permit.address.state}`;
            const coordinates = await geocodeAddress(fullAddress);
            
            if (coordinates) {
              return {
                ...permit,
                address: {
                  ...permit.address,
                  latitude: coordinates.latitude,
                  longitude: coordinates.longitude
                }
              };
            }
          }
          return permit;
        })
      );

      setPermits(enrichedPermits);
    } catch (error) {
      console.error('Failed to fetch permits:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Filter permits by search query
  const filteredPermits = useMemo(() => {
    if (!searchQuery) return permitLocations;
    
    return permitLocations.filter(permit =>
      permit.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      permit.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
      permit.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      permit.permitData?.contractor?.name?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [permitLocations, searchQuery]);

  // Calculate statistics
  const stats = useMemo(() => {
    const total = filteredPermits.length;
    const active = filteredPermits.filter(p => p.status === 'active').length;
    const planned = filteredPermits.filter(p => p.status === 'planned').length;
    const completed = filteredPermits.filter(p => p.status === 'completed').length;
    const totalValue = permits.reduce((sum, p) => sum + (p.valuation || 0), 0);

    return { total, active, planned, completed, totalValue };
  }, [filteredPermits, permits]);

  useEffect(() => {
    if (shovelsConfig.isConfigured) {
      fetchPermits();
    }
  }, [shovelsConfig.isConfigured, filters]);

  const handlePermitSelect = (permitLocation: PermitLocation) => {
    setSelectedPermit(permitLocation.permitData);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'issued':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'pending':
      case 'under_review':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'expired':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'rejected':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'issued':
        return <CheckCircle className="w-4 h-4" />;
      case 'pending':
      case 'under_review':
        return <Clock className="w-4 h-4" />;
      case 'expired':
        return <XCircle className="w-4 h-4" />;
      case 'rejected':
        return <AlertTriangle className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  const PermitInfoPanel: React.FC<{ permit: any }> = ({ permit }) => (
    <motion.div
      initial={{ opacity: 0, x: 300 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 300 }}
      className="absolute top-4 right-4 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-6 z-10 max-h-[80vh] overflow-y-auto"
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {permit.permit_number || 'Unknown Permit'}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {permit.permit_type || 'Type not specified'}
          </p>
        </div>
        <span className={`px-2 py-1 text-xs rounded-full flex items-center space-x-1 ${getStatusColor(permit.status)}`}>
          {getStatusIcon(permit.status)}
          <span>{permit.status?.replace('_', ' ').toUpperCase()}</span>
        </span>
      </div>

      <div className="space-y-3 mb-6">
        {permit.address && (
          <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
            <MapPin className="w-4 h-4" />
            <span>{permit.address.street}, {permit.address.city}</span>
          </div>
        )}
        
        {permit.issued_date && (
          <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
            <Calendar className="w-4 h-4" />
            <span>Issued: {new Date(permit.issued_date).toLocaleDateString()}</span>
          </div>
        )}
        
        {permit.valuation && (
          <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
            <DollarSign className="w-4 h-4" />
            <span>${permit.valuation.toLocaleString()}</span>
          </div>
        )}
        
        {permit.contractor?.name && (
          <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
            <User className="w-4 h-4" />
            <span>{permit.contractor.name}</span>
          </div>
        )}
      </div>

      {permit.description && (
        <div className="mb-4">
          <h4 className="font-medium text-gray-900 dark:text-white mb-2">Description</h4>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {permit.description}
          </p>
        </div>
      )}

      {permit.inspections && permit.inspections.length > 0 && (
        <div className="mb-4">
          <h4 className="font-medium text-gray-900 dark:text-white mb-2">
            Inspections ({permit.inspections.length})
          </h4>
          <div className="space-y-2">
            {permit.inspections.slice(0, 3).map((inspection: any, index: number) => (
              <div key={index} className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">{inspection.type}</span>
                <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(inspection.status)}`}>
                  {inspection.status}
                </span>
              </div>
            ))}
            {permit.inspections.length > 3 && (
              <p className="text-xs text-gray-500 dark:text-gray-500">
                +{permit.inspections.length - 3} more inspections
              </p>
            )}
          </div>
        </div>
      )}

      <Button
        onClick={() => setSelectedPermit(null)}
        variant="outline"
        size="sm"
        className="w-full"
      >
        Close
      </Button>
    </motion.div>
  );

  if (!shovelsConfig.isConfigured || !arcgisSettings.isConfigured) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-lg p-8 border border-gray-200 dark:border-gray-700 text-center ${className}`}>
        <div className="flex items-center justify-center mb-4">
          <Map className="w-16 h-16 text-gray-400 dark:text-gray-500" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Integration Required
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Both ArcGIS and Shovels API integrations are required to display permits on the map.
        </p>
        <div className="flex flex-col sm:flex-row gap-2 justify-center">
          {!arcgisSettings.isConfigured && (
            <Button
              variant="outline"
              onClick={() => window.location.href = '/member/settings/map'}
            >
              Configure ArcGIS
            </Button>
          )}
          {!shovelsConfig.isConfigured && (
            <Button
              onClick={() => window.location.href = '/member/settings/permits'}
            >
              Configure Shovels API
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header and Controls */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Permit Map View
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Construction permits and building data on interactive map
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center space-x-2 ${showFilters ? 'bg-blue-50 border-blue-300 dark:bg-blue-900/20' : ''}`}
          >
            <Filter className="w-4 h-4" />
            <span>Filters</span>
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={fetchPermits}
            disabled={isLoading}
            className="flex items-center space-x-2"
          >
            <Activity className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Permits</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
            </div>
            <FileText className="w-8 h-8 text-blue-500" />
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Active</p>
              <p className="text-xl font-bold text-green-600">{stats.active}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Pending</p>
              <p className="text-xl font-bold text-yellow-600">{stats.planned}</p>
            </div>
            <Clock className="w-8 h-8 text-yellow-500" />
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Value</p>
              <p className="text-xl font-bold text-purple-600">
                ${(stats.totalValue / 1000000).toFixed(1)}M
              </p>
            </div>
            <DollarSign className="w-8 h-8 text-purple-500" />
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <Input
            type="text"
            placeholder="Search permits by number, address, contractor, or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700"
            >
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Status
                  </label>
                  <select
                    value={filters.status}
                    onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="">All Statuses</option>
                    <option value="active">Active (Issued)</option>
                    <option value="planned">Pending</option>
                    <option value="completed">Expired</option>
                    <option value="on_hold">Rejected</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Type
                  </label>
                  <select
                    value={filters.type}
                    onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="">All Types</option>
                    <option value="building">Building</option>
                    <option value="electrical">Electrical</option>
                    <option value="plumbing">Plumbing</option>
                    <option value="mechanical">Mechanical</option>
                    <option value="demolition">Demolition</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Time Period
                  </label>
                  <select
                    value={filters.dateRange}
                    onChange={(e) => setFilters(prev => ({ ...prev, dateRange: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="">All Time</option>
                    <option value="30days">Last 30 Days</option>
                    <option value="6months">Last 6 Months</option>
                    <option value="1year">Last Year</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Min Value ($)
                  </label>
                  <Input
                    type="number"
                    value={filters.minValue}
                    onChange={(e) => setFilters(prev => ({ ...prev, minValue: e.target.value }))}
                    placeholder="0"
                    className="text-sm"
                  />
                </div>

                <div className="flex items-end">
                  <Button
                    variant="outline"
                    onClick={() => setFilters({
                      status: '',
                      type: '',
                      dateRange: '',
                      minValue: '',
                      maxValue: ''
                    })}
                    className="w-full"
                  >
                    Clear Filters
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Map View */}
      <div className="relative">
        {isLoading && (
          <div className="absolute inset-0 bg-white bg-opacity-75 dark:bg-gray-900 dark:bg-opacity-75 flex items-center justify-center z-20 rounded-lg">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400">Loading permit data...</p>
            </div>
          </div>
        )}

        <ProjectMap
          apiKey={arcgisSettings.apiKey}
          projects={filteredPermits}
          onProjectSelect={handlePermitSelect}
          center={arcgisSettings.defaultCenter}
          zoom={arcgisSettings.defaultZoom}
          height="600px"
          showControls={true}
          className="rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700"
        />

        {/* Permit Info Panel */}
        <AnimatePresence>
          {selectedPermit && (
            <PermitInfoPanel permit={selectedPermit} />
          )}
        </AnimatePresence>

        {/* Map Legend */}
        <div className="absolute bottom-4 left-4 bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-3">
          <div className="flex items-center space-x-4 text-xs">
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span className="text-gray-600 dark:text-gray-400">Issued ({stats.active})</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <span className="text-gray-600 dark:text-gray-400">Pending ({stats.planned})</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span className="text-gray-600 dark:text-gray-400">Expired ({stats.completed})</span>
            </div>
          </div>
        </div>
      </div>

      {/* No Permits Message */}
      {!isLoading && filteredPermits.length === 0 && (
        <div className="text-center py-12">
          <div className="w-24 h-24 mx-auto mb-4 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
            <FileText className="w-12 h-12 text-gray-400 dark:text-gray-500" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No permits found
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Try adjusting your search criteria or expanding the search area.
          </p>
          <Button
            variant="outline"
            onClick={() => {
              setSearchQuery('');
              setFilters({
                status: '',
                type: '',
                dateRange: '',
                minValue: '',
                maxValue: ''
              });
            }}
          >
            Clear All Filters
          </Button>
        </div>
      )}
    </div>
  );
};

export default PermitMapView;
import React, { useState, useMemo } from 'react';
import {
  FileText,
  Calendar,
  DollarSign,
  MapPin,
  User,
  Building,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Eye,
  Filter,
  Search,
  Download,
  RefreshCw,
  TrendingUp,
  Activity,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Button from './Button';
import Input from './Input';
import { useShovelsAPI } from '@/hooks/useShovelsAPI';

interface PermitDashboardProps {
  projectAddress?: string;
  projectCity?: string;
  projectState?: string;
  className?: string;
}

interface PermitFilters {
  status: string;
  type: string;
  dateRange: string;
  search: string;
}

const PermitDashboard: React.FC<PermitDashboardProps> = ({
  projectAddress,
  projectCity,
  projectState,
  className = ''
}) => {
  const { searchPermits, config, testConnection } = useShovelsAPI();
  const [permits, setPermits] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPermit, setSelectedPermit] = useState<any | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<PermitFilters>({
    status: '',
    type: '',
    dateRange: '',
    search: ''
  });

  // Fetch permits based on current filters
  const fetchPermits = async () => {
    if (!config.isConfigured) return;

    setIsLoading(true);
    try {
      const params: any = {
        limit: 100
      };

      if (projectAddress) params.address = projectAddress;
      if (projectCity) params.city = projectCity;
      if (projectState) params.state = projectState;
      if (filters.status) params.status = filters.status;
      if (filters.type) params.permitType = filters.type;
      if (filters.search) params.address = filters.search;

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
      setPermits(results);
    } catch (error) {
      console.error('Failed to fetch permits:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Filter permits locally by search term
  const filteredPermits = useMemo(() => {
    if (!filters.search) return permits;
    
    return permits.filter(permit =>
      permit.description?.toLowerCase().includes(filters.search.toLowerCase()) ||
      permit.permit_number?.toLowerCase().includes(filters.search.toLowerCase()) ||
      permit.address?.street?.toLowerCase().includes(filters.search.toLowerCase()) ||
      permit.contractor?.name?.toLowerCase().includes(filters.search.toLowerCase())
    );
  }, [permits, filters.search]);

  // Calculate statistics
  const stats = useMemo(() => {
    const total = filteredPermits.length;
    const issued = filteredPermits.filter(p => p.status === 'issued').length;
    const pending = filteredPermits.filter(p => p.status === 'pending' || p.status === 'under_review').length;
    const expired = filteredPermits.filter(p => p.status === 'expired').length;
    const totalValue = filteredPermits.reduce((sum, p) => sum + (p.valuation || 0), 0);

    return { total, issued, pending, expired, totalValue };
  }, [filteredPermits]);

  React.useEffect(() => {
    if (config.isConfigured) {
      fetchPermits();
    }
  }, [config.isConfigured, filters.status, filters.type, filters.dateRange]);

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

  const StatCard: React.FC<{
    title: string;
    value: string | number;
    icon: React.ElementType;
    color: string;
    subtitle?: string;
  }> = ({ title, value, icon: Icon, color, subtitle }) => (
    <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {subtitle && (
            <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
          )}
        </div>
        <div className={`p-3 rounded-full ${color}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  );

  if (!config.isConfigured) {
    return (
      <div className={`bg-white rounded-lg p-8 border border-gray-200 shadow-sm text-center ${className}`}>
        <div className="p-4 bg-namc-yellow rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
          <Building className="w-10 h-10 text-namc-black" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Shovels API Not Configured
        </h3>
        <p className="text-gray-600 mb-6">
          Configure your Shovels API key to access construction permit data and building information.
        </p>
        <Button 
          onClick={() => window.location.href = '/member/settings/permits'}
          className="bg-namc-yellow hover:bg-accent-yellow text-namc-black"
        >
          Configure Shovels API
        </Button>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-inter font-bold text-gray-900">Permit Dashboard</h2>
          <p className="text-gray-600 mt-1">
            Construction permits and building information
            {projectAddress && ` for ${projectAddress}`}
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center space-x-2 ${showFilters ? 'bg-light-yellow border-namc-yellow' : ''}`}
            data-testid="toggle-filters-button"
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
            data-testid="refresh-permits-button"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Permits"
          value={stats.total}
          icon={FileText}
          color="bg-blue-600"
        />
        <StatCard
          title="Issued Permits"
          value={stats.issued}
          icon={CheckCircle}
          color="bg-green-600"
        />
        <StatCard
          title="Pending Review"
          value={stats.pending}
          icon={Clock}
          color="bg-accent-yellow"
        />
        <StatCard
          title="Total Value"
          value={`$${(stats.totalValue / 1000000).toFixed(1)}M`}
          icon={TrendingUp}
          color="bg-namc-black"
          subtitle="Combined permit valuations"
        />
      </div>

      {/* Search and Filters */}
      <div className="space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <Input
            type="text"
            placeholder="Search permits by number, description, address, or contractor..."
            value={filters.search}
            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
            className="pl-10 bg-white border-gray-200 focus:border-namc-yellow focus:ring-namc-yellow"
            data-testid="permit-search-input"
          />
          {filters.search && (
            <button
              onClick={() => setFilters(prev => ({ ...prev, search: '' }))}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-namc-black transition-colors"
              data-testid="clear-search-button"
              title="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filters Panel */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-light-yellow rounded-lg p-4 border border-namc-yellow"
            >
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-namc-black mb-2">
                    Status
                  </label>
                  <select
                    value={filters.status}
                    onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white text-gray-900 focus:border-namc-yellow focus:ring-namc-yellow"
                    data-testid="status-filter-select"
                  >
                    <option value="">All Statuses</option>
                    <option value="issued">Issued</option>
                    <option value="pending">Pending</option>
                    <option value="under_review">Under Review</option>
                    <option value="expired">Expired</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-namc-black mb-2">
                    Permit Type
                  </label>
                  <select
                    value={filters.type}
                    onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white text-gray-900 focus:border-namc-yellow focus:ring-namc-yellow"
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
                  <label className="block text-sm font-medium text-namc-black mb-2">
                    Time Period
                  </label>
                  <select
                    value={filters.dateRange}
                    onChange={(e) => setFilters(prev => ({ ...prev, dateRange: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white text-gray-900 focus:border-namc-yellow focus:ring-namc-yellow"
                  >
                    <option value="">All Time</option>
                    <option value="30days">Last 30 Days</option>
                    <option value="6months">Last 6 Months</option>
                    <option value="1year">Last Year</option>
                  </select>
                </div>

                <div className="flex items-end">
                  <Button
                    variant="outline"
                    onClick={() => setFilters({
                      status: '',
                      type: '',
                      dateRange: '',
                      search: ''
                    })}
                    className="w-full border-namc-black text-namc-black hover:bg-namc-black hover:text-white"
                    data-testid="clear-filters-button"
                  >
                    Clear Filters
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      )}

      {/* Permits List */}
      {!isLoading && (
        <div className="grid gap-6">
          {filteredPermits.length > 0 ? (
            filteredPermits.map((permit) => (
              <motion.div
                key={permit.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-lg p-6 border border-gray-200 hover:border-namc-yellow hover:shadow-md transition-all duration-200"
                data-testid={`permit-card-${permit.id || permit.permit_number}`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-inter font-semibold text-gray-900">
                        {permit.permit_number || 'Unknown Permit'}
                      </h3>
                      <span className={`px-2 py-1 text-xs rounded-full flex items-center space-x-1 ${getStatusColor(permit.status)}`}>
                        {getStatusIcon(permit.status)}
                        <span>{permit.status?.replace('_', ' ').toUpperCase()}</span>
                      </span>
                    </div>
                    <p className="text-gray-600 mb-3">
                      {permit.description || 'No description available'}
                    </p>
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedPermit(permit)}
                    className="flex items-center space-x-1 border-namc-yellow text-namc-black hover:bg-namc-yellow"
                    data-testid={`permit-details-button-${permit.id || permit.permit_number}`}
                  >
                    <Eye className="w-4 h-4" />
                    <span>Details</span>
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                  <div className="flex items-center space-x-2 text-gray-600">
                    <MapPin className="w-4 h-4" />
                    <span>{permit.address?.street || 'Address not available'}</span>
                  </div>
                  
                  <div className="flex items-center space-x-2 text-gray-600">
                    <Calendar className="w-4 h-4" />
                    <span>{permit.issued_date ? new Date(permit.issued_date).toLocaleDateString() : 'Date unknown'}</span>
                  </div>
                  
                  <div className="flex items-center space-x-2 text-gray-600">
                    <DollarSign className="w-4 h-4" />
                    <span>{permit.valuation ? `$${permit.valuation.toLocaleString()}` : 'Value not specified'}</span>
                  </div>
                  
                  {permit.contractor?.name && (
                    <div className="flex items-center space-x-2 text-gray-600">
                      <User className="w-4 h-4" />
                      <span>{permit.contractor.name}</span>
                    </div>
                  )}
                </div>

                {/* Inspections */}
                {permit.inspections && permit.inspections.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <h4 className="text-sm font-medium text-gray-900 mb-2">
                      Inspections ({permit.inspections.length})
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {permit.inspections.slice(0, 3).map((inspection: any, index: number) => (
                        <span
                          key={index}
                          className={`px-2 py-1 text-xs rounded-full ${
                            inspection.status === 'passed' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                            inspection.status === 'failed' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                            'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                          }`}
                        >
                          {inspection.type} - {inspection.status}
                        </span>
                      ))}
                      {permit.inspections.length > 3 && (
                        <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
                          +{permit.inspections.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            ))
          ) : (
            <div className="text-center py-12">
              <div className="w-24 h-24 mx-auto mb-4 bg-light-yellow rounded-full flex items-center justify-center">
                <FileText className="w-12 h-12 text-namc-black" />
              </div>
              <h3 className="text-lg font-inter font-medium text-gray-900 mb-2">
                No permits found
              </h3>
              <p className="text-gray-600 mb-4">
                {filters.search || filters.status || filters.type || filters.dateRange
                  ? 'Try adjusting your search criteria or clearing the filters.'
                  : 'No permits available for the specified location.'}
              </p>
              {(filters.search || filters.status || filters.type || filters.dateRange) && (
                <Button
                  variant="outline"
                  onClick={() => setFilters({
                    status: '',
                    type: '',
                    dateRange: '',
                    search: ''
                  })}
                  className="bg-namc-yellow hover:bg-accent-yellow text-namc-black border-namc-yellow"
                >
                  Clear All Filters
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Permit Details Modal */}
      {selectedPermit && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-inter font-semibold text-gray-900">
                  Permit Details
                </h3>
                <Button
                  variant="outline"
                  onClick={() => setSelectedPermit(null)}
                  className="p-2 border-namc-yellow text-namc-black hover:bg-namc-yellow"
                >
                  ×
                </Button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Basic Info */}
              <div>
                <h4 className="font-inter font-semibold text-gray-900 mb-3">Basic Information</h4>
                <dl className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <dt className="font-medium text-gray-500">Permit Number</dt>
                    <dd className="text-gray-900">{selectedPermit.permit_number}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-gray-500">Type</dt>
                    <dd className="text-gray-900">{selectedPermit.permit_type}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-gray-500">Status</dt>
                    <dd>
                      <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(selectedPermit.status)}`}>
                        {selectedPermit.status?.replace('_', ' ').toUpperCase()}
                      </span>
                    </dd>
                  </div>
                  <div>
                    <dt className="font-medium text-gray-500">Valuation</dt>
                    <dd className="text-gray-900">
                      {selectedPermit.valuation ? `$${selectedPermit.valuation.toLocaleString()}` : 'Not specified'}
                    </dd>
                  </div>
                </dl>
              </div>

              {/* Address */}
              {selectedPermit.address && (
                <div>
                  <h4 className="font-inter font-semibold text-gray-900 mb-3">Address</h4>
                  <p className="text-gray-600">
                    {selectedPermit.address.street}<br />
                    {selectedPermit.address.city}, {selectedPermit.address.state} {selectedPermit.address.zip}
                  </p>
                </div>
              )}

              {/* Description */}
              {selectedPermit.description && (
                <div>
                  <h4 className="font-inter font-semibold text-gray-900 mb-3">Description</h4>
                  <p className="text-gray-600">
                    {selectedPermit.description}
                  </p>
                </div>
              )}

              {/* Contractor */}
              {selectedPermit.contractor && (
                <div>
                  <h4 className="font-inter font-semibold text-gray-900 mb-3">Contractor</h4>
                  <dl className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <dt className="font-medium text-gray-500">Name</dt>
                      <dd className="text-gray-900">{selectedPermit.contractor.name}</dd>
                    </div>
                    {selectedPermit.contractor.license_number && (
                      <div>
                        <dt className="font-medium text-gray-500">License</dt>
                        <dd className="text-gray-900">{selectedPermit.contractor.license_number}</dd>
                      </div>
                    )}
                    {selectedPermit.contractor.phone && (
                      <div>
                        <dt className="font-medium text-gray-500">Phone</dt>
                        <dd className="text-gray-900">{selectedPermit.contractor.phone}</dd>
                      </div>
                    )}
                  </dl>
                </div>
              )}

              {/* Inspections */}
              {selectedPermit.inspections && selectedPermit.inspections.length > 0 && (
                <div>
                  <h4 className="font-inter font-semibold text-gray-900 mb-3">Inspections</h4>
                  <div className="space-y-3">
                    {selectedPermit.inspections.map((inspection: any, index: number) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-light-yellow rounded-lg border border-namc-yellow">
                        <div>
                          <p className="font-medium text-gray-900">{inspection.type}</p>
                          {inspection.scheduled_date && (
                            <p className="text-sm text-gray-600">
                              Scheduled: {new Date(inspection.scheduled_date).toLocaleDateString()}
                            </p>
                          )}
                          {inspection.notes && (
                            <p className="text-sm text-gray-600">{inspection.notes}</p>
                          )}
                        </div>
                        <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(inspection.status)}`}>
                          {inspection.status?.replace('_', ' ').toUpperCase()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default PermitDashboard;
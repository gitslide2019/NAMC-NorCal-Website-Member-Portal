'use client';

import React, { useState, useEffect } from 'react';
import { Search, Filter, Calendar, MapPin, Wrench, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { ToolCard } from '@/components/ui/ToolCard';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';

interface Tool {
  id: string;
  name: string;
  category: string;
  description?: string;
  dailyRate: number;
  condition: string;
  location?: string;
  isAvailable: boolean;
  requiresTraining: boolean;
  imageUrl?: string;
  activeReservations: number;
  upcomingMaintenance: number;
  nextAvailableDate?: string;
  maintenanceScheduled?: string;
}

interface ToolCatalogProps {
  onToolSelect?: (tool: Tool) => void;
  onReserveClick?: (tool: Tool) => void;
  selectedCategory?: string;
  showFilters?: boolean;
  compact?: boolean;
}

const TOOL_CATEGORIES = [
  { value: '', label: 'All Categories' },
  { value: 'power_tools', label: 'Power Tools' },
  { value: 'hand_tools', label: 'Hand Tools' },
  { value: 'heavy_equipment', label: 'Heavy Equipment' },
  { value: 'safety_equipment', label: 'Safety Equipment' },
  { value: 'measuring_tools', label: 'Measuring Tools' }
];

const CONDITION_COLORS = {
  EXCELLENT: 'text-green-600 bg-green-50',
  GOOD: 'text-blue-600 bg-blue-50',
  FAIR: 'text-yellow-600 bg-yellow-50',
  NEEDS_REPAIR: 'text-red-600 bg-red-50'
};

export function ToolCatalog({
  onToolSelect,
  onReserveClick,
  selectedCategory = '',
  showFilters = true,
  compact = false
}: ToolCatalogProps) {
  const [tools, setTools] = useState<Tool[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [category, setCategory] = useState(selectedCategory);
  const [availableOnly, setAvailableOnly] = useState(false);
  const [location, setLocation] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'rate' | 'condition'>('name');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchTools = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: compact ? '12' : '20'
      });

      if (searchTerm) params.append('search', searchTerm);
      if (category) params.append('category', category);
      if (availableOnly) params.append('available', 'true');
      if (location) params.append('location', location);

      const response = await fetch(`/api/tools?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch tools');
      }

      const data = await response.json();
      setTools(data.tools);
      setTotalPages(data.pagination.totalPages);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tools');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTools();
  }, [searchTerm, category, availableOnly, location, currentPage]);

  useEffect(() => {
    setCategory(selectedCategory);
  }, [selectedCategory]);

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleCategoryChange = (value: string) => {
    setCategory(value);
    setCurrentPage(1);
  };

  const handleAvailabilityToggle = () => {
    setAvailableOnly(!availableOnly);
    setCurrentPage(1);
  };

  const sortedTools = [...tools].sort((a, b) => {
    switch (sortBy) {
      case 'rate':
        return a.dailyRate - b.dailyRate;
      case 'condition':
        const conditionOrder = { EXCELLENT: 0, GOOD: 1, FAIR: 2, NEEDS_REPAIR: 3 };
        return conditionOrder[a.condition as keyof typeof conditionOrder] - 
               conditionOrder[b.condition as keyof typeof conditionOrder];
      default:
        return a.name.localeCompare(b.name);
    }
  });

  if (loading && tools.length === 0) {
    return (
      <div className="space-y-6">
        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <LoadingSkeleton className="h-10" />
            <LoadingSkeleton className="h-10" />
            <LoadingSkeleton className="h-10" />
            <LoadingSkeleton className="h-10" />
          </div>
        )}
        <div className={`grid gap-6 ${compact ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'}`}>
          {Array.from({ length: compact ? 6 : 8 }).map((_, i) => (
            <LoadingSkeleton key={i} className="h-80" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="p-8 text-center">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Tools</h3>
        <p className="text-gray-600 mb-4">{error}</p>
        <Button onClick={fetchTools}>Try Again</Button>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {showFilters && (
        <Card className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search tools..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Category Filter */}
            <select
              value={category}
              onChange={(e) => handleCategoryChange(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
            >
              {TOOL_CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>

            {/* Location Filter */}
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Location..."
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'name' | 'rate' | 'condition')}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
            >
              <option value="name">Sort by Name</option>
              <option value="rate">Sort by Rate</option>
              <option value="condition">Sort by Condition</option>
            </select>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={availableOnly}
                  onChange={handleAvailabilityToggle}
                  className="rounded border-gray-300 text-yellow-600 focus:ring-yellow-500"
                />
                <span className="ml-2 text-sm text-gray-700">Available only</span>
              </label>
            </div>

            <div className="text-sm text-gray-600">
              {tools.length} tool{tools.length !== 1 ? 's' : ''} found
            </div>
          </div>
        </Card>
      )}

      {/* Tools Grid */}
      {sortedTools.length === 0 ? (
        <Card className="p-8 text-center">
          <Wrench className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Tools Found</h3>
          <p className="text-gray-600">
            {searchTerm || category || availableOnly || location
              ? 'Try adjusting your filters to see more results.'
              : 'No tools are currently available in the catalog.'}
          </p>
        </Card>
      ) : (
        <div className={`grid gap-6 ${compact ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'}`}>
          {sortedTools.map((tool) => (
            <ToolCard
              key={tool.id}
              tool={tool}
              onSelect={onToolSelect}
              onReserve={onReserveClick}
              compact={compact}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center space-x-2">
          <Button
            variant="outline"
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
          >
            Previous
          </Button>
          
          <div className="flex items-center space-x-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const page = i + 1;
              return (
                <Button
                  key={page}
                  variant={currentPage === page ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCurrentPage(page)}
                >
                  {page}
                </Button>
              );
            })}
          </div>

          <Button
            variant="outline"
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
import React, { useState, useMemo } from 'react';
import { 
  Map, 
  Grid3X3, 
  Settings,
  Search,
  Filter,
  MapPin,
  Building,
  Calendar,
  Users,
  DollarSign,
  Eye
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Button from './Button';
import Input from './Input';
import ProjectMap from './ProjectMap';
import { EnhancedProject } from '@/types';

interface ProjectsMapViewProps {
  projects: EnhancedProject[];
  selectedProject: EnhancedProject | null;
  onProjectSelect: (project: EnhancedProject) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedStatus: string;
  onStatusChange: (status: string) => void;
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  showFilters: boolean;
  onToggleFilters: () => void;
  apiKey: string;
  className?: string;
}

const ProjectsMapView: React.FC<ProjectsMapViewProps> = ({
  projects,
  selectedProject,
  onProjectSelect,
  searchQuery,
  onSearchChange,
  selectedStatus,
  onStatusChange,
  selectedCategory,
  onCategoryChange,
  showFilters,
  onToggleFilters,
  apiKey,
  className = ''
}) => {
  const [viewMode, setViewMode] = useState<'map' | 'grid'>('map');
  const [mapCenter, setMapCenter] = useState({ latitude: 37.7749, longitude: -122.4194 });
  const [mapZoom, setMapZoom] = useState(10);

  // Transform projects data for map component
  const projectLocations = useMemo(() => {
    return projects.map(project => ({
      id: project.id,
      projectId: project.id,
      name: project.title,
      address: `${project.location.address}, ${project.location.city}, ${project.location.state}`,
      coordinates: {
        latitude: project.location.coordinates?.lat || 37.7749 + (Math.random() - 0.5) * 0.1,
        longitude: project.location.coordinates?.lng || -122.4194 + (Math.random() - 0.5) * 0.1
      },
      status: project.status as 'planned' | 'active' | 'completed' | 'on_hold',
      projectType: project.category as 'construction' | 'renovation' | 'inspection' | 'meeting',
      startDate: project.timeline.startDate,
      endDate: project.timeline.endDate,
      assignedTeam: project.assignedMembers?.map(m => m.id) || [],
      description: project.description
    }));
  }, [projects]);

  const handleMapProjectSelect = (mapProject: any) => {
    const project = projects.find(p => p.id === mapProject.projectId);
    if (project) {
      onProjectSelect(project);
    }
  };

  const ProjectInfoPanel: React.FC<{ project: EnhancedProject }> = ({ project }) => (
    <motion.div
      initial={{ opacity: 0, x: 300 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 300 }}
      className="absolute top-4 right-4 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-6 z-10"
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white line-clamp-2">
            {project.title}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {project.category.replace('_', ' ').toUpperCase()}
          </p>
        </div>
        <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(project.status)}`}>
          {project.status.replace('_', ' ').toUpperCase()}
        </span>
      </div>

      <div className="space-y-3 mb-6">
        <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
          <Building className="w-4 h-4" />
          <span>{project.client}</span>
        </div>
        <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
          <MapPin className="w-4 h-4" />
          <span>{project.location.city}, {project.location.state}</span>
        </div>
        <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
          <Calendar className="w-4 h-4" />
          <span>{new Date(project.timeline.startDate).toLocaleDateString()}</span>
        </div>
        <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
          <DollarSign className="w-4 h-4" />
          <span>${project.budget.allocated.toLocaleString()}</span>
        </div>
        {project.assignedMembers && project.assignedMembers.length > 0 && (
          <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
            <Users className="w-4 h-4" />
            <span>{project.assignedMembers.length} team members</span>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Button
          onClick={() => onProjectSelect(project)}
          className="w-full"
        >
          <Eye className="w-4 h-4 mr-2" />
          View Full Details
        </Button>
      </div>
    </motion.div>
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'on_hold':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'planned':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {/* View Toggle */}
          <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
            <Button
              variant={viewMode === 'map' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('map')}
              className="px-3 py-2"
            >
              <Map className="w-4 h-4 mr-2" />
              Map View
            </Button>
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className="px-3 py-2"
            >
              <Grid3X3 className="w-4 h-4 mr-2" />
              Grid View
            </Button>
          </div>

          {/* Project Count */}
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {projects.length} projects shown
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onToggleFilters}
            className={`flex items-center space-x-2 ${showFilters ? 'bg-blue-50 border-blue-300 dark:bg-blue-900/20' : ''}`}
          >
            <Filter className="w-4 h-4" />
            <span>Filters</span>
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <Input
            type="text"
            placeholder="Search projects by name, client, or location..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Filters Panel */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700"
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Status
                  </label>
                  <select
                    value={selectedStatus}
                    onChange={(e) => onStatusChange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="">All Statuses</option>
                    <option value="planned">Planned</option>
                    <option value="active">Active</option>
                    <option value="completed">Completed</option>
                    <option value="on_hold">On Hold</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Category
                  </label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => onCategoryChange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="">All Categories</option>
                    <option value="construction">Construction</option>
                    <option value="renovation">Renovation</option>
                    <option value="inspection">Inspection</option>
                    <option value="planning">Planning</option>
                  </select>
                </div>

                <div className="flex items-end">
                  <Button
                    variant="outline"
                    onClick={() => {
                      onSearchChange('');
                      onStatusChange('');
                      onCategoryChange('');
                    }}
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
      {viewMode === 'map' && (
        <div className="relative">
          <ProjectMap
            apiKey={apiKey}
            projects={projectLocations}
            onProjectSelect={handleMapProjectSelect}
            center={mapCenter}
            zoom={mapZoom}
            height="600px"
            showControls={true}
            className="rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700"
          />

          {/* Project Info Panel */}
          <AnimatePresence>
            {selectedProject && (
              <ProjectInfoPanel project={selectedProject} />
            )}
          </AnimatePresence>

          {/* Map Statistics */}
          <div className="absolute bottom-4 left-4 bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-3">
            <div className="flex items-center space-x-4 text-sm">
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 bg-blue-500 rounded-full" />
                <span className="text-gray-600 dark:text-gray-400">
                  Active ({projectLocations.filter(p => p.status === 'active').length})
                </span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 bg-green-500 rounded-full" />
                <span className="text-gray-600 dark:text-gray-400">
                  Completed ({projectLocations.filter(p => p.status === 'completed').length})
                </span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 bg-orange-500 rounded-full" />
                <span className="text-gray-600 dark:text-gray-400">
                  On Hold ({projectLocations.filter(p => p.status === 'on_hold').length})
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Grid View - Placeholder for existing grid component */}
      {viewMode === 'grid' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-8 border border-gray-200 dark:border-gray-700 text-center">
          <Grid3X3 className="w-16 h-16 mx-auto text-gray-400 dark:text-gray-500 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Grid View
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Your existing grid view component would be rendered here
          </p>
        </div>
      )}

      {/* No Projects Message */}
      {projects.length === 0 && (
        <div className="text-center py-12">
          <div className="w-24 h-24 mx-auto mb-4 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
            <MapPin className="w-12 h-12 text-gray-400 dark:text-gray-500" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No projects found
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Try adjusting your search criteria or clearing the filters.
          </p>
          <Button
            variant="outline"
            onClick={() => {
              onSearchChange('');
              onStatusChange('');
              onCategoryChange('');
            }}
          >
            Clear All Filters
          </Button>
        </div>
      )}
    </div>
  );
};

export default ProjectsMapView;
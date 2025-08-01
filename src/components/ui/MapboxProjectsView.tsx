'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Map, Marker, Popup, NavigationControl, FullscreenControl } from 'react-map-gl/mapbox'
import { 
  MapPin, 
  Building, 
  Home, 
  Factory, 
  Calendar,
  DollarSign,
  Users,
  Clock,
  AlertTriangle,
  CheckCircle,
  Zap
} from 'lucide-react'
import { motion } from 'framer-motion'
import Button from './Button'

// Mapbox CSS - required for map to display properly
import 'mapbox-gl/dist/mapbox-gl.css'

interface ProjectLocation {
  id: string
  title: string
  category: 'residential' | 'commercial' | 'industrial' | 'infrastructure'
  status: string
  priority: string
  client: {
    companyName: string
    contactPerson: string
  }
  location: {
    city: string
    state: string
    coordinates: {
      lat: number
      lng: number
    }
  }
  budget: {
    estimated: number
    actual: number
  }
  timeline: {
    startDate: Date
    endDate: Date
    progress: number
  }
  team: {
    count: number
    projectManager: string
  }
}

interface MapboxProjectsViewProps {
  projects: ProjectLocation[]
  onProjectSelect?: (project: ProjectLocation) => void
  className?: string
}

const MapboxProjectsView: React.FC<MapboxProjectsViewProps> = ({
  projects,
  onProjectSelect,
  className = ''
}) => {
  const mapRef = useRef<any>(null)
  const [selectedProject, setSelectedProject] = useState<ProjectLocation | null>(null)
  const [mapError, setMapError] = useState<string | null>(null)
  const [mapLoaded, setMapLoaded] = useState(false)

  // Default view centered on San Francisco Bay Area
  const [viewState, setViewState] = useState({
    latitude: 37.7749,
    longitude: -122.4194,
    zoom: 10
  })

  // Get Mapbox API key from environment
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN

  useEffect(() => {
    if (!mapboxToken) {
      setMapError('Mapbox access token not configured. Please add NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN to environment variables.')
    } else {
      setMapError(null)
    }
  }, [mapboxToken])

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'draft': return '#6B7280' // gray
      case 'estimating': return '#3B82F6' // blue
      case 'quoted': return '#8B5CF6' // purple
      case 'contracted': return '#10B981' // green
      case 'in_progress': return '#F59E0B' // yellow/orange
      case 'completed': return '#059669' // darker green
      case 'on_hold': return '#F97316' // orange
      case 'cancelled': return '#EF4444' // red
      default: return '#6B7280' // gray
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'residential': return <Home className="w-4 h-4" />
      case 'commercial': return <Building className="w-4 h-4" />
      case 'industrial': return <Factory className="w-4 h-4" />
      case 'infrastructure': return <MapPin className="w-4 h-4" />
      default: return <Building className="w-4 h-4" />
    }
  }

  const handleMarkerClick = (project: ProjectLocation) => {
    setSelectedProject(project)
    if (onProjectSelect) {
      onProjectSelect(project)
    }
    
    // Center map on selected project
    setViewState(prev => ({
      ...prev,
      latitude: project.location.coordinates.lat,
      longitude: project.location.coordinates.lng,
      zoom: Math.max(prev.zoom, 12)
    }))
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const getDaysRemaining = (endDate: Date) => {
    const today = new Date()
    const diffTime = endDate.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return Math.max(0, diffDays)
  }

  // Error state
  if (mapError) {
    return (
      <div className={`h-96 bg-gray-100 rounded-lg border border-gray-200 flex items-center justify-center ${className}`}>
        <div className="text-center p-8">
          <AlertTriangle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Map Configuration Error</h3>
          <p className="text-gray-600 mb-4">{mapError}</p>
          <p className="text-sm text-gray-500">
            Please configure Mapbox access token in environment variables.
          </p>
        </div>
      </div>
    )
  }

  // No token available
  if (!mapboxToken) {
    return (
      <div className={`h-96 bg-gray-100 rounded-lg border border-gray-200 flex items-center justify-center ${className}`}>
        <div className="text-center p-8">
          <MapPin className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Map Unavailable</h3>
          <p className="text-gray-600 mb-4">
            Interactive map requires Mapbox configuration.
          </p>
          <p className="text-sm text-gray-500">
            Contact administrator to enable map functionality.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className={`relative ${className}`}>
      <div className="h-96 rounded-lg overflow-hidden border border-gray-200">
        <Map
          ref={mapRef}
          {...viewState}
          onMove={(evt: any) => setViewState(evt.viewState)}
          mapboxAccessToken={mapboxToken}
          style={{ width: '100%', height: '100%' }}
          mapStyle="mapbox://styles/mapbox/streets-v12"
          onLoad={() => setMapLoaded(true)}
          onError={(error: any) => {
            console.error('Mapbox error:', error)
            setMapError('Failed to load map. Please check your internet connection.')
          }}
        >
          {/* Navigation Controls */}
          <NavigationControl position="top-right" />
          <FullscreenControl position="top-right" />

          {/* Project Markers */}
          {projects.map((project) => (
            <Marker
              key={project.id}
              latitude={project.location.coordinates.lat}
              longitude={project.location.coordinates.lng}
              onClick={(e: any) => {
                e.originalEvent.stopPropagation()
                handleMarkerClick(project)
              }}
            >
              <div 
                className="relative cursor-pointer transform hover:scale-110 transition-transform"
                style={{ 
                  backgroundColor: getStatusColor(project.status),
                  padding: '8px',
                  borderRadius: '50%',
                  border: '2px solid white',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                }}
              >
                <div className="text-white">
                  {getCategoryIcon(project.category)}
                </div>
              </div>
            </Marker>
          ))}

          {/* Project Details Popup */}
          {selectedProject && (
            <Popup
              latitude={selectedProject.location.coordinates.lat}
              longitude={selectedProject.location.coordinates.lng}
              onClose={() => setSelectedProject(null)}
              closeButton={true}
              closeOnClick={false}
              offset={10}
              className="project-popup"
            >
              <div className="p-4 min-w-80">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start space-x-3">
                    <div 
                      className="p-2 rounded-lg"
                      style={{ backgroundColor: getStatusColor(selectedProject.status) + '20' }}
                    >
                      <div style={{ color: getStatusColor(selectedProject.status) }}>
                        {getCategoryIcon(selectedProject.category)}
                      </div>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 text-sm">
                        {selectedProject.title}
                      </h3>
                      <p className="text-xs text-gray-600">
                        {selectedProject.client.companyName}
                      </p>
                      <p className="text-xs text-gray-500">
                        {selectedProject.location.city}, {selectedProject.location.state}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Status Badge */}
                <div className="mb-3">
                  <span 
                    className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium text-white"
                    style={{ backgroundColor: getStatusColor(selectedProject.status) }}
                  >
                    {selectedProject.status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </span>
                  {selectedProject.priority !== 'medium' && (
                    <span className={`ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      selectedProject.priority === 'high' ? 'bg-red-100 text-red-800' :
                      selectedProject.priority === 'low' ? 'bg-green-100 text-green-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {selectedProject.priority}
                    </span>
                  )}
                </div>

                {/* Key Metrics */}
                <div className="grid grid-cols-3 gap-3 mb-3 text-xs">
                  <div className="text-center">
                    <div className="flex items-center justify-center mb-1">
                      <DollarSign className="w-3 h-3 text-green-600 mr-1" />
                      <span className="font-semibold text-gray-900">
                        {formatCurrency(selectedProject.budget.estimated)}
                      </span>
                    </div>
                    <div className="text-gray-500">Budget</div>
                  </div>
                  
                  <div className="text-center">
                    <div className="flex items-center justify-center mb-1">
                      <Calendar className="w-3 h-3 text-blue-600 mr-1" />
                      <span className="font-semibold text-gray-900">
                        {getDaysRemaining(selectedProject.timeline.endDate)}d
                      </span>
                    </div>
                    <div className="text-gray-500">Remaining</div>
                  </div>
                  
                  <div className="text-center">
                    <div className="flex items-center justify-center mb-1">
                      <Users className="w-3 h-3 text-purple-600 mr-1" />
                      <span className="font-semibold text-gray-900">{selectedProject.team.count}</span>
                    </div>
                    <div className="text-gray-500">Team</div>
                  </div>
                </div>

                {/* Progress */}
                <div className="mb-3">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-gray-600">Progress</span>
                    <span className="font-semibold text-gray-900">{selectedProject.timeline.progress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${selectedProject.timeline.progress}%` }}
                    />
                  </div>
                </div>

                {/* Project Manager */}
                {selectedProject.team.projectManager && (
                  <div className="text-xs text-gray-600 mb-3">
                    <span className="font-medium">PM:</span> {selectedProject.team.projectManager}
                  </div>
                )}

                {/* Timeline */}
                <div className="text-xs text-gray-500 mb-3">
                  {selectedProject.timeline.startDate.toLocaleDateString()} - {selectedProject.timeline.endDate.toLocaleDateString()}
                </div>

                {/* View Details Button */}
                <Button
                  size="sm"
                  onClick={() => {
                    // Navigate to project details
                    window.location.href = `/member/projects/${selectedProject.id}`
                  }}
                  className="w-full text-xs"
                >
                  View Details
                </Button>
              </div>
            </Popup>
          )}
        </Map>
      </div>

      {/* Map Legend */}
      <div className="mt-4 bg-white rounded-lg border border-gray-200 p-4">
        <h4 className="text-sm font-medium text-gray-900 mb-3">Project Status Legend</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div className="flex items-center space-x-2">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: getStatusColor('draft') }}
            />
            <span className="text-gray-600">Draft</span>
          </div>
          <div className="flex items-center space-x-2">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: getStatusColor('in_progress') }}
            />
            <span className="text-gray-600">In Progress</span>
          </div>
          <div className="flex items-center space-x-2">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: getStatusColor('completed') }}
            />
            <span className="text-gray-600">Completed</span>
          </div>
          <div className="flex items-center space-x-2">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: getStatusColor('on_hold') }}
            />
            <span className="text-gray-600">On Hold</span>
          </div>
        </div>
        
        <div className="mt-3 pt-3 border-t border-gray-200">
          <h5 className="text-xs font-medium text-gray-700 mb-2">Project Categories</h5>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div className="flex items-center space-x-2">
              <Home className="w-3 h-3 text-blue-600" />
              <span className="text-gray-600">Residential</span>
            </div>
            <div className="flex items-center space-x-2">
              <Building className="w-3 h-3 text-purple-600" />
              <span className="text-gray-600">Commercial</span>
            </div>
            <div className="flex items-center space-x-2">
              <Factory className="w-3 h-3 text-orange-600" />
              <span className="text-gray-600">Industrial</span>
            </div>
            <div className="flex items-center space-x-2">
              <MapPin className="w-3 h-3 text-green-600" />
              <span className="text-gray-600">Infrastructure</span>
            </div>
          </div>
        </div>
      </div>

      {/* Map Instructions */}
      <div className="mt-2 text-xs text-gray-500 text-center">
        Click on markers to view project details • Use mouse/touch to pan and zoom
      </div>
    </div>
  )
}

export default MapboxProjectsView
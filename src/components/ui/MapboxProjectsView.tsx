'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Map, Marker, Popup, NavigationControl, FullscreenControl } from 'react-map-gl/mapbox'
import mapboxgl from 'mapbox-gl'
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
  Zap,
  FileText
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

interface ShovelsPermit {
  id: string
  permit_number: string
  permit_type: string
  status: 'issued' | 'pending' | 'expired' | 'rejected' | 'under_review'
  issued_date: string
  expiration_date?: string
  valuation: number
  description: string
  address: {
    street: string
    city: string
    state: string
    zip: string
    latitude?: number
    longitude?: number
  }
  contractor?: {
    name: string
    license_number?: string
    phone?: string
  }
  owner?: {
    name: string
    phone?: string
  }
}

interface MapboxProjectsViewProps {
  projects: ProjectLocation[]
  permits?: ShovelsPermit[]
  onProjectSelect?: (project: ProjectLocation) => void
  onPermitSelect?: (permit: ShovelsPermit) => void
  className?: string
  searchTerm?: string
  statusFilter?: string
  categoryFilter?: string
  showPermits?: boolean
  permitSearchCriteria?: {
    city?: string
    permitType?: string
    status?: string
    dateRange?: string
  }
}

const MapboxProjectsView: React.FC<MapboxProjectsViewProps> = ({
  projects,
  permits = [],
  onProjectSelect,
  onPermitSelect,
  className = '',
  searchTerm = '',
  statusFilter = 'all',
  categoryFilter = 'all',
  showPermits = false,
  permitSearchCriteria
}) => {
  const mapRef = useRef<any>(null)
  const [selectedProject, setSelectedProject] = useState<ProjectLocation | null>(null)
  const [selectedPermit, setSelectedPermit] = useState<ShovelsPermit | null>(null)
  const [mapError, setMapError] = useState<string | null>(null)
  const [mapLoaded, setMapLoaded] = useState(false)
  const [mapStyle, setMapStyle] = useState('mapbox://styles/mapbox/streets-v12')

  // Default view centered on San Francisco Bay Area with better zoom
  const [viewState, setViewState] = useState({
    latitude: 37.6213,
    longitude: -122.3790,
    zoom: 9.5
  })

  // Get Mapbox API key from environment
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN

  // Filter projects based on search and filters
  const filteredProjects = projects.filter(project => {
    const matchesSearch = searchTerm === '' || 
      project.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.client.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.location.city.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = statusFilter === 'all' || project.status === statusFilter
    const matchesCategory = categoryFilter === 'all' || project.category === categoryFilter
    
    return matchesSearch && matchesStatus && matchesCategory
  })

  // Filter permits with coordinates
  const permitsWithCoordinates = permits.filter(permit => 
    permit.address.latitude && permit.address.longitude
  )

  // Filter permits based on search criteria
  const filteredPermits = permitsWithCoordinates.filter(permit => {
    if (!showPermits) return false
    
    const matchesSearch = searchTerm === '' || 
      permit.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      permit.permit_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      permit.address.street?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesCity = !permitSearchCriteria?.city || 
      permit.address.city.toLowerCase() === permitSearchCriteria.city.toLowerCase()
    
    const matchesType = !permitSearchCriteria?.permitType || 
      permit.permit_type === permitSearchCriteria.permitType
    
    const matchesStatus = !permitSearchCriteria?.status || 
      permit.status === permitSearchCriteria.status
    
    return matchesSearch && matchesCity && matchesType && matchesStatus
  })

  // Auto-fit map bounds when filtered
  useEffect(() => {
    if (mapRef.current && mapLoaded) {
      const allItems = [
        ...filteredProjects.map(p => ({ lng: p.location.coordinates.lng, lat: p.location.coordinates.lat })),
        ...filteredPermits.map(p => ({ lng: p.address.longitude!, lat: p.address.latitude! }))
      ]
      
      if (allItems.length > 0) {
        const bounds = allItems.reduce((bounds, item) => {
          return bounds.extend([item.lng, item.lat])
        }, new mapboxgl.LngLatBounds())
        
        mapRef.current.fitBounds(bounds, {
          padding: 80,
          maxZoom: 12
        })
      }
    }
  }, [filteredProjects, filteredPermits, mapLoaded])

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

  const getPermitStatusColor = (status: string): string => {
    switch (status) {
      case 'issued': return '#10B981' // green
      case 'pending': return '#F59E0B' // yellow
      case 'under_review': return '#3B82F6' // blue
      case 'expired': return '#EF4444' // red
      case 'rejected': return '#6B7280' // gray
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
    setSelectedPermit(null)
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

  const handlePermitClick = (permit: ShovelsPermit) => {
    setSelectedPermit(permit)
    setSelectedProject(null)
    if (onPermitSelect) {
      onPermitSelect(permit)
    }
    
    // Center map on selected permit
    setViewState(prev => ({
      ...prev,
      latitude: permit.address.latitude!,
      longitude: permit.address.longitude!,
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
          mapStyle={mapStyle}
          onLoad={() => setMapLoaded(true)}
          onError={(error: any) => {
            console.error('Mapbox error:', error)
            setMapError('Failed to load map. Please check your internet connection.')
          }}
        >
          {/* Navigation Controls */}
          <NavigationControl position="top-right" />
          <FullscreenControl position="top-right" />

          {/* Map Style Controls */}
          <div className="absolute top-4 left-4 bg-white rounded-lg shadow-md p-2">
            <div className="flex space-x-2">
              <button
                className={`px-3 py-1 text-xs rounded ${
                  mapStyle === 'mapbox://styles/mapbox/streets-v12' 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
                onClick={() => setMapStyle('mapbox://styles/mapbox/streets-v12')}
              >
                Streets
              </button>
              <button
                className={`px-3 py-1 text-xs rounded ${
                  mapStyle === 'mapbox://styles/mapbox/satellite-streets-v12' 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
                onClick={() => setMapStyle('mapbox://styles/mapbox/satellite-streets-v12')}
              >
                Satellite
              </button>
            </div>
          </div>

          {/* Project Markers */}
          {filteredProjects.map((project) => (
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
                className={`relative cursor-pointer transform hover:scale-110 transition-transform ${
                  project.status === 'in_progress' ? 'animate-pulse' : ''
                }`}
                style={{ 
                  backgroundColor: getStatusColor(project.status),
                  padding: '10px',
                  borderRadius: '50%',
                  border: '3px solid white',
                  boxShadow: '0 4px 8px rgba(0,0,0,0.3)'
                }}
              >
                <div className="text-white">
                  {getCategoryIcon(project.category)}
                </div>
                {project.priority === 'high' && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-ping"></div>
                )}
              </div>
            </Marker>
          ))}

          {/* Permit Markers */}
          {showPermits && filteredPermits.map((permit) => (
            <Marker
              key={permit.id}
              latitude={permit.address.latitude!}
              longitude={permit.address.longitude!}
              onClick={(e: any) => {
                e.originalEvent.stopPropagation()
                handlePermitClick(permit)
              }}
            >
              <div 
                className="relative cursor-pointer transform hover:scale-110 transition-transform"
                style={{ 
                  backgroundColor: getPermitStatusColor(permit.status),
                  padding: '8px',
                  borderRadius: '8px',
                  border: '3px solid white',
                  boxShadow: '0 4px 8px rgba(0,0,0,0.3)'
                }}
              >
                <div className="text-white">
                  <FileText className="w-4 h-4" />
                </div>
                {permit.status === 'expired' && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-ping"></div>
                )}
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

          {/* Permit Details Popup */}
          {selectedPermit && (
            <Popup
              latitude={selectedPermit.address.latitude!}
              longitude={selectedPermit.address.longitude!}
              onClose={() => setSelectedPermit(null)}
              closeButton={true}
              closeOnClick={false}
              offset={10}
              className="permit-popup"
            >
              <div className="p-4 min-w-80">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start space-x-3">
                    <div 
                      className="p-2 rounded-lg"
                      style={{ backgroundColor: getPermitStatusColor(selectedPermit.status) + '20' }}
                    >
                      <div style={{ color: getPermitStatusColor(selectedPermit.status) }}>
                        <FileText className="w-4 h-4" />
                      </div>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 text-sm">
                        Permit #{selectedPermit.permit_number}
                      </h3>
                      <p className="text-xs text-gray-600">
                        {selectedPermit.permit_type}
                      </p>
                      <p className="text-xs text-gray-500">
                        {selectedPermit.address.street}, {selectedPermit.address.city}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Status Badge */}
                <div className="mb-3">
                  <span 
                    className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium text-white"
                    style={{ backgroundColor: getPermitStatusColor(selectedPermit.status) }}
                  >
                    {selectedPermit.status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </span>
                </div>

                {/* Description */}
                {selectedPermit.description && (
                  <div className="mb-3">
                    <div className="text-xs text-gray-600 mb-1">Description:</div>
                    <div className="text-xs text-gray-900">{selectedPermit.description}</div>
                  </div>
                )}

                {/* Key Details */}
                <div className="grid grid-cols-2 gap-3 mb-3 text-xs">
                  <div>
                    <div className="flex items-center justify-center mb-1">
                      <DollarSign className="w-3 h-3 text-green-600 mr-1" />
                      <span className="font-semibold text-gray-900">
                        {formatCurrency(selectedPermit.valuation)}
                      </span>
                    </div>
                    <div className="text-gray-500 text-center">Valuation</div>
                  </div>
                  
                  <div>
                    <div className="flex items-center justify-center mb-1">
                      <Calendar className="w-3 h-3 text-blue-600 mr-1" />
                      <span className="font-semibold text-gray-900">
                        {new Date(selectedPermit.issued_date).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="text-gray-500 text-center">Issued</div>
                  </div>
                </div>

                {/* Contractor */}
                {selectedPermit.contractor && (
                  <div className="text-xs text-gray-600 mb-3">
                    <span className="font-medium">Contractor:</span> {selectedPermit.contractor.name}
                  </div>
                )}

                {/* Owner */}
                {selectedPermit.owner && (
                  <div className="text-xs text-gray-600 mb-3">
                    <span className="font-medium">Owner:</span> {selectedPermit.owner.name}
                  </div>
                )}

                {/* Expiration */}
                {selectedPermit.expiration_date && (
                  <div className="text-xs text-gray-500 mb-3">
                    Expires: {new Date(selectedPermit.expiration_date).toLocaleDateString()}
                  </div>
                )}
              </div>
            </Popup>
          )}
        </Map>
      </div>

      {/* Results Summary */}
      {(searchTerm || statusFilter !== 'all' || categoryFilter !== 'all' || showPermits) && (
        <div className="mt-4 bg-blue-50 rounded-lg border border-blue-200 p-3">
          <div className="flex items-center justify-between">
            <div className="text-sm text-blue-800">
              Showing {filteredProjects.length} of {projects.length} projects
              {showPermits && <span> and {filteredPermits.length} permits</span>}
              {searchTerm && <span> matching "{searchTerm}"</span>}
              {statusFilter !== 'all' && <span> with status: {statusFilter.replace('_', ' ')}</span>}
              {categoryFilter !== 'all' && <span> in category: {categoryFilter}</span>}
            </div>
          </div>
        </div>
      )}

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
        
        {/* Permit Status Legend */}
        {showPermits && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            <h5 className="text-xs font-medium text-gray-700 mb-2">Permit Status Legend</h5>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs">
              <div className="flex items-center space-x-2">
                <div 
                  className="w-3 h-3 rounded-sm" 
                  style={{ backgroundColor: getPermitStatusColor('issued') }}
                />
                <span className="text-gray-600">Issued</span>
              </div>
              <div className="flex items-center space-x-2">
                <div 
                  className="w-3 h-3 rounded-sm" 
                  style={{ backgroundColor: getPermitStatusColor('pending') }}
                />
                <span className="text-gray-600">Pending</span>
              </div>
              <div className="flex items-center space-x-2">
                <div 
                  className="w-3 h-3 rounded-sm" 
                  style={{ backgroundColor: getPermitStatusColor('under_review') }}
                />
                <span className="text-gray-600">Under Review</span>
              </div>
              <div className="flex items-center space-x-2">
                <div 
                  className="w-3 h-3 rounded-sm" 
                  style={{ backgroundColor: getPermitStatusColor('expired') }}
                />
                <span className="text-gray-600">Expired</span>
              </div>
              <div className="flex items-center space-x-2">
                <div 
                  className="w-3 h-3 rounded-sm" 
                  style={{ backgroundColor: getPermitStatusColor('rejected') }}
                />
                <span className="text-gray-600">Rejected</span>
              </div>
            </div>
          </div>
        )}
        
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
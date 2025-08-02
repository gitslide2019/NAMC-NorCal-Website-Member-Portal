'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Script from 'next/script'
import { 
  Map, 
  Table, 
  Search, 
  Filter, 
  MapPin, 
  DollarSign, 
  Calendar, 
  Eye,
  ExternalLink,
  Download,
  RefreshCw,
  Briefcase,
  TrendingUp
} from 'lucide-react'
import Button from '@/components/ui/Button'

interface Opportunity {
  id: string
  title: string
  description: string
  type: string
  status: string
  location: string
  estimatedValue: number | null
  deadline: string | null
  latitude: number | null
  longitude: number | null
  datePosted: string
}

interface ProjectIntelligenceUnifiedProps {
  className?: string
}

export default function ProjectIntelligenceUnified({ className = '' }: ProjectIntelligenceUnifiedProps) {
  const { data: session } = useSession()
  const router = useRouter()
  
  // State management
  const [opportunities, setOpportunities] = useState<Opportunity[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'both' | 'map' | 'table'>('both')
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [selectedOpportunity, setSelectedOpportunity] = useState<Opportunity | null>(null)
  
  // Map state
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<any>(null)
  const [mapboxLoaded, setMapboxLoaded] = useState(false)
  
  // Load opportunities on mount
  useEffect(() => {
    if (session) {
      loadOpportunities()
    }
  }, [session])
  
  // Initialize map when Mapbox is loaded
  useEffect(() => {
    if (mapboxLoaded && opportunities.length > 0 && mapContainer.current && !map.current) {
      initializeMap()
    }
  }, [mapboxLoaded, opportunities])
  
  const loadOpportunities = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/opportunities?limit=100')
      
      if (response.status === 401) {
        router.push('/auth/signin')
        return
      }
      
      const data = await response.json()
      
      if (data.success) {
        setOpportunities(data.data.opportunities)
        console.log('✅ Loaded opportunities:', data.data.opportunities.length)
      } else {
        console.error('❌ Failed to load opportunities:', data.error)
      }
    } catch (error) {
      console.error('❌ Error loading opportunities:', error)
    } finally {
      setLoading(false)
    }
  }
  
  const initializeMap = () => {
    if (!window.mapboxgl || !mapContainer.current) return
    
    // Check if Mapbox token is available
    const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN
    if (!mapboxToken || mapboxToken.includes('test-token')) {
      console.warn('Mapbox token not configured - map functionality disabled')
      if (mapContainer.current) {
        mapContainer.current.innerHTML = `
          <div class="flex items-center justify-center h-full bg-gray-100 text-gray-500">
            <div class="text-center">
              <p class="text-lg">Map Not Available</p>
              <p class="text-sm">Mapbox configuration required</p>
            </div>
          </div>
        `
      }
      return
    }
    
    // Get valid opportunities with coordinates
    const validOpportunities = opportunities.filter(opp => opp.latitude && opp.longitude)
    
    if (validOpportunities.length === 0) {
      if (mapContainer.current) {
        mapContainer.current.innerHTML = `
          <div class="flex items-center justify-center h-full bg-gray-100 text-gray-500">
            <div class="text-center">
              <p class="text-lg">No Location Data</p>
              <p class="text-sm">No opportunities with coordinates available</p>
            </div>
          </div>
        `
      }
      return
    }
    
    // Calculate center point from all opportunities
    const avgLat = validOpportunities.reduce((sum, opp) => sum + (opp.latitude || 0), 0) / validOpportunities.length
    const avgLng = validOpportunities.reduce((sum, opp) => sum + (opp.longitude || 0), 0) / validOpportunities.length
    
    try {
      // Initialize map
      map.current = new window.mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/light-v11',
        center: [avgLng, avgLat],
        zoom: 8
      })
    } catch (error) {
      console.error('Map initialization failed:', error)
      if (mapContainer.current) {
        mapContainer.current.innerHTML = `
          <div class="flex items-center justify-center h-full bg-gray-100 text-gray-500">
            <div class="text-center">
              <p class="text-lg">Map Unavailable</p>
              <p class="text-sm">Map initialization failed</p>
            </div>
          </div>
        `
      }
      return
    }
    
    // Add markers for each opportunity
    validOpportunities.forEach((opportunity) => {
      const marker = document.createElement('div')
      marker.className = 'opportunity-marker'
      marker.style.cssText = `
        width: 30px;
        height: 30px;
        border-radius: 50%;
        background: #3b82f6;
        border: 3px solid white;
        cursor: pointer;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
        color: white;
        font-size: 12px;
      `
      marker.textContent = '$'
      
      // Create popup
      const popup = new window.mapboxgl.Popup({ offset: 25 }).setHTML(`
        <div class="p-3 max-w-sm">
          <h3 class="font-bold text-sm mb-1">${opportunity.title}</h3>
          <p class="text-xs text-gray-600 mb-2">${opportunity.location}</p>
          <p class="text-xs mb-2">${opportunity.description.substring(0, 100)}...</p>
          <div class="flex justify-between items-center text-xs">
            <span class="font-semibold text-green-600">
              ${opportunity.estimatedValue ? '$' + opportunity.estimatedValue.toLocaleString() : 'Value TBD'}
            </span>
            <span class="px-2 py-1 bg-blue-100 text-blue-800 rounded">${opportunity.type}</span>
          </div>
        </div>
      `)
      
      // Add marker to map
      new window.mapboxgl.Marker(marker)
        .setLngLat([opportunity.longitude!, opportunity.latitude!])
        .setPopup(popup)
        .addTo(map.current)
      
      // Handle marker click
      marker.addEventListener('click', () => {
        setSelectedOpportunity(opportunity)
      })
    })
  }
  
  // Filter opportunities based on search and type
  const filteredOpportunities = opportunities.filter(opp => {
    const matchesSearch = searchTerm === '' || 
      opp.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      opp.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      opp.location?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesType = filterType === 'all' || opp.type === filterType
    
    return matchesSearch && matchesType
  })
  
  // Get unique types for filter
  const uniqueTypes = [...new Set(opportunities.map(opp => opp.type))]
  
  const formatCurrency = (value: number | null) => {
    if (!value) return 'TBD'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }
  
  return (
    <>
      {/* Load Mapbox GL JS */}
      <Script
        src="https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.js"
        onLoad={() => {
          setMapboxLoaded(true)
          if (window.mapboxgl) {
            (window as any).mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || ''
          }
        }}
      />
      <link
        href="https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.css"
        rel="stylesheet"
      />
      
      <div className={`space-y-6 ${className}`}>
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">NAMC Project Opportunities</h1>
              <p className="text-gray-600 mt-1">
                {loading ? 'Loading...' : `${filteredOpportunities.length} opportunities available`}
              </p>
            </div>
            
            {/* View Mode Toggle */}
            <div className="flex gap-2">
              <Button
                variant={viewMode === 'both' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setViewMode('both')}
                className="flex items-center gap-2"
              >
                <Eye className="w-4 h-4" />
                Both Views
              </Button>
              <Button
                variant={viewMode === 'map' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setViewMode('map')}
                className="flex items-center gap-2"
              >
                <Map className="w-4 h-4" />
                Map
              </Button>
              <Button
                variant={viewMode === 'table' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setViewMode('table')}
                className="flex items-center gap-2"
              >
                <Table className="w-4 h-4" />
                Table
              </Button>
            </div>
          </div>
          
          {/* Search and Filter Bar */}
          <div className="flex flex-col md:flex-row gap-4 mt-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search opportunities by title, description, or location..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Types</option>
              {uniqueTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
            
            <Button
              variant="outline"
              size="sm"
              onClick={loadOpportunities}
              disabled={loading}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>
        
        {/* Map View */}
        {(viewMode === 'both' || viewMode === 'map') && (
          <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
            <div className="p-4 border-b">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <MapPin className="w-5 h-5 text-blue-600" />
                Opportunity Locations
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Click markers to view opportunity details
              </p>
            </div>
            <div
              ref={mapContainer}
              className="w-full h-96"
              style={{ minHeight: '400px' }}
            />
          </div>
        )}
        
        {/* Table View */}
        {(viewMode === 'both' || viewMode === 'table') && (
          <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
            <div className="p-4 border-b flex items-center justify-between">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Table className="w-5 h-5 text-blue-600" />
                Opportunities List
              </h2>
              <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </Button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Opportunity
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Location
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Value
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Deadline
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                        Loading opportunities...
                      </td>
                    </tr>
                  ) : filteredOpportunities.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                        No opportunities found matching your criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredOpportunities.map((opportunity) => (
                      <tr key={opportunity.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="max-w-xs">
                            <div className="text-sm font-medium text-gray-900 truncate">
                              {opportunity.title}
                            </div>
                            <div className="text-sm text-gray-500 truncate">
                              {opportunity.description.substring(0, 60)}...
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {opportunity.type}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {opportunity.location || 'TBD'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                          {formatCurrency(opportunity.estimatedValue)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {opportunity.deadline ? formatDate(opportunity.deadline) : 'Open'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            opportunity.status === 'Active' ? 'bg-green-100 text-green-800' :
                            opportunity.status === 'In Progress' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {opportunity.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex items-center gap-1"
                            onClick={() => setSelectedOpportunity(opportunity)}
                          >
                            <Eye className="w-3 h-3" />
                            View
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
        
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow-sm border p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Opportunities</p>
                <p className="text-2xl font-bold text-gray-900">{opportunities.length}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <Briefcase className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Projects</p>
                <p className="text-2xl font-bold text-gray-900">
                  {opportunities.filter(opp => opp.status === 'Active').length}
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Value</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(opportunities.reduce((sum, opp) => sum + (opp.estimatedValue || 0), 0))}
                </p>
              </div>
              <div className="p-3 bg-yellow-100 rounded-full">
                <DollarSign className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">This Month</p>
                <p className="text-2xl font-bold text-gray-900">
                  {opportunities.filter(opp => {
                    const postDate = new Date(opp.datePosted)
                    const now = new Date()
                    return postDate.getMonth() === now.getMonth() && postDate.getFullYear() === now.getFullYear()
                  }).length}
                </p>
              </div>
              <div className="p-3 bg-purple-100 rounded-full">
                <Calendar className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
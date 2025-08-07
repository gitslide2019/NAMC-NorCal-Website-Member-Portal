'use client';

import React, { useRef, useEffect, useState } from 'react';
import { useMapboxMap, MapboxMapOptions, ProjectLocation, MapInteractionData } from '@/hooks/useMapboxMap';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  MapPin, 
  Layers, 
  Search, 
  Target, 
  TrendingUp, 
  Users, 
  DollarSign,
  AlertTriangle,
  CheckCircle,
  Loader2
} from 'lucide-react';

interface MapboxMapProps {
  className?: string;
  options?: MapboxMapOptions;
  projects?: ProjectLocation[];
  onLocationSelect?: (data: MapInteractionData) => void;
  showControls?: boolean;
  showAnalysisPanel?: boolean;
  height?: string;
}

export const MapboxMap: React.FC<MapboxMapProps> = ({
  className = '',
  options = {},
  projects = [],
  onLocationSelect,
  showControls = true,
  showAnalysisPanel = true,
  height = '500px'
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('demographics');
  const [layerVisibility, setLayerVisibility] = useState({
    'demographic-heatmap': true,
    'market-analysis-circles': true,
    'business-opportunities': true
  });

  const {
    map,
    isLoaded,
    selectedLocation,
    arcgisDataLayers,
    isAnalyzing,
    addProjectLocations,
    toggleArcGISLayer,
    flyToLocation,
    analyzeServiceArea
  } = useMapboxMap(mapContainer, options);

  // Add projects to map when they change
  useEffect(() => {
    if (isLoaded && projects.length > 0) {
      addProjectLocations(projects);
    }
  }, [isLoaded, projects, addProjectLocations]);

  // Handle location selection
  useEffect(() => {
    if (selectedLocation && onLocationSelect) {
      onLocationSelect(selectedLocation);
    }
  }, [selectedLocation, onLocationSelect]);

  // Handle layer visibility toggle
  const handleLayerToggle = (layerId: string) => {
    const newVisibility = !layerVisibility[layerId as keyof typeof layerVisibility];
    setLayerVisibility(prev => ({
      ...prev,
      [layerId]: newVisibility
    }));
    toggleArcGISLayer(layerId, newVisibility);
  };

  // Handle search
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    try {
      // Geocode the search query
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(searchQuery)}.json?access_token=${process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN}&country=US&types=place,locality,neighborhood,address`
      );
      
      const data = await response.json();
      
      if (data.features && data.features.length > 0) {
        const [lng, lat] = data.features[0].center;
        flyToLocation([lng, lat], 14);
      }
    } catch (error) {
      console.error('Error searching location:', error);
    }
  };

  // Handle service area analysis
  const handleServiceAreaAnalysis = async () => {
    if (!map) return;

    const center = map.getCenter();
    await analyzeServiceArea([center.lng, center.lat], 5000, 'residential');
  };

  return (
    <div className={`relative ${className}`}>
      {/* Map Container */}
      <div 
        ref={mapContainer} 
        className="w-full rounded-lg overflow-hidden border"
        style={{ height }}
      />

      {/* Loading Overlay */}
      {isAnalyzing && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-10 rounded-lg">
          <div className="bg-white p-4 rounded-lg flex items-center space-x-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Analyzing location...</span>
          </div>
        </div>
      )}

      {/* Map Controls */}
      {showControls && isLoaded && (
        <div className="absolute top-4 left-4 z-10 space-y-2">
          {/* Search Control */}
          <Card className="w-80">
            <CardContent className="p-3">
              <div className="flex space-x-2">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search locations..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                    className="w-full pl-10 pr-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <Button size="sm" onClick={handleSearch}>
                  <Search className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Layer Controls */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center">
                <Layers className="h-4 w-4 mr-2" />
                Map Layers
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-2">
              {arcgisDataLayers.map((layerId) => (
                <label key={layerId} className="flex items-center space-x-2 text-sm">
                  <input
                    type="checkbox"
                    checked={layerVisibility[layerId as keyof typeof layerVisibility]}
                    onChange={() => handleLayerToggle(layerId)}
                    className="rounded"
                  />
                  <span className="capitalize">
                    {layerId.replace(/-/g, ' ').replace('heatmap', 'Demographics').replace('circles', 'Market Data')}
                  </span>
                </label>
              ))}
            </CardContent>
          </Card>

          {/* Analysis Tools */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center">
                <Target className="h-4 w-4 mr-2" />
                Analysis Tools
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-2">
              <Button 
                size="sm" 
                variant="outline" 
                onClick={handleServiceAreaAnalysis}
                className="w-full text-xs"
                disabled={isAnalyzing}
              >
                <Target className="h-3 w-3 mr-1" />
                Service Area Analysis
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Analysis Panel */}
      {showAnalysisPanel && selectedLocation && (
        <div className="absolute top-4 right-4 z-10 w-96">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <MapPin className="h-5 w-5 mr-2" />
                Location Analysis
              </CardTitle>
              <p className="text-sm text-gray-600">
                {selectedLocation.spatialAnalysis?.location.address}
              </p>
            </CardHeader>
            <CardContent>
              {selectedLocation.spatialAnalysis && (
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="demographics" className="text-xs">Demographics</TabsTrigger>
                    <TabsTrigger value="market" className="text-xs">Market</TabsTrigger>
                    <TabsTrigger value="insights" className="text-xs">Insights</TabsTrigger>
                  </TabsList>

                  <TabsContent value="demographics" className="space-y-3 mt-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="text-center p-3 bg-blue-50 rounded-lg">
                        <Users className="h-5 w-5 mx-auto mb-1 text-blue-600" />
                        <div className="text-lg font-semibold">
                          {selectedLocation.spatialAnalysis.demographics.population.toLocaleString()}
                        </div>
                        <div className="text-xs text-gray-600">Population</div>
                      </div>
                      <div className="text-center p-3 bg-green-50 rounded-lg">
                        <DollarSign className="h-5 w-5 mx-auto mb-1 text-green-600" />
                        <div className="text-lg font-semibold">
                          ${selectedLocation.spatialAnalysis.demographics.medianIncome.toLocaleString()}
                        </div>
                        <div className="text-xs text-gray-600">Median Income</div>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Households:</span>
                        <span>{selectedLocation.spatialAnalysis.demographics.householdCount.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Housing Units:</span>
                        <span>{selectedLocation.spatialAnalysis.demographics.housingUnits.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Median Home Value:</span>
                        <span>${selectedLocation.spatialAnalysis.demographics.medianHomeValue.toLocaleString()}</span>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="market" className="space-y-3 mt-4">
                    <div className="text-center p-3 bg-purple-50 rounded-lg">
                      <TrendingUp className="h-5 w-5 mx-auto mb-1 text-purple-600" />
                      <div className="text-2xl font-bold">
                        {selectedLocation.spatialAnalysis.businessOpportunityScore}
                      </div>
                      <div className="text-xs text-gray-600">Opportunity Score</div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Construction Permits:</span>
                        <span>{selectedLocation.spatialAnalysis.marketAnalysis.constructionActivity.permitCount}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Total Permit Value:</span>
                        <span>${selectedLocation.spatialAnalysis.marketAnalysis.constructionActivity.totalValue.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Competitors:</span>
                        <span>{selectedLocation.spatialAnalysis.marketAnalysis.competitorDensity.contractorCount}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Unemployment Rate:</span>
                        <span>{(selectedLocation.spatialAnalysis.marketAnalysis.economicIndicators.unemploymentRate * 100).toFixed(1)}%</span>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="insights" className="space-y-3 mt-4">
                    {selectedLocation.spatialAnalysis.riskFactors.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-sm flex items-center mb-2">
                          <AlertTriangle className="h-4 w-4 mr-1 text-red-500" />
                          Risk Factors
                        </h4>
                        <div className="space-y-1">
                          {selectedLocation.spatialAnalysis.riskFactors.map((risk, index) => (
                            <Badge key={index} variant="destructive" className="text-xs block">
                              {risk}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {selectedLocation.spatialAnalysis.recommendations.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-sm flex items-center mb-2">
                          <CheckCircle className="h-4 w-4 mr-1 text-green-500" />
                          Recommendations
                        </h4>
                        <div className="space-y-1">
                          {selectedLocation.spatialAnalysis.recommendations.map((rec, index) => (
                            <Badge key={index} variant="secondary" className="text-xs block">
                              {rec}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    <div>
                      <h4 className="font-semibold text-sm mb-2">Service Area Analysis</h4>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span>Population Covered:</span>
                          <span>{selectedLocation.spatialAnalysis.serviceAreaAnalysis.populationCovered.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Market Potential:</span>
                          <span>{selectedLocation.spatialAnalysis.serviceAreaAnalysis.marketPotential.toFixed(1)}%</span>
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Project Legend */}
      {projects.length > 0 && (
        <div className="absolute bottom-4 left-4 z-10">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Projects</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-1 text-xs">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                  <span>Active Projects</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <span>Completed Projects</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-gray-500"></div>
                  <span>Planning Phase</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default MapboxMap;
'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  BarChart3, 
  PieChart, 
  TrendingUp, 
  TrendingDown,
  Target,
  Users,
  DollarSign,
  Building,
  MapPin,
  AlertCircle,
  CheckCircle,
  Zap,
  Activity,
  Calendar,
  Award,
  Briefcase
} from 'lucide-react';
import { useArcGISIntegration, BusinessIntelligenceData } from '@/hooks/useArcGISIntegration';

interface SpatialBusinessIntelligenceProps {
  locations: Array<{
    id: string;
    name: string;
    latitude: number;
    longitude: number;
    type: 'current' | 'potential' | 'competitor';
  }>;
  onLocationSelect?: (locationId: string) => void;
  className?: string;
}

interface LocationAnalysis extends BusinessIntelligenceData {
  locationId: string;
  locationName: string;
  coordinates: [number, number];
}

export const SpatialBusinessIntelligence: React.FC<SpatialBusinessIntelligenceProps> = ({
  locations,
  onLocationSelect,
  className = ''
}) => {
  const [analyses, setAnalyses] = useState<LocationAnalysis[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const { getBusinessIntelligence, compareLocations, isLoading } = useArcGISIntegration();

  // Load business intelligence for all locations
  useEffect(() => {
    if (locations.length > 0) {
      loadBusinessIntelligence();
    }
  }, [locations]);

  const loadBusinessIntelligence = async () => {
    setIsAnalyzing(true);
    try {
      const analysisPromises = locations.map(async (location) => {
        const intelligence = await getBusinessIntelligence(
          location.latitude,
          location.longitude,
          'construction'
        );
        
        return {
          ...intelligence,
          locationId: location.id,
          locationName: location.name,
          coordinates: [location.longitude, location.latitude] as [number, number]
        };
      });

      const results = await Promise.all(analysisPromises);
      setAnalyses(results);
      
      if (results.length > 0 && !selectedLocation) {
        setSelectedLocation(results[0].locationId);
      }
    } catch (error) {
      console.error('Error loading business intelligence:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const selectedAnalysis = analyses.find(a => a.locationId === selectedLocation);

  const getMarketSizeLabel = (tam: number) => {
    if (tam > 10000000) return 'Very Large';
    if (tam > 5000000) return 'Large';
    if (tam > 1000000) return 'Medium';
    return 'Small';
  };

  const getGrowthPotentialColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-50';
    if (score >= 60) return 'text-blue-600 bg-blue-50';
    if (score >= 40) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const getCompetitivePositionColor = (marketShare: number) => {
    if (marketShare >= 0.2) return 'text-green-600';
    if (marketShare >= 0.1) return 'text-blue-600';
    if (marketShare >= 0.05) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (isAnalyzing || isLoading) {
    return (
      <div className={`space-y-4 ${className}`}>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-center space-x-2">
              <Activity className="h-5 w-5 animate-pulse" />
              <span>Analyzing business intelligence...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (analyses.length === 0) {
    return (
      <div className={`space-y-4 ${className}`}>
        <Card>
          <CardContent className="p-6">
            <div className="text-center space-y-2">
              <AlertCircle className="h-8 w-8 text-gray-400 mx-auto" />
              <p className="text-gray-600">No location data available</p>
              <Button onClick={loadBusinessIntelligence} variant="outline" size="sm">
                Load Analysis
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center">
            <BarChart3 className="h-6 w-6 mr-2" />
            Spatial Business Intelligence
          </h2>
          <p className="text-gray-600 mt-1">
            Comprehensive market analysis across {analyses.length} locations
          </p>
        </div>
        <Button onClick={loadBusinessIntelligence} variant="outline" size="sm">
          <Activity className="h-4 w-4 mr-2" />
          Refresh Analysis
        </Button>
      </div>

      {/* Location Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Location Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {analyses.map((analysis) => (
              <div
                key={analysis.locationId}
                className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                  selectedLocation === analysis.locationId
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => {
                  setSelectedLocation(analysis.locationId);
                  if (onLocationSelect) {
                    onLocationSelect(analysis.locationId);
                  }
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium">{analysis.locationName}</h3>
                  <MapPin className="h-4 w-4 text-gray-400" />
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Market Size:</span>
                    <span className="font-medium">
                      {getMarketSizeLabel(analysis.marketSize.totalAddressableMarket)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Growth Score:</span>
                    <span className={`font-medium ${getGrowthPotentialColor(analysis.growthPotential.overallScore).split(' ')[0]}`}>
                      {analysis.growthPotential.overallScore.toFixed(0)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Competitors:</span>
                    <span className="font-medium">{analysis.competitivePosition.competitorCount}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Detailed Analysis */}
      {selectedAnalysis && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Target className="h-5 w-5 mr-2" />
              {selectedAnalysis.locationName} - Business Intelligence
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="market">Market Size</TabsTrigger>
                <TabsTrigger value="competition">Competition</TabsTrigger>
                <TabsTrigger value="growth">Growth</TabsTrigger>
                <TabsTrigger value="strategy">Strategy</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-6 mt-6">
                {/* Key Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600">Market Size</p>
                          <p className="text-xl font-bold">
                            ${(selectedAnalysis.marketSize.totalAddressableMarket / 1000000).toFixed(1)}M
                          </p>
                          <p className="text-xs text-gray-500">
                            {getMarketSizeLabel(selectedAnalysis.marketSize.totalAddressableMarket)}
                          </p>
                        </div>
                        <div className="p-3 rounded-full bg-blue-50 text-blue-600">
                          <DollarSign className="h-5 w-5" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600">Growth Score</p>
                          <p className={`text-xl font-bold ${getGrowthPotentialColor(selectedAnalysis.growthPotential.overallScore).split(' ')[0]}`}>
                            {selectedAnalysis.growthPotential.overallScore.toFixed(0)}
                          </p>
                          <p className="text-xs text-gray-500">Out of 100</p>
                        </div>
                        <div className={`p-3 rounded-full ${getGrowthPotentialColor(selectedAnalysis.growthPotential.overallScore)}`}>
                          <TrendingUp className="h-5 w-5" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600">Market Share</p>
                          <p className={`text-xl font-bold ${getCompetitivePositionColor(selectedAnalysis.competitivePosition.marketShare)}`}>
                            {(selectedAnalysis.competitivePosition.marketShare * 100).toFixed(1)}%
                          </p>
                          <p className="text-xs text-gray-500">
                            {selectedAnalysis.competitivePosition.competitorCount} competitors
                          </p>
                        </div>
                        <div className="p-3 rounded-full bg-purple-50 text-purple-600">
                          <PieChart className="h-5 w-5" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600">Avg Project</p>
                          <p className="text-xl font-bold">
                            ${(selectedAnalysis.pricingInsights.averageProjectValue / 1000).toFixed(0)}K
                          </p>
                          <p className="text-xs text-gray-500">Project value</p>
                        </div>
                        <div className="p-3 rounded-full bg-green-50 text-green-600">
                          <Building className="h-5 w-5" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Target Customers */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="font-semibold flex items-center">
                      <Users className="h-5 w-5 mr-2" />
                      Target Customer Profile
                    </h3>
                    <div className="space-y-3">
                      <div className="p-4 bg-blue-50 rounded-lg">
                        <h4 className="font-medium text-blue-800">Primary Segment</h4>
                        <p className="text-sm text-blue-700 mt-1">
                          {selectedAnalysis.targetCustomers.primarySegment}
                        </p>
                      </div>
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <h4 className="font-medium text-gray-800">Secondary Segment</h4>
                        <p className="text-sm text-gray-700 mt-1">
                          {selectedAnalysis.targetCustomers.secondarySegment}
                        </p>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Age Group:</span>
                          <span className="font-medium">{selectedAnalysis.targetCustomers.demographics.ageGroup}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Income Range:</span>
                          <span className="font-medium">{selectedAnalysis.targetCustomers.demographics.incomeRange}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Home Ownership:</span>
                          <span className="font-medium">{selectedAnalysis.targetCustomers.demographics.homeOwnership}%</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-semibold flex items-center">
                      <DollarSign className="h-5 w-5 mr-2" />
                      Pricing Intelligence
                    </h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Price Elasticity</span>
                        <Badge variant="outline">
                          {selectedAnalysis.pricingInsights.priceElasticity.toFixed(2)}
                        </Badge>
                      </div>
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium">Competitive Pricing Range</h4>
                        <div className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span>Low:</span>
                            <span>${selectedAnalysis.pricingInsights.competitivePricing.low}/hr</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>Average:</span>
                            <span>${selectedAnalysis.pricingInsights.competitivePricing.average}/hr</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>High:</span>
                            <span>${selectedAnalysis.pricingInsights.competitivePricing.high}/hr</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="market" className="space-y-6 mt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Market Size Breakdown */}
                  <div className="space-y-4">
                    <h3 className="font-semibold flex items-center">
                      <Target className="h-5 w-5 mr-2" />
                      Market Size Analysis
                    </h3>
                    <div className="space-y-4">
                      <div className="p-4 bg-blue-50 rounded-lg">
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-medium text-blue-800">Total Addressable Market</span>
                          <span className="text-lg font-bold text-blue-800">
                            ${(selectedAnalysis.marketSize.totalAddressableMarket / 1000000).toFixed(1)}M
                          </span>
                        </div>
                        <p className="text-sm text-blue-700">
                          Total market opportunity in the region
                        </p>
                      </div>
                      
                      <div className="p-4 bg-green-50 rounded-lg">
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-medium text-green-800">Serviceable Market</span>
                          <span className="text-lg font-bold text-green-800">
                            ${(selectedAnalysis.marketSize.serviceableMarket / 1000000).toFixed(1)}M
                          </span>
                        </div>
                        <p className="text-sm text-green-700">
                          Market you can realistically serve
                        </p>
                      </div>
                      
                      <div className="p-4 bg-purple-50 rounded-lg">
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-medium text-purple-800">Target Market</span>
                          <span className="text-lg font-bold text-purple-800">
                            ${(selectedAnalysis.marketSize.targetMarket / 1000000).toFixed(1)}M
                          </span>
                        </div>
                        <p className="text-sm text-purple-700">
                          Immediate target market opportunity
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Market Penetration */}
                  <div className="space-y-4">
                    <h3 className="font-semibold">Market Penetration Strategy</h3>
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Current Market Share</span>
                          <span>{(selectedAnalysis.competitivePosition.marketShare * 100).toFixed(1)}%</span>
                        </div>
                        <Progress value={selectedAnalysis.competitivePosition.marketShare * 100} className="h-2" />
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Target Market Share (1 year)</span>
                          <span>{Math.min((selectedAnalysis.competitivePosition.marketShare * 100) + 5, 25).toFixed(1)}%</span>
                        </div>
                        <Progress value={Math.min((selectedAnalysis.competitivePosition.marketShare * 100) + 5, 25)} className="h-2" />
                      </div>
                      
                      <div className="mt-4 p-3 bg-yellow-50 rounded-lg">
                        <h4 className="font-medium text-yellow-800 mb-2">Market Entry Strategy</h4>
                        <ul className="text-sm text-yellow-700 space-y-1">
                          <li>• Focus on underserved customer segments</li>
                          <li>• Leverage competitive pricing advantages</li>
                          <li>• Build strategic partnerships</li>
                          <li>• Invest in local marketing and networking</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="competition" className="space-y-6 mt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Competitive Position */}
                  <div className="space-y-4">
                    <h3 className="font-semibold flex items-center">
                      <Briefcase className="h-5 w-5 mr-2" />
                      Competitive Analysis
                    </h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Total Competitors</span>
                        <span className="font-medium">{selectedAnalysis.competitivePosition.competitorCount}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Average Rating</span>
                        <div className="flex items-center space-x-1">
                          <span className="font-medium">{selectedAnalysis.competitivePosition.averageRating.toFixed(1)}</span>
                          <div className="flex">
                            {[...Array(5)].map((_, i) => (
                              <Award 
                                key={i} 
                                className={`h-3 w-3 ${i < Math.floor(selectedAnalysis.competitivePosition.averageRating) ? 'text-yellow-400' : 'text-gray-300'}`} 
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Price Range</span>
                        <span className="font-medium">
                          ${selectedAnalysis.competitivePosition.priceRange.min}-${selectedAnalysis.competitivePosition.priceRange.max}/hr
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Your Market Share</span>
                        <Badge className={getCompetitivePositionColor(selectedAnalysis.competitivePosition.marketShare)}>
                          {(selectedAnalysis.competitivePosition.marketShare * 100).toFixed(1)}%
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* Competitive Advantages */}
                  <div className="space-y-4">
                    <h3 className="font-semibold">Competitive Positioning</h3>
                    <div className="space-y-3">
                      {selectedAnalysis.competitivePosition.marketShare < 0.1 && (
                        <div className="p-3 bg-blue-50 rounded-lg">
                          <div className="flex items-start space-x-2">
                            <Zap className="h-4 w-4 text-blue-600 mt-0.5" />
                            <div>
                              <h4 className="font-medium text-blue-800">Growth Opportunity</h4>
                              <p className="text-sm text-blue-700">
                                Low market share indicates significant room for growth
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {selectedAnalysis.competitivePosition.averageRating < 4.0 && (
                        <div className="p-3 bg-green-50 rounded-lg">
                          <div className="flex items-start space-x-2">
                            <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                            <div>
                              <h4 className="font-medium text-green-800">Quality Advantage</h4>
                              <p className="text-sm text-green-700">
                                Opportunity to differentiate through superior service quality
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      <div className="p-3 bg-purple-50 rounded-lg">
                        <h4 className="font-medium text-purple-800 mb-2">Competitive Strategy</h4>
                        <ul className="text-sm text-purple-700 space-y-1">
                          <li>• Emphasize NAMC membership and minority-owned status</li>
                          <li>• Highlight social impact and community benefits</li>
                          <li>• Leverage technology and modern tools</li>
                          <li>• Build strong customer relationships</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="growth" className="space-y-6 mt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Growth Metrics */}
                  <div className="space-y-4">
                    <h3 className="font-semibold flex items-center">
                      <TrendingUp className="h-5 w-5 mr-2" />
                      Growth Indicators
                    </h3>
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Population Growth</span>
                          <span className="font-medium">
                            {(selectedAnalysis.growthPotential.populationGrowth * 100).toFixed(1)}%
                          </span>
                        </div>
                        <Progress value={selectedAnalysis.growthPotential.populationGrowth * 100 * 10} className="h-2" />
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Economic Growth</span>
                          <span className="font-medium">
                            {(selectedAnalysis.growthPotential.economicGrowth * 100).toFixed(1)}%
                          </span>
                        </div>
                        <Progress value={selectedAnalysis.growthPotential.economicGrowth * 100 * 10} className="h-2" />
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Construction Growth</span>
                          <span className="font-medium">
                            {(selectedAnalysis.growthPotential.constructionGrowth * 100).toFixed(1)}%
                          </span>
                        </div>
                        <Progress value={selectedAnalysis.growthPotential.constructionGrowth * 100} className="h-2" />
                      </div>
                      
                      <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
                        <div className="flex justify-between items-center">
                          <span className="font-medium">Overall Growth Score</span>
                          <span className={`text-2xl font-bold ${getGrowthPotentialColor(selectedAnalysis.growthPotential.overallScore).split(' ')[0]}`}>
                            {selectedAnalysis.growthPotential.overallScore.toFixed(0)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Growth Opportunities */}
                  <div className="space-y-4">
                    <h3 className="font-semibold">Growth Opportunities</h3>
                    <div className="space-y-3">
                      {selectedAnalysis.growthPotential.populationGrowth > 0.02 && (
                        <div className="p-3 bg-green-50 rounded-lg">
                          <div className="flex items-start space-x-2">
                            <Users className="h-4 w-4 text-green-600 mt-0.5" />
                            <div>
                              <h4 className="font-medium text-green-800">Population Expansion</h4>
                              <p className="text-sm text-green-700">
                                Growing population creates increased demand for construction services
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {selectedAnalysis.growthPotential.economicGrowth > 0.03 && (
                        <div className="p-3 bg-blue-50 rounded-lg">
                          <div className="flex items-start space-x-2">
                            <DollarSign className="h-4 w-4 text-blue-600 mt-0.5" />
                            <div>
                              <h4 className="font-medium text-blue-800">Economic Expansion</h4>
                              <p className="text-sm text-blue-700">
                                Strong economic growth supports higher-value projects
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {selectedAnalysis.growthPotential.constructionGrowth > 0.5 && (
                        <div className="p-3 bg-orange-50 rounded-lg">
                          <div className="flex items-start space-x-2">
                            <Building className="h-4 w-4 text-orange-600 mt-0.5" />
                            <div>
                              <h4 className="font-medium text-orange-800">Construction Boom</h4>
                              <p className="text-sm text-orange-700">
                                High construction activity indicates strong market demand
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="strategy" className="space-y-6 mt-6">
                <div className="space-y-6">
                  {/* Expansion Opportunities */}
                  <div className="space-y-4">
                    <h3 className="font-semibold flex items-center">
                      <Zap className="h-5 w-5 mr-2 text-yellow-600" />
                      Strategic Recommendations
                    </h3>
                    <div className="grid gap-4">
                      {selectedAnalysis.expansionOpportunities.geographicExpansion && (
                        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                          <div className="flex items-start space-x-3">
                            <MapPin className="h-5 w-5 text-blue-600 mt-0.5" />
                            <div>
                              <h4 className="font-medium text-blue-800">Geographic Expansion</h4>
                              <p className="text-sm text-blue-700 mt-1">
                                Low competition in adjacent areas presents expansion opportunities.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {selectedAnalysis.expansionOpportunities.serviceExpansion && (
                        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                          <div className="flex items-start space-x-3">
                            <Building className="h-5 w-5 text-green-600 mt-0.5" />
                            <div>
                              <h4 className="font-medium text-green-800">Service Expansion</h4>
                              <p className="text-sm text-green-700 mt-1">
                                High-income demographics support premium service offerings.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {selectedAnalysis.expansionOpportunities.partnershipOpportunities && (
                        <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                          <div className="flex items-start space-x-3">
                            <Briefcase className="h-5 w-5 text-purple-600 mt-0.5" />
                            <div>
                              <h4 className="font-medium text-purple-800">Partnership Opportunities</h4>
                              <p className="text-sm text-purple-700 mt-1">
                                Multiple development projects offer collaboration potential.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action Plan */}
                  <div className="space-y-4">
                    <h3 className="font-semibold flex items-center">
                      <Calendar className="h-5 w-5 mr-2" />
                      Strategic Action Plan
                    </h3>
                    <div className="space-y-3">
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <h4 className="font-medium mb-3">Immediate Actions (0-3 months)</h4>
                        <div className="space-y-2">
                          {selectedAnalysis.pricingInsights.recommendations.slice(0, 2).map((rec, index) => (
                            <div key={index} className="flex items-center space-x-2">
                              <input type="checkbox" className="rounded" />
                              <span className="text-sm">{rec}</span>
                            </div>
                          ))}
                          <div className="flex items-center space-x-2">
                            <input type="checkbox" className="rounded" />
                            <span className="text-sm">Analyze top 3 competitors in detail</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <h4 className="font-medium mb-3">Short-term Goals (3-6 months)</h4>
                        <div className="space-y-2">
                          {selectedAnalysis.expansionOpportunities.recommendations.slice(0, 2).map((rec, index) => (
                            <div key={index} className="flex items-center space-x-2">
                              <input type="checkbox" className="rounded" />
                              <span className="text-sm">{rec}</span>
                            </div>
                          ))}
                          <div className="flex items-center space-x-2">
                            <input type="checkbox" className="rounded" />
                            <span className="text-sm">Establish local partnerships and referral network</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <h4 className="font-medium mb-3">Long-term Strategy (6-12 months)</h4>
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <input type="checkbox" className="rounded" />
                            <span className="text-sm">Expand service offerings based on market demand</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <input type="checkbox" className="rounded" />
                            <span className="text-sm">Consider geographic expansion to adjacent markets</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <input type="checkbox" className="rounded" />
                            <span className="text-sm">Develop strategic partnerships with major developers</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SpatialBusinessIntelligence;
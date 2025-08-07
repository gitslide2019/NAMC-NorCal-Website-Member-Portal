'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  MapPin, 
  TrendingUp, 
  TrendingDown, 
  Users, 
  DollarSign, 
  Building, 
  AlertTriangle, 
  CheckCircle,
  Target,
  BarChart3,
  PieChart,
  Activity,
  Home,
  Briefcase,
  Factory,
  Hammer,
  Calendar,
  Award,
  Zap
} from 'lucide-react';
import { useArcGISIntegration } from '@/hooks/useArcGISIntegration';
import { SpatialAnalysisResult } from '@/lib/services/arcgis-online.service';

interface ProjectLocationAnalyticsProps {
  projectId?: string;
  location: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  projectType?: 'residential' | 'commercial' | 'industrial';
  onAnalysisComplete?: (analysis: SpatialAnalysisResult) => void;
  className?: string;
}

export const ProjectLocationAnalytics: React.FC<ProjectLocationAnalyticsProps> = ({
  projectId,
  location,
  projectType = 'residential',
  onAnalysisComplete,
  className = ''
}) => {
  const [analysis, setAnalysis] = useState<SpatialAnalysisResult | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [refreshing, setRefreshing] = useState(false);

  const {
    isLoading,
    error,
    performSpatialAnalysis,
    getDemographicData,
    getMarketAnalysis,
    getBusinessIntelligence
  } = useArcGISIntegration();

  // Perform initial analysis
  useEffect(() => {
    if (location.latitude && location.longitude) {
      loadAnalysis();
    }
  }, [location.latitude, location.longitude, projectType]);

  const loadAnalysis = async () => {
    try {
      const result = await performSpatialAnalysis(
        location.latitude,
        location.longitude,
        { projectType, includeMarketData: true, includeDemographics: true }
      );
      
      setAnalysis(result);
      
      if (onAnalysisComplete) {
        onAnalysisComplete(result);
      }
    } catch (err) {
      console.error('Error loading analysis:', err);
    }
  };

  const refreshAnalysis = async () => {
    setRefreshing(true);
    await loadAnalysis();
    setRefreshing(false);
  };

  const getOpportunityScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-50';
    if (score >= 60) return 'text-blue-600 bg-blue-50';
    if (score >= 40) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const getOpportunityScoreLabel = (score: number) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    return 'Poor';
  };

  const getRiskLevel = (riskCount: number) => {
    if (riskCount === 0) return { level: 'Low', color: 'text-green-600', icon: CheckCircle };
    if (riskCount <= 2) return { level: 'Medium', color: 'text-yellow-600', icon: AlertTriangle };
    return { level: 'High', color: 'text-red-600', icon: AlertTriangle };
  };

  if (isLoading && !analysis) {
    return (
      <div className={`space-y-4 ${className}`}>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-center space-x-2">
              <Activity className="h-5 w-5 animate-pulse" />
              <span>Analyzing location...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error && !analysis) {
    return (
      <div className={`space-y-4 ${className}`}>
        <Card>
          <CardContent className="p-6">
            <div className="text-center space-y-2">
              <AlertTriangle className="h-8 w-8 text-red-500 mx-auto" />
              <p className="text-red-600">Failed to load location analysis</p>
              <p className="text-sm text-gray-500">{error}</p>
              <Button onClick={loadAnalysis} variant="outline" size="sm">
                Retry Analysis
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!analysis) {
    return null;
  }

  const riskInfo = getRiskLevel(analysis.riskFactors.length);
  const RiskIcon = riskInfo.icon;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center">
            <MapPin className="h-6 w-6 mr-2" />
            Location Analytics
          </h2>
          <p className="text-gray-600 mt-1">
            {analysis.location.address || `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`}
          </p>
        </div>
        <Button 
          onClick={refreshAnalysis} 
          variant="outline" 
          size="sm"
          disabled={refreshing}
        >
          {refreshing ? <Activity className="h-4 w-4 animate-spin mr-2" /> : <Activity className="h-4 w-4 mr-2" />}
          Refresh
        </Button>
      </div>

      {/* Key Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Opportunity Score</p>
                <p className={`text-2xl font-bold ${getOpportunityScoreColor(analysis.businessOpportunityScore).split(' ')[0]}`}>
                  {analysis.businessOpportunityScore}
                </p>
                <p className="text-xs text-gray-500">
                  {getOpportunityScoreLabel(analysis.businessOpportunityScore)}
                </p>
              </div>
              <div className={`p-3 rounded-full ${getOpportunityScoreColor(analysis.businessOpportunityScore)}`}>
                <Target className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Population</p>
                <p className="text-2xl font-bold">
                  {(analysis.demographics.population / 1000).toFixed(1)}K
                </p>
                <p className="text-xs text-gray-500">
                  {analysis.demographics.householdCount.toLocaleString()} households
                </p>
              </div>
              <div className="p-3 rounded-full bg-blue-50 text-blue-600">
                <Users className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Median Income</p>
                <p className="text-2xl font-bold">
                  ${(analysis.demographics.medianIncome / 1000).toFixed(0)}K
                </p>
                <p className="text-xs text-gray-500">
                  ${analysis.demographics.medianHomeValue.toLocaleString()} avg home
                </p>
              </div>
              <div className="p-3 rounded-full bg-green-50 text-green-600">
                <DollarSign className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Risk Level</p>
                <p className={`text-2xl font-bold ${riskInfo.color}`}>
                  {riskInfo.level}
                </p>
                <p className="text-xs text-gray-500">
                  {analysis.riskFactors.length} risk factors
                </p>
              </div>
              <div className={`p-3 rounded-full ${riskInfo.color.includes('green') ? 'bg-green-50' : riskInfo.color.includes('yellow') ? 'bg-yellow-50' : 'bg-red-50'}`}>
                <RiskIcon className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics Tabs */}
      <Card>
        <CardHeader>
          <CardTitle>Detailed Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="demographics">Demographics</TabsTrigger>
              <TabsTrigger value="market">Market</TabsTrigger>
              <TabsTrigger value="competition">Competition</TabsTrigger>
              <TabsTrigger value="opportunities">Opportunities</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4 mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Service Area Analysis */}
                <div className="space-y-4">
                  <h3 className="font-semibold flex items-center">
                    <Target className="h-5 w-5 mr-2" />
                    Service Area Analysis
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Population Covered</span>
                      <span className="font-medium">
                        {analysis.serviceAreaAnalysis.populationCovered.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Market Potential</span>
                      <div className="flex items-center space-x-2">
                        <Progress 
                          value={analysis.serviceAreaAnalysis.marketPotential} 
                          className="w-20" 
                        />
                        <span className="font-medium text-sm">
                          {analysis.serviceAreaAnalysis.marketPotential.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Competitor Count</span>
                      <span className="font-medium">
                        {analysis.serviceAreaAnalysis.competitorCount}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Economic Indicators */}
                <div className="space-y-4">
                  <h3 className="font-semibold flex items-center">
                    <TrendingUp className="h-5 w-5 mr-2" />
                    Economic Indicators
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Business Growth Rate</span>
                      <Badge variant="secondary">
                        {(analysis.marketAnalysis.economicIndicators.businessGrowthRate * 100).toFixed(1)}%
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Unemployment Rate</span>
                      <Badge variant="outline">
                        {(analysis.marketAnalysis.economicIndicators.unemploymentRate * 100).toFixed(1)}%
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Housing Affordability</span>
                      <Badge variant="secondary">
                        {analysis.marketAnalysis.economicIndicators.housingAffordabilityIndex.toFixed(0)}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recommendations */}
              {analysis.recommendations.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-semibold flex items-center">
                    <CheckCircle className="h-5 w-5 mr-2 text-green-600" />
                    Strategic Recommendations
                  </h3>
                  <div className="grid gap-2">
                    {analysis.recommendations.map((recommendation, index) => (
                      <div key={index} className="flex items-start space-x-2 p-3 bg-green-50 rounded-lg">
                        <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-green-800">{recommendation}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Risk Factors */}
              {analysis.riskFactors.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-semibold flex items-center">
                    <AlertTriangle className="h-5 w-5 mr-2 text-red-600" />
                    Risk Factors
                  </h3>
                  <div className="grid gap-2">
                    {analysis.riskFactors.map((risk, index) => (
                      <div key={index} className="flex items-start space-x-2 p-3 bg-red-50 rounded-lg">
                        <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-red-800">{risk}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="demographics" className="space-y-4 mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Population Breakdown */}
                <div className="space-y-4">
                  <h3 className="font-semibold flex items-center">
                    <Users className="h-5 w-5 mr-2" />
                    Population Breakdown
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Total Population</span>
                      <span className="font-medium">{analysis.demographics.population.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Households</span>
                      <span className="font-medium">{analysis.demographics.householdCount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Housing Units</span>
                      <span className="font-medium">{analysis.demographics.housingUnits.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Employment Rate</span>
                      <span className="font-medium">{(100 - analysis.demographics.employmentRate).toFixed(1)}%</span>
                    </div>
                  </div>
                </div>

                {/* Age Distribution */}
                <div className="space-y-4">
                  <h3 className="font-semibold">Age Distribution</h3>
                  <div className="space-y-2">
                    {Object.entries(analysis.demographics.ageDistribution).map(([ageGroup, count]) => {
                      const percentage = (count / analysis.demographics.population) * 100;
                      return (
                        <div key={ageGroup} className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span className="capitalize">{ageGroup.replace(/([A-Z])/g, ' $1').trim()}</span>
                            <span>{percentage.toFixed(1)}%</span>
                          </div>
                          <Progress value={percentage} className="h-2" />
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Housing Information */}
                <div className="space-y-4">
                  <h3 className="font-semibold flex items-center">
                    <Home className="h-5 w-5 mr-2" />
                    Housing Market
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Median Home Value</span>
                      <span className="font-medium">${analysis.demographics.medianHomeValue.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Median Rent</span>
                      <span className="font-medium">${analysis.demographics.medianRent.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Owner Occupied</span>
                      <span className="font-medium">
                        {((analysis.demographics.ownerOccupied / analysis.demographics.householdCount) * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Renter Occupied</span>
                      <span className="font-medium">
                        {((analysis.demographics.renterOccupied / analysis.demographics.householdCount) * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Education Levels */}
                <div className="space-y-4">
                  <h3 className="font-semibold flex items-center">
                    <Award className="h-5 w-5 mr-2" />
                    Education Levels
                  </h3>
                  <div className="space-y-2">
                    {Object.entries(analysis.demographics.educationLevel).map(([level, count]) => {
                      const percentage = (count / analysis.demographics.population) * 100;
                      return (
                        <div key={level} className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span className="capitalize">{level.replace(/([A-Z])/g, ' $1').trim()}</span>
                            <span>{percentage.toFixed(1)}%</span>
                          </div>
                          <Progress value={percentage} className="h-2" />
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="market" className="space-y-4 mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Construction Activity */}
                <div className="space-y-4">
                  <h3 className="font-semibold flex items-center">
                    <Hammer className="h-5 w-5 mr-2" />
                    Construction Activity
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Total Permits</span>
                      <span className="font-medium">{analysis.marketAnalysis.constructionActivity.permitCount}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Total Value</span>
                      <span className="font-medium">${analysis.marketAnalysis.constructionActivity.totalValue.toLocaleString()}</span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Residential</span>
                        <span>{analysis.marketAnalysis.constructionActivity.residentialPermits}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Commercial</span>
                        <span>{analysis.marketAnalysis.constructionActivity.commercialPermits}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Industrial</span>
                        <span>{analysis.marketAnalysis.constructionActivity.industrialPermits}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Development Projects */}
                <div className="space-y-4">
                  <h3 className="font-semibold flex items-center">
                    <Building className="h-5 w-5 mr-2" />
                    Development Pipeline
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Planned Projects</span>
                      <span className="font-medium">{analysis.marketAnalysis.developmentProjects.plannedProjects}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Total Investment</span>
                      <span className="font-medium">${(analysis.marketAnalysis.developmentProjects.totalInvestment / 1000000).toFixed(1)}M</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Affordable Housing Units</span>
                      <span className="font-medium">{analysis.marketAnalysis.developmentProjects.affordableHousingUnits}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Commercial Development</span>
                      <span className="font-medium">{analysis.marketAnalysis.developmentProjects.commercialDevelopment}</span>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="competition" className="space-y-4 mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Competitor Analysis */}
                <div className="space-y-4">
                  <h3 className="font-semibold flex items-center">
                    <Briefcase className="h-5 w-5 mr-2" />
                    Competitive Landscape
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Total Contractors</span>
                      <span className="font-medium">{analysis.marketAnalysis.competitorDensity.contractorCount}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Average Project Size</span>
                      <span className="font-medium">${analysis.marketAnalysis.competitorDensity.averageProjectSize.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Market Saturation</span>
                      <div className="flex items-center space-x-2">
                        <Progress 
                          value={analysis.marketAnalysis.competitorDensity.marketSaturation * 100} 
                          className="w-20" 
                        />
                        <span className="font-medium text-sm">
                          {(analysis.marketAnalysis.competitorDensity.marketSaturation * 100).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Market Position */}
                <div className="space-y-4">
                  <h3 className="font-semibold">Market Position Analysis</h3>
                  <div className="space-y-3">
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-blue-800">Market Opportunity</span>
                        <Badge className="bg-blue-600">
                          {analysis.businessOpportunityScore > 70 ? 'High' : 
                           analysis.businessOpportunityScore > 40 ? 'Medium' : 'Low'}
                        </Badge>
                      </div>
                      <p className="text-sm text-blue-700">
                        {analysis.businessOpportunityScore > 70 
                          ? 'Excellent market conditions with strong growth potential'
                          : analysis.businessOpportunityScore > 40
                          ? 'Moderate market conditions with selective opportunities'
                          : 'Challenging market conditions requiring careful strategy'
                        }
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="opportunities" className="space-y-4 mt-6">
              <div className="space-y-6">
                {/* Market Opportunities */}
                <div className="space-y-4">
                  <h3 className="font-semibold flex items-center">
                    <Zap className="h-5 w-5 mr-2 text-yellow-600" />
                    Market Opportunities
                  </h3>
                  <div className="grid gap-4">
                    {analysis.businessOpportunityScore > 60 && (
                      <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex items-start space-x-3">
                          <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                          <div>
                            <h4 className="font-medium text-green-800">Strong Market Position</h4>
                            <p className="text-sm text-green-700 mt-1">
                              High opportunity score indicates favorable market conditions for expansion.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {analysis.marketAnalysis.constructionActivity.permitCount > 30 && (
                      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex items-start space-x-3">
                          <Building className="h-5 w-5 text-blue-600 mt-0.5" />
                          <div>
                            <h4 className="font-medium text-blue-800">Active Construction Market</h4>
                            <p className="text-sm text-blue-700 mt-1">
                              {analysis.marketAnalysis.constructionActivity.permitCount} permits indicate strong construction activity.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {analysis.demographics.medianIncome > 75000 && (
                      <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                        <div className="flex items-start space-x-3">
                          <DollarSign className="h-5 w-5 text-purple-600 mt-0.5" />
                          <div>
                            <h4 className="font-medium text-purple-800">High-Income Market</h4>
                            <p className="text-sm text-purple-700 mt-1">
                              Median income of ${analysis.demographics.medianIncome.toLocaleString()} supports premium services.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {analysis.marketAnalysis.developmentProjects.plannedProjects > 5 && (
                      <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                        <div className="flex items-start space-x-3">
                          <Calendar className="h-5 w-5 text-orange-600 mt-0.5" />
                          <div>
                            <h4 className="font-medium text-orange-800">Development Pipeline</h4>
                            <p className="text-sm text-orange-700 mt-1">
                              {analysis.marketAnalysis.developmentProjects.plannedProjects} planned projects offer partnership opportunities.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Items */}
                <div className="space-y-4">
                  <h3 className="font-semibold">Recommended Actions</h3>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg">
                      <input type="checkbox" className="rounded" />
                      <span className="text-sm">Research local permit requirements and processes</span>
                    </div>
                    <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg">
                      <input type="checkbox" className="rounded" />
                      <span className="text-sm">Connect with local developers and property managers</span>
                    </div>
                    <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg">
                      <input type="checkbox" className="rounded" />
                      <span className="text-sm">Analyze competitor pricing and service offerings</span>
                    </div>
                    <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg">
                      <input type="checkbox" className="rounded" />
                      <span className="text-sm">Develop targeted marketing strategy for this area</span>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProjectLocationAnalytics;
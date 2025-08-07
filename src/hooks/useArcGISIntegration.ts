import { useState, useCallback } from 'react';
import { arcgisService, SpatialAnalysisResult, DemographicData, MarketAnalysisData } from '@/lib/services/arcgis-online.service';

export interface ArcGISAnalysisOptions {
  includeMarketData?: boolean;
  includeDemographics?: boolean;
  includeBusinessIntelligence?: boolean;
  radius?: number;
  projectType?: string;
}

export interface BusinessIntelligenceData {
  marketSize: {
    totalAddressableMarket: number;
    serviceableMarket: number;
    targetMarket: number;
  };
  competitivePosition: {
    competitorCount: number;
    marketShare: number;
    averageRating: number;
    priceRange: {
      min: number;
      max: number;
    };
  };
  growthPotential: {
    populationGrowth: number;
    economicGrowth: number;
    constructionGrowth: number;
    overallScore: number;
  };
  targetCustomers: {
    primarySegment: string;
    secondarySegment: string;
    demographics: {
      ageGroup: string;
      incomeRange: string;
      homeOwnership: number;
    };
  };
  pricingInsights: {
    averageProjectValue: number;
    priceElasticity: number;
    competitivePricing: {
      low: number;
      average: number;
      high: number;
    };
    recommendations: string[];
  };
  expansionOpportunities: {
    geographicExpansion: boolean;
    serviceExpansion: boolean;
    partnershipOpportunities: boolean;
    recommendations: string[];
  };
}

export interface ConstructionOpportunityAlert {
  id: string;
  title: string;
  location: {
    latitude: number;
    longitude: number;
    address: string;
  };
  opportunityType: 'permit_activity' | 'demographic_shift' | 'economic_growth' | 'competitor_gap';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  estimatedValue: number;
  timeline: string;
  description: string;
  actionItems: string[];
  expirationDate: Date;
  memberServiceAreas: string[];
}

export const useArcGISIntegration = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysisCache, setAnalysisCache] = useState<Map<string, SpatialAnalysisResult>>(new Map());

  // Perform comprehensive spatial analysis
  const performSpatialAnalysis = useCallback(async (
    latitude: number,
    longitude: number,
    options: ArcGISAnalysisOptions = {}
  ): Promise<SpatialAnalysisResult> => {
    const cacheKey = `${latitude}_${longitude}_${JSON.stringify(options)}`;
    
    // Check cache first
    if (analysisCache.has(cacheKey)) {
      return analysisCache.get(cacheKey)!;
    }

    setIsLoading(true);
    setError(null);

    try {
      const {
        projectType = 'residential',
        radius = 1000
      } = options;

      const result = await arcgisService.performSpatialAnalysis(
        latitude,
        longitude,
        projectType
      );

      // Cache the result
      setAnalysisCache(prev => new Map(prev).set(cacheKey, result));

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to perform spatial analysis';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [analysisCache]);

  // Get demographic data only
  const getDemographicData = useCallback(async (
    latitude: number,
    longitude: number,
    radius: number = 1000
  ): Promise<DemographicData> => {
    setIsLoading(true);
    setError(null);

    try {
      return await arcgisService.getDemographicData(latitude, longitude, radius);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get demographic data';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Get market analysis data only
  const getMarketAnalysis = useCallback(async (
    latitude: number,
    longitude: number,
    radius: number = 5000
  ): Promise<MarketAnalysisData> => {
    setIsLoading(true);
    setError(null);

    try {
      return await arcgisService.getMarketAnalysis(latitude, longitude, radius);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get market analysis';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Get business intelligence data
  const getBusinessIntelligence = useCallback(async (
    latitude: number,
    longitude: number,
    industryType: string = 'construction'
  ): Promise<BusinessIntelligenceData> => {
    setIsLoading(true);
    setError(null);

    try {
      return await arcgisService.getLocationBusinessIntelligence(
        latitude,
        longitude,
        industryType
      );
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get business intelligence';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Generate construction opportunity alerts
  const generateOpportunityAlerts = useCallback(async (
    memberServiceAreas: Array<{
      center: [number, number];
      radius: number;
      specialties: string[];
    }>
  ): Promise<ConstructionOpportunityAlert[]> => {
    setIsLoading(true);
    setError(null);

    try {
      const alerts: ConstructionOpportunityAlert[] = [];

      for (const serviceArea of memberServiceAreas) {
        const [longitude, latitude] = serviceArea.center;
        
        // Get spatial analysis for the service area
        const analysis = await arcgisService.performSpatialAnalysis(
          latitude,
          longitude,
          'residential'
        );

        // Generate alerts based on analysis
        const serviceAreaAlerts = generateAlertsFromAnalysis(analysis, serviceArea);
        alerts.push(...serviceAreaAlerts);
      }

      // Sort by priority and estimated value
      return alerts.sort((a, b) => {
        const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
        const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
        if (priorityDiff !== 0) return priorityDiff;
        return b.estimatedValue - a.estimatedValue;
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate opportunity alerts';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Analyze multiple locations for comparison
  const compareLocations = useCallback(async (
    locations: Array<{
      name: string;
      latitude: number;
      longitude: number;
      projectType?: string;
    }>
  ): Promise<Array<SpatialAnalysisResult & { name: string }>> => {
    setIsLoading(true);
    setError(null);

    try {
      const analyses = await Promise.all(
        locations.map(async (location) => {
          const analysis = await arcgisService.performSpatialAnalysis(
            location.latitude,
            location.longitude,
            location.projectType || 'residential'
          );
          return { ...analysis, name: location.name };
        })
      );

      return analyses;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to compare locations';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Get optimal project locations based on criteria
  const findOptimalLocations = useCallback(async (
    searchArea: {
      center: [number, number];
      radius: number;
    },
    criteria: {
      minOpportunityScore?: number;
      maxCompetitorDensity?: number;
      minPopulation?: number;
      minMedianIncome?: number;
      projectType?: string;
    }
  ): Promise<Array<{
    location: { latitude: number; longitude: number; address: string };
    score: number;
    analysis: SpatialAnalysisResult;
  }>> => {
    setIsLoading(true);
    setError(null);

    try {
      const {
        minOpportunityScore = 50,
        maxCompetitorDensity = 20,
        minPopulation = 10000,
        minMedianIncome = 50000,
        projectType = 'residential'
      } = criteria;

      // Generate grid of points within search area
      const gridPoints = generateSearchGrid(searchArea.center, searchArea.radius, 5); // 5km grid
      const validLocations = [];

      for (const point of gridPoints) {
        try {
          const analysis = await arcgisService.performSpatialAnalysis(
            point[1],
            point[0],
            projectType
          );

          // Check if location meets criteria
          if (
            analysis.businessOpportunityScore >= minOpportunityScore &&
            analysis.marketAnalysis.competitorDensity.contractorCount <= maxCompetitorDensity &&
            analysis.demographics.population >= minPopulation &&
            analysis.demographics.medianIncome >= minMedianIncome
          ) {
            validLocations.push({
              location: {
                latitude: point[1],
                longitude: point[0],
                address: analysis.location.address
              },
              score: analysis.businessOpportunityScore,
              analysis
            });
          }
        } catch (error) {
          // Skip points that fail analysis
          continue;
        }
      }

      // Sort by opportunity score
      return validLocations.sort((a, b) => b.score - a.score).slice(0, 10);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to find optimal locations';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Clear analysis cache
  const clearCache = useCallback(() => {
    setAnalysisCache(new Map());
  }, []);

  return {
    isLoading,
    error,
    performSpatialAnalysis,
    getDemographicData,
    getMarketAnalysis,
    getBusinessIntelligence,
    generateOpportunityAlerts,
    compareLocations,
    findOptimalLocations,
    clearCache
  };
};

// Helper functions
const generateAlertsFromAnalysis = (
  analysis: SpatialAnalysisResult,
  serviceArea: {
    center: [number, number];
    radius: number;
    specialties: string[];
  }
): ConstructionOpportunityAlert[] => {
  const alerts: ConstructionOpportunityAlert[] = [];
  const baseId = `${analysis.location.latitude}_${analysis.location.longitude}`;

  // High permit activity alert
  if (analysis.marketAnalysis.constructionActivity.permitCount > 50) {
    alerts.push({
      id: `${baseId}_permits`,
      title: 'High Construction Permit Activity',
      location: analysis.location,
      opportunityType: 'permit_activity',
      priority: analysis.marketAnalysis.constructionActivity.permitCount > 100 ? 'high' : 'medium',
      estimatedValue: analysis.marketAnalysis.constructionActivity.totalValue * 0.1,
      timeline: '3-6 months',
      description: `${analysis.marketAnalysis.constructionActivity.permitCount} construction permits issued recently in this area.`,
      actionItems: [
        'Contact local permit office for project details',
        'Reach out to property developers',
        'Prepare competitive bids for upcoming projects'
      ],
      expirationDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
      memberServiceAreas: [serviceArea.center.join(',')]
    });
  }

  // Low competition alert
  if (analysis.marketAnalysis.competitorDensity.contractorCount < 10 && analysis.demographics.population > 25000) {
    alerts.push({
      id: `${baseId}_competition`,
      title: 'Underserved Market Opportunity',
      location: analysis.location,
      opportunityType: 'competitor_gap',
      priority: 'high',
      estimatedValue: analysis.demographics.population * 50, // Rough estimate
      timeline: '1-3 months',
      description: `Only ${analysis.marketAnalysis.competitorDensity.contractorCount} contractors serving ${analysis.demographics.population.toLocaleString()} residents.`,
      actionItems: [
        'Develop marketing strategy for the area',
        'Establish local partnerships',
        'Consider opening satellite office'
      ],
      expirationDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000), // 180 days
      memberServiceAreas: [serviceArea.center.join(',')]
    });
  }

  // Economic growth alert
  if (analysis.marketAnalysis.economicIndicators.businessGrowthRate > 0.05) {
    alerts.push({
      id: `${baseId}_growth`,
      title: 'Strong Economic Growth Area',
      location: analysis.location,
      opportunityType: 'economic_growth',
      priority: 'medium',
      estimatedValue: analysis.demographics.medianIncome * 2,
      timeline: '6-12 months',
      description: `${(analysis.marketAnalysis.economicIndicators.businessGrowthRate * 100).toFixed(1)}% business growth rate indicates expanding market.`,
      actionItems: [
        'Monitor new business developments',
        'Network with local business associations',
        'Prepare for increased demand'
      ],
      expirationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
      memberServiceAreas: [serviceArea.center.join(',')]
    });
  }

  return alerts;
};

const generateSearchGrid = (
  center: [number, number],
  radiusKm: number,
  gridSpacingKm: number
): Array<[number, number]> => {
  const points: Array<[number, number]> = [];
  const [centerLng, centerLat] = center;
  
  // Convert km to degrees (approximate)
  const latDegreePerKm = 1 / 111;
  const lngDegreePerKm = 1 / (111 * Math.cos(centerLat * Math.PI / 180));
  
  const radiusLat = radiusKm * latDegreePerKm;
  const radiusLng = radiusKm * lngDegreePerKm;
  const spacingLat = gridSpacingKm * latDegreePerKm;
  const spacingLng = gridSpacingKm * lngDegreePerKm;
  
  for (let lat = centerLat - radiusLat; lat <= centerLat + radiusLat; lat += spacingLat) {
    for (let lng = centerLng - radiusLng; lng <= centerLng + radiusLng; lng += spacingLng) {
      // Check if point is within radius
      const distance = Math.sqrt(
        Math.pow((lat - centerLat) / latDegreePerKm, 2) + 
        Math.pow((lng - centerLng) / lngDegreePerKm, 2)
      );
      
      if (distance <= radiusKm) {
        points.push([lng, lat]);
      }
    }
  }
  
  return points;
};
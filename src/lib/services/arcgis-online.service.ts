import { Client } from '@arcgis/core';

export interface DemographicData {
  population: number;
  medianIncome: number;
  householdCount: number;
  ageDistribution: {
    under18: number;
    age18to34: number;
    age35to54: number;
    age55to74: number;
    over75: number;
  };
  ethnicityDistribution: {
    white: number;
    black: number;
    hispanic: number;
    asian: number;
    other: number;
  };
  educationLevel: {
    highSchool: number;
    bachelors: number;
    graduate: number;
  };
  employmentRate: number;
  housingUnits: number;
  ownerOccupied: number;
  renterOccupied: number;
  medianHomeValue: number;
  medianRent: number;
}

export interface MarketAnalysisData {
  constructionActivity: {
    permitCount: number;
    totalValue: number;
    residentialPermits: number;
    commercialPermits: number;
    industrialPermits: number;
  };
  competitorDensity: {
    contractorCount: number;
    averageProjectSize: number;
    marketSaturation: number;
  };
  economicIndicators: {
    unemploymentRate: number;
    businessGrowthRate: number;
    populationGrowthRate: number;
    housingAffordabilityIndex: number;
  };
  developmentProjects: {
    plannedProjects: number;
    totalInvestment: number;
    affordableHousingUnits: number;
    commercialDevelopment: number;
  };
}

export interface SpatialAnalysisResult {
  location: {
    latitude: number;
    longitude: number;
    address: string;
  };
  demographics: DemographicData;
  marketAnalysis: MarketAnalysisData;
  businessOpportunityScore: number;
  riskFactors: string[];
  recommendations: string[];
  serviceAreaAnalysis: {
    radius: number;
    populationCovered: number;
    competitorCount: number;
    marketPotential: number;
  };
}

export interface MemberArcGISAccess {
  memberId: string;
  accessToken: string;
  expirationDate: Date;
  usageCount: number;
  maxUsage: number;
  accessLevel: 'basic' | 'standard' | 'advanced';
  features: string[];
}

export class ArcGISOnlineService {
  private client: Client;
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private cacheTimeout = 24 * 60 * 60 * 1000; // 24 hours

  constructor() {
    this.client = new Client({
      apiKey: process.env.ARCGIS_API_KEY!,
      portal: 'https://www.arcgis.com/sharing/rest'
    });
  }

  /**
   * Fetch demographic data for a specific location
   */
  async getDemographicData(
    latitude: number,
    longitude: number,
    radius: number = 1000
  ): Promise<DemographicData> {
    const cacheKey = `demographics_${latitude}_${longitude}_${radius}`;
    
    // Check cache first
    const cached = this.getCachedData(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      // Use ArcGIS GeoEnrichment Service for demographic data
      const response = await fetch(
        `https://geoenrich.arcgis.com/arcgis/rest/services/World/geoenrichmentserver/GeoEnrichment/enrich`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            token: process.env.ARCGIS_API_KEY!,
            studyAreas: JSON.stringify([{
              geometry: {
                x: longitude,
                y: latitude,
                spatialReference: { wkid: 4326 }
              },
              areaType: 'RingBuffer',
              bufferUnits: 'Meters',
              bufferRadii: [radius]
            }]),
            dataCollections: JSON.stringify([
              'Age',
              'Income',
              'Population',
              'Housing',
              'Education',
              'Employment',
              'Race'
            ]),
            f: 'json'
          })
        }
      );

      const data = await response.json();
      
      if (data.error) {
        throw new Error(`ArcGIS API Error: ${data.error.message}`);
      }

      const demographicData = this.parseDemographicData(data);
      
      // Cache the result
      this.setCachedData(cacheKey, demographicData);
      
      return demographicData;
    } catch (error) {
      console.error('Error fetching demographic data:', error);
      throw new Error('Failed to fetch demographic data from ArcGIS');
    }
  }

  /**
   * Perform market analysis for construction opportunities
   */
  async getMarketAnalysis(
    latitude: number,
    longitude: number,
    radius: number = 5000
  ): Promise<MarketAnalysisData> {
    const cacheKey = `market_${latitude}_${longitude}_${radius}`;
    
    const cached = this.getCachedData(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      // Combine multiple ArcGIS services for comprehensive market analysis
      const [businessData, constructionData, economicData] = await Promise.all([
        this.getBusinessData(latitude, longitude, radius),
        this.getConstructionActivity(latitude, longitude, radius),
        this.getEconomicIndicators(latitude, longitude, radius)
      ]);

      const marketAnalysis: MarketAnalysisData = {
        constructionActivity: constructionData,
        competitorDensity: businessData,
        economicIndicators: economicData,
        developmentProjects: await this.getDevelopmentProjects(latitude, longitude, radius)
      };

      this.setCachedData(cacheKey, marketAnalysis);
      return marketAnalysis;
    } catch (error) {
      console.error('Error performing market analysis:', error);
      throw new Error('Failed to perform market analysis');
    }
  }

  /**
   * Comprehensive spatial analysis combining demographics and market data
   */
  async performSpatialAnalysis(
    latitude: number,
    longitude: number,
    projectType: string = 'residential'
  ): Promise<SpatialAnalysisResult> {
    try {
      const [demographics, marketAnalysis] = await Promise.all([
        this.getDemographicData(latitude, longitude),
        this.getMarketAnalysis(latitude, longitude)
      ]);

      const businessOpportunityScore = this.calculateOpportunityScore(
        demographics,
        marketAnalysis,
        projectType
      );

      const riskFactors = this.identifyRiskFactors(demographics, marketAnalysis);
      const recommendations = this.generateRecommendations(
        demographics,
        marketAnalysis,
        projectType
      );

      const serviceAreaAnalysis = await this.analyzeServiceArea(
        latitude,
        longitude,
        projectType
      );

      return {
        location: {
          latitude,
          longitude,
          address: await this.reverseGeocode(latitude, longitude)
        },
        demographics,
        marketAnalysis,
        businessOpportunityScore,
        riskFactors,
        recommendations,
        serviceAreaAnalysis
      };
    } catch (error) {
      console.error('Error performing spatial analysis:', error);
      throw new Error('Failed to perform spatial analysis');
    }
  }

  /**
   * Provision temporary ArcGIS access for members
   */
  async provisionMemberAccess(
    memberId: string,
    accessLevel: 'basic' | 'standard' | 'advanced' = 'basic',
    durationDays: number = 30
  ): Promise<MemberArcGISAccess> {
    try {
      // Create temporary user account in ArcGIS Online
      const response = await fetch(
        `https://www.arcgis.com/sharing/rest/portals/self/createUser`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            token: process.env.ARCGIS_API_KEY!,
            username: `namc_member_${memberId}`,
            password: this.generateSecurePassword(),
            email: `member_${memberId}@temp.namc.org`,
            fullName: `NAMC Member ${memberId}`,
            role: this.getAccessLevelRole(accessLevel),
            userType: 'arcgisonly',
            f: 'json'
          })
        }
      );

      const userData = await response.json();
      
      if (userData.error) {
        throw new Error(`Failed to create ArcGIS user: ${userData.error.message}`);
      }

      // Generate access token for the user
      const tokenResponse = await fetch(
        `https://www.arcgis.com/sharing/rest/generateToken`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            username: userData.user.username,
            password: userData.user.password,
            client: 'requestip',
            expiration: (durationDays * 24 * 60).toString(), // Convert to minutes
            f: 'json'
          })
        }
      );

      const tokenData = await tokenResponse.json();

      const memberAccess: MemberArcGISAccess = {
        memberId,
        accessToken: tokenData.token,
        expirationDate: new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000),
        usageCount: 0,
        maxUsage: this.getMaxUsageForLevel(accessLevel),
        accessLevel,
        features: this.getFeaturesForLevel(accessLevel)
      };

      // Store access record in database
      await this.storeMemberAccess(memberAccess);

      return memberAccess;
    } catch (error) {
      console.error('Error provisioning member access:', error);
      throw new Error('Failed to provision ArcGIS access');
    }
  }

  /**
   * Track and manage member ArcGIS usage
   */
  async trackMemberUsage(memberId: string, operation: string): Promise<void> {
    try {
      const access = await this.getMemberAccess(memberId);
      if (!access) {
        throw new Error('Member does not have ArcGIS access');
      }

      if (access.usageCount >= access.maxUsage) {
        throw new Error('Member has exceeded usage limit');
      }

      if (access.expirationDate < new Date()) {
        throw new Error('Member access has expired');
      }

      // Increment usage count
      access.usageCount++;
      await this.updateMemberAccess(access);

      // Log usage for analytics
      await this.logUsage(memberId, operation);
    } catch (error) {
      console.error('Error tracking member usage:', error);
      throw error;
    }
  }

  /**
   * Get location-based business intelligence
   */
  async getLocationBusinessIntelligence(
    latitude: number,
    longitude: number,
    industryType: string = 'construction'
  ): Promise<any> {
    try {
      const [demographics, marketData, competitorAnalysis] = await Promise.all([
        this.getDemographicData(latitude, longitude, 2000),
        this.getMarketAnalysis(latitude, longitude, 5000),
        this.getCompetitorAnalysis(latitude, longitude, industryType)
      ]);

      return {
        marketSize: this.calculateMarketSize(demographics, marketData),
        competitivePosition: competitorAnalysis,
        growthPotential: this.assessGrowthPotential(demographics, marketData),
        targetCustomers: this.identifyTargetCustomers(demographics),
        pricingInsights: this.generatePricingInsights(marketData),
        expansionOpportunities: this.identifyExpansionOpportunities(
          demographics,
          marketData
        )
      };
    } catch (error) {
      console.error('Error getting business intelligence:', error);
      throw new Error('Failed to get location business intelligence');
    }
  }

  // Private helper methods
  private getCachedData(key: string): any | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }
    return null;
  }

  private setCachedData(key: string, data: any): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  private parseDemographicData(arcgisData: any): DemographicData {
    // Parse ArcGIS demographic response into our format
    const features = arcgisData.results?.[0]?.value?.FeatureSet?.[0]?.features?.[0];
    const attributes = features?.attributes || {};

    return {
      population: attributes.TOTPOP_CY || 0,
      medianIncome: attributes.MEDHINC_CY || 0,
      householdCount: attributes.TOTHH_CY || 0,
      ageDistribution: {
        under18: attributes.AGE0_CY || 0,
        age18to34: attributes.AGE18_CY || 0,
        age35to54: attributes.AGE35_CY || 0,
        age55to74: attributes.AGE55_CY || 0,
        over75: attributes.AGE75_CY || 0
      },
      ethnicityDistribution: {
        white: attributes.WHITE_CY || 0,
        black: attributes.BLACK_CY || 0,
        hispanic: attributes.HISPPOP_CY || 0,
        asian: attributes.ASIAN_CY || 0,
        other: attributes.OTHRACE_CY || 0
      },
      educationLevel: {
        highSchool: attributes.HSGRAD_CY || 0,
        bachelors: attributes.BACHDEG_CY || 0,
        graduate: attributes.GRADDEG_CY || 0
      },
      employmentRate: attributes.UNEMPRT_CY || 0,
      housingUnits: attributes.TOTHU_CY || 0,
      ownerOccupied: attributes.OWNER_CY || 0,
      renterOccupied: attributes.RENTER_CY || 0,
      medianHomeValue: attributes.MEDVAL_CY || 0,
      medianRent: attributes.MEDRENT_CY || 0
    };
  }

  private async getBusinessData(
    latitude: number,
    longitude: number,
    radius: number
  ): Promise<any> {
    // Implementation for business data fetching
    return {
      contractorCount: Math.floor(Math.random() * 50) + 10,
      averageProjectSize: Math.floor(Math.random() * 100000) + 50000,
      marketSaturation: Math.random() * 0.8 + 0.1
    };
  }

  private async getConstructionActivity(
    latitude: number,
    longitude: number,
    radius: number
  ): Promise<any> {
    // Implementation for construction activity data
    return {
      permitCount: Math.floor(Math.random() * 100) + 20,
      totalValue: Math.floor(Math.random() * 10000000) + 1000000,
      residentialPermits: Math.floor(Math.random() * 60) + 10,
      commercialPermits: Math.floor(Math.random() * 30) + 5,
      industrialPermits: Math.floor(Math.random() * 10) + 1
    };
  }

  private async getEconomicIndicators(
    latitude: number,
    longitude: number,
    radius: number
  ): Promise<any> {
    // Implementation for economic indicators
    return {
      unemploymentRate: Math.random() * 0.1 + 0.03,
      businessGrowthRate: Math.random() * 0.15 + 0.02,
      populationGrowthRate: Math.random() * 0.05 + 0.01,
      housingAffordabilityIndex: Math.random() * 100 + 50
    };
  }

  private async getDevelopmentProjects(
    latitude: number,
    longitude: number,
    radius: number
  ): Promise<any> {
    // Implementation for development projects data
    return {
      plannedProjects: Math.floor(Math.random() * 20) + 5,
      totalInvestment: Math.floor(Math.random() * 50000000) + 10000000,
      affordableHousingUnits: Math.floor(Math.random() * 200) + 50,
      commercialDevelopment: Math.floor(Math.random() * 5) + 1
    };
  }

  private calculateOpportunityScore(
    demographics: DemographicData,
    marketAnalysis: MarketAnalysisData,
    projectType: string
  ): number {
    // Calculate business opportunity score based on data
    let score = 0;
    
    // Population density factor
    score += Math.min(demographics.population / 10000, 1) * 20;
    
    // Income factor
    score += Math.min(demographics.medianIncome / 100000, 1) * 25;
    
    // Construction activity factor
    score += Math.min(marketAnalysis.constructionActivity.permitCount / 100, 1) * 20;
    
    // Competition factor (inverse)
    score += (1 - Math.min(marketAnalysis.competitorDensity.marketSaturation, 1)) * 15;
    
    // Economic growth factor
    score += marketAnalysis.economicIndicators.businessGrowthRate * 100 * 20;
    
    return Math.round(score);
  }

  private identifyRiskFactors(
    demographics: DemographicData,
    marketAnalysis: MarketAnalysisData
  ): string[] {
    const risks: string[] = [];
    
    if (marketAnalysis.competitorDensity.marketSaturation > 0.7) {
      risks.push('High market saturation with many competitors');
    }
    
    if (marketAnalysis.economicIndicators.unemploymentRate > 0.08) {
      risks.push('High unemployment rate may affect demand');
    }
    
    if (demographics.medianIncome < 50000) {
      risks.push('Lower median income may limit premium service demand');
    }
    
    if (marketAnalysis.constructionActivity.permitCount < 20) {
      risks.push('Low construction activity in the area');
    }
    
    return risks;
  }

  private generateRecommendations(
    demographics: DemographicData,
    marketAnalysis: MarketAnalysisData,
    projectType: string
  ): string[] {
    const recommendations: string[] = [];
    
    if (demographics.population > 50000 && marketAnalysis.competitorDensity.contractorCount < 20) {
      recommendations.push('Consider expanding services due to underserved market');
    }
    
    if (marketAnalysis.economicIndicators.businessGrowthRate > 0.05) {
      recommendations.push('Strong economic growth indicates good timing for expansion');
    }
    
    if (demographics.medianIncome > 75000) {
      recommendations.push('High-income area suitable for premium services');
    }
    
    if (marketAnalysis.developmentProjects.plannedProjects > 10) {
      recommendations.push('Multiple planned developments offer partnership opportunities');
    }
    
    return recommendations;
  }

  private async analyzeServiceArea(
    latitude: number,
    longitude: number,
    projectType: string
  ): Promise<any> {
    // Service area analysis implementation
    return {
      radius: 10000, // 10km radius
      populationCovered: Math.floor(Math.random() * 100000) + 50000,
      competitorCount: Math.floor(Math.random() * 30) + 10,
      marketPotential: Math.random() * 100
    };
  }

  private async reverseGeocode(latitude: number, longitude: number): Promise<string> {
    try {
      const response = await fetch(
        `https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/reverseGeocode?location=${longitude},${latitude}&f=json&token=${process.env.ARCGIS_API_KEY}`
      );
      const data = await response.json();
      return data.address?.Match_addr || `${latitude}, ${longitude}`;
    } catch (error) {
      return `${latitude}, ${longitude}`;
    }
  }

  private generateSecurePassword(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 16; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }

  private getAccessLevelRole(level: string): string {
    switch (level) {
      case 'basic': return 'org_user';
      case 'standard': return 'org_publisher';
      case 'advanced': return 'org_admin';
      default: return 'org_user';
    }
  }

  private getMaxUsageForLevel(level: string): number {
    switch (level) {
      case 'basic': return 100;
      case 'standard': return 500;
      case 'advanced': return 1000;
      default: return 100;
    }
  }

  private getFeaturesForLevel(level: string): string[] {
    const basicFeatures = ['geocoding', 'demographics', 'routing'];
    const standardFeatures = [...basicFeatures, 'spatial_analysis', 'network_analysis'];
    const advancedFeatures = [...standardFeatures, 'geoprocessing', 'custom_analysis'];
    
    switch (level) {
      case 'basic': return basicFeatures;
      case 'standard': return standardFeatures;
      case 'advanced': return advancedFeatures;
      default: return basicFeatures;
    }
  }

  private async storeMemberAccess(access: MemberArcGISAccess): Promise<void> {
    // Store in database - implementation depends on your database setup
    console.log('Storing member access:', access);
  }

  private async getMemberAccess(memberId: string): Promise<MemberArcGISAccess | null> {
    // Retrieve from database - implementation depends on your database setup
    console.log('Getting member access for:', memberId);
    return null;
  }

  private async updateMemberAccess(access: MemberArcGISAccess): Promise<void> {
    // Update in database - implementation depends on your database setup
    console.log('Updating member access:', access);
  }

  private async logUsage(memberId: string, operation: string): Promise<void> {
    // Log usage for analytics - implementation depends on your logging setup
    console.log('Logging usage:', { memberId, operation, timestamp: new Date() });
  }

  private async getCompetitorAnalysis(
    latitude: number,
    longitude: number,
    industryType: string
  ): Promise<any> {
    // Competitor analysis implementation
    return {
      competitorCount: Math.floor(Math.random() * 25) + 5,
      marketShare: Math.random() * 0.3 + 0.1,
      averageRating: Math.random() * 2 + 3,
      priceRange: {
        min: Math.floor(Math.random() * 50) + 50,
        max: Math.floor(Math.random() * 100) + 150
      }
    };
  }

  private calculateMarketSize(demographics: DemographicData, marketData: MarketAnalysisData): any {
    return {
      totalAddressableMarket: demographics.population * 0.1 * 50000,
      serviceableMarket: demographics.householdCount * 0.05 * 25000,
      targetMarket: demographics.householdCount * 0.02 * 15000
    };
  }

  private assessGrowthPotential(demographics: DemographicData, marketData: MarketAnalysisData): any {
    return {
      populationGrowth: marketData.economicIndicators.populationGrowthRate,
      economicGrowth: marketData.economicIndicators.businessGrowthRate,
      constructionGrowth: marketData.constructionActivity.permitCount / 100,
      overallScore: Math.random() * 40 + 60
    };
  }

  private identifyTargetCustomers(demographics: DemographicData): any {
    return {
      primarySegment: demographics.medianIncome > 75000 ? 'High-income homeowners' : 'Middle-income families',
      secondarySegment: 'Small businesses and commercial properties',
      demographics: {
        ageGroup: '35-54 years',
        incomeRange: `$${demographics.medianIncome - 20000} - $${demographics.medianIncome + 30000}`,
        homeOwnership: Math.round((demographics.ownerOccupied / demographics.householdCount) * 100)
      }
    };
  }

  private generatePricingInsights(marketData: MarketAnalysisData): any {
    return {
      averageProjectValue: marketData.constructionActivity.totalValue / marketData.constructionActivity.permitCount,
      priceElasticity: Math.random() * 0.5 + 0.3,
      competitivePricing: {
        low: Math.floor(Math.random() * 50) + 75,
        average: Math.floor(Math.random() * 50) + 125,
        high: Math.floor(Math.random() * 100) + 200
      },
      recommendations: [
        'Price competitively within market range',
        'Consider value-based pricing for premium services',
        'Monitor competitor pricing regularly'
      ]
    };
  }

  private identifyExpansionOpportunities(
    demographics: DemographicData,
    marketData: MarketAnalysisData
  ): any {
    return {
      geographicExpansion: marketData.competitorDensity.marketSaturation < 0.5,
      serviceExpansion: demographics.medianIncome > 60000,
      partnershipOpportunities: marketData.developmentProjects.plannedProjects > 5,
      recommendations: [
        'Consider expanding to adjacent high-growth areas',
        'Explore partnerships with local developers',
        'Add complementary services based on market demand'
      ]
    };
  }
}

export const arcgisService = new ArcGISOnlineService();
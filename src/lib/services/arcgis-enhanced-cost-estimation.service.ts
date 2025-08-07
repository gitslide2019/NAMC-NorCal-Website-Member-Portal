import { arcgisService, SpatialAnalysisResult } from './arcgis-online.service';
import { rsMeansService } from './rs-means-api.service';

export interface ArcGISEnhancedCostEstimate {
  id: string;
  projectName: string;
  location: {
    latitude: number;
    longitude: number;
    address: string;
  };
  projectType: 'residential' | 'commercial' | 'industrial';
  spatialAnalysis: SpatialAnalysisResult;
  baseCosts: {
    materials: number;
    labor: number;
    equipment: number;
    permits: number;
    overhead: number;
    profit: number;
  };
  locationAdjustments: {
    laborRateMultiplier: number;
    materialCostMultiplier: number;
    permitCostAdjustment: number;
    competitionAdjustment: number;
    marketDemandAdjustment: number;
  };
  socialImpactGoals: {
    jobsToCreate: number;
    trainingHoursTarget: number;
    localHirePercentage: number;
    minorityHirePercentage: number;
    communityBenefitScore: number;
    affordabilityImpact: number;
  };
  crowdfundingOptimization: {
    recommendedCampaignTarget: number;
    potentialSponsorTypes: string[];
    communityEngagementScore: number;
    fundingProbability: number;
    suggestedIncentives: string[];
  };
  opportunityAlerts: Array<{
    type: 'cost_savings' | 'market_timing' | 'competition' | 'demand_surge';
    message: string;
    impact: 'low' | 'medium' | 'high';
    actionRequired: boolean;
  }>;
  totalEstimate: number;
  confidenceLevel: number;
  riskFactors: Array<{
    factor: string;
    impact: 'low' | 'medium' | 'high';
    mitigation: string;
    costImpact: number;
  }>;
  recommendations: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface SocialImpactGoalSetting {
  projectType: 'residential' | 'commercial' | 'industrial';
  projectValue: number;
  demographics: {
    population: number;
    medianIncome: number;
    unemploymentRate: number;
    minorityPercentage: number;
  };
  communityNeeds: {
    housingAffordability: number;
    jobCreationNeed: number;
    skillDevelopmentNeed: number;
  };
}

export interface CrowdfundingCampaignOptimization {
  location: {
    latitude: number;
    longitude: number;
  };
  projectType: string;
  projectValue: number;
  socialImpactGoals: any;
  communityData: {
    demographics: any;
    economicIndicators: any;
    localBusinesses: any;
  };
}

export class ArcGISEnhancedCostEstimationService {
  
  /**
   * Generate enhanced cost estimate with ArcGIS spatial analysis
   */
  async generateEnhancedEstimate(
    projectData: {
      name: string;
      type: 'residential' | 'commercial' | 'industrial';
      location: { latitude: number; longitude: number };
      specifications: any;
      timeline: string;
    }
  ): Promise<ArcGISEnhancedCostEstimate> {
    try {
      // Get spatial analysis for the location
      const spatialAnalysis = await arcgisService.performSpatialAnalysis(
        projectData.location.latitude,
        projectData.location.longitude,
        projectData.type
      );

      // Get base costs from RS Means
      const baseCosts = await this.getBaseCosts(projectData);

      // Calculate location-specific adjustments
      const locationAdjustments = this.calculateLocationAdjustments(spatialAnalysis);

      // Set realistic social impact goals based on demographics
      const socialImpactGoals = this.calculateSocialImpactGoals({
        projectType: projectData.type,
        projectValue: this.calculateBaseProjectValue(baseCosts),
        demographics: {
          population: spatialAnalysis.demographics.population,
          medianIncome: spatialAnalysis.demographics.medianIncome,
          unemploymentRate: spatialAnalysis.marketAnalysis.economicIndicators.unemploymentRate,
          minorityPercentage: this.calculateMinorityPercentage(spatialAnalysis.demographics)
        },
        communityNeeds: {
          housingAffordability: spatialAnalysis.marketAnalysis.economicIndicators.housingAffordabilityIndex,
          jobCreationNeed: spatialAnalysis.marketAnalysis.economicIndicators.unemploymentRate * 100,
          skillDevelopmentNeed: this.calculateSkillDevelopmentNeed(spatialAnalysis.demographics)
        }
      });

      // Optimize crowdfunding campaign
      const crowdfundingOptimization = await this.optimizeCrowdfundingCampaign({
        location: projectData.location,
        projectType: projectData.type,
        projectValue: this.calculateBaseProjectValue(baseCosts),
        socialImpactGoals,
        communityData: {
          demographics: spatialAnalysis.demographics,
          economicIndicators: spatialAnalysis.marketAnalysis.economicIndicators,
          localBusinesses: spatialAnalysis.marketAnalysis.competitorDensity
        }
      });

      // Generate opportunity alerts
      const opportunityAlerts = this.generateOpportunityAlerts(spatialAnalysis, baseCosts);

      // Calculate total estimate with adjustments
      const totalEstimate = this.calculateTotalEstimate(baseCosts, locationAdjustments);

      // Assess risk factors
      const riskFactors = this.assessRiskFactors(spatialAnalysis, baseCosts);

      // Generate recommendations
      const recommendations = this.generateRecommendations(
        spatialAnalysis,
        locationAdjustments,
        socialImpactGoals,
        crowdfundingOptimization
      );

      const estimate: ArcGISEnhancedCostEstimate = {
        id: `estimate_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        projectName: projectData.name,
        location: {
          ...projectData.location,
          address: spatialAnalysis.location.address
        },
        projectType: projectData.type,
        spatialAnalysis,
        baseCosts,
        locationAdjustments,
        socialImpactGoals,
        crowdfundingOptimization,
        opportunityAlerts,
        totalEstimate,
        confidenceLevel: this.calculateConfidenceLevel(spatialAnalysis, baseCosts),
        riskFactors,
        recommendations,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      return estimate;
    } catch (error) {
      console.error('Error generating enhanced cost estimate:', error);
      throw new Error('Failed to generate enhanced cost estimate');
    }
  }

  /**
   * Calculate realistic social impact goals based on demographics
   */
  private calculateSocialImpactGoals(data: SocialImpactGoalSetting) {
    const { projectType, projectValue, demographics, communityNeeds } = data;

    // Base calculations per $100K of project value
    const baseJobsPerValue = projectType === 'residential' ? 1.2 : projectType === 'commercial' ? 1.8 : 2.5;
    const baseTrainingHoursPerJob = 40;

    // Adjust based on community needs and demographics
    const unemploymentAdjustment = Math.min(demographics.unemploymentRate * 10, 2.0);
    const incomeAdjustment = demographics.medianIncome < 50000 ? 1.3 : demographics.medianIncome < 75000 ? 1.1 : 1.0;

    const jobsToCreate = Math.round(
      (projectValue / 100000) * baseJobsPerValue * unemploymentAdjustment * incomeAdjustment
    );

    const trainingHoursTarget = jobsToCreate * baseTrainingHoursPerJob;

    // Local hire percentage based on population and unemployment
    const localHirePercentage = Math.min(
      60 + (demographics.unemploymentRate * 200) + (demographics.population > 50000 ? 10 : 0),
      85
    );

    // Minority hire percentage based on local demographics
    const minorityHirePercentage = Math.min(
      Math.max(demographics.minorityPercentage * 0.8, 25), // At least 25%, up to 80% of local minority population
      60
    );

    // Community benefit score (0-100)
    const communityBenefitScore = Math.round(
      (jobsToCreate * 10) + 
      (localHirePercentage * 0.5) + 
      (minorityHirePercentage * 0.3) +
      (communityNeeds.housingAffordability > 60 ? 15 : 0)
    );

    // Affordability impact (improvement in housing affordability index)
    const affordabilityImpact = projectType === 'residential' ? 
      Math.min(projectValue / 1000000 * 2, 10) : 
      Math.min(projectValue / 2000000 * 1, 5);

    return {
      jobsToCreate,
      trainingHoursTarget,
      localHirePercentage: Math.round(localHirePercentage),
      minorityHirePercentage: Math.round(minorityHirePercentage),
      communityBenefitScore,
      affordabilityImpact: Math.round(affordabilityImpact * 10) / 10
    };
  }

  /**
   * Optimize crowdfunding campaign using ArcGIS community data
   */
  private async optimizeCrowdfundingCampaign(data: CrowdfundingCampaignOptimization) {
    const { projectValue, socialImpactGoals, communityData } = data;

    // Recommended campaign target (typically 15-25% of project value for gap funding)
    const gapFundingPercentage = communityData.demographics.medianIncome < 60000 ? 0.25 : 0.15;
    const recommendedCampaignTarget = Math.round(projectValue * gapFundingPercentage);

    // Identify potential sponsor types based on community data
    const potentialSponsorTypes = [];
    
    if (communityData.demographics.medianIncome > 75000) {
      potentialSponsorTypes.push('High-income residents', 'Local professionals');
    }
    
    if (communityData.economicIndicators.businessGrowthRate > 0.03) {
      potentialSponsorTypes.push('Growing local businesses', 'Business associations');
    }
    
    if (socialImpactGoals.jobsToCreate > 10) {
      potentialSponsorTypes.push('Workforce development organizations', 'Labor unions');
    }
    
    if (socialImpactGoals.minorityHirePercentage > 40) {
      potentialSponsorTypes.push('Diversity-focused foundations', 'Corporate social responsibility programs');
    }

    // Community engagement score based on demographics and social impact
    const engagementFactors = [
      communityData.demographics.population > 25000 ? 20 : 10,
      communityData.economicIndicators.businessGrowthRate * 1000,
      socialImpactGoals.communityBenefitScore * 0.3,
      communityData.demographics.medianIncome > 60000 ? 15 : 5
    ];
    
    const communityEngagementScore = Math.min(
      engagementFactors.reduce((sum, factor) => sum + factor, 0),
      100
    );

    // Funding probability based on community characteristics
    const fundingProbability = Math.min(
      (communityEngagementScore * 0.4) + 
      (socialImpactGoals.communityBenefitScore * 0.3) +
      (potentialSponsorTypes.length * 5) +
      (recommendedCampaignTarget < 100000 ? 20 : 10),
      85
    ) / 100;

    // Suggested incentives based on community profile
    const suggestedIncentives = [];
    
    if (communityData.demographics.medianIncome > 75000) {
      suggestedIncentives.push('Tax deduction certificates', 'Recognition plaques');
    } else {
      suggestedIncentives.push('Community appreciation events', 'Progress updates');
    }
    
    if (socialImpactGoals.jobsToCreate > 5) {
      suggestedIncentives.push('Job placement priority for sponsors\' referrals');
    }
    
    suggestedIncentives.push('Project naming rights for major sponsors', 'Social media recognition');

    return {
      recommendedCampaignTarget,
      potentialSponsorTypes,
      communityEngagementScore: Math.round(communityEngagementScore),
      fundingProbability: Math.round(fundingProbability * 100) / 100,
      suggestedIncentives
    };
  }

  /**
   * Get base costs from RS Means API
   */
  private async getBaseCosts(projectData: any) {
    // Mock implementation - integrate with actual RS Means service
    const baseRate = projectData.type === 'residential' ? 150 : 
                    projectData.type === 'commercial' ? 200 : 250;
    
    const materials = baseRate * 0.4 * 1000;
    const labor = baseRate * 0.35 * 1000;
    const equipment = baseRate * 0.1 * 1000;
    const permits = baseRate * 0.05 * 1000;
    const overhead = (materials + labor + equipment + permits) * 0.15;
    const profit = (materials + labor + equipment + permits + overhead) * 0.1;

    return {
      materials,
      labor,
      equipment,
      permits,
      overhead,
      profit
    };
  }

  /**
   * Calculate location-specific cost adjustments
   */
  private calculateLocationAdjustments(spatialAnalysis: SpatialAnalysisResult) {
    const { demographics, marketAnalysis } = spatialAnalysis;

    // Labor rate multiplier based on local wages and cost of living
    const laborRateMultiplier = demographics.medianIncome > 75000 ? 1.2 : 
                               demographics.medianIncome > 50000 ? 1.1 : 1.0;

    // Material cost multiplier based on location and transportation
    const materialCostMultiplier = demographics.population > 100000 ? 1.05 : 1.15;

    // Permit cost adjustment based on local permit activity
    const permitCostAdjustment = marketAnalysis.constructionActivity.permitCount > 50 ? 1.1 : 1.0;

    // Competition adjustment (more competition = lower prices)
    const competitionAdjustment = marketAnalysis.competitorDensity.marketSaturation > 0.7 ? 0.95 : 
                                 marketAnalysis.competitorDensity.marketSaturation > 0.4 ? 1.0 : 1.05;

    // Market demand adjustment
    const marketDemandAdjustment = spatialAnalysis.businessOpportunityScore > 70 ? 1.1 : 
                                  spatialAnalysis.businessOpportunityScore > 40 ? 1.0 : 0.95;

    return {
      laborRateMultiplier,
      materialCostMultiplier,
      permitCostAdjustment,
      competitionAdjustment,
      marketDemandAdjustment
    };
  }

  /**
   * Generate opportunity alerts based on spatial analysis
   */
  private generateOpportunityAlerts(spatialAnalysis: SpatialAnalysisResult, baseCosts: any) {
    const alerts = [];

    // Cost savings opportunities
    if (spatialAnalysis.marketAnalysis.competitorDensity.marketSaturation > 0.7) {
      alerts.push({
        type: 'cost_savings' as const,
        message: 'High competition may allow for better material pricing negotiations',
        impact: 'medium' as const,
        actionRequired: true
      });
    }

    // Market timing alerts
    if (spatialAnalysis.marketAnalysis.constructionActivity.permitCount > 75) {
      alerts.push({
        type: 'market_timing' as const,
        message: 'High permit activity indicates strong market demand - consider premium pricing',
        impact: 'high' as const,
        actionRequired: true
      });
    }

    // Competition alerts
    if (spatialAnalysis.marketAnalysis.competitorDensity.contractorCount < 10) {
      alerts.push({
        type: 'competition' as const,
        message: 'Low competition in area - opportunity for market leadership',
        impact: 'high' as const,
        actionRequired: false
      });
    }

    // Demand surge alerts
    if (spatialAnalysis.marketAnalysis.economicIndicators.businessGrowthRate > 0.05) {
      alerts.push({
        type: 'demand_surge' as const,
        message: 'Strong economic growth indicates increasing construction demand',
        impact: 'medium' as const,
        actionRequired: false
      });
    }

    return alerts;
  }

  /**
   * Calculate total estimate with all adjustments
   */
  private calculateTotalEstimate(baseCosts: any, adjustments: any) {
    const { materials, labor, equipment, permits, overhead, profit } = baseCosts;
    const {
      laborRateMultiplier,
      materialCostMultiplier,
      permitCostAdjustment,
      competitionAdjustment,
      marketDemandAdjustment
    } = adjustments;

    const adjustedMaterials = materials * materialCostMultiplier;
    const adjustedLabor = labor * laborRateMultiplier;
    const adjustedEquipment = equipment; // Equipment costs typically don't vary by location
    const adjustedPermits = permits * permitCostAdjustment;
    const adjustedOverhead = overhead;
    const adjustedProfit = profit;

    const subtotal = adjustedMaterials + adjustedLabor + adjustedEquipment + 
                    adjustedPermits + adjustedOverhead + adjustedProfit;

    return Math.round(subtotal * competitionAdjustment * marketDemandAdjustment);
  }

  /**
   * Assess risk factors based on spatial analysis
   */
  private assessRiskFactors(spatialAnalysis: SpatialAnalysisResult, baseCosts: any) {
    const riskFactors = [];

    // High competition risk
    if (spatialAnalysis.marketAnalysis.competitorDensity.marketSaturation > 0.8) {
      riskFactors.push({
        factor: 'High market saturation',
        impact: 'high' as const,
        mitigation: 'Differentiate through superior service quality and NAMC membership benefits',
        costImpact: baseCosts.profit * 0.3
      });
    }

    // Economic risk
    if (spatialAnalysis.marketAnalysis.economicIndicators.unemploymentRate > 0.08) {
      riskFactors.push({
        factor: 'High unemployment rate',
        impact: 'medium' as const,
        mitigation: 'Focus on affordable housing projects and emphasize job creation benefits',
        costImpact: baseCosts.labor * 0.1
      });
    }

    // Permit risk
    if (spatialAnalysis.marketAnalysis.constructionActivity.permitCount < 20) {
      riskFactors.push({
        factor: 'Low construction activity',
        impact: 'medium' as const,
        mitigation: 'Explore adjacent markets or consider different project types',
        costImpact: baseCosts.overhead * 0.2
      });
    }

    return riskFactors;
  }

  /**
   * Generate recommendations based on analysis
   */
  private generateRecommendations(
    spatialAnalysis: SpatialAnalysisResult,
    adjustments: any,
    socialImpactGoals: any,
    crowdfunding: any
  ) {
    const recommendations = [];

    // Pricing recommendations
    if (adjustments.marketDemandAdjustment > 1.05) {
      recommendations.push('Market conditions support premium pricing - consider 10-15% markup');
    }

    // Social impact recommendations
    if (socialImpactGoals.jobsToCreate > 15) {
      recommendations.push('High job creation potential - emphasize workforce development in proposals');
    }

    // Crowdfunding recommendations
    if (crowdfunding.fundingProbability > 0.7) {
      recommendations.push('Strong community engagement indicates good crowdfunding potential');
    }

    // Location-specific recommendations
    if (spatialAnalysis.businessOpportunityScore > 70) {
      recommendations.push('Excellent location for expansion - consider establishing permanent presence');
    }

    // Competition recommendations
    if (spatialAnalysis.marketAnalysis.competitorDensity.contractorCount < 15) {
      recommendations.push('Low competition - opportunity to establish market leadership');
    }

    return recommendations;
  }

  // Helper methods
  private calculateBaseProjectValue(baseCosts: any): number {
    return Object.values(baseCosts).reduce((sum: number, cost: any) => sum + cost, 0);
  }

  private calculateMinorityPercentage(demographics: any): number {
    const { ethnicityDistribution } = demographics;
    const totalMinority = ethnicityDistribution.black + ethnicityDistribution.hispanic + 
                         ethnicityDistribution.asian + ethnicityDistribution.other;
    const totalPopulation = Object.values(ethnicityDistribution).reduce((sum: number, count: any) => sum + count, 0);
    return totalPopulation > 0 ? (totalMinority / totalPopulation) * 100 : 25;
  }

  private calculateSkillDevelopmentNeed(demographics: any): number {
    const { educationLevel } = demographics;
    const totalPopulation = Object.values(educationLevel).reduce((sum: number, count: any) => sum + count, 0);
    const highSchoolOrLess = educationLevel.highSchool;
    return totalPopulation > 0 ? (highSchoolOrLess / totalPopulation) * 100 : 50;
  }

  private calculateConfidenceLevel(spatialAnalysis: SpatialAnalysisResult, baseCosts: any): number {
    let confidence = 70; // Base confidence

    // Adjust based on data quality and market conditions
    if (spatialAnalysis.demographics.population > 10000) confidence += 10;
    if (spatialAnalysis.marketAnalysis.constructionActivity.permitCount > 30) confidence += 10;
    if (spatialAnalysis.businessOpportunityScore > 60) confidence += 5;
    if (spatialAnalysis.riskFactors.length < 3) confidence += 5;

    return Math.min(confidence, 95);
  }
}

export const arcgisEnhancedCostEstimationService = new ArcGISEnhancedCostEstimationService();
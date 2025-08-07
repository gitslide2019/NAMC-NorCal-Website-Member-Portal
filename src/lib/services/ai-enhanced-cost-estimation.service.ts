import { PrismaClient } from '@prisma/client';
import { RSMeansAPIService, RSMeansCostData, RSMeansEstimate, RSMeansLocation, MaterialSpecification } from './rs-means-api.service';
import { GeminiCameraAIService, CameraAnalysisResult } from './gemini-camera-ai.service';

export interface MarketCondition {
  factor: string;
  impact: number; // -1 to 1, where negative reduces cost, positive increases
  confidence: number;
  description: string;
  source: string;
  effectiveDate: string;
}

export interface HistoricalAccuracy {
  cameraEstimateId: string;
  actualCost: number;
  estimatedCost: number;
  accuracyPercentage: number;
  projectType: string;
  location: RSMeansLocation;
  completionDate: string;
  factors: string[];
}

export interface ConfidenceInterval {
  low: number;
  high: number;
  mean: number;
  confidence: number;
  factors: Array<{
    factor: string;
    impact: number;
    confidence: number;
  }>;
}

export interface PricingOptimization {
  originalEstimate: number;
  optimizedEstimate: number;
  savings: number;
  recommendations: Array<{
    category: string;
    suggestion: string;
    potentialSavings: number;
    riskLevel: 'low' | 'medium' | 'high';
    implementationDifficulty: 'easy' | 'moderate' | 'difficult';
  }>;
  materialSubstitutions: Array<{
    original: string;
    substitute: string;
    costDifference: number;
    qualityImpact: string;
    availability: string;
  }>;
}

export interface CrossValidationResult {
  cameraConfidence: number;
  rsMeansConfidence: number;
  combinedConfidence: number;
  variance: number;
  discrepancies: Array<{
    item: string;
    cameraEstimate: number;
    rsMeansEstimate: number;
    difference: number;
    possibleReasons: string[];
  }>;
  recommendation: 'use_camera' | 'use_rs_means' | 'use_average' | 'requires_verification';
}

export class AIEnhancedCostEstimationService {
  private prisma: PrismaClient;
  private rsMeansService: RSMeansAPIService;
  private cameraService: GeminiCameraAIService;

  constructor() {
    this.prisma = new PrismaClient();
    this.rsMeansService = new RSMeansAPIService();
    this.cameraService = new GeminiCameraAIService();
  }

  async generateEnhancedEstimate(
    elements: Array<{
      element: string;
      specifications: MaterialSpecification[];
      quantity: number;
      cameraAnalysis?: CameraAnalysisResult;
    }>,
    location: RSMeansLocation,
    projectType: string,
    overheadPercentage: number = 15,
    profitPercentage: number = 10
  ): Promise<RSMeansEstimate & {
    marketAdjustments: MarketCondition[];
    confidenceInterval: ConfidenceInterval;
    pricingOptimization: PricingOptimization;
    crossValidation: CrossValidationResult;
  }> {
    // Get market conditions
    const marketConditions = await this.getMarketConditions(location, projectType);
    
    // Get historical accuracy data
    const historicalData = await this.getHistoricalAccuracy(location, projectType);
    
    // Generate base RS Means estimate
    const baseEstimate = await this.rsMeansService.generateEstimate(
      elements,
      location,
      overheadPercentage,
      profitPercentage
    );

    // Apply market condition adjustments
    const marketAdjustedEstimate = this.applyMarketConditions(baseEstimate, marketConditions);
    
    // Calculate confidence intervals
    const confidenceInterval = this.calculateConfidenceInterval(
      marketAdjustedEstimate,
      historicalData,
      elements
    );

    // Generate pricing optimizations
    const pricingOptimization = await this.generatePricingOptimizations(
      marketAdjustedEstimate,
      elements,
      location
    );

    // Cross-validate with camera data if available
    const crossValidation = await this.crossValidateWithCamera(
      marketAdjustedEstimate,
      elements,
      location
    );

    return {
      ...marketAdjustedEstimate,
      marketAdjustments: marketConditions,
      confidenceInterval,
      pricingOptimization,
      crossValidation
    };
  }

  async getMarketConditions(location: RSMeansLocation, projectType: string): Promise<MarketCondition[]> {
    const conditions: MarketCondition[] = [];

    try {
      // Seasonal adjustments
      const seasonalCondition = this.getSeasonalAdjustment();
      if (seasonalCondition) {
        conditions.push(seasonalCondition);
      }

      // Regional market conditions
      const regionalCondition = await this.getRegionalMarketCondition(location);
      if (regionalCondition) {
        conditions.push(regionalCondition);
      }

      // Supply chain conditions
      const supplyChainCondition = await this.getSupplyChainConditions(location, projectType);
      if (supplyChainCondition) {
        conditions.push(supplyChainCondition);
      }

      // Labor market conditions
      const laborCondition = await this.getLaborMarketConditions(location);
      if (laborCondition) {
        conditions.push(laborCondition);
      }

      // Economic indicators
      const economicCondition = await this.getEconomicIndicators(location);
      if (economicCondition) {
        conditions.push(economicCondition);
      }

    } catch (error) {
      console.error('Error fetching market conditions:', error);
      // Return basic seasonal adjustment as fallback
      const fallbackCondition = this.getSeasonalAdjustment();
      if (fallbackCondition) {
        conditions.push(fallbackCondition);
      }
    }

    return conditions;
  }

  async getHistoricalAccuracy(location: RSMeansLocation, projectType: string): Promise<HistoricalAccuracy[]> {
    try {
      // Query database for historical camera estimates with actual outcomes
      const historicalEstimates = await this.prisma.cameraEstimate.findMany({
        where: {
          projectType: {
            contains: projectType,
            mode: 'insensitive'
          },
          actualCost: {
            not: null
          }
        },
        include: {
          costEstimate: true
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: 50 // Last 50 similar projects
      });

      return historicalEstimates
        .filter(estimate => estimate.actualCost !== null)
        .map(estimate => ({
          cameraEstimateId: estimate.id,
          actualCost: estimate.actualCost!,
          estimatedCost: estimate.totalEstimate,
          accuracyPercentage: this.calculateAccuracyPercentage(estimate.totalEstimate, estimate.actualCost!),
          projectType: estimate.projectType || projectType,
          location: {
            latitude: estimate.latitude || location.latitude,
            longitude: estimate.longitude || location.longitude,
            city: location.city,
            state: location.state
          },
          completionDate: estimate.updatedAt.toISOString(),
          factors: this.extractFactorsFromAnalysis(estimate.sceneAnalysis)
        }));

    } catch (error) {
      console.error('Error fetching historical accuracy data:', error);
      return [];
    }
  }

  private applyMarketConditions(estimate: RSMeansEstimate, conditions: MarketCondition[]): RSMeansEstimate {
    let adjustmentFactor = 1.0;
    
    conditions.forEach(condition => {
      adjustmentFactor *= (1 + condition.impact);
    });

    return {
      ...estimate,
      totalMaterialCost: estimate.totalMaterialCost * adjustmentFactor,
      totalLaborCost: estimate.totalLaborCost * adjustmentFactor,
      totalEquipmentCost: estimate.totalEquipmentCost * adjustmentFactor,
      totalCost: estimate.totalCost * adjustmentFactor,
      overhead: estimate.overhead * adjustmentFactor,
      profit: estimate.profit * adjustmentFactor,
      grandTotal: estimate.grandTotal * adjustmentFactor,
      items: estimate.items.map(item => ({
        ...item,
        materialCost: item.materialCost * adjustmentFactor,
        laborCost: item.laborCost * adjustmentFactor,
        equipmentCost: item.equipmentCost * adjustmentFactor,
        totalCost: item.totalCost * adjustmentFactor
      }))
    };
  }

  private calculateConfidenceInterval(
    estimate: RSMeansEstimate,
    historicalData: HistoricalAccuracy[],
    elements: Array<{ element: string; specifications: MaterialSpecification[]; quantity: number }>
  ): ConfidenceInterval {
    if (historicalData.length === 0) {
      // Default confidence interval without historical data
      return {
        low: estimate.grandTotal * 0.85,
        high: estimate.grandTotal * 1.25,
        mean: estimate.grandTotal,
        confidence: 0.7,
        factors: [
          { factor: 'limited_historical_data', impact: 0.15, confidence: 0.6 },
          { factor: 'rs_means_baseline', impact: 0.1, confidence: 0.8 }
        ]
      };
    }

    // Calculate variance from historical data
    const accuracies = historicalData.map(h => h.accuracyPercentage / 100);
    const meanAccuracy = accuracies.reduce((sum, acc) => sum + acc, 0) / accuracies.length;
    const variance = accuracies.reduce((sum, acc) => sum + Math.pow(acc - meanAccuracy, 2), 0) / accuracies.length;
    const standardDeviation = Math.sqrt(variance);

    // Calculate confidence interval (95% confidence)
    const confidenceMultiplier = 1.96; // 95% confidence
    const errorMargin = confidenceMultiplier * standardDeviation;

    const factors = [
      {
        factor: 'historical_accuracy',
        impact: standardDeviation,
        confidence: Math.min(0.9, historicalData.length / 20) // More data = higher confidence
      },
      {
        factor: 'project_complexity',
        impact: this.assessProjectComplexity(elements),
        confidence: 0.8
      }
    ];

    return {
      low: estimate.grandTotal * (meanAccuracy - errorMargin),
      high: estimate.grandTotal * (meanAccuracy + errorMargin),
      mean: estimate.grandTotal * meanAccuracy,
      confidence: Math.min(0.95, 0.6 + (historicalData.length / 50)),
      factors
    };
  }

  private async generatePricingOptimizations(
    estimate: RSMeansEstimate,
    elements: Array<{ element: string; specifications: MaterialSpecification[]; quantity: number }>,
    location: RSMeansLocation
  ): Promise<PricingOptimization> {
    const recommendations: PricingOptimization['recommendations'] = [];
    const materialSubstitutions: PricingOptimization['materialSubstitutions'] = [];
    let totalSavings = 0;

    // Analyze each element for optimization opportunities
    for (const element of elements) {
      // Material quality optimization
      const qualityOptimization = this.analyzeQualityOptimization(element);
      if (qualityOptimization.savings > 0) {
        recommendations.push(qualityOptimization);
        totalSavings += qualityOptimization.potentialSavings;
      }

      // Bulk purchasing opportunities
      const bulkOptimization = this.analyzeBulkPurchasing(element);
      if (bulkOptimization.savings > 0) {
        recommendations.push(bulkOptimization);
        totalSavings += bulkOptimization.potentialSavings;
      }

      // Alternative materials
      const alternatives = await this.findMaterialAlternatives(element, location);
      materialSubstitutions.push(...alternatives);
      totalSavings += alternatives.reduce((sum, alt) => sum + Math.abs(alt.costDifference), 0);
    }

    // Timing optimizations
    const timingOptimization = this.analyzeTimingOptimization(location);
    if (timingOptimization.savings > 0) {
      recommendations.push(timingOptimization);
      totalSavings += timingOptimization.potentialSavings;
    }

    return {
      originalEstimate: estimate.grandTotal,
      optimizedEstimate: estimate.grandTotal - totalSavings,
      savings: totalSavings,
      recommendations,
      materialSubstitutions
    };
  }

  private async crossValidateWithCamera(
    rsMeansEstimate: RSMeansEstimate,
    elements: Array<{ element: string; specifications: MaterialSpecification[]; quantity: number; cameraAnalysis?: CameraAnalysisResult }>,
    location: RSMeansLocation
  ): Promise<CrossValidationResult> {
    const discrepancies: CrossValidationResult['discrepancies'] = [];
    let totalCameraConfidence = 0;
    let totalRsMeansConfidence = 0;
    let elementsWithCamera = 0;

    for (const element of elements) {
      if (element.cameraAnalysis) {
        elementsWithCamera++;
        
        // Find corresponding RS Means item
        const rsMeansItem = rsMeansEstimate.items.find(item => 
          item.description.toLowerCase().includes(element.element.toLowerCase())
        );

        if (rsMeansItem) {
          const cameraEstimate = element.cameraAnalysis.costEstimate?.totalCost || 0;
          const rsMeansItemCost = rsMeansItem.totalCost;
          const difference = Math.abs(cameraEstimate - rsMeansItemCost);
          const percentageDifference = (difference / rsMeansItemCost) * 100;

          if (percentageDifference > 15) { // Significant discrepancy
            discrepancies.push({
              item: element.element,
              cameraEstimate,
              rsMeansEstimate: rsMeansItemCost,
              difference,
              possibleReasons: this.analyzeCostDiscrepancy(
                element.cameraAnalysis,
                rsMeansItem,
                percentageDifference
              )
            });
          }

          totalCameraConfidence += element.cameraAnalysis.confidence || 0.7;
          totalRsMeansConfidence += rsMeansItem.confidence || 0.8;
        }
      }
    }

    const avgCameraConfidence = elementsWithCamera > 0 ? totalCameraConfidence / elementsWithCamera : 0;
    const avgRsMeansConfidence = elementsWithCamera > 0 ? totalRsMeansConfidence / elementsWithCamera : 0.8;
    
    // Calculate combined confidence and variance
    const combinedConfidence = this.calculateCombinedConfidence(avgCameraConfidence, avgRsMeansConfidence, discrepancies.length);
    const variance = this.calculateVariance(discrepancies);

    // Determine recommendation
    let recommendation: CrossValidationResult['recommendation'] = 'use_rs_means';
    
    if (discrepancies.length === 0 && avgCameraConfidence > 0.8) {
      recommendation = 'use_average';
    } else if (discrepancies.length > elements.length * 0.3) {
      recommendation = 'requires_verification';
    } else if (avgCameraConfidence > avgRsMeansConfidence) {
      recommendation = 'use_camera';
    }

    return {
      cameraConfidence: avgCameraConfidence,
      rsMeansConfidence: avgRsMeansConfidence,
      combinedConfidence,
      variance,
      discrepancies,
      recommendation
    };
  }

  // Helper methods for market conditions
  private getSeasonalAdjustment(): MarketCondition | null {
    const month = new Date().getMonth();
    const season = this.getSeason(month);
    
    const seasonalFactors = {
      'spring': { impact: 0.05, description: 'Spring construction season increase' },
      'summer': { impact: 0.08, description: 'Peak construction season premium' },
      'fall': { impact: 0.02, description: 'Moderate fall construction activity' },
      'winter': { impact: -0.03, description: 'Winter construction slowdown discount' }
    };

    const factor = seasonalFactors[season];
    if (!factor) return null;

    return {
      factor: 'seasonal',
      impact: factor.impact,
      confidence: 0.8,
      description: factor.description,
      source: 'Seasonal Analysis',
      effectiveDate: new Date().toISOString()
    };
  }

  private async getRegionalMarketCondition(location: RSMeansLocation): Promise<MarketCondition | null> {
    // Mock regional analysis - in real implementation, this would use market data APIs
    const isHighCostArea = location.latitude >= 37.0 && location.latitude <= 38.0 && 
                          location.longitude >= -123.0 && location.longitude <= -121.0;
    
    if (isHighCostArea) {
      return {
        factor: 'regional_premium',
        impact: 0.15,
        confidence: 0.9,
        description: 'High-cost metropolitan area premium',
        source: 'Regional Market Analysis',
        effectiveDate: new Date().toISOString()
      };
    }

    return null;
  }

  private async getSupplyChainConditions(location: RSMeansLocation, projectType: string): Promise<MarketCondition | null> {
    // Mock supply chain analysis
    return {
      factor: 'supply_chain',
      impact: 0.03,
      confidence: 0.7,
      description: 'Current supply chain constraints',
      source: 'Supply Chain Analysis',
      effectiveDate: new Date().toISOString()
    };
  }

  private async getLaborMarketConditions(location: RSMeansLocation): Promise<MarketCondition | null> {
    // Mock labor market analysis
    return {
      factor: 'labor_market',
      impact: 0.04,
      confidence: 0.75,
      description: 'Tight labor market conditions',
      source: 'Labor Market Analysis',
      effectiveDate: new Date().toISOString()
    };
  }

  private async getEconomicIndicators(location: RSMeansLocation): Promise<MarketCondition | null> {
    // Mock economic indicators
    return {
      factor: 'economic_indicators',
      impact: 0.02,
      confidence: 0.8,
      description: 'Current economic conditions',
      source: 'Economic Analysis',
      effectiveDate: new Date().toISOString()
    };
  }

  // Helper methods
  private getSeason(month: number): string {
    if (month >= 2 && month <= 4) return 'spring';
    if (month >= 5 && month <= 7) return 'summer';
    if (month >= 8 && month <= 10) return 'fall';
    return 'winter';
  }

  private calculateAccuracyPercentage(estimated: number, actual: number): number {
    if (actual === 0) return 0;
    return Math.max(0, 100 - Math.abs((estimated - actual) / actual) * 100);
  }

  private extractFactorsFromAnalysis(sceneAnalysis: string): string[] {
    try {
      const analysis = JSON.parse(sceneAnalysis);
      return analysis.factors || [];
    } catch {
      return [];
    }
  }

  private assessProjectComplexity(elements: Array<{ element: string; specifications: MaterialSpecification[]; quantity: number }>): number {
    const complexityFactors = elements.length * 0.02; // More elements = more complexity
    const specificationComplexity = elements.reduce((sum, element) => {
      return sum + element.specifications.length * 0.01;
    }, 0);
    
    return Math.min(0.2, complexityFactors + specificationComplexity);
  }

  private analyzeQualityOptimization(element: { element: string; specifications: MaterialSpecification[]; quantity: number }): PricingOptimization['recommendations'][0] {
    // Mock quality optimization analysis
    const hasPremiumSpecs = element.specifications.some(spec => spec.quality === 'premium');
    
    if (hasPremiumSpecs) {
      return {
        category: 'material_quality',
        suggestion: `Consider standard quality materials for ${element.element}`,
        potentialSavings: element.quantity * 50, // Mock savings
        riskLevel: 'low',
        implementationDifficulty: 'easy'
      };
    }

    return {
      category: 'material_quality',
      suggestion: 'No quality optimization opportunities identified',
      potentialSavings: 0,
      riskLevel: 'low',
      implementationDifficulty: 'easy'
    };
  }

  private analyzeBulkPurchasing(element: { element: string; specifications: MaterialSpecification[]; quantity: number }): PricingOptimization['recommendations'][0] {
    if (element.quantity > 100) {
      return {
        category: 'bulk_purchasing',
        suggestion: `Negotiate bulk pricing for ${element.element}`,
        potentialSavings: element.quantity * 5, // Mock savings
        riskLevel: 'low',
        implementationDifficulty: 'moderate'
      };
    }

    return {
      category: 'bulk_purchasing',
      suggestion: 'Quantity too low for bulk pricing',
      potentialSavings: 0,
      riskLevel: 'low',
      implementationDifficulty: 'easy'
    };
  }

  private async findMaterialAlternatives(
    element: { element: string; specifications: MaterialSpecification[]; quantity: number },
    location: RSMeansLocation
  ): Promise<PricingOptimization['materialSubstitutions']> {
    // Mock material alternatives
    const alternatives: PricingOptimization['materialSubstitutions'] = [];
    
    element.specifications.forEach(spec => {
      if (spec.material.toLowerCase().includes('premium')) {
        alternatives.push({
          original: spec.material,
          substitute: spec.material.replace('premium', 'standard'),
          costDifference: -spec.quantity * 25, // Savings
          qualityImpact: 'Minimal impact on performance',
          availability: 'Readily available'
        });
      }
    });

    return alternatives;
  }

  private analyzeTimingOptimization(location: RSMeansLocation): PricingOptimization['recommendations'][0] {
    const month = new Date().getMonth();
    const isOffSeason = month >= 10 || month <= 2; // Winter months
    
    if (!isOffSeason) {
      return {
        category: 'timing',
        suggestion: 'Consider scheduling during off-season for better pricing',
        potentialSavings: 1000, // Mock savings
        riskLevel: 'medium',
        implementationDifficulty: 'difficult'
      };
    }

    return {
      category: 'timing',
      suggestion: 'Current timing is optimal for pricing',
      potentialSavings: 0,
      riskLevel: 'low',
      implementationDifficulty: 'easy'
    };
  }

  private analyzeCostDiscrepancy(
    cameraAnalysis: CameraAnalysisResult,
    rsMeansItem: RSMeansCostData,
    percentageDifference: number
  ): string[] {
    const reasons: string[] = [];

    if (percentageDifference > 30) {
      reasons.push('Significant methodology difference between camera and RS Means');
    }

    if (cameraAnalysis.confidence < 0.7) {
      reasons.push('Low camera analysis confidence');
    }

    if (rsMeansItem.confidence && rsMeansItem.confidence < 0.7) {
      reasons.push('Low RS Means data confidence');
    }

    reasons.push('Different measurement methodologies');
    reasons.push('Possible quality or specification differences');

    return reasons;
  }

  private calculateCombinedConfidence(cameraConfidence: number, rsMeansConfidence: number, discrepancyCount: number): number {
    const baseConfidence = (cameraConfidence + rsMeansConfidence) / 2;
    const discrepancyPenalty = discrepancyCount * 0.05;
    
    return Math.max(0.3, baseConfidence - discrepancyPenalty);
  }

  private calculateVariance(discrepancies: CrossValidationResult['discrepancies']): number {
    if (discrepancies.length === 0) return 0;

    const differences = discrepancies.map(d => d.difference);
    const mean = differences.reduce((sum, diff) => sum + diff, 0) / differences.length;
    const variance = differences.reduce((sum, diff) => sum + Math.pow(diff - mean, 2), 0) / differences.length;
    
    return variance;
  }
}
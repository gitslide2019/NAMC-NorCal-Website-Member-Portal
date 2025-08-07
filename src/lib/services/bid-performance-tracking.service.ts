import { PrismaClient } from '@prisma/client';
import { HubSpotBackboneService } from './hubspot-backbone.service';

const prisma = new PrismaClient();

export interface PerformanceMetrics {
  totalBidsGenerated: number;
  totalBidsSubmitted: number;
  totalBidsWon: number;
  totalBidsLost: number;
  overallWinRate: number;
  winRateByProjectType: Record<string, number>;
  winRateByProjectSize: Record<string, number>;
  winRateByLocation: Record<string, number>;
  averageBidAccuracy: number;
  accuracyByProjectType: Record<string, number>;
  accuracyTrend: Array<{ date: string; accuracy: number }>;
  totalProjectValue: number;
  averageProjectValue: number;
  totalProfitGenerated: number;
  averageProfitMargin: number;
  averageBidTime: number;
  averageResponseTime: number;
  timelineAccuracy: number;
  competitivePosition: 'LEADER' | 'COMPETITIVE' | 'FOLLOWER' | 'NICHE';
  marketShareEstimate: number;
  pricingTrend: 'INCREASING' | 'STABLE' | 'DECREASING';
  improvementAreas: string[];
  strengthAreas: string[];
  recommendedTraining: string[];
  performanceTrend: any;
  seasonalPatterns: any;
  marketCycleTrends: any;
  industryBenchmark: number;
  peerComparison: any;
  marketPosition: any;
}

export interface BidOutcomeData {
  bidId: string;
  actualOutcome: 'WON' | 'LOST' | 'NO_RESPONSE' | 'CANCELLED';
  actualProjectValue?: number;
  actualCosts?: {
    materials: number;
    labor: number;
    equipment: number;
    permits: number;
    overhead: number;
    other: number;
  };
  actualTimeline?: number; // Days
  profitMargin?: number;
  clientFeedback?: string;
  lessonsLearned?: string[];
  competitorInfo?: {
    winningBid?: number;
    winningContractor?: string;
    reasonForLoss?: string;
  };
}

export interface MarketIntelligence {
  competitorAnalysis: {
    name: string;
    marketShare: number;
    averageBidAmount: number;
    winRate: number;
    strengths: string[];
    weaknesses: string[];
  }[];
  marketTrends: {
    demandTrend: 'INCREASING' | 'STABLE' | 'DECREASING';
    priceTrend: 'INCREASING' | 'STABLE' | 'DECREASING';
    competitionLevel: 'LOW' | 'MODERATE' | 'HIGH';
    seasonalFactors: any;
    economicIndicators: any;
  };
  pricingInsights: {
    averageMarketPrice: number;
    priceRange: { min: number; max: number };
    pricingStrategies: string[];
    valueDrivers: string[];
  };
}

export class BidPerformanceTrackingService {
  private hubspotService: HubSpotBackboneService;

  constructor() {
    this.hubspotService = new HubSpotBackboneService();
  }

  async updateBidOutcome(memberId: string, outcomeData: BidOutcomeData): Promise<void> {
    try {
      // Update the bid record
      const bid = await prisma.aIGeneratedBid.update({
        where: { id: outcomeData.bidId },
        data: {
          actualOutcome: outcomeData.actualOutcome,
          actualProjectValue: outcomeData.actualProjectValue,
          profitabilityActual: outcomeData.profitMargin,
          timelineAccuracy: outcomeData.actualTimeline ? 
            this.calculateTimelineAccuracy(outcomeData.bidId, outcomeData.actualTimeline) : undefined,
          bidAccuracy: outcomeData.actualCosts ? 
            await this.calculateBidAccuracy(outcomeData.bidId, outcomeData.actualCosts) : undefined,
        },
      });

      // Update member performance metrics
      await this.updateMemberPerformanceMetrics(memberId);

      // Learn from the outcome for future improvements
      await this.updateMachineLearningModel(outcomeData);

      // Sync to HubSpot
      await this.syncOutcomeToHubSpot(outcomeData);

    } catch (error) {
      console.error('Error updating bid outcome:', error);
      throw new Error('Failed to update bid outcome');
    }
  }

  async getPerformanceMetrics(memberId: string): Promise<PerformanceMetrics> {
    try {
      const [performanceRecord, bids] = await Promise.all([
        prisma.bidPerformanceMetrics.findUnique({ where: { memberId } }),
        prisma.aIGeneratedBid.findMany({ 
          where: { memberId },
          orderBy: { createdAt: 'desc' },
        }),
      ]);

      if (!performanceRecord) {
        // Create initial performance record
        await this.initializeMemberPerformanceMetrics(memberId);
        return this.getPerformanceMetrics(memberId);
      }

      // Calculate detailed metrics
      const detailedMetrics = await this.calculateDetailedMetrics(memberId, bids);

      return {
        totalBidsGenerated: performanceRecord.totalBidsGenerated,
        totalBidsSubmitted: performanceRecord.totalBidsSubmitted,
        totalBidsWon: performanceRecord.totalBidsWon,
        totalBidsLost: performanceRecord.totalBidsLost,
        overallWinRate: performanceRecord.overallWinRate,
        winRateByProjectType: JSON.parse(performanceRecord.winRateByProjectType || '{}'),
        winRateByProjectSize: JSON.parse(performanceRecord.winRateByProjectSize || '{}'),
        winRateByLocation: JSON.parse(performanceRecord.winRateByLocation || '{}'),
        averageBidAccuracy: performanceRecord.averageBidAccuracy,
        accuracyByProjectType: JSON.parse(performanceRecord.accuracyByProjectType || '{}'),
        accuracyTrend: JSON.parse(performanceRecord.accuracyTrend || '[]'),
        totalProjectValue: performanceRecord.totalProjectValue,
        averageProjectValue: performanceRecord.averageProjectValue,
        totalProfitGenerated: performanceRecord.totalProfitGenerated,
        averageProfitMargin: performanceRecord.averageProfitMargin,
        averageBidTime: performanceRecord.averageBidTime,
        averageResponseTime: performanceRecord.averageResponseTime,
        timelineAccuracy: performanceRecord.timelineAccuracy,
        competitivePosition: performanceRecord.competitivePosition as any,
        marketShareEstimate: performanceRecord.marketShareEstimate,
        pricingTrend: performanceRecord.pricingTrend as any,
        improvementAreas: JSON.parse(performanceRecord.improvementAreas || '[]'),
        strengthAreas: JSON.parse(performanceRecord.strengthAreas || '[]'),
        recommendedTraining: JSON.parse(performanceRecord.recommendedTraining || '[]'),
        performanceTrend: JSON.parse(performanceRecord.performanceTrend || '{}'),
        seasonalPatterns: JSON.parse(performanceRecord.seasonalPatterns || '{}'),
        marketCycleTrends: JSON.parse(performanceRecord.marketCycleTrends || '{}'),
        industryBenchmark: performanceRecord.industryBenchmark || 0,
        peerComparison: JSON.parse(performanceRecord.peerComparison || '{}'),
        marketPosition: JSON.parse(performanceRecord.marketPosition || '{}'),
        ...detailedMetrics,
      };

    } catch (error) {
      console.error('Error getting performance metrics:', error);
      throw new Error('Failed to get performance metrics');
    }
  }

  async generatePerformanceReport(memberId: string, period: 'MONTHLY' | 'QUARTERLY' | 'YEARLY'): Promise<any> {
    try {
      const metrics = await this.getPerformanceMetrics(memberId);
      const marketIntelligence = await this.getMarketIntelligence(memberId);
      const recommendations = await this.generatePerformanceRecommendations(metrics, marketIntelligence);

      return {
        period,
        generatedAt: new Date(),
        summary: {
          totalBids: metrics.totalBidsSubmitted,
          winRate: metrics.overallWinRate,
          totalValue: metrics.totalProjectValue,
          averageProfit: metrics.averageProfitMargin,
        },
        performance: metrics,
        marketIntelligence,
        recommendations,
        trends: {
          winRateTrend: this.calculateTrend(metrics.performanceTrend?.winRate || []),
          accuracyTrend: this.calculateTrend(metrics.accuracyTrend),
          profitabilityTrend: this.calculateTrend(metrics.performanceTrend?.profitability || []),
        },
        benchmarking: {
          industryComparison: this.compareToIndustry(metrics),
          peerComparison: metrics.peerComparison,
          marketPosition: metrics.marketPosition,
        },
        actionItems: this.generateActionItems(recommendations),
      };

    } catch (error) {
      console.error('Error generating performance report:', error);
      throw new Error('Failed to generate performance report');
    }
  }

  async getMarketIntelligence(memberId: string): Promise<MarketIntelligence> {
    try {
      // Get member's typical project types and locations
      const memberBids = await prisma.aIGeneratedBid.findMany({
        where: { memberId },
        select: { projectType: true, projectLocation: true, totalBidAmount: true },
        take: 50,
      });

      // Analyze competitor data
      const competitorAnalysis = await this.analyzeCompetitors(memberBids);
      
      // Analyze market trends
      const marketTrends = await this.analyzeMarketTrends(memberBids);
      
      // Generate pricing insights
      const pricingInsights = await this.generatePricingInsights(memberBids);

      return {
        competitorAnalysis,
        marketTrends,
        pricingInsights,
      };

    } catch (error) {
      console.error('Error getting market intelligence:', error);
      throw new Error('Failed to get market intelligence');
    }
  }

  async optimizeBiddingStrategy(memberId: string): Promise<any> {
    try {
      const metrics = await this.getPerformanceMetrics(memberId);
      const marketIntelligence = await this.getMarketIntelligence(memberId);

      // Analyze current strategy effectiveness
      const strategyAnalysis = this.analyzeCurrentStrategy(metrics);
      
      // Identify optimization opportunities
      const optimizationOpportunities = this.identifyOptimizationOpportunities(metrics, marketIntelligence);
      
      // Generate strategy recommendations
      const strategyRecommendations = this.generateStrategyRecommendations(
        strategyAnalysis,
        optimizationOpportunities,
        marketIntelligence
      );

      return {
        currentStrategy: strategyAnalysis,
        opportunities: optimizationOpportunities,
        recommendations: strategyRecommendations,
        expectedImpact: this.calculateExpectedImpact(strategyRecommendations, metrics),
        implementationPlan: this.createImplementationPlan(strategyRecommendations),
      };

    } catch (error) {
      console.error('Error optimizing bidding strategy:', error);
      throw new Error('Failed to optimize bidding strategy');
    }
  }

  async createBidTemplate(memberId: string, templateData: any): Promise<string> {
    try {
      const template = await prisma.bidTemplate.create({
        data: {
          name: templateData.name,
          description: templateData.description,
          projectType: templateData.projectType,
          category: templateData.category,
          templateData: JSON.stringify(templateData.structure),
          sectionOrder: JSON.stringify(templateData.sectionOrder || []),
          requiredFields: JSON.stringify(templateData.requiredFields || []),
          optionalFields: JSON.stringify(templateData.optionalFields || []),
          customizableElements: JSON.stringify(templateData.customizableElements || []),
          brandingOptions: JSON.stringify(templateData.brandingOptions || {}),
          formatOptions: JSON.stringify(templateData.formatOptions || {}),
          aiPrompts: JSON.stringify(templateData.aiPrompts || {}),
          dataSourceMappings: JSON.stringify(templateData.dataSourceMappings || {}),
          calculationFormulas: JSON.stringify(templateData.calculationFormulas || {}),
          createdBy: memberId,
        },
      });

      // Sync to HubSpot
      await this.syncTemplateToHubSpot(template.id);

      return template.id;

    } catch (error) {
      console.error('Error creating bid template:', error);
      throw new Error('Failed to create bid template');
    }
  }

  async getBidTemplates(memberId: string, projectType?: string): Promise<any[]> {
    try {
      const whereClause: any = {
        OR: [
          { createdBy: memberId },
          { isPublic: true },
        ],
        isActive: true,
      };

      if (projectType) {
        whereClause.projectType = projectType;
      }

      const templates = await prisma.bidTemplate.findMany({
        where: whereClause,
        orderBy: [
          { usageCount: 'desc' },
          { createdAt: 'desc' },
        ],
      });

      return templates;

    } catch (error) {
      console.error('Error getting bid templates:', error);
      throw new Error('Failed to get bid templates');
    }
  }

  private async updateMemberPerformanceMetrics(memberId: string): Promise<void> {
    try {
      const bids = await prisma.aIGeneratedBid.findMany({
        where: { memberId },
      });

      const submittedBids = bids.filter(bid => bid.bidStatus === 'SUBMITTED' || bid.actualOutcome);
      const wonBids = bids.filter(bid => bid.actualOutcome === 'WON');
      const lostBids = bids.filter(bid => bid.actualOutcome === 'LOST');

      const winRate = submittedBids.length > 0 ? (wonBids.length / submittedBids.length) * 100 : 0;
      const totalProjectValue = wonBids.reduce((sum, bid) => sum + (bid.actualProjectValue || bid.totalBidAmount), 0);
      const averageProjectValue = wonBids.length > 0 ? totalProjectValue / wonBids.length : 0;

      // Calculate accuracy metrics
      const accurateBids = bids.filter(bid => bid.bidAccuracy !== null);
      const averageAccuracy = accurateBids.length > 0 
        ? accurateBids.reduce((sum, bid) => sum + (bid.bidAccuracy || 0), 0) / accurateBids.length 
        : 0;

      // Calculate win rates by project type
      const winRateByProjectType = this.calculateWinRateByCategory(bids, 'projectType');
      const winRateByLocation = this.calculateWinRateByCategory(bids, 'projectLocation');

      // Update or create performance metrics
      await prisma.bidPerformanceMetrics.upsert({
        where: { memberId },
        update: {
          totalBidsGenerated: bids.length,
          totalBidsSubmitted: submittedBids.length,
          totalBidsWon: wonBids.length,
          totalBidsLost: lostBids.length,
          overallWinRate: winRate,
          winRateByProjectType: JSON.stringify(winRateByProjectType),
          winRateByLocation: JSON.stringify(winRateByLocation),
          averageBidAccuracy: averageAccuracy,
          totalProjectValue,
          averageProjectValue,
          updatedAt: new Date(),
        },
        create: {
          memberId,
          totalBidsGenerated: bids.length,
          totalBidsSubmitted: submittedBids.length,
          totalBidsWon: wonBids.length,
          totalBidsLost: lostBids.length,
          overallWinRate: winRate,
          winRateByProjectType: JSON.stringify(winRateByProjectType),
          winRateByLocation: JSON.stringify(winRateByLocation),
          averageBidAccuracy: averageAccuracy,
          totalProjectValue,
          averageProjectValue,
        },
      });

    } catch (error) {
      console.error('Error updating member performance metrics:', error);
      throw error;
    }
  }

  private async updateMachineLearningModel(outcomeData: BidOutcomeData): Promise<void> {
    try {
      // In a real implementation, this would update ML models
      // For now, we'll store the learning data for future use
      const bid = await prisma.aIGeneratedBid.findUnique({
        where: { id: outcomeData.bidId },
      });

      if (!bid) return;

      // Extract learning patterns
      const learningData = {
        projectType: bid.projectType,
        bidAmount: bid.totalBidAmount,
        outcome: outcomeData.actualOutcome,
        accuracy: outcomeData.actualCosts ? 
          await this.calculateBidAccuracy(outcomeData.bidId, outcomeData.actualCosts) : null,
        profitMargin: outcomeData.profitMargin,
        competitorInfo: outcomeData.competitorInfo,
        lessonsLearned: outcomeData.lessonsLearned,
      };

      // Store for ML model training (in a real implementation)
      console.log('Learning data for ML model:', learningData);

    } catch (error) {
      console.error('Error updating ML model:', error);
    }
  }

  private async calculateBidAccuracy(bidId: string, actualCosts: any): Promise<number> {
    try {
      const bid = await prisma.aIGeneratedBid.findUnique({
        where: { id: bidId },
      });

      if (!bid) return 0;

      const estimatedTotal = bid.materialCosts + bid.laborCosts + bid.equipmentCosts + bid.permitCosts;
      const actualTotal = actualCosts.materials + actualCosts.labor + actualCosts.equipment + 
                         actualCosts.permits + actualCosts.overhead + actualCosts.other;

      if (actualTotal === 0) return 0;

      const accuracy = Math.max(0, 100 - Math.abs((estimatedTotal - actualTotal) / actualTotal) * 100);
      return accuracy;

    } catch (error) {
      console.error('Error calculating bid accuracy:', error);
      return 0;
    }
  }

  private calculateTimelineAccuracy(bidId: string, actualTimeline: number): number {
    // In a real implementation, this would compare estimated vs actual timeline
    // For now, return a simulated accuracy
    return Math.random() * 20 + 80; // 80-100% accuracy
  }

  private async initializeMemberPerformanceMetrics(memberId: string): Promise<void> {
    await prisma.bidPerformanceMetrics.create({
      data: {
        memberId,
        totalBidsGenerated: 0,
        totalBidsSubmitted: 0,
        totalBidsWon: 0,
        totalBidsLost: 0,
        overallWinRate: 0,
        averageBidAccuracy: 0,
        totalProjectValue: 0,
        averageProjectValue: 0,
        totalProfitGenerated: 0,
        averageProfitMargin: 0,
        averageBidTime: 0,
        averageResponseTime: 0,
        timelineAccuracy: 0,
        competitivePosition: 'COMPETITIVE',
        marketShareEstimate: 0,
        pricingTrend: 'STABLE',
      },
    });
  }

  private async calculateDetailedMetrics(memberId: string, bids: any[]): Promise<Partial<PerformanceMetrics>> {
    // Calculate additional detailed metrics
    return {
      averageBidTime: this.calculateAverageBidTime(bids),
      averageResponseTime: this.calculateAverageResponseTime(bids),
      timelineAccuracy: this.calculateAverageTimelineAccuracy(bids),
      competitivePosition: this.determineCompetitivePosition(bids),
      marketShareEstimate: this.estimateMarketShare(bids),
      pricingTrend: this.analyzePricingTrend(bids),
    };
  }

  private calculateWinRateByCategory(bids: any[], category: string): Record<string, number> {
    const categoryGroups = bids.reduce((acc, bid) => {
      const key = bid[category] || 'Unknown';
      if (!acc[key]) acc[key] = { total: 0, won: 0 };
      
      if (bid.bidStatus === 'SUBMITTED' || bid.actualOutcome) {
        acc[key].total++;
        if (bid.actualOutcome === 'WON') {
          acc[key].won++;
        }
      }
      return acc;
    }, {});

    const winRates: Record<string, number> = {};
    Object.entries(categoryGroups).forEach(([key, data]: [string, any]) => {
      winRates[key] = data.total > 0 ? (data.won / data.total) * 100 : 0;
    });

    return winRates;
  }

  private calculateAverageBidTime(bids: any[]): number {
    // Simulate average bid generation time
    return 4.5; // hours
  }

  private calculateAverageResponseTime(bids: any[]): number {
    const responseBids = bids.filter(bid => bid.submittedDate && bid.responseDate);
    if (responseBids.length === 0) return 0;

    const totalDays = responseBids.reduce((sum, bid) => {
      const submitted = new Date(bid.submittedDate);
      const response = new Date(bid.responseDate);
      return sum + Math.ceil((response.getTime() - submitted.getTime()) / (1000 * 60 * 60 * 24));
    }, 0);

    return totalDays / responseBids.length;
  }

  private calculateAverageTimelineAccuracy(bids: any[]): number {
    const accurateBids = bids.filter(bid => bid.timelineAccuracy !== null);
    if (accurateBids.length === 0) return 0;
    return accurateBids.reduce((sum, bid) => sum + bid.timelineAccuracy, 0) / accurateBids.length;
  }

  private determineCompetitivePosition(bids: any[]): string {
    const winRate = this.calculateOverallWinRate(bids);
    
    if (winRate > 70) return 'LEADER';
    if (winRate > 50) return 'COMPETITIVE';
    if (winRate > 30) return 'FOLLOWER';
    return 'NICHE';
  }

  private calculateOverallWinRate(bids: any[]): number {
    const submittedBids = bids.filter(bid => bid.bidStatus === 'SUBMITTED' || bid.actualOutcome);
    const wonBids = bids.filter(bid => bid.actualOutcome === 'WON');
    return submittedBids.length > 0 ? (wonBids.length / submittedBids.length) * 100 : 0;
  }

  private estimateMarketShare(bids: any[]): number {
    // Simulate market share estimation
    return Math.random() * 10 + 2; // 2-12%
  }

  private analyzePricingTrend(bids: any[]): string {
    // Analyze pricing trend over time
    const recentBids = bids.slice(0, 10);
    const olderBids = bids.slice(10, 20);

    if (recentBids.length === 0 || olderBids.length === 0) return 'STABLE';

    const recentAvg = recentBids.reduce((sum, bid) => sum + bid.totalBidAmount, 0) / recentBids.length;
    const olderAvg = olderBids.reduce((sum, bid) => sum + bid.totalBidAmount, 0) / olderBids.length;

    const change = (recentAvg - olderAvg) / olderAvg;

    if (change > 0.05) return 'INCREASING';
    if (change < -0.05) return 'DECREASING';
    return 'STABLE';
  }

  private async analyzeCompetitors(memberBids: any[]): Promise<any[]> {
    // Simulate competitor analysis
    return [
      {
        name: 'Competitor A',
        marketShare: 15,
        averageBidAmount: 150000,
        winRate: 45,
        strengths: ['Established reputation', 'Lower pricing'],
        weaknesses: ['Slower delivery', 'Limited specialization'],
      },
      {
        name: 'Competitor B',
        marketShare: 12,
        averageBidAmount: 180000,
        winRate: 38,
        strengths: ['Quality work', 'Strong relationships'],
        weaknesses: ['Higher pricing', 'Limited capacity'],
      },
    ];
  }

  private async analyzeMarketTrends(memberBids: any[]): Promise<any> {
    return {
      demandTrend: 'INCREASING' as const,
      priceTrend: 'STABLE' as const,
      competitionLevel: 'MODERATE' as const,
      seasonalFactors: {
        spring: 'HIGH_DEMAND',
        summer: 'PEAK_SEASON',
        fall: 'MODERATE_DEMAND',
        winter: 'LOW_DEMAND',
      },
      economicIndicators: {
        constructionIndex: 105,
        materialCostIndex: 112,
        laborAvailability: 'MODERATE',
      },
    };
  }

  private async generatePricingInsights(memberBids: any[]): Promise<any> {
    const averageAmount = memberBids.reduce((sum, bid) => sum + bid.totalBidAmount, 0) / (memberBids.length || 1);

    return {
      averageMarketPrice: averageAmount * 1.05,
      priceRange: { min: averageAmount * 0.8, max: averageAmount * 1.3 },
      pricingStrategies: ['Value-based pricing', 'Competitive pricing', 'Premium positioning'],
      valueDrivers: ['Quality', 'Timeline', 'Experience', 'Innovation'],
    };
  }

  private async generatePerformanceRecommendations(metrics: PerformanceMetrics, marketIntelligence: MarketIntelligence): Promise<string[]> {
    const recommendations = [];

    if (metrics.overallWinRate < 40) {
      recommendations.push('Focus on improving bid competitiveness and pricing strategy');
    }

    if (metrics.averageBidAccuracy < 80) {
      recommendations.push('Enhance cost estimation accuracy through better data and training');
    }

    if (metrics.averageProfitMargin < 10) {
      recommendations.push('Review pricing strategy to ensure adequate profit margins');
    }

    return recommendations;
  }

  private calculateTrend(data: any[]): string {
    if (data.length < 2) return 'STABLE';
    
    const recent = data.slice(-3);
    const older = data.slice(-6, -3);
    
    if (recent.length === 0 || older.length === 0) return 'STABLE';
    
    const recentAvg = recent.reduce((sum, item) => sum + (item.value || 0), 0) / recent.length;
    const olderAvg = older.reduce((sum, item) => sum + (item.value || 0), 0) / older.length;
    
    const change = (recentAvg - olderAvg) / olderAvg;
    
    if (change > 0.1) return 'IMPROVING';
    if (change < -0.1) return 'DECLINING';
    return 'STABLE';
  }

  private compareToIndustry(metrics: PerformanceMetrics): any {
    return {
      winRate: {
        member: metrics.overallWinRate,
        industry: 45,
        position: metrics.overallWinRate > 45 ? 'ABOVE_AVERAGE' : 'BELOW_AVERAGE',
      },
      profitMargin: {
        member: metrics.averageProfitMargin,
        industry: 12,
        position: metrics.averageProfitMargin > 12 ? 'ABOVE_AVERAGE' : 'BELOW_AVERAGE',
      },
    };
  }

  private generateActionItems(recommendations: string[]): string[] {
    return recommendations.map(rec => `Action: ${rec}`);
  }

  private analyzeCurrentStrategy(metrics: PerformanceMetrics): any {
    return {
      pricingStrategy: metrics.averageProfitMargin > 15 ? 'PREMIUM' : 'COMPETITIVE',
      marketFocus: this.identifyMarketFocus(metrics),
      strengthAreas: metrics.strengthAreas,
      weaknessAreas: metrics.improvementAreas,
    };
  }

  private identifyMarketFocus(metrics: PerformanceMetrics): string {
    // Analyze win rates by project type to identify focus
    const projectTypes = Object.entries(metrics.winRateByProjectType);
    if (projectTypes.length === 0) return 'GENERAL';
    
    const bestType = projectTypes.reduce((best, current) => 
      current[1] > best[1] ? current : best
    );
    
    return bestType[0];
  }

  private identifyOptimizationOpportunities(metrics: PerformanceMetrics, marketIntelligence: MarketIntelligence): string[] {
    const opportunities = [];

    if (metrics.overallWinRate < 50 && marketIntelligence.marketTrends.demandTrend === 'INCREASING') {
      opportunities.push('Market demand is increasing - opportunity to improve win rate');
    }

    if (metrics.averageProfitMargin < 10 && marketIntelligence.pricingInsights.averageMarketPrice > 0) {
      opportunities.push('Market pricing allows for higher profit margins');
    }

    return opportunities;
  }

  private generateStrategyRecommendations(strategyAnalysis: any, opportunities: string[], marketIntelligence: MarketIntelligence): string[] {
    const recommendations = [];

    if (strategyAnalysis.pricingStrategy === 'COMPETITIVE' && opportunities.includes('Market pricing allows for higher profit margins')) {
      recommendations.push('Consider transitioning to value-based pricing strategy');
    }

    if (marketIntelligence.marketTrends.competitionLevel === 'LOW') {
      recommendations.push('Leverage low competition to increase market share');
    }

    return recommendations;
  }

  private calculateExpectedImpact(recommendations: string[], metrics: PerformanceMetrics): any {
    return {
      winRateImprovement: '5-15%',
      profitMarginImprovement: '2-5%',
      marketShareGrowth: '1-3%',
      timeToRealization: '3-6 months',
    };
  }

  private createImplementationPlan(recommendations: string[]): any {
    return {
      phase1: {
        duration: '1-2 months',
        actions: recommendations.slice(0, 2),
        resources: ['Training', 'Market research'],
      },
      phase2: {
        duration: '2-3 months',
        actions: recommendations.slice(2),
        resources: ['Process improvements', 'Technology upgrades'],
      },
    };
  }

  private async syncOutcomeToHubSpot(outcomeData: BidOutcomeData): Promise<void> {
    try {
      // Sync bid outcome to HubSpot
      await this.hubspotService.updateCustomObject('ai_generated_bids', outcomeData.bidId, {
        actual_outcome: outcomeData.actualOutcome,
        actual_project_value: outcomeData.actualProjectValue,
        profit_margin_actual: outcomeData.profitMargin,
        client_feedback: outcomeData.clientFeedback,
        lessons_learned: JSON.stringify(outcomeData.lessonsLearned || []),
      });
    } catch (error) {
      console.error('Error syncing outcome to HubSpot:', error);
    }
  }

  private async syncTemplateToHubSpot(templateId: string): Promise<void> {
    try {
      const template = await prisma.bidTemplate.findUnique({
        where: { id: templateId },
      });

      if (!template) return;

      await this.hubspotService.createCustomObject('bid_templates', {
        id: template.id,
        properties: {
          name: template.name,
          project_type: template.projectType,
          category: template.category,
          usage_count: template.usageCount,
          success_rate: template.successRate,
          is_active: template.isActive,
        },
      });
    } catch (error) {
      console.error('Error syncing template to HubSpot:', error);
    }
  }
}
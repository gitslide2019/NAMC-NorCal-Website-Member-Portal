import { PrismaClient } from '@prisma/client';
import { HubSpotBackboneService } from './hubspot-backbone.service';
import { AIBidGeneratorService } from './ai-bid-generator.service';

const prisma = new PrismaClient();

export interface BidReviewRequest {
  bidId: string;
  reviewType: 'AI_GENERATED' | 'PEER_REVIEW' | 'EXPERT_REVIEW' | 'SELF_REVIEW';
  focusAreas?: string[]; // Areas to focus the review on
  includeMarketAnalysis?: boolean;
  includeRiskAssessment?: boolean;
  includeCompetitiveAnalysis?: boolean;
}

export interface BidReviewResult {
  overallScore: number;
  competitivenessScore: number;
  accuracyScore: number;
  completenessScore: number;
  profitabilityScore: number;
  riskAssessmentScore: number;
  pricingPosition: 'BELOW_MARKET' | 'COMPETITIVE' | 'ABOVE_MARKET' | 'PREMIUM';
  marketBenchmark: number;
  pricingRecommendation: 'INCREASE' | 'DECREASE' | 'MAINTAIN' | 'RESTRUCTURE';
  strengths: string[];
  weaknesses: string[];
  missingElements: string[];
  recommendations: string[];
  strategicAdvice: string[];
  riskMitigation: string[];
  riskFactors: string[];
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  contingencyRecommendation: number;
  competitorInsights: any;
  marketTrends: any;
  pricingStrategy: any;
  coachingPoints: string[];
  learningResources: string[];
  skillGaps: string[];
}

export class AIBidReviewerService {
  private hubspotService: HubSpotBackboneService;
  private bidGeneratorService: AIBidGeneratorService;

  constructor() {
    this.hubspotService = new HubSpotBackboneService();
    this.bidGeneratorService = new AIBidGeneratorService();
  }

  async reviewBid(memberId: string, reviewRequest: BidReviewRequest): Promise<BidReviewResult> {
    try {
      // Get the bid to review
      const bid = await prisma.aIGeneratedBid.findUnique({
        where: { id: reviewRequest.bidId },
        include: { member: true },
      });

      if (!bid) {
        throw new Error('Bid not found');
      }

      if (bid.memberId !== memberId) {
        throw new Error('Unauthorized to review this bid');
      }

      // Gather additional data for review
      const reviewData = await this.gatherReviewData(bid, reviewRequest);

      // Perform AI-powered analysis
      const reviewResult = await this.performAIReview(bid, reviewData, reviewRequest);

      // Save the review
      await this.saveBidReview(memberId, reviewRequest.bidId, reviewResult, reviewRequest.reviewType);

      return reviewResult;
    } catch (error) {
      console.error('Error reviewing bid:', error);
      throw new Error('Failed to review bid');
    }
  }

  async getBidReviews(bidId: string): Promise<any[]> {
    try {
      const reviews = await prisma.bidReview.findMany({
        where: { bidId },
        orderBy: { createdAt: 'desc' },
        include: { member: true },
      });

      return reviews;
    } catch (error) {
      console.error('Error fetching bid reviews:', error);
      throw new Error('Failed to fetch bid reviews');
    }
  }

  async getReviewsByMember(memberId: string): Promise<any[]> {
    try {
      const reviews = await prisma.bidReview.findMany({
        where: { memberId },
        orderBy: { createdAt: 'desc' },
        include: { 
          bid: true,
          member: true,
        },
      });

      return reviews;
    } catch (error) {
      console.error('Error fetching member reviews:', error);
      throw new Error('Failed to fetch member reviews');
    }
  }

  async generateCompetitiveAnalysis(bidId: string): Promise<any> {
    try {
      const bid = await prisma.aIGeneratedBid.findUnique({
        where: { id: bidId },
      });

      if (!bid) {
        throw new Error('Bid not found');
      }

      // Get similar bids for comparison
      const similarBids = await this.getSimilarBids(bid);
      
      // Analyze market position
      const marketAnalysis = await this.analyzeMarketPosition(bid, similarBids);
      
      // Generate competitive insights
      const competitiveInsights = await this.generateCompetitiveInsights(bid, marketAnalysis);

      return {
        marketPosition: marketAnalysis.position,
        competitorCount: marketAnalysis.competitorCount,
        averageMarketPrice: marketAnalysis.averagePrice,
        priceRange: marketAnalysis.priceRange,
        competitiveAdvantages: competitiveInsights.advantages,
        competitiveDisadvantages: competitiveInsights.disadvantages,
        marketOpportunities: competitiveInsights.opportunities,
        marketThreats: competitiveInsights.threats,
        recommendedStrategy: competitiveInsights.strategy,
      };
    } catch (error) {
      console.error('Error generating competitive analysis:', error);
      throw new Error('Failed to generate competitive analysis');
    }
  }

  async generateRiskAssessment(bidId: string): Promise<any> {
    try {
      const bid = await prisma.aIGeneratedBid.findUnique({
        where: { id: bidId },
      });

      if (!bid) {
        throw new Error('Bid not found');
      }

      // Analyze various risk factors
      const riskFactors = await this.analyzeRiskFactors(bid);
      
      // Calculate overall risk score
      const overallRiskScore = this.calculateOverallRiskScore(riskFactors);
      
      // Generate mitigation strategies
      const mitigationStrategies = await this.generateMitigationStrategies(riskFactors);

      return {
        overallRiskScore,
        riskLevel: this.determineRiskLevel(overallRiskScore),
        riskFactors: riskFactors.map(factor => ({
          category: factor.category,
          description: factor.description,
          impact: factor.impact,
          probability: factor.probability,
          riskScore: factor.riskScore,
          mitigation: factor.mitigation,
        })),
        mitigationStrategies,
        contingencyRecommendation: this.calculateContingencyRecommendation(overallRiskScore),
        monitoringPoints: this.identifyMonitoringPoints(riskFactors),
      };
    } catch (error) {
      console.error('Error generating risk assessment:', error);
      throw new Error('Failed to generate risk assessment');
    }
  }

  async generateBidCoaching(memberId: string, bidId: string): Promise<any> {
    try {
      const [bid, memberProfile, performanceMetrics] = await Promise.all([
        prisma.aIGeneratedBid.findUnique({ where: { id: bidId } }),
        prisma.user.findUnique({ where: { id: memberId } }),
        prisma.bidPerformanceMetrics.findUnique({ where: { memberId } }),
      ]);

      if (!bid) {
        throw new Error('Bid not found');
      }

      // Analyze member's bidding patterns
      const biddingPatterns = await this.analyzeBiddingPatterns(memberId);
      
      // Identify skill gaps
      const skillGaps = await this.identifySkillGaps(bid, biddingPatterns, performanceMetrics);
      
      // Generate coaching recommendations
      const coachingPoints = await this.generateCoachingPoints(bid, skillGaps, biddingPatterns);
      
      // Recommend learning resources
      const learningResources = await this.recommendLearningResources(skillGaps);

      return {
        coachingPoints,
        skillGaps,
        learningResources,
        improvementAreas: this.identifyImprovementAreas(biddingPatterns, performanceMetrics),
        strengthAreas: this.identifyStrengthAreas(biddingPatterns, performanceMetrics),
        nextSteps: this.generateNextSteps(coachingPoints, skillGaps),
        practiceExercises: this.generatePracticeExercises(skillGaps),
      };
    } catch (error) {
      console.error('Error generating bid coaching:', error);
      throw new Error('Failed to generate bid coaching');
    }
  }

  private async gatherReviewData(bid: any, reviewRequest: BidReviewRequest): Promise<any> {
    const data: any = {
      bid,
      projectType: bid.projectType,
      location: bid.projectLocation,
      bidAmount: bid.totalBidAmount,
    };

    if (reviewRequest.includeMarketAnalysis) {
      data.marketData = await this.gatherMarketData(bid);
    }

    if (reviewRequest.includeCompetitiveAnalysis) {
      data.competitiveData = await this.gatherCompetitiveData(bid);
    }

    if (reviewRequest.includeRiskAssessment) {
      data.riskData = await this.gatherRiskData(bid);
    }

    return data;
  }

  private async performAIReview(bid: any, reviewData: any, reviewRequest: BidReviewRequest): Promise<BidReviewResult> {
    // Simulate AI-powered bid review
    const scores = this.calculateReviewScores(bid, reviewData);
    const analysis = await this.generateReviewAnalysis(bid, reviewData, reviewRequest);

    return {
      overallScore: scores.overall,
      competitivenessScore: scores.competitiveness,
      accuracyScore: scores.accuracy,
      completenessScore: scores.completeness,
      profitabilityScore: scores.profitability,
      riskAssessmentScore: scores.riskAssessment,
      pricingPosition: analysis.pricingPosition,
      marketBenchmark: analysis.marketBenchmark,
      pricingRecommendation: analysis.pricingRecommendation,
      strengths: analysis.strengths,
      weaknesses: analysis.weaknesses,
      missingElements: analysis.missingElements,
      recommendations: analysis.recommendations,
      strategicAdvice: analysis.strategicAdvice,
      riskMitigation: analysis.riskMitigation,
      riskFactors: analysis.riskFactors,
      riskLevel: analysis.riskLevel,
      contingencyRecommendation: analysis.contingencyRecommendation,
      competitorInsights: analysis.competitorInsights,
      marketTrends: analysis.marketTrends,
      pricingStrategy: analysis.pricingStrategy,
      coachingPoints: analysis.coachingPoints,
      learningResources: analysis.learningResources,
      skillGaps: analysis.skillGaps,
    };
  }

  private async saveBidReview(
    memberId: string,
    bidId: string,
    reviewResult: BidReviewResult,
    reviewType: string
  ): Promise<void> {
    try {
      const review = await prisma.bidReview.create({
        data: {
          bidId,
          memberId,
          reviewType,
          overallScore: reviewResult.overallScore,
          competitivenessScore: reviewResult.competitivenessScore,
          accuracyScore: reviewResult.accuracyScore,
          completenessScore: reviewResult.completenessScore,
          profitabilityScore: reviewResult.profitabilityScore,
          riskAssessmentScore: reviewResult.riskAssessmentScore,
          pricingPosition: reviewResult.pricingPosition,
          marketBenchmark: reviewResult.marketBenchmark,
          pricingRecommendation: reviewResult.pricingRecommendation,
          strengths: JSON.stringify(reviewResult.strengths),
          weaknesses: JSON.stringify(reviewResult.weaknesses),
          missingElements: JSON.stringify(reviewResult.missingElements),
          recommendations: JSON.stringify(reviewResult.recommendations),
          strategicAdvice: JSON.stringify(reviewResult.strategicAdvice),
          riskMitigation: JSON.stringify(reviewResult.riskMitigation),
          riskFactors: JSON.stringify(reviewResult.riskFactors),
          riskLevel: reviewResult.riskLevel,
          contingencyRecommendation: reviewResult.contingencyRecommendation,
          competitorInsights: JSON.stringify(reviewResult.competitorInsights),
          marketTrends: JSON.stringify(reviewResult.marketTrends),
          pricingStrategy: JSON.stringify(reviewResult.pricingStrategy),
          coachingPoints: JSON.stringify(reviewResult.coachingPoints),
          learningResources: JSON.stringify(reviewResult.learningResources),
          skillGaps: JSON.stringify(reviewResult.skillGaps),
        },
      });

      // Sync to HubSpot
      await this.syncReviewToHubSpot(review.id);
    } catch (error) {
      console.error('Error saving bid review:', error);
      throw error;
    }
  }

  private calculateReviewScores(bid: any, reviewData: any): any {
    return {
      overall: Math.floor(Math.random() * 30) + 70, // 70-100
      competitiveness: Math.floor(Math.random() * 40) + 60, // 60-100
      accuracy: Math.floor(Math.random() * 25) + 75, // 75-100
      completeness: Math.floor(Math.random() * 20) + 80, // 80-100
      profitability: Math.floor(Math.random() * 35) + 65, // 65-100
      riskAssessment: Math.floor(Math.random() * 30) + 70, // 70-100
    };
  }

  private async generateReviewAnalysis(bid: any, reviewData: any, reviewRequest: BidReviewRequest): Promise<any> {
    return {
      pricingPosition: 'COMPETITIVE' as const,
      marketBenchmark: bid.totalBidAmount * 1.05,
      pricingRecommendation: 'MAINTAIN' as const,
      strengths: [
        'Comprehensive scope coverage',
        'Competitive pricing',
        'Detailed cost breakdown',
        'Risk factors identified',
      ],
      weaknesses: [
        'Limited contingency buffer',
        'Aggressive timeline assumptions',
        'Material cost volatility not fully addressed',
      ],
      missingElements: [
        'Detailed subcontractor analysis',
        'Weather contingency planning',
        'Change order procedures',
      ],
      recommendations: [
        'Increase contingency to 8-10%',
        'Develop stronger supplier relationships',
        'Consider value engineering options',
        'Build in weather delays',
      ],
      strategicAdvice: [
        'Focus on building long-term client relationships',
        'Develop expertise in sustainable construction',
        'Consider strategic partnerships for large projects',
      ],
      riskMitigation: [
        'Establish material price locks',
        'Develop backup supplier network',
        'Create detailed project timeline with buffers',
        'Implement regular progress monitoring',
      ],
      riskFactors: [
        'Material price volatility',
        'Weather-related delays',
        'Permit approval timeline',
        'Subcontractor availability',
      ],
      riskLevel: 'MEDIUM' as const,
      contingencyRecommendation: 8.5,
      competitorInsights: {
        averageCompetitorBid: bid.totalBidAmount * 1.1,
        competitorStrengths: ['Established relationships', 'Lower overhead'],
        competitorWeaknesses: ['Higher pricing', 'Slower response times'],
      },
      marketTrends: {
        demandTrend: 'INCREASING',
        priceTrend: 'STABLE',
        competitionLevel: 'MODERATE',
      },
      pricingStrategy: {
        recommendedApproach: 'VALUE_BASED',
        keyDifferentiators: ['Quality', 'Timeline', 'Experience'],
        pricingFlexibility: 'MODERATE',
      },
      coachingPoints: [
        'Strengthen cost estimation skills',
        'Improve risk assessment capabilities',
        'Develop better client communication',
      ],
      learningResources: [
        'Advanced Cost Estimation Course',
        'Risk Management in Construction',
        'Competitive Bidding Strategies',
      ],
      skillGaps: [
        'Advanced scheduling techniques',
        'Value engineering methods',
        'Contract negotiation skills',
      ],
    };
  }

  private async gatherMarketData(bid: any): Promise<any> {
    // Simulate market data gathering
    return {
      averagePrice: bid.totalBidAmount * 1.05,
      priceRange: { min: bid.totalBidAmount * 0.85, max: bid.totalBidAmount * 1.25 },
      marketConditions: 'STABLE',
      demandLevel: 'MODERATE',
    };
  }

  private async gatherCompetitiveData(bid: any): Promise<any> {
    // Simulate competitive data gathering
    return {
      competitorCount: 5,
      averageCompetitorBid: bid.totalBidAmount * 1.08,
      competitorStrengths: ['Experience', 'Relationships'],
      competitorWeaknesses: ['Higher costs', 'Slower delivery'],
    };
  }

  private async gatherRiskData(bid: any): Promise<any> {
    // Simulate risk data gathering
    return {
      weatherRisk: 'MODERATE',
      materialRisk: 'HIGH',
      laborRisk: 'LOW',
      permitRisk: 'MODERATE',
    };
  }

  private async getSimilarBids(bid: any): Promise<any[]> {
    return await prisma.aIGeneratedBid.findMany({
      where: {
        projectType: bid.projectType,
        projectLocation: bid.projectLocation,
        id: { not: bid.id },
      },
      take: 10,
      orderBy: { createdAt: 'desc' },
    });
  }

  private async analyzeMarketPosition(bid: any, similarBids: any[]): Promise<any> {
    const averagePrice = similarBids.length > 0 
      ? similarBids.reduce((sum, b) => sum + b.totalBidAmount, 0) / similarBids.length
      : bid.totalBidAmount;

    return {
      position: bid.totalBidAmount < averagePrice ? 'COMPETITIVE' : 'ABOVE_MARKET',
      competitorCount: similarBids.length,
      averagePrice,
      priceRange: {
        min: Math.min(...similarBids.map(b => b.totalBidAmount)),
        max: Math.max(...similarBids.map(b => b.totalBidAmount)),
      },
    };
  }

  private async generateCompetitiveInsights(bid: any, marketAnalysis: any): Promise<any> {
    return {
      advantages: ['Competitive pricing', 'Strong technical approach'],
      disadvantages: ['Limited track record in area', 'Higher overhead'],
      opportunities: ['Growing market demand', 'Potential for follow-up work'],
      threats: ['Established competitors', 'Price competition'],
      strategy: 'Focus on value proposition and quality differentiation',
    };
  }

  private async analyzeRiskFactors(bid: any): Promise<any[]> {
    return [
      {
        category: 'FINANCIAL',
        description: 'Material cost volatility',
        impact: 'HIGH',
        probability: 'MEDIUM',
        riskScore: 75,
        mitigation: 'Establish price locks with suppliers',
      },
      {
        category: 'SCHEDULE',
        description: 'Weather delays',
        impact: 'MEDIUM',
        probability: 'HIGH',
        riskScore: 60,
        mitigation: 'Build weather contingency into schedule',
      },
      {
        category: 'REGULATORY',
        description: 'Permit approval delays',
        impact: 'MEDIUM',
        probability: 'MEDIUM',
        riskScore: 50,
        mitigation: 'Submit permits early and maintain regular follow-up',
      },
    ];
  }

  private calculateOverallRiskScore(riskFactors: any[]): number {
    if (riskFactors.length === 0) return 0;
    return riskFactors.reduce((sum, factor) => sum + factor.riskScore, 0) / riskFactors.length;
  }

  private async generateMitigationStrategies(riskFactors: any[]): Promise<string[]> {
    return riskFactors.map(factor => factor.mitigation);
  }

  private determineRiskLevel(riskScore: number): string {
    if (riskScore < 25) return 'LOW';
    if (riskScore < 50) return 'MEDIUM';
    if (riskScore < 75) return 'HIGH';
    return 'CRITICAL';
  }

  private calculateContingencyRecommendation(riskScore: number): number {
    if (riskScore < 25) return 5;
    if (riskScore < 50) return 7.5;
    if (riskScore < 75) return 10;
    return 15;
  }

  private identifyMonitoringPoints(riskFactors: any[]): string[] {
    return [
      'Weekly material price reviews',
      'Daily weather monitoring',
      'Bi-weekly permit status checks',
      'Monthly subcontractor performance reviews',
    ];
  }

  private async analyzeBiddingPatterns(memberId: string): Promise<any> {
    const recentBids = await prisma.aIGeneratedBid.findMany({
      where: { memberId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return {
      averageBidAmount: recentBids.reduce((sum, bid) => sum + bid.totalBidAmount, 0) / (recentBids.length || 1),
      preferredProjectTypes: this.extractPreferredProjectTypes(recentBids),
      averageWinRate: this.calculateWinRate(recentBids),
      commonWeaknesses: this.identifyCommonWeaknesses(recentBids),
      improvementTrends: this.analyzeImprovementTrends(recentBids),
    };
  }

  private async identifySkillGaps(bid: any, biddingPatterns: any, performanceMetrics: any): Promise<string[]> {
    const skillGaps = [];

    if (performanceMetrics?.overallWinRate < 50) {
      skillGaps.push('Competitive pricing strategies');
    }

    if (bid.riskScore > 70) {
      skillGaps.push('Risk assessment and mitigation');
    }

    if (biddingPatterns.averageWinRate < 40) {
      skillGaps.push('Bid presentation and communication');
    }

    return skillGaps;
  }

  private async generateCoachingPoints(bid: any, skillGaps: string[], biddingPatterns: any): Promise<string[]> {
    const coachingPoints = [];

    if (skillGaps.includes('Competitive pricing strategies')) {
      coachingPoints.push('Focus on understanding market rates and competitor positioning');
    }

    if (skillGaps.includes('Risk assessment and mitigation')) {
      coachingPoints.push('Develop systematic approach to identifying and quantifying project risks');
    }

    if (bid.profitMargin < 10) {
      coachingPoints.push('Consider increasing profit margins to ensure business sustainability');
    }

    return coachingPoints;
  }

  private async recommendLearningResources(skillGaps: string[]): Promise<string[]> {
    const resources = [];

    if (skillGaps.includes('Competitive pricing strategies')) {
      resources.push('Advanced Pricing Strategies for Contractors');
    }

    if (skillGaps.includes('Risk assessment and mitigation')) {
      resources.push('Construction Risk Management Certification');
    }

    if (skillGaps.includes('Bid presentation and communication')) {
      resources.push('Effective Business Communication for Contractors');
    }

    return resources;
  }

  private identifyImprovementAreas(biddingPatterns: any, performanceMetrics: any): string[] {
    const areas = [];

    if (performanceMetrics?.overallWinRate < 50) {
      areas.push('Win rate optimization');
    }

    if (performanceMetrics?.averageProfitMargin < 10) {
      areas.push('Profit margin improvement');
    }

    return areas;
  }

  private identifyStrengthAreas(biddingPatterns: any, performanceMetrics: any): string[] {
    const areas = [];

    if (performanceMetrics?.overallWinRate > 70) {
      areas.push('Competitive bidding');
    }

    if (performanceMetrics?.averageProfitMargin > 15) {
      areas.push('Profitable project selection');
    }

    return areas;
  }

  private generateNextSteps(coachingPoints: string[], skillGaps: string[]): string[] {
    return [
      'Complete recommended training courses',
      'Practice bid analysis on sample projects',
      'Seek mentorship from experienced contractors',
      'Join industry associations for networking',
    ];
  }

  private generatePracticeExercises(skillGaps: string[]): string[] {
    return [
      'Analyze 5 competitor bids for pricing patterns',
      'Create risk assessment matrix for typical projects',
      'Practice presenting bids to mock clients',
      'Develop standard bid templates',
    ];
  }

  private extractPreferredProjectTypes(bids: any[]): string[] {
    const typeCounts = bids.reduce((acc, bid) => {
      acc[bid.projectType] = (acc[bid.projectType] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(typeCounts)
      .sort(([, a], [, b]) => (b as number) - (a as number))
      .slice(0, 3)
      .map(([type]) => type);
  }

  private calculateWinRate(bids: any[]): number {
    if (bids.length === 0) return 0;
    const wonBids = bids.filter(bid => bid.actualOutcome === 'WON').length;
    return (wonBids / bids.length) * 100;
  }

  private identifyCommonWeaknesses(bids: any[]): string[] {
    // Analyze common patterns in lost bids
    return ['Pricing too high', 'Incomplete scope', 'Poor presentation'];
  }

  private analyzeImprovementTrends(bids: any[]): any {
    // Analyze trends over time
    return {
      winRateTrend: 'IMPROVING',
      accuracyTrend: 'STABLE',
      profitabilityTrend: 'IMPROVING',
    };
  }

  private async syncReviewToHubSpot(reviewId: string): Promise<void> {
    try {
      const review = await prisma.bidReview.findUnique({
        where: { id: reviewId },
        include: { member: true, bid: true },
      });

      if (!review) return;

      await this.hubspotService.createOrUpdateCustomObject('bid_reviews', {
        id: review.id,
        properties: {
          review_type: review.reviewType,
          overall_score: review.overallScore,
          competitiveness_score: review.competitivenessScore,
          pricing_position: review.pricingPosition,
          risk_level: review.riskLevel,
          recommendations: review.recommendations,
        },
        associations: [
          {
            to: { id: review.member.hubspotContactId },
            types: [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 1 }],
          },
        ],
      });
    } catch (error) {
      console.error('Error syncing review to HubSpot:', error);
    }
  }
}
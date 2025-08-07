/**
 * Cross-Feature Integration Service
 * Handles data sharing and recommendations between different platform features
 */

import { HubSpotBackboneService } from './hubspot-backbone.service';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface MemberEngagementScore {
  memberId: string;
  overallScore: number;
  featureScores: {
    toolLending: number;
    onboarding: number;
    growthPlan: number;
    costEstimation: number;
    shop: number;
    community: number;
    learning: number;
  };
  lastActivity: Date;
  recommendations: string[];
}

export interface CrossFeatureRecommendation {
  type: 'tool' | 'course' | 'project' | 'product' | 'mentor' | 'committee';
  title: string;
  description: string;
  reason: string;
  priority: 'high' | 'medium' | 'low';
  featureSource: string;
  actionUrl: string;
  metadata?: any;
}

export interface MemberJourneyEvent {
  memberId: string;
  feature: string;
  action: string;
  timestamp: Date;
  metadata?: any;
}

export class CrossFeatureIntegrationService {
  
  /**
   * Get member profile data
   */
  async getMemberProfile(memberId: string): Promise<any> {
    try {
      // In a real implementation, this would fetch from HubSpot
      return {
        completionPercentage: 85,
        missingFields: ['Business License Upload', 'Insurance Certificate'],
        memberSince: '2024-01-15',
        memberType: 'Professional',
        projectTypes: ['residential', 'commercial'],
        skills: ['construction', 'project-management'],
        interests: ['sustainability', 'technology']
      };
    } catch (error) {
      console.error('Error getting member profile:', error);
      return {};
    }
  }

  /**
   * Generate cross-feature recommendations for a member
   */
  async generateRecommendations(memberId: string): Promise<CrossFeatureRecommendation[]> {
    try {
      const recommendations: CrossFeatureRecommendation[] = [];
      
      // Get member profile and activity data
      const memberProfile = await this.getMemberProfile(memberId);
      const memberActivity = await this.getMemberActivity(memberId);
      const engagementScore = await this.calculateEngagementScore(memberId);
      
      // Tool lending recommendations based on project activity
      const toolRecommendations = await this.generateToolRecommendations(memberId, memberActivity);
      recommendations.push(...toolRecommendations);
      
      // Learning recommendations based on project types and skill gaps
      const learningRecommendations = await this.generateLearningRecommendations(memberId, memberProfile);
      recommendations.push(...learningRecommendations);
      
      // Product recommendations based on recent activities
      const productRecommendations = await this.generateProductRecommendations(memberId, memberActivity);
      recommendations.push(...productRecommendations);
      
      // Project recommendations based on skills and location
      const projectRecommendations = await this.generateProjectRecommendations(memberId, memberProfile);
      recommendations.push(...projectRecommendations);
      
      // Community recommendations based on interests and activity
      const communityRecommendations = await this.generateCommunityRecommendations(memberId, memberProfile);
      recommendations.push(...communityRecommendations);
      
      // Sort by priority and relevance
      return recommendations.sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      });
      
    } catch (error) {
      console.error('Error generating cross-feature recommendations:', error);
      return [];
    }
  }
  
  /**
   * Calculate member engagement score across all features
   */
  async calculateEngagementScore(memberId: string): Promise<MemberEngagementScore> {
    try {
      const activity = await this.getMemberActivity(memberId);
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      
      // Calculate feature-specific scores
      const featureScores = {
        toolLending: this.calculateToolLendingScore(activity, thirtyDaysAgo),
        onboarding: this.calculateOnboardingScore(activity),
        growthPlan: this.calculateGrowthPlanScore(activity, thirtyDaysAgo),
        costEstimation: this.calculateCostEstimationScore(activity, thirtyDaysAgo),
        shop: this.calculateShopScore(activity, thirtyDaysAgo),
        community: this.calculateCommunityScore(activity, thirtyDaysAgo),
        learning: this.calculateLearningScore(activity, thirtyDaysAgo)
      };
      
      // Calculate overall score (weighted average)
      const weights = {
        toolLending: 0.15,
        onboarding: 0.10,
        growthPlan: 0.20,
        costEstimation: 0.20,
        shop: 0.10,
        community: 0.15,
        learning: 0.10
      };
      
      const overallScore = Object.entries(featureScores).reduce((sum, [feature, score]) => {
        return sum + (score * weights[feature as keyof typeof weights]);
      }, 0);
      
      // Generate recommendations based on low-scoring areas
      const recommendations = this.generateEngagementRecommendations(featureScores);
      
      return {
        memberId,
        overallScore: Math.round(overallScore),
        featureScores,
        lastActivity: activity.length > 0 ? new Date(Math.max(...activity.map(a => a.timestamp.getTime()))) : new Date(),
        recommendations
      };
      
    } catch (error) {
      console.error('Error calculating engagement score:', error);
      return {
        memberId,
        overallScore: 0,
        featureScores: {
          toolLending: 0,
          onboarding: 0,
          growthPlan: 0,
          costEstimation: 0,
          shop: 0,
          community: 0,
          learning: 0
        },
        lastActivity: new Date(),
        recommendations: []
      };
    }
  }
  
  /**
   * Track member journey events across features
   */
  async trackMemberJourney(event: MemberJourneyEvent): Promise<void> {
    try {
      // Store in local database
      await prisma.memberJourneyEvent.create({
        data: {
          memberId: event.memberId,
          feature: event.feature,
          action: event.action,
          timestamp: event.timestamp,
          metadata: event.metadata ? JSON.stringify(event.metadata) : null
        }
      });
      
      // Update member activity tracking
      // In a real implementation, this would update HubSpot contact properties
      console.log(`Member activity tracked: ${event.memberId} - ${event.feature} - ${event.action}`);
      
      // Trigger real-time recommendations update
      await this.updateRealtimeRecommendations(event.memberId);
      
    } catch (error) {
      console.error('Error tracking member journey:', error);
    }
  }
  
  /**
   * Get unified analytics across all features
   */
  async getUnifiedAnalytics(memberId: string, timeRange: 'week' | 'month' | 'quarter' = 'month') {
    try {
      const endDate = new Date();
      const startDate = new Date();
      
      switch (timeRange) {
        case 'week':
          startDate.setDate(endDate.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(endDate.getMonth() - 1);
          break;
        case 'quarter':
          startDate.setMonth(endDate.getMonth() - 3);
          break;
      }
      
      const activity = await this.getMemberActivity(memberId, startDate, endDate);
      
      // Aggregate data by feature
      const featureActivity = activity.reduce((acc, event) => {
        if (!acc[event.feature]) {
          acc[event.feature] = [];
        }
        acc[event.feature].push(event);
        return acc;
      }, {} as Record<string, MemberJourneyEvent[]>);
      
      // Calculate metrics for each feature
      const analytics = {
        totalEvents: activity.length,
        activeFeatures: Object.keys(featureActivity).length,
        mostUsedFeature: this.getMostUsedFeature(featureActivity),
        engagementTrend: this.calculateEngagementTrend(activity, timeRange),
        featureBreakdown: Object.entries(featureActivity).map(([feature, events]) => ({
          feature,
          eventCount: events.length,
          lastUsed: new Date(Math.max(...events.map(e => e.timestamp.getTime()))),
          actions: this.getUniqueActions(events)
        })),
        recommendations: await this.generateRecommendations(memberId)
      };
      
      return analytics;
      
    } catch (error) {
      console.error('Error getting unified analytics:', error);
      return null;
    }
  }
  
  /**
   * Share data between features for enhanced functionality
   */
  async shareFeatureData(fromFeature: string, toFeature: string, memberId: string, dataType: string, data: any) {
    try {
      // Store shared data
      await prisma.featureDataShare.create({
        data: {
          fromFeature,
          toFeature,
          memberId,
          dataType,
          data: JSON.stringify(data),
          timestamp: new Date()
        }
      });
      
      // Trigger feature-specific handlers
      await this.handleFeatureDataShare(fromFeature, toFeature, memberId, dataType, data);
      
    } catch (error) {
      console.error('Error sharing feature data:', error);
    }
  }
  
  // Private helper methods
  
  private async getMemberActivity(memberId: string, startDate?: Date, endDate?: Date): Promise<MemberJourneyEvent[]> {
    const whereClause: any = { memberId };
    
    if (startDate || endDate) {
      whereClause.timestamp = {};
      if (startDate) whereClause.timestamp.gte = startDate;
      if (endDate) whereClause.timestamp.lte = endDate;
    }
    
    const events = await prisma.memberJourneyEvent.findMany({
      where: whereClause,
      orderBy: { timestamp: 'desc' }
    });
    
    return events.map(event => ({
      memberId: event.memberId,
      feature: event.feature,
      action: event.action,
      timestamp: event.timestamp,
      metadata: event.metadata ? JSON.parse(event.metadata) : undefined
    }));
  }
  
  private calculateToolLendingScore(activity: MemberJourneyEvent[], since: Date): number {
    const toolEvents = activity.filter(e => e.feature === 'tool-lending' && e.timestamp >= since);
    const reservations = toolEvents.filter(e => e.action === 'reserve').length;
    const returns = toolEvents.filter(e => e.action === 'return').length;
    const browses = toolEvents.filter(e => e.action === 'browse').length;
    
    // Score based on actual usage vs browsing
    return Math.min(100, (reservations * 30) + (returns * 20) + (browses * 2));
  }
  
  private calculateOnboardingScore(activity: MemberJourneyEvent[]): number {
    const onboardingEvents = activity.filter(e => e.feature === 'onboarding');
    const completedSteps = onboardingEvents.filter(e => e.action === 'complete-step').length;
    const totalSteps = 6; // Based on onboarding flow
    
    return Math.round((completedSteps / totalSteps) * 100);
  }
  
  private calculateGrowthPlanScore(activity: MemberJourneyEvent[], since: Date): number {
    const growthEvents = activity.filter(e => e.feature === 'growth-plan' && e.timestamp >= since);
    const planCreated = growthEvents.some(e => e.action === 'create-plan');
    const milestonesCompleted = growthEvents.filter(e => e.action === 'complete-milestone').length;
    const planViews = growthEvents.filter(e => e.action === 'view-plan').length;
    
    let score = 0;
    if (planCreated) score += 40;
    score += milestonesCompleted * 15;
    score += Math.min(20, planViews * 2);
    
    return Math.min(100, score);
  }
  
  private calculateCostEstimationScore(activity: MemberJourneyEvent[], since: Date): number {
    const costEvents = activity.filter(e => e.feature === 'cost-estimation' && e.timestamp >= since);
    const estimates = costEvents.filter(e => e.action === 'create-estimate').length;
    const cameraUse = costEvents.filter(e => e.action === 'camera-estimate').length;
    const exports = costEvents.filter(e => e.action === 'export-estimate').length;
    
    return Math.min(100, (estimates * 20) + (cameraUse * 15) + (exports * 10));
  }
  
  private calculateShopScore(activity: MemberJourneyEvent[], since: Date): number {
    const shopEvents = activity.filter(e => e.feature === 'shop' && e.timestamp >= since);
    const purchases = shopEvents.filter(e => e.action === 'purchase').length;
    const cartAdds = shopEvents.filter(e => e.action === 'add-to-cart').length;
    const browses = shopEvents.filter(e => e.action === 'browse').length;
    
    return Math.min(100, (purchases * 40) + (cartAdds * 10) + (browses * 2));
  }
  
  private calculateCommunityScore(activity: MemberJourneyEvent[], since: Date): number {
    const communityEvents = activity.filter(e => e.feature === 'community' && e.timestamp >= since);
    const posts = communityEvents.filter(e => e.action === 'create-post').length;
    const comments = communityEvents.filter(e => e.action === 'comment').length;
    const votes = communityEvents.filter(e => e.action === 'vote').length;
    
    return Math.min(100, (posts * 25) + (comments * 10) + (votes * 5));
  }
  
  private calculateLearningScore(activity: MemberJourneyEvent[], since: Date): number {
    const learningEvents = activity.filter(e => e.feature === 'learning' && e.timestamp >= since);
    const completions = learningEvents.filter(e => e.action === 'complete-course').length;
    const enrollments = learningEvents.filter(e => e.action === 'enroll').length;
    const progress = learningEvents.filter(e => e.action === 'progress').length;
    
    return Math.min(100, (completions * 30) + (enrollments * 15) + (progress * 2));
  }
  
  private generateEngagementRecommendations(scores: any): string[] {
    const recommendations: string[] = [];
    
    if (scores.toolLending < 30) {
      recommendations.push('Explore our tool lending library to access professional equipment');
    }
    if (scores.growthPlan < 50) {
      recommendations.push('Create a business growth plan to accelerate your success');
    }
    if (scores.costEstimation < 40) {
      recommendations.push('Try our AI-powered cost estimation tools for better project bidding');
    }
    if (scores.community < 30) {
      recommendations.push('Join community discussions to network with other contractors');
    }
    if (scores.learning < 40) {
      recommendations.push('Enroll in courses to earn badges and unlock new opportunities');
    }
    
    return recommendations;
  }
  
  private async generateToolRecommendations(memberId: string, activity: MemberJourneyEvent[]): Promise<CrossFeatureRecommendation[]> {
    const recommendations: CrossFeatureRecommendation[] = [];
    
    // Check if member has recent cost estimates
    const recentEstimates = activity.filter(e => 
      e.feature === 'cost-estimation' && 
      e.timestamp > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    );
    
    if (recentEstimates.length > 0) {
      recommendations.push({
        type: 'tool',
        title: 'Tools for Your Recent Estimates',
        description: 'Based on your recent cost estimates, these tools might be helpful for your projects',
        reason: 'Recent cost estimation activity',
        priority: 'high',
        featureSource: 'cost-estimation',
        actionUrl: '/member/tools'
      });
    }
    
    return recommendations;
  }
  
  private async generateLearningRecommendations(memberId: string, memberProfile: any): Promise<CrossFeatureRecommendation[]> {
    const recommendations: CrossFeatureRecommendation[] = [];
    
    // Recommend courses based on member's project types or interests
    if (memberProfile.projectTypes?.includes('residential')) {
      recommendations.push({
        type: 'course',
        title: 'Residential Construction Certification',
        description: 'Advance your residential construction skills with PG&E sponsored courses',
        reason: 'Based on your residential project experience',
        priority: 'medium',
        featureSource: 'profile-analysis',
        actionUrl: '/member/learning?category=residential'
      });
    }
    
    return recommendations;
  }
  
  private async generateProductRecommendations(memberId: string, activity: MemberJourneyEvent[]): Promise<CrossFeatureRecommendation[]> {
    const recommendations: CrossFeatureRecommendation[] = [];
    
    // Check for recent badge achievements
    const recentBadges = activity.filter(e => 
      e.feature === 'learning' && 
      e.action === 'earn-badge' &&
      e.timestamp > new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
    );
    
    if (recentBadges.length > 0) {
      recommendations.push({
        type: 'product',
        title: 'Badge-Related Products Available',
        description: 'Special products and tools related to your recent badge achievements',
        reason: 'Recent badge achievement',
        priority: 'medium',
        featureSource: 'learning',
        actionUrl: '/member/shop?filter=badge-related'
      });
    }
    
    return recommendations;
  }
  
  private async generateProjectRecommendations(memberId: string, memberProfile: any): Promise<CrossFeatureRecommendation[]> {
    const recommendations: CrossFeatureRecommendation[] = [];
    
    // Recommend projects based on skills and location
    if (memberProfile.skills?.length > 0) {
      recommendations.push({
        type: 'project',
        title: 'Projects Matching Your Skills',
        description: 'New project opportunities that match your expertise',
        reason: 'Skills and location match',
        priority: 'high',
        featureSource: 'profile-analysis',
        actionUrl: '/member/projects/opportunities'
      });
    }
    
    return recommendations;
  }
  
  private async generateCommunityRecommendations(memberId: string, memberProfile: any): Promise<CrossFeatureRecommendation[]> {
    const recommendations: CrossFeatureRecommendation[] = [];
    
    // Recommend committees based on interests
    if (memberProfile.interests?.includes('sustainability')) {
      recommendations.push({
        type: 'committee',
        title: 'Green Building Committee',
        description: 'Join the sustainability-focused committee to share knowledge and collaborate',
        reason: 'Interest in sustainability',
        priority: 'medium',
        featureSource: 'profile-analysis',
        actionUrl: '/member/community/committees/green-building'
      });
    }
    
    return recommendations;
  }
  
  private getMostUsedFeature(featureActivity: Record<string, MemberJourneyEvent[]>): string {
    return Object.entries(featureActivity)
      .sort(([,a], [,b]) => b.length - a.length)[0]?.[0] || 'none';
  }
  
  private calculateEngagementTrend(activity: MemberJourneyEvent[], timeRange: string): 'increasing' | 'stable' | 'decreasing' {
    if (activity.length < 4) return 'stable';
    
    const midpoint = Math.floor(activity.length / 2);
    const firstHalf = activity.slice(0, midpoint);
    const secondHalf = activity.slice(midpoint);
    
    const firstHalfAvg = firstHalf.length;
    const secondHalfAvg = secondHalf.length;
    
    if (secondHalfAvg > firstHalfAvg * 1.2) return 'increasing';
    if (secondHalfAvg < firstHalfAvg * 0.8) return 'decreasing';
    return 'stable';
  }
  
  private getUniqueActions(events: MemberJourneyEvent[]): string[] {
    return [...new Set(events.map(e => e.action))];
  }
  
  private async updateRealtimeRecommendations(memberId: string): Promise<void> {
    // Generate fresh recommendations
    const recommendations = await this.generateRecommendations(memberId);
    
    // Store in cache for quick access
    await prisma.memberRecommendationCache.upsert({
      where: { memberId },
      update: {
        recommendations: JSON.stringify(recommendations),
        updatedAt: new Date()
      },
      create: {
        memberId,
        recommendations: JSON.stringify(recommendations),
        updatedAt: new Date()
      }
    });
  }
  
  private async handleFeatureDataShare(fromFeature: string, toFeature: string, memberId: string, dataType: string, data: any): Promise<void> {
    // Handle specific feature integrations
    switch (`${fromFeature}->${toFeature}`) {
      case 'cost-estimation->tool-lending':
        if (dataType === 'project-materials') {
          await this.suggestToolsForProject(memberId, data);
        }
        break;
        
      case 'learning->shop':
        if (dataType === 'badge-earned') {
          await this.triggerBadgeShopCampaign(memberId, data);
        }
        break;
        
      case 'growth-plan->learning':
        if (dataType === 'skill-gap') {
          await this.recommendCoursesForSkillGap(memberId, data);
        }
        break;
        
      default:
        console.log(`No specific handler for ${fromFeature}->${toFeature}`);
    }
  }
  
  private async suggestToolsForProject(memberId: string, projectData: any): Promise<void> {
    // Implementation for tool suggestions based on project data
    console.log('Suggesting tools for project:', projectData);
  }
  
  private async triggerBadgeShopCampaign(memberId: string, badgeData: any): Promise<void> {
    // Implementation for badge-related shop campaigns
    console.log('Triggering badge shop campaign:', badgeData);
  }
  
  private async recommendCoursesForSkillGap(memberId: string, skillGapData: any): Promise<void> {
    // Implementation for course recommendations based on skill gaps
    console.log('Recommending courses for skill gap:', skillGapData);
  }
}
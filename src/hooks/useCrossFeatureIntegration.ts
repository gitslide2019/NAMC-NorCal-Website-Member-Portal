'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';

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

export interface UnifiedAnalytics {
  totalEvents: number;
  activeFeatures: number;
  mostUsedFeature: string;
  engagementTrend: 'increasing' | 'stable' | 'decreasing';
  featureBreakdown: Array<{
    feature: string;
    eventCount: number;
    lastUsed: Date;
    actions: string[];
  }>;
  recommendations: CrossFeatureRecommendation[];
}

export function useCrossFeatureIntegration() {
  const { data: session } = useSession();
  const [recommendations, setRecommendations] = useState<CrossFeatureRecommendation[]>([]);
  const [engagementScore, setEngagementScore] = useState<MemberEngagementScore | null>(null);
  const [analytics, setAnalytics] = useState<UnifiedAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch recommendations
  const fetchRecommendations = useCallback(async (memberId?: string) => {
    if (!session?.user && !memberId) return;

    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (memberId) params.append('memberId', memberId);

      const response = await fetch(`/api/integration/recommendations?${params}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch recommendations');
      }

      const data = await response.json();
      setRecommendations(data.recommendations || []);
    } catch (error) {
      console.error('Error fetching recommendations:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch recommendations');
    } finally {
      setIsLoading(false);
    }
  }, [session]);

  // Fetch engagement score
  const fetchEngagementScore = useCallback(async (memberId?: string) => {
    if (!session?.user && !memberId) return;

    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (memberId) params.append('memberId', memberId);

      const response = await fetch(`/api/integration/engagement?${params}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch engagement score');
      }

      const data = await response.json();
      setEngagementScore(data.engagement);
    } catch (error) {
      console.error('Error fetching engagement score:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch engagement score');
    } finally {
      setIsLoading(false);
    }
  }, [session]);

  // Fetch unified analytics
  const fetchAnalytics = useCallback(async (timeRange: 'week' | 'month' | 'quarter' = 'month', memberId?: string) => {
    if (!session?.user && !memberId) return;

    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.append('timeRange', timeRange);
      if (memberId) params.append('memberId', memberId);

      const response = await fetch(`/api/integration/analytics?${params}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch analytics');
      }

      const data = await response.json();
      setAnalytics(data.analytics);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch analytics');
    } finally {
      setIsLoading(false);
    }
  }, [session]);

  // Track member activity
  const trackActivity = useCallback(async (feature: string, action: string, metadata?: any) => {
    if (!session?.user) return;

    try {
      const response = await fetch('/api/integration/engagement', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          feature,
          action,
          metadata
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to track activity');
      }

      // Optionally refresh recommendations after tracking activity
      // fetchRecommendations();
    } catch (error) {
      console.error('Error tracking activity:', error);
    }
  }, [session]);

  // Track recommendation click
  const trackRecommendationClick = useCallback(async (recommendationType: string, recommendationId: string) => {
    if (!session?.user) return;

    try {
      const response = await fetch('/api/integration/recommendations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'track_recommendation_click',
          recommendationType,
          recommendationId
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to track recommendation click');
      }
    } catch (error) {
      console.error('Error tracking recommendation click:', error);
    }
  }, [session]);

  // Share data between features
  const shareFeatureData = useCallback(async (
    fromFeature: string, 
    toFeature: string, 
    dataType: string, 
    data: any
  ) => {
    if (!session?.user) return;

    try {
      const response = await fetch('/api/integration/analytics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'share_feature_data',
          fromFeature,
          toFeature,
          dataType,
          data
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to share feature data');
      }
    } catch (error) {
      console.error('Error sharing feature data:', error);
    }
  }, [session]);

  // Refresh all data
  const refreshAll = useCallback(async () => {
    await Promise.all([
      fetchRecommendations(),
      fetchEngagementScore(),
      fetchAnalytics()
    ]);
  }, [fetchRecommendations, fetchEngagementScore, fetchAnalytics]);

  // Auto-fetch on mount
  useEffect(() => {
    if (session?.user) {
      fetchRecommendations();
      fetchEngagementScore();
    }
  }, [session, fetchRecommendations, fetchEngagementScore]);

  return {
    // Data
    recommendations,
    engagementScore,
    analytics,
    isLoading,
    error,

    // Actions
    fetchRecommendations,
    fetchEngagementScore,
    fetchAnalytics,
    trackActivity,
    trackRecommendationClick,
    shareFeatureData,
    refreshAll,

    // Utilities
    getRecommendationsByType: (type: string) => 
      recommendations.filter(r => r.type === type),
    getHighPriorityRecommendations: () => 
      recommendations.filter(r => r.priority === 'high'),
    getEngagementLevel: () => {
      if (!engagementScore) return 'unknown';
      if (engagementScore.overallScore >= 80) return 'high';
      if (engagementScore.overallScore >= 50) return 'medium';
      return 'low';
    }
  };
}
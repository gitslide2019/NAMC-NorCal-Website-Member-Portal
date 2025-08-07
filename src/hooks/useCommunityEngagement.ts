'use client';

import { useState, useEffect, useCallback } from 'react';

interface EngagementScore {
  totalScore: number;
  breakdown: {
    discussions: number;
    committees: number;
    voting: number;
    networking: number;
    events: number;
  };
  level: 'NEWCOMER' | 'ACTIVE' | 'CONTRIBUTOR' | 'CHAMPION' | 'LEADER';
  badges: string[];
  nextMilestone: {
    level: string;
    pointsNeeded: number;
    description: string;
  };
}

interface LeaderboardEntry {
  rank: number;
  id: string;
  name: string;
  score: number;
  avatar?: string;
  level: string;
}

interface EngagementAnalytics {
  timeframe: string;
  totalMembers: number;
  activeMembers: number;
  topContributors: LeaderboardEntry[];
  trends: Array<{
    date: string;
    discussions: number;
    committees: number;
    voting: number;
    networking: number;
  }>;
  recognitionPrograms: Array<{
    id: string;
    name: string;
    description: string;
  }>;
}

export function useCommunityEngagement() {
  const [engagementScore, setEngagementScore] = useState<EngagementScore | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [analytics, setAnalytics] = useState<EngagementAnalytics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get current user's engagement score
  const fetchEngagementScore = useCallback(async (memberId?: string) => {
    try {
      setLoading(true);
      setError(null);

      const url = memberId 
        ? `/api/community/engagement?memberId=${memberId}`
        : '/api/community/engagement';

      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error('Failed to fetch engagement score');
      }

      const data = await response.json();
      setEngagementScore(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, []);

  // Get community leaderboard
  const fetchLeaderboard = useCallback(async (limit: number = 10) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/community/engagement?type=leaderboard&limit=${limit}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch leaderboard');
      }

      const data = await response.json();
      setLeaderboard(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, []);

  // Get engagement analytics (admin only)
  const fetchAnalytics = useCallback(async (timeframe: 'week' | 'month' | 'quarter' = 'month') => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/community/engagement?type=analytics&timeframe=${timeframe}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch analytics');
      }

      const data = await response.json();
      setAnalytics(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, []);

  // Record an engagement activity
  const recordActivity = useCallback(async (
    type: 'discussion' | 'committee' | 'voting' | 'networking' | 'event',
    action: 'create' | 'participate' | 'like' | 'comment' | 'attend' | 'organize',
    metadata?: Record<string, any>
  ) => {
    try {
      const response = await fetch('/api/community/engagement', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type,
          action,
          metadata
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to record activity');
      }

      const data = await response.json();
      
      // Update local engagement score
      if (data.engagementScore) {
        setEngagementScore(data.engagementScore);
      }

      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      throw err;
    }
  }, []);

  // Helper function to get level color
  const getLevelColor = useCallback((level: string) => {
    switch (level) {
      case 'LEADER': return 'text-purple-600 bg-purple-100';
      case 'CHAMPION': return 'text-yellow-600 bg-yellow-100';
      case 'CONTRIBUTOR': return 'text-green-600 bg-green-100';
      case 'ACTIVE': return 'text-blue-600 bg-blue-100';
      case 'NEWCOMER': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  }, []);

  // Helper function to get level description
  const getLevelDescription = useCallback((level: string) => {
    switch (level) {
      case 'LEADER': return 'Community leader driving major initiatives';
      case 'CHAMPION': return 'Active champion helping grow the community';
      case 'CONTRIBUTOR': return 'Regular contributor sharing knowledge';
      case 'ACTIVE': return 'Active member participating regularly';
      case 'NEWCOMER': return 'New member getting started';
      default: return 'Community member';
    }
  }, []);

  // Helper function to calculate progress percentage
  const getProgressPercentage = useCallback((score: number, nextMilestone: { pointsNeeded: number }) => {
    if (nextMilestone.pointsNeeded === 0) return 100;
    
    const currentLevelThresholds = {
      NEWCOMER: 0,
      ACTIVE: 50,
      CONTRIBUTOR: 200,
      CHAMPION: 500,
      LEADER: 1000
    };

    const currentLevel = engagementScore?.level || 'NEWCOMER';
    const currentThreshold = currentLevelThresholds[currentLevel];
    const nextThreshold = currentThreshold + nextMilestone.pointsNeeded;
    const progress = ((score - currentThreshold) / (nextThreshold - currentThreshold)) * 100;
    
    return Math.max(0, Math.min(100, progress));
  }, [engagementScore?.level]);

  return {
    // State
    engagementScore,
    leaderboard,
    analytics,
    loading,
    error,

    // Actions
    fetchEngagementScore,
    fetchLeaderboard,
    fetchAnalytics,
    recordActivity,

    // Helpers
    getLevelColor,
    getLevelDescription,
    getProgressPercentage,

    // Convenience methods
    recordDiscussionCreate: (metadata?: Record<string, any>) => 
      recordActivity('discussion', 'create', metadata),
    recordDiscussionLike: (metadata?: Record<string, any>) => 
      recordActivity('discussion', 'like', metadata),
    recordCommitteeJoin: (metadata?: Record<string, any>) => 
      recordActivity('committee', 'participate', metadata),
    recordVoteParticipation: (metadata?: Record<string, any>) => 
      recordActivity('voting', 'participate', metadata),
    recordNetworkingConnection: (metadata?: Record<string, any>) => 
      recordActivity('networking', 'create', metadata),
    recordEventAttendance: (metadata?: Record<string, any>) => 
      recordActivity('event', 'attend', metadata),
  };
}
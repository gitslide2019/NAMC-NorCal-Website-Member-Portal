'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

interface AssessmentData {
  businessStatus: string;
  currentRevenue: string;
  employeeCount: string;
  yearsInBusiness: string;
  primaryServices: string[];
  serviceAreas: string[];
  goals: {
    revenueTarget: string;
    timeframe: string;
    growthAreas: string[];
    specificGoals: string;
  };
  challenges: {
    current: string[];
    biggest: string;
    resourceNeeds: string[];
  };
  marketPosition: {
    competitiveAdvantage: string;
    targetMarket: string;
    marketShare: string;
  };
  resources: {
    budget: string;
    timeCommitment: string;
    teamCapacity: string;
  };
}

interface GrowthPlan {
  id: string;
  planName: string;
  currentPhase: string;
  progressScore: number;
  aiAnalysis?: any;
  roadmapData?: any;
  milestones?: any;
  assessmentData?: AssessmentData;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface UseGrowthPlanReturn {
  // Assessment
  submitAssessment: (data: AssessmentData) => Promise<void>;
  getAssessment: () => Promise<AssessmentData | null>;
  
  // Growth Plan
  getCurrentPlan: () => Promise<GrowthPlan | null>;
  generatePlan: (assessmentId: string) => Promise<GrowthPlan>;
  updatePlanProgress: (planId: string, progress: number) => Promise<void>;
  
  // State
  isLoading: boolean;
  error: string | null;
  currentPlan: GrowthPlan | null;
  hasAssessment: boolean;
}

export function useGrowthPlan(): UseGrowthPlanReturn {
  const { data: session } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPlan, setCurrentPlan] = useState<GrowthPlan | null>(null);
  const [hasAssessment, setHasAssessment] = useState(false);

  // Check for existing assessment and plan on mount
  useEffect(() => {
    if (session?.user?.id) {
      checkExistingData();
    }
  }, [session?.user?.id]);

  const checkExistingData = async () => {
    try {
      setIsLoading(true);
      
      // Check for existing assessment
      const assessmentResponse = await fetch('/api/growth-plans/assessment');
      if (assessmentResponse.ok) {
        const assessmentData = await assessmentResponse.json();
        setHasAssessment(assessmentData.hasAssessment);
        
        if (assessmentData.hasAssessment && assessmentData.growthPlanId) {
          // Get the full growth plan
          const planResponse = await fetch(`/api/growth-plans/${assessmentData.growthPlanId}`);
          if (planResponse.ok) {
            const planData = await planResponse.json();
            setCurrentPlan(planData);
          }
        }
      }
    } catch (err) {
      console.error('Error checking existing data:', err);
      setError('Failed to load existing data');
    } finally {
      setIsLoading(false);
    }
  };

  const submitAssessment = async (data: AssessmentData): Promise<void> => {
    if (!session?.user?.id) {
      throw new Error('User not authenticated');
    }

    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/growth-plans/assessment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit assessment');
      }

      const result = await response.json();
      setHasAssessment(true);
      
      // Refresh current plan data
      await checkExistingData();
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to submit assessment';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const getAssessment = async (): Promise<AssessmentData | null> => {
    if (!session?.user?.id) {
      throw new Error('User not authenticated');
    }

    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/growth-plans/assessment');
      if (!response.ok) {
        throw new Error('Failed to get assessment');
      }

      const result = await response.json();
      return result.hasAssessment ? result.assessmentData : null;
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get assessment';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const getCurrentPlan = async (): Promise<GrowthPlan | null> => {
    if (!session?.user?.id) {
      throw new Error('User not authenticated');
    }

    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/growth-plans/current');
      if (!response.ok) {
        if (response.status === 404) {
          return null; // No plan exists
        }
        throw new Error('Failed to get current plan');
      }

      const plan = await response.json();
      setCurrentPlan(plan);
      return plan;
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get current plan';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const generatePlan = async (assessmentId?: string): Promise<GrowthPlan> => {
    if (!session?.user?.id) {
      throw new Error('User not authenticated');
    }

    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/growth-plans/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ assessmentId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate plan');
      }

      const plan = await response.json();
      setCurrentPlan(plan);
      return plan;
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate plan';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const updatePlanProgress = async (planId: string, progress: number): Promise<void> => {
    if (!session?.user?.id) {
      throw new Error('User not authenticated');
    }

    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`/api/growth-plans/${planId}/progress`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ progress }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update progress');
      }

      // Update local state
      if (currentPlan && currentPlan.id === planId) {
        setCurrentPlan({
          ...currentPlan,
          progressScore: progress
        });
      }
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update progress';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    // Assessment methods
    submitAssessment,
    getAssessment,
    
    // Growth Plan methods
    getCurrentPlan,
    generatePlan,
    updatePlanProgress,
    
    // State
    isLoading,
    error,
    currentPlan,
    hasAssessment,
  };
}
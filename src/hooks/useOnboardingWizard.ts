import { useState, useEffect, useCallback } from 'react';
import { 
  AIOnboardingAssistantService, 
  OnboardingProgress, 
  TechComfortLevel, 
  AIGuidanceResponse,
  StruggleDetection
} from '@/lib/services/ai-onboarding-assistant.service';

interface UseOnboardingWizardProps {
  memberId: string;
  initialProgress?: Partial<OnboardingProgress>;
}

interface OnboardingState {
  progress: OnboardingProgress;
  currentStepIndex: number;
  aiGuidance: AIGuidanceResponse | null;
  isLoadingGuidance: boolean;
  struggleDetection: StruggleDetection | null;
  showStruggleSupport: boolean;
  stepMetrics: {
    startTime: Date;
    attempts: number;
    errors: number;
    helpRequests: number;
  };
}

export const useOnboardingWizard = ({ memberId, initialProgress }: UseOnboardingWizardProps) => {
  const [state, setState] = useState<OnboardingState>({
    progress: {
      currentStep: 0,
      totalSteps: 6,
      completedSteps: [],
      skippedSteps: [],
      strugglingAreas: [],
      techComfortLevel: {
        level: 'intermediate',
        score: 5,
        areas: { software: 5, mobile: 5, internet: 5, learning: 5 }
      },
      personalizedBadges: [],
      aiEncouragementLevel: 'medium',
      ...initialProgress
    },
    currentStepIndex: initialProgress?.currentStep || 0,
    aiGuidance: null,
    isLoadingGuidance: false,
    struggleDetection: null,
    showStruggleSupport: false,
    stepMetrics: {
      startTime: new Date(),
      attempts: 0,
      errors: 0,
      helpRequests: 0
    }
  });

  const aiService = new AIOnboardingAssistantService();

  // Load AI guidance when step changes
  const loadAIGuidance = useCallback(async (stepId: string, context?: Record<string, any>) => {
    setState(prev => ({ ...prev, isLoadingGuidance: true }));
    
    try {
      const guidance = await aiService.generateContextualGuidance(
        memberId,
        stepId,
        state.progress.techComfortLevel,
        context
      );
      
      setState(prev => ({ 
        ...prev, 
        aiGuidance: guidance,
        isLoadingGuidance: false 
      }));
    } catch (error) {
      console.error('Failed to load AI guidance:', error);
      setState(prev => ({ ...prev, isLoadingGuidance: false }));
    }
  }, [memberId, state.progress.techComfortLevel]);

  // Monitor for struggle detection
  const checkForStruggle = useCallback(async () => {
    const timeSpent = (new Date().getTime() - state.stepMetrics.startTime.getTime()) / 1000;
    
    if (timeSpent > 300 && !state.showStruggleSupport) { // 5 minutes
      try {
        const detection = await aiService.detectStruggle(memberId, {
          timeSpent,
          attempts: state.stepMetrics.attempts,
          completionRate: state.progress.completedSteps.length / state.progress.totalSteps,
          errorCount: state.stepMetrics.errors,
          helpRequests: state.stepMetrics.helpRequests
        });

        if (detection.isStruggling) {
          setState(prev => ({
            ...prev,
            struggleDetection: detection,
            showStruggleSupport: true
          }));
        }
      } catch (error) {
        console.error('Failed to detect struggle:', error);
      }
    }
  }, [memberId, state.stepMetrics, state.progress, state.showStruggleSupport]);

  // Update progress in HubSpot
  const updateProgress = useCallback(async (newProgress: OnboardingProgress) => {
    try {
      await aiService.updateOnboardingProgress(memberId, newProgress);
    } catch (error) {
      console.error('Failed to update progress:', error);
    }
  }, [memberId]);

  // Complete a step
  const completeStep = useCallback(async (stepId: string, stepData: any) => {
    const newProgress = {
      ...state.progress,
      currentStep: state.currentStepIndex + 1,
      completedSteps: [...state.progress.completedSteps, stepId]
    };

    // Handle tech assessment results
    if (stepId === 'tech_assessment' && stepData.techComfortLevel) {
      newProgress.techComfortLevel = stepData.techComfortLevel;
      newProgress.aiEncouragementLevel = stepData.techComfortLevel.level === 'beginner' ? 'high' : 
                                        stepData.techComfortLevel.level === 'intermediate' ? 'medium' : 'low';
    }

    setState(prev => ({ 
      ...prev, 
      progress: newProgress,
      currentStepIndex: prev.currentStepIndex + 1,
      stepMetrics: {
        startTime: new Date(),
        attempts: 0,
        errors: 0,
        helpRequests: 0
      },
      showStruggleSupport: false
    }));

    // Award personalized badge
    try {
      const badge = await aiService.awardPersonalizedBadge(
        memberId,
        stepId,
        newProgress.techComfortLevel
      );
      
      const updatedProgress = {
        ...newProgress,
        personalizedBadges: [...newProgress.personalizedBadges, badge.badgeId]
      };
      
      setState(prev => ({ ...prev, progress: updatedProgress }));
      await updateProgress(updatedProgress);
      
      return { badge, progress: updatedProgress };
    } catch (error) {
      console.error('Failed to award badge:', error);
      await updateProgress(newProgress);
      return { progress: newProgress };
    }
  }, [state.progress, state.currentStepIndex, memberId, updateProgress]);

  // Skip a step
  const skipStep = useCallback(async (stepId: string, isRequired: boolean) => {
    if (isRequired) {
      // Generate encouragement for required steps
      try {
        const encouragement = await aiService.generateEncouragement(
          memberId,
          state.progress,
          'attempting_required_step'
        );
        setState(prev => ({ ...prev, aiGuidance: encouragement }));
      } catch (error) {
        console.error('Failed to generate encouragement:', error);
      }
      return false;
    }

    const newProgress = {
      ...state.progress,
      currentStep: state.currentStepIndex + 1,
      skippedSteps: [...state.progress.skippedSteps, stepId]
    };

    setState(prev => ({ 
      ...prev, 
      progress: newProgress,
      currentStepIndex: prev.currentStepIndex + 1,
      stepMetrics: {
        startTime: new Date(),
        attempts: 0,
        errors: 0,
        helpRequests: 0
      },
      showStruggleSupport: false
    }));

    await updateProgress(newProgress);
    return true;
  }, [state.progress, state.currentStepIndex, memberId, updateProgress]);

  // Go to previous step
  const goToPreviousStep = useCallback(() => {
    if (state.currentStepIndex > 0) {
      setState(prev => ({
        ...prev,
        currentStepIndex: prev.currentStepIndex - 1,
        stepMetrics: {
          startTime: new Date(),
          attempts: 0,
          errors: 0,
          helpRequests: 0
        },
        showStruggleSupport: false
      }));
    }
  }, [state.currentStepIndex]);

  // Request help
  const requestHelp = useCallback(async (stepId: string) => {
    setState(prev => ({
      ...prev,
      stepMetrics: {
        ...prev.stepMetrics,
        helpRequests: prev.stepMetrics.helpRequests + 1
      }
    }));

    try {
      const guidance = await aiService.generateContextualGuidance(
        memberId,
        stepId,
        state.progress.techComfortLevel,
        { helpRequest: true, attempts: state.stepMetrics.attempts }
      );
      
      setState(prev => ({ ...prev, aiGuidance: guidance }));
    } catch (error) {
      console.error('Failed to generate help guidance:', error);
    }
  }, [memberId, state.progress.techComfortLevel, state.stepMetrics.attempts]);

  // Record error
  const recordError = useCallback(() => {
    setState(prev => ({
      ...prev,
      stepMetrics: {
        ...prev.stepMetrics,
        errors: prev.stepMetrics.errors + 1
      }
    }));
  }, []);

  // Record retry attempt
  const recordRetry = useCallback(() => {
    setState(prev => ({
      ...prev,
      stepMetrics: {
        ...prev.stepMetrics,
        attempts: prev.stepMetrics.attempts + 1
      }
    }));
  }, []);

  // Generate encouragement
  const generateEncouragement = useCallback(async (achievement?: string) => {
    try {
      const encouragement = await aiService.generateEncouragement(
        memberId,
        state.progress,
        achievement
      );
      
      setState(prev => ({ ...prev, aiGuidance: encouragement }));
      return encouragement;
    } catch (error) {
      console.error('Failed to generate encouragement:', error);
      return null;
    }
  }, [memberId, state.progress]);

  // Assess tech comfort level
  const assessTechComfort = useCallback(async (responses: Record<string, any>) => {
    try {
      const techComfortLevel = await aiService.assessTechComfortLevel(responses);
      
      const newProgress = {
        ...state.progress,
        techComfortLevel,
        aiEncouragementLevel: techComfortLevel.level === 'beginner' ? 'high' : 
                             techComfortLevel.level === 'intermediate' ? 'medium' : 'low'
      };
      
      setState(prev => ({ ...prev, progress: newProgress }));
      return techComfortLevel;
    } catch (error) {
      console.error('Failed to assess tech comfort:', error);
      return null;
    }
  }, [state.progress]);

  // Set up struggle detection monitoring
  useEffect(() => {
    const interval = setInterval(checkForStruggle, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, [checkForStruggle]);

  return {
    // State
    progress: state.progress,
    currentStepIndex: state.currentStepIndex,
    aiGuidance: state.aiGuidance,
    isLoadingGuidance: state.isLoadingGuidance,
    struggleDetection: state.struggleDetection,
    showStruggleSupport: state.showStruggleSupport,
    stepMetrics: state.stepMetrics,
    
    // Actions
    loadAIGuidance,
    completeStep,
    skipStep,
    goToPreviousStep,
    requestHelp,
    recordError,
    recordRetry,
    generateEncouragement,
    assessTechComfort,
    
    // Computed values
    progressPercentage: ((state.progress.completedSteps.length + state.progress.skippedSteps.length) / state.progress.totalSteps) * 100,
    isComplete: state.currentStepIndex >= state.progress.totalSteps,
    canGoBack: state.currentStepIndex > 0
  };
};
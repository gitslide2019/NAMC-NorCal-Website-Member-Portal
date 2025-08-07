'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, HelpCircle, Award, Lightbulb, Phone, Video, BookOpen, SkipForward, Play } from 'lucide-react';
import { Button } from './Button';
import { Card } from './Card';
import { 
  AIOnboardingAssistantService, 
  OnboardingProgress, 
  TechComfortLevel, 
  AIGuidanceResponse,
  StruggleDetection
} from '@/lib/services/ai-onboarding-assistant.service';

interface OnboardingWizardProps {
  memberId: string;
  onComplete: (progress: OnboardingProgress) => void;
  onSkip?: () => void;
  initialProgress?: Partial<OnboardingProgress>;
}

interface StepData {
  id: string;
  title: string;
  description: string;
  component: React.ComponentType<any>;
  required: boolean;
  estimatedTime: number; // minutes
}

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({
  memberId,
  onComplete,
  onSkip,
  initialProgress
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [progress, setProgress] = useState<OnboardingProgress>({
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
  });

  const [aiGuidance, setAiGuidance] = useState<AIGuidanceResponse | null>(null);
  const [isLoadingGuidance, setIsLoadingGuidance] = useState(false);
  const [showAIHelper, setShowAIHelper] = useState(false);
  const [stepStartTime, setStepStartTime] = useState<Date>(new Date());
  const [stepAttempts, setStepAttempts] = useState(0);
  const [stepErrors, setStepErrors] = useState(0);
  const [helpRequests, setHelpRequests] = useState(0);
  const [showStruggleSupport, setShowStruggleSupport] = useState(false);
  const [struggleDetection, setStruggleDetection] = useState<StruggleDetection | null>(null);

  const aiService = new AIOnboardingAssistantService();

  const steps: StepData[] = [
    {
      id: 'tech_assessment',
      title: 'Technology Comfort Assessment',
      description: 'Help us understand your comfort level with technology',
      component: TechComfortAssessmentStep,
      required: true,
      estimatedTime: 5
    },
    {
      id: 'profile_setup',
      title: 'Profile Setup',
      description: 'Complete your professional profile with AI assistance',
      component: AIAssistedProfileStep,
      required: true,
      estimatedTime: 10
    },
    {
      id: 'skills_assessment',
      title: 'Skills Assessment',
      description: 'Tell us about your construction expertise',
      component: GuidedSkillsAssessmentStep,
      required: true,
      estimatedTime: 8
    },
    {
      id: 'business_goals',
      title: 'Business Goals',
      description: 'Set your business development objectives',
      component: AICoachBusinessGoalsStep,
      required: false,
      estimatedTime: 12
    },
    {
      id: 'preferences',
      title: 'Platform Preferences',
      description: 'Customize your experience',
      component: PersonalizedPreferencesStep,
      required: false,
      estimatedTime: 6
    },
    {
      id: 'verification',
      title: 'Document Verification',
      description: 'Upload required documents with guided assistance',
      component: SupportedVerificationStep,
      required: true,
      estimatedTime: 15
    }
  ];

  const currentStep = steps[currentStepIndex];

  // Load AI guidance when step changes
  useEffect(() => {
    loadAIGuidance();
    setStepStartTime(new Date());
    setStepAttempts(0);
    setStepErrors(0);
    setHelpRequests(0);
    setShowStruggleSupport(false);
  }, [currentStepIndex, progress.techComfortLevel]);

  // Monitor for struggle detection
  useEffect(() => {
    const checkForStruggle = async () => {
      const timeSpent = (new Date().getTime() - stepStartTime.getTime()) / 1000;
      
      if (timeSpent > 300) { // 5 minutes
        const detection = await aiService.detectStruggle(memberId, {
          timeSpent,
          attempts: stepAttempts,
          completionRate: progress.completedSteps.length / progress.totalSteps,
          errorCount: stepErrors,
          helpRequests
        });

        if (detection.isStruggling && !showStruggleSupport) {
          setStruggleDetection(detection);
          setShowStruggleSupport(true);
        }
      }
    };

    const interval = setInterval(checkForStruggle, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, [stepStartTime, stepAttempts, stepErrors, helpRequests, showStruggleSupport]);

  const loadAIGuidance = async () => {
    setIsLoadingGuidance(true);
    try {
      const guidance = await aiService.generateContextualGuidance(
        memberId,
        currentStep.id,
        progress.techComfortLevel,
        { stepIndex: currentStepIndex, totalSteps: steps.length }
      );
      setAiGuidance(guidance);
    } catch (error) {
      console.error('Failed to load AI guidance:', error);
    } finally {
      setIsLoadingGuidance(false);
    }
  };

  const handleStepComplete = async (stepData: any) => {
    const stepId = currentStep.id;
    
    // Update progress
    const newProgress = {
      ...progress,
      currentStep: currentStepIndex + 1,
      completedSteps: [...progress.completedSteps, stepId]
    };

    // Handle tech assessment results
    if (stepId === 'tech_assessment' && stepData.techComfortLevel) {
      newProgress.techComfortLevel = stepData.techComfortLevel;
      newProgress.aiEncouragementLevel = stepData.techComfortLevel.level === 'beginner' ? 'high' : 
                                        stepData.techComfortLevel.level === 'intermediate' ? 'medium' : 'low';
    }

    setProgress(newProgress);

    // Award personalized badge
    try {
      const badge = await aiService.awardPersonalizedBadge(
        memberId,
        stepId,
        newProgress.techComfortLevel
      );
      
      newProgress.personalizedBadges = [...newProgress.personalizedBadges, badge.badgeId];
      setProgress(newProgress);

      // Show badge celebration
      showBadgeCelebration(badge);
    } catch (error) {
      console.error('Failed to award badge:', error);
    }

    // Update progress in HubSpot
    await aiService.updateOnboardingProgress(memberId, newProgress);

    // Move to next step or complete
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    } else {
      onComplete(newProgress);
    }
  };

  const handleStepSkip = async () => {
    const stepId = currentStep.id;
    
    if (currentStep.required) {
      // Show encouragement for required steps
      const encouragement = await aiService.generateEncouragement(
        memberId,
        progress,
        'attempting_required_step'
      );
      setAiGuidance(encouragement);
      return;
    }

    const newProgress = {
      ...progress,
      currentStep: currentStepIndex + 1,
      skippedSteps: [...progress.skippedSteps, stepId]
    };

    setProgress(newProgress);
    await aiService.updateOnboardingProgress(memberId, newProgress);

    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    } else {
      onComplete(newProgress);
    }
  };

  const handlePrevious = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
    }
  };

  const handleRequestHelp = async () => {
    setHelpRequests(prev => prev + 1);
    setShowAIHelper(true);
    
    // Generate contextual help
    const guidance = await aiService.generateContextualGuidance(
      memberId,
      currentStep.id,
      progress.techComfortLevel,
      { helpRequest: true, attempts: stepAttempts }
    );
    setAiGuidance(guidance);
  };

  const handleError = () => {
    setStepErrors(prev => prev + 1);
  };

  const handleRetry = () => {
    setStepAttempts(prev => prev + 1);
  };

  const showBadgeCelebration = (badge: { badgeId: string; badgeName: string; message: string }) => {
    // This would trigger a celebration modal/animation
    console.log('Badge earned:', badge);
    // Implementation would show animated badge with congratulations
  };

  const progressPercentage = ((progress.completedSteps.length + progress.skippedSteps.length) / progress.totalSteps) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Progress Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold text-gray-900">Welcome to NAMC!</h1>
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRequestHelp}
                className="flex items-center space-x-2"
              >
                <HelpCircle className="w-4 h-4" />
                <span>Need Help?</span>
              </Button>
              {onSkip && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onSkip}
                  className="text-gray-500"
                >
                  Complete Later
                </Button>
              )}
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
            <motion.div
              className="bg-gradient-to-r from-yellow-400 to-yellow-500 h-3 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progressPercentage}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>

          <div className="flex justify-between text-sm text-gray-600">
            <span>Step {currentStepIndex + 1} of {steps.length}</span>
            <span>{Math.round(progressPercentage)}% Complete</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            <Card className="p-8">
              <div className="mb-6">
                <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                  {currentStep.title}
                </h2>
                <p className="text-gray-600 mb-4">{currentStep.description}</p>
                <div className="flex items-center text-sm text-gray-500">
                  <span>Estimated time: {currentStep.estimatedTime} minutes</span>
                  {currentStep.required && (
                    <span className="ml-4 px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs">
                      Required
                    </span>
                  )}
                </div>
              </div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={currentStepIndex}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <currentStep.component
                    memberId={memberId}
                    techComfortLevel={progress.techComfortLevel}
                    onComplete={handleStepComplete}
                    onError={handleError}
                    onRetry={handleRetry}
                    aiGuidance={aiGuidance}
                  />
                </motion.div>
              </AnimatePresence>

              {/* Navigation */}
              <div className="flex justify-between mt-8 pt-6 border-t">
                <Button
                  variant="outline"
                  onClick={handlePrevious}
                  disabled={currentStepIndex === 0}
                  className="flex items-center space-x-2"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Previous</span>
                </Button>

                <div className="flex space-x-3">
                  {!currentStep.required && (
                    <Button
                      variant="ghost"
                      onClick={handleStepSkip}
                      className="flex items-center space-x-2"
                    >
                      <SkipForward className="w-4 h-4" />
                      <span>Skip for Now</span>
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          </div>

          {/* AI Assistant Sidebar */}
          <div className="space-y-6">
            {/* AI Guidance */}
            {aiGuidance && (
              <Card className="p-6">
                <div className="flex items-center space-x-2 mb-4">
                  <Lightbulb className="w-5 h-5 text-yellow-500" />
                  <h3 className="font-semibold text-gray-900">AI Assistant</h3>
                </div>
                
                {isLoadingGuidance ? (
                  <div className="animate-pulse">
                    <div className="h-4 bg-gray-200 rounded mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  </div>
                ) : (
                  <div>
                    <p className="text-gray-700 mb-4">{aiGuidance.message}</p>
                    
                    {aiGuidance.suggestions.length > 0 && (
                      <div className="mb-4">
                        <h4 className="font-medium text-gray-900 mb-2">Suggestions:</h4>
                        <ul className="space-y-1">
                          {aiGuidance.suggestions.map((suggestion, index) => (
                            <li key={index} className="text-sm text-gray-600 flex items-start">
                              <span className="w-2 h-2 bg-yellow-400 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                              {suggestion}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {aiGuidance.helpResources && aiGuidance.helpResources.length > 0 && (
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">Help Resources:</h4>
                        <div className="space-y-2">
                          {aiGuidance.helpResources.map((resource, index) => (
                            <Button
                              key={index}
                              variant="outline"
                              size="sm"
                              className="w-full justify-start"
                              onClick={() => resource.url && window.open(resource.url, '_blank')}
                            >
                              {resource.type === 'video' && <Video className="w-4 h-4 mr-2" />}
                              {resource.type === 'text' && <BookOpen className="w-4 h-4 mr-2" />}
                              {resource.type === 'mentor' && <Phone className="w-4 h-4 mr-2" />}
                              {resource.title}
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            )}

            {/* Struggle Support */}
            {showStruggleSupport && struggleDetection && (
              <Card className="p-6 border-orange-200 bg-orange-50">
                <div className="flex items-center space-x-2 mb-4">
                  <HelpCircle className="w-5 h-5 text-orange-500" />
                  <h3 className="font-semibold text-orange-900">Need Extra Help?</h3>
                </div>
                
                <p className="text-orange-800 mb-4">
                  I notice you might be having some difficulty with this step. That's completely normal - let me help!
                </p>

                <div className="space-y-2">
                  {struggleDetection.suggestedInterventions.map((intervention, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      size="sm"
                      className="w-full justify-start text-orange-700 border-orange-200"
                    >
                      {intervention}
                    </Button>
                  ))}
                </div>

                {struggleDetection.alternativePathways.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-orange-200">
                    <h4 className="font-medium text-orange-900 mb-2">Alternative Options:</h4>
                    <div className="space-y-2">
                      {struggleDetection.alternativePathways.map((pathway, index) => (
                        <Button
                          key={index}
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start text-orange-700"
                        >
                          {pathway}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            )}

            {/* Progress Summary */}
            <Card className="p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Your Progress</h3>
              
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span>Completed Steps:</span>
                  <span className="font-medium">{progress.completedSteps.length}</span>
                </div>
                
                <div className="flex justify-between text-sm">
                  <span>Badges Earned:</span>
                  <span className="font-medium flex items-center">
                    <Award className="w-4 h-4 mr-1 text-yellow-500" />
                    {progress.personalizedBadges.length}
                  </span>
                </div>

                <div className="flex justify-between text-sm">
                  <span>Tech Comfort:</span>
                  <span className="font-medium capitalize">{progress.techComfortLevel.level}</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

// Import the actual step components
import { TechComfortAssessmentStep } from './onboarding/TechComfortAssessmentStep';
import { AIAssistedProfileStep } from './onboarding/AIAssistedProfileStep';
import { GuidedSkillsAssessmentStep } from './onboarding/GuidedSkillsAssessmentStep';
import { AICoachBusinessGoalsStep } from './onboarding/AICoachBusinessGoalsStep';
import { PersonalizedPreferencesStep } from './onboarding/PersonalizedPreferencesStep';
import { SupportedVerificationStep } from './onboarding/SupportedVerificationStep';
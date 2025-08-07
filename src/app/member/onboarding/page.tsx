'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { OnboardingWizard } from '@/components/ui/OnboardingWizard';
import { OnboardingCompletion } from '@/components/ui/onboarding/OnboardingCompletion';
import { OnboardingProgress } from '@/lib/services/ai-onboarding-assistant.service';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { CheckCircle, ArrowRight, Sparkles } from 'lucide-react';

export default function MemberOnboardingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [initialProgress, setInitialProgress] = useState<Partial<OnboardingProgress> | null>(null);
  const [showWizard, setShowWizard] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [completionData, setCompletionData] = useState<any>(null);

  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session) {
      router.push('/auth/signin');
      return;
    }

    loadOnboardingProgress();
  }, [session, status, router]);

  const loadOnboardingProgress = async () => {
    try {
      const response = await fetch('/api/onboarding/progress');
      if (response.ok) {
        const data = await response.json();
        setInitialProgress(data.progress);
        
        // Check if onboarding is already completed
        const completionRate = (data.progress.completedSteps.length + data.progress.skippedSteps.length) / data.progress.totalSteps;
        setIsCompleted(completionRate >= 1);
      }
    } catch (error) {
      console.error('Failed to load onboarding progress:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartOnboarding = () => {
    setShowWizard(true);
  };

  const handleOnboardingComplete = async (progress: OnboardingProgress) => {
    try {
      // Complete onboarding and get completion data
      const response = await fetch('/api/onboarding/progress', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stepId: 'completion',
          stepData: { progress },
          action: 'complete_onboarding'
        })
      });

      if (response.ok) {
        const completionData = await response.json();
        setCompletionData(completionData);
        setIsCompleted(true);
        setShowWizard(false);
      } else {
        throw new Error('Failed to complete onboarding');
      }
    } catch (error) {
      console.error('Failed to complete onboarding:', error);
    }
  };

  const handleSkipOnboarding = () => {
    router.push('/member/dashboard');
  };

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-yellow-500"></div>
      </div>
    );
  }

  if (showWizard) {
    return (
      <OnboardingWizard
        memberId={session?.user?.id || ''}
        onComplete={handleOnboardingComplete}
        onSkip={handleSkipOnboarding}
        initialProgress={initialProgress || undefined}
      />
    );
  }

  if (isCompleted && completionData) {
    return (
      <OnboardingCompletion
        memberId={session?.user?.id || ''}
        completionData={completionData}
        onContinue={() => router.push('/member/dashboard')}
      />
    );
  }

  // Initial onboarding landing page
  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-gray-50 flex items-center justify-center p-4">
      <Card className="max-w-4xl w-full p-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Welcome to NAMC Northern California!
          </h1>
          <p className="text-xl text-gray-600 mb-6">
            Let's get you set up with everything you need to succeed as a member of our community.
          </p>
          
          <div className="bg-gradient-to-r from-yellow-100 to-yellow-50 rounded-lg p-6 mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              Your AI-Assisted Onboarding Journey
            </h2>
            <p className="text-gray-700 mb-4">
              Our AI assistant will guide you through setting up your profile, understanding your technical comfort level, 
              and connecting you with the right resources and opportunities.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
              <div className="text-center">
                <div className="w-12 h-12 bg-yellow-200 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-xl font-bold text-yellow-800">1</span>
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Tech Assessment</h3>
                <p className="text-sm text-gray-600">We'll understand your comfort level with technology</p>
              </div>
              
              <div className="text-center">
                <div className="w-12 h-12 bg-yellow-200 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-xl font-bold text-yellow-800">2</span>
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Profile Setup</h3>
                <p className="text-sm text-gray-600">Complete your professional profile with AI guidance</p>
              </div>
              
              <div className="text-center">
                <div className="w-12 h-12 bg-yellow-200 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-xl font-bold text-yellow-800">3</span>
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Get Connected</h3>
                <p className="text-sm text-gray-600">Connect with opportunities and resources</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              onClick={handleStartOnboarding}
              className="bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 text-white px-8 py-3 text-lg"
            >
              Start Onboarding
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            
            <Button
              variant="outline"
              onClick={handleSkipOnboarding}
              className="px-8 py-3 text-lg"
            >
              Skip for Now
            </Button>
          </div>

          <p className="text-sm text-gray-500 mt-4">
            Don't worry - you can always complete this later from your dashboard.
          </p>
        </div>

        {initialProgress && (
          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Progress</h3>
            <div className="bg-gray-100 rounded-lg p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-600">Completion</span>
                <span className="text-sm font-medium text-gray-900">
                  {Math.round(((initialProgress.completedSteps?.length || 0) + (initialProgress.skippedSteps?.length || 0)) / (initialProgress.totalSteps || 6) * 100)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-yellow-400 to-yellow-500 h-2 rounded-full transition-all duration-300"
                  style={{ 
                    width: `${((initialProgress.completedSteps?.length || 0) + (initialProgress.skippedSteps?.length || 0)) / (initialProgress.totalSteps || 6) * 100}%` 
                  }}
                />
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
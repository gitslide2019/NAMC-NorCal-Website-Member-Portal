'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { GrowthPlanDashboard } from '@/components/ui/GrowthPlanDashboard';
import { useGrowthPlan } from '@/hooks/useGrowthPlan';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { AlertCircle, ArrowLeft } from 'lucide-react';

export default function GrowthPlanDashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { 
    getCurrentPlan, 
    updatePlanProgress, 
    generatePlan,
    isLoading, 
    error, 
    currentPlan 
  } = useGrowthPlan();

  const [planData, setPlanData] = useState(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [generatingPlan, setGeneratingPlan] = useState(false);

  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session) {
      router.push('/auth/signin');
      return;
    }

    loadPlanData();
  }, [session, status]);

  const loadPlanData = async () => {
    try {
      setPageLoading(true);
      
      // First try to get the current plan
      const plan = await getCurrentPlan();
      
      if (plan) {
        // If we have a plan but no generated content, try to get it from the API
        if (!plan.generatedPlan) {
          const response = await fetch('/api/growth-plans/generate');
          if (response.ok) {
            const fullPlan = await response.json();
            setPlanData(fullPlan);
          } else {
            setPlanData(plan);
          }
        } else {
          setPlanData(plan);
        }
      } else {
        // No plan found, redirect to main growth plan page
        router.push('/member/growth-plan');
      }
      
    } catch (err) {
      console.error('Error loading plan data:', err);
    } finally {
      setPageLoading(false);
    }
  };

  const handleGeneratePlan = async () => {
    try {
      setGeneratingPlan(true);
      const generatedPlan = await generatePlan();
      setPlanData(generatedPlan);
    } catch (err) {
      console.error('Error generating plan:', err);
    } finally {
      setGeneratingPlan(false);
    }
  };

  const handleUpdateProgress = async (planId: string, progress: number) => {
    try {
      await updatePlanProgress(planId, progress);
      // Reload plan data to get updated progress
      await loadPlanData();
    } catch (err) {
      console.error('Error updating progress:', err);
    }
  };

  const handleUpdateMilestone = async (planId: string, milestoneId: string, status: string) => {
    try {
      const response = await fetch(`/api/growth-plans/${planId}/progress`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ milestoneId, milestoneStatus: status }),
      });

      if (!response.ok) {
        throw new Error('Failed to update milestone');
      }

      // Reload plan data to get updated milestones
      await loadPlanData();
    } catch (err) {
      console.error('Error updating milestone:', err);
    }
  };

  if (status === 'loading' || pageLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-yellow-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your growth plan dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-yellow-100 flex items-center justify-center">
        <Card className="max-w-md mx-auto p-8 text-center">
          <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Plan</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <div className="flex gap-4 justify-center">
            <Button 
              variant="outline"
              onClick={() => router.push('/member/growth-plan')}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Growth Plan
            </Button>
            <Button onClick={loadPlanData}>
              Try Again
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (!planData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-yellow-100 flex items-center justify-center">
        <Card className="max-w-md mx-auto p-8 text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">No Growth Plan Found</h2>
          <p className="text-gray-600 mb-6">
            You need to complete the assessment and generate a growth plan first.
          </p>
          <Button 
            onClick={() => router.push('/member/growth-plan')}
            className="bg-yellow-500 hover:bg-yellow-600 text-black"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go to Growth Plan
          </Button>
        </Card>
      </div>
    );
  }

  // If plan exists but no generated content, show generate option
  if (!planData.generatedPlan) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-yellow-100">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto">
            <Card className="p-8 text-center">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                Ready to Generate Your Growth Plan?
              </h2>
              <p className="text-gray-600 mb-6">
                Your assessment is complete. Now let our AI create a personalized 
                growth plan with detailed milestones and actionable steps.
              </p>
              
              <div className="flex gap-4 justify-center">
                <Button 
                  variant="outline"
                  onClick={() => router.push('/member/growth-plan')}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <Button 
                  onClick={handleGeneratePlan}
                  disabled={generatingPlan}
                  className="bg-yellow-500 hover:bg-yellow-600 text-black"
                >
                  {generatingPlan ? 'Generating Plan...' : 'Generate Growth Plan'}
                </Button>
              </div>
              
              {generatingPlan && (
                <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-center justify-center gap-3">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                    <p className="text-blue-800 text-sm">
                      Our AI is analyzing your assessment and creating your personalized growth plan...
                    </p>
                  </div>
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-yellow-100">
      <div className="container mx-auto px-4 py-8">
        {/* Navigation */}
        <div className="mb-6">
          <Button 
            variant="outline"
            onClick={() => router.push('/member/growth-plan')}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Growth Plan
          </Button>
        </div>

        {/* Dashboard */}
        <GrowthPlanDashboard
          planData={planData}
          onUpdateProgress={handleUpdateProgress}
          onUpdateMilestone={handleUpdateMilestone}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}
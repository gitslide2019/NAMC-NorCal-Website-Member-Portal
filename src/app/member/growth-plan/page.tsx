'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { GrowthPlanAssessment } from '@/components/ui/GrowthPlanAssessment';
import { useGrowthPlan } from '@/hooks/useGrowthPlan';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { CheckCircle, TrendingUp, Target, Calendar, AlertCircle } from 'lucide-react';

export default function GrowthPlanPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { 
    submitAssessment, 
    getAssessment, 
    getCurrentPlan,
    isLoading, 
    error, 
    currentPlan, 
    hasAssessment 
  } = useGrowthPlan();

  const [showAssessment, setShowAssessment] = useState(false);
  const [assessmentData, setAssessmentData] = useState(null);
  const [pageLoading, setPageLoading] = useState(true);

  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session) {
      router.push('/auth/signin');
      return;
    }

    loadInitialData();
  }, [session, status]);

  const loadInitialData = async () => {
    try {
      setPageLoading(true);
      
      // Check if user has existing assessment
      const assessment = await getAssessment();
      if (assessment) {
        setAssessmentData(assessment);
      }
      
      // Get current plan if exists
      await getCurrentPlan();
      
    } catch (err) {
      console.error('Error loading initial data:', err);
    } finally {
      setPageLoading(false);
    }
  };

  const handleAssessmentComplete = async (data: any) => {
    try {
      await submitAssessment(data);
      setShowAssessment(false);
      // Refresh the page data
      await loadInitialData();
    } catch (err) {
      console.error('Error submitting assessment:', err);
    }
  };

  const handleStartAssessment = () => {
    setShowAssessment(true);
  };

  const handleRetakeAssessment = () => {
    setShowAssessment(true);
  };

  if (status === 'loading' || pageLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-yellow-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your growth plan...</p>
        </div>
      </div>
    );
  }

  if (showAssessment) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-yellow-100">
        <GrowthPlanAssessment
          onComplete={handleAssessmentComplete}
          initialData={assessmentData}
          isLoading={isLoading}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-yellow-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            AI-Powered Business Growth Plan
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Get a personalized roadmap to grow your contracting business with AI-driven insights 
            based on your current situation, goals, and market opportunities.
          </p>
        </div>

        {error && (
          <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
              <p className="text-red-800">{error}</p>
            </div>
          </div>
        )}

        {/* Assessment Status */}
        {!hasAssessment ? (
          <Card className="max-w-4xl mx-auto p-8 mb-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Target className="w-8 h-8 text-yellow-600" />
              </div>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                Start Your Growth Journey
              </h2>
              <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
                Complete our comprehensive business assessment to receive a personalized 
                AI-generated growth plan tailored to your specific situation and goals.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="text-center">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <TrendingUp className="w-6 h-6 text-blue-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">Business Analysis</h3>
                  <p className="text-sm text-gray-600">
                    Analyze your current business status, revenue, and market position
                  </p>
                </div>
                
                <div className="text-center">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Target className="w-6 h-6 text-green-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">Goal Setting</h3>
                  <p className="text-sm text-gray-600">
                    Define your growth targets, timeframes, and strategic priorities
                  </p>
                </div>
                
                <div className="text-center">
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Calendar className="w-6 h-6 text-purple-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">Action Plan</h3>
                  <p className="text-sm text-gray-600">
                    Receive a detailed roadmap with milestones and actionable steps
                  </p>
                </div>
              </div>

              <Button 
                onClick={handleStartAssessment}
                className="bg-yellow-500 hover:bg-yellow-600 text-black px-8 py-3 text-lg"
                disabled={isLoading}
              >
                {isLoading ? 'Loading...' : 'Start Assessment'}
              </Button>
            </div>
          </Card>
        ) : (
          /* Existing Assessment/Plan */
          <div className="max-w-4xl mx-auto">
            {currentPlan ? (
              <Card className="p-8 mb-8">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                      {currentPlan.planName}
                    </h2>
                    <p className="text-gray-600">
                      Current Phase: <span className="font-medium capitalize">
                        {currentPlan.currentPhase.replace('_', ' ')}
                      </span>
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-yellow-600 mb-1">
                      {Math.round(currentPlan.progressScore)}%
                    </div>
                    <div className="text-sm text-gray-600">Complete</div>
                  </div>
                </div>

                <div className="w-full bg-gray-200 rounded-full h-3 mb-6">
                  <div 
                    className="bg-yellow-500 h-3 rounded-full transition-all duration-300"
                    style={{ width: `${currentPlan.progressScore}%` }}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Next Steps</h3>
                    <ul className="space-y-2">
                      <li className="flex items-center text-sm text-gray-600">
                        <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                        Assessment completed
                      </li>
                      <li className="flex items-center text-sm text-gray-600">
                        <div className="w-4 h-4 border-2 border-gray-300 rounded-full mr-2" />
                        Generate AI growth plan
                      </li>
                      <li className="flex items-center text-sm text-gray-600">
                        <div className="w-4 h-4 border-2 border-gray-300 rounded-full mr-2" />
                        Review milestones
                      </li>
                    </ul>
                  </div>
                  
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Plan Details</h3>
                    <p className="text-sm text-gray-600 mb-2">
                      Created: {new Date(currentPlan.createdAt).toLocaleDateString()}
                    </p>
                    <p className="text-sm text-gray-600">
                      Last Updated: {new Date(currentPlan.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <Button 
                    onClick={() => router.push('/member/growth-plan/dashboard')}
                    className="bg-yellow-500 hover:bg-yellow-600 text-black"
                  >
                    View Dashboard
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={handleRetakeAssessment}
                  >
                    Retake Assessment
                  </Button>
                </div>
              </Card>
            ) : (
              <Card className="p-8">
                <div className="text-center">
                  <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
                  <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                    Assessment Complete!
                  </h2>
                  <p className="text-gray-600 mb-6">
                    Your business assessment has been completed. Ready to generate your 
                    personalized AI growth plan?
                  </p>
                  <div className="flex gap-4 justify-center">
                    <Button 
                      onClick={() => router.push('/member/growth-plan/dashboard')}
                      className="bg-yellow-500 hover:bg-yellow-600 text-black"
                    >
                      Generate Growth Plan
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={handleRetakeAssessment}
                    >
                      Retake Assessment
                    </Button>
                  </div>
                </div>
              </Card>
            )}
          </div>
        )}

        {/* Features Overview */}
        <div className="max-w-6xl mx-auto mt-16">
          <h2 className="text-2xl font-semibold text-center text-gray-900 mb-8">
            What's Included in Your Growth Plan
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="p-6 text-center">
              <TrendingUp className="w-8 h-8 text-blue-600 mx-auto mb-4" />
              <h3 className="font-semibold text-gray-900 mb-2">Market Analysis</h3>
              <p className="text-sm text-gray-600">
                AI-powered insights into your local construction market and opportunities
              </p>
            </Card>
            
            <Card className="p-6 text-center">
              <Target className="w-8 h-8 text-green-600 mx-auto mb-4" />
              <h3 className="font-semibold text-gray-900 mb-2">Strategic Goals</h3>
              <p className="text-sm text-gray-600">
                Clear, measurable objectives aligned with your business vision
              </p>
            </Card>
            
            <Card className="p-6 text-center">
              <Calendar className="w-8 h-8 text-purple-600 mx-auto mb-4" />
              <h3 className="font-semibold text-gray-900 mb-2">Action Timeline</h3>
              <p className="text-sm text-gray-600">
                Step-by-step roadmap with milestones and deadlines
              </p>
            </Card>
            
            <Card className="p-6 text-center">
              <CheckCircle className="w-8 h-8 text-yellow-600 mx-auto mb-4" />
              <h3 className="font-semibold text-gray-900 mb-2">Progress Tracking</h3>
              <p className="text-sm text-gray-600">
                Monitor your growth with real-time progress indicators
              </p>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
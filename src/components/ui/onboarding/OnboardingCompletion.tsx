'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../Button';
import { Card } from '../Card';
import { 
  CheckCircle, 
  Award, 
  Users, 
  BookOpen, 
  Briefcase, 
  ArrowRight, 
  Sparkles,
  Download,
  Star,
  Trophy
} from 'lucide-react';

interface OnboardingCompletionProps {
  memberId: string;
  completionData: {
    completionCertificate: { id: string; url: string };
    dashboardConfig: any;
    mentorAssignment: any;
    recommendations: any;
    nextSteps: string[];
  };
  onContinue: () => void;
}

export const OnboardingCompletion: React.FC<OnboardingCompletionProps> = ({
  memberId,
  completionData,
  onContinue
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [showCelebration, setShowCelebration] = useState(true);
  const [showRecommendations, setShowRecommendations] = useState(false);

  const celebrationSteps = [
    {
      icon: Trophy,
      title: 'Congratulations!',
      message: 'You\'ve successfully completed your NAMC onboarding journey!',
      color: 'text-yellow-500'
    },
    {
      icon: Award,
      title: 'Badges Earned',
      message: 'You\'ve earned multiple achievement badges during your onboarding.',
      color: 'text-blue-500'
    },
    {
      icon: Users,
      title: 'Welcome to the Community',
      message: 'You\'re now part of a thriving community of construction professionals.',
      color: 'text-green-500'
    }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentStep(prev => {
        if (prev < celebrationSteps.length - 1) {
          return prev + 1;
        } else {
          clearInterval(timer);
          setTimeout(() => {
            setShowCelebration(false);
            setShowRecommendations(true);
          }, 2000);
          return prev;
        }
      });
    }, 2000);

    return () => clearInterval(timer);
  }, []);

  if (showCelebration) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-blue-50 to-green-50 flex items-center justify-center p-4">
        <Card className="max-w-2xl w-full p-8 text-center relative overflow-hidden">
          {/* Animated background elements */}
          <div className="absolute inset-0 overflow-hidden">
            {[...Array(20)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-2 h-2 bg-yellow-400 rounded-full opacity-60"
                initial={{ 
                  x: Math.random() * 400, 
                  y: Math.random() * 400,
                  scale: 0 
                }}
                animate={{ 
                  y: -100,
                  scale: [0, 1, 0],
                  rotate: 360
                }}
                transition={{
                  duration: 3,
                  delay: Math.random() * 2,
                  repeat: Infinity,
                  repeatDelay: Math.random() * 3
                }}
              />
            ))}
          </div>

          <div className="relative z-10">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, y: 20, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.9 }}
                transition={{ duration: 0.5 }}
                className="space-y-6"
              >
                <motion.div
                  animate={{ 
                    rotate: [0, 10, -10, 0],
                    scale: [1, 1.1, 1]
                  }}
                  transition={{ 
                    duration: 2,
                    repeat: Infinity,
                    repeatType: "reverse"
                  }}
                >
                  {React.createElement(celebrationSteps[currentStep].icon, {
                    className: `w-20 h-20 mx-auto ${celebrationSteps[currentStep].color}`
                  })}
                </motion.div>

                <div>
                  <h1 className="text-4xl font-bold text-gray-900 mb-4">
                    {celebrationSteps[currentStep].title}
                  </h1>
                  <p className="text-xl text-gray-600">
                    {celebrationSteps[currentStep].message}
                  </p>
                </div>

                {/* Progress dots */}
                <div className="flex justify-center space-x-2">
                  {celebrationSteps.map((_, index) => (
                    <div
                      key={index}
                      className={`w-3 h-3 rounded-full transition-colors ${
                        index <= currentStep ? 'bg-yellow-400' : 'bg-gray-300'
                      }`}
                    />
                  ))}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-gray-50 p-4">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <div className="flex items-center justify-center space-x-3 mb-4">
            <CheckCircle className="w-8 h-8 text-green-500" />
            <h1 className="text-3xl font-bold text-gray-900">
              Welcome to NAMC, You're All Set!
            </h1>
          </div>
          <p className="text-lg text-gray-600">
            Your onboarding is complete. Here's what we've prepared for you based on your profile.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Completion Certificate */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="p-6 h-full">
              <div className="text-center">
                <Award className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Completion Certificate
                </h3>
                <p className="text-gray-600 mb-4">
                  Download your official NAMC onboarding completion certificate.
                </p>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => window.open(completionData.completionCertificate.url, '_blank')}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download Certificate
                </Button>
              </div>
            </Card>
          </motion.div>

          {/* AI Mentor Assignment */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="p-6 h-full">
              <div className="text-center">
                <Users className="w-12 h-12 text-blue-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Your AI Mentor
                </h3>
                <p className="text-gray-600 mb-4">
                  We've assigned you an AI mentor to guide your journey based on your comfort level.
                </p>
                <div className="bg-blue-50 rounded-lg p-3 mb-4">
                  <p className="text-sm text-blue-800">
                    <strong>Mentor Style:</strong> {completionData.mentorAssignment.mentorPersonality.replace('_', ' ')}
                  </p>
                  <p className="text-sm text-blue-800 mt-1">
                    <strong>Communication:</strong> {completionData.mentorAssignment.communicationStyle.replace('_', ' ')}
                  </p>
                </div>
                <Button variant="outline" className="w-full">
                  Meet Your Mentor
                </Button>
              </div>
            </Card>
          </motion.div>

          {/* Dashboard Preview */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 }}
          >
            <Card className="p-6 h-full">
              <div className="text-center">
                <Sparkles className="w-12 h-12 text-purple-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Personalized Dashboard
                </h3>
                <p className="text-gray-600 mb-4">
                  Your dashboard has been customized based on your technical comfort level.
                </p>
                <div className="bg-purple-50 rounded-lg p-3 mb-4">
                  <p className="text-sm text-purple-800">
                    <strong>Layout:</strong> {completionData.dashboardConfig.layout} mode
                  </p>
                  <p className="text-sm text-purple-800 mt-1">
                    <strong>Widgets:</strong> {completionData.dashboardConfig.widgets.length} personalized widgets
                  </p>
                </div>
                <Button variant="outline" className="w-full">
                  Preview Dashboard
                </Button>
              </div>
            </Card>
          </motion.div>
        </div>

        {/* Recommendations */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
        >
          <Card className="p-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6 text-center">
              Personalized Recommendations
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Groups */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Users className="w-5 h-5 text-green-500" />
                  <h3 className="font-semibold text-gray-900">Recommended Groups</h3>
                </div>
                <div className="space-y-2">
                  {completionData.recommendations.groups?.slice(0, 3).map((group: any, index: number) => (
                    <div key={index} className="bg-green-50 rounded-lg p-3">
                      <h4 className="font-medium text-green-900 text-sm">{group.name}</h4>
                      <p className="text-xs text-green-700 mt-1">{group.reason}</p>
                      <div className="flex items-center mt-2">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-3 h-3 ${
                              i < Math.floor(group.matchScore * 5) ? 'text-yellow-400 fill-current' : 'text-gray-300'
                            }`}
                          />
                        ))}
                        <span className="text-xs text-green-600 ml-1">
                          {Math.round(group.matchScore * 100)}% match
                        </span>
                      </div>
                    </div>
                  )) || (
                    <div className="bg-green-50 rounded-lg p-3">
                      <p className="text-sm text-green-700">Loading recommendations...</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Mentors */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Users className="w-5 h-5 text-blue-500" />
                  <h3 className="font-semibold text-gray-900">Potential Mentors</h3>
                </div>
                <div className="space-y-2">
                  {completionData.recommendations.mentors?.slice(0, 3).map((mentor: any, index: number) => (
                    <div key={index} className="bg-blue-50 rounded-lg p-3">
                      <h4 className="font-medium text-blue-900 text-sm">{mentor.name}</h4>
                      <p className="text-xs text-blue-700">{mentor.expertise}</p>
                      <p className="text-xs text-blue-600 mt-1">{mentor.reason}</p>
                    </div>
                  )) || (
                    <div className="bg-blue-50 rounded-lg p-3">
                      <p className="text-sm text-blue-700">Finding mentors for you...</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Learning */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <BookOpen className="w-5 h-5 text-purple-500" />
                  <h3 className="font-semibold text-gray-900">Learning Opportunities</h3>
                </div>
                <div className="space-y-2">
                  {completionData.recommendations.learningOpportunities?.slice(0, 3).map((opportunity: any, index: number) => (
                    <div key={index} className="bg-purple-50 rounded-lg p-3">
                      <h4 className="font-medium text-purple-900 text-sm">{opportunity.title}</h4>
                      <p className="text-xs text-purple-700">{opportunity.type}</p>
                      <p className="text-xs text-purple-600 mt-1">{opportunity.reason}</p>
                    </div>
                  )) || (
                    <div className="bg-purple-50 rounded-lg p-3">
                      <p className="text-sm text-purple-700">Curating learning paths...</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Projects */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Briefcase className="w-5 h-5 text-orange-500" />
                  <h3 className="font-semibold text-gray-900">Project Opportunities</h3>
                </div>
                <div className="space-y-2">
                  {completionData.recommendations.projects?.slice(0, 3).map((project: any, index: number) => (
                    <div key={index} className="bg-orange-50 rounded-lg p-3">
                      <h4 className="font-medium text-orange-900 text-sm">{project.title}</h4>
                      <p className="text-xs text-orange-700">{project.type}</p>
                      <div className="flex items-center mt-2">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-3 h-3 ${
                              i < Math.floor(project.matchScore * 5) ? 'text-yellow-400 fill-current' : 'text-gray-300'
                            }`}
                          />
                        ))}
                        <span className="text-xs text-orange-600 ml-1">
                          {Math.round(project.matchScore * 100)}% match
                        </span>
                      </div>
                    </div>
                  )) || (
                    <div className="bg-orange-50 rounded-lg p-3">
                      <p className="text-sm text-orange-700">Matching projects...</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Next Steps */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.0 }}
        >
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 text-center">
              Your Next Steps
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {completionData.nextSteps.map((step, index) => (
                <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  <div className="w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center text-white text-sm font-bold">
                    {index + 1}
                  </div>
                  <span className="text-gray-700">{step}</span>
                </div>
              ))}
            </div>
          </Card>
        </motion.div>

        {/* Continue Button */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="text-center"
        >
          <Button
            onClick={onContinue}
            className="bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 text-white px-12 py-4 text-lg"
          >
            Enter Your Dashboard
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </motion.div>
      </div>
    </div>
  );
};
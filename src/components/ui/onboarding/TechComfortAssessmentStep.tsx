'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '../Button';
import { Card } from '../Card';
import { TechComfortLevel, AIGuidanceResponse } from '@/lib/services/ai-onboarding-assistant.service';
import { Smartphone, Monitor, Globe, BookOpen, HelpCircle, CheckCircle } from 'lucide-react';

interface TechComfortAssessmentStepProps {
  memberId: string;
  techComfortLevel: TechComfortLevel;
  onComplete: (data: { techComfortLevel: TechComfortLevel }) => void;
  onError: () => void;
  onRetry: () => void;
  aiGuidance: AIGuidanceResponse | null;
}

interface AssessmentQuestion {
  id: string;
  category: 'software' | 'mobile' | 'internet' | 'learning';
  icon: React.ComponentType<any>;
  question: string;
  description: string;
  options: Array<{
    value: number;
    label: string;
    description: string;
  }>;
}

const assessmentQuestions: AssessmentQuestion[] = [
  {
    id: 'computer_daily_use',
    category: 'software',
    icon: Monitor,
    question: 'How comfortable are you using a computer daily?',
    description: 'This helps us understand your general computer skills',
    options: [
      { value: 1, label: 'Not comfortable', description: 'I rarely use computers and find them confusing' },
      { value: 3, label: 'Somewhat comfortable', description: 'I can do basic tasks like email and web browsing' },
      { value: 5, label: 'Comfortable', description: 'I use computers regularly for work and personal tasks' },
      { value: 7, label: 'Very comfortable', description: 'I can handle most computer tasks without help' },
      { value: 10, label: 'Expert', description: 'I can troubleshoot problems and help others' }
    ]
  },
  {
    id: 'smartphone_usage',
    category: 'mobile',
    icon: Smartphone,
    question: 'How often do you use smartphone apps?',
    description: 'Understanding your mobile device comfort helps us design better experiences',
    options: [
      { value: 1, label: 'Never', description: 'I only use my phone for calls and texts' },
      { value: 3, label: 'Occasionally', description: 'I use a few basic apps like weather or maps' },
      { value: 5, label: 'Regularly', description: 'I use apps daily for various tasks' },
      { value: 7, label: 'Frequently', description: 'I download new apps and use many features' },
      { value: 10, label: 'Constantly', description: 'I use my phone for almost everything' }
    ]
  },
  {
    id: 'internet_daily_use',
    category: 'internet',
    icon: Globe,
    question: 'How comfortable are you with online forms and websites?',
    description: 'This helps us know how much guidance you might need with our platform',
    options: [
      { value: 1, label: 'Very uncomfortable', description: 'Online forms are confusing and frustrating' },
      { value: 3, label: 'Uncomfortable', description: 'I can fill out simple forms but often need help' },
      { value: 5, label: 'Neutral', description: 'I can handle most online tasks with some effort' },
      { value: 7, label: 'Comfortable', description: 'I navigate websites and forms easily' },
      { value: 10, label: 'Very comfortable', description: 'I can handle complex online tasks confidently' }
    ]
  },
  {
    id: 'learning_new_tech',
    category: 'learning',
    icon: BookOpen,
    question: 'How do you prefer to learn new technology?',
    description: 'This helps us provide the right type of support for you',
    options: [
      { value: 1, label: 'Avoid it', description: 'I prefer to avoid learning new technology' },
      { value: 3, label: 'With lots of help', description: 'I need someone to walk me through step-by-step' },
      { value: 5, label: 'With some guidance', description: 'I can learn with clear instructions and support' },
      { value: 7, label: 'On my own', description: 'I can figure things out with minimal guidance' },
      { value: 10, label: 'Love exploring', description: 'I enjoy discovering new features and capabilities' }
    ]
  }
];

export const TechComfortAssessmentStep: React.FC<TechComfortAssessmentStepProps> = ({
  memberId,
  techComfortLevel,
  onComplete,
  onError,
  onRetry,
  aiGuidance
}) => {
  const [responses, setResponses] = useState<Record<string, number>>({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [calculatedLevel, setCalculatedLevel] = useState<TechComfortLevel | null>(null);

  const currentQuestion = assessmentQuestions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === assessmentQuestions.length - 1;
  const canProceed = responses[currentQuestion.id] !== undefined;
  const progressPercentage = ((currentQuestionIndex + (canProceed ? 1 : 0)) / assessmentQuestions.length) * 100;

  const handleResponseSelect = (questionId: string, value: number) => {
    setResponses(prev => ({
      ...prev,
      [questionId]: value
    }));
  };

  const handleNext = () => {
    if (isLastQuestion && canProceed) {
      calculateTechComfort();
    } else if (canProceed) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const calculateTechComfort = async () => {
    setIsSubmitting(true);
    
    try {
      // Call API to assess tech comfort level
      const response = await fetch('/api/onboarding/progress', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stepId: 'tech_assessment',
          stepData: { responses },
          action: 'assess_tech_comfort'
        })
      });

      if (response.ok) {
        const data = await response.json();
        setCalculatedLevel(data.techComfortLevel);
        setShowResults(true);
      } else {
        onError();
      }
    } catch (error) {
      console.error('Failed to calculate tech comfort:', error);
      onError();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleComplete = () => {
    if (calculatedLevel) {
      onComplete({ techComfortLevel: calculatedLevel });
    }
  };

  const getComfortLevelColor = (level: string) => {
    switch (level) {
      case 'beginner': return 'text-orange-600 bg-orange-100';
      case 'intermediate': return 'text-blue-600 bg-blue-100';
      case 'advanced': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getComfortLevelDescription = (level: string) => {
    switch (level) {
      case 'beginner':
        return 'Perfect! We\'ll provide extra guidance and support to help you feel confident using our platform. Every expert started as a beginner.';
      case 'intermediate':
        return 'Great! You have a solid foundation. We\'ll provide helpful tips and explanations to make your experience smooth and efficient.';
      case 'advanced':
        return 'Excellent! You\'re tech-savvy and can handle complex features. We\'ll focus on showing you the powerful tools available to you.';
      default:
        return 'We\'ll customize your experience based on your comfort level.';
    }
  };

  if (showResults && calculatedLevel) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        <div className="text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h3 className="text-2xl font-semibold text-gray-900 mb-2">
            Assessment Complete!
          </h3>
          <p className="text-gray-600">
            Based on your responses, we've determined your technology comfort level.
          </p>
        </div>

        <Card className="p-6">
          <div className="text-center mb-6">
            <div className={`inline-flex items-center px-4 py-2 rounded-full text-lg font-semibold ${getComfortLevelColor(calculatedLevel.level)}`}>
              {calculatedLevel.level.charAt(0).toUpperCase() + calculatedLevel.level.slice(1)} Level
            </div>
            <div className="mt-2 text-sm text-gray-500">
              Score: {calculatedLevel.score.toFixed(1)}/10
            </div>
          </div>

          <p className="text-gray-700 text-center mb-6">
            {getComfortLevelDescription(calculatedLevel.level)}
          </p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center">
              <Monitor className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <div className="text-sm font-medium text-gray-900">Software</div>
              <div className="text-xs text-gray-500">{calculatedLevel.areas.software.toFixed(1)}/10</div>
            </div>
            <div className="text-center">
              <Smartphone className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <div className="text-sm font-medium text-gray-900">Mobile</div>
              <div className="text-xs text-gray-500">{calculatedLevel.areas.mobile.toFixed(1)}/10</div>
            </div>
            <div className="text-center">
              <Globe className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <div className="text-sm font-medium text-gray-900">Internet</div>
              <div className="text-xs text-gray-500">{calculatedLevel.areas.internet.toFixed(1)}/10</div>
            </div>
            <div className="text-center">
              <BookOpen className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <div className="text-sm font-medium text-gray-900">Learning</div>
              <div className="text-xs text-gray-500">{calculatedLevel.areas.learning.toFixed(1)}/10</div>
            </div>
          </div>

          {aiGuidance && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <div className="flex items-start space-x-3">
                <HelpCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-yellow-900 mb-1">AI Assistant</h4>
                  <p className="text-yellow-800 text-sm">{aiGuidance.message}</p>
                </div>
              </div>
            </div>
          )}

          <div className="text-center">
            <Button
              onClick={handleComplete}
              className="bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 text-white px-8 py-3"
            >
              Continue to Profile Setup
            </Button>
          </div>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700">
            Question {currentQuestionIndex + 1} of {assessmentQuestions.length}
          </span>
          <span className="text-sm text-gray-500">
            {Math.round(progressPercentage)}% Complete
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <motion.div
            className="bg-gradient-to-r from-yellow-400 to-yellow-500 h-2 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progressPercentage}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {/* Question Card */}
      <Card className="p-6">
        <div className="flex items-start space-x-4 mb-6">
          <div className="p-3 bg-yellow-100 rounded-lg">
            <currentQuestion.icon className="w-6 h-6 text-yellow-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {currentQuestion.question}
            </h3>
            <p className="text-gray-600">
              {currentQuestion.description}
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {currentQuestion.options.map((option) => (
            <motion.button
              key={option.value}
              onClick={() => handleResponseSelect(currentQuestion.id, option.value)}
              className={`w-full text-left p-4 rounded-lg border-2 transition-all duration-200 ${
                responses[currentQuestion.id] === option.value
                  ? 'border-yellow-400 bg-yellow-50'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              }`}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="font-medium text-gray-900 mb-1">
                    {option.label}
                  </div>
                  <div className="text-sm text-gray-600">
                    {option.description}
                  </div>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  responses[currentQuestion.id] === option.value
                    ? 'border-yellow-400 bg-yellow-400'
                    : 'border-gray-300'
                }`}>
                  {responses[currentQuestion.id] === option.value && (
                    <div className="w-2 h-2 bg-white rounded-full" />
                  )}
                </div>
              </div>
            </motion.button>
          ))}
        </div>

        {aiGuidance && (
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <HelpCircle className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-blue-900 mb-1">AI Assistant</h4>
                <p className="text-blue-800 text-sm">{aiGuidance.message}</p>
                {aiGuidance.suggestions.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {aiGuidance.suggestions.map((suggestion, index) => (
                      <li key={index} className="text-blue-700 text-sm flex items-start">
                        <span className="w-1 h-1 bg-blue-400 rounded-full mt-2 mr-2 flex-shrink-0" />
                        {suggestion}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={handlePrevious}
          disabled={currentQuestionIndex === 0}
        >
          Previous
        </Button>

        <Button
          onClick={handleNext}
          disabled={!canProceed || isSubmitting}
          className={canProceed ? 'bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 text-white' : ''}
        >
          {isSubmitting ? (
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
              <span>Calculating...</span>
            </div>
          ) : isLastQuestion ? 'Complete Assessment' : 'Next Question'}
        </Button>
      </div>
    </motion.div>
  );
};
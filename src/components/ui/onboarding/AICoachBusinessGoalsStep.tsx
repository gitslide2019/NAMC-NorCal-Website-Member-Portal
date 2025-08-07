'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '../Button';
import { Card } from '../Card';
import { TechComfortLevel, AIGuidanceResponse } from '@/lib/services/ai-onboarding-assistant.service';
import { Target, TrendingUp, Users, DollarSign, HelpCircle } from 'lucide-react';

interface AICoachBusinessGoalsStepProps {
  memberId: string;
  techComfortLevel: TechComfortLevel;
  onComplete: (data: any) => void;
  onError: () => void;
  onRetry: () => void;
  aiGuidance: AIGuidanceResponse | null;
}

export const AICoachBusinessGoalsStep: React.FC<AICoachBusinessGoalsStepProps> = ({
  memberId,
  techComfortLevel,
  onComplete,
  onError,
  onRetry,
  aiGuidance
}) => {
  const [goals, setGoals] = useState<string[]>([]);
  const [timeframe, setTimeframe] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const goalOptions = [
    { id: 'grow_revenue', label: 'Increase Revenue', icon: DollarSign },
    { id: 'expand_team', label: 'Expand Team', icon: Users },
    { id: 'new_markets', label: 'Enter New Markets', icon: TrendingUp },
    { id: 'improve_skills', label: 'Improve Skills', icon: Target }
  ];

  const handleGoalToggle = (goalId: string) => {
    setGoals(prev => 
      prev.includes(goalId) 
        ? prev.filter(g => g !== goalId)
        : [...prev, goalId]
    );
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      onComplete({ goals, timeframe });
    } catch (error) {
      onError();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {aiGuidance && (
        <Card className="p-4 bg-blue-50 border-blue-200">
          <div className="flex items-start space-x-3">
            <HelpCircle className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-blue-900 mb-1">AI Coach</h4>
              <p className="text-blue-800 text-sm">{aiGuidance.message}</p>
            </div>
          </div>
        </Card>
      )}

      <Card className="p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">
          What Are Your Business Goals?
        </h3>
        
        <div className="grid grid-cols-2 gap-4 mb-6">
          {goalOptions.map((goal) => (
            <button
              key={goal.id}
              onClick={() => handleGoalToggle(goal.id)}
              className={`p-4 border-2 rounded-lg text-left transition-colors ${
                goals.includes(goal.id)
                  ? 'border-yellow-400 bg-yellow-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <goal.icon className="w-6 h-6 text-yellow-600 mb-2" />
              <div className="font-medium">{goal.label}</div>
            </button>
          ))}
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-900 mb-2">
            Timeframe for Goals
          </label>
          <select
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          >
            <option value="">Select timeframe</option>
            <option value="6months">6 months</option>
            <option value="1year">1 year</option>
            <option value="2years">2 years</option>
            <option value="5years">5+ years</option>
          </select>
        </div>

        <Button
          onClick={handleSubmit}
          disabled={goals.length === 0 || !timeframe || isSubmitting}
          className="w-full"
        >
          {isSubmitting ? 'Saving Goals...' : 'Continue to Preferences'}
        </Button>
      </Card>
    </motion.div>
  );
};
'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '../Button';
import { Card } from '../Card';
import { TechComfortLevel, AIGuidanceResponse } from '@/lib/services/ai-onboarding-assistant.service';
import { Bell, Mail, MessageSquare, Calendar, HelpCircle } from 'lucide-react';

interface PersonalizedPreferencesStepProps {
  memberId: string;
  techComfortLevel: TechComfortLevel;
  onComplete: (data: any) => void;
  onError: () => void;
  onRetry: () => void;
  aiGuidance: AIGuidanceResponse | null;
}

export const PersonalizedPreferencesStep: React.FC<PersonalizedPreferencesStepProps> = ({
  memberId,
  techComfortLevel,
  onComplete,
  onError,
  onRetry,
  aiGuidance
}) => {
  const [preferences, setPreferences] = useState({
    notifications: {
      email: true,
      sms: false,
      push: true
    },
    communication: {
      frequency: 'weekly',
      topics: [] as string[]
    },
    dashboard: {
      layout: 'simple',
      widgets: [] as string[]
    }
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      onComplete({ preferences });
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
              <h4 className="font-medium text-blue-900 mb-1">AI Assistant</h4>
              <p className="text-blue-800 text-sm">{aiGuidance.message}</p>
            </div>
          </div>
        </Card>
      )}

      <Card className="p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">
          Customize Your Experience
        </h3>
        
        <div className="space-y-6">
          <div>
            <h4 className="font-medium text-gray-900 mb-3 flex items-center">
              <Bell className="w-5 h-5 mr-2" />
              Notification Preferences
            </h4>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={preferences.notifications.email}
                  onChange={(e) => setPreferences(prev => ({
                    ...prev,
                    notifications: { ...prev.notifications, email: e.target.checked }
                  }))}
                  className="mr-2"
                />
                Email notifications
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={preferences.notifications.push}
                  onChange={(e) => setPreferences(prev => ({
                    ...prev,
                    notifications: { ...prev.notifications, push: e.target.checked }
                  }))}
                  className="mr-2"
                />
                Browser notifications
              </label>
            </div>
          </div>

          <div>
            <h4 className="font-medium text-gray-900 mb-3">
              Communication Frequency
            </h4>
            <select
              value={preferences.communication.frequency}
              onChange={(e) => setPreferences(prev => ({
                ...prev,
                communication: { ...prev.communication, frequency: e.target.value }
              }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="daily">Daily updates</option>
              <option value="weekly">Weekly digest</option>
              <option value="monthly">Monthly summary</option>
            </select>
          </div>
        </div>

        <Button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="w-full mt-6"
        >
          {isSubmitting ? 'Saving Preferences...' : 'Continue to Verification'}
        </Button>
      </Card>
    </motion.div>
  );
};
'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '../Button';
import { Card } from '../Card';
import { TechComfortLevel, AIGuidanceResponse } from '@/lib/services/ai-onboarding-assistant.service';
import { Wrench, HardHat, Building, Zap, CheckCircle, HelpCircle } from 'lucide-react';

interface GuidedSkillsAssessmentStepProps {
  memberId: string;
  techComfortLevel: TechComfortLevel;
  onComplete: (data: any) => void;
  onError: () => void;
  onRetry: () => void;
  aiGuidance: AIGuidanceResponse | null;
}

interface SkillCategory {
  id: string;
  name: string;
  icon: React.ComponentType<any>;
  description: string;
  skills: Array<{
    id: string;
    name: string;
    description: string;
  }>;
}

const skillCategories: SkillCategory[] = [
  {
    id: 'general_construction',
    name: 'General Construction',
    icon: Building,
    description: 'Basic construction and building skills',
    skills: [
      { id: 'framing', name: 'Framing', description: 'Wood and steel framing' },
      { id: 'concrete', name: 'Concrete Work', description: 'Pouring, finishing, and repair' },
      { id: 'roofing', name: 'Roofing', description: 'Installation and repair of roofing systems' },
      { id: 'siding', name: 'Siding & Exterior', description: 'Exterior wall systems and finishes' }
    ]
  },
  {
    id: 'trades',
    name: 'Specialized Trades',
    icon: Wrench,
    description: 'Specialized trade skills and certifications',
    skills: [
      { id: 'plumbing', name: 'Plumbing', description: 'Water, gas, and drainage systems' },
      { id: 'electrical', name: 'Electrical', description: 'Wiring, panels, and electrical systems' },
      { id: 'hvac', name: 'HVAC', description: 'Heating, ventilation, and air conditioning' },
      { id: 'flooring', name: 'Flooring', description: 'Installation of various flooring types' }
    ]
  },
  {
    id: 'safety',
    name: 'Safety & Compliance',
    icon: HardHat,
    description: 'Safety certifications and compliance knowledge',
    skills: [
      { id: 'osha', name: 'OSHA Certification', description: 'Occupational safety training' },
      { id: 'first_aid', name: 'First Aid/CPR', description: 'Emergency response training' },
      { id: 'hazmat', name: 'Hazmat Handling', description: 'Hazardous materials certification' },
      { id: 'fall_protection', name: 'Fall Protection', description: 'Height safety training' }
    ]
  },
  {
    id: 'equipment',
    name: 'Equipment & Machinery',
    icon: Zap,
    description: 'Heavy equipment and machinery operation',
    skills: [
      { id: 'excavator', name: 'Excavator Operation', description: 'Heavy excavation equipment' },
      { id: 'crane', name: 'Crane Operation', description: 'Mobile and tower cranes' },
      { id: 'forklift', name: 'Forklift Operation', description: 'Material handling equipment' },
      { id: 'welding', name: 'Welding', description: 'Various welding techniques and certifications' }
    ]
  }
];

export const GuidedSkillsAssessmentStep: React.FC<GuidedSkillsAssessmentStepProps> = ({
  memberId,
  techComfortLevel,
  onComplete,
  onError,
  onRetry,
  aiGuidance
}) => {
  const [selectedSkills, setSelectedSkills] = useState<Record<string, 'beginner' | 'intermediate' | 'expert'>>({});
  const [experienceYears, setExperienceYears] = useState<string>('');
  const [primaryFocus, setPrimaryFocus] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isBeginnerLevel = techComfortLevel.level === 'beginner';

  const handleSkillSelect = (skillId: string, level: 'beginner' | 'intermediate' | 'expert') => {
    setSelectedSkills(prev => ({
      ...prev,
      [skillId]: level
    }));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);

    try {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      
      onComplete({
        skills: selectedSkills,
        experienceYears,
        primaryFocus
      });
    } catch (error) {
      console.error('Failed to save skills assessment:', error);
      onError();
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedSkillsCount = Object.keys(selectedSkills).length;
  const canProceed = selectedSkillsCount > 0 && experienceYears && primaryFocus;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* AI Guidance */}
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
        <div className="mb-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Tell Us About Your Construction Skills
          </h3>
          <p className="text-gray-600">
            {isBeginnerLevel 
              ? "Don't worry if you're just starting out - every expert was once a beginner. Select any skills you have, even basic ones."
              : "Help us understand your expertise so we can connect you with the right opportunities."
            }
          </p>
        </div>

        {/* Experience and Focus */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Years of Construction Experience
            </label>
            <select
              value={experienceYears}
              onChange={(e) => setExperienceYears(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
            >
              <option value="">Select experience level</option>
              <option value="0-1">Less than 1 year</option>
              <option value="1-3">1-3 years</option>
              <option value="3-5">3-5 years</option>
              <option value="5-10">5-10 years</option>
              <option value="10+">10+ years</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Primary Construction Focus
            </label>
            <select
              value={primaryFocus}
              onChange={(e) => setPrimaryFocus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
            >
              <option value="">Select primary focus</option>
              <option value="residential">Residential Construction</option>
              <option value="commercial">Commercial Construction</option>
              <option value="industrial">Industrial Construction</option>
              <option value="infrastructure">Infrastructure/Civil</option>
              <option value="renovation">Renovation/Remodeling</option>
              <option value="specialty">Specialty Trade</option>
            </select>
          </div>
        </div>

        {/* Skills Categories */}
        <div className="space-y-6">
          <h4 className="text-lg font-semibold text-gray-900">
            Select Your Skills ({selectedSkillsCount} selected)
          </h4>
          
          {skillCategories.map((category) => (
            <div key={category.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center space-x-3 mb-4">
                <category.icon className="w-6 h-6 text-yellow-600" />
                <div>
                  <h5 className="font-semibold text-gray-900">{category.name}</h5>
                  <p className="text-sm text-gray-600">{category.description}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {category.skills.map((skill) => (
                  <div key={skill.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <h6 className="font-medium text-gray-900">{skill.name}</h6>
                        <p className="text-xs text-gray-600">{skill.description}</p>
                      </div>
                      {selectedSkills[skill.id] && (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      )}
                    </div>

                    <div className="flex space-x-2">
                      {(['beginner', 'intermediate', 'expert'] as const).map((level) => (
                        <button
                          key={level}
                          onClick={() => handleSkillSelect(skill.id, level)}
                          className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                            selectedSkills[skill.id] === level
                              ? 'bg-yellow-100 border-yellow-400 text-yellow-800'
                              : 'bg-white border-gray-300 text-gray-600 hover:border-gray-400'
                          }`}
                        >
                          {level.charAt(0).toUpperCase() + level.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {isBeginnerLevel && (
          <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <HelpCircle className="w-5 h-5 text-green-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-green-900 mb-1">Remember</h4>
                <p className="text-green-800 text-sm">
                  It's okay to select "Beginner" for skills you're learning. This helps us recommend 
                  training opportunities and connect you with mentors who can help you grow.
                </p>
              </div>
            </div>
          </div>
        )}
      </Card>

      <div className="flex justify-center">
        <Button
          onClick={handleSubmit}
          disabled={!canProceed || isSubmitting}
          className={`px-8 py-3 ${
            canProceed
              ? 'bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 text-white'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          {isSubmitting ? (
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
              <span>Saving Skills...</span>
            </div>
          ) : (
            'Continue to Business Goals'
          )}
        </Button>
      </div>

      {!canProceed && (
        <p className="text-center text-sm text-gray-500">
          Please select your experience level, primary focus, and at least one skill to continue
        </p>
      )}
    </motion.div>
  );
};
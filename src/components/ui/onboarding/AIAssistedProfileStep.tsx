'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '../Button';
import { Card } from '../Card';
import { Input } from '../Input';
import { TechComfortLevel, AIGuidanceResponse } from '@/lib/services/ai-onboarding-assistant.service';
import { User, Building, MapPin, Phone, Globe, HelpCircle, Lightbulb, CheckCircle } from 'lucide-react';

interface AIAssistedProfileStepProps {
  memberId: string;
  techComfortLevel: TechComfortLevel;
  onComplete: (data: any) => void;
  onError: () => void;
  onRetry: () => void;
  aiGuidance: AIGuidanceResponse | null;
}

interface ProfileField {
  id: string;
  label: string;
  type: 'text' | 'email' | 'tel' | 'url' | 'textarea' | 'select';
  icon: React.ComponentType<any>;
  required: boolean;
  placeholder: string;
  description: string;
  aiHelp: string;
  options?: Array<{ value: string; label: string }>;
}

const profileFields: ProfileField[] = [
  {
    id: 'firstName',
    label: 'First Name',
    type: 'text',
    icon: User,
    required: true,
    placeholder: 'Enter your first name',
    description: 'Your first name as you\'d like it to appear to other members',
    aiHelp: 'This is how other NAMC members will address you in the community.'
  },
  {
    id: 'lastName',
    label: 'Last Name',
    type: 'text',
    icon: User,
    required: true,
    placeholder: 'Enter your last name',
    description: 'Your last name for your professional profile',
    aiHelp: 'Your full name helps establish credibility in the construction industry.'
  },
  {
    id: 'company',
    label: 'Company Name',
    type: 'text',
    icon: Building,
    required: true,
    placeholder: 'Your construction company name',
    description: 'The name of your construction business or company',
    aiHelp: 'This is important for networking and project opportunities. If you don\'t have a company yet, you can use "Independent Contractor" or your name.'
  },
  {
    id: 'phone',
    label: 'Phone Number',
    type: 'tel',
    icon: Phone,
    required: true,
    placeholder: '(555) 123-4567',
    description: 'Your primary business phone number',
    aiHelp: 'This helps other members and potential clients contact you for opportunities.'
  },
  {
    id: 'location',
    label: 'Business Location',
    type: 'text',
    icon: MapPin,
    required: true,
    placeholder: 'City, State (e.g., Oakland, CA)',
    description: 'Where your business is located or where you primarily work',
    aiHelp: 'This helps match you with local projects and networking opportunities in your area.'
  },
  {
    id: 'website',
    label: 'Website (Optional)',
    type: 'url',
    icon: Globe,
    required: false,
    placeholder: 'https://yourcompany.com',
    description: 'Your business website if you have one',
    aiHelp: 'Don\'t worry if you don\'t have a website yet - NAMC can help you create one later!'
  },
  {
    id: 'businessType',
    label: 'Type of Construction Work',
    type: 'select',
    icon: Building,
    required: true,
    placeholder: 'Select your primary focus',
    description: 'What type of construction work do you primarily do?',
    aiHelp: 'This helps us connect you with relevant opportunities and other contractors in your specialty.',
    options: [
      { value: 'residential', label: 'Residential Construction' },
      { value: 'commercial', label: 'Commercial Construction' },
      { value: 'industrial', label: 'Industrial Construction' },
      { value: 'infrastructure', label: 'Infrastructure/Civil' },
      { value: 'specialty', label: 'Specialty Trade' },
      { value: 'general', label: 'General Contracting' },
      { value: 'multiple', label: 'Multiple Types' }
    ]
  }
];

export const AIAssistedProfileStep: React.FC<AIAssistedProfileStepProps> = ({
  memberId,
  techComfortLevel,
  onComplete,
  onError,
  onRetry,
  aiGuidance
}) => {
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAIHelp, setShowAIHelp] = useState<string | null>(null);
  const [completedFields, setCompletedFields] = useState<Set<string>>(new Set());

  const isBeginnerLevel = techComfortLevel.level === 'beginner';
  const requiredFields = profileFields.filter(field => field.required);
  const completedRequiredFields = requiredFields.filter(field => 
    formData[field.id] && formData[field.id].trim() !== ''
  ).length;
  const progressPercentage = (completedRequiredFields / requiredFields.length) * 100;

  const handleInputChange = (fieldId: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [fieldId]: value
    }));

    // Clear error when user starts typing
    if (errors[fieldId]) {
      setErrors(prev => ({
        ...prev,
        [fieldId]: ''
      }));
    }

    // Mark field as completed if it has content
    if (value.trim() !== '') {
      setCompletedFields(prev => new Set([...prev, fieldId]));
    } else {
      setCompletedFields(prev => {
        const newSet = new Set(prev);
        newSet.delete(fieldId);
        return newSet;
      });
    }
  };

  const handleFieldFocus = (fieldId: string) => {
    setFocusedField(fieldId);
    if (isBeginnerLevel) {
      setShowAIHelp(fieldId);
    }
  };

  const handleFieldBlur = () => {
    setFocusedField(null);
    if (isBeginnerLevel) {
      // Keep AI help visible for a moment
      setTimeout(() => setShowAIHelp(null), 2000);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    profileFields.forEach(field => {
      if (field.required && (!formData[field.id] || formData[field.id].trim() === '')) {
        newErrors[field.id] = `${field.label} is required`;
      } else if (field.type === 'email' && formData[field.id]) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData[field.id])) {
          newErrors[field.id] = 'Please enter a valid email address';
        }
      } else if (field.type === 'tel' && formData[field.id]) {
        const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
        const cleanPhone = formData[field.id].replace(/\D/g, '');
        if (cleanPhone.length < 10) {
          newErrors[field.id] = 'Please enter a valid phone number';
        }
      } else if (field.type === 'url' && formData[field.id] && formData[field.id].trim() !== '') {
        try {
          new URL(formData[field.id]);
        } catch {
          newErrors[field.id] = 'Please enter a valid website URL';
        }
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      onError();
      return;
    }

    setIsSubmitting(true);

    try {
      // Here you would typically save the profile data
      // For now, we'll just complete the step
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      
      onComplete({ profileData: formData });
    } catch (error) {
      console.error('Failed to save profile:', error);
      onError();
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderField = (field: ProfileField) => {
    const hasError = !!errors[field.id];
    const isCompleted = completedFields.has(field.id);
    const isFocused = focusedField === field.id;

    return (
      <motion.div
        key={field.id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-2"
      >
        <div className="flex items-center space-x-2">
          <field.icon className={`w-5 h-5 ${isCompleted ? 'text-green-500' : 'text-gray-400'}`} />
          <label className="text-sm font-medium text-gray-900">
            {field.label}
            {field.required && <span className="text-red-500 ml-1">*</span>}
          </label>
          {isCompleted && <CheckCircle className="w-4 h-4 text-green-500" />}
        </div>

        <div className="relative">
          {field.type === 'select' ? (
            <select
              value={formData[field.id] || ''}
              onChange={(e) => handleInputChange(field.id, e.target.value)}
              onFocus={() => handleFieldFocus(field.id)}
              onBlur={handleFieldBlur}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent ${
                hasError ? 'border-red-500' : isFocused ? 'border-yellow-500' : 'border-gray-300'
              }`}
            >
              <option value="">{field.placeholder}</option>
              {field.options?.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          ) : field.type === 'textarea' ? (
            <textarea
              value={formData[field.id] || ''}
              onChange={(e) => handleInputChange(field.id, e.target.value)}
              onFocus={() => handleFieldFocus(field.id)}
              onBlur={handleFieldBlur}
              placeholder={field.placeholder}
              rows={3}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent resize-none ${
                hasError ? 'border-red-500' : isFocused ? 'border-yellow-500' : 'border-gray-300'
              }`}
            />
          ) : (
            <Input
              type={field.type}
              value={formData[field.id] || ''}
              onChange={(e) => handleInputChange(field.id, e.target.value)}
              onFocus={() => handleFieldFocus(field.id)}
              onBlur={handleFieldBlur}
              placeholder={field.placeholder}
              className={hasError ? 'border-red-500' : isFocused ? 'border-yellow-500' : ''}
            />
          )}
        </div>

        {hasError && (
          <p className="text-sm text-red-600">{errors[field.id]}</p>
        )}

        <p className="text-sm text-gray-600">{field.description}</p>

        {/* AI Help for beginners or when explicitly shown */}
        {(showAIHelp === field.id || (isBeginnerLevel && isFocused)) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-blue-50 border border-blue-200 rounded-lg p-3"
          >
            <div className="flex items-start space-x-2">
              <Lightbulb className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-blue-800">{field.aiHelp}</p>
            </div>
          </motion.div>
        )}
      </motion.div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Progress Indicator */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700">
            Profile Completion
          </span>
          <span className="text-sm text-gray-500">
            {completedRequiredFields} of {requiredFields.length} required fields
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

      {/* AI Guidance */}
      {aiGuidance && (
        <Card className="p-4 bg-yellow-50 border-yellow-200">
          <div className="flex items-start space-x-3">
            <HelpCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-yellow-900 mb-1">AI Assistant</h4>
              <p className="text-yellow-800 text-sm">{aiGuidance.message}</p>
              {aiGuidance.suggestions.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {aiGuidance.suggestions.map((suggestion, index) => (
                    <li key={index} className="text-yellow-700 text-sm flex items-start">
                      <span className="w-1 h-1 bg-yellow-400 rounded-full mt-2 mr-2 flex-shrink-0" />
                      {suggestion}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Profile Form */}
      <Card className="p-6">
        <div className="mb-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Complete Your Professional Profile
          </h3>
          <p className="text-gray-600">
            {isBeginnerLevel 
              ? "Don't worry - I'll guide you through each field with helpful explanations."
              : "Fill out your professional information to connect with opportunities and other members."
            }
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {profileFields.map(renderField)}
        </div>

        {/* Helpful Tips for Beginners */}
        {isBeginnerLevel && (
          <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <Lightbulb className="w-5 h-5 text-green-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-green-900 mb-1">Helpful Tips</h4>
                <ul className="text-green-800 text-sm space-y-1">
                  <li>• Click on any field to see specific guidance</li>
                  <li>• Required fields are marked with a red asterisk (*)</li>
                  <li>• You can always update this information later</li>
                  <li>• Your information helps other members find and connect with you</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Submit Button */}
      <div className="flex justify-center">
        <Button
          onClick={handleSubmit}
          disabled={completedRequiredFields < requiredFields.length || isSubmitting}
          className={`px-8 py-3 ${
            completedRequiredFields >= requiredFields.length
              ? 'bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 text-white'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          {isSubmitting ? (
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
              <span>Saving Profile...</span>
            </div>
          ) : (
            'Continue to Skills Assessment'
          )}
        </Button>
      </div>

      {completedRequiredFields < requiredFields.length && (
        <p className="text-center text-sm text-gray-500">
          Please complete all required fields to continue
        </p>
      )}
    </motion.div>
  );
};
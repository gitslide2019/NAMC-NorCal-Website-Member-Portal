'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  Globe, 
  Mail, 
  Building, 
  FileText, 
  CheckCircle, 
  AlertCircle,
  Loader2,
  Info
} from 'lucide-react';

interface WebsiteRequestFormProps {
  onSuccess?: (requestId: string) => void;
  onCancel?: () => void;
}

interface FormData {
  businessName: string;
  businessType: string;
  businessFocus: string;
  domainPreference: string;
  useNamcSubdomain: boolean;
  professionalEmail: string;
  businessDescription: string;
  servicesOffered: string;
  yearsInBusiness: string;
  licenseNumbers: string;
  certifications: string;
  serviceAreas: string;
  includePortfolio: boolean;
  includeSocialImpact: boolean;
  includeTestimonials: boolean;
  includeBlog: boolean;
  customRequests: string;
}

const businessTypes = [
  'RESIDENTIAL',
  'COMMERCIAL', 
  'INDUSTRIAL',
  'MIXED'
];

export function WebsiteRequestForm({ onSuccess, onCancel }: WebsiteRequestFormProps) {
  const [formData, setFormData] = useState<FormData>({
    businessName: '',
    businessType: 'RESIDENTIAL',
    businessFocus: '',
    domainPreference: '',
    useNamcSubdomain: true,
    professionalEmail: '',
    businessDescription: '',
    servicesOffered: '',
    yearsInBusiness: '',
    licenseNumbers: '',
    certifications: '',
    serviceAreas: '',
    includePortfolio: true,
    includeSocialImpact: true,
    includeTestimonials: true,
    includeBlog: false,
    customRequests: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 4;

  const handleInputChange = (field: keyof FormData, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        return !!(formData.businessName && formData.businessType);
      case 2:
        return !!(formData.businessDescription && formData.servicesOffered);
      case 3:
        return true; // Optional fields
      case 4:
        return true; // Website preferences
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (validateStep(currentStep) && currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/websites/requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to submit website request');
      }

      if (onSuccess) {
        onSuccess(result.request.id);
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <Building className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900">Business Information</h3>
              <p className="text-gray-600">Tell us about your contracting business</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Business Name *
                </label>
                <Input
                  value={formData.businessName}
                  onChange={(e) => handleInputChange('businessName', e.target.value)}
                  placeholder="Enter your business name"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Business Type *
                </label>
                <select
                  value={formData.businessType}
                  onChange={(e) => handleInputChange('businessType', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  required
                >
                  {businessTypes.map(type => (
                    <option key={type} value={type}>
                      {type.charAt(0) + type.slice(1).toLowerCase()}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Business Focus/Specialization
                </label>
                <Input
                  value={formData.businessFocus}
                  onChange={(e) => handleInputChange('businessFocus', e.target.value)}
                  placeholder="e.g., Green building, Historic renovation, etc."
                />
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <FileText className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900">Business Details</h3>
              <p className="text-gray-600">Provide details about your services and experience</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Business Description *
                </label>
                <textarea
                  value={formData.businessDescription}
                  onChange={(e) => handleInputChange('businessDescription', e.target.value)}
                  placeholder="Describe your business, mission, and what sets you apart"
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Services Offered *
                </label>
                <textarea
                  value={formData.servicesOffered}
                  onChange={(e) => handleInputChange('servicesOffered', e.target.value)}
                  placeholder="List the construction services you provide"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Years in Business
                  </label>
                  <Input
                    type="number"
                    value={formData.yearsInBusiness}
                    onChange={(e) => handleInputChange('yearsInBusiness', e.target.value)}
                    placeholder="0"
                    min="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Service Areas
                  </label>
                  <Input
                    value={formData.serviceAreas}
                    onChange={(e) => handleInputChange('serviceAreas', e.target.value)}
                    placeholder="e.g., Bay Area, Northern California"
                  />
                </div>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <CheckCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900">Credentials</h3>
              <p className="text-gray-600">Add your licenses and certifications</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  License Numbers
                </label>
                <Input
                  value={formData.licenseNumbers}
                  onChange={(e) => handleInputChange('licenseNumbers', e.target.value)}
                  placeholder="e.g., CA License #123456"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Certifications
                </label>
                <textarea
                  value={formData.certifications}
                  onChange={(e) => handleInputChange('certifications', e.target.value)}
                  placeholder="List any relevant certifications, training, or awards"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
                />
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <Globe className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900">Website Preferences</h3>
              <p className="text-gray-600">Customize your professional website</p>
            </div>

            <div className="space-y-6">
              {/* Domain Preferences */}
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900">Domain & Email</h4>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Preferred Domain Name
                  </label>
                  <Input
                    value={formData.domainPreference}
                    onChange={(e) => handleInputChange('domainPreference', e.target.value)}
                    placeholder="yourbusiness.com"
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="useNamcSubdomain"
                    checked={formData.useNamcSubdomain}
                    onChange={(e) => handleInputChange('useNamcSubdomain', e.target.checked)}
                    className="rounded border-gray-300 text-yellow-600 focus:ring-yellow-500"
                  />
                  <label htmlFor="useNamcSubdomain" className="text-sm text-gray-700">
                    Use NAMC subdomain if custom domain unavailable
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Professional Email
                  </label>
                  <Input
                    type="email"
                    value={formData.professionalEmail}
                    onChange={(e) => handleInputChange('professionalEmail', e.target.value)}
                    placeholder="info@yourbusiness.com"
                  />
                </div>
              </div>

              {/* Website Features */}
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900">Website Features</h4>
                
                <div className="space-y-3">
                  {[
                    { key: 'includePortfolio', label: 'Project Portfolio', description: 'Showcase your completed projects' },
                    { key: 'includeSocialImpact', label: 'Social Impact Metrics', description: 'Display community benefits and job creation' },
                    { key: 'includeTestimonials', label: 'Client Testimonials', description: 'Feature client reviews and feedback' },
                    { key: 'includeBlog', label: 'Blog/News Section', description: 'Share industry insights and company news' }
                  ].map(({ key, label, description }) => (
                    <div key={key} className="flex items-start space-x-3">
                      <input
                        type="checkbox"
                        id={key}
                        checked={formData[key as keyof FormData] as boolean}
                        onChange={(e) => handleInputChange(key as keyof FormData, e.target.checked)}
                        className="mt-1 rounded border-gray-300 text-yellow-600 focus:ring-yellow-500"
                      />
                      <div>
                        <label htmlFor={key} className="text-sm font-medium text-gray-900">
                          {label}
                        </label>
                        <p className="text-xs text-gray-600">{description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Custom Requests */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Special Requests or Customizations
                </label>
                <textarea
                  value={formData.customRequests}
                  onChange={(e) => handleInputChange('customRequests', e.target.value)}
                  placeholder="Any specific features, colors, or functionality you'd like included"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
                />
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Card className="max-w-2xl mx-auto p-6">
      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">
            Step {currentStep} of {totalSteps}
          </span>
          <span className="text-sm text-gray-500">
            {Math.round((currentStep / totalSteps) * 100)}% Complete
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-yellow-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${(currentStep / totalSteps) * 100}%` }}
          />
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert className="mb-6 border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <div className="text-red-800">{error}</div>
        </Alert>
      )}

      {/* Form Content */}
      <form onSubmit={handleSubmit}>
        {renderStepContent()}

        {/* Navigation Buttons */}
        <div className="flex justify-between mt-8 pt-6 border-t border-gray-200">
          <div>
            {currentStep > 1 && (
              <Button
                type="button"
                variant="outline"
                onClick={handlePrevious}
                disabled={isSubmitting}
              >
                Previous
              </Button>
            )}
          </div>

          <div className="flex space-x-3">
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
            )}

            {currentStep < totalSteps ? (
              <Button
                type="button"
                onClick={handleNext}
                disabled={!validateStep(currentStep) || isSubmitting}
                className="bg-yellow-500 hover:bg-yellow-600 text-black"
              >
                Next
              </Button>
            ) : (
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-yellow-500 hover:bg-yellow-600 text-black"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit Request'
                )}
              </Button>
            )}
          </div>
        </div>
      </form>

      {/* Info Box */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <div className="flex items-start space-x-2">
          <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">What happens next?</p>
            <ul className="space-y-1 text-blue-700">
              <li>• Your request will be reviewed by our admin team</li>
              <li>• You'll receive email updates on the progress</li>
              <li>• Typical turnaround time is 5-7 business days</li>
              <li>• Your professional website will include hosting and email setup</li>
            </ul>
          </div>
        </div>
      </div>
    </Card>
  );
}
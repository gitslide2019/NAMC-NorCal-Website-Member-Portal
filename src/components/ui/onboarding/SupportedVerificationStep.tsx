'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '../Button';
import { Card } from '../Card';
import { TechComfortLevel, AIGuidanceResponse } from '@/lib/services/ai-onboarding-assistant.service';
import { Upload, FileText, Shield, CheckCircle, HelpCircle, Camera } from 'lucide-react';

interface SupportedVerificationStepProps {
  memberId: string;
  techComfortLevel: TechComfortLevel;
  onComplete: (data: any) => void;
  onError: () => void;
  onRetry: () => void;
  aiGuidance: AIGuidanceResponse | null;
}

interface DocumentType {
  id: string;
  name: string;
  description: string;
  required: boolean;
  icon: React.ComponentType<any>;
  helpText: string;
}

const documentTypes: DocumentType[] = [
  {
    id: 'business_license',
    name: 'Business License',
    description: 'Your contractor\'s license or business registration',
    required: true,
    icon: Shield,
    helpText: 'This verifies you\'re a legitimate contractor. Take a clear photo of your license.'
  },
  {
    id: 'insurance',
    name: 'Insurance Certificate',
    description: 'Proof of liability insurance',
    required: true,
    icon: FileText,
    helpText: 'This protects you and your clients. Upload your current insurance certificate.'
  },
  {
    id: 'certifications',
    name: 'Certifications (Optional)',
    description: 'Trade certifications, OSHA training, etc.',
    required: false,
    icon: FileText,
    helpText: 'These help showcase your expertise and may unlock special opportunities.'
  }
];

export const SupportedVerificationStep: React.FC<SupportedVerificationStepProps> = ({
  memberId,
  techComfortLevel,
  onComplete,
  onError,
  onRetry,
  aiGuidance
}) => {
  const [uploadedDocs, setUploadedDocs] = useState<Record<string, File | null>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dragOver, setDragOver] = useState<string | null>(null);

  const isBeginnerLevel = techComfortLevel.level === 'beginner';
  const requiredDocs = documentTypes.filter(doc => doc.required);
  const uploadedRequiredDocs = requiredDocs.filter(doc => uploadedDocs[doc.id]).length;
  const canProceed = uploadedRequiredDocs === requiredDocs.length;

  const handleFileUpload = (docId: string, file: File) => {
    setUploadedDocs(prev => ({
      ...prev,
      [docId]: file
    }));
  };

  const handleDragOver = (e: React.DragEvent, docId: string) => {
    e.preventDefault();
    setDragOver(docId);
  };

  const handleDragLeave = () => {
    setDragOver(null);
  };

  const handleDrop = (e: React.DragEvent, docId: string) => {
    e.preventDefault();
    setDragOver(null);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileUpload(docId, files[0]);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate upload
      onComplete({ documents: uploadedDocs });
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
        <div className="mb-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Document Verification
          </h3>
          <p className="text-gray-600">
            {isBeginnerLevel 
              ? "Don't worry - I'll guide you through uploading each document step by step."
              : "Upload your required documents to complete your member verification."
            }
          </p>
        </div>

        <div className="space-y-6">
          {documentTypes.map((docType) => {
            const isUploaded = !!uploadedDocs[docType.id];
            const isDraggedOver = dragOver === docType.id;

            return (
              <div key={docType.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start space-x-3">
                    <docType.icon className={`w-6 h-6 mt-1 ${isUploaded ? 'text-green-500' : 'text-gray-400'}`} />
                    <div>
                      <h4 className="font-medium text-gray-900 flex items-center">
                        {docType.name}
                        {docType.required && <span className="text-red-500 ml-1">*</span>}
                        {isUploaded && <CheckCircle className="w-4 h-4 text-green-500 ml-2" />}
                      </h4>
                      <p className="text-sm text-gray-600">{docType.description}</p>
                    </div>
                  </div>
                </div>

                {isBeginnerLevel && (
                  <div className="mb-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <div className="flex items-start space-x-2">
                      <HelpCircle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-yellow-800">{docType.helpText}</p>
                    </div>
                  </div>
                )}

                <div
                  className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                    isDraggedOver
                      ? 'border-yellow-400 bg-yellow-50'
                      : isUploaded
                      ? 'border-green-400 bg-green-50'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                  onDragOver={(e) => handleDragOver(e, docType.id)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, docType.id)}
                >
                  {isUploaded ? (
                    <div className="space-y-2">
                      <CheckCircle className="w-8 h-8 text-green-500 mx-auto" />
                      <p className="text-sm font-medium text-green-700">
                        {uploadedDocs[docType.id]?.name}
                      </p>
                      <p className="text-xs text-green-600">Document uploaded successfully</p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const input = document.createElement('input');
                          input.type = 'file';
                          input.accept = 'image/*,.pdf';
                          input.onchange = (e) => {
                            const file = (e.target as HTMLInputElement).files?.[0];
                            if (file) handleFileUpload(docType.id, file);
                          };
                          input.click();
                        }}
                      >
                        Replace Document
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <Upload className="w-8 h-8 text-gray-400 mx-auto" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {isBeginnerLevel ? 'Click to select your document' : 'Drop your document here, or click to select'}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Supports: JPG, PNG, PDF (max 10MB)
                        </p>
                      </div>
                      
                      <div className="flex justify-center space-x-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const input = document.createElement('input');
                            input.type = 'file';
                            input.accept = 'image/*,.pdf';
                            input.onchange = (e) => {
                              const file = (e.target as HTMLInputElement).files?.[0];
                              if (file) handleFileUpload(docType.id, file);
                            };
                            input.click();
                          }}
                        >
                          <Upload className="w-4 h-4 mr-2" />
                          Choose File
                        </Button>
                        
                        {isBeginnerLevel && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              // This would open camera functionality
                              alert('Camera feature would open here');
                            }}
                          >
                            <Camera className="w-4 h-4 mr-2" />
                            Take Photo
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {isBeginnerLevel && (
          <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <HelpCircle className="w-5 h-5 text-green-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-green-900 mb-1">Need Help?</h4>
                <ul className="text-green-800 text-sm space-y-1">
                  <li>• Make sure documents are clear and readable</li>
                  <li>• You can take photos with your phone camera</li>
                  <li>• Documents should be current and valid</li>
                  <li>• Contact support if you need assistance: (555) 123-4567</li>
                </ul>
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
              <span>Uploading Documents...</span>
            </div>
          ) : (
            'Complete Onboarding'
          )}
        </Button>
      </div>

      {!canProceed && (
        <p className="text-center text-sm text-gray-500">
          Please upload all required documents ({uploadedRequiredDocs}/{requiredDocs.length} completed)
        </p>
      )}
    </motion.div>
  );
};
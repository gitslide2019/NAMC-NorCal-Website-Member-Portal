'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { WebsiteRequestForm } from '@/components/ui/WebsiteRequestForm';
import { WebsiteRequestDashboard } from '@/components/ui/WebsiteRequestDashboard';
import { WebsiteMaintenanceDashboard } from '@/components/ui/WebsiteMaintenanceDashboard';
import { 
  Globe, 
  Plus, 
  ArrowLeft,
  CheckCircle,
  Info
} from 'lucide-react';

export default function MemberWebsitesPage() {
  const [showForm, setShowForm] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [activeWebsite, setActiveWebsite] = useState<any>(null);
  const [showMaintenance, setShowMaintenance] = useState(false);

  const handleFormSuccess = (newRequestId: string) => {
    setRequestId(newRequestId);
    setShowForm(false);
    setShowSuccess(true);
    
    // Hide success message after 5 seconds
    setTimeout(() => {
      setShowSuccess(false);
    }, 5000);
  };

  const handleFormCancel = () => {
    setShowForm(false);
  };

  if (showForm) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-6">
            <Button
              variant="outline"
              onClick={handleFormCancel}
              className="mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Websites
            </Button>
            <h1 className="text-3xl font-bold text-gray-900">Request Professional Website</h1>
            <p className="text-gray-600 mt-2">
              Get a professional website for your contracting business with hosting and email included
            </p>
          </div>

          <WebsiteRequestForm
            onSuccess={handleFormSuccess}
            onCancel={handleFormCancel}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                <Globe className="h-8 w-8 text-yellow-500 mr-3" />
                Professional Websites
              </h1>
              <p className="text-gray-600 mt-2">
                Get a professional website for your contracting business
              </p>
            </div>
            <Button
              onClick={() => setShowForm(true)}
              className="bg-yellow-500 hover:bg-yellow-600 text-black"
            >
              <Plus className="h-4 w-4 mr-2" />
              Request Website
            </Button>
          </div>
        </div>

        {/* Success Message */}
        {showSuccess && requestId && (
          <Card className="mb-6 p-6 border-green-200 bg-green-50">
            <div className="flex items-start space-x-3">
              <CheckCircle className="h-6 w-6 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="text-lg font-semibold text-green-900 mb-2">
                  Website Request Submitted Successfully!
                </h3>
                <p className="text-green-800 mb-3">
                  Your professional website request has been submitted and is now under review by our admin team.
                </p>
                <div className="text-sm text-green-700">
                  <p><strong>Request ID:</strong> {requestId}</p>
                  <p><strong>Next Steps:</strong></p>
                  <ul className="list-disc list-inside mt-1 space-y-1">
                    <li>You'll receive email updates on the progress</li>
                    <li>Our team will review your request within 1-2 business days</li>
                    <li>Typical turnaround time is 5-7 business days after approval</li>
                    <li>Your website will include professional hosting and email setup</li>
                  </ul>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Globe className="h-6 w-6 text-yellow-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Professional Design</h3>
            </div>
            <p className="text-gray-600 text-sm">
              Get a modern, responsive website designed specifically for contractors with your branding and content.
            </p>
          </Card>

          <Card className="p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Info className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Everything Included</h3>
            </div>
            <p className="text-gray-600 text-sm">
              Domain registration, professional hosting, email setup, and ongoing maintenance all included.
            </p>
          </Card>

          <Card className="p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Quick Turnaround</h3>
            </div>
            <p className="text-gray-600 text-sm">
              Most websites are completed within 5-7 business days after approval with ongoing support.
            </p>
          </Card>
        </div>

        {/* Website Features */}
        <Card className="mb-8 p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">What's Included</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              'Responsive mobile-friendly design',
              'Professional domain name',
              'Business email addresses',
              'Project portfolio showcase',
              'Social impact metrics display',
              'Client testimonials section',
              'Contact forms and lead capture',
              'SEO optimization',
              'Google Analytics integration',
              'Ongoing hosting and maintenance',
              'Security updates and backups',
              'Technical support'
            ].map((feature, index) => (
              <div key={index} className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                <span className="text-sm text-gray-700">{feature}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Website Requests Dashboard */}
        <WebsiteRequestDashboard 
          isAdmin={false} 
          onWebsiteSelect={(website) => {
            setActiveWebsite(website);
            setShowMaintenance(true);
          }}
        />

        {/* Website Maintenance Dashboard Modal */}
        {showMaintenance && activeWebsite && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-semibold text-gray-900">
                    Website Management - {activeWebsite.domainName}
                  </h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShowMaintenance(false);
                      setActiveWebsite(null);
                    }}
                  >
                    Close
                  </Button>
                </div>

                <WebsiteMaintenanceDashboard
                  websiteId={activeWebsite.id}
                  websiteUrl={activeWebsite.websiteUrl}
                  domainName={activeWebsite.domainName}
                  isAdmin={false}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
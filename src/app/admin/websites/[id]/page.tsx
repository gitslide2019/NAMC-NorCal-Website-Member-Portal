'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/badge';
import { Alert } from '@/components/ui/alert';
import { WebsiteMaintenanceDashboard } from '@/components/ui/WebsiteMaintenanceDashboard';
import { 
  Globe, 
  User, 
  Calendar, 
  ExternalLink,
  ArrowLeft,
  Settings,
  BarChart3,
  FileText,
  AlertTriangle,
  CheckCircle,
  Edit,
  Trash2,
  Download
} from 'lucide-react';

interface WebsiteDetails {
  id: string;
  websiteUrl: string;
  domainName: string;
  professionalEmail?: string;
  status: string;
  templateVersion: string;
  monthlyVisitors: number;
  leadsGenerated: number;
  createdAt: string;
  lastContentUpdate?: string;
  member: {
    id: string;
    name?: string;
    email: string;
    company?: string;
    memberType: string;
  };
  websiteRequest: {
    businessName: string;
    businessType: string;
    businessDescription?: string;
    servicesOffered?: string;
    requestedAt: string;
  };
}

export default function AdminWebsiteDetailsPage() {
  const params = useParams();
  const websiteId = params.id as string;
  
  const [website, setWebsite] = useState<WebsiteDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'maintenance' | 'analytics' | 'content'>('overview');
  const [analytics, setAnalytics] = useState<any>(null);

  useEffect(() => {
    if (websiteId) {
      fetchWebsiteDetails();
    }
  }, [websiteId]);

  const fetchWebsiteDetails = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/websites/requests/${websiteId}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch website details');
      }

      setWebsite(result.request);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const response = await fetch(`/api/websites/${websiteId}/analytics`);
      const result = await response.json();

      if (response.ok) {
        setAnalytics(result.analytics);
      }
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !website) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <div className="text-red-800">{error || 'Website not found'}</div>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-4 mb-4">
            <Button
              variant="outline"
              onClick={() => window.history.back()}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div className="flex items-center space-x-2">
              <Globe className="h-6 w-6 text-yellow-500" />
              <h1 className="text-2xl font-bold text-gray-900">
                {website.websiteRequest.businessName}
              </h1>
              <Badge className={website.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                {website.status}
              </Badge>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6 text-sm text-gray-600">
              <div className="flex items-center space-x-2">
                <User className="h-4 w-4" />
                <span>{website.member.name || website.member.email}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4" />
                <span>Created {formatDate(website.createdAt)}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Globe className="h-4 w-4" />
                <span>{website.domainName}</span>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <Button
                variant="outline"
                onClick={() => window.open(website.websiteUrl, '_blank')}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Visit Website
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  // Download website backup
                  alert('Website backup download started');
                }}
              >
                <Download className="h-4 w-4 mr-2" />
                Download Backup
              </Button>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200 mb-8">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'overview', label: 'Overview', icon: FileText },
              { id: 'maintenance', label: 'Maintenance', icon: Settings },
              { id: 'analytics', label: 'Analytics', icon: BarChart3 },
              { id: 'content', label: 'Content', icon: Edit }
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => {
                  setActiveTab(id as any);
                  if (id === 'analytics' && !analytics) {
                    fetchAnalytics();
                  }
                }}
                className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === id
                    ? 'border-yellow-500 text-yellow-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Website Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Monthly Visitors</p>
                    <p className="text-2xl font-bold text-gray-900">{website.monthlyVisitors}</p>
                  </div>
                  <div className="p-3 bg-blue-100 rounded-full">
                    <BarChart3 className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Leads Generated</p>
                    <p className="text-2xl font-bold text-gray-900">{website.leadsGenerated}</p>
                  </div>
                  <div className="p-3 bg-green-100 rounded-full">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Template Version</p>
                    <p className="text-2xl font-bold text-gray-900">{website.templateVersion}</p>
                  </div>
                  <div className="p-3 bg-purple-100 rounded-full">
                    <Settings className="h-6 w-6 text-purple-600" />
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Member Type</p>
                    <p className="text-2xl font-bold text-gray-900">{website.member.memberType}</p>
                  </div>
                  <div className="p-3 bg-yellow-100 rounded-full">
                    <User className="h-6 w-6 text-yellow-600" />
                  </div>
                </div>
              </Card>
            </div>

            {/* Website Information */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Website Details</h3>
                <div className="space-y-3">
                  <div>
                    <span className="text-sm font-medium text-gray-700">URL:</span>
                    <p className="text-gray-900">{website.websiteUrl}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-700">Domain:</span>
                    <p className="text-gray-900">{website.domainName}</p>
                  </div>
                  {website.professionalEmail && (
                    <div>
                      <span className="text-sm font-medium text-gray-700">Professional Email:</span>
                      <p className="text-gray-900">{website.professionalEmail}</p>
                    </div>
                  )}
                  <div>
                    <span className="text-sm font-medium text-gray-700">Status:</span>
                    <Badge className={website.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                      {website.status}
                    </Badge>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-700">Last Updated:</span>
                    <p className="text-gray-900">
                      {website.lastContentUpdate ? formatDate(website.lastContentUpdate) : 'Never'}
                    </p>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Member Information</h3>
                <div className="space-y-3">
                  <div>
                    <span className="text-sm font-medium text-gray-700">Name:</span>
                    <p className="text-gray-900">{website.member.name || 'Not provided'}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-700">Email:</span>
                    <p className="text-gray-900">{website.member.email}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-700">Company:</span>
                    <p className="text-gray-900">{website.member.company || 'Not provided'}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-700">Member Type:</span>
                    <Badge className="bg-blue-100 text-blue-800">
                      {website.member.memberType}
                    </Badge>
                  </div>
                </div>
              </Card>
            </div>

            {/* Business Information */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Business Information</h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <span className="text-sm font-medium text-gray-700">Business Name:</span>
                  <p className="text-gray-900 mt-1">{website.websiteRequest.businessName}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-700">Business Type:</span>
                  <p className="text-gray-900 mt-1">{website.websiteRequest.businessType}</p>
                </div>
                {website.websiteRequest.businessDescription && (
                  <div className="lg:col-span-2">
                    <span className="text-sm font-medium text-gray-700">Description:</span>
                    <p className="text-gray-900 mt-1">{website.websiteRequest.businessDescription}</p>
                  </div>
                )}
                {website.websiteRequest.servicesOffered && (
                  <div className="lg:col-span-2">
                    <span className="text-sm font-medium text-gray-700">Services Offered:</span>
                    <p className="text-gray-900 mt-1">{website.websiteRequest.servicesOffered}</p>
                  </div>
                )}
              </div>
            </Card>
          </div>
        )}

        {activeTab === 'maintenance' && (
          <WebsiteMaintenanceDashboard
            websiteId={website.id}
            websiteUrl={website.websiteUrl}
            domainName={website.domainName}
            isAdmin={true}
          />
        )}

        {activeTab === 'analytics' && (
          <div className="space-y-6">
            {analytics ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <Card className="p-6">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {analytics.monthlyVisitors}
                      </div>
                      <div className="text-sm text-gray-600">Monthly Visitors</div>
                    </div>
                  </Card>
                  <Card className="p-6">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {analytics.leadsGenerated}
                      </div>
                      <div className="text-sm text-gray-600">Leads Generated</div>
                    </div>
                  </Card>
                  <Card className="p-6">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">
                        {analytics.pageViews}
                      </div>
                      <div className="text-sm text-gray-600">Page Views</div>
                    </div>
                  </Card>
                  <Card className="p-6">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-600">
                        {(analytics.bounceRate * 100).toFixed(1)}%
                      </div>
                      <div className="text-sm text-gray-600">Bounce Rate</div>
                    </div>
                  </Card>
                </div>

                <Card className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Pages</h3>
                  <div className="space-y-3">
                    {analytics.topPages.map((page: any, index: number) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="font-medium text-gray-900">{page.page}</span>
                        <span className="text-gray-600">{page.views} views</span>
                      </div>
                    ))}
                  </div>
                </Card>
              </>
            ) : (
              <Card className="p-8 text-center">
                <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Loading Analytics</h3>
                <p className="text-gray-600">Fetching website analytics data...</p>
              </Card>
            )}
          </div>
        )}

        {activeTab === 'content' && (
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Content Management</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button variant="outline" className="justify-start h-auto p-4">
                  <div className="text-left">
                    <div className="font-medium">Update Business Information</div>
                    <div className="text-sm text-gray-600">Modify business description and services</div>
                  </div>
                </Button>
                <Button variant="outline" className="justify-start h-auto p-4">
                  <div className="text-left">
                    <div className="font-medium">Manage Project Portfolio</div>
                    <div className="text-sm text-gray-600">Add or update project showcases</div>
                  </div>
                </Button>
                <Button variant="outline" className="justify-start h-auto p-4">
                  <div className="text-left">
                    <div className="font-medium">Update Social Impact Metrics</div>
                    <div className="text-sm text-gray-600">Refresh community impact data</div>
                  </div>
                </Button>
                <Button variant="outline" className="justify-start h-auto p-4">
                  <div className="text-left">
                    <div className="font-medium">Manage Testimonials</div>
                    <div className="text-sm text-gray-600">Add or edit client testimonials</div>
                  </div>
                </Button>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/badge';
import { WebsiteRequestDashboard } from '@/components/ui/WebsiteRequestDashboard';
import { 
  Globe, 
  Users, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  TrendingUp,
  Settings,
  Plus
} from 'lucide-react';

interface WebsiteStats {
  totalRequests: number;
  pendingRequests: number;
  completedWebsites: number;
  averageCompletionTime: number;
  monthlyRequests: number;
  activeWebsites: number;
}

export default function AdminWebsitesPage() {
  const [stats, setStats] = useState<WebsiteStats>({
    totalRequests: 0,
    pendingRequests: 0,
    completedWebsites: 0,
    averageCompletionTime: 0,
    monthlyRequests: 0,
    activeWebsites: 0
  });

  const [showTemplateManager, setShowTemplateManager] = useState(false);

  // Mock stats - in real implementation, fetch from API
  React.useEffect(() => {
    // Simulate API call
    setStats({
      totalRequests: 24,
      pendingRequests: 5,
      completedWebsites: 19,
      averageCompletionTime: 6.2,
      monthlyRequests: 8,
      activeWebsites: 17
    });
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                <Globe className="h-8 w-8 text-yellow-500 mr-3" />
                Website Management
              </h1>
              <p className="text-gray-600 mt-2">
                Manage member website requests and generation
              </p>
            </div>
            <div className="flex space-x-3">
              <Button
                variant="outline"
                onClick={() => setShowTemplateManager(true)}
              >
                <Settings className="h-4 w-4 mr-2" />
                Templates
              </Button>
              <Button className="bg-yellow-500 hover:bg-yellow-600 text-black">
                <Plus className="h-4 w-4 mr-2" />
                Bulk Operations
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Requests</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalRequests}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <Globe className="h-6 w-6 text-blue-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center">
              <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
              <span className="text-sm text-green-600">+{stats.monthlyRequests} this month</span>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending Review</p>
                <p className="text-2xl font-bold text-gray-900">{stats.pendingRequests}</p>
              </div>
              <div className="p-3 bg-yellow-100 rounded-full">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
            <div className="mt-4">
              {stats.pendingRequests > 0 ? (
                <Badge className="bg-yellow-100 text-yellow-800">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Needs Attention
                </Badge>
              ) : (
                <Badge className="bg-green-100 text-green-800">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  All Caught Up
                </Badge>
              )}
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Completed Sites</p>
                <p className="text-2xl font-bold text-gray-900">{stats.completedWebsites}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
            </div>
            <div className="mt-4">
              <span className="text-sm text-gray-600">
                {stats.activeWebsites} currently active
              </span>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg. Completion</p>
                <p className="text-2xl font-bold text-gray-900">{stats.averageCompletionTime} days</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-full">
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
            </div>
            <div className="mt-4">
              <span className="text-sm text-gray-600">Target: 7 days</span>
            </div>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card className="mb-8 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button
              variant="outline"
              className="justify-start h-auto p-4"
              onClick={() => {
                // Navigate to pending requests
                const pendingFilter = document.querySelector('select[value="all"]') as HTMLSelectElement;
                if (pendingFilter) {
                  pendingFilter.value = 'PENDING';
                  pendingFilter.dispatchEvent(new Event('change', { bubbles: true }));
                }
              }}
            >
              <div className="text-left">
                <div className="font-medium">Review Pending Requests</div>
                <div className="text-sm text-gray-600">{stats.pendingRequests} requests waiting</div>
              </div>
            </Button>

            <Button
              variant="outline"
              className="justify-start h-auto p-4"
              onClick={() => setShowTemplateManager(true)}
            >
              <div className="text-left">
                <div className="font-medium">Manage Templates</div>
                <div className="text-sm text-gray-600">Update website templates</div>
              </div>
            </Button>

            <Button
              variant="outline"
              className="justify-start h-auto p-4"
            >
              <div className="text-left">
                <div className="font-medium">Performance Reports</div>
                <div className="text-sm text-gray-600">View analytics and metrics</div>
              </div>
            </Button>
          </div>
        </Card>

        {/* Website Request Management */}
        <WebsiteRequestDashboard 
          isAdmin={true} 
          onWebsiteSelect={(website) => {
            // Handle website selection for admin management
            window.open(`/admin/websites/${website.id}`, '_blank');
          }}
        />

        {/* Template Manager Modal */}
        {showTemplateManager && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-semibold text-gray-900">
                    Website Template Manager
                  </h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowTemplateManager(false)}
                  >
                    Close
                  </Button>
                </div>

                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Template 1 */}
                    <Card className="p-4">
                      <div className="aspect-video bg-gray-200 rounded-lg mb-4 flex items-center justify-center">
                        <Globe className="h-12 w-12 text-gray-400" />
                      </div>
                      <h4 className="font-medium text-gray-900 mb-2">Professional Contractor v1.0</h4>
                      <p className="text-sm text-gray-600 mb-4">
                        Clean, modern design with project portfolio and contact forms
                      </p>
                      <div className="flex items-center justify-between">
                        <Badge className="bg-green-100 text-green-800">Active</Badge>
                        <div className="flex space-x-2">
                          <Button size="sm" variant="outline">Edit</Button>
                          <Button size="sm" variant="outline">Preview</Button>
                        </div>
                      </div>
                    </Card>

                    {/* Template 2 */}
                    <Card className="p-4">
                      <div className="aspect-video bg-gray-200 rounded-lg mb-4 flex items-center justify-center">
                        <Globe className="h-12 w-12 text-gray-400" />
                      </div>
                      <h4 className="font-medium text-gray-900 mb-2">Social Impact Focus v1.0</h4>
                      <p className="text-sm text-gray-600 mb-4">
                        Emphasizes community impact and social responsibility metrics
                      </p>
                      <div className="flex items-center justify-between">
                        <Badge className="bg-blue-100 text-blue-800">Beta</Badge>
                        <div className="flex space-x-2">
                          <Button size="sm" variant="outline">Edit</Button>
                          <Button size="sm" variant="outline">Preview</Button>
                        </div>
                      </div>
                    </Card>
                  </div>

                  <div className="border-t pt-6">
                    <h4 className="font-medium text-gray-900 mb-4">Template Settings</h4>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Default Template
                        </label>
                        <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500">
                          <option>Professional Contractor v1.0</option>
                          <option>Social Impact Focus v1.0</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Auto-approval for Premium Members
                        </label>
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="autoApproval"
                            className="rounded border-gray-300 text-yellow-600 focus:ring-yellow-500"
                          />
                          <label htmlFor="autoApproval" className="text-sm text-gray-700">
                            Automatically approve website requests from Premium and Executive members
                          </label>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Estimated Completion Time
                        </label>
                        <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500">
                          <option>5 business days</option>
                          <option>7 business days</option>
                          <option>10 business days</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex justify-end space-x-3 mt-6">
                      <Button variant="outline">Reset to Defaults</Button>
                      <Button className="bg-yellow-500 hover:bg-yellow-600 text-black">
                        Save Settings
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
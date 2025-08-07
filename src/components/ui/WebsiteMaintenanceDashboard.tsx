'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/badge';
import { Alert } from '@/components/ui/alert';
import { 
  Shield, 
  Database, 
  Activity, 
  Clock, 
  AlertTriangle,
  CheckCircle,
  Settings,
  ExternalLink,
  RefreshCw,
  FileText,
  MessageSquare,
  Zap,
  TrendingUp,
  Calendar
} from 'lucide-react';

interface MaintenanceStatus {
  lastBackup: string | null;
  lastSecurityUpdate: string | null;
  nextScheduledMaintenance: string | null;
  pendingTasks: number;
  healthStatus: 'healthy' | 'warning' | 'critical';
  uptime: number;
}

interface PerformanceMetrics {
  uptime: number;
  responseTime: number;
  pageLoadSpeed: number;
  sslStatus: string;
  lastChecked: string;
}

interface WebsiteMaintenanceDashboardProps {
  websiteId: string;
  websiteUrl: string;
  domainName: string;
  isAdmin?: boolean;
}

const healthStatusColors = {
  healthy: 'bg-green-100 text-green-800',
  warning: 'bg-yellow-100 text-yellow-800',
  critical: 'bg-red-100 text-red-800'
};

const healthStatusIcons = {
  healthy: CheckCircle,
  warning: AlertTriangle,
  critical: AlertTriangle
};

export function WebsiteMaintenanceDashboard({ 
  websiteId, 
  websiteUrl, 
  domainName,
  isAdmin = false 
}: WebsiteMaintenanceDashboardProps) {
  const [maintenanceStatus, setMaintenanceStatus] = useState<MaintenanceStatus | null>(null);
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showSupportForm, setShowSupportForm] = useState(false);
  const [supportTicket, setSupportTicket] = useState({
    subject: '',
    description: '',
    priority: 'medium',
    category: 'technical'
  });

  useEffect(() => {
    fetchMaintenanceStatus();
  }, [websiteId]);

  const fetchMaintenanceStatus = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/websites/${websiteId}/maintenance`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch maintenance status');
      }

      setMaintenanceStatus(result.maintenance);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleMaintenanceAction = async (action: string, data?: any) => {
    try {
      setActionLoading(action);
      const response = await fetch(`/api/websites/${websiteId}/maintenance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action, ...data }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Action failed');
      }

      if (action === 'performance_check') {
        setPerformanceMetrics(result.result.metrics);
      }

      // Refresh maintenance status
      await fetchMaintenanceStatus();
      
      setError(null);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setActionLoading(null);
    }
  };

  const handleSupportTicketSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setActionLoading('support_ticket');
      const response = await fetch('/api/websites/support', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          websiteId,
          ...supportTicket
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create support ticket');
      }

      setShowSupportForm(false);
      setSupportTicket({
        subject: '',
        description: '',
        priority: 'medium',
        category: 'technical'
      });
      
      alert('Support ticket created successfully!');

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create support ticket');
    } finally {
      setActionLoading(null);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500"></div>
      </div>
    );
  }

  if (!maintenanceStatus) {
    return (
      <Alert className="border-red-200 bg-red-50">
        <AlertTriangle className="h-4 w-4 text-red-600" />
        <div className="text-red-800">Failed to load maintenance status</div>
      </Alert>
    );
  }

  const HealthIcon = healthStatusIcons[maintenanceStatus.healthStatus];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <Settings className="h-6 w-6 text-yellow-500 mr-3" />
            Website Maintenance
          </h2>
          <p className="text-gray-600 mt-1">
            {domainName} - Maintenance and support dashboard
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button
            variant="outline"
            onClick={() => window.open(websiteUrl, '_blank')}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Visit Site
          </Button>
          <Button
            variant="outline"
            onClick={fetchMaintenanceStatus}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <div className="text-red-800">{error}</div>
        </Alert>
      )}

      {/* Health Status Overview */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Health Status</h3>
          <Badge className={healthStatusColors[maintenanceStatus.healthStatus]}>
            <HealthIcon className="h-4 w-4 mr-1" />
            {maintenanceStatus.healthStatus.charAt(0).toUpperCase() + maintenanceStatus.healthStatus.slice(1)}
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {maintenanceStatus.uptime.toFixed(1)}%
            </div>
            <div className="text-sm text-gray-600">Uptime</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {maintenanceStatus.pendingTasks}
            </div>
            <div className="text-sm text-gray-600">Pending Tasks</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {performanceMetrics?.responseTime || '--'}ms
            </div>
            <div className="text-sm text-gray-600">Response Time</div>
          </div>
        </div>
      </Card>

      {/* Maintenance Activities */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Last Backup */}
        <Card className="p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Database className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h4 className="font-medium text-gray-900">Last Backup</h4>
              <p className="text-sm text-gray-600">
                {formatDate(maintenanceStatus.lastBackup)}
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleMaintenanceAction('backup')}
            disabled={actionLoading === 'backup'}
            className="w-full"
          >
            {actionLoading === 'backup' ? 'Creating...' : 'Create Backup'}
          </Button>
        </Card>

        {/* Security Updates */}
        <Card className="p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 bg-green-100 rounded-lg">
              <Shield className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <h4 className="font-medium text-gray-900">Security Update</h4>
              <p className="text-sm text-gray-600">
                {formatDate(maintenanceStatus.lastSecurityUpdate)}
              </p>
            </div>
          </div>
          {isAdmin && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleMaintenanceAction('security_update')}
              disabled={actionLoading === 'security_update'}
              className="w-full"
            >
              {actionLoading === 'security_update' ? 'Updating...' : 'Run Update'}
            </Button>
          )}
        </Card>

        {/* Performance Check */}
        <Card className="p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Activity className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <h4 className="font-medium text-gray-900">Performance</h4>
              <p className="text-sm text-gray-600">
                {performanceMetrics ? 
                  `${performanceMetrics.responseTime}ms avg` : 
                  'Click to check'
                }
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleMaintenanceAction('performance_check')}
            disabled={actionLoading === 'performance_check'}
            className="w-full"
          >
            {actionLoading === 'performance_check' ? 'Checking...' : 'Check Performance'}
          </Button>
        </Card>
      </div>

      {/* Performance Metrics */}
      {performanceMetrics && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <TrendingUp className="h-5 w-5 mr-2" />
            Performance Metrics
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-lg font-semibold text-gray-900">
                {performanceMetrics.uptime}%
              </div>
              <div className="text-sm text-gray-600">Uptime</div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-lg font-semibold text-gray-900">
                {performanceMetrics.responseTime}ms
              </div>
              <div className="text-sm text-gray-600">Response Time</div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-lg font-semibold text-gray-900">
                {performanceMetrics.pageLoadSpeed}ms
              </div>
              <div className="text-sm text-gray-600">Page Load</div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-lg font-semibold text-gray-900">
                {performanceMetrics.sslStatus}
              </div>
              <div className="text-sm text-gray-600">SSL Status</div>
            </div>
          </div>
          <div className="mt-4 text-xs text-gray-500">
            Last checked: {formatDate(performanceMetrics.lastChecked)}
          </div>
        </Card>
      )}

      {/* Quick Actions */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Button
            variant="outline"
            onClick={() => setShowSupportForm(true)}
            className="justify-start h-auto p-4"
          >
            <div className="flex items-center">
              <MessageSquare className="h-5 w-5 mr-3" />
              <div className="text-left">
                <div className="font-medium">Get Support</div>
                <div className="text-sm text-gray-600">Create support ticket</div>
              </div>
            </div>
          </Button>

          <Button
            variant="outline"
            onClick={() => handleMaintenanceAction('generate_report', { period: 'month' })}
            disabled={actionLoading === 'generate_report'}
            className="justify-start h-auto p-4"
          >
            <div className="flex items-center">
              <FileText className="h-5 w-5 mr-3" />
              <div className="text-left">
                <div className="font-medium">Generate Report</div>
                <div className="text-sm text-gray-600">Monthly maintenance report</div>
              </div>
            </div>
          </Button>

          {isAdmin && (
            <Button
              variant="outline"
              onClick={() => handleMaintenanceAction('schedule_maintenance', {
                type: 'performance_check',
                scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
              })}
              disabled={actionLoading === 'schedule_maintenance'}
              className="justify-start h-auto p-4"
            >
              <div className="flex items-center">
                <Calendar className="h-5 w-5 mr-3" />
                <div className="text-left">
                  <div className="font-medium">Schedule Maintenance</div>
                  <div className="text-sm text-gray-600">Plan maintenance tasks</div>
                </div>
              </div>
            </Button>
          )}
        </div>
      </Card>

      {/* Support Ticket Form Modal */}
      {showSupportForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Create Support Ticket</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSupportForm(false)}
                >
                  Close
                </Button>
              </div>

              <form onSubmit={handleSupportTicketSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Subject *
                  </label>
                  <input
                    type="text"
                    value={supportTicket.subject}
                    onChange={(e) => setSupportTicket(prev => ({ ...prev, subject: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description *
                  </label>
                  <textarea
                    value={supportTicket.description}
                    onChange={(e) => setSupportTicket(prev => ({ ...prev, description: e.target.value }))}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Priority
                    </label>
                    <select
                      value={supportTicket.priority}
                      onChange={(e) => setSupportTicket(prev => ({ ...prev, priority: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Category
                    </label>
                    <select
                      value={supportTicket.category}
                      onChange={(e) => setSupportTicket(prev => ({ ...prev, category: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    >
                      <option value="technical">Technical</option>
                      <option value="content">Content</option>
                      <option value="design">Design</option>
                      <option value="performance">Performance</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowSupportForm(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={actionLoading === 'support_ticket'}
                    className="bg-yellow-500 hover:bg-yellow-600 text-black"
                  >
                    {actionLoading === 'support_ticket' ? 'Creating...' : 'Create Ticket'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
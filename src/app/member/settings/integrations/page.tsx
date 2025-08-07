/**
 * Member Integrations Settings Page
 * Manage QuickBooks and other integrations
 */

'use client';

import React from 'react';
import { FinancialDashboard } from '@/components/ui/FinancialDashboard';
import { IntegrationStatus } from '@/components/ui/IntegrationStatus';
import { InvoiceTracker } from '@/components/ui/InvoiceTracker';
import { FinancialReports } from '@/components/ui/FinancialReports';
import { Card } from '@/components/ui/Card';
import { 
  DollarSign, 
  FileText, 
  BarChart3, 
  Settings,
  Zap
} from 'lucide-react';

export default function IntegrationsPage() {
  const [activeTab, setActiveTab] = React.useState('dashboard');

  const tabs = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: DollarSign,
      component: FinancialDashboard
    },
    {
      id: 'status',
      label: 'Connection',
      icon: Zap,
      component: IntegrationStatus
    },
    {
      id: 'invoices',
      label: 'Invoices',
      icon: FileText,
      component: InvoiceTracker
    },
    {
      id: 'reports',
      label: 'Reports',
      icon: BarChart3,
      component: FinancialReports
    }
  ];

  const ActiveComponent = tabs.find(tab => tab.id === activeTab)?.component || FinancialDashboard;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-2">
            <Settings className="h-8 w-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">Integration Settings</h1>
          </div>
          <p className="text-gray-600">
            Manage your QuickBooks integration and financial data synchronization
          </p>
        </div>

        {/* Navigation Tabs */}
        <Card className="mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 px-6">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm ${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </Card>

        {/* Active Tab Content */}
        <div className="space-y-6">
          <ActiveComponent />
        </div>

        {/* Help Section */}
        <Card className="mt-8 p-6 bg-blue-50 border-blue-200">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <div className="flex items-center justify-center h-8 w-8 rounded-full bg-blue-100">
                <Settings className="h-5 w-5 text-blue-600" />
              </div>
            </div>
            <div>
              <h3 className="text-lg font-medium text-blue-900">
                Need Help with QuickBooks Integration?
              </h3>
              <p className="mt-1 text-blue-800">
                Our integration automatically syncs your financial data, creates invoices from cost estimates, 
                and tracks expenses for tool maintenance and inventory. Contact support if you need assistance 
                with setup or troubleshooting.
              </p>
              <div className="mt-4">
                <a
                  href="mailto:support@namc-norcal.org"
                  className="text-blue-600 hover:text-blue-500 font-medium"
                >
                  Contact Support →
                </a>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
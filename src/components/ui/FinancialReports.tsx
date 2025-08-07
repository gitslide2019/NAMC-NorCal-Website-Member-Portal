/**
 * Financial Reports Component
 * Placeholder interface for generating financial reports from QuickBooks data
 */

'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useQuickBooks } from '@/hooks/useQuickBooks';
import { 
  BarChart3, 
  PieChart, 
  TrendingUp, 
  Download,
  Calendar,
  Filter,
  FileText,
  DollarSign,
  Building,
  Users,
  Clock
} from 'lucide-react';

interface ReportFilters {
  startDate: string;
  endDate: string;
  reportType: string;
  includeProjects: boolean;
  includeTools: boolean;
  includeShop: boolean;
}

export function FinancialReports() {
  const { connectionStatus } = useQuickBooks();
  
  const [filters, setFilters] = useState<ReportFilters>({
    startDate: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0], // Start of year
    endDate: new Date().toISOString().split('T')[0], // Today
    reportType: 'summary',
    includeProjects: true,
    includeTools: true,
    includeShop: true
  });
  
  const [generating, setGenerating] = useState(false);

  // Mock report data for display
  const mockReportData = {
    summary: {
      totalRevenue: 125750.00,
      totalExpenses: 78500.00,
      netIncome: 47250.00,
      projectRevenue: 98000.00,
      toolRentalRevenue: 15250.00,
      shopRevenue: 12500.00,
      toolMaintenanceExpenses: 8500.00,
      inventoryExpenses: 25000.00,
      operatingExpenses: 45000.00
    },
    trends: [
      { month: 'Jan', revenue: 18500, expenses: 12000 },
      { month: 'Feb', revenue: 22000, expenses: 14500 },
      { month: 'Mar', revenue: 19750, expenses: 13200 },
      { month: 'Apr', revenue: 25000, expenses: 16800 },
      { month: 'May', revenue: 21500, expenses: 14200 },
      { month: 'Jun', revenue: 19000, expenses: 8000 }
    ]
  };

  const reportTypes = [
    { value: 'summary', label: 'Financial Summary', description: 'Overview of revenue, expenses, and profit' },
    { value: 'detailed', label: 'Detailed P&L', description: 'Comprehensive profit and loss statement' },
    { value: 'cash_flow', label: 'Cash Flow', description: 'Cash inflows and outflows analysis' },
    { value: 'project_profitability', label: 'Project Profitability', description: 'Revenue and costs by project' },
    { value: 'tool_utilization', label: 'Tool Utilization', description: 'Tool rental revenue and maintenance costs' },
    { value: 'member_analysis', label: 'Member Analysis', description: 'Revenue breakdown by member activity' }
  ];

  const handleGenerateReport = async () => {
    setGenerating(true);
    
    // Simulate report generation
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // In production, this would call the actual report generation API
    console.log('Generating report with filters:', filters);
    
    setGenerating(false);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  if (!connectionStatus.connected) {
    return (
      <Card className="p-8 text-center">
        <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Financial Reports
        </h3>
        <p className="text-gray-600">
          Connect to QuickBooks to generate financial reports
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-xl font-semibold text-gray-900">Financial Reports</h3>
        <p className="text-gray-600">Generate comprehensive financial reports from your QuickBooks data</p>
      </div>

      {/* Report Configuration */}
      <Card className="p-6">
        <h4 className="text-lg font-medium mb-4">Report Configuration</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Start Date
            </label>
            <Input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              End Date
            </label>
            <Input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Report Type
            </label>
            <select
              value={filters.reportType}
              onChange={(e) => setFilters({ ...filters, reportType: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {reportTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Include Options */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Include Data From:
          </label>
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={filters.includeProjects}
                onChange={(e) => setFilters({ ...filters, includeProjects: e.target.checked })}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">Project Revenue</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={filters.includeTools}
                onChange={(e) => setFilters({ ...filters, includeTools: e.target.checked })}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">Tool Rentals</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={filters.includeShop}
                onChange={(e) => setFilters({ ...filters, includeShop: e.target.checked })}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">Shop Sales</span>
            </label>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            {reportTypes.find(type => type.value === filters.reportType)?.description}
          </div>
          
          <Button
            onClick={handleGenerateReport}
            disabled={generating}
            className="flex items-center space-x-2"
          >
            {generating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Generating...</span>
              </>
            ) : (
              <>
                <BarChart3 className="h-4 w-4" />
                <span>Generate Report</span>
              </>
            )}
          </Button>
        </div>
      </Card>

      {/* Report Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Financial Summary */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-medium">Financial Summary</h4>
            <PieChart className="h-5 w-5 text-gray-400" />
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <div className="flex items-center">
                <TrendingUp className="h-5 w-5 text-green-500 mr-2" />
                <span className="text-sm font-medium text-green-800">Total Revenue</span>
              </div>
              <span className="text-lg font-bold text-green-600">
                {formatCurrency(mockReportData.summary.totalRevenue)}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
              <div className="flex items-center">
                <TrendingUp className="h-5 w-5 text-red-500 mr-2 rotate-180" />
                <span className="text-sm font-medium text-red-800">Total Expenses</span>
              </div>
              <span className="text-lg font-bold text-red-600">
                {formatCurrency(mockReportData.summary.totalExpenses)}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center">
                <DollarSign className="h-5 w-5 text-blue-500 mr-2" />
                <span className="text-sm font-medium text-blue-800">Net Income</span>
              </div>
              <span className="text-lg font-bold text-blue-600">
                {formatCurrency(mockReportData.summary.netIncome)}
              </span>
            </div>
          </div>
        </Card>

        {/* Revenue Breakdown */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-medium">Revenue Breakdown</h4>
            <Building className="h-5 w-5 text-gray-400" />
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Project Revenue</span>
              <span className="font-medium">
                {formatCurrency(mockReportData.summary.projectRevenue)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Tool Rentals</span>
              <span className="font-medium">
                {formatCurrency(mockReportData.summary.toolRentalRevenue)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Shop Sales</span>
              <span className="font-medium">
                {formatCurrency(mockReportData.summary.shopRevenue)}
              </span>
            </div>
          </div>
        </Card>
      </div>

      {/* Available Reports */}
      <Card className="p-6">
        <h4 className="text-lg font-medium mb-4">Available Reports</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {reportTypes.map((report) => (
            <div
              key={report.value}
              className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 cursor-pointer transition-colors"
              onClick={() => setFilters({ ...filters, reportType: report.value })}
            >
              <div className="flex items-center justify-between mb-2">
                <h5 className="font-medium text-gray-900">{report.label}</h5>
                <FileText className="h-5 w-5 text-gray-400" />
              </div>
              <p className="text-sm text-gray-600">{report.description}</p>
              
              <div className="mt-3 flex items-center justify-between">
                <span className="text-xs text-gray-500">
                  <Clock className="h-3 w-3 inline mr-1" />
                  ~2 min to generate
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs"
                >
                  <Download className="h-3 w-3 mr-1" />
                  Export
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Placeholder for Future Features */}
      <Card className="p-6 bg-gray-50">
        <div className="text-center">
          <BarChart3 className="h-8 w-8 text-gray-400 mx-auto mb-2" />
          <h4 className="text-lg font-medium text-gray-900 mb-1">
            Advanced Analytics Coming Soon
          </h4>
          <p className="text-gray-600 text-sm">
            Interactive charts, trend analysis, and custom report builder will be available in future updates.
          </p>
        </div>
      </Card>
    </div>
  );
}
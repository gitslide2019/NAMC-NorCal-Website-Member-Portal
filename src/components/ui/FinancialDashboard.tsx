/**
 * Financial Dashboard Component
 * Displays QuickBooks financial data and connection status
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useQuickBooks } from '@/hooks/useQuickBooks';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  FileText, 
  RefreshCw, 
  AlertCircle,
  CheckCircle,
  XCircle,
  Settings,
  Download,
  Plus
} from 'lucide-react';

interface FinancialMetrics {
  totalRevenue: number;
  totalExpenses: number;
  netIncome: number;
  outstandingInvoices: number;
  recentTransactions: any[];
}

export function FinancialDashboard() {
  const {
    connectionStatus,
    loading,
    error,
    connectToQuickBooks,
    disconnectFromQuickBooks,
    testConnection,
    syncFinancialData,
    getFinancialSummary,
    refreshStatus,
    clearError
  } = useQuickBooks();

  const [financialMetrics, setFinancialMetrics] = useState<FinancialMetrics | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState<{
    success: boolean;
    synced: number;
    errors: string[];
  } | null>(null);

  // Load financial data when connected
  useEffect(() => {
    if (connectionStatus.connected) {
      loadFinancialData();
    }
  }, [connectionStatus.connected]);

  const loadFinancialData = async () => {
    try {
      const summary = await getFinancialSummary();
      if (summary) {
        setFinancialMetrics(summary);
      }
    } catch (error) {
      console.error('Error loading financial data:', error);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const result = await syncFinancialData();
      setLastSyncResult(result);
      
      if (result.success) {
        await loadFinancialData();
      }
    } catch (error) {
      console.error('Error syncing financial data:', error);
    } finally {
      setSyncing(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-6 w-6 animate-spin text-blue-500" />
        <span className="ml-2 text-gray-600">Loading financial data...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Financial Dashboard</h2>
          <p className="text-gray-600">Manage your QuickBooks integration and financial data</p>
        </div>
        
        <div className="flex items-center space-x-3">
          {connectionStatus.connected && (
            <Button
              onClick={handleSync}
              disabled={syncing}
              variant="outline"
              className="flex items-center space-x-2"
            >
              <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
              <span>{syncing ? 'Syncing...' : 'Sync Data'}</span>
            </Button>
          )}
          
          <Button
            onClick={refreshStatus}
            variant="outline"
            className="flex items-center space-x-2"
          >
            <Settings className="h-4 w-4" />
            <span>Settings</span>
          </Button>
        </div>
      </div>

      {/* Connection Status */}
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {connectionStatus.connected ? (
              <CheckCircle className="h-6 w-6 text-green-500" />
            ) : (
              <XCircle className="h-6 w-6 text-red-500" />
            )}
            
            <div>
              <h3 className="text-lg font-semibold">
                QuickBooks {connectionStatus.connected ? 'Connected' : 'Not Connected'}
              </h3>
              
              {connectionStatus.connected ? (
                <div className="text-sm text-gray-600">
                  <p>Company: {connectionStatus.companyName}</p>
                  {connectionStatus.connectedDate && (
                    <p>Connected: {new Date(connectionStatus.connectedDate).toLocaleDateString()}</p>
                  )}
                  {connectionStatus.lastSync && (
                    <p>Last sync: {new Date(connectionStatus.lastSync).toLocaleString()}</p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-600">
                  Connect to QuickBooks to sync your financial data
                </p>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {connectionStatus.connected ? (
              <Button
                onClick={disconnectFromQuickBooks}
                variant="outline"
                className="text-red-600 border-red-300 hover:bg-red-50"
              >
                Disconnect
              </Button>
            ) : (
              <Button
                onClick={connectToQuickBooks}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Connect QuickBooks
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Error Display */}
      {error && (
        <Card className="p-4 border-red-200 bg-red-50">
          <div className="flex items-center space-x-2">
            <AlertCircle className="h-5 w-5 text-red-500" />
            <div>
              <p className="text-red-800 font-medium">Error</p>
              <p className="text-red-700 text-sm">{error}</p>
            </div>
            <Button
              onClick={clearError}
              variant="outline"
              size="sm"
              className="ml-auto"
            >
              Dismiss
            </Button>
          </div>
        </Card>
      )}

      {/* Sync Results */}
      {lastSyncResult && (
        <Card className={`p-4 ${lastSyncResult.success ? 'border-green-200 bg-green-50' : 'border-yellow-200 bg-yellow-50'}`}>
          <div className="flex items-center space-x-2">
            {lastSyncResult.success ? (
              <CheckCircle className="h-5 w-5 text-green-500" />
            ) : (
              <AlertCircle className="h-5 w-5 text-yellow-500" />
            )}
            <div>
              <p className={`font-medium ${lastSyncResult.success ? 'text-green-800' : 'text-yellow-800'}`}>
                Sync {lastSyncResult.success ? 'Completed' : 'Completed with Warnings'}
              </p>
              <p className={`text-sm ${lastSyncResult.success ? 'text-green-700' : 'text-yellow-700'}`}>
                {lastSyncResult.synced} records synced
                {lastSyncResult.errors.length > 0 && `, ${lastSyncResult.errors.length} errors`}
              </p>
              {lastSyncResult.errors.length > 0 && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-sm font-medium">View Errors</summary>
                  <ul className="mt-1 text-sm space-y-1">
                    {lastSyncResult.errors.map((error, index) => (
                      <li key={index} className="text-red-600">• {error}</li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Financial Metrics */}
      {connectionStatus.connected && financialMetrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(financialMetrics.totalRevenue)}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Expenses</p>
                <p className="text-2xl font-bold text-red-600">
                  {formatCurrency(financialMetrics.totalExpenses)}
                </p>
              </div>
              <TrendingDown className="h-8 w-8 text-red-500" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Net Income</p>
                <p className={`text-2xl font-bold ${financialMetrics.netIncome >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(financialMetrics.netIncome)}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-blue-500" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Outstanding Invoices</p>
                <p className="text-2xl font-bold text-orange-600">
                  {formatCurrency(financialMetrics.outstandingInvoices)}
                </p>
              </div>
              <FileText className="h-8 w-8 text-orange-500" />
            </div>
          </Card>
        </div>
      )}

      {/* Quick Actions */}
      {connectionStatus.connected && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button
              variant="outline"
              className="flex items-center justify-center space-x-2 p-4 h-auto"
            >
              <Plus className="h-5 w-5" />
              <div className="text-left">
                <p className="font-medium">Create Invoice</p>
                <p className="text-sm text-gray-600">From cost estimate</p>
              </div>
            </Button>

            <Button
              variant="outline"
              className="flex items-center justify-center space-x-2 p-4 h-auto"
            >
              <FileText className="h-5 w-5" />
              <div className="text-left">
                <p className="font-medium">Track Expense</p>
                <p className="text-sm text-gray-600">Tool maintenance or inventory</p>
              </div>
            </Button>

            <Button
              variant="outline"
              className="flex items-center justify-center space-x-2 p-4 h-auto"
            >
              <Download className="h-5 w-5" />
              <div className="text-left">
                <p className="font-medium">Export Report</p>
                <p className="text-sm text-gray-600">Financial summary</p>
              </div>
            </Button>
          </div>
        </Card>
      )}

      {/* Placeholder for Future Features */}
      {!connectionStatus.connected && (
        <Card className="p-8 text-center">
          <div className="max-w-md mx-auto">
            <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Financial Management
            </h3>
            <p className="text-gray-600 mb-6">
              Connect your QuickBooks account to automatically sync invoices, expenses, 
              and financial data with your NAMC member portal.
            </p>
            <Button
              onClick={connectToQuickBooks}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Get Started with QuickBooks
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
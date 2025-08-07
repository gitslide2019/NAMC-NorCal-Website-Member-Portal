/**
 * Integration Status Component
 * Displays QuickBooks connection status and sync controls
 */

'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useQuickBooks } from '@/hooks/useQuickBooks';
import { 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  RefreshCw,
  Settings,
  Zap,
  Clock,
  Database,
  Wifi,
  WifiOff
} from 'lucide-react';

export function IntegrationStatus() {
  const {
    connectionStatus,
    loading,
    error,
    connectToQuickBooks,
    disconnectFromQuickBooks,
    testConnection,
    syncFinancialData,
    refreshStatus,
    clearError
  } = useQuickBooks();

  const [testing, setTesting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    companyInfo?: any;
    error?: string;
  } | null>(null);

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    
    try {
      const result = await testConnection();
      setTestResult(result);
    } catch (error) {
      setTestResult({
        success: false,
        error: error instanceof Error ? error.message : 'Test failed'
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    
    try {
      await syncFinancialData();
      await refreshStatus();
    } catch (error) {
      console.error('Sync error:', error);
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center">
          <RefreshCw className="h-6 w-6 animate-spin text-blue-500 mr-2" />
          <span className="text-gray-600">Loading integration status...</span>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Main Status Card */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            {connectionStatus.connected ? (
              <div className="flex items-center space-x-2">
                <Wifi className="h-6 w-6 text-green-500" />
                <CheckCircle className="h-6 w-6 text-green-500" />
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <WifiOff className="h-6 w-6 text-red-500" />
                <XCircle className="h-6 w-6 text-red-500" />
              </div>
            )}
            
            <div>
              <h3 className="text-lg font-semibold">
                QuickBooks Integration
              </h3>
              <p className="text-sm text-gray-600">
                {connectionStatus.connected ? 'Connected and Active' : 'Not Connected'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {connectionStatus.connected && (
              <>
                <Button
                  onClick={handleTestConnection}
                  disabled={testing}
                  variant="outline"
                  size="sm"
                  className="flex items-center space-x-1"
                >
                  <Zap className={`h-4 w-4 ${testing ? 'animate-pulse' : ''}`} />
                  <span>{testing ? 'Testing...' : 'Test'}</span>
                </Button>
                
                <Button
                  onClick={handleSync}
                  disabled={syncing}
                  variant="outline"
                  size="sm"
                  className="flex items-center space-x-1"
                >
                  <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
                  <span>{syncing ? 'Syncing...' : 'Sync'}</span>
                </Button>
              </>
            )}
            
            <Button
              onClick={refreshStatus}
              variant="outline"
              size="sm"
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Connection Details */}
        {connectionStatus.connected ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Company:</span>
                <span className="text-sm font-medium">{connectionStatus.companyName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Realm ID:</span>
                <span className="text-sm font-mono text-gray-800">
                  {connectionStatus.realmId?.slice(-8)}...
                </span>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Connected:</span>
                <span className="text-sm font-medium">
                  {connectionStatus.connectedDate ? 
                    new Date(connectionStatus.connectedDate).toLocaleDateString() : 
                    'Unknown'
                  }
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Last Sync:</span>
                <span className="text-sm font-medium">
                  {connectionStatus.lastSync ? 
                    new Date(connectionStatus.lastSync).toLocaleString() : 
                    'Never'
                  }
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-gray-600 mb-4">
              Connect your QuickBooks account to sync financial data with your NAMC member portal.
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-center space-x-3">
          {connectionStatus.connected ? (
            <Button
              onClick={disconnectFromQuickBooks}
              variant="outline"
              className="text-red-600 border-red-300 hover:bg-red-50"
            >
              Disconnect QuickBooks
            </Button>
          ) : (
            <Button
              onClick={connectToQuickBooks}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Connect to QuickBooks
            </Button>
          )}
        </div>
      </Card>

      {/* Error Display */}
      {error && (
        <Card className="p-4 border-red-200 bg-red-50">
          <div className="flex items-start space-x-3">
            <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-red-800 font-medium">Connection Error</h4>
              <p className="text-red-700 text-sm mt-1">{error}</p>
            </div>
            <Button
              onClick={clearError}
              variant="outline"
              size="sm"
              className="text-red-600 border-red-300 hover:bg-red-100"
            >
              Dismiss
            </Button>
          </div>
        </Card>
      )}

      {/* Test Results */}
      {testResult && (
        <Card className={`p-4 ${testResult.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
          <div className="flex items-start space-x-3">
            {testResult.success ? (
              <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
            ) : (
              <XCircle className="h-5 w-5 text-red-500 mt-0.5" />
            )}
            <div className="flex-1">
              <h4 className={`font-medium ${testResult.success ? 'text-green-800' : 'text-red-800'}`}>
                Connection Test {testResult.success ? 'Successful' : 'Failed'}
              </h4>
              {testResult.success && testResult.companyInfo && (
                <div className="mt-2 text-sm text-green-700">
                  <p>Company: {testResult.companyInfo.name}</p>
                  <p>Legal Name: {testResult.companyInfo.legalName}</p>
                  {testResult.companyInfo.email && (
                    <p>Email: {testResult.companyInfo.email}</p>
                  )}
                </div>
              )}
              {testResult.error && (
                <p className="text-red-700 text-sm mt-1">{testResult.error}</p>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Sync Status */}
      {connectionStatus.connected && (
        <Card className="p-6">
          <h4 className="text-lg font-medium mb-4">Sync Status</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg">
              <Database className="h-6 w-6 text-blue-500" />
              <div>
                <p className="text-sm font-medium text-blue-800">Data Sync</p>
                <p className="text-xs text-blue-600">
                  {connectionStatus.lastSync ? 'Up to date' : 'Pending'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg">
              <CheckCircle className="h-6 w-6 text-green-500" />
              <div>
                <p className="text-sm font-medium text-green-800">Invoices</p>
                <p className="text-xs text-green-600">Synced</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3 p-3 bg-yellow-50 rounded-lg">
              <Clock className="h-6 w-6 text-yellow-500" />
              <div>
                <p className="text-sm font-medium text-yellow-800">Expenses</p>
                <p className="text-xs text-yellow-600">Pending</p>
              </div>
            </div>
          </div>
          
          <div className="mt-4 text-center">
            <p className="text-sm text-gray-600">
              Automatic sync runs every hour. Last sync: {' '}
              {connectionStatus.lastSync ? 
                new Date(connectionStatus.lastSync).toLocaleString() : 
                'Never'
              }
            </p>
          </div>
        </Card>
      )}

      {/* Integration Features */}
      <Card className="p-6">
        <h4 className="text-lg font-medium mb-4">Available Features</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-start space-x-3">
            <CheckCircle className={`h-5 w-5 mt-0.5 ${connectionStatus.connected ? 'text-green-500' : 'text-gray-400'}`} />
            <div>
              <p className="font-medium">Invoice Generation</p>
              <p className="text-sm text-gray-600">Create invoices from cost estimates</p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3">
            <CheckCircle className={`h-5 w-5 mt-0.5 ${connectionStatus.connected ? 'text-green-500' : 'text-gray-400'}`} />
            <div>
              <p className="font-medium">Expense Tracking</p>
              <p className="text-sm text-gray-600">Track tool maintenance and inventory costs</p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3">
            <CheckCircle className={`h-5 w-5 mt-0.5 ${connectionStatus.connected ? 'text-green-500' : 'text-gray-400'}`} />
            <div>
              <p className="font-medium">Member Payments</p>
              <p className="text-sm text-gray-600">Track dues and service payments</p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3">
            <CheckCircle className={`h-5 w-5 mt-0.5 ${connectionStatus.connected ? 'text-green-500' : 'text-gray-400'}`} />
            <div>
              <p className="font-medium">Financial Reports</p>
              <p className="text-sm text-gray-600">Generate comprehensive financial reports</p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
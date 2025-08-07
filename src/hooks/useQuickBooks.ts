/**
 * QuickBooks Integration Hook
 * Manages QuickBooks connection, authentication, and basic operations
 */

import { useState, useEffect, useCallback } from 'react';

export interface QuickBooksConnectionStatus {
  connected: boolean;
  companyName?: string;
  realmId?: string;
  connectedDate?: string;
  lastSync?: string;
}

export interface QuickBooksCompanyInfo {
  id: string;
  name: string;
  legalName: string;
  address: {
    line1?: string;
    city?: string;
    countrySubDivisionCode?: string;
    postalCode?: string;
    country?: string;
  };
  phone?: string;
  email?: string;
  website?: string;
}

export function useQuickBooks() {
  const [connectionStatus, setConnectionStatus] = useState<QuickBooksConnectionStatus>({
    connected: false
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch current connection status
   */
  const fetchConnectionStatus = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/quickbooks/status');
      
      if (!response.ok) {
        throw new Error('Failed to fetch connection status');
      }

      const status = await response.json();
      setConnectionStatus(status);
    } catch (err) {
      console.error('Error fetching QuickBooks status:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setConnectionStatus({ connected: false });
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Initiate QuickBooks OAuth flow
   */
  const connectToQuickBooks = useCallback(async () => {
    try {
      setError(null);

      const response = await fetch('/api/quickbooks/auth');
      
      if (!response.ok) {
        throw new Error('Failed to initiate QuickBooks connection');
      }

      const { authUrl } = await response.json();
      
      // Redirect to QuickBooks OAuth
      window.location.href = authUrl;
    } catch (err) {
      console.error('Error connecting to QuickBooks:', err);
      setError(err instanceof Error ? err.message : 'Failed to connect to QuickBooks');
    }
  }, []);

  /**
   * Disconnect from QuickBooks
   */
  const disconnectFromQuickBooks = useCallback(async () => {
    try {
      setError(null);

      const response = await fetch('/api/quickbooks/status', {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        throw new Error('Failed to disconnect from QuickBooks');
      }

      setConnectionStatus({ connected: false });
    } catch (err) {
      console.error('Error disconnecting from QuickBooks:', err);
      setError(err instanceof Error ? err.message : 'Failed to disconnect from QuickBooks');
    }
  }, []);

  /**
   * Test QuickBooks connection
   */
  const testConnection = useCallback(async (): Promise<{
    success: boolean;
    companyInfo?: QuickBooksCompanyInfo;
    error?: string;
  }> => {
    try {
      setError(null);

      const response = await fetch('/api/quickbooks/test');
      
      if (!response.ok) {
        const errorData = await response.json();
        return {
          success: false,
          error: errorData.error || 'Connection test failed'
        };
      }

      const result = await response.json();
      return {
        success: result.connected,
        companyInfo: result.companyInfo,
        error: result.error
      };
    } catch (err) {
      console.error('Error testing QuickBooks connection:', err);
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Connection test failed'
      };
    }
  }, []);

  /**
   * Sync financial data
   */
  const syncFinancialData = useCallback(async (): Promise<{
    success: boolean;
    synced: number;
    errors: string[];
  }> => {
    try {
      setError(null);

      const response = await fetch('/api/quickbooks/sync', {
        method: 'POST'
      });
      
      if (!response.ok) {
        throw new Error('Failed to sync financial data');
      }

      const result = await response.json();
      return result;
    } catch (err) {
      console.error('Error syncing financial data:', err);
      return {
        success: false,
        synced: 0,
        errors: [err instanceof Error ? err.message : 'Sync failed']
      };
    }
  }, []);

  /**
   * Get financial summary
   */
  const getFinancialSummary = useCallback(async (): Promise<{
    totalRevenue: number;
    totalExpenses: number;
    netIncome: number;
    outstandingInvoices: number;
    recentTransactions: any[];
  } | null> => {
    try {
      setError(null);

      const response = await fetch('/api/quickbooks/summary');
      
      if (!response.ok) {
        throw new Error('Failed to fetch financial summary');
      }

      const summary = await response.json();
      return summary;
    } catch (err) {
      console.error('Error fetching financial summary:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch financial summary');
      return null;
    }
  }, []);

  /**
   * Create invoice from cost estimate
   */
  const createInvoiceFromEstimate = useCallback(async (
    costEstimateId: string,
    customerEmail: string,
    customerName: string,
    companyName?: string
  ): Promise<{ success: boolean; invoice?: any; error?: string }> => {
    try {
      setError(null);

      const response = await fetch('/api/quickbooks/invoices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: 'cost_estimate',
          sourceId: costEstimateId,
          customerEmail,
          customerName,
          companyName
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        return {
          success: false,
          error: errorData.error || 'Failed to create invoice'
        };
      }

      const result = await response.json();
      return {
        success: true,
        invoice: result.invoice
      };
    } catch (err) {
      console.error('Error creating invoice from estimate:', err);
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to create invoice'
      };
    }
  }, []);

  /**
   * Track member payment
   */
  const trackMemberPayment = useCallback(async (
    amount: number,
    paymentType: 'dues' | 'tool_rental' | 'shop_purchase' | 'other',
    description: string,
    orderId?: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      setError(null);

      const response = await fetch('/api/quickbooks/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          amount,
          paymentType,
          description,
          orderId
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        return {
          success: false,
          error: errorData.error || 'Failed to track payment'
        };
      }

      return { success: true };
    } catch (err) {
      console.error('Error tracking member payment:', err);
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to track payment'
      };
    }
  }, []);

  // Load connection status on mount
  useEffect(() => {
    fetchConnectionStatus();
  }, [fetchConnectionStatus]);

  // Handle URL parameters for OAuth callback results
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const quickbooksSuccess = urlParams.get('quickbooks_success');
    const quickbooksError = urlParams.get('quickbooks_error');

    if (quickbooksSuccess === 'connected') {
      // Refresh connection status after successful connection
      fetchConnectionStatus();
      
      // Clean up URL parameters
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('quickbooks_success');
      window.history.replaceState({}, '', newUrl.toString());
    }

    if (quickbooksError) {
      setError(`QuickBooks connection error: ${quickbooksError}`);
      
      // Clean up URL parameters
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('quickbooks_error');
      window.history.replaceState({}, '', newUrl.toString());
    }
  }, [fetchConnectionStatus]);

  return {
    connectionStatus,
    loading,
    error,
    connectToQuickBooks,
    disconnectFromQuickBooks,
    testConnection,
    syncFinancialData,
    getFinancialSummary,
    createInvoiceFromEstimate,
    trackMemberPayment,
    refreshStatus: fetchConnectionStatus,
    clearError: () => setError(null)
  };
}
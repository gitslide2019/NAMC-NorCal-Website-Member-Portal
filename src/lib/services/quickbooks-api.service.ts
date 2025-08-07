/**
 * QuickBooks API Service
 * Handles OAuth 2.0 authentication and basic API operations for financial data sync
 */

import { HubSpotBackboneService } from './hubspot-backbone.service';

export interface QuickBooksConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scope: string;
  baseUrl: string;
  discoveryDocument: string;
}

export interface QuickBooksTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  expires_at: number;
  scope: string;
  realmId: string;
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

export interface QuickBooksCustomer {
  id?: string;
  name: string;
  companyName?: string;
  billAddr?: {
    line1?: string;
    city?: string;
    countrySubDivisionCode?: string;
    postalCode?: string;
    country?: string;
  };
  primaryEmailAddr?: {
    address: string;
  };
  primaryPhone?: {
    freeFormNumber: string;
  };
  active: boolean;
}

export interface QuickBooksItem {
  id?: string;
  name: string;
  description?: string;
  type: 'Service' | 'Inventory' | 'NonInventory';
  unitPrice?: number;
  incomeAccountRef?: {
    value: string;
    name?: string;
  };
  active: boolean;
}

export interface QuickBooksInvoice {
  id?: string;
  customerRef: {
    value: string;
    name?: string;
  };
  line: Array<{
    amount: number;
    detailType: 'SalesItemLineDetail';
    salesItemLineDetail: {
      itemRef: {
        value: string;
        name?: string;
      };
      qty?: number;
      unitPrice?: number;
    };
  }>;
  totalAmt?: number;
  dueDate?: string;
  txnDate?: string;
  docNumber?: string;
  privateNote?: string;
}

export interface QuickBooksExpense {
  id?: string;
  accountRef: {
    value: string;
    name?: string;
  };
  paymentType: 'Cash' | 'Check' | 'CreditCard';
  totalAmt: number;
  txnDate: string;
  privateNote?: string;
  line: Array<{
    amount: number;
    detailType: 'AccountBasedExpenseLineDetail';
    accountBasedExpenseLineDetail: {
      accountRef: {
        value: string;
        name?: string;
      };
    };
  }>;
}

export class QuickBooksAPIService {
  private config: QuickBooksConfig;
  private hubspotService: HubSpotBackboneService;
  private tokens: QuickBooksTokens | null = null;
  private maxRetries = 3;
  private retryDelay = 1000; // 1 second

  constructor() {
    this.config = {
      clientId: process.env.QUICKBOOKS_CLIENT_ID || '',
      clientSecret: process.env.QUICKBOOKS_CLIENT_SECRET || '',
      redirectUri: process.env.QUICKBOOKS_REDIRECT_URI || `${process.env.NEXTAUTH_URL}/api/quickbooks/callback`,
      scope: 'com.intuit.quickbooks.accounting',
      baseUrl: process.env.QUICKBOOKS_BASE_URL || 'https://sandbox-quickbooks.api.intuit.com',
      discoveryDocument: 'https://appcenter.intuit.com/api/v1/OpenID_sandbox'
    };
    
    this.hubspotService = new HubSpotBackboneService();
  }

  /**
   * Generate OAuth 2.0 authorization URL
   */
  generateAuthUrl(state?: string): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      scope: this.config.scope,
      redirect_uri: this.config.redirectUri,
      response_type: 'code',
      access_type: 'offline',
      state: state || Math.random().toString(36).substring(7)
    });

    return `https://appcenter.intuit.com/connect/oauth2?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access tokens
   */
  async exchangeCodeForTokens(code: string, realmId: string): Promise<QuickBooksTokens> {
    try {
      const response = await this.makeRequest('POST', 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer', {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${Buffer.from(`${this.config.clientId}:${this.config.clientSecret}`).toString('base64')}`
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: this.config.redirectUri
        }).toString()
      });

      const tokenData = await response.json();
      
      this.tokens = {
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        token_type: tokenData.token_type,
        expires_in: tokenData.expires_in,
        expires_at: Date.now() + (tokenData.expires_in * 1000),
        scope: tokenData.scope,
        realmId
      };

      // Store tokens securely (in production, use encrypted storage)
      await this.storeTokens(this.tokens);

      return this.tokens;
    } catch (error) {
      console.error('Error exchanging code for tokens:', error);
      throw new Error('Failed to exchange authorization code for tokens');
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(): Promise<QuickBooksTokens> {
    if (!this.tokens?.refresh_token) {
      throw new Error('No refresh token available');
    }

    try {
      const response = await this.makeRequest('POST', 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer', {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${Buffer.from(`${this.config.clientId}:${this.config.clientSecret}`).toString('base64')}`
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: this.tokens.refresh_token
        }).toString()
      });

      const tokenData = await response.json();
      
      this.tokens = {
        ...this.tokens,
        access_token: tokenData.access_token,
        expires_in: tokenData.expires_in,
        expires_at: Date.now() + (tokenData.expires_in * 1000)
      };

      await this.storeTokens(this.tokens);

      return this.tokens;
    } catch (error) {
      console.error('Error refreshing access token:', error);
      throw new Error('Failed to refresh access token');
    }
  }

  /**
   * Check if access token is valid and refresh if needed
   */
  async ensureValidToken(): Promise<void> {
    if (!this.tokens) {
      this.tokens = await this.loadTokens();
    }

    if (!this.tokens) {
      throw new Error('No QuickBooks tokens available. Please authenticate first.');
    }

    // Check if token is expired (with 5 minute buffer)
    if (Date.now() >= (this.tokens.expires_at - 300000)) {
      await this.refreshAccessToken();
    }
  }

  /**
   * Make authenticated API request with retry logic
   */
  private async makeAuthenticatedRequest(
    method: string,
    endpoint: string,
    options: RequestInit = {}
  ): Promise<Response> {
    await this.ensureValidToken();

    const url = endpoint.startsWith('http') ? endpoint : `${this.config.baseUrl}/v3/company/${this.tokens!.realmId}/${endpoint}`;
    
    const headers = {
      'Authorization': `Bearer ${this.tokens!.access_token}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      ...options.headers
    };

    return this.makeRequest(method, url, { ...options, headers });
  }

  /**
   * Generic request method with retry logic
   */
  private async makeRequest(
    method: string,
    url: string,
    options: RequestInit = {},
    retryCount = 0
  ): Promise<Response> {
    try {
      const response = await fetch(url, {
        method,
        ...options
      });

      if (!response.ok) {
        if (response.status === 401 && retryCount === 0) {
          // Token might be expired, try to refresh
          if (this.tokens?.refresh_token) {
            await this.refreshAccessToken();
            return this.makeRequest(method, url, options, retryCount + 1);
          }
        }

        if (response.status >= 500 && retryCount < this.maxRetries) {
          // Server error, retry with exponential backoff
          await this.delay(this.retryDelay * Math.pow(2, retryCount));
          return this.makeRequest(method, url, options, retryCount + 1);
        }

        const errorText = await response.text();
        throw new Error(`QuickBooks API error: ${response.status} - ${errorText}`);
      }

      return response;
    } catch (error) {
      if (retryCount < this.maxRetries && this.isRetryableError(error)) {
        await this.delay(this.retryDelay * Math.pow(2, retryCount));
        return this.makeRequest(method, url, options, retryCount + 1);
      }
      throw error;
    }
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error: any): boolean {
    return (
      error.code === 'ECONNRESET' ||
      error.code === 'ETIMEDOUT' ||
      error.code === 'ENOTFOUND' ||
      error.message?.includes('network') ||
      error.message?.includes('timeout')
    );
  }

  /**
   * Delay utility for retry logic
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Store tokens securely (placeholder implementation)
   */
  private async storeTokens(tokens: QuickBooksTokens): Promise<void> {
    // In production, store tokens encrypted in database
    // For now, we'll store in memory and sync with HubSpot
    try {
      await this.hubspotService.updateMemberProperty('quickbooks_connected', 'true');
      await this.hubspotService.updateMemberProperty('quickbooks_realm_id', tokens.realmId);
      await this.hubspotService.updateMemberProperty('quickbooks_connected_date', new Date().toISOString());
    } catch (error) {
      console.error('Error storing QuickBooks connection status:', error);
    }
  }

  /**
   * Load tokens from secure storage (placeholder implementation)
   */
  private async loadTokens(): Promise<QuickBooksTokens | null> {
    // In production, load encrypted tokens from database
    // For now, return null to force re-authentication
    return null;
  }

  /**
   * Test connection to QuickBooks API
   */
  async testConnection(): Promise<{ connected: boolean; companyInfo?: QuickBooksCompanyInfo; error?: string }> {
    try {
      const companyInfo = await this.getCompanyInfo();
      return {
        connected: true,
        companyInfo
      };
    } catch (error) {
      return {
        connected: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get company information
   */
  async getCompanyInfo(): Promise<QuickBooksCompanyInfo> {
    const response = await this.makeAuthenticatedRequest('GET', 'companyinfo/1');
    const data = await response.json();
    
    const companyInfo = data.QueryResponse?.CompanyInfo?.[0];
    if (!companyInfo) {
      throw new Error('Company information not found');
    }

    return {
      id: companyInfo.Id,
      name: companyInfo.CompanyName,
      legalName: companyInfo.LegalName || companyInfo.CompanyName,
      address: {
        line1: companyInfo.CompanyAddr?.Line1,
        city: companyInfo.CompanyAddr?.City,
        countrySubDivisionCode: companyInfo.CompanyAddr?.CountrySubDivisionCode,
        postalCode: companyInfo.CompanyAddr?.PostalCode,
        country: companyInfo.CompanyAddr?.Country
      },
      phone: companyInfo.PrimaryPhone?.FreeFormNumber,
      email: companyInfo.Email?.Address,
      website: companyInfo.WebAddr?.URI
    };
  }

  /**
   * Disconnect from QuickBooks
   */
  async disconnect(): Promise<void> {
    try {
      if (this.tokens?.access_token) {
        // Revoke tokens
        await this.makeRequest('POST', 'https://developer.api.intuit.com/v2/oauth2/tokens/revoke', {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Basic ${Buffer.from(`${this.config.clientId}:${this.config.clientSecret}`).toString('base64')}`
          },
          body: new URLSearchParams({
            token: this.tokens.access_token
          }).toString()
        });
      }
    } catch (error) {
      console.error('Error revoking QuickBooks tokens:', error);
    } finally {
      this.tokens = null;
      
      // Update HubSpot connection status
      try {
        await this.hubspotService.updateMemberProperty('quickbooks_connected', 'false');
        await this.hubspotService.updateMemberProperty('quickbooks_disconnected_date', new Date().toISOString());
      } catch (error) {
        console.error('Error updating QuickBooks disconnection status:', error);
      }
    }
  }

  /**
   * Get connection status
   */
  async getConnectionStatus(): Promise<{
    connected: boolean;
    companyName?: string;
    realmId?: string;
    connectedDate?: string;
    lastSync?: string;
  }> {
    try {
      if (!this.tokens) {
        this.tokens = await this.loadTokens();
      }

      if (!this.tokens) {
        return { connected: false };
      }

      const companyInfo = await this.getCompanyInfo();
      
      return {
        connected: true,
        companyName: companyInfo.name,
        realmId: this.tokens.realmId,
        connectedDate: await this.hubspotService.getMemberProperty('quickbooks_connected_date'),
        lastSync: await this.hubspotService.getMemberProperty('quickbooks_last_sync')
      };
    } catch (error) {
      console.error('Error getting QuickBooks connection status:', error);
      return { connected: false };
    }
  }

  // Financial Data Synchronization Methods
  
  /**
   * Create customer in QuickBooks
   */
  async createCustomer(customerData: Partial<QuickBooksCustomer>): Promise<QuickBooksCustomer> {
    const response = await this.makeAuthenticatedRequest('POST', 'customers', {
      body: JSON.stringify({
        Name: customerData.name,
        CompanyName: customerData.companyName,
        BillAddr: customerData.billAddr ? {
          Line1: customerData.billAddr.line1,
          City: customerData.billAddr.city,
          CountrySubDivisionCode: customerData.billAddr.countrySubDivisionCode,
          PostalCode: customerData.billAddr.postalCode,
          Country: customerData.billAddr.country || 'US'
        } : undefined,
        PrimaryEmailAddr: customerData.primaryEmailAddr ? {
          Address: customerData.primaryEmailAddr.address
        } : undefined,
        PrimaryPhone: customerData.primaryPhone ? {
          FreeFormNumber: customerData.primaryPhone.freeFormNumber
        } : undefined,
        Active: customerData.active !== false
      })
    });

    const data = await response.json();
    const customer = data.QueryResponse?.Customer?.[0];
    
    if (!customer) {
      throw new Error('Failed to create customer');
    }

    return {
      id: customer.Id,
      name: customer.Name,
      companyName: customer.CompanyName,
      billAddr: customer.BillAddr ? {
        line1: customer.BillAddr.Line1,
        city: customer.BillAddr.City,
        countrySubDivisionCode: customer.BillAddr.CountrySubDivisionCode,
        postalCode: customer.BillAddr.PostalCode,
        country: customer.BillAddr.Country
      } : undefined,
      primaryEmailAddr: customer.PrimaryEmailAddr ? {
        address: customer.PrimaryEmailAddr.Address
      } : undefined,
      primaryPhone: customer.PrimaryPhone ? {
        freeFormNumber: customer.PrimaryPhone.FreeFormNumber
      } : undefined,
      active: customer.Active
    };
  }

  /**
   * Get or create customer by email
   */
  async getOrCreateCustomer(email: string, name: string, companyName?: string): Promise<QuickBooksCustomer> {
    try {
      // First, try to find existing customer
      const searchResponse = await this.makeAuthenticatedRequest(
        'GET',
        `customers?where=PrimaryEmailAddr='${email}'`
      );
      
      const searchData = await searchResponse.json();
      const existingCustomer = searchData.QueryResponse?.Customer?.[0];
      
      if (existingCustomer) {
        return {
          id: existingCustomer.Id,
          name: existingCustomer.Name,
          companyName: existingCustomer.CompanyName,
          primaryEmailAddr: { address: existingCustomer.PrimaryEmailAddr?.Address },
          active: existingCustomer.Active
        };
      }

      // Create new customer if not found
      return await this.createCustomer({
        name,
        companyName,
        primaryEmailAddr: { address: email },
        active: true
      });
    } catch (error) {
      console.error('Error getting or creating customer:', error);
      throw error;
    }
  }

  /**
   * Create invoice in QuickBooks
   */
  async createInvoice(invoiceData: Partial<QuickBooksInvoice>): Promise<QuickBooksInvoice> {
    const response = await this.makeAuthenticatedRequest('POST', 'invoices', {
      body: JSON.stringify({
        CustomerRef: invoiceData.customerRef,
        Line: invoiceData.line,
        DueDate: invoiceData.dueDate,
        TxnDate: invoiceData.txnDate || new Date().toISOString().split('T')[0],
        DocNumber: invoiceData.docNumber,
        PrivateNote: invoiceData.privateNote
      })
    });

    const data = await response.json();
    const invoice = data.QueryResponse?.Invoice?.[0];
    
    if (!invoice) {
      throw new Error('Failed to create invoice');
    }

    return {
      id: invoice.Id,
      customerRef: invoice.CustomerRef,
      line: invoice.Line,
      totalAmt: invoice.TotalAmt,
      dueDate: invoice.DueDate,
      txnDate: invoice.TxnDate,
      docNumber: invoice.DocNumber,
      privateNote: invoice.PrivateNote
    };
  }

  /**
   * Create invoice from cost estimate
   */
  async createInvoiceFromCostEstimate(
    costEstimateId: string,
    customerEmail: string,
    customerName: string,
    companyName?: string
  ): Promise<QuickBooksInvoice> {
    try {
      // Get cost estimate data from HubSpot
      const costEstimate = await this.hubspotService.getCustomObject('cost_estimates', costEstimateId);
      
      if (!costEstimate) {
        throw new Error('Cost estimate not found');
      }

      // Get or create customer
      const customer = await this.getOrCreateCustomer(customerEmail, customerName, companyName);

      // Create invoice line items from cost estimate
      const costBreakdown = JSON.parse(costEstimate.properties.cost_breakdown || '{}');
      const lineItems = [];

      // Add main estimate as line item
      lineItems.push({
        Amount: parseFloat(costEstimate.properties.total_estimate),
        DetailType: 'SalesItemLineDetail',
        SalesItemLineDetail: {
          ItemRef: {
            value: '1', // Default service item - should be configured
            name: 'Construction Services'
          },
          Qty: 1,
          UnitPrice: parseFloat(costEstimate.properties.total_estimate)
        }
      });

      const invoice = await this.createInvoice({
        customerRef: {
          value: customer.id!,
          name: customer.name
        },
        line: lineItems,
        docNumber: `EST-${costEstimateId.slice(-6)}`,
        privateNote: `Generated from cost estimate: ${costEstimate.properties.project_name}`,
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // 30 days from now
      });

      // Update cost estimate with invoice reference
      await this.hubspotService.updateCustomObject('cost_estimates', costEstimateId, {
        quickbooks_invoice_id: invoice.id,
        invoice_created_date: new Date().toISOString()
      });

      return invoice;
    } catch (error) {
      console.error('Error creating invoice from cost estimate:', error);
      throw error;
    }
  }

  /**
   * Create expense in QuickBooks
   */
  async createExpense(expenseData: Partial<QuickBooksExpense>): Promise<QuickBooksExpense> {
    const response = await this.makeAuthenticatedRequest('POST', 'purchases', {
      body: JSON.stringify({
        AccountRef: expenseData.accountRef,
        PaymentType: expenseData.paymentType,
        TotalAmt: expenseData.totalAmt,
        TxnDate: expenseData.txnDate,
        PrivateNote: expenseData.privateNote,
        Line: expenseData.line
      })
    });

    const data = await response.json();
    const expense = data.QueryResponse?.Purchase?.[0];
    
    if (!expense) {
      throw new Error('Failed to create expense');
    }

    return {
      id: expense.Id,
      accountRef: expense.AccountRef,
      paymentType: expense.PaymentType,
      totalAmt: expense.TotalAmt,
      txnDate: expense.TxnDate,
      privateNote: expense.PrivateNote,
      line: expense.Line
    };
  }

  /**
   * Create expense for tool maintenance
   */
  async createToolMaintenanceExpense(
    toolMaintenanceId: string,
    amount: number,
    description: string,
    performedBy?: string
  ): Promise<QuickBooksExpense> {
    try {
      // Get default expense account (should be configured)
      const expenseAccountId = '1'; // Default - should be configured

      const expense = await this.createExpense({
        accountRef: {
          value: expenseAccountId,
          name: 'Tool Maintenance'
        },
        paymentType: 'Cash',
        totalAmt: amount,
        txnDate: new Date().toISOString().split('T')[0],
        privateNote: `Tool maintenance: ${description}${performedBy ? ` (Performed by: ${performedBy})` : ''}`,
        line: [{
          amount: amount,
          detailType: 'AccountBasedExpenseLineDetail',
          accountBasedExpenseLineDetail: {
            accountRef: {
              value: expenseAccountId,
              name: 'Tool Maintenance'
            }
          }
        }]
      });

      // Update tool maintenance record with expense reference
      await this.hubspotService.updateCustomObject('tool_maintenance', toolMaintenanceId, {
        quickbooks_expense_id: expense.id,
        expense_created_date: new Date().toISOString()
      });

      return expense;
    } catch (error) {
      console.error('Error creating tool maintenance expense:', error);
      throw error;
    }
  }

  /**
   * Create expense for shop inventory
   */
  async createInventoryExpense(
    productId: string,
    amount: number,
    description: string,
    supplier?: string
  ): Promise<QuickBooksExpense> {
    try {
      const inventoryAccountId = '2'; // Default - should be configured

      const expense = await this.createExpense({
        accountRef: {
          value: inventoryAccountId,
          name: 'Inventory'
        },
        paymentType: 'Cash',
        totalAmt: amount,
        txnDate: new Date().toISOString().split('T')[0],
        privateNote: `Inventory purchase: ${description}${supplier ? ` (Supplier: ${supplier})` : ''}`,
        line: [{
          amount: amount,
          detailType: 'AccountBasedExpenseLineDetail',
          accountBasedExpenseLineDetail: {
            accountRef: {
              value: inventoryAccountId,
              name: 'Inventory'
            }
          }
        }]
      });

      // Update product with expense reference
      await this.hubspotService.updateCustomObject('products', productId, {
        quickbooks_expense_id: expense.id,
        expense_created_date: new Date().toISOString()
      });

      return expense;
    } catch (error) {
      console.error('Error creating inventory expense:', error);
      throw error;
    }
  }

  /**
   * Track member payment and dues
   */
  async trackMemberPayment(
    memberId: string,
    amount: number,
    paymentType: 'dues' | 'tool_rental' | 'shop_purchase' | 'other',
    description: string,
    orderId?: string
  ): Promise<void> {
    try {
      // Get member info
      const memberProfile = await this.hubspotService.getMemberProfile(memberId);
      
      if (!memberProfile) {
        throw new Error('Member not found');
      }

      // Create or get customer
      const customer = await this.getOrCreateCustomer(
        memberProfile.email,
        `${memberProfile.firstname} ${memberProfile.lastname}`,
        memberProfile.company
      );

      // Create invoice for the payment
      const invoice = await this.createInvoice({
        customerRef: {
          value: customer.id!,
          name: customer.name
        },
        line: [{
          Amount: amount,
          DetailType: 'SalesItemLineDetail',
          SalesItemLineDetail: {
            ItemRef: {
              value: '1', // Default service item
              name: this.getPaymentTypeDescription(paymentType)
            },
            Qty: 1,
            UnitPrice: amount
          }
        }],
        docNumber: orderId ? `ORD-${orderId.slice(-6)}` : `PAY-${Date.now().toString().slice(-6)}`,
        privateNote: description,
        dueDate: new Date().toISOString().split('T')[0] // Due immediately
      });

      // Update member's payment tracking in HubSpot
      await this.hubspotService.updateMemberProfile(memberId, {
        last_payment_date: new Date().toISOString(),
        last_payment_amount: amount.toString(),
        last_payment_type: paymentType,
        quickbooks_last_invoice_id: invoice.id
      });

      // If this is for an order, update the order
      if (orderId) {
        await this.hubspotService.updateCustomObject('shop_orders', orderId, {
          quickbooks_invoice_id: invoice.id,
          invoice_created_date: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Error tracking member payment:', error);
      throw error;
    }
  }

  /**
   * Get payment type description
   */
  private getPaymentTypeDescription(paymentType: string): string {
    switch (paymentType) {
      case 'dues':
        return 'Membership Dues';
      case 'tool_rental':
        return 'Tool Rental';
      case 'shop_purchase':
        return 'Shop Purchase';
      default:
        return 'Other Services';
    }
  }

  /**
   * Sync financial data with HubSpot
   */
  async syncFinancialData(): Promise<{ success: boolean; synced: number; errors: string[] }> {
    const errors: string[] = [];
    let syncedCount = 0;

    try {
      // Sync recent invoices
      const invoicesResult = await this.syncRecentInvoices();
      syncedCount += invoicesResult.synced;
      errors.push(...invoicesResult.errors);

      // Sync recent expenses
      const expensesResult = await this.syncRecentExpenses();
      syncedCount += expensesResult.synced;
      errors.push(...expensesResult.errors);

      // Sync customer data
      const customersResult = await this.syncCustomerData();
      syncedCount += customersResult.synced;
      errors.push(...customersResult.errors);

      // Update sync status
      await this.hubspotService.updateQuickBooksSyncStatus(
        'current_user', // This would need to be passed in or determined from context
        errors.length === 0 ? 'SYNCED' : 'ERROR',
        errors.length > 0 ? errors.join('; ') : undefined
      );

      return {
        success: errors.length === 0,
        synced: syncedCount,
        errors
      };
    } catch (error) {
      console.error('Error syncing financial data:', error);
      return {
        success: false,
        synced: syncedCount,
        errors: [...errors, error instanceof Error ? error.message : 'Unknown sync error']
      };
    }
  }

  /**
   * Sync recent invoices from QuickBooks to HubSpot
   */
  private async syncRecentInvoices(): Promise<{ synced: number; errors: string[] }> {
    const errors: string[] = [];
    let synced = 0;

    try {
      // Get invoices from last 30 days
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      const response = await this.makeAuthenticatedRequest(
        'GET',
        `invoices?where=TxnDate>'${thirtyDaysAgo}'`
      );
      
      const data = await response.json();
      const invoices = data.QueryResponse?.Invoice || [];

      for (const invoice of invoices) {
        try {
          // Update or create invoice record in HubSpot
          await this.hubspotService.createCustomObject('quickbooks_invoices', {
            quickbooks_invoice_id: invoice.Id,
            customer_name: invoice.CustomerRef?.name,
            total_amount: invoice.TotalAmt,
            due_date: invoice.DueDate,
            transaction_date: invoice.TxnDate,
            doc_number: invoice.DocNumber,
            balance: invoice.Balance,
            status: invoice.Balance > 0 ? 'Outstanding' : 'Paid'
          });
          
          synced++;
        } catch (error) {
          errors.push(`Failed to sync invoice ${invoice.Id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    } catch (error) {
      errors.push(`Failed to fetch invoices: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return { synced, errors };
  }

  /**
   * Sync recent expenses from QuickBooks to HubSpot
   */
  private async syncRecentExpenses(): Promise<{ synced: number; errors: string[] }> {
    const errors: string[] = [];
    let synced = 0;

    try {
      // Get expenses from last 30 days
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      const response = await this.makeAuthenticatedRequest(
        'GET',
        `purchases?where=TxnDate>'${thirtyDaysAgo}'`
      );
      
      const data = await response.json();
      const expenses = data.QueryResponse?.Purchase || [];

      for (const expense of expenses) {
        try {
          // Update or create expense record in HubSpot
          await this.hubspotService.createCustomObject('quickbooks_expenses', {
            quickbooks_expense_id: expense.Id,
            account_name: expense.AccountRef?.name,
            total_amount: expense.TotalAmt,
            transaction_date: expense.TxnDate,
            payment_type: expense.PaymentType,
            private_note: expense.PrivateNote
          });
          
          synced++;
        } catch (error) {
          errors.push(`Failed to sync expense ${expense.Id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    } catch (error) {
      errors.push(`Failed to fetch expenses: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return { synced, errors };
  }

  /**
   * Sync customer data from QuickBooks to HubSpot
   */
  private async syncCustomerData(): Promise<{ synced: number; errors: string[] }> {
    const errors: string[] = [];
    let synced = 0;

    try {
      const response = await this.makeAuthenticatedRequest('GET', 'customers');
      const data = await response.json();
      const customers = data.QueryResponse?.Customer || [];

      for (const customer of customers) {
        try {
          // Try to find matching HubSpot contact by email
          if (customer.PrimaryEmailAddr?.Address) {
            const existingContact = await this.hubspotService.checkForDuplicateContacts(
              customer.PrimaryEmailAddr.Address
            );

            if (existingContact.length > 0) {
              // Update existing contact with QuickBooks customer ID
              await this.hubspotService.updateMemberProfile(existingContact[0].id, {
                quickbooks_customer_id: customer.Id,
                quickbooks_customer_name: customer.Name,
                quickbooks_last_sync: new Date().toISOString()
              });
              
              synced++;
            }
          }
        } catch (error) {
          errors.push(`Failed to sync customer ${customer.Id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    } catch (error) {
      errors.push(`Failed to fetch customers: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return { synced, errors };
  }

  /**
   * Get financial summary
   */
  async getFinancialSummary(): Promise<{
    totalRevenue: number;
    totalExpenses: number;
    netIncome: number;
    outstandingInvoices: number;
    recentTransactions: any[];
  }> {
    try {
      // Get profit and loss report
      const plResponse = await this.makeAuthenticatedRequest(
        'GET',
        'reports/ProfitAndLoss?start_date=2024-01-01&end_date=2024-12-31'
      );
      
      const plData = await plResponse.json();
      
      // Get outstanding invoices
      const invoicesResponse = await this.makeAuthenticatedRequest(
        'GET',
        "invoices?where=Balance>'0'"
      );
      
      const invoicesData = await invoicesResponse.json();
      const outstandingInvoices = invoicesData.QueryResponse?.Invoice || [];
      
      // Get recent transactions (last 30 days)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      const transactionsResponse = await this.makeAuthenticatedRequest(
        'GET',
        `items?where=TxnDate>'${thirtyDaysAgo}'`
      );
      
      const transactionsData = await transactionsResponse.json();
      
      // Calculate totals (simplified - in production would parse P&L report properly)
      const totalRevenue = outstandingInvoices.reduce((sum: number, inv: any) => sum + (inv.TotalAmt || 0), 0);
      const outstandingAmount = outstandingInvoices.reduce((sum: number, inv: any) => sum + (inv.Balance || 0), 0);
      
      return {
        totalRevenue,
        totalExpenses: 0, // Would be calculated from P&L report
        netIncome: totalRevenue, // Simplified calculation
        outstandingInvoices: outstandingAmount,
        recentTransactions: transactionsData.QueryResponse?.Item || []
      };
    } catch (error) {
      console.error('Error getting financial summary:', error);
      throw error;
    }
  }
}
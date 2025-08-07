/**
 * Invoice Tracker Component
 * Interface for creating and tracking QuickBooks invoices
 */

'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useQuickBooks } from '@/hooks/useQuickBooks';
import { 
  FileText, 
  Plus, 
  Search, 
  Filter,
  Download,
  Eye,
  DollarSign,
  Calendar,
  User,
  Building
} from 'lucide-react';

interface InvoiceFormData {
  costEstimateId: string;
  customerEmail: string;
  customerName: string;
  companyName: string;
}

export function InvoiceTracker() {
  const { createInvoiceFromEstimate, connectionStatus } = useQuickBooks();
  
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState<InvoiceFormData>({
    costEstimateId: '',
    customerEmail: '',
    customerName: '',
    companyName: ''
  });
  const [creating, setCreating] = useState(false);
  const [createResult, setCreateResult] = useState<{
    success: boolean;
    invoice?: any;
    error?: string;
  } | null>(null);

  // Mock invoice data for display (in production, this would come from API)
  const mockInvoices = [
    {
      id: 'INV-001',
      customerName: 'John Smith Construction',
      amount: 15750.00,
      status: 'Outstanding',
      dueDate: '2024-02-15',
      createdDate: '2024-01-15',
      description: 'Kitchen Renovation Project'
    },
    {
      id: 'INV-002',
      customerName: 'ABC Building Corp',
      amount: 8500.00,
      status: 'Paid',
      dueDate: '2024-01-30',
      createdDate: '2024-01-01',
      description: 'Bathroom Remodel'
    },
    {
      id: 'INV-003',
      customerName: 'Metro Housing LLC',
      amount: 25000.00,
      status: 'Overdue',
      dueDate: '2024-01-20',
      createdDate: '2023-12-20',
      description: 'Multi-unit Renovation'
    }
  ];

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setCreateResult(null);

    try {
      const result = await createInvoiceFromEstimate(
        formData.costEstimateId,
        formData.customerEmail,
        formData.customerName,
        formData.companyName || undefined
      );

      setCreateResult(result);
      
      if (result.success) {
        setFormData({
          costEstimateId: '',
          customerEmail: '',
          customerName: '',
          companyName: ''
        });
        setShowCreateForm(false);
      }
    } catch (error) {
      setCreateResult({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create invoice'
      });
    } finally {
      setCreating(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'paid':
        return 'text-green-600 bg-green-100';
      case 'outstanding':
        return 'text-blue-600 bg-blue-100';
      case 'overdue':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
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
        <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Invoice Tracking
        </h3>
        <p className="text-gray-600">
          Connect to QuickBooks to create and track invoices
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold text-gray-900">Invoice Tracking</h3>
          <p className="text-gray-600">Create and manage QuickBooks invoices</p>
        </div>
        
        <Button
          onClick={() => setShowCreateForm(true)}
          className="flex items-center space-x-2"
        >
          <Plus className="h-4 w-4" />
          <span>Create Invoice</span>
        </Button>
      </div>

      {/* Create Invoice Form */}
      {showCreateForm && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-medium">Create Invoice from Cost Estimate</h4>
            <Button
              onClick={() => setShowCreateForm(false)}
              variant="outline"
              size="sm"
            >
              Cancel
            </Button>
          </div>

          <form onSubmit={handleCreateInvoice} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cost Estimate ID
                </label>
                <Input
                  type="text"
                  value={formData.costEstimateId}
                  onChange={(e) => setFormData({ ...formData, costEstimateId: e.target.value })}
                  placeholder="EST-123456"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Customer Email
                </label>
                <Input
                  type="email"
                  value={formData.customerEmail}
                  onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
                  placeholder="customer@example.com"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Customer Name
                </label>
                <Input
                  type="text"
                  value={formData.customerName}
                  onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                  placeholder="John Smith"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Company Name (Optional)
                </label>
                <Input
                  type="text"
                  value={formData.companyName}
                  onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                  placeholder="Smith Construction LLC"
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3">
              <Button
                type="button"
                onClick={() => setShowCreateForm(false)}
                variant="outline"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={creating}
                className="flex items-center space-x-2"
              >
                {creating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Creating...</span>
                  </>
                ) : (
                  <>
                    <FileText className="h-4 w-4" />
                    <span>Create Invoice</span>
                  </>
                )}
              </Button>
            </div>
          </form>

          {/* Create Result */}
          {createResult && (
            <div className={`mt-4 p-4 rounded-lg ${createResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
              <p className={`font-medium ${createResult.success ? 'text-green-800' : 'text-red-800'}`}>
                {createResult.success ? 'Invoice Created Successfully!' : 'Error Creating Invoice'}
              </p>
              {createResult.error && (
                <p className="text-red-700 text-sm mt-1">{createResult.error}</p>
              )}
              {createResult.invoice && (
                <p className="text-green-700 text-sm mt-1">
                  Invoice ID: {createResult.invoice.id}
                </p>
              )}
            </div>
          )}
        </Card>
      )}

      {/* Search and Filter */}
      <Card className="p-4">
        <div className="flex items-center space-x-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search invoices..."
              className="pl-10"
            />
          </div>
          <Button variant="outline" className="flex items-center space-x-2">
            <Filter className="h-4 w-4" />
            <span>Filter</span>
          </Button>
        </div>
      </Card>

      {/* Invoice List */}
      <Card className="overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h4 className="text-lg font-medium">Recent Invoices</h4>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Invoice
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Due Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {mockInvoices.map((invoice) => (
                <tr key={invoice.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <FileText className="h-5 w-5 text-gray-400 mr-3" />
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {invoice.id}
                        </div>
                        <div className="text-sm text-gray-500">
                          {invoice.description}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Building className="h-4 w-4 text-gray-400 mr-2" />
                      <div className="text-sm text-gray-900">
                        {invoice.customerName}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <DollarSign className="h-4 w-4 text-gray-400 mr-1" />
                      <div className="text-sm font-medium text-gray-900">
                        {formatCurrency(invoice.amount)}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(invoice.status)}`}>
                      {invoice.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                      <div className="text-sm text-gray-900">
                        {new Date(invoice.dueDate).toLocaleDateString()}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm">
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
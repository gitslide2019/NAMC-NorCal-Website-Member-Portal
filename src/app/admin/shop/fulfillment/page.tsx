/**
 * Admin Order Fulfillment Management Page
 * Comprehensive order fulfillment dashboard for administrators
 */

'use client';

import React from 'react';
import OrderFulfillmentManager from '@/components/ui/OrderFulfillmentManager';

export default function AdminOrderFulfillmentPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Order Fulfillment Management</h1>
          <p className="mt-2 text-gray-600">
            Manage order processing, inventory updates, digital access, and loyalty points
          </p>
        </div>

        <OrderFulfillmentManager />
      </div>
    </div>
  );
}
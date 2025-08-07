/**
 * Member Order Status Component
 * Shows order status, tracking, and loyalty points for members
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/badge';
import { Alert } from '@/components/ui/alert';

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  totalAmount: number;
  createdAt: string;
  items: OrderItem[];
}

interface OrderItem {
  id: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  product: {
    id: string;
    name: string;
    isDigital: boolean;
  };
}

interface LoyaltyStatus {
  currentPoints: number;
  currentTier: string;
  pointsToNextTier: number;
  tierBenefits: {
    discountPercentage: number;
    pointsMultiplier: number;
    benefits: string[];
  };
  totalOrderValue: number;
  totalOrders: number;
}

interface TrackingInfo {
  shopify?: {
    trackingNumbers: string[];
    trackingUrls: string[];
  };
  printify?: {
    trackingNumbers: string[];
    trackingUrls: string[];
  };
}

export default function MemberOrderStatus() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loyaltyStatus, setLoyaltyStatus] = useState<LoyaltyStatus | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [trackingInfo, setTrackingInfo] = useState<TrackingInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchOrders();
    fetchLoyaltyStatus();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/shop/orders');
      const data = await response.json();

      if (data.success) {
        setOrders(data.data);
      } else {
        setError(data.error || 'Failed to fetch orders');
      }
    } catch (error) {
      setError('Error fetching orders');
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLoyaltyStatus = async () => {
    try {
      const response = await fetch('/api/shop/loyalty?action=status');
      const data = await response.json();

      if (data.success) {
        setLoyaltyStatus(data.data);
      } else {
        console.error('Failed to fetch loyalty status:', data.error);
      }
    } catch (error) {
      console.error('Error fetching loyalty status:', error);
    }
  };

  const fetchTrackingInfo = async (orderId: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/shop/orders/fulfillment?orderId=${orderId}&action=tracking`);
      const data = await response.json();

      if (data.success) {
        setTrackingInfo(data.data);
      } else {
        setError(data.error || 'Failed to fetch tracking info');
      }
    } catch (error) {
      setError('Error fetching tracking info');
      console.error('Error fetching tracking info:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'confirmed':
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'shipped':
        return 'bg-blue-100 text-blue-800';
      case 'delivered':
        return 'bg-purple-100 text-purple-800';
      case 'cancelled':
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'EXECUTIVE':
        return 'bg-purple-100 text-purple-800';
      case 'PREMIUM':
        return 'bg-blue-100 text-blue-800';
      case 'REGULAR':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">My Orders & Rewards</h2>
        <Button onClick={fetchOrders} disabled={loading}>
          {loading ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>

      {error && (
        <Alert className="border-red-200 bg-red-50">
          <div className="text-red-800">{error}</div>
        </Alert>
      )}

      {/* Loyalty Status Card */}
      {loyaltyStatus && (
        <Card className="p-6 bg-gradient-to-r from-blue-50 to-purple-50">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Loyalty Status</h3>
              <p className="text-sm text-gray-600">Your membership tier and rewards</p>
            </div>
            <Badge className={getTierColor(loyaltyStatus.currentTier)}>
              {loyaltyStatus.currentTier} MEMBER
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">{loyaltyStatus.currentPoints}</p>
              <p className="text-sm text-gray-600">Current Points</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-600">{loyaltyStatus.pointsToNextTier}</p>
              <p className="text-sm text-gray-600">Points to Next Tier</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">{loyaltyStatus.tierBenefits.discountPercentage}%</p>
              <p className="text-sm text-gray-600">Member Discount</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-orange-600">{loyaltyStatus.totalOrders}</p>
              <p className="text-sm text-gray-600">Total Orders</p>
            </div>
          </div>

          <div>
            <h4 className="font-medium text-gray-900 mb-2">Your Benefits:</h4>
            <div className="flex flex-wrap gap-2">
              {loyaltyStatus.tierBenefits.benefits.map((benefit, index) => (
                <Badge key={index} className="bg-white text-gray-700 border border-gray-200">
                  {benefit}
                </Badge>
              ))}
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Orders List */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Recent Orders</h3>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {orders.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No orders found</p>
            ) : (
              orders.map((order) => (
                <div
                  key={order.id}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    selectedOrder?.id === order.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setSelectedOrder(order)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-medium">{order.orderNumber}</p>
                      <p className="text-sm text-gray-600">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">${order.totalAmount.toFixed(2)}</p>
                      <p className="text-sm text-gray-600">{order.items.length} items</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Badge className={getStatusBadgeColor(order.status)}>
                      {order.status}
                    </Badge>
                    <Badge className={getStatusBadgeColor(order.paymentStatus)}>
                      {order.paymentStatus}
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Order Details */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Order Details</h3>
          {selectedOrder ? (
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Order Information</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Order Number:</p>
                    <p className="font-medium">{selectedOrder.orderNumber}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Date:</p>
                    <p className="font-medium">
                      {new Date(selectedOrder.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600">Status:</p>
                    <Badge className={getStatusBadgeColor(selectedOrder.status)}>
                      {selectedOrder.status}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-gray-600">Total:</p>
                    <p className="font-medium">${selectedOrder.totalAmount.toFixed(2)}</p>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">Items</h4>
                <div className="space-y-2">
                  {selectedOrder.items.map((item) => (
                    <div key={item.id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                      <div>
                        <p className="font-medium">{item.product.name}</p>
                        {item.product.isDigital && (
                          <Badge className="bg-purple-100 text-purple-800 text-xs mt-1">
                            Digital Product
                          </Badge>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="font-medium">${item.totalPrice.toFixed(2)}</p>
                        <p className="text-sm text-gray-600">Qty: {item.quantity}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4">
                <Button
                  onClick={() => fetchTrackingInfo(selectedOrder.id)}
                  disabled={loading}
                  className="w-full"
                >
                  {loading ? 'Loading...' : 'Get Tracking Information'}
                </Button>
              </div>

              {trackingInfo && (
                <div>
                  <h4 className="font-medium mb-2">Tracking Information</h4>
                  <div className="space-y-2">
                    {trackingInfo.shopify && trackingInfo.shopify.trackingNumbers.length > 0 && (
                      <div>
                        <p className="text-sm font-medium text-gray-700">Standard Shipping:</p>
                        {trackingInfo.shopify.trackingNumbers.map((number, index) => (
                          <div key={index} className="flex justify-between items-center p-2 bg-green-50 rounded">
                            <span className="font-mono text-sm">{number}</span>
                            {trackingInfo.shopify?.trackingUrls[index] && (
                              <a
                                href={trackingInfo.shopify.trackingUrls[index]}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800 text-sm"
                              >
                                Track Package
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {trackingInfo.printify && trackingInfo.printify.trackingNumbers.length > 0 && (
                      <div>
                        <p className="text-sm font-medium text-gray-700">Print-on-Demand:</p>
                        {trackingInfo.printify.trackingNumbers.map((number, index) => (
                          <div key={index} className="flex justify-between items-center p-2 bg-orange-50 rounded">
                            <span className="font-mono text-sm">{number}</span>
                            {trackingInfo.printify?.trackingUrls[index] && (
                              <a
                                href={trackingInfo.printify.trackingUrls[index]}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800 text-sm"
                              >
                                Track Package
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {(!trackingInfo.shopify || trackingInfo.shopify.trackingNumbers.length === 0) &&
                     (!trackingInfo.printify || trackingInfo.printify.trackingNumbers.length === 0) && (
                      <p className="text-gray-500 text-sm">No tracking information available yet.</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-gray-500">Select an order to view details</p>
          )}
        </Card>
      </div>
    </div>
  );
}
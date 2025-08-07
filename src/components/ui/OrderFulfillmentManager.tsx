/**
 * Order Fulfillment Manager Component
 * Comprehensive order management with fulfillment tracking
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
  customerName: string;
  customerEmail: string;
  status: string;
  paymentStatus: string;
  totalAmount: number;
  createdAt: string;
  items: OrderItem[];
  shopifyOrderId?: string;
  printifyOrderId?: string;
  hubspotObjectId?: string;
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
    printifyProductId?: string;
    shopifyProductId?: string;
  };
}

interface FulfillmentStatus {
  orderCreation: boolean;
  inventoryUpdate: boolean;
  printifySubmission?: boolean;
  digitalAccess?: boolean;
  loyaltyPoints: boolean;
}

interface TrackingInfo {
  shopify?: {
    fulfillments: any[];
    trackingNumbers: string[];
    trackingUrls: string[];
  };
  printify?: {
    shipments: any[];
    trackingNumbers: string[];
    trackingUrls: string[];
  };
}

export default function OrderFulfillmentManager() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [fulfillmentStatus, setFulfillmentStatus] = useState<FulfillmentStatus | null>(null);
  const [trackingInfo, setTrackingInfo] = useState<TrackingInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchOrders();
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

  const fetchOrderDetails = async (orderId: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/shop/orders/fulfillment?orderId=${orderId}&action=status`);
      const data = await response.json();

      if (data.success) {
        setSelectedOrder(data.data.order);
        setFulfillmentStatus(data.data.fulfillmentStatus);
      } else {
        setError(data.error || 'Failed to fetch order details');
      }
    } catch (error) {
      setError('Error fetching order details');
      console.error('Error fetching order details:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTrackingInfo = async (orderId: string) => {
    try {
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
    }
  };

  const processFulfillment = async (orderId: string) => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      const response = await fetch('/api/shop/orders/fulfillment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'complete_fulfillment',
          orderId,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(data.message);
        setFulfillmentStatus(data.data.fulfillmentSteps);
        fetchOrders(); // Refresh orders list
      } else {
        setError(data.error || 'Failed to process fulfillment');
      }
    } catch (error) {
      setError('Error processing fulfillment');
      console.error('Error processing fulfillment:', error);
    } finally {
      setLoading(false);
    }
  };

  const submitToProduction = async (orderId: string) => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      const response = await fetch('/api/shop/orders/fulfillment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'submit_to_production',
          orderId,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(data.message);
        fetchOrderDetails(orderId); // Refresh order details
      } else {
        setError(data.error || 'Failed to submit to production');
      }
    } catch (error) {
      setError('Error submitting to production');
      console.error('Error submitting to production:', error);
    } finally {
      setLoading(false);
    }
  };

  const grantDigitalAccess = async (orderId: string) => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      const response = await fetch('/api/shop/orders/fulfillment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'grant_digital_access',
          orderId,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(data.message);
        fetchOrderDetails(orderId); // Refresh order details
      } else {
        setError(data.error || 'Failed to grant digital access');
      }
    } catch (error) {
      setError('Error granting digital access');
      console.error('Error granting digital access:', error);
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Order Fulfillment Manager</h2>
        <Button onClick={fetchOrders} disabled={loading}>
          {loading ? 'Refreshing...' : 'Refresh Orders'}
        </Button>
      </div>

      {error && (
        <Alert className="border-red-200 bg-red-50">
          <div className="text-red-800">{error}</div>
        </Alert>
      )}

      {success && (
        <Alert className="border-green-200 bg-green-50">
          <div className="text-green-800">{success}</div>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Orders List */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Recent Orders</h3>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {orders.map((order) => (
              <div
                key={order.id}
                className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                  selectedOrder?.id === order.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => fetchOrderDetails(order.id)}
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-medium">{order.orderNumber}</p>
                    <p className="text-sm text-gray-600">{order.customerName}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">${order.totalAmount.toFixed(2)}</p>
                    <p className="text-sm text-gray-600">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </p>
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
            ))}
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
                    <p className="text-gray-600">Customer:</p>
                    <p className="font-medium">{selectedOrder.customerName}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Email:</p>
                    <p className="font-medium">{selectedOrder.customerEmail}</p>
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
                        <div className="flex gap-2 mt-1">
                          {item.product.isDigital && (
                            <Badge className="bg-purple-100 text-purple-800 text-xs">Digital</Badge>
                          )}
                          {item.product.printifyProductId && (
                            <Badge className="bg-orange-100 text-orange-800 text-xs">Print-on-Demand</Badge>
                          )}
                          {item.product.shopifyProductId && (
                            <Badge className="bg-green-100 text-green-800 text-xs">Shopify</Badge>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">${item.totalPrice.toFixed(2)}</p>
                        <p className="text-sm text-gray-600">Qty: {item.quantity}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {fulfillmentStatus && (
                <div>
                  <h4 className="font-medium mb-2">Fulfillment Status</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span>Order Creation:</span>
                      <Badge className={fulfillmentStatus.orderCreation ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                        {fulfillmentStatus.orderCreation ? 'Complete' : 'Pending'}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Inventory Update:</span>
                      <Badge className={fulfillmentStatus.inventoryUpdate ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                        {fulfillmentStatus.inventoryUpdate ? 'Complete' : 'Pending'}
                      </Badge>
                    </div>
                    {fulfillmentStatus.printifySubmission !== undefined && (
                      <div className="flex justify-between items-center">
                        <span>Printify Production:</span>
                        <Badge className={fulfillmentStatus.printifySubmission ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                          {fulfillmentStatus.printifySubmission ? 'Submitted' : 'Pending'}
                        </Badge>
                      </div>
                    )}
                    {fulfillmentStatus.digitalAccess !== undefined && (
                      <div className="flex justify-between items-center">
                        <span>Digital Access:</span>
                        <Badge className={fulfillmentStatus.digitalAccess ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                          {fulfillmentStatus.digitalAccess ? 'Granted' : 'Pending'}
                        </Badge>
                      </div>
                    )}
                    <div className="flex justify-between items-center">
                      <span>Loyalty Points:</span>
                      <Badge className={fulfillmentStatus.loyaltyPoints ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                        {fulfillmentStatus.loyaltyPoints ? 'Awarded' : 'Pending'}
                      </Badge>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-2 pt-4">
                <Button
                  onClick={() => processFulfillment(selectedOrder.id)}
                  disabled={loading}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Process Full Fulfillment
                </Button>
                
                {selectedOrder.printifyOrderId && (
                  <Button
                    onClick={() => submitToProduction(selectedOrder.id)}
                    disabled={loading}
                    className="bg-orange-600 hover:bg-orange-700"
                  >
                    Submit to Production
                  </Button>
                )}
                
                {selectedOrder.items.some(item => item.product.isDigital) && (
                  <Button
                    onClick={() => grantDigitalAccess(selectedOrder.id)}
                    disabled={loading}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    Grant Digital Access
                  </Button>
                )}
                
                <Button
                  onClick={() => fetchTrackingInfo(selectedOrder.id)}
                  disabled={loading}
                  variant="outline"
                >
                  Get Tracking Info
                </Button>
              </div>

              {trackingInfo && (
                <div>
                  <h4 className="font-medium mb-2">Tracking Information</h4>
                  <div className="space-y-2">
                    {trackingInfo.shopify && trackingInfo.shopify.trackingNumbers.length > 0 && (
                      <div>
                        <p className="text-sm font-medium text-gray-700">Shopify Tracking:</p>
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
                        <p className="text-sm font-medium text-gray-700">Printify Tracking:</p>
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
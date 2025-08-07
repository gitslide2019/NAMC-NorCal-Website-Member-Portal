'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { CheckCircle, Package, Download, Mail, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import Link from 'next/link';

interface OrderDetails {
  id: string;
  orderNumber: string;
  total: number;
  items: Array<{
    id: string;
    name: string;
    quantity: number;
    price: number;
    isDigital: boolean;
    image?: string;
  }>;
  customer: {
    email: string;
    firstName: string;
    lastName: string;
  };
  shippingAddress?: {
    address1: string;
    city: string;
    province: string;
    zip: string;
  };
  createdAt: string;
  estimatedDelivery?: string;
}

export default function CheckoutSuccessPage() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const orderId = searchParams.get('order_id');
  
  const [orderDetails, setOrderDetails] = useState<OrderDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (orderId) {
      fetchOrderDetails();
    }
  }, [orderId]);

  const fetchOrderDetails = async () => {
    try {
      const response = await fetch(`/api/shop/orders/${orderId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch order details');
      }
      
      const order = await response.json();
      setOrderDetails(order);
    } catch (error) {
      console.error('Error fetching order details:', error);
      setError('Failed to load order details');
    } finally {
      setIsLoading(false);
    }
  };

  const hasDigitalProducts = orderDetails?.items.some(item => item.isDigital) || false;
  const hasPhysicalProducts = orderDetails?.items.some(item => !item.isDigital) || false;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading order details...</p>
        </div>
      </div>
    );
  }

  if (error || !orderDetails) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="p-8 text-center max-w-md">
          <div className="text-red-600 mb-4">
            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Order Not Found</h2>
          <p className="text-gray-600 mb-6">
            We couldn't find your order details. Please check your email for confirmation.
          </p>
          <Link href="/member/shop">
            <Button>Return to Shop</Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Success Header */}
        <div className="text-center mb-12">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-6">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Order Confirmed!</h1>
          <p className="text-lg text-gray-600">
            Thank you for your purchase. Your order #{orderDetails.orderNumber} has been received.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Order Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Order Summary */}
            <Card className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Order Summary</h2>
              
              <div className="space-y-4">
                {orderDetails.items.map((item) => (
                  <div key={item.id} className="flex items-center space-x-4 py-4 border-b border-gray-200 last:border-b-0">
                    {item.image && (
                      <img
                        src={item.image}
                        alt={item.name}
                        className="h-16 w-16 rounded-lg object-cover"
                      />
                    )}
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{item.name}</h4>
                      <div className="flex items-center space-x-4 mt-1">
                        <span className="text-sm text-gray-600">Qty: {item.quantity}</span>
                        <span className="text-sm font-medium text-gray-900">
                          ${item.price.toFixed(2)} each
                        </span>
                        {item.isDigital && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            Digital
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-gray-900">
                        ${(item.price * item.quantity).toFixed(2)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t pt-4 mt-6">
                <div className="flex justify-between text-lg font-semibold text-gray-900">
                  <span>Total</span>
                  <span>${orderDetails.total.toFixed(2)}</span>
                </div>
              </div>
            </Card>

            {/* Next Steps */}
            <Card className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">What's Next?</h2>
              
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <Mail className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">Confirmation Email</h4>
                    <p className="text-gray-600">
                      We've sent a confirmation email to {orderDetails.customer.email} with your order details and receipt.
                    </p>
                  </div>
                </div>

                {hasDigitalProducts && (
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      <Download className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">Digital Products</h4>
                      <p className="text-gray-600">
                        Your digital products are now available in your member dashboard. You can access them anytime.
                      </p>
                      <Link href="/member/shop/digital-access" className="inline-block mt-2">
                        <Button size="sm" variant="outline">
                          Access Digital Products
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                )}

                {hasPhysicalProducts && (
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      <Package className="h-6 w-6 text-orange-600" />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">Shipping</h4>
                      <p className="text-gray-600">
                        Your physical items will be processed and shipped within 1-2 business days.
                        {orderDetails.estimatedDelivery && (
                          <span> Estimated delivery: {orderDetails.estimatedDelivery}</span>
                        )}
                      </p>
                      {orderDetails.shippingAddress && (
                        <div className="mt-2 text-sm text-gray-600">
                          <p className="font-medium">Shipping to:</p>
                          <p>{orderDetails.shippingAddress.address1}</p>
                          <p>
                            {orderDetails.shippingAddress.city}, {orderDetails.shippingAddress.province} {orderDetails.shippingAddress.zip}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Order Info */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Information</h3>
              
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Order Number:</span>
                  <span className="font-medium text-gray-900">#{orderDetails.orderNumber}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600">Order Date:</span>
                  <span className="font-medium text-gray-900">
                    {new Date(orderDetails.createdAt).toLocaleDateString()}
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600">Customer:</span>
                  <span className="font-medium text-gray-900">
                    {orderDetails.customer.firstName} {orderDetails.customer.lastName}
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600">Email:</span>
                  <span className="font-medium text-gray-900 break-all">
                    {orderDetails.customer.email}
                  </span>
                </div>
              </div>
            </Card>

            {/* Actions */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
              
              <div className="space-y-3">
                <Link href="/member/shop" className="block">
                  <Button variant="outline" className="w-full">
                    Continue Shopping
                  </Button>
                </Link>
                
                <Link href="/member/shop/orders" className="block">
                  <Button variant="outline" className="w-full">
                    View All Orders
                  </Button>
                </Link>
                
                {hasDigitalProducts && (
                  <Link href="/member/shop/digital-access" className="block">
                    <Button className="w-full">
                      Access Digital Products
                    </Button>
                  </Link>
                )}
              </div>
            </Card>

            {/* Support */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Need Help?</h3>
              
              <p className="text-sm text-gray-600 mb-4">
                If you have any questions about your order, please don't hesitate to contact us.
              </p>
              
              <div className="space-y-2 text-sm">
                <p className="text-gray-600">
                  <strong>Email:</strong> shop@namcnorcal.org
                </p>
                <p className="text-gray-600">
                  <strong>Phone:</strong> (415) 555-0123
                </p>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
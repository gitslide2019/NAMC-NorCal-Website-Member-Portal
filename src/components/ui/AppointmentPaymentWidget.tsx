'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

interface PaymentInfo {
  totalPrice: number;
  depositAmount: number;
  depositPaid: boolean;
  remainingBalance: number;
  paymentStatus: string;
  requiresDeposit: boolean;
}

interface AppointmentPaymentWidgetProps {
  appointmentId: string;
  onPaymentSuccess?: () => void;
  onPaymentError?: (error: string) => void;
}

function PaymentForm({ 
  appointmentId, 
  paymentInfo, 
  onPaymentSuccess, 
  onPaymentError 
}: {
  appointmentId: string;
  paymentInfo: PaymentInfo;
  onPaymentSuccess?: () => void;
  onPaymentError?: (error: string) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [paymentType, setPaymentType] = useState<'deposit' | 'full'>('deposit');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setLoading(true);

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      setLoading(false);
      return;
    }

    try {
      // Create payment method
      const { error: methodError, paymentMethod } = await stripe.createPaymentMethod({
        type: 'card',
        card: cardElement,
      });

      if (methodError) {
        throw new Error(methodError.message);
      }

      // Determine payment amount
      const amount = paymentType === 'deposit' 
        ? paymentInfo.depositAmount 
        : paymentInfo.remainingBalance;

      // Process payment
      const response = await fetch('/api/scheduling/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          appointmentId,
          paymentType,
          amount,
          paymentMethodId: paymentMethod.id,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Payment failed');
      }

      const { paymentIntent } = await response.json();

      if (paymentIntent.status === 'requires_action') {
        // Handle 3D Secure authentication
        const { error: confirmError } = await stripe.confirmCardPayment(
          paymentIntent.client_secret
        );

        if (confirmError) {
          throw new Error(confirmError.message);
        }
      }

      onPaymentSuccess?.();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Payment failed';
      onPaymentError?.(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price);
  };

  const canPayDeposit = paymentInfo.requiresDeposit && !paymentInfo.depositPaid && paymentInfo.depositAmount > 0;
  const canPayFull = paymentInfo.remainingBalance > 0;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Payment Type Selection */}
      {canPayDeposit && canPayFull && (
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Payment Type
          </label>
          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="radio"
                value="deposit"
                checked={paymentType === 'deposit'}
                onChange={(e) => setPaymentType(e.target.value as 'deposit' | 'full')}
                className="mr-2"
              />
              Pay Deposit - {formatPrice(paymentInfo.depositAmount)}
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                value="full"
                checked={paymentType === 'full'}
                onChange={(e) => setPaymentType(e.target.value as 'deposit' | 'full')}
                className="mr-2"
              />
              Pay Full Amount - {formatPrice(paymentInfo.remainingBalance)}
            </label>
          </div>
        </div>
      )}

      {/* Card Element */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          Card Information
        </label>
        <div className="p-3 border border-gray-300 rounded-md">
          <CardElement
            options={{
              style: {
                base: {
                  fontSize: '16px',
                  color: '#424770',
                  '::placeholder': {
                    color: '#aab7c4',
                  },
                },
              },
            }}
          />
        </div>
      </div>

      {/* Payment Summary */}
      <div className="bg-gray-50 p-4 rounded-md">
        <h4 className="font-medium text-gray-900 mb-2">Payment Summary</h4>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span>Amount to pay:</span>
            <span className="font-medium">
              {formatPrice(paymentType === 'deposit' ? paymentInfo.depositAmount : paymentInfo.remainingBalance)}
            </span>
          </div>
          {paymentType === 'deposit' && (
            <div className="flex justify-between text-gray-600">
              <span>Remaining balance:</span>
              <span>{formatPrice(paymentInfo.totalPrice - paymentInfo.depositAmount)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Submit Button */}
      <Button
        type="submit"
        disabled={!stripe || loading}
        className="w-full"
      >
        {loading ? 'Processing...' : `Pay ${formatPrice(paymentType === 'deposit' ? paymentInfo.depositAmount : paymentInfo.remainingBalance)}`}
      </Button>
    </form>
  );
}

export function AppointmentPaymentWidget({ 
  appointmentId, 
  onPaymentSuccess, 
  onPaymentError 
}: AppointmentPaymentWidgetProps) {
  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paymentComplete, setPaymentComplete] = useState(false);

  useEffect(() => {
    const fetchPaymentInfo = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/scheduling/payments?appointmentId=${appointmentId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch payment information');
        }

        const data = await response.json();
        setPaymentInfo(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load payment information');
      } finally {
        setLoading(false);
      }
    };

    if (appointmentId) {
      fetchPaymentInfo();
    }
  }, [appointmentId]);

  const handlePaymentSuccess = () => {
    setPaymentComplete(true);
    onPaymentSuccess?.();
  };

  const handlePaymentError = (errorMessage: string) => {
    setError(errorMessage);
    onPaymentError?.(errorMessage);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price);
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="h-20 bg-gray-200 rounded"></div>
          <div className="h-10 bg-gray-200 rounded"></div>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-6">
        <div className="text-center text-red-600">
          <p className="mb-2">{error}</p>
          <Button
            onClick={() => window.location.reload()}
            variant="outline"
            size="sm"
          >
            Try Again
          </Button>
        </div>
      </Card>
    );
  }

  if (!paymentInfo) {
    return (
      <Card className="p-6">
        <div className="text-center text-gray-500">
          <p>Payment information not available.</p>
        </div>
      </Card>
    );
  }

  if (paymentComplete) {
    return (
      <Card className="p-6">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Payment Successful!</h3>
            <p className="text-gray-600">Your payment has been processed successfully.</p>
          </div>
        </div>
      </Card>
    );
  }

  // Check if payment is needed
  const needsPayment = (paymentInfo.requiresDeposit && !paymentInfo.depositPaid) || 
                      (paymentInfo.remainingBalance > 0 && paymentInfo.paymentStatus !== 'PAID');

  if (!needsPayment) {
    return (
      <Card className="p-6">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Payment Complete</h3>
            <p className="text-gray-600">All payments for this appointment have been processed.</p>
          </div>
          
          <div className="bg-blue-50 p-4 rounded-md text-left">
            <h4 className="font-medium text-blue-900 mb-2">Payment Summary</h4>
            <div className="space-y-1 text-sm text-blue-800">
              <div className="flex justify-between">
                <span>Total Amount:</span>
                <span className="font-medium">{formatPrice(paymentInfo.totalPrice)}</span>
              </div>
              {paymentInfo.requiresDeposit && (
                <div className="flex justify-between">
                  <span>Deposit:</span>
                  <span className={paymentInfo.depositPaid ? 'text-green-600' : 'text-red-600'}>
                    {paymentInfo.depositPaid ? '✓ Paid' : '✗ Pending'} - {formatPrice(paymentInfo.depositAmount)}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Status:</span>
                <span className="font-medium capitalize">{paymentInfo.paymentStatus.toLowerCase()}</span>
              </div>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Required</h3>
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <Elements stripe={stripePromise}>
        <PaymentForm
          appointmentId={appointmentId}
          paymentInfo={paymentInfo}
          onPaymentSuccess={handlePaymentSuccess}
          onPaymentError={handlePaymentError}
        />
      </Elements>
    </Card>
  );
}
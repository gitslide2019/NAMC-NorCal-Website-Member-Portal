'use client';

import React, { useState, useEffect } from 'react';
import { Search, Calendar, User, Wrench, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';

interface Reservation {
  id: string;
  startDate: string;
  endDate: string;
  status: string;
  totalCost: number;
  checkoutCondition?: string;
  returnCondition?: string;
  notes?: string;
  tool: {
    id: string;
    name: string;
    category: string;
    dailyRate: number;
    condition: string;
    imageUrl?: string;
  };
  user: {
    id: string;
    name: string;
    email: string;
    company?: string;
  };
}

interface ToolCheckoutProps {
  onCheckoutComplete?: (reservation: Reservation) => void;
  reservationId?: string;
}

const CONDITION_OPTIONS = [
  { value: 'EXCELLENT', label: 'Excellent - Like new condition' },
  { value: 'GOOD', label: 'Good - Minor wear, fully functional' },
  { value: 'FAIR', label: 'Fair - Noticeable wear, needs attention' },
  { value: 'NEEDS_REPAIR', label: 'Needs Repair - Requires maintenance' }
];

export function ToolCheckout({ onCheckoutComplete, reservationId }: ToolCheckoutProps) {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [checkoutData, setCheckoutData] = useState({
    checkoutCondition: '',
    staffNotes: '',
    actualStartDate: ''
  });

  const fetchReservations = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        status: 'CONFIRMED',
        page: '1',
        limit: '50'
      });

      const response = await fetch(`/api/tools/reservations?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch reservations');
      }

      const data = await response.json();
      const confirmedReservations = data.reservations.filter((res: Reservation) => 
        res.status === 'CONFIRMED' && new Date(res.startDate) <= new Date(Date.now() + 2 * 24 * 60 * 60 * 1000) // Within 2 days
      );
      
      setReservations(confirmedReservations);
      
      // If specific reservation ID provided, select it
      if (reservationId) {
        const targetReservation = confirmedReservations.find((res: Reservation) => res.id === reservationId);
        if (targetReservation) {
          setSelectedReservation(targetReservation);
          setCheckoutData(prev => ({
            ...prev,
            checkoutCondition: targetReservation.tool.condition,
            actualStartDate: targetReservation.startDate.split('T')[0]
          }));
        }
      }
      
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load reservations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReservations();
  }, [reservationId]);

  const filteredReservations = reservations.filter(reservation =>
    reservation.tool.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    reservation.user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    reservation.user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleReservationSelect = (reservation: Reservation) => {
    setSelectedReservation(reservation);
    setCheckoutData({
      checkoutCondition: reservation.tool.condition,
      staffNotes: '',
      actualStartDate: reservation.startDate.split('T')[0]
    });
  };

  const handleCheckout = async () => {
    if (!selectedReservation || !checkoutData.checkoutCondition) {
      return;
    }

    try {
      setProcessing(true);
      const response = await fetch('/api/tools/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          reservationId: selectedReservation.id,
          checkoutCondition: checkoutData.checkoutCondition,
          staffNotes: checkoutData.staffNotes,
          actualStartDate: checkoutData.actualStartDate
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to checkout tool');
      }

      const result = await response.json();
      
      if (onCheckoutComplete) {
        onCheckoutComplete(result.reservation);
      }

      // Reset form and refresh reservations
      setSelectedReservation(null);
      setCheckoutData({
        checkoutCondition: '',
        staffNotes: '',
        actualStartDate: ''
      });
      
      await fetchReservations();
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to checkout tool');
    } finally {
      setProcessing(false);
    }
  };

  const isCheckoutValid = () => {
    return selectedReservation && 
           checkoutData.checkoutCondition && 
           checkoutData.actualStartDate;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <LoadingSkeleton className="h-12 w-full" />
        <LoadingSkeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Tool Checkout</h2>
        <p className="text-gray-600">Process tool checkouts for confirmed reservations</p>
      </div>

      {error && (
        <Card className="p-4 border-red-200 bg-red-50">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
            <span className="text-red-700">{error}</span>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Reservations List */}
        <Card className="p-6">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Ready for Checkout</h3>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by tool name, member name, or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="space-y-3 max-h-96 overflow-y-auto">
            {filteredReservations.length === 0 ? (
              <div className="text-center py-8">
                <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No reservations ready for checkout</p>
              </div>
            ) : (
              filteredReservations.map((reservation) => (
                <div
                  key={reservation.id}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    selectedReservation?.id === reservation.id
                      ? 'border-yellow-300 bg-yellow-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => handleReservationSelect(reservation)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{reservation.tool.name}</h4>
                      <p className="text-sm text-gray-600">{reservation.tool.category}</p>
                      
                      <div className="mt-2 space-y-1">
                        <div className="flex items-center text-sm text-gray-600">
                          <User className="h-4 w-4 mr-2" />
                          <span>{reservation.user.name}</span>
                        </div>
                        <div className="flex items-center text-sm text-gray-600">
                          <Calendar className="h-4 w-4 mr-2" />
                          <span>
                            {new Date(reservation.startDate).toLocaleDateString()} - {new Date(reservation.endDate).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="text-sm font-medium text-gray-900">
                        ${reservation.totalCost}
                      </div>
                      <div className={`text-xs px-2 py-1 rounded-full ${
                        reservation.status === 'CONFIRMED' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {reservation.status}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Checkout Form */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Checkout Details</h3>
          
          {selectedReservation ? (
            <div className="space-y-4">
              {/* Selected Reservation Info */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">{selectedReservation.tool.name}</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Member:</span>
                    <div className="font-medium">{selectedReservation.user.name}</div>
                    <div className="text-gray-600">{selectedReservation.user.email}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Rental Period:</span>
                    <div className="font-medium">
                      {new Date(selectedReservation.startDate).toLocaleDateString()} - {new Date(selectedReservation.endDate).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </div>

              {/* Checkout Form */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tool Condition at Checkout *
                  </label>
                  <select
                    value={checkoutData.checkoutCondition}
                    onChange={(e) => setCheckoutData(prev => ({ ...prev, checkoutCondition: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                    required
                  >
                    <option value="">Select condition...</option>
                    {CONDITION_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Actual Start Date
                  </label>
                  <Input
                    type="date"
                    value={checkoutData.actualStartDate}
                    onChange={(e) => setCheckoutData(prev => ({ ...prev, actualStartDate: e.target.value }))}
                    min={new Date(selectedReservation.startDate).toISOString().split('T')[0]}
                    max={new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Staff Notes
                  </label>
                  <textarea
                    value={checkoutData.staffNotes}
                    onChange={(e) => setCheckoutData(prev => ({ ...prev, staffNotes: e.target.value }))}
                    placeholder="Any additional notes about the checkout..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Checkout Button */}
              <Button
                onClick={handleCheckout}
                disabled={!isCheckoutValid() || processing}
                className="w-full"
              >
                {processing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Processing Checkout...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Complete Checkout
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="text-center py-8">
              <Wrench className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Select a reservation to begin checkout</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
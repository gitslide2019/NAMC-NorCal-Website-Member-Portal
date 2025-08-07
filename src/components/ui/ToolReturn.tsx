'use client';

import React, { useState, useEffect } from 'react';
import { Search, Calendar, User, Wrench, CheckCircle, AlertCircle, Clock, DollarSign } from 'lucide-react';
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
  lateFees: number;
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

interface ToolReturnProps {
  onReturnComplete?: (reservation: Reservation, result: any) => void;
  reservationId?: string;
}

const CONDITION_OPTIONS = [
  { value: 'EXCELLENT', label: 'Excellent - Like new condition' },
  { value: 'GOOD', label: 'Good - Minor wear, fully functional' },
  { value: 'FAIR', label: 'Fair - Noticeable wear, needs attention' },
  { value: 'NEEDS_REPAIR', label: 'Needs Repair - Requires maintenance' }
];

const DAMAGE_TYPES = [
  { value: 'ROUTINE', label: 'Routine Inspection' },
  { value: 'REPAIR', label: 'Repair Required' },
  { value: 'INSPECTION', label: 'Detailed Inspection' },
  { value: 'CALIBRATION', label: 'Calibration Needed' }
];

export function ToolReturn({ onReturnComplete, reservationId }: ToolReturnProps) {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [returnData, setReturnData] = useState({
    returnCondition: '',
    staffNotes: '',
    actualReturnDate: '',
    damageAssessment: {
      requiresMaintenance: false,
      type: '',
      description: ''
    }
  });

  const fetchReservations = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        status: 'CHECKED_OUT',
        page: '1',
        limit: '50'
      });

      const response = await fetch(`/api/tools/reservations?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch reservations');
      }

      const data = await response.json();
      const checkedOutReservations = data.reservations.filter((res: Reservation) => 
        res.status === 'CHECKED_OUT'
      );
      
      setReservations(checkedOutReservations);
      
      // If specific reservation ID provided, select it
      if (reservationId) {
        const targetReservation = checkedOutReservations.find((res: Reservation) => res.id === reservationId);
        if (targetReservation) {
          setSelectedReservation(targetReservation);
          setReturnData(prev => ({
            ...prev,
            returnCondition: targetReservation.checkoutCondition || targetReservation.tool.condition,
            actualReturnDate: new Date().toISOString().split('T')[0]
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
    setReturnData({
      returnCondition: reservation.checkoutCondition || reservation.tool.condition,
      staffNotes: '',
      actualReturnDate: new Date().toISOString().split('T')[0],
      damageAssessment: {
        requiresMaintenance: false,
        type: '',
        description: ''
      }
    });
  };

  const calculateLateFees = () => {
    if (!selectedReservation || !returnData.actualReturnDate) return 0;
    
    const returnDate = new Date(returnData.actualReturnDate);
    const originalEndDate = new Date(selectedReservation.endDate);
    
    if (returnDate <= originalEndDate) return 0;
    
    const daysLate = Math.ceil((returnDate.getTime() - originalEndDate.getTime()) / (1000 * 60 * 60 * 24));
    return daysLate * selectedReservation.tool.dailyRate * 0.5; // 50% of daily rate as late fee
  };

  const isLateReturn = () => {
    if (!selectedReservation || !returnData.actualReturnDate) return false;
    
    const returnDate = new Date(returnData.actualReturnDate);
    const originalEndDate = new Date(selectedReservation.endDate);
    
    return returnDate > originalEndDate;
  };

  const handleReturn = async () => {
    if (!selectedReservation || !returnData.returnCondition) {
      return;
    }

    try {
      setProcessing(true);
      const response = await fetch('/api/tools/return', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          reservationId: selectedReservation.id,
          returnCondition: returnData.returnCondition,
          staffNotes: returnData.staffNotes,
          actualReturnDate: returnData.actualReturnDate,
          damageAssessment: returnData.damageAssessment.requiresMaintenance ? returnData.damageAssessment : undefined
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to return tool');
      }

      const result = await response.json();
      
      if (onReturnComplete) {
        onReturnComplete(result.reservation, result);
      }

      // Reset form and refresh reservations
      setSelectedReservation(null);
      setReturnData({
        returnCondition: '',
        staffNotes: '',
        actualReturnDate: '',
        damageAssessment: {
          requiresMaintenance: false,
          type: '',
          description: ''
        }
      });
      
      await fetchReservations();
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to return tool');
    } finally {
      setProcessing(false);
    }
  };

  const isReturnValid = () => {
    return selectedReservation && 
           returnData.returnCondition && 
           returnData.actualReturnDate &&
           (!returnData.damageAssessment.requiresMaintenance || 
            (returnData.damageAssessment.type && returnData.damageAssessment.description));
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
        <h2 className="text-2xl font-bold text-gray-900">Tool Return</h2>
        <p className="text-gray-600">Process tool returns and assess condition</p>
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
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Checked Out Tools</h3>
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
                <p className="text-gray-600">No tools currently checked out</p>
              </div>
            ) : (
              filteredReservations.map((reservation) => {
                const isOverdue = new Date() > new Date(reservation.endDate);
                
                return (
                  <div
                    key={reservation.id}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      selectedReservation?.id === reservation.id
                        ? 'border-yellow-300 bg-yellow-50'
                        : isOverdue
                        ? 'border-red-200 bg-red-50'
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
                              Due: {new Date(reservation.endDate).toLocaleDateString()}
                              {isOverdue && (
                                <span className="text-red-600 font-medium ml-2">(OVERDUE)</span>
                              )}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className="text-sm font-medium text-gray-900">
                          ${reservation.totalCost}
                        </div>
                        <div className={`text-xs px-2 py-1 rounded-full ${
                          reservation.status === 'CHECKED_OUT' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {reservation.status}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Card>

        {/* Return Form */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Return Details</h3>
          
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
                    <span className="text-gray-600">Due Date:</span>
                    <div className={`font-medium ${isLateReturn() ? 'text-red-600' : ''}`}>
                      {new Date(selectedReservation.endDate).toLocaleDateString()}
                      {isLateReturn() && <span className="ml-1">(LATE)</span>}
                    </div>
                  </div>
                </div>
                
                {selectedReservation.checkoutCondition && (
                  <div className="mt-2">
                    <span className="text-gray-600">Checkout Condition:</span>
                    <div className="font-medium">{selectedReservation.checkoutCondition}</div>
                  </div>
                )}
              </div>

              {/* Late Fee Warning */}
              {isLateReturn() && (
                <Card className="p-4 border-red-200 bg-red-50">
                  <div className="flex items-center">
                    <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
                    <div>
                      <div className="font-medium text-red-800">Late Return</div>
                      <div className="text-sm text-red-700">
                        Late fee: ${calculateLateFees().toFixed(2)}
                      </div>
                    </div>
                  </div>
                </Card>
              )}

              {/* Return Form */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tool Condition at Return *
                  </label>
                  <select
                    value={returnData.returnCondition}
                    onChange={(e) => setReturnData(prev => ({ ...prev, returnCondition: e.target.value }))}
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
                    Actual Return Date
                  </label>
                  <Input
                    type="date"
                    value={returnData.actualReturnDate}
                    onChange={(e) => setReturnData(prev => ({ ...prev, actualReturnDate: e.target.value }))}
                    max={new Date().toISOString().split('T')[0]}
                  />
                </div>

                {/* Damage Assessment */}
                <div>
                  <label className="flex items-center mb-2">
                    <input
                      type="checkbox"
                      checked={returnData.damageAssessment.requiresMaintenance}
                      onChange={(e) => setReturnData(prev => ({
                        ...prev,
                        damageAssessment: {
                          ...prev.damageAssessment,
                          requiresMaintenance: e.target.checked
                        }
                      }))}
                      className="rounded border-gray-300 text-yellow-600 focus:ring-yellow-500 mr-2"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      Tool requires maintenance
                    </span>
                  </label>

                  {returnData.damageAssessment.requiresMaintenance && (
                    <div className="space-y-3 ml-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Maintenance Type *
                        </label>
                        <select
                          value={returnData.damageAssessment.type}
                          onChange={(e) => setReturnData(prev => ({
                            ...prev,
                            damageAssessment: {
                              ...prev.damageAssessment,
                              type: e.target.value
                            }
                          }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                          required
                        >
                          <option value="">Select type...</option>
                          {DAMAGE_TYPES.map((type) => (
                            <option key={type.value} value={type.value}>
                              {type.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Description *
                        </label>
                        <textarea
                          value={returnData.damageAssessment.description}
                          onChange={(e) => setReturnData(prev => ({
                            ...prev,
                            damageAssessment: {
                              ...prev.damageAssessment,
                              description: e.target.value
                            }
                          }))}
                          placeholder="Describe the issue or maintenance needed..."
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                          required
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Staff Notes
                  </label>
                  <textarea
                    value={returnData.staffNotes}
                    onChange={(e) => setReturnData(prev => ({ ...prev, staffNotes: e.target.value }))}
                    placeholder="Any additional notes about the return..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Cost Summary */}
              {calculateLateFees() > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-2">Return Summary</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Original Cost:</span>
                      <span>${selectedReservation.totalCost}</span>
                    </div>
                    <div className="flex justify-between text-red-600">
                      <span>Late Fees:</span>
                      <span>${calculateLateFees().toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-medium border-t pt-1">
                      <span>Total:</span>
                      <span>${(selectedReservation.totalCost + calculateLateFees()).toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Return Button */}
              <Button
                onClick={handleReturn}
                disabled={!isReturnValid() || processing}
                className="w-full"
              >
                {processing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Processing Return...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Complete Return
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="text-center py-8">
              <Wrench className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Select a checked out tool to begin return process</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
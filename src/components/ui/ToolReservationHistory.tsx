'use client';

import React, { useState, useEffect } from 'react';
import { Calendar, Clock, DollarSign, Wrench, AlertCircle, CheckCircle, XCircle, Eye } from 'lucide-react';
import { Button } from '@/components/ui/Button';
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
  createdAt: string;
  tool: {
    id: string;
    name: string;
    category: string;
    dailyRate: number;
    condition: string;
    imageUrl?: string;
  };
}

interface ToolReservationHistoryProps {
  memberId?: string;
  compact?: boolean;
  showActions?: boolean;
  limit?: number;
}

const STATUS_CONFIG = {
  PENDING: {
    label: 'Pending',
    color: 'bg-yellow-100 text-yellow-800',
    icon: Clock
  },
  CONFIRMED: {
    label: 'Confirmed',
    color: 'bg-green-100 text-green-800',
    icon: CheckCircle
  },
  CHECKED_OUT: {
    label: 'Checked Out',
    color: 'bg-blue-100 text-blue-800',
    icon: Wrench
  },
  RETURNED: {
    label: 'Returned',
    color: 'bg-gray-100 text-gray-800',
    icon: CheckCircle
  },
  CANCELLED: {
    label: 'Cancelled',
    color: 'bg-red-100 text-red-800',
    icon: XCircle
  }
};

export function ToolReservationHistory({
  memberId,
  compact = false,
  showActions = true,
  limit = 10
}: ToolReservationHistoryProps) {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchReservations = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: limit.toString()
      });

      if (memberId) params.append('memberId', memberId);
      if (selectedStatus) params.append('status', selectedStatus);

      const response = await fetch(`/api/tools/reservations?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch reservations');
      }

      const data = await response.json();
      setReservations(data.reservations);
      setTotalPages(data.pagination.totalPages);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load reservations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReservations();
  }, [memberId, selectedStatus, currentPage, limit]);

  const handleStatusFilter = (status: string) => {
    setSelectedStatus(status);
    setCurrentPage(1);
  };

  const handleCancelReservation = async (reservationId: string) => {
    try {
      const response = await fetch('/api/tools/reservations', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          id: reservationId,
          status: 'CANCELLED'
        })
      });

      if (!response.ok) {
        throw new Error('Failed to cancel reservation');
      }

      // Refresh reservations
      await fetchReservations();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel reservation');
    }
  };

  const getReservationActions = (reservation: Reservation) => {
    const actions = [];

    if (reservation.status === 'PENDING') {
      actions.push(
        <Button
          key="cancel"
          variant="outline"
          size="sm"
          onClick={() => handleCancelReservation(reservation.id)}
          className="text-red-600 hover:text-red-700"
        >
          <XCircle className="h-4 w-4 mr-1" />
          Cancel
        </Button>
      );
    }

    actions.push(
      <Button
        key="view"
        variant="outline"
        size="sm"
        onClick={() => {
          // This would typically open a modal or navigate to detail view
          console.log('View reservation details:', reservation.id);
        }}
      >
        <Eye className="h-4 w-4 mr-1" />
        View
      </Button>
    );

    return actions;
  };

  const formatDateRange = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    
    return {
      range: `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`,
      days: `${days} day${days !== 1 ? 's' : ''}`
    };
  };

  if (loading && reservations.length === 0) {
    return (
      <div className="space-y-4">
        {Array.from({ length: compact ? 3 : 5 }).map((_, i) => (
          <LoadingSkeleton key={i} className="h-24" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card className="p-6 text-center">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Reservations</h3>
        <p className="text-gray-600 mb-4">{error}</p>
        <Button onClick={fetchReservations}>Try Again</Button>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header and Filters */}
      {!compact && (
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Tool Reservations</h3>
            <p className="text-sm text-gray-600">Your rental history and current reservations</p>
          </div>
          
          <div className="flex items-center space-x-2">
            <select
              value={selectedStatus}
              onChange={(e) => handleStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent text-sm"
            >
              <option value="">All Status</option>
              {Object.entries(STATUS_CONFIG).map(([status, config]) => (
                <option key={status} value={status}>
                  {config.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Reservations List */}
      {reservations.length === 0 ? (
        <Card className="p-8 text-center">
          <Wrench className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Reservations Found</h3>
          <p className="text-gray-600">
            {selectedStatus 
              ? `No reservations with status "${STATUS_CONFIG[selectedStatus as keyof typeof STATUS_CONFIG]?.label}"`
              : "You haven't made any tool reservations yet."}
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {reservations.map((reservation) => {
            const statusConfig = STATUS_CONFIG[reservation.status as keyof typeof STATUS_CONFIG];
            const StatusIcon = statusConfig?.icon || Clock;
            const dateInfo = formatDateRange(reservation.startDate, reservation.endDate);
            const isOverdue = reservation.status === 'CHECKED_OUT' && new Date() > new Date(reservation.endDate);
            const totalCost = reservation.totalCost + reservation.lateFees;

            return (
              <Card key={reservation.id} className={`p-4 ${isOverdue ? 'border-red-200 bg-red-50' : ''}`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-start space-x-4">
                      {/* Tool Image */}
                      {reservation.tool.imageUrl ? (
                        <img
                          src={reservation.tool.imageUrl}
                          alt={reservation.tool.name}
                          className="w-16 h-16 object-cover rounded-lg"
                        />
                      ) : (
                        <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center">
                          <Wrench className="h-8 w-8 text-gray-400" />
                        </div>
                      )}

                      {/* Reservation Details */}
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-gray-900">{reservation.tool.name}</h4>
                          <div className={`px-2 py-1 rounded-full text-xs font-medium flex items-center ${statusConfig?.color || 'bg-gray-100 text-gray-800'}`}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {statusConfig?.label || reservation.status}
                          </div>
                        </div>

                        <p className="text-sm text-gray-600 mb-2">{reservation.tool.category}</p>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-gray-600">
                          <div className="flex items-center">
                            <Calendar className="h-4 w-4 mr-2" />
                            <span>{dateInfo.range}</span>
                          </div>
                          <div className="flex items-center">
                            <Clock className="h-4 w-4 mr-2" />
                            <span>{dateInfo.days}</span>
                          </div>
                          <div className="flex items-center">
                            <DollarSign className="h-4 w-4 mr-2" />
                            <span>
                              ${totalCost}
                              {reservation.lateFees > 0 && (
                                <span className="text-red-600 ml-1">
                                  (+${reservation.lateFees} late fee)
                                </span>
                              )}
                            </span>
                          </div>
                        </div>

                        {/* Overdue Warning */}
                        {isOverdue && (
                          <div className="mt-2 flex items-center text-red-600">
                            <AlertCircle className="h-4 w-4 mr-2" />
                            <span className="text-sm font-medium">OVERDUE - Please return immediately</span>
                          </div>
                        )}

                        {/* Conditions */}
                        {(reservation.checkoutCondition || reservation.returnCondition) && (
                          <div className="mt-2 text-xs text-gray-500">
                            {reservation.checkoutCondition && (
                              <span>Checkout: {reservation.checkoutCondition}</span>
                            )}
                            {reservation.checkoutCondition && reservation.returnCondition && (
                              <span className="mx-2">•</span>
                            )}
                            {reservation.returnCondition && (
                              <span>Return: {reservation.returnCondition}</span>
                            )}
                          </div>
                        )}

                        {/* Notes */}
                        {reservation.notes && (
                          <div className="mt-2 text-xs text-gray-500">
                            <span className="font-medium">Notes:</span> {reservation.notes}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  {showActions && (
                    <div className="flex items-center space-x-2 ml-4">
                      {getReservationActions(reservation)}
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {!compact && totalPages > 1 && (
        <div className="flex items-center justify-center space-x-2">
          <Button
            variant="outline"
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
          >
            Previous
          </Button>
          
          <div className="flex items-center space-x-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const page = i + 1;
              return (
                <Button
                  key={page}
                  variant={currentPage === page ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCurrentPage(page)}
                >
                  {page}
                </Button>
              );
            })}
          </div>

          <Button
            variant="outline"
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
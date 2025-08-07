'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useContractorScheduling, Appointment } from '@/hooks/useContractorScheduling';

interface ContractorAppointmentDashboardProps {
  contractorId?: string;
}

export function ContractorAppointmentDashboard({ contractorId }: ContractorAppointmentDashboardProps) {
  const { fetchAppointments, loading, error } = useContractorScheduling();
  
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    const loadAppointments = async () => {
      try {
        const filters = selectedStatus !== 'all' ? { status: selectedStatus } : undefined;
        const appointmentsData = await fetchAppointments(filters);
        setAppointments(appointmentsData || []);
      } catch (err) {
        console.error('Error loading appointments:', err);
      }
    };

    loadAppointments();
  }, [selectedStatus, fetchAppointments]);

  const handleStatusUpdate = async (appointmentId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/scheduling/appointments/${appointmentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        throw new Error('Failed to update appointment status');
      }

      const updatedAppointment = await response.json();
      
      // Update local state
      setAppointments(prev => 
        prev.map(apt => apt.id === appointmentId ? updatedAppointment : apt)
      );

      if (selectedAppointment?.id === appointmentId) {
        setSelectedAppointment(updatedAppointment);
      }
    } catch (err) {
      console.error('Error updating appointment status:', err);
    }
  };

  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatTime = (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SCHEDULED':
        return 'bg-blue-100 text-blue-800';
      case 'CONFIRMED':
        return 'bg-green-100 text-green-800';
      case 'IN_PROGRESS':
        return 'bg-yellow-100 text-yellow-800';
      case 'COMPLETED':
        return 'bg-gray-100 text-gray-800';
      case 'CANCELLED':
        return 'bg-red-100 text-red-800';
      case 'NO_SHOW':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusActions = (appointment: Appointment) => {
    const actions = [];
    
    switch (appointment.status) {
      case 'SCHEDULED':
        actions.push(
          <Button
            key="confirm"
            size="sm"
            onClick={() => handleStatusUpdate(appointment.id, 'CONFIRMED')}
            className="bg-green-500 hover:bg-green-600"
          >
            Confirm
          </Button>
        );
        actions.push(
          <Button
            key="cancel"
            size="sm"
            variant="outline"
            onClick={() => handleStatusUpdate(appointment.id, 'CANCELLED')}
            className="text-red-600 border-red-300 hover:bg-red-50"
          >
            Cancel
          </Button>
        );
        break;
      
      case 'CONFIRMED':
        actions.push(
          <Button
            key="start"
            size="sm"
            onClick={() => handleStatusUpdate(appointment.id, 'IN_PROGRESS')}
            className="bg-yellow-500 hover:bg-yellow-600"
          >
            Start
          </Button>
        );
        actions.push(
          <Button
            key="no-show"
            size="sm"
            variant="outline"
            onClick={() => handleStatusUpdate(appointment.id, 'NO_SHOW')}
            className="text-orange-600 border-orange-300 hover:bg-orange-50"
          >
            No Show
          </Button>
        );
        break;
      
      case 'IN_PROGRESS':
        actions.push(
          <Button
            key="complete"
            size="sm"
            onClick={() => handleStatusUpdate(appointment.id, 'COMPLETED')}
            className="bg-gray-500 hover:bg-gray-600"
          >
            Complete
          </Button>
        );
        break;
    }
    
    return actions;
  };

  const statusCounts = appointments.reduce((counts, appointment) => {
    counts[appointment.status] = (counts[appointment.status] || 0) + 1;
    return counts;
  }, {} as { [key: string]: number });

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Appointments</h2>
        <div className="flex items-center space-x-4">
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Appointments</option>
            <option value="SCHEDULED">Scheduled ({statusCounts.SCHEDULED || 0})</option>
            <option value="CONFIRMED">Confirmed ({statusCounts.CONFIRMED || 0})</option>
            <option value="IN_PROGRESS">In Progress ({statusCounts.IN_PROGRESS || 0})</option>
            <option value="COMPLETED">Completed ({statusCounts.COMPLETED || 0})</option>
            <option value="CANCELLED">Cancelled ({statusCounts.CANCELLED || 0})</option>
            <option value="NO_SHOW">No Show ({statusCounts.NO_SHOW || 0})</option>
          </select>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Appointments List */}
      {appointments.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-gray-500">No appointments found.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {appointments.map((appointment) => (
            <Card key={appointment.id} className="p-6">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {appointment.service.serviceName}
                    </h3>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(appointment.status)}`}>
                      {appointment.status.replace('_', ' ')}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm text-gray-600">
                    <div>
                      <span className="font-medium">Client:</span>
                      <div>{appointment.clientName || appointment.client?.name || 'N/A'}</div>
                      <div>{appointment.clientEmail || appointment.client?.email || 'N/A'}</div>
                    </div>

                    <div>
                      <span className="font-medium">Date & Time:</span>
                      <div>{formatDate(appointment.appointmentDate)}</div>
                      <div>{formatTime(appointment.startTime)} - {formatTime(appointment.endTime)}</div>
                    </div>

                    <div>
                      <span className="font-medium">Price:</span>
                      <div>{formatPrice(appointment.totalPrice)}</div>
                      {appointment.depositRequired && (
                        <div className="text-xs">
                          Deposit: {appointment.depositPaid ? '✓ Paid' : '✗ Pending'}
                        </div>
                      )}
                    </div>

                    <div>
                      <span className="font-medium">Contact:</span>
                      <div>{appointment.clientPhone || appointment.client?.phone || 'N/A'}</div>
                    </div>
                  </div>

                  {appointment.appointmentNotes && (
                    <div className="mt-3 p-3 bg-gray-50 rounded text-sm">
                      <span className="font-medium">Notes:</span> {appointment.appointmentNotes}
                    </div>
                  )}
                </div>

                <div className="flex flex-col space-y-2 ml-4">
                  {getStatusActions(appointment)}
                  
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSelectedAppointment(appointment);
                      setShowDetails(true);
                    }}
                  >
                    Details
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Appointment Details Modal */}
      {showDetails && selectedAppointment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold">Appointment Details</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDetails(false)}
                >
                  ✕
                </Button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Service Information</h4>
                    <div className="space-y-1 text-sm">
                      <div><span className="font-medium">Service:</span> {selectedAppointment.service.serviceName}</div>
                      <div><span className="font-medium">Duration:</span> {selectedAppointment.service.duration} minutes</div>
                      <div><span className="font-medium">Price:</span> {formatPrice(selectedAppointment.totalPrice)}</div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Schedule</h4>
                    <div className="space-y-1 text-sm">
                      <div><span className="font-medium">Date:</span> {formatDate(selectedAppointment.appointmentDate)}</div>
                      <div><span className="font-medium">Start:</span> {formatTime(selectedAppointment.startTime)}</div>
                      <div><span className="font-medium">End:</span> {formatTime(selectedAppointment.endTime)}</div>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Client Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <div><span className="font-medium">Name:</span> {selectedAppointment.clientName || selectedAppointment.client?.name || 'N/A'}</div>
                      <div><span className="font-medium">Email:</span> {selectedAppointment.clientEmail || selectedAppointment.client?.email || 'N/A'}</div>
                      <div><span className="font-medium">Phone:</span> {selectedAppointment.clientPhone || selectedAppointment.client?.phone || 'N/A'}</div>
                    </div>
                    
                    {selectedAppointment.clientAddress && (
                      <div>
                        <span className="font-medium">Address:</span>
                        <div className="text-xs mt-1">
                          {selectedAppointment.clientAddress.street}<br/>
                          {selectedAppointment.clientAddress.city}, {selectedAppointment.clientAddress.state} {selectedAppointment.clientAddress.zipCode}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {selectedAppointment.appointmentNotes && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Client Notes</h4>
                    <div className="p-3 bg-gray-50 rounded text-sm">
                      {selectedAppointment.appointmentNotes}
                    </div>
                  </div>
                )}

                {selectedAppointment.internalNotes && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Internal Notes</h4>
                    <div className="p-3 bg-blue-50 rounded text-sm">
                      {selectedAppointment.internalNotes}
                    </div>
                  </div>
                )}

                <div className="flex justify-between items-center pt-4 border-t">
                  <div className="flex items-center space-x-2">
                    <span className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(selectedAppointment.status)}`}>
                      {selectedAppointment.status.replace('_', ' ')}
                    </span>
                  </div>
                  
                  <div className="flex space-x-2">
                    {getStatusActions(selectedAppointment)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
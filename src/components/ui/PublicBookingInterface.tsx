'use client';

import React, { useState } from 'react';
import { ServiceSelectionWidget } from './ServiceSelectionWidget';
import { BookingCalendarWidget } from './BookingCalendarWidget';
import { ClientBookingForm } from './ClientBookingForm';
import { ScheduleService, TimeSlot } from '@/hooks/useContractorScheduling';

interface PublicBookingInterfaceProps {
  contractorId: string;
  contractorName?: string;
  contractorCompany?: string;
}

interface BookingStep {
  step: 'service' | 'datetime' | 'details' | 'confirmation';
  service?: ScheduleService;
  date?: Date;
  timeSlot?: TimeSlot;
}

interface ClientInfo {
  name: string;
  email: string;
  phone: string;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
  };
  notes: string;
}

export function PublicBookingInterface({ 
  contractorId, 
  contractorName,
  contractorCompany 
}: PublicBookingInterfaceProps) {
  const [bookingState, setBookingState] = useState<BookingStep>({ step: 'service' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleServiceSelect = (service: ScheduleService) => {
    setBookingState({
      step: 'datetime',
      service
    });
  };

  const handleTimeSlotSelect = (date: Date, timeSlot: TimeSlot) => {
    setBookingState(prev => ({
      ...prev,
      step: 'details',
      date,
      timeSlot
    }));
  };

  const handleClientInfoSubmit = async (clientInfo: ClientInfo) => {
    if (!bookingState.service || !bookingState.date || !bookingState.timeSlot) {
      setError('Missing booking information');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Create appointment
      const appointmentData = {
        contractorId,
        serviceId: bookingState.service.id,
        appointmentDate: bookingState.date,
        startTime: new Date(`${bookingState.date.toDateString()} ${bookingState.timeSlot.startTime}`),
        endTime: new Date(`${bookingState.date.toDateString()} ${bookingState.timeSlot.endTime}`),
        clientName: clientInfo.name,
        clientEmail: clientInfo.email,
        clientPhone: clientInfo.phone,
        clientAddress: clientInfo.address.street ? clientInfo.address : undefined,
        appointmentNotes: clientInfo.notes,
        totalPrice: bookingState.service.price,
        depositAmount: bookingState.service.depositRequired ? bookingState.service.depositAmount : undefined,
      };

      const response = await fetch('/api/scheduling/appointments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(appointmentData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to book appointment');
      }

      const appointment = await response.json();
      
      setBookingState(prev => ({
        ...prev,
        step: 'confirmation',
        appointment
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to book appointment');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    switch (bookingState.step) {
      case 'datetime':
        setBookingState({ step: 'service' });
        break;
      case 'details':
        setBookingState(prev => ({ ...prev, step: 'datetime' }));
        break;
      default:
        break;
    }
  };

  const renderStepIndicator = () => {
    const steps = [
      { key: 'service', label: 'Select Service', number: 1 },
      { key: 'datetime', label: 'Choose Date & Time', number: 2 },
      { key: 'details', label: 'Your Details', number: 3 },
      { key: 'confirmation', label: 'Confirmation', number: 4 },
    ];

    const currentStepIndex = steps.findIndex(s => s.key === bookingState.step);

    return (
      <div className="flex items-center justify-center mb-8">
        {steps.map((step, index) => (
          <React.Fragment key={step.key}>
            <div className="flex items-center">
              <div
                className={`
                  w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                  ${index <= currentStepIndex
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 text-gray-600'
                  }
                `}
              >
                {step.number}
              </div>
              <span
                className={`
                  ml-2 text-sm font-medium
                  ${index <= currentStepIndex ? 'text-blue-600' : 'text-gray-500'}
                `}
              >
                {step.label}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div
                className={`
                  w-12 h-0.5 mx-4
                  ${index < currentStepIndex ? 'bg-blue-500' : 'bg-gray-200'}
                `}
              />
            )}
          </React.Fragment>
        ))}
      </div>
    );
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Book an Appointment
        </h1>
        {(contractorName || contractorCompany) && (
          <p className="text-lg text-gray-600">
            with {contractorName}{contractorCompany && ` - ${contractorCompany}`}
          </p>
        )}
      </div>

      {/* Step Indicator */}
      {renderStepIndicator()}

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      {/* Step Content */}
      {bookingState.step === 'service' && (
        <ServiceSelectionWidget
          contractorId={contractorId}
          onServiceSelect={handleServiceSelect}
        />
      )}

      {bookingState.step === 'datetime' && bookingState.service && (
        <div className="space-y-6">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Select Date & Time
            </h2>
            <p className="text-gray-600">
              for {bookingState.service.serviceName}
            </p>
          </div>
          
          <BookingCalendarWidget
            contractorId={contractorId}
            serviceId={bookingState.service.id}
            onTimeSlotSelect={handleTimeSlotSelect}
            selectedDate={bookingState.date}
            selectedTimeSlot={bookingState.timeSlot}
          />

          <div className="flex justify-center">
            <button
              onClick={handleBack}
              className="px-6 py-2 text-blue-600 hover:text-blue-800 font-medium"
            >
              ← Back to Services
            </button>
          </div>
        </div>
      )}

      {bookingState.step === 'details' && 
       bookingState.service && 
       bookingState.date && 
       bookingState.timeSlot && (
        <ClientBookingForm
          service={bookingState.service}
          selectedDate={bookingState.date}
          selectedTimeSlot={bookingState.timeSlot}
          onSubmit={handleClientInfoSubmit}
          onBack={handleBack}
          loading={loading}
        />
      )}

      {bookingState.step === 'confirmation' && (
        <div className="text-center space-y-6">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Booking Confirmed!
            </h2>
            <p className="text-gray-600">
              Your appointment has been successfully booked.
            </p>
          </div>

          {bookingState.service && bookingState.date && bookingState.timeSlot && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-6 max-w-md mx-auto">
              <h3 className="font-semibold text-green-900 mb-3">Appointment Details</h3>
              <div className="space-y-2 text-sm text-green-800">
                <div className="flex justify-between">
                  <span>Service:</span>
                  <span className="font-medium">{bookingState.service.serviceName}</span>
                </div>
                <div className="flex justify-between">
                  <span>Date:</span>
                  <span className="font-medium">{formatDate(bookingState.date)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Time:</span>
                  <span className="font-medium">
                    {formatTime(bookingState.timeSlot.startTime)} - {formatTime(bookingState.timeSlot.endTime)}
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="text-sm text-gray-600">
            <p>You will receive a confirmation email shortly.</p>
            <p>If you need to make changes, please contact us directly.</p>
          </div>

          <button
            onClick={() => setBookingState({ step: 'service' })}
            className="px-6 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 font-medium"
          >
            Book Another Appointment
          </button>
        </div>
      )}
    </div>
  );
}
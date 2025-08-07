'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useContractorScheduling, Availability, TimeSlot } from '@/hooks/useContractorScheduling';

interface BookingCalendarWidgetProps {
  contractorId: string;
  serviceId?: string;
  onTimeSlotSelect: (date: Date, timeSlot: TimeSlot) => void;
  selectedDate?: Date;
  selectedTimeSlot?: TimeSlot;
}

export function BookingCalendarWidget({
  contractorId,
  serviceId,
  onTimeSlotSelect,
  selectedDate,
  selectedTimeSlot
}: BookingCalendarWidgetProps) {
  const { checkAvailability } = useContractorScheduling();
  
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDateState, setSelectedDateState] = useState<Date | null>(selectedDate || null);
  const [availability, setAvailability] = useState<Availability | null>(null);
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Generate calendar days
  const generateCalendarDays = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    const days = [];
    const currentDate = new Date(startDate);
    
    while (currentDate <= lastDay || currentDate.getDay() !== 0) {
      days.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return days;
  };

  const calendarDays = generateCalendarDays();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Load availability when date is selected
  useEffect(() => {
    const loadAvailability = async () => {
      if (!selectedDateState || !contractorId) return;

      try {
        setLoadingAvailability(true);
        setError(null);
        
        const availabilityData = await checkAvailability(contractorId, selectedDateState, serviceId);
        setAvailability(availabilityData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load availability');
        setAvailability(null);
      } finally {
        setLoadingAvailability(false);
      }
    };

    loadAvailability();
  }, [selectedDateState, contractorId, serviceId, checkAvailability]);

  const handleDateSelect = (date: Date) => {
    if (date < today) return; // Can't select past dates
    
    setSelectedDateState(date);
    setAvailability(null);
  };

  const handleTimeSlotSelect = (timeSlot: TimeSlot) => {
    if (!selectedDateState || !timeSlot.available) return;
    
    onTimeSlotSelect(selectedDateState, timeSlot);
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

  const isDateSelected = (date: Date) => {
    return selectedDateState && 
           date.getDate() === selectedDateState.getDate() &&
           date.getMonth() === selectedDateState.getMonth() &&
           date.getFullYear() === selectedDateState.getFullYear();
  };

  const isTimeSlotSelected = (timeSlot: TimeSlot) => {
    return selectedTimeSlot && 
           timeSlot.startTime === selectedTimeSlot.startTime &&
           timeSlot.endTime === selectedTimeSlot.endTime;
  };

  return (
    <div className="space-y-6">
      {/* Calendar */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Select Date</h3>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
            >
              ←
            </Button>
            <span className="text-sm font-medium min-w-[120px] text-center">
              {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
            >
              →
            </Button>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1">
          {/* Day headers */}
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div key={day} className="p-2 text-center text-sm font-medium text-gray-500">
              {day}
            </div>
          ))}

          {/* Calendar days */}
          {calendarDays.map((date, index) => {
            const isCurrentMonth = date.getMonth() === currentMonth.getMonth();
            const isPast = date < today;
            const isSelected = isDateSelected(date);
            const isToday = date.getTime() === today.getTime();

            return (
              <button
                key={index}
                onClick={() => handleDateSelect(date)}
                disabled={isPast || !isCurrentMonth}
                className={`
                  p-2 text-sm rounded-md transition-colors
                  ${isCurrentMonth ? 'text-gray-900' : 'text-gray-300'}
                  ${isPast ? 'cursor-not-allowed opacity-50' : 'hover:bg-gray-100'}
                  ${isSelected ? 'bg-blue-500 text-white hover:bg-blue-600' : ''}
                  ${isToday && !isSelected ? 'bg-blue-100 text-blue-600' : ''}
                `}
              >
                {date.getDate()}
              </button>
            );
          })}
        </div>
      </Card>

      {/* Time Slots */}
      {selectedDateState && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">
            Available Times - {formatDate(selectedDateState)}
          </h3>

          {loadingAvailability ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              <span className="ml-2 text-gray-600">Loading availability...</span>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-red-600 mb-2">{error}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedDateState(new Date(selectedDateState))}
              >
                Retry
              </Button>
            </div>
          ) : availability && !availability.available ? (
            <div className="text-center py-8 text-gray-500">
              <p>{availability.message || 'No available time slots for this date.'}</p>
            </div>
          ) : availability && availability.timeSlots.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {availability.timeSlots.map((timeSlot, index) => (
                <button
                  key={index}
                  onClick={() => handleTimeSlotSelect(timeSlot)}
                  disabled={!timeSlot.available}
                  className={`
                    p-3 text-sm rounded-md border transition-colors
                    ${timeSlot.available 
                      ? 'border-gray-200 hover:border-blue-300 hover:bg-blue-50' 
                      : 'border-gray-100 bg-gray-50 text-gray-400 cursor-not-allowed'
                    }
                    ${isTimeSlotSelected(timeSlot) 
                      ? 'border-blue-500 bg-blue-500 text-white' 
                      : ''
                    }
                  `}
                >
                  {formatTime(timeSlot.startTime)} - {formatTime(timeSlot.endTime)}
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>No available time slots for this date.</p>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
'use client';

import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar, Clock, DollarSign, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';

interface CalendarDay {
  date: string;
  available: boolean;
  reason?: string | null;
}

interface Reservation {
  id: string;
  startDate: string;
  endDate: string;
  status: string;
  member?: {
    name: string;
    email: string;
  };
}

interface MaintenanceRecord {
  id: string;
  type: string;
  description: string;
  scheduledDate: string;
  status: string;
}

interface Tool {
  id: string;
  name: string;
  category: string;
  dailyRate: number;
  condition: string;
  isAvailable: boolean;
  requiresTraining: boolean;
}

interface ReservationCalendarProps {
  toolId: string;
  onDateRangeSelect?: (startDate: Date, endDate: Date, cost: number) => void;
  onReservationCreate?: (reservationData: any) => void;
  selectedStartDate?: Date | null;
  selectedEndDate?: Date | null;
  maxDays?: number;
}

export function ReservationCalendar({
  toolId,
  onDateRangeSelect,
  onReservationCreate,
  selectedStartDate = null,
  selectedEndDate = null,
  maxDays = 30
}: ReservationCalendarProps) {
  const [tool, setTool] = useState<Tool | null>(null);
  const [calendar, setCalendar] = useState<CalendarDay[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [maintenance, setMaintenance] = useState<MaintenanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [startDate, setStartDate] = useState<Date | null>(selectedStartDate);
  const [endDate, setEndDate] = useState<Date | null>(selectedEndDate);
  const [isSelecting, setIsSelecting] = useState(false);
  const [hoveredDate, setHoveredDate] = useState<Date | null>(null);

  const fetchAvailability = async () => {
    try {
      setLoading(true);
      const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
      const endOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
      
      const params = new URLSearchParams({
        startDate: startOfMonth.toISOString(),
        endDate: endOfMonth.toISOString()
      });

      const response = await fetch(`/api/tools/${toolId}/availability?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch availability');
      }

      const data = await response.json();
      setTool(data.tool);
      setCalendar(data.availability);
      setReservations(data.reservations);
      setMaintenance(data.maintenance);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load availability');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (toolId) {
      fetchAvailability();
    }
  }, [toolId, currentMonth]);

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }
    
    return days;
  };

  const getCalendarDayInfo = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return calendar.find(day => day.date === dateStr);
  };

  const isDateInRange = (date: Date) => {
    if (!startDate || !endDate) return false;
    return date >= startDate && date <= endDate;
  };

  const isDateInHoverRange = (date: Date) => {
    if (!startDate || !hoveredDate || endDate) return false;
    const start = startDate < hoveredDate ? startDate : hoveredDate;
    const end = startDate < hoveredDate ? hoveredDate : startDate;
    return date >= start && date <= end;
  };

  const handleDateClick = (date: Date) => {
    const dayInfo = getCalendarDayInfo(date);
    if (!dayInfo?.available) return;

    if (!startDate || (startDate && endDate)) {
      // Start new selection
      setStartDate(date);
      setEndDate(null);
      setIsSelecting(true);
    } else if (startDate && !endDate) {
      // Complete selection
      const newEndDate = date >= startDate ? date : startDate;
      const newStartDate = date >= startDate ? startDate : date;
      
      // Check if range is valid (no unavailable days in between)
      const isValidRange = checkDateRangeAvailability(newStartDate, newEndDate);
      
      if (isValidRange) {
        setStartDate(newStartDate);
        setEndDate(newEndDate);
        setIsSelecting(false);
        
        if (onDateRangeSelect && tool) {
          const days = Math.ceil((newEndDate.getTime() - newStartDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
          const cost = days * tool.dailyRate;
          onDateRangeSelect(newStartDate, newEndDate, cost);
        }
      } else {
        // Invalid range, start over
        setStartDate(date);
        setEndDate(null);
      }
    }
  };

  const checkDateRangeAvailability = (start: Date, end: Date) => {
    const current = new Date(start);
    while (current <= end) {
      const dayInfo = getCalendarDayInfo(current);
      if (!dayInfo?.available) return false;
      current.setDate(current.getDate() + 1);
    }
    return true;
  };

  const handleDateHover = (date: Date) => {
    if (isSelecting && startDate && !endDate) {
      setHoveredDate(date);
    }
  };

  const clearSelection = () => {
    setStartDate(null);
    setEndDate(null);
    setIsSelecting(false);
    setHoveredDate(null);
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth(prev => {
      const newMonth = new Date(prev);
      if (direction === 'prev') {
        newMonth.setMonth(newMonth.getMonth() - 1);
      } else {
        newMonth.setMonth(newMonth.getMonth() + 1);
      }
      return newMonth;
    });
  };

  const calculateCost = () => {
    if (!startDate || !endDate || !tool) return 0;
    const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return days * tool.dailyRate;
  };

  const getDayClassName = (date: Date) => {
    const dayInfo = getCalendarDayInfo(date);
    const isToday = date.toDateString() === new Date().toDateString();
    const isSelected = (startDate && date.toDateString() === startDate.toDateString()) ||
                      (endDate && date.toDateString() === endDate.toDateString());
    const isInRange = isDateInRange(date);
    const isInHoverRange = isDateInHoverRange(date);
    
    let className = 'w-10 h-10 flex items-center justify-center text-sm rounded-lg transition-colors ';
    
    if (!dayInfo?.available) {
      className += 'text-gray-300 cursor-not-allowed ';
      if (dayInfo?.reason === 'reserved') {
        className += 'bg-red-50 ';
      } else if (dayInfo?.reason === 'maintenance') {
        className += 'bg-orange-50 ';
      }
    } else {
      className += 'cursor-pointer hover:bg-yellow-50 ';
      
      if (isSelected) {
        className += 'bg-yellow-500 text-white ';
      } else if (isInRange || isInHoverRange) {
        className += 'bg-yellow-100 text-yellow-800 ';
      } else if (isToday) {
        className += 'bg-blue-100 text-blue-800 ';
      } else {
        className += 'text-gray-700 ';
      }
    }
    
    return className;
  };

  if (loading) {
    return (
      <Card className="p-6">
        <LoadingSkeleton className="h-8 w-48 mb-4" />
        <LoadingSkeleton className="h-64 w-full" />
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-6 text-center">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Calendar</h3>
        <p className="text-gray-600 mb-4">{error}</p>
        <Button onClick={fetchAvailability}>Try Again</Button>
      </Card>
    );
  }

  const days = getDaysInMonth(currentMonth);
  const monthYear = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <Card className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            {tool?.name} - Availability Calendar
          </h3>
          <p className="text-sm text-gray-600">
            Select your rental dates
          </p>
        </div>
        
        {startDate && endDate && (
          <Button variant="outline" size="sm" onClick={clearSelection}>
            Clear Selection
          </Button>
        )}
      </div>

      {/* Calendar Navigation */}
      <div className="flex items-center justify-between mb-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigateMonth('prev')}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        
        <h4 className="text-lg font-medium text-gray-900">{monthYear}</h4>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigateMonth('next')}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Calendar Grid */}
      <div className="mb-6">
        {/* Day Headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
              {day}
            </div>
          ))}
        </div>
        
        {/* Calendar Days */}
        <div className="grid grid-cols-7 gap-1">
          {days.map((date, index) => (
            <div key={index} className="flex justify-center">
              {date ? (
                <button
                  className={getDayClassName(date)}
                  onClick={() => handleDateClick(date)}
                  onMouseEnter={() => handleDateHover(date)}
                  disabled={!getCalendarDayInfo(date)?.available}
                >
                  {date.getDate()}
                </button>
              ) : (
                <div className="w-10 h-10" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 text-sm">
        <div className="flex items-center">
          <div className="w-4 h-4 bg-green-100 border border-green-200 rounded mr-2" />
          <span>Available</span>
        </div>
        <div className="flex items-center">
          <div className="w-4 h-4 bg-red-50 border border-red-200 rounded mr-2" />
          <span>Reserved</span>
        </div>
        <div className="flex items-center">
          <div className="w-4 h-4 bg-orange-50 border border-orange-200 rounded mr-2" />
          <span>Maintenance</span>
        </div>
        <div className="flex items-center">
          <div className="w-4 h-4 bg-yellow-500 rounded mr-2" />
          <span>Selected</span>
        </div>
      </div>

      {/* Selection Summary */}
      {startDate && endDate && tool && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-gray-900 mb-1">Reservation Summary</h4>
              <div className="space-y-1 text-sm text-gray-600">
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 mr-2" />
                  {startDate.toLocaleDateString()} - {endDate.toLocaleDateString()}
                </div>
                <div className="flex items-center">
                  <Clock className="h-4 w-4 mr-2" />
                  {Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1} days
                </div>
                <div className="flex items-center">
                  <DollarSign className="h-4 w-4 mr-2" />
                  ${calculateCost()} total (${tool.dailyRate}/day)
                </div>
              </div>
            </div>
            
            {onReservationCreate && (
              <Button
                onClick={() => onReservationCreate({
                  toolId,
                  startDate: startDate.toISOString(),
                  endDate: endDate.toISOString(),
                  totalCost: calculateCost()
                })}
              >
                Reserve Tool
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Existing Reservations */}
      {reservations.length > 0 && (
        <div className="mt-6">
          <h4 className="font-medium text-gray-900 mb-3">Upcoming Reservations</h4>
          <div className="space-y-2">
            {reservations.slice(0, 3).map((reservation) => (
              <div key={reservation.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <div className="text-sm font-medium text-gray-900">
                    {new Date(reservation.startDate).toLocaleDateString()} - {new Date(reservation.endDate).toLocaleDateString()}
                  </div>
                  {reservation.member && (
                    <div className="text-xs text-gray-600">
                      Reserved by {reservation.member.name}
                    </div>
                  )}
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  reservation.status === 'CONFIRMED' ? 'bg-green-100 text-green-800' :
                  reservation.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {reservation.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
import { useState, useEffect, useCallback } from 'react';

export interface ContractorSchedule {
  id: string;
  contractorId: string;
  timezone: string;
  workingHours: {
    monday: { start: string; end: string; enabled: boolean };
    tuesday: { start: string; end: string; enabled: boolean };
    wednesday: { start: string; end: string; enabled: boolean };
    thursday: { start: string; end: string; enabled: boolean };
    friday: { start: string; end: string; enabled: boolean };
    saturday: { start: string; end: string; enabled: boolean };
    sunday: { start: string; end: string; enabled: boolean };
  };
  availabilityRules?: {
    blackoutDates: string[];
    recurringUnavailable: Array<{
      dayOfWeek: number;
      startTime: string;
      endTime: string;
    }>;
  };
  bufferTime: number;
  advanceBookingDays: number;
  minimumNoticeHours: number;
  isAcceptingBookings: boolean;
  autoConfirmBookings: boolean;
  requiresDeposit: boolean;
  depositPercentage: number;
  cancellationPolicy: {
    allowCancellation: boolean;
    cancellationDeadlineHours: number;
    refundPolicy: 'FULL' | 'PARTIAL' | 'NO_REFUND';
    partialRefundPercentage?: number;
  };
  services: ScheduleService[];
}

export interface ScheduleService {
  id: string;
  contractorId: string;
  serviceName: string;
  description?: string;
  duration: number;
  price: number;
  depositRequired: boolean;
  depositAmount?: number;
  preparationTime: number;
  cleanupTime: number;
  category?: string;
  requirements?: string[];
  isActive: boolean;
}

export interface Appointment {
  id: string;
  contractorId: string;
  clientId?: string;
  serviceId: string;
  appointmentDate: Date;
  startTime: Date;
  endTime: Date;
  status: string;
  clientName?: string;
  clientEmail?: string;
  clientPhone?: string;
  clientAddress?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
  };
  appointmentNotes?: string;
  totalPrice: number;
  depositPaid: boolean;
  depositAmount?: number;
  remainingBalance?: number;
  paymentStatus: string;
  service: ScheduleService;
}

export interface TimeSlot {
  startTime: string;
  endTime: string;
  available: boolean;
}

export interface Availability {
  available: boolean;
  timeSlots: TimeSlot[];
  workingHours?: {
    start: string;
    end: string;
    enabled: boolean;
  };
  message?: string;
}

export function useContractorScheduling() {
  const [schedule, setSchedule] = useState<ContractorSchedule | null>(null);
  const [services, setServices] = useState<ScheduleService[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch contractor schedule
  const fetchSchedule = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/scheduling/contractor-schedule');
      if (!response.ok) {
        if (response.status === 404) {
          setSchedule(null);
          return;
        }
        throw new Error('Failed to fetch schedule');
      }

      const scheduleData = await response.json();
      setSchedule(scheduleData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch schedule');
    } finally {
      setLoading(false);
    }
  }, []);

  // Create contractor schedule
  const createSchedule = useCallback(async (scheduleData: Partial<ContractorSchedule>) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/scheduling/contractor-schedule', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(scheduleData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create schedule');
      }

      const newSchedule = await response.json();
      setSchedule(newSchedule);
      return newSchedule;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create schedule';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  // Update contractor schedule
  const updateSchedule = useCallback(async (updates: Partial<ContractorSchedule>) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/scheduling/contractor-schedule', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update schedule');
      }

      const updatedSchedule = await response.json();
      setSchedule(updatedSchedule);
      return updatedSchedule;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update schedule';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch services
  const fetchServices = useCallback(async (contractorId?: string) => {
    try {
      setLoading(true);
      setError(null);

      const url = contractorId 
        ? `/api/scheduling/services?contractorId=${contractorId}`
        : '/api/scheduling/services';

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch services');
      }

      const servicesData = await response.json();
      setServices(servicesData);
      return servicesData;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch services');
    } finally {
      setLoading(false);
    }
  }, []);

  // Create service
  const createService = useCallback(async (serviceData: Partial<ScheduleService>) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/scheduling/services', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(serviceData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create service');
      }

      const newService = await response.json();
      setServices(prev => [...prev, newService]);
      return newService;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create service';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  // Update service
  const updateService = useCallback(async (serviceId: string, updates: Partial<ScheduleService>) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/scheduling/services', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ serviceId, ...updates }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update service');
      }

      const updatedService = await response.json();
      setServices(prev => prev.map(service => 
        service.id === serviceId ? updatedService : service
      ));
      return updatedService;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update service';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  // Delete service
  const deleteService = useCallback(async (serviceId: string) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/scheduling/services?serviceId=${serviceId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete service');
      }

      setServices(prev => prev.filter(service => service.id !== serviceId));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete service';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  // Check availability
  const checkAvailability = useCallback(async (
    contractorId: string, 
    date: Date, 
    serviceId?: string
  ): Promise<Availability> => {
    try {
      const dateStr = date.toISOString().split('T')[0];
      const url = serviceId 
        ? `/api/scheduling/availability?contractorId=${contractorId}&date=${dateStr}&serviceId=${serviceId}`
        : `/api/scheduling/availability?contractorId=${contractorId}&date=${dateStr}`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to check availability');
      }

      return await response.json();
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to check availability');
    }
  }, []);

  // Check availability for date range
  const checkDateRangeAvailability = useCallback(async (
    contractorId: string,
    startDate: Date,
    endDate: Date
  ) => {
    try {
      const response = await fetch('/api/scheduling/availability', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contractorId,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to check date range availability');
      }

      return await response.json();
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to check date range availability');
    }
  }, []);

  // Fetch appointments
  const fetchAppointments = useCallback(async (filters?: {
    status?: string;
    startDate?: Date;
    endDate?: Date;
  }) => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (filters?.status) params.append('status', filters.status);
      if (filters?.startDate) params.append('startDate', filters.startDate.toISOString());
      if (filters?.endDate) params.append('endDate', filters.endDate.toISOString());

      const response = await fetch(`/api/scheduling/appointments?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch appointments');
      }

      const appointmentsData = await response.json();
      setAppointments(appointmentsData);
      return appointmentsData;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch appointments');
    } finally {
      setLoading(false);
    }
  }, []);

  // Get scheduling analytics
  const getAnalytics = useCallback(async (startDate: Date, endDate: Date) => {
    try {
      const response = await fetch('/api/scheduling/analytics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch analytics');
      }

      return await response.json();
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to fetch analytics');
    }
  }, []);

  // Initialize data on mount
  useEffect(() => {
    fetchSchedule();
    fetchServices();
  }, [fetchSchedule, fetchServices]);

  return {
    // State
    schedule,
    services,
    appointments,
    loading,
    error,

    // Schedule management
    fetchSchedule,
    createSchedule,
    updateSchedule,

    // Service management
    fetchServices,
    createService,
    updateService,
    deleteService,

    // Availability
    checkAvailability,
    checkDateRangeAvailability,

    // Appointments
    fetchAppointments,

    // Analytics
    getAnalytics,

    // Utilities
    clearError: () => setError(null),
  };
}
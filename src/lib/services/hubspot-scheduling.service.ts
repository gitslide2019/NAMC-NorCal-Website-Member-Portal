import { Client } from '@hubspot/api-client';
import { prisma } from '@/lib/prisma';

export interface ContractorScheduleData {
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
}

export interface ScheduleServiceData {
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
}

export interface AppointmentData {
  contractorId: string;
  clientId?: string;
  serviceId: string;
  appointmentDate: Date;
  startTime: Date;
  endTime: Date;
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
  depositAmount?: number;
}

export class HubSpotSchedulingService {
  private hubspotClient: Client;

  constructor() {
    this.hubspotClient = new Client({
      accessToken: process.env.HUBSPOT_ACCESS_TOKEN
    });
  }

  // Contractor Schedule Management
  async createContractorSchedule(scheduleData: ContractorScheduleData) {
    try {
      // Create local schedule record
      const schedule = await prisma.contractorSchedule.create({
        data: {
          contractorId: scheduleData.contractorId,
          timezone: scheduleData.timezone,
          workingHours: JSON.stringify(scheduleData.workingHours),
          availabilityRules: scheduleData.availabilityRules ? JSON.stringify(scheduleData.availabilityRules) : null,
          bufferTime: scheduleData.bufferTime,
          advanceBookingDays: scheduleData.advanceBookingDays,
          minimumNoticeHours: scheduleData.minimumNoticeHours,
          isAcceptingBookings: scheduleData.isAcceptingBookings,
          autoConfirmBookings: scheduleData.autoConfirmBookings,
          requiresDeposit: scheduleData.requiresDeposit,
          depositPercentage: scheduleData.depositPercentage,
          cancellationPolicy: JSON.stringify(scheduleData.cancellationPolicy),
        }
      });

      // Create HubSpot custom object for contractor schedule
      const hubspotSchedule = await this.hubspotClient.crm.objects.basicApi.create('contractor_schedules', {
        properties: {
          contractor_id: scheduleData.contractorId,
          timezone: scheduleData.timezone,
          working_hours: JSON.stringify(scheduleData.workingHours),
          buffer_time: scheduleData.bufferTime.toString(),
          advance_booking_days: scheduleData.advanceBookingDays.toString(),
          minimum_notice_hours: scheduleData.minimumNoticeHours.toString(),
          is_accepting_bookings: scheduleData.isAcceptingBookings.toString(),
          auto_confirm_bookings: scheduleData.autoConfirmBookings.toString(),
          requires_deposit: scheduleData.requiresDeposit.toString(),
          deposit_percentage: scheduleData.depositPercentage.toString(),
          cancellation_policy: JSON.stringify(scheduleData.cancellationPolicy),
        },
        associations: [
          {
            to: { id: scheduleData.contractorId },
            types: [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 1 }]
          }
        ]
      });

      // Update local record with HubSpot ID
      await prisma.contractorSchedule.update({
        where: { id: schedule.id },
        data: {
          hubspotObjectId: hubspotSchedule.id,
          hubspotSyncStatus: 'SYNCED',
          hubspotLastSync: new Date()
        }
      });

      return schedule;
    } catch (error) {
      console.error('Error creating contractor schedule:', error);
      throw error;
    }
  }

  async updateContractorSchedule(scheduleId: string, updates: Partial<ContractorScheduleData>) {
    try {
      const schedule = await prisma.contractorSchedule.findUnique({
        where: { id: scheduleId }
      });

      if (!schedule) {
        throw new Error('Schedule not found');
      }

      // Update local record
      const updatedSchedule = await prisma.contractorSchedule.update({
        where: { id: scheduleId },
        data: {
          ...(updates.timezone && { timezone: updates.timezone }),
          ...(updates.workingHours && { workingHours: JSON.stringify(updates.workingHours) }),
          ...(updates.availabilityRules && { availabilityRules: JSON.stringify(updates.availabilityRules) }),
          ...(updates.bufferTime !== undefined && { bufferTime: updates.bufferTime }),
          ...(updates.advanceBookingDays !== undefined && { advanceBookingDays: updates.advanceBookingDays }),
          ...(updates.minimumNoticeHours !== undefined && { minimumNoticeHours: updates.minimumNoticeHours }),
          ...(updates.isAcceptingBookings !== undefined && { isAcceptingBookings: updates.isAcceptingBookings }),
          ...(updates.autoConfirmBookings !== undefined && { autoConfirmBookings: updates.autoConfirmBookings }),
          ...(updates.requiresDeposit !== undefined && { requiresDeposit: updates.requiresDeposit }),
          ...(updates.depositPercentage !== undefined && { depositPercentage: updates.depositPercentage }),
          ...(updates.cancellationPolicy && { cancellationPolicy: JSON.stringify(updates.cancellationPolicy) }),
          hubspotSyncStatus: 'PENDING'
        }
      });

      // Update HubSpot record if it exists
      if (schedule.hubspotObjectId) {
        const hubspotProperties: any = {};
        
        if (updates.timezone) hubspotProperties.timezone = updates.timezone;
        if (updates.workingHours) hubspotProperties.working_hours = JSON.stringify(updates.workingHours);
        if (updates.bufferTime !== undefined) hubspotProperties.buffer_time = updates.bufferTime.toString();
        if (updates.advanceBookingDays !== undefined) hubspotProperties.advance_booking_days = updates.advanceBookingDays.toString();
        if (updates.minimumNoticeHours !== undefined) hubspotProperties.minimum_notice_hours = updates.minimumNoticeHours.toString();
        if (updates.isAcceptingBookings !== undefined) hubspotProperties.is_accepting_bookings = updates.isAcceptingBookings.toString();
        if (updates.autoConfirmBookings !== undefined) hubspotProperties.auto_confirm_bookings = updates.autoConfirmBookings.toString();
        if (updates.requiresDeposit !== undefined) hubspotProperties.requires_deposit = updates.requiresDeposit.toString();
        if (updates.depositPercentage !== undefined) hubspotProperties.deposit_percentage = updates.depositPercentage.toString();
        if (updates.cancellationPolicy) hubspotProperties.cancellation_policy = JSON.stringify(updates.cancellationPolicy);

        await this.hubspotClient.crm.objects.basicApi.update('contractor_schedules', schedule.hubspotObjectId, {
          properties: hubspotProperties
        });

        // Update sync status
        await prisma.contractorSchedule.update({
          where: { id: scheduleId },
          data: {
            hubspotSyncStatus: 'SYNCED',
            hubspotLastSync: new Date()
          }
        });
      }

      return updatedSchedule;
    } catch (error) {
      console.error('Error updating contractor schedule:', error);
      throw error;
    }
  }

  // Schedule Service Management
  async createScheduleService(serviceData: ScheduleServiceData) {
    try {
      // Get contractor schedule
      const schedule = await prisma.contractorSchedule.findUnique({
        where: { contractorId: serviceData.contractorId }
      });

      if (!schedule) {
        throw new Error('Contractor schedule not found');
      }

      // Create local service record
      const service = await prisma.scheduleService.create({
        data: {
          contractorId: serviceData.contractorId,
          scheduleId: schedule.id,
          serviceName: serviceData.serviceName,
          description: serviceData.description,
          duration: serviceData.duration,
          price: serviceData.price,
          depositRequired: serviceData.depositRequired,
          depositAmount: serviceData.depositAmount,
          preparationTime: serviceData.preparationTime,
          cleanupTime: serviceData.cleanupTime,
          category: serviceData.category,
          requirements: serviceData.requirements ? JSON.stringify(serviceData.requirements) : null,
        }
      });

      // Create HubSpot custom object for schedule service
      const hubspotService = await this.hubspotClient.crm.objects.basicApi.create('schedule_services', {
        properties: {
          contractor_id: serviceData.contractorId,
          service_name: serviceData.serviceName,
          description: serviceData.description || '',
          duration: serviceData.duration.toString(),
          price: serviceData.price.toString(),
          deposit_required: serviceData.depositRequired.toString(),
          deposit_amount: serviceData.depositAmount?.toString() || '0',
          preparation_time: serviceData.preparationTime.toString(),
          cleanup_time: serviceData.cleanupTime.toString(),
          category: serviceData.category || '',
          requirements: serviceData.requirements ? JSON.stringify(serviceData.requirements) : '',
        },
        associations: [
          {
            to: { id: serviceData.contractorId },
            types: [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 1 }]
          }
        ]
      });

      // Update local record with HubSpot ID
      await prisma.scheduleService.update({
        where: { id: service.id },
        data: {
          hubspotObjectId: hubspotService.id,
          hubspotSyncStatus: 'SYNCED',
          hubspotLastSync: new Date()
        }
      });

      return service;
    } catch (error) {
      console.error('Error creating schedule service:', error);
      throw error;
    }
  }

  // Appointment Management
  async createAppointment(appointmentData: AppointmentData) {
    try {
      // Get contractor schedule and service
      const [schedule, service] = await Promise.all([
        prisma.contractorSchedule.findUnique({
          where: { contractorId: appointmentData.contractorId }
        }),
        prisma.scheduleService.findUnique({
          where: { id: appointmentData.serviceId }
        })
      ]);

      if (!schedule || !service) {
        throw new Error('Schedule or service not found');
      }

      // Create local appointment record
      const appointment = await prisma.appointment.create({
        data: {
          contractorId: appointmentData.contractorId,
          clientId: appointmentData.clientId,
          scheduleId: schedule.id,
          serviceId: appointmentData.serviceId,
          appointmentDate: appointmentData.appointmentDate,
          startTime: appointmentData.startTime,
          endTime: appointmentData.endTime,
          clientName: appointmentData.clientName,
          clientEmail: appointmentData.clientEmail,
          clientPhone: appointmentData.clientPhone,
          clientAddress: appointmentData.clientAddress ? JSON.stringify(appointmentData.clientAddress) : null,
          appointmentNotes: appointmentData.appointmentNotes,
          totalPrice: appointmentData.totalPrice,
          depositAmount: appointmentData.depositAmount,
          remainingBalance: appointmentData.totalPrice - (appointmentData.depositAmount || 0),
        }
      });

      // Create or find HubSpot contact for client
      let hubspotContactId = appointmentData.clientId;
      
      if (!appointmentData.clientId && appointmentData.clientEmail) {
        // Create HubSpot contact for non-member client
        const hubspotContact = await this.hubspotClient.crm.contacts.basicApi.create({
          properties: {
            email: appointmentData.clientEmail,
            firstname: appointmentData.clientName?.split(' ')[0] || '',
            lastname: appointmentData.clientName?.split(' ').slice(1).join(' ') || '',
            phone: appointmentData.clientPhone || '',
            lead_source: 'appointment_booking',
          }
        });
        hubspotContactId = hubspotContact.id;
      }

      // Create HubSpot deal for appointment
      const hubspotDeal = await this.hubspotClient.crm.deals.basicApi.create({
        properties: {
          dealname: `${service.serviceName} - ${appointmentData.clientName || 'Client'}`,
          dealstage: 'appointment_scheduled',
          amount: appointmentData.totalPrice.toString(),
          pipeline: 'contractor_appointments',
          appointment_date: appointmentData.appointmentDate.toISOString(),
          service_type: service.serviceName,
          appointment_duration: service.duration.toString(),
          deposit_amount: appointmentData.depositAmount?.toString() || '0',
          appointment_status: 'SCHEDULED',
        },
        associations: [
          // Associate with contractor
          {
            to: { id: appointmentData.contractorId },
            types: [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 3 }]
          },
          // Associate with client contact if available
          ...(hubspotContactId ? [{
            to: { id: hubspotContactId },
            types: [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 3 }]
          }] : [])
        ]
      });

      // Update local record with HubSpot IDs
      await prisma.appointment.update({
        where: { id: appointment.id },
        data: {
          hubspotDealId: hubspotDeal.id,
          hubspotContactId: hubspotContactId,
          hubspotSyncStatus: 'SYNCED',
          hubspotLastSync: new Date()
        }
      });

      // Trigger HubSpot workflow for appointment confirmation
      await this.triggerAppointmentWorkflow('appointment_scheduled', hubspotDeal.id);

      return appointment;
    } catch (error) {
      console.error('Error creating appointment:', error);
      throw error;
    }
  }

  async updateAppointmentStatus(appointmentId: string, status: string, notes?: string) {
    try {
      const appointment = await prisma.appointment.findUnique({
        where: { id: appointmentId }
      });

      if (!appointment) {
        throw new Error('Appointment not found');
      }

      // Update local record
      const updatedAppointment = await prisma.appointment.update({
        where: { id: appointmentId },
        data: {
          status,
          ...(notes && { internalNotes: notes }),
          ...(status === 'COMPLETED' && { completedAt: new Date() }),
          ...(status === 'CANCELLED' && { cancelledAt: new Date() }),
          hubspotSyncStatus: 'PENDING'
        }
      });

      // Update HubSpot deal if it exists
      if (appointment.hubspotDealId) {
        const dealStageMap: { [key: string]: string } = {
          'SCHEDULED': 'appointment_scheduled',
          'CONFIRMED': 'appointment_confirmed',
          'IN_PROGRESS': 'appointment_in_progress',
          'COMPLETED': 'appointment_completed',
          'CANCELLED': 'appointment_cancelled',
          'NO_SHOW': 'appointment_no_show'
        };

        await this.hubspotClient.crm.deals.basicApi.update(appointment.hubspotDealId, {
          properties: {
            dealstage: dealStageMap[status] || 'appointment_scheduled',
            appointment_status: status,
            ...(notes && { appointment_notes: notes })
          }
        });

        // Trigger appropriate workflow
        await this.triggerAppointmentWorkflow(`appointment_${status.toLowerCase()}`, appointment.hubspotDealId);

        // Update sync status
        await prisma.appointment.update({
          where: { id: appointmentId },
          data: {
            hubspotSyncStatus: 'SYNCED',
            hubspotLastSync: new Date()
          }
        });
      }

      return updatedAppointment;
    } catch (error) {
      console.error('Error updating appointment status:', error);
      throw error;
    }
  }

  // Availability Checking
  async getContractorAvailability(contractorId: string, date: Date) {
    try {
      const schedule = await prisma.contractorSchedule.findUnique({
        where: { contractorId },
        include: {
          services: true,
          appointments: {
            where: {
              appointmentDate: {
                gte: new Date(date.getFullYear(), date.getMonth(), date.getDate()),
                lt: new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1)
              },
              status: {
                in: ['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS']
              }
            }
          }
        }
      });

      if (!schedule) {
        return { available: false, timeSlots: [] };
      }

      const workingHours = JSON.parse(schedule.workingHours);
      const dayOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][date.getDay()];
      const daySchedule = workingHours[dayOfWeek];

      if (!daySchedule.enabled) {
        return { available: false, timeSlots: [] };
      }

      // Generate available time slots
      const timeSlots = this.generateTimeSlots(
        daySchedule.start,
        daySchedule.end,
        schedule.bufferTime,
        schedule.appointments
      );

      return {
        available: timeSlots.length > 0,
        timeSlots,
        workingHours: daySchedule
      };
    } catch (error) {
      console.error('Error getting contractor availability:', error);
      throw error;
    }
  }

  private generateTimeSlots(startTime: string, endTime: string, bufferTime: number, existingAppointments: any[]) {
    const slots = [];
    const start = new Date(`2000-01-01T${startTime}`);
    const end = new Date(`2000-01-01T${endTime}`);
    
    let current = new Date(start);
    
    while (current < end) {
      const slotEnd = new Date(current.getTime() + 60 * 60 * 1000); // 1 hour slots
      
      // Check if slot conflicts with existing appointments
      const hasConflict = existingAppointments.some(appointment => {
        const appointmentStart = new Date(appointment.startTime);
        const appointmentEnd = new Date(appointment.endTime);
        
        return (current < appointmentEnd && slotEnd > appointmentStart);
      });
      
      if (!hasConflict) {
        slots.push({
          startTime: current.toTimeString().slice(0, 5),
          endTime: slotEnd.toTimeString().slice(0, 5),
          available: true
        });
      }
      
      current = new Date(current.getTime() + (bufferTime + 60) * 60 * 1000);
    }
    
    return slots;
  }

  private async triggerAppointmentWorkflow(workflowType: string, dealId: string) {
    try {
      // This would trigger HubSpot workflows based on appointment events
      // Implementation depends on specific HubSpot workflow setup
      console.log(`Triggering workflow: ${workflowType} for deal: ${dealId}`);
    } catch (error) {
      console.error('Error triggering appointment workflow:', error);
    }
  }

  // Analytics and Reporting
  async getSchedulingAnalytics(contractorId: string, startDate: Date, endDate: Date) {
    try {
      const appointments = await prisma.appointment.findMany({
        where: {
          contractorId,
          appointmentDate: {
            gte: startDate,
            lte: endDate
          }
        },
        include: {
          service: true
        }
      });

      const analytics = {
        totalBookings: appointments.length,
        confirmedBookings: appointments.filter(a => a.status === 'CONFIRMED').length,
        completedBookings: appointments.filter(a => a.status === 'COMPLETED').length,
        cancelledBookings: appointments.filter(a => a.status === 'CANCELLED').length,
        noShowBookings: appointments.filter(a => a.status === 'NO_SHOW').length,
        totalRevenue: appointments
          .filter(a => a.status === 'COMPLETED')
          .reduce((sum, a) => sum + a.totalPrice, 0),
        averageBookingValue: 0,
        bookingConversionRate: 0,
        serviceBreakdown: {} as { [key: string]: number }
      };

      analytics.averageBookingValue = analytics.totalBookings > 0 
        ? analytics.totalRevenue / analytics.completedBookings 
        : 0;

      analytics.bookingConversionRate = analytics.totalBookings > 0 
        ? (analytics.completedBookings / analytics.totalBookings) * 100 
        : 0;

      // Service breakdown
      appointments.forEach(appointment => {
        const serviceName = appointment.service.serviceName;
        analytics.serviceBreakdown[serviceName] = (analytics.serviceBreakdown[serviceName] || 0) + 1;
      });

      return analytics;
    } catch (error) {
      console.error('Error getting scheduling analytics:', error);
      throw error;
    }
  }
}

export const hubspotSchedulingService = new HubSpotSchedulingService();
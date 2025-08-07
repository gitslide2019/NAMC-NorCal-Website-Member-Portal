import { NextRequest, NextResponse } from 'next/server';
import { hubspotSchedulingService } from '@/lib/services/hubspot-scheduling.service';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const contractorId = searchParams.get('contractorId');
    const dateStr = searchParams.get('date');
    const serviceId = searchParams.get('serviceId');
    
    if (!contractorId || !dateStr) {
      return NextResponse.json(
        { error: 'Contractor ID and date are required' },
        { status: 400 }
      );
    }

    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date format' },
        { status: 400 }
      );
    }

    // Check if date is in the past
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (date < today) {
      return NextResponse.json({
        available: false,
        timeSlots: [],
        message: 'Cannot book appointments in the past'
      });
    }

    // Get contractor schedule
    const schedule = await prisma.contractorSchedule.findUnique({
      where: { contractorId },
      include: {
        services: serviceId ? {
          where: { id: serviceId }
        } : true
      }
    });

    if (!schedule) {
      return NextResponse.json(
        { error: 'Contractor schedule not found' },
        { status: 404 }
      );
    }

    if (!schedule.isAcceptingBookings) {
      return NextResponse.json({
        available: false,
        timeSlots: [],
        message: 'Contractor is not currently accepting bookings'
      });
    }

    // Check if date is within advance booking window
    const maxAdvanceDate = new Date();
    maxAdvanceDate.setDate(maxAdvanceDate.getDate() + schedule.advanceBookingDays);
    if (date > maxAdvanceDate) {
      return NextResponse.json({
        available: false,
        timeSlots: [],
        message: `Bookings are only available up to ${schedule.advanceBookingDays} days in advance`
      });
    }

    // Check minimum notice requirement
    const minimumNoticeDate = new Date();
    minimumNoticeDate.setHours(minimumNoticeDate.getHours() + schedule.minimumNoticeHours);
    if (date < minimumNoticeDate) {
      return NextResponse.json({
        available: false,
        timeSlots: [],
        message: `Minimum ${schedule.minimumNoticeHours} hours notice required`
      });
    }

    const availability = await hubspotSchedulingService.getContractorAvailability(contractorId, date);

    // If a specific service is requested, filter time slots based on service duration
    if (serviceId && schedule.services.length > 0) {
      const service = schedule.services[0];
      const serviceDurationMinutes = service.duration + service.preparationTime + service.cleanupTime;
      
      // Filter time slots that can accommodate the service duration
      availability.timeSlots = availability.timeSlots.filter(slot => {
        const slotStart = new Date(`2000-01-01T${slot.startTime}`);
        const slotEnd = new Date(`2000-01-01T${slot.endTime}`);
        const slotDurationMinutes = (slotEnd.getTime() - slotStart.getTime()) / (1000 * 60);
        
        return slotDurationMinutes >= serviceDurationMinutes;
      });

      // Add service information to response
      return NextResponse.json({
        ...availability,
        service: {
          id: service.id,
          name: service.serviceName,
          duration: service.duration,
          price: service.price,
          preparationTime: service.preparationTime,
          cleanupTime: service.cleanupTime
        }
      });
    }

    return NextResponse.json(availability);
  } catch (error) {
    console.error('Error checking availability:', error);
    return NextResponse.json(
      { error: 'Failed to check availability' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { contractorId, startDate, endDate } = body;
    
    if (!contractorId || !startDate || !endDate) {
      return NextResponse.json(
        { error: 'Contractor ID, start date, and end date are required' },
        { status: 400 }
      );
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date format' },
        { status: 400 }
      );
    }

    if (start >= end) {
      return NextResponse.json(
        { error: 'Start date must be before end date' },
        { status: 400 }
      );
    }

    // Get availability for date range
    const availabilityMap: { [key: string]: any } = {};
    const currentDate = new Date(start);
    
    while (currentDate <= end) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const availability = await hubspotSchedulingService.getContractorAvailability(contractorId, currentDate);
      availabilityMap[dateStr] = availability;
      
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return NextResponse.json({
      contractorId,
      dateRange: {
        start: startDate,
        end: endDate
      },
      availability: availabilityMap
    });
  } catch (error) {
    console.error('Error checking date range availability:', error);
    return NextResponse.json(
      { error: 'Failed to check availability' },
      { status: 500 }
    );
  }
}
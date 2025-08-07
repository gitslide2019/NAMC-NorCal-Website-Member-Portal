import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { hubspotSchedulingService } from '@/lib/services/hubspot-scheduling.service';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const period = searchParams.get('period') || 'month'; // week, month, quarter, year

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'Start date and end date are required' },
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

    // Get analytics from service
    const analytics = await hubspotSchedulingService.getSchedulingAnalytics(
      session.user.id,
      start,
      end
    );

    // Get additional metrics
    const appointments = await prisma.appointment.findMany({
      where: {
        contractorId: session.user.id,
        appointmentDate: {
          gte: start,
          lte: end
        }
      },
      include: {
        service: true
      }
    });

    // Calculate time-based metrics
    const timeMetrics = calculateTimeMetrics(appointments, period);
    
    // Calculate revenue metrics
    const revenueMetrics = calculateRevenueMetrics(appointments);
    
    // Calculate client metrics
    const clientMetrics = calculateClientMetrics(appointments);
    
    // Calculate service performance
    const servicePerformance = calculateServicePerformance(appointments);

    const response = {
      ...analytics,
      timeMetrics,
      revenueMetrics,
      clientMetrics,
      servicePerformance,
      period: {
        start: start.toISOString(),
        end: end.toISOString(),
        period
      }
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching scheduling analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { startDate, endDate } = body;

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'Start date and end date are required' },
        { status: 400 }
      );
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    // Generate and store analytics record
    const appointments = await prisma.appointment.findMany({
      where: {
        contractorId: session.user.id,
        appointmentDate: {
          gte: start,
          lte: end
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
      clientSatisfactionScore: null,
      repeatClientPercentage: 0,
      directBookings: appointments.length, // Assuming all are direct for now
      referralBookings: 0,
      memberPortalBookings: 0,
    };

    analytics.averageBookingValue = analytics.completedBookings > 0 
      ? analytics.totalRevenue / analytics.completedBookings 
      : 0;

    analytics.bookingConversionRate = analytics.totalBookings > 0 
      ? (analytics.completedBookings / analytics.totalBookings) * 100 
      : 0;

    // Store analytics record
    const analyticsRecord = await prisma.appointmentAnalytics.create({
      data: {
        contractorId: session.user.id,
        analyticsDate: new Date(),
        ...analytics
      }
    });

    return NextResponse.json(analyticsRecord, { status: 201 });
  } catch (error) {
    console.error('Error creating analytics record:', error);
    return NextResponse.json(
      { error: 'Failed to create analytics record' },
      { status: 500 }
    );
  }
}

function calculateTimeMetrics(appointments: any[], period: string) {
  const now = new Date();
  const timeSlots = generateTimeSlots(period, appointments[0]?.appointmentDate || now);
  
  const metrics = timeSlots.map(slot => {
    const slotAppointments = appointments.filter(apt => {
      const aptDate = new Date(apt.appointmentDate);
      return aptDate >= slot.start && aptDate < slot.end;
    });

    return {
      period: slot.label,
      start: slot.start,
      end: slot.end,
      totalBookings: slotAppointments.length,
      completedBookings: slotAppointments.filter(a => a.status === 'COMPLETED').length,
      revenue: slotAppointments
        .filter(a => a.status === 'COMPLETED')
        .reduce((sum, a) => sum + a.totalPrice, 0)
    };
  });

  return metrics;
}

function calculateRevenueMetrics(appointments: any[]) {
  const completedAppointments = appointments.filter(a => a.status === 'COMPLETED');
  const totalRevenue = completedAppointments.reduce((sum, a) => sum + a.totalPrice, 0);
  
  const revenueByMonth = completedAppointments.reduce((acc, apt) => {
    const month = new Date(apt.appointmentDate).toISOString().slice(0, 7); // YYYY-MM
    acc[month] = (acc[month] || 0) + apt.totalPrice;
    return acc;
  }, {} as { [key: string]: number });

  const averageRevenuePerAppointment = completedAppointments.length > 0 
    ? totalRevenue / completedAppointments.length 
    : 0;

  return {
    totalRevenue,
    averageRevenuePerAppointment,
    revenueByMonth,
    projectedMonthlyRevenue: calculateProjectedRevenue(appointments)
  };
}

function calculateClientMetrics(appointments: any[]) {
  const clientEmails = new Set();
  const returningClients = new Set();
  
  const clientAppointmentCounts: { [key: string]: number } = {};
  
  appointments.forEach(apt => {
    const clientKey = apt.clientEmail || apt.clientId || 'unknown';
    clientEmails.add(clientKey);
    clientAppointmentCounts[clientKey] = (clientAppointmentCounts[clientKey] || 0) + 1;
    
    if (clientAppointmentCounts[clientKey] > 1) {
      returningClients.add(clientKey);
    }
  });

  const totalClients = clientEmails.size;
  const repeatClientPercentage = totalClients > 0 
    ? (returningClients.size / totalClients) * 100 
    : 0;

  return {
    totalClients,
    newClients: totalClients - returningClients.size,
    returningClients: returningClients.size,
    repeatClientPercentage,
    averageAppointmentsPerClient: totalClients > 0 ? appointments.length / totalClients : 0
  };
}

function calculateServicePerformance(appointments: any[]) {
  const serviceStats: { [key: string]: any } = {};
  
  appointments.forEach(apt => {
    const serviceName = apt.service.serviceName;
    
    if (!serviceStats[serviceName]) {
      serviceStats[serviceName] = {
        serviceName,
        totalBookings: 0,
        completedBookings: 0,
        cancelledBookings: 0,
        totalRevenue: 0,
        averagePrice: 0
      };
    }
    
    serviceStats[serviceName].totalBookings++;
    
    if (apt.status === 'COMPLETED') {
      serviceStats[serviceName].completedBookings++;
      serviceStats[serviceName].totalRevenue += apt.totalPrice;
    } else if (apt.status === 'CANCELLED') {
      serviceStats[serviceName].cancelledBookings++;
    }
  });

  // Calculate averages
  Object.values(serviceStats).forEach((stats: any) => {
    stats.averagePrice = stats.completedBookings > 0 
      ? stats.totalRevenue / stats.completedBookings 
      : 0;
    stats.completionRate = stats.totalBookings > 0 
      ? (stats.completedBookings / stats.totalBookings) * 100 
      : 0;
  });

  return Object.values(serviceStats);
}

function generateTimeSlots(period: string, startDate: Date) {
  const slots = [];
  const start = new Date(startDate);
  
  switch (period) {
    case 'week':
      for (let i = 0; i < 7; i++) {
        const slotStart = new Date(start);
        slotStart.setDate(start.getDate() + i);
        const slotEnd = new Date(slotStart);
        slotEnd.setDate(slotEnd.getDate() + 1);
        
        slots.push({
          label: slotStart.toLocaleDateString('en-US', { weekday: 'short' }),
          start: slotStart,
          end: slotEnd
        });
      }
      break;
      
    case 'month':
      const daysInMonth = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate();
      for (let i = 1; i <= daysInMonth; i++) {
        const slotStart = new Date(start.getFullYear(), start.getMonth(), i);
        const slotEnd = new Date(start.getFullYear(), start.getMonth(), i + 1);
        
        slots.push({
          label: `${i}`,
          start: slotStart,
          end: slotEnd
        });
      }
      break;
      
    default:
      // Default to weekly view
      return generateTimeSlots('week', startDate);
  }
  
  return slots;
}

function calculateProjectedRevenue(appointments: any[]) {
  const completedAppointments = appointments.filter(a => a.status === 'COMPLETED');
  const scheduledAppointments = appointments.filter(a => ['SCHEDULED', 'CONFIRMED'].includes(a.status));
  
  const currentRevenue = completedAppointments.reduce((sum, a) => sum + a.totalPrice, 0);
  const projectedRevenue = scheduledAppointments.reduce((sum, a) => sum + a.totalPrice, 0);
  
  return currentRevenue + projectedRevenue;
}
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
    const status = searchParams.get('status');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const contractorId = searchParams.get('contractorId') || session.user.id;

    // Build filter conditions
    const where: any = {
      contractorId
    };

    if (status) {
      where.status = status;
    }

    if (startDate || endDate) {
      where.appointmentDate = {};
      if (startDate) {
        where.appointmentDate.gte = new Date(startDate);
      }
      if (endDate) {
        where.appointmentDate.lte = new Date(endDate);
      }
    }

    const appointments = await prisma.appointment.findMany({
      where,
      include: {
        service: true,
        client: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true
          }
        }
      },
      orderBy: {
        appointmentDate: 'asc'
      }
    });

    // Parse JSON fields and format data
    const appointmentsData = appointments.map(appointment => ({
      ...appointment,
      clientAddress: appointment.clientAddress ? JSON.parse(appointment.clientAddress) : null,
    }));

    return NextResponse.json(appointmentsData);
  } catch (error) {
    console.error('Error fetching appointments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch appointments' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate required fields
    const requiredFields = ['contractorId', 'serviceId', 'appointmentDate', 'startTime', 'endTime', 'totalPrice'];
    const missingFields = requiredFields.filter(field => !body[field]);
    
    if (missingFields.length > 0) {
      return NextResponse.json(
        { error: `Missing required fields: ${missingFields.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate client information (either clientId or client details required)
    if (!body.clientId && (!body.clientName || !body.clientEmail)) {
      return NextResponse.json(
        { error: 'Either clientId or client name and email are required' },
        { status: 400 }
      );
    }

    // Validate dates
    const appointmentDate = new Date(body.appointmentDate);
    const startTime = new Date(body.startTime);
    const endTime = new Date(body.endTime);

    if (isNaN(appointmentDate.getTime()) || isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date format' },
        { status: 400 }
      );
    }

    if (startTime >= endTime) {
      return NextResponse.json(
        { error: 'Start time must be before end time' },
        { status: 400 }
      );
    }

    // Check if appointment time is in the past
    if (startTime < new Date()) {
      return NextResponse.json(
        { error: 'Cannot book appointments in the past' },
        { status: 400 }
      );
    }

    // Verify service exists and belongs to contractor
    const service = await prisma.scheduleService.findFirst({
      where: {
        id: body.serviceId,
        contractorId: body.contractorId,
        isActive: true
      }
    });

    if (!service) {
      return NextResponse.json(
        { error: 'Service not found or not available' },
        { status: 404 }
      );
    }

    // Check for scheduling conflicts
    const conflictingAppointments = await prisma.appointment.findMany({
      where: {
        contractorId: body.contractorId,
        status: {
          in: ['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS']
        },
        OR: [
          {
            AND: [
              { startTime: { lte: startTime } },
              { endTime: { gt: startTime } }
            ]
          },
          {
            AND: [
              { startTime: { lt: endTime } },
              { endTime: { gte: endTime } }
            ]
          },
          {
            AND: [
              { startTime: { gte: startTime } },
              { endTime: { lte: endTime } }
            ]
          }
        ]
      }
    });

    if (conflictingAppointments.length > 0) {
      return NextResponse.json(
        { error: 'Time slot is no longer available' },
        { status: 409 }
      );
    }

    const appointmentData = {
      contractorId: body.contractorId,
      clientId: body.clientId,
      serviceId: body.serviceId,
      appointmentDate,
      startTime,
      endTime,
      clientName: body.clientName,
      clientEmail: body.clientEmail,
      clientPhone: body.clientPhone,
      clientAddress: body.clientAddress,
      appointmentNotes: body.appointmentNotes,
      totalPrice: body.totalPrice,
      depositAmount: body.depositAmount,
    };

    const appointment = await hubspotSchedulingService.createAppointment(appointmentData);

    return NextResponse.json(appointment, { status: 201 });
  } catch (error) {
    console.error('Error creating appointment:', error);
    return NextResponse.json(
      { error: 'Failed to create appointment' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { appointmentId, ...updates } = body;
    
    if (!appointmentId) {
      return NextResponse.json(
        { error: 'Appointment ID is required' },
        { status: 400 }
      );
    }

    // Verify appointment belongs to the contractor
    const existingAppointment = await prisma.appointment.findFirst({
      where: {
        id: appointmentId,
        contractorId: session.user.id
      }
    });

    if (!existingAppointment) {
      return NextResponse.json(
        { error: 'Appointment not found' },
        { status: 404 }
      );
    }

    // Validate status updates
    const validStatuses = ['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW'];
    if (updates.status && !validStatuses.includes(updates.status)) {
      return NextResponse.json(
        { error: 'Invalid status' },
        { status: 400 }
      );
    }

    // Update appointment
    const appointment = await prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        ...(updates.status && { status: updates.status }),
        ...(updates.appointmentNotes !== undefined && { appointmentNotes: updates.appointmentNotes }),
        ...(updates.internalNotes !== undefined && { internalNotes: updates.internalNotes }),
        ...(updates.paymentStatus && { paymentStatus: updates.paymentStatus }),
        ...(updates.depositPaid !== undefined && { depositPaid: updates.depositPaid }),
        ...(updates.status === 'COMPLETED' && { completedAt: new Date() }),
        ...(updates.status === 'CANCELLED' && { 
          cancelledAt: new Date(),
          cancellationReason: updates.cancellationReason 
        }),
        hubspotSyncStatus: 'PENDING'
      },
      include: {
        service: true,
        client: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true
          }
        }
      }
    });

    // Update HubSpot if status changed
    if (updates.status) {
      await hubspotSchedulingService.updateAppointmentStatus(
        appointmentId, 
        updates.status, 
        updates.internalNotes
      );
    }

    return NextResponse.json(appointment);
  } catch (error) {
    console.error('Error updating appointment:', error);
    return NextResponse.json(
      { error: 'Failed to update appointment' },
      { status: 500 }
    );
  }
}
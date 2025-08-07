import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { hubspotSchedulingService } from '@/lib/services/hubspot-scheduling.service';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const appointment = await prisma.appointment.findFirst({
      where: {
        id: params.id,
        contractorId: session.user.id
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

    if (!appointment) {
      return NextResponse.json(
        { error: 'Appointment not found' },
        { status: 404 }
      );
    }

    // Parse JSON fields
    const appointmentData = {
      ...appointment,
      clientAddress: appointment.clientAddress ? JSON.parse(appointment.clientAddress) : null,
    };

    return NextResponse.json(appointmentData);
  } catch (error) {
    console.error('Error fetching appointment:', error);
    return NextResponse.json(
      { error: 'Failed to fetch appointment' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    
    // Verify appointment belongs to the contractor
    const existingAppointment = await prisma.appointment.findFirst({
      where: {
        id: params.id,
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
    if (body.status && !validStatuses.includes(body.status)) {
      return NextResponse.json(
        { error: 'Invalid status' },
        { status: 400 }
      );
    }

    // Prevent certain status changes
    if (existingAppointment.status === 'COMPLETED' && body.status !== 'COMPLETED') {
      return NextResponse.json(
        { error: 'Cannot change status of completed appointment' },
        { status: 400 }
      );
    }

    // Update appointment
    const appointment = await prisma.appointment.update({
      where: { id: params.id },
      data: {
        ...(body.status && { status: body.status }),
        ...(body.appointmentNotes !== undefined && { appointmentNotes: body.appointmentNotes }),
        ...(body.internalNotes !== undefined && { internalNotes: body.internalNotes }),
        ...(body.paymentStatus && { paymentStatus: body.paymentStatus }),
        ...(body.depositPaid !== undefined && { depositPaid: body.depositPaid }),
        ...(body.status === 'COMPLETED' && !existingAppointment.completedAt && { completedAt: new Date() }),
        ...(body.status === 'CANCELLED' && !existingAppointment.cancelledAt && { 
          cancelledAt: new Date(),
          cancellationReason: body.cancellationReason 
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
    if (body.status && body.status !== existingAppointment.status) {
      await hubspotSchedulingService.updateAppointmentStatus(
        params.id, 
        body.status, 
        body.internalNotes
      );
    }

    // Parse JSON fields for response
    const appointmentData = {
      ...appointment,
      clientAddress: appointment.clientAddress ? JSON.parse(appointment.clientAddress) : null,
    };

    return NextResponse.json(appointmentData);
  } catch (error) {
    console.error('Error updating appointment:', error);
    return NextResponse.json(
      { error: 'Failed to update appointment' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify appointment belongs to the contractor
    const existingAppointment = await prisma.appointment.findFirst({
      where: {
        id: params.id,
        contractorId: session.user.id
      }
    });

    if (!existingAppointment) {
      return NextResponse.json(
        { error: 'Appointment not found' },
        { status: 404 }
      );
    }

    // Check if appointment can be cancelled
    if (existingAppointment.status === 'COMPLETED') {
      return NextResponse.json(
        { error: 'Cannot cancel completed appointment' },
        { status: 400 }
      );
    }

    // Check cancellation deadline
    const now = new Date();
    const appointmentTime = new Date(existingAppointment.startTime);
    const hoursUntilAppointment = (appointmentTime.getTime() - now.getTime()) / (1000 * 60 * 60);

    // Get contractor schedule to check cancellation policy
    const schedule = await prisma.contractorSchedule.findUnique({
      where: { contractorId: session.user.id }
    });

    if (schedule?.cancellationPolicy) {
      const policy = JSON.parse(schedule.cancellationPolicy);
      if (hoursUntilAppointment < policy.cancellationDeadlineHours) {
        return NextResponse.json(
          { error: `Cancellation deadline has passed. Must cancel at least ${policy.cancellationDeadlineHours} hours in advance.` },
          { status: 400 }
        );
      }
    }

    // Cancel appointment (soft delete by updating status)
    const appointment = await prisma.appointment.update({
      where: { id: params.id },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
        cancellationReason: 'Cancelled by contractor',
        hubspotSyncStatus: 'PENDING'
      }
    });

    // Update HubSpot
    await hubspotSchedulingService.updateAppointmentStatus(
      params.id, 
      'CANCELLED', 
      'Cancelled by contractor'
    );

    return NextResponse.json({ message: 'Appointment cancelled successfully' });
  } catch (error) {
    console.error('Error cancelling appointment:', error);
    return NextResponse.json(
      { error: 'Failed to cancel appointment' },
      { status: 500 }
    );
  }
}
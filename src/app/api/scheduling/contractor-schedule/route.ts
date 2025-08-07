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

    const schedule = await prisma.contractorSchedule.findUnique({
      where: { contractorId: session.user.id },
      include: {
        services: true
      }
    });

    if (!schedule) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });
    }

    // Parse JSON fields
    const scheduleData = {
      ...schedule,
      workingHours: JSON.parse(schedule.workingHours),
      availabilityRules: schedule.availabilityRules ? JSON.parse(schedule.availabilityRules) : null,
      cancellationPolicy: schedule.cancellationPolicy ? JSON.parse(schedule.cancellationPolicy) : null,
    };

    return NextResponse.json(scheduleData);
  } catch (error) {
    console.error('Error fetching contractor schedule:', error);
    return NextResponse.json(
      { error: 'Failed to fetch schedule' },
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
    
    // Validate required fields
    if (!body.timezone || !body.workingHours) {
      return NextResponse.json(
        { error: 'Timezone and working hours are required' },
        { status: 400 }
      );
    }

    // Check if schedule already exists
    const existingSchedule = await prisma.contractorSchedule.findUnique({
      where: { contractorId: session.user.id }
    });

    if (existingSchedule) {
      return NextResponse.json(
        { error: 'Schedule already exists. Use PUT to update.' },
        { status: 409 }
      );
    }

    const scheduleData = {
      contractorId: session.user.id,
      timezone: body.timezone,
      workingHours: body.workingHours,
      availabilityRules: body.availabilityRules,
      bufferTime: body.bufferTime || 15,
      advanceBookingDays: body.advanceBookingDays || 30,
      minimumNoticeHours: body.minimumNoticeHours || 24,
      isAcceptingBookings: body.isAcceptingBookings ?? true,
      autoConfirmBookings: body.autoConfirmBookings ?? false,
      requiresDeposit: body.requiresDeposit ?? true,
      depositPercentage: body.depositPercentage || 25.0,
      cancellationPolicy: body.cancellationPolicy || {
        allowCancellation: true,
        cancellationDeadlineHours: 24,
        refundPolicy: 'PARTIAL',
        partialRefundPercentage: 50
      }
    };

    const schedule = await hubspotSchedulingService.createContractorSchedule(scheduleData);

    return NextResponse.json(schedule, { status: 201 });
  } catch (error) {
    console.error('Error creating contractor schedule:', error);
    return NextResponse.json(
      { error: 'Failed to create schedule' },
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
    
    const existingSchedule = await prisma.contractorSchedule.findUnique({
      where: { contractorId: session.user.id }
    });

    if (!existingSchedule) {
      return NextResponse.json(
        { error: 'Schedule not found' },
        { status: 404 }
      );
    }

    const updates = {
      ...(body.timezone && { timezone: body.timezone }),
      ...(body.workingHours && { workingHours: body.workingHours }),
      ...(body.availabilityRules !== undefined && { availabilityRules: body.availabilityRules }),
      ...(body.bufferTime !== undefined && { bufferTime: body.bufferTime }),
      ...(body.advanceBookingDays !== undefined && { advanceBookingDays: body.advanceBookingDays }),
      ...(body.minimumNoticeHours !== undefined && { minimumNoticeHours: body.minimumNoticeHours }),
      ...(body.isAcceptingBookings !== undefined && { isAcceptingBookings: body.isAcceptingBookings }),
      ...(body.autoConfirmBookings !== undefined && { autoConfirmBookings: body.autoConfirmBookings }),
      ...(body.requiresDeposit !== undefined && { requiresDeposit: body.requiresDeposit }),
      ...(body.depositPercentage !== undefined && { depositPercentage: body.depositPercentage }),
      ...(body.cancellationPolicy && { cancellationPolicy: body.cancellationPolicy }),
    };

    const schedule = await hubspotSchedulingService.updateContractorSchedule(
      existingSchedule.id,
      updates
    );

    return NextResponse.json(schedule);
  } catch (error) {
    console.error('Error updating contractor schedule:', error);
    return NextResponse.json(
      { error: 'Failed to update schedule' },
      { status: 500 }
    );
  }
}
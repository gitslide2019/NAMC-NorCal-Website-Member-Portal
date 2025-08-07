import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { appointmentId, reason } = body;

    if (!appointmentId) {
      return NextResponse.json(
        { error: 'Appointment ID is required' },
        { status: 400 }
      );
    }

    // Get appointment with contractor schedule for cancellation policy
    const appointment = await prisma.appointment.findFirst({
      where: {
        id: appointmentId,
        contractorId: session.user.id
      },
      include: {
        service: true,
        schedule: true
      }
    });

    if (!appointment) {
      return NextResponse.json(
        { error: 'Appointment not found' },
        { status: 404 }
      );
    }

    if (appointment.status === 'CANCELLED') {
      return NextResponse.json(
        { error: 'Appointment is already cancelled' },
        { status: 400 }
      );
    }

    // Get cancellation policy
    const cancellationPolicy = appointment.schedule?.cancellationPolicy 
      ? JSON.parse(appointment.schedule.cancellationPolicy)
      : {
          allowCancellation: true,
          cancellationDeadlineHours: 24,
          refundPolicy: 'PARTIAL',
          partialRefundPercentage: 50
        };

    if (!cancellationPolicy.allowCancellation) {
      return NextResponse.json(
        { error: 'Cancellations are not allowed for this service' },
        { status: 400 }
      );
    }

    // Check cancellation deadline
    const now = new Date();
    const appointmentTime = new Date(appointment.startTime);
    const hoursUntilAppointment = (appointmentTime.getTime() - now.getTime()) / (1000 * 60 * 60);

    let refundAmount = 0;
    let refundReason = '';

    if (hoursUntilAppointment >= cancellationPolicy.cancellationDeadlineHours) {
      // Within cancellation window
      switch (cancellationPolicy.refundPolicy) {
        case 'FULL':
          refundAmount = appointment.depositPaid ? (appointment.depositAmount || 0) : 0;
          refundReason = 'Full refund - cancelled within policy window';
          break;
        case 'PARTIAL':
          refundAmount = appointment.depositPaid 
            ? (appointment.depositAmount || 0) * (cancellationPolicy.partialRefundPercentage / 100)
            : 0;
          refundReason = `Partial refund (${cancellationPolicy.partialRefundPercentage}%) - cancelled within policy window`;
          break;
        case 'NO_REFUND':
          refundAmount = 0;
          refundReason = 'No refund - per cancellation policy';
          break;
      }
    } else {
      // Past cancellation deadline
      refundAmount = 0;
      refundReason = `No refund - cancelled less than ${cancellationPolicy.cancellationDeadlineHours} hours before appointment`;
    }

    // Process refund if applicable
    let refundId = null;
    if (refundAmount > 0 && appointment.stripeDepositIntentId) {
      try {
        const refund = await stripe.refunds.create({
          payment_intent: appointment.stripeDepositIntentId,
          amount: Math.round(refundAmount * 100), // Convert to cents
          reason: 'requested_by_customer',
          metadata: {
            appointmentId,
            originalAmount: (appointment.depositAmount || 0).toString(),
            refundReason
          }
        });
        refundId = refund.id;
      } catch (stripeError) {
        console.error('Stripe refund error:', stripeError);
        // Continue with cancellation even if refund fails
      }
    }

    // Update appointment status
    const updatedAppointment = await prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
        cancellationReason: reason || 'Cancelled by contractor',
        paymentStatus: refundAmount > 0 ? 'REFUNDED' : appointment.paymentStatus,
        hubspotSyncStatus: 'PENDING'
      }
    });

    // Create refund record if applicable
    if (refundAmount > 0) {
      await prisma.appointmentRefund.create({
        data: {
          appointmentId,
          refundAmount,
          refundReason,
          stripeRefundId: refundId,
          processedAt: new Date(),
          status: refundId ? 'COMPLETED' : 'FAILED'
        }
      });
    }

    return NextResponse.json({
      message: 'Appointment cancelled successfully',
      refundAmount,
      refundReason,
      refundProcessed: refundAmount > 0 && refundId !== null
    });
  } catch (error) {
    console.error('Error processing refund:', error);
    return NextResponse.json(
      { error: 'Failed to process refund' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const appointmentId = searchParams.get('appointmentId');

    if (!appointmentId) {
      return NextResponse.json(
        { error: 'Appointment ID is required' },
        { status: 400 }
      );
    }

    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        schedule: true
      }
    });

    if (!appointment) {
      return NextResponse.json(
        { error: 'Appointment not found' },
        { status: 404 }
      );
    }

    // Get cancellation policy
    const cancellationPolicy = appointment.schedule?.cancellationPolicy 
      ? JSON.parse(appointment.schedule.cancellationPolicy)
      : {
          allowCancellation: true,
          cancellationDeadlineHours: 24,
          refundPolicy: 'PARTIAL',
          partialRefundPercentage: 50
        };

    // Calculate potential refund
    const now = new Date();
    const appointmentTime = new Date(appointment.startTime);
    const hoursUntilAppointment = (appointmentTime.getTime() - now.getTime()) / (1000 * 60 * 60);

    let potentialRefund = 0;
    let canCancel = cancellationPolicy.allowCancellation && appointment.status !== 'CANCELLED';
    let refundPolicy = 'NO_REFUND';

    if (canCancel && hoursUntilAppointment >= cancellationPolicy.cancellationDeadlineHours) {
      refundPolicy = cancellationPolicy.refundPolicy;
      
      switch (cancellationPolicy.refundPolicy) {
        case 'FULL':
          potentialRefund = appointment.depositPaid ? (appointment.depositAmount || 0) : 0;
          break;
        case 'PARTIAL':
          potentialRefund = appointment.depositPaid 
            ? (appointment.depositAmount || 0) * (cancellationPolicy.partialRefundPercentage / 100)
            : 0;
          break;
      }
    }

    return NextResponse.json({
      canCancel,
      hoursUntilAppointment: Math.max(0, hoursUntilAppointment),
      cancellationDeadlineHours: cancellationPolicy.cancellationDeadlineHours,
      refundPolicy,
      potentialRefund,
      depositPaid: appointment.depositPaid,
      depositAmount: appointment.depositAmount || 0
    });
  } catch (error) {
    console.error('Error fetching refund policy:', error);
    return NextResponse.json(
      { error: 'Failed to fetch refund policy' },
      { status: 500 }
    );
  }
}
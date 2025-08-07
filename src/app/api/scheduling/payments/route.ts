import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { appointmentId, paymentType, amount, paymentMethodId } = body;

    if (!appointmentId || !paymentType || !amount) {
      return NextResponse.json(
        { error: 'Appointment ID, payment type, and amount are required' },
        { status: 400 }
      );
    }

    // Get appointment details
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        service: true,
        contractor: {
          select: {
            id: true,
            name: true,
            email: true,
            company: true
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

    // Validate payment amount
    const expectedAmount = paymentType === 'deposit' 
      ? appointment.depositAmount || 0
      : appointment.remainingBalance || appointment.totalPrice;

    if (Math.abs(amount - expectedAmount) > 0.01) {
      return NextResponse.json(
        { error: 'Invalid payment amount' },
        { status: 400 }
      );
    }

    // Create Stripe Payment Intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: 'usd',
      payment_method: paymentMethodId,
      confirm: true,
      return_url: `${process.env.NEXTAUTH_URL}/booking/confirmation`,
      metadata: {
        appointmentId,
        paymentType,
        contractorId: appointment.contractorId,
        serviceId: appointment.serviceId,
      },
      description: `${paymentType === 'deposit' ? 'Deposit' : 'Payment'} for ${appointment.service.serviceName} appointment`,
      receipt_email: appointment.clientEmail || undefined,
    });

    // Update appointment payment status
    const updateData: any = {
      paymentStatus: paymentIntent.status === 'succeeded' ? 'PAID' : 'PENDING',
      hubspotSyncStatus: 'PENDING'
    };

    if (paymentType === 'deposit') {
      updateData.depositPaid = paymentIntent.status === 'succeeded';
      updateData.stripeDepositIntentId = paymentIntent.id;
    } else {
      updateData.stripePaymentIntentId = paymentIntent.id;
    }

    const updatedAppointment = await prisma.appointment.update({
      where: { id: appointmentId },
      data: updateData
    });

    return NextResponse.json({
      paymentIntent: {
        id: paymentIntent.id,
        status: paymentIntent.status,
        client_secret: paymentIntent.client_secret,
      },
      appointment: updatedAppointment
    });
  } catch (error) {
    console.error('Error processing payment:', error);
    
    if (error instanceof Stripe.errors.StripeError) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to process payment' },
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
        service: true
      }
    });

    if (!appointment) {
      return NextResponse.json(
        { error: 'Appointment not found' },
        { status: 404 }
      );
    }

    // Calculate payment breakdown
    const paymentInfo = {
      totalPrice: appointment.totalPrice,
      depositAmount: appointment.depositAmount || 0,
      depositPaid: appointment.depositPaid,
      remainingBalance: appointment.remainingBalance || (appointment.totalPrice - (appointment.depositAmount || 0)),
      paymentStatus: appointment.paymentStatus,
      requiresDeposit: appointment.service.depositRequired,
    };

    return NextResponse.json(paymentInfo);
  } catch (error) {
    console.error('Error fetching payment info:', error);
    return NextResponse.json(
      { error: 'Failed to fetch payment information' },
      { status: 500 }
    );
  }
}
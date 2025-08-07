import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { HubSpotBackboneService } from '@/lib/services/hubspot-backbone.service';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

const hubspotService = new HubSpotBackboneService();

export async function POST(request: NextRequest) {
  try {
    const { orderId, amount, currency, customer } = await request.json();

    if (!orderId || !amount || !customer?.email) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create Stripe customer if needed
    let stripeCustomer;
    try {
      const existingCustomers = await stripe.customers.list({
        email: customer.email,
        limit: 1,
      });

      if (existingCustomers.data.length > 0) {
        stripeCustomer = existingCustomers.data[0];
      } else {
        stripeCustomer = await stripe.customers.create({
          email: customer.email,
          name: customer.name,
        });
      }
    } catch (error) {
      console.error('Error creating/finding Stripe customer:', error);
      return NextResponse.json(
        { error: 'Failed to process customer information' },
        { status: 500 }
      );
    }

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount), // Amount in cents
      currency: currency || 'usd',
      customer: stripeCustomer.id,
      metadata: {
        orderId: orderId,
        source: 'namc-shop',
      },
      automatic_payment_methods: {
        enabled: true,
      },
    });

    // Create checkout session for hosted checkout
    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomer.id,
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: currency || 'usd',
            product_data: {
              name: `NAMC Order #${orderId}`,
              description: 'NAMC Shop Purchase',
            },
            unit_amount: Math.round(amount),
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.NEXTAUTH_URL}/member/shop/success?session_id={CHECKOUT_SESSION_ID}&order_id=${orderId}`,
      cancel_url: `${process.env.NEXTAUTH_URL}/member/shop/checkout?order_id=${orderId}`,
      metadata: {
        orderId: orderId,
        source: 'namc-shop',
      },
    });

    // Update order with payment information
    try {
      await fetch(`${process.env.NEXTAUTH_URL}/api/shop/orders/${orderId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paymentIntentId: paymentIntent.id,
          checkoutSessionId: session.id,
          paymentStatus: 'pending',
        }),
      });
    } catch (error) {
      console.error('Error updating order with payment info:', error);
    }

    return NextResponse.json({
      success: true,
      paymentIntentId: paymentIntent.id,
      clientSecret: paymentIntent.client_secret,
      checkoutUrl: session.url,
      sessionId: session.id,
    });

  } catch (error) {
    console.error('Payment processing error:', error);
    return NextResponse.json(
      { 
        error: 'Payment processing failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Handle payment webhook from Stripe
export async function PUT(request: NextRequest) {
  try {
    const sig = request.headers.get('stripe-signature');
    const body = await request.text();

    if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
      return NextResponse.json(
        { error: 'Missing signature or webhook secret' },
        { status: 400 }
      );
    }

    let event;
    try {
      event = stripe.webhooks.constructEvent(
        body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      );
    }

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object as Stripe.Checkout.Session;
        await handleSuccessfulPayment(session);
        break;

      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await handlePaymentIntentSucceeded(paymentIntent);
        break;

      case 'payment_intent.payment_failed':
        const failedPayment = event.data.object as Stripe.PaymentIntent;
        await handleFailedPayment(failedPayment);
        break;

      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    return NextResponse.json({ received: true });

  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

async function handleSuccessfulPayment(session: Stripe.Checkout.Session) {
  try {
    const orderId = session.metadata?.orderId;
    if (!orderId) {
      console.error('No order ID found in session metadata');
      return;
    }

    // Update order status
    await fetch(`${process.env.NEXTAUTH_URL}/api/shop/orders/${orderId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        paymentStatus: 'paid',
        orderStatus: 'processing',
        paidAt: new Date().toISOString(),
        stripeSessionId: session.id,
      }),
    });

    // Trigger order fulfillment
    await fetch(`${process.env.NEXTAUTH_URL}/api/shop/orders/fulfillment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        orderId: orderId,
        trigger: 'payment_completed',
      }),
    });

    console.log(`Payment completed for order ${orderId}`);

  } catch (error) {
    console.error('Error handling successful payment:', error);
  }
}

async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  try {
    const orderId = paymentIntent.metadata?.orderId;
    if (!orderId) {
      console.error('No order ID found in payment intent metadata');
      return;
    }

    console.log(`Payment intent succeeded for order ${orderId}`);

  } catch (error) {
    console.error('Error handling payment intent succeeded:', error);
  }
}

async function handleFailedPayment(paymentIntent: Stripe.PaymentIntent) {
  try {
    const orderId = paymentIntent.metadata?.orderId;
    if (!orderId) {
      console.error('No order ID found in failed payment metadata');
      return;
    }

    // Update order status
    await fetch(`${process.env.NEXTAUTH_URL}/api/shop/orders/${orderId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        paymentStatus: 'failed',
        orderStatus: 'payment_failed',
        failureReason: paymentIntent.last_payment_error?.message || 'Payment failed',
      }),
    });

    console.log(`Payment failed for order ${orderId}`);

  } catch (error) {
    console.error('Error handling failed payment:', error);
  }
}
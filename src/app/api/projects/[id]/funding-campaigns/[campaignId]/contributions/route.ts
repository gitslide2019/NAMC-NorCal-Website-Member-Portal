import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';
import Stripe from 'stripe';

const prisma = new PrismaClient();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; campaignId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { campaignId } = params;
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    // Find campaign and verify access
    const campaign = await prisma.fundingCampaign.findUnique({
      where: { id: campaignId },
      include: {
        budget: {
          select: { memberId: true },
        },
      },
    });

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    // Check access
    if (campaign.budget?.memberId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get contributions with pagination
    const [contributions, total] = await Promise.all([
      prisma.campaignContribution.findMany({
        where: { campaignId },
        include: {
          contributor: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.campaignContribution.count({
        where: { campaignId },
      }),
    ]);

    // Calculate summary statistics
    const summary = await prisma.campaignContribution.aggregate({
      where: { 
        campaignId,
        paymentStatus: 'COMPLETED',
      },
      _sum: { amount: true },
      _count: { id: true },
      _avg: { amount: true },
    });

    return NextResponse.json({
      contributions,
      summary: {
        totalRaised: summary._sum.amount || 0,
        totalContributions: summary._count.id || 0,
        averageContribution: summary._avg.amount || 0,
      },
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching campaign contributions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch campaign contributions' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; campaignId: string } }
) {
  try {
    const { campaignId } = params;
    const data = await request.json();

    const {
      contributorEmail,
      contributorName,
      amount,
      contributionType = 'DONATION',
      paymentMethodId,
      isAnonymous = false,
      message,
      recognitionLevel = 'STANDARD',
    } = data;

    // Validate required fields
    if (!contributorEmail || !contributorName || !amount || !paymentMethodId) {
      return NextResponse.json(
        { error: 'Contributor email, name, amount, and payment method are required' },
        { status: 400 }
      );
    }

    if (amount <= 0) {
      return NextResponse.json(
        { error: 'Amount must be greater than 0' },
        { status: 400 }
      );
    }

    // Find campaign
    const campaign = await prisma.fundingCampaign.findUnique({
      where: { id: campaignId },
      include: {
        budget: true,
      },
    });

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    // Check if campaign is active
    if (campaign.campaignStatus !== 'ACTIVE') {
      return NextResponse.json(
        { error: 'Campaign is not active' },
        { status: 400 }
      );
    }

    // Check if campaign is still within date range
    const now = new Date();
    if (now < campaign.startDate || now > campaign.endDate) {
      return NextResponse.json(
        { error: 'Campaign is not currently accepting contributions' },
        { status: 400 }
      );
    }

    // Check if contribution would exceed target (optional check)
    const currentRaised = campaign.raisedAmount;
    if (currentRaised + amount > campaign.targetAmount * 1.1) { // Allow 10% overfunding
      return NextResponse.json(
        { error: 'Contribution would exceed campaign target' },
        { status: 400 }
      );
    }

    // Find or create contributor
    let contributorId = null;
    const session = await getServerSession(authOptions);
    if (session?.user?.id) {
      contributorId = session.user.id;
    }

    // Create Stripe payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: 'usd',
      payment_method: paymentMethodId,
      confirmation_method: 'manual',
      confirm: true,
      return_url: `${process.env.NEXTAUTH_URL}/projects/${params.id}/funding-campaigns/${campaignId}/success`,
      metadata: {
        campaignId,
        contributorEmail,
        contributorName,
        contributionType,
      },
    });

    // Determine payment status based on Stripe response
    let paymentStatus = 'PENDING';
    if (paymentIntent.status === 'succeeded') {
      paymentStatus = 'COMPLETED';
    } else if (paymentIntent.status === 'requires_action') {
      paymentStatus = 'PENDING';
    } else {
      paymentStatus = 'FAILED';
    }

    // Create contribution record
    const contribution = await prisma.campaignContribution.create({
      data: {
        campaignId,
        contributorId,
        contributorEmail,
        contributorName,
        amount,
        contributionType,
        paymentStatus,
        paymentMethod: 'STRIPE',
        stripePaymentId: paymentIntent.id,
        isAnonymous,
        message,
        recognitionLevel,
      },
      include: {
        contributor: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Update campaign raised amount if payment succeeded
    if (paymentStatus === 'COMPLETED') {
      await prisma.fundingCampaign.update({
        where: { id: campaignId },
        data: {
          raisedAmount: {
            increment: amount,
          },
        },
      });

      // Update project budget crowdfunding amount
      await prisma.projectBudget.update({
        where: { id: campaign.budgetId! },
        data: {
          crowdFunding: {
            increment: amount,
          },
          remainingFunds: {
            increment: amount,
          },
        },
      });

      // Send thank you email (implement email service)
      try {
        await sendContributionThankYouEmail({
          contributorEmail,
          contributorName,
          amount,
          campaignTitle: campaign.campaignTitle,
          isAnonymous,
        });
      } catch (emailError) {
        console.error('Error sending thank you email:', emailError);
      }

      // Check if campaign reached target
      const updatedCampaign = await prisma.fundingCampaign.findUnique({
        where: { id: campaignId },
        select: { raisedAmount: true, targetAmount: true },
      });

      if (updatedCampaign && updatedCampaign.raisedAmount >= updatedCampaign.targetAmount) {
        // Campaign reached target - trigger completion workflow
        await prisma.fundingCampaign.update({
          where: { id: campaignId },
          data: { campaignStatus: 'COMPLETED' },
        });

        // Send campaign success notifications
        try {
          await sendCampaignSuccessNotifications(campaignId);
        } catch (notificationError) {
          console.error('Error sending success notifications:', notificationError);
        }
      }
    }

    return NextResponse.json({
      contribution,
      paymentIntent: {
        id: paymentIntent.id,
        status: paymentIntent.status,
        client_secret: paymentIntent.client_secret,
        next_action: paymentIntent.next_action,
      },
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating campaign contribution:', error);
    
    // Handle Stripe errors specifically
    if (error instanceof Stripe.errors.StripeError) {
      return NextResponse.json(
        { error: `Payment failed: ${error.message}` },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create campaign contribution' },
      { status: 500 }
    );
  }
}

// Helper function to send thank you email
async function sendContributionThankYouEmail(data: {
  contributorEmail: string;
  contributorName: string;
  amount: number;
  campaignTitle: string;
  isAnonymous: boolean;
}): Promise<void> {
  // This would integrate with your email service (SendGrid, etc.)
  console.log('Sending thank you email to:', data.contributorEmail);
  
  // Example email content
  const emailContent = {
    to: data.contributorEmail,
    subject: `Thank you for supporting ${data.campaignTitle}`,
    html: `
      <h2>Thank you for your contribution!</h2>
      <p>Dear ${data.contributorName},</p>
      <p>Thank you for your generous contribution of $${data.amount.toFixed(2)} to support ${data.campaignTitle}.</p>
      <p>Your support helps create positive social impact in our community through job creation, training, and affordable housing initiatives.</p>
      <p>We'll keep you updated on the project's progress and impact.</p>
      <p>Best regards,<br>NAMC Northern California</p>
    `,
  };

  // Implement actual email sending here
}

// Helper function to send campaign success notifications
async function sendCampaignSuccessNotifications(campaignId: string): Promise<void> {
  // This would send notifications to campaign creator and all contributors
  console.log('Sending campaign success notifications for:', campaignId);
  
  // Get campaign details and contributors
  const campaign = await prisma.fundingCampaign.findUnique({
    where: { id: campaignId },
    include: {
      creator: true,
      contributions: {
        where: { paymentStatus: 'COMPLETED' },
        include: { contributor: true },
      },
    },
  });

  if (!campaign) return;

  // Send notification to campaign creator
  // Send notifications to all contributors
  // Update HubSpot with campaign completion
}
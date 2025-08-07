import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { ProjectPaymentsService } from '@/lib/services/project-payments.service';

const paymentsService = new ProjectPaymentsService();

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();
    
    // Validate required fields
    if (!data.escrowId || !data.disputeReason || !data.disputeAmount || !data.respondentId) {
      return NextResponse.json({ 
        error: 'Missing required fields: escrowId, disputeReason, disputeAmount, respondentId' 
      }, { status: 400 });
    }

    const dispute = await paymentsService.createPaymentDispute({
      escrowId: data.escrowId,
      paymentId: data.paymentId,
      disputeReason: data.disputeReason,
      disputeAmount: data.disputeAmount,
      submittedBy: session.user.id,
      respondentId: data.respondentId,
      evidenceProvided: data.evidenceProvided,
      supportingDocs: data.supportingDocs
    });

    return NextResponse.json(dispute);
  } catch (error) {
    console.error('Error creating payment dispute:', error);
    return NextResponse.json(
      { error: 'Failed to create payment dispute' },
      { status: 500 }
    );
  }
}
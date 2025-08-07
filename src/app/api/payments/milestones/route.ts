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
    if (!data.escrowId || !data.milestoneName || !data.paymentAmount || !data.paymentPercentage || !data.contractorId) {
      return NextResponse.json({ 
        error: 'Missing required fields: escrowId, milestoneName, paymentAmount, paymentPercentage, contractorId' 
      }, { status: 400 });
    }

    const milestone = await paymentsService.createPaymentMilestone({
      escrowId: data.escrowId,
      milestoneName: data.milestoneName,
      paymentAmount: data.paymentAmount,
      paymentPercentage: data.paymentPercentage,
      deliverables: data.deliverables || [],
      verificationCriteria: data.verificationCriteria || {},
      dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
      contractorId: data.contractorId
    });

    return NextResponse.json(milestone);
  } catch (error) {
    console.error('Error creating payment milestone:', error);
    return NextResponse.json(
      { error: 'Failed to create payment milestone' },
      { status: 500 }
    );
  }
}
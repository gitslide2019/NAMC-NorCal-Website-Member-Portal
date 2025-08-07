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
    if (!data.escrowId || !data.taskId || !data.taskName || !data.paymentAmount || !data.contractorId) {
      return NextResponse.json({ 
        error: 'Missing required fields: escrowId, taskId, taskName, paymentAmount, contractorId' 
      }, { status: 400 });
    }

    const taskPayment = await paymentsService.createTaskPayment({
      escrowId: data.escrowId,
      taskId: data.taskId,
      taskName: data.taskName,
      paymentAmount: data.paymentAmount,
      contractorId: data.contractorId,
      completionRequirements: data.completionRequirements || {},
      verificationCriteria: data.verificationCriteria || {},
      approvalRequired: data.approvalRequired,
      photosRequired: data.photosRequired
    });

    return NextResponse.json(taskPayment);
  } catch (error) {
    console.error('Error creating task payment:', error);
    return NextResponse.json(
      { error: 'Failed to create task payment' },
      { status: 500 }
    );
  }
}
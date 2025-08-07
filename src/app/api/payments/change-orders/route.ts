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
    if (!data.escrowId || !data.changeOrderNumber || !data.description || typeof data.amountChange !== 'number') {
      return NextResponse.json({ 
        error: 'Missing required fields: escrowId, changeOrderNumber, description, amountChange' 
      }, { status: 400 });
    }

    const updatedEscrow = await paymentsService.processChangeOrder({
      escrowId: data.escrowId,
      changeOrderNumber: data.changeOrderNumber,
      description: data.description,
      amountChange: data.amountChange,
      scheduleImpact: data.scheduleImpact || 0,
      reason: data.reason || 'Change order requested',
      approvedBy: session.user.id
    });

    return NextResponse.json(updatedEscrow);
  } catch (error) {
    console.error('Error processing change order:', error);
    return NextResponse.json(
      { error: 'Failed to process change order' },
      { status: 500 }
    );
  }
}
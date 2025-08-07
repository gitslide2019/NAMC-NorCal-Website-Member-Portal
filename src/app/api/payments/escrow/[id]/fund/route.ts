import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { ProjectPaymentsService } from '@/lib/services/project-payments.service';

const paymentsService = new ProjectPaymentsService();

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();
    
    if (!data.amount || !data.paymentMethod) {
      return NextResponse.json({ 
        error: 'Missing required fields: amount, paymentMethod' 
      }, { status: 400 });
    }

    const escrow = await paymentsService.fundEscrow(
      params.id,
      data.amount,
      data.paymentMethod
    );

    return NextResponse.json(escrow);
  } catch (error) {
    console.error('Error funding escrow:', error);
    return NextResponse.json(
      { error: 'Failed to fund escrow' },
      { status: 500 }
    );
  }
}
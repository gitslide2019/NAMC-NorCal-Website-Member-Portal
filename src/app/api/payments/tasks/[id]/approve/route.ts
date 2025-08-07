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

    const taskPayment = await paymentsService.approveTaskPayment(
      params.id,
      session.user.id
    );

    return NextResponse.json(taskPayment);
  } catch (error) {
    console.error('Error approving task payment:', error);
    return NextResponse.json(
      { error: 'Failed to approve task payment' },
      { status: 500 }
    );
  }
}
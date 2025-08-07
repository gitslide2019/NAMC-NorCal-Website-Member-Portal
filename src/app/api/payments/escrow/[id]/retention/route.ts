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

    const transactionId = await paymentsService.releaseRetention(
      params.id,
      session.user.id
    );

    return NextResponse.json({ 
      success: true, 
      transactionId,
      message: 'Retention released successfully' 
    });
  } catch (error) {
    console.error('Error releasing retention:', error);
    return NextResponse.json(
      { error: 'Failed to release retention' },
      { status: 500 }
    );
  }
}
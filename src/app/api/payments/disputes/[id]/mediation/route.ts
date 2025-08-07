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

    const dispute = await paymentsService.requestMediation(
      params.id,
      session.user.id
    );

    return NextResponse.json(dispute);
  } catch (error) {
    console.error('Error requesting mediation:', error);
    return NextResponse.json(
      { error: 'Failed to request mediation' },
      { status: 500 }
    );
  }
}
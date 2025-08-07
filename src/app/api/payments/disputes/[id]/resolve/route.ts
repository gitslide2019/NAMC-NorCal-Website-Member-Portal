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
    
    if (!data.resolution || typeof data.resolutionAmount !== 'number') {
      return NextResponse.json({ 
        error: 'Missing required fields: resolution, resolutionAmount' 
      }, { status: 400 });
    }

    const dispute = await paymentsService.resolveDispute(
      params.id,
      data.resolution,
      data.resolutionAmount,
      session.user.id
    );

    return NextResponse.json(dispute);
  } catch (error) {
    console.error('Error resolving dispute:', error);
    return NextResponse.json(
      { error: 'Failed to resolve dispute' },
      { status: 500 }
    );
  }
}
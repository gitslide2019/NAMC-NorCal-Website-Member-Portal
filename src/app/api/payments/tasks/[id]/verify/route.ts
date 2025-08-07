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
    
    if (typeof data.qualityScore !== 'number') {
      return NextResponse.json({ 
        error: 'Missing required field: qualityScore (number)' 
      }, { status: 400 });
    }

    const taskPayment = await paymentsService.verifyTaskCompletion(
      params.id,
      data.qualityScore,
      data.photosSubmitted,
      data.verificationNotes
    );

    return NextResponse.json(taskPayment);
  } catch (error) {
    console.error('Error verifying task completion:', error);
    return NextResponse.json(
      { error: 'Failed to verify task completion' },
      { status: 500 }
    );
  }
}
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
    if (!data.escrowId || !data.projectionDate || typeof data.projectedInflow !== 'number' || typeof data.projectedOutflow !== 'number') {
      return NextResponse.json({ 
        error: 'Missing required fields: escrowId, projectionDate, projectedInflow, projectedOutflow' 
      }, { status: 400 });
    }

    const projection = await paymentsService.createCashFlowProjection({
      escrowId: data.escrowId,
      memberId: session.user.id,
      projectionDate: new Date(data.projectionDate),
      projectedInflow: data.projectedInflow,
      projectedOutflow: data.projectedOutflow,
      riskFactors: data.riskFactors,
      recommendations: data.recommendations
    });

    return NextResponse.json(projection);
  } catch (error) {
    console.error('Error creating cash flow projection:', error);
    return NextResponse.json(
      { error: 'Failed to create cash flow projection' },
      { status: 500 }
    );
  }
}
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
    if (!data.projectId || !data.projectName || !data.totalProjectValue || !data.clientId || !data.contractorId) {
      return NextResponse.json({ 
        error: 'Missing required fields: projectId, projectName, totalProjectValue, clientId, contractorId' 
      }, { status: 400 });
    }

    const escrow = await paymentsService.createProjectEscrow({
      projectId: data.projectId,
      projectName: data.projectName,
      totalProjectValue: data.totalProjectValue,
      clientId: data.clientId,
      contractorId: data.contractorId,
      paymentSchedule: data.paymentSchedule || {},
      retentionPercentage: data.retentionPercentage,
      expectedCompletionDate: data.expectedCompletionDate ? new Date(data.expectedCompletionDate) : undefined
    });

    return NextResponse.json(escrow);
  } catch (error) {
    console.error('Error creating project escrow:', error);
    return NextResponse.json(
      { error: 'Failed to create project escrow' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get('memberId') || session.user.id;

    const dashboard = await paymentsService.getCashFlowDashboard(memberId);

    return NextResponse.json(dashboard);
  } catch (error) {
    console.error('Error getting cash flow dashboard:', error);
    return NextResponse.json(
      { error: 'Failed to get cash flow dashboard' },
      { status: 500 }
    );
  }
}
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { escrowId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    const whereClause: any = {
      escrowId: params.escrowId
    };

    if (status) {
      whereClause.paymentStatus = status;
    }

    const taskPayments = await prisma.taskPayment.findMany({
      where: whereClause,
      include: {
        contractor: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        escrow: {
          select: {
            id: true,
            projectName: true,
            escrowStatus: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json(taskPayments);
  } catch (error) {
    console.error('Error getting task payments:', error);
    return NextResponse.json(
      { error: 'Failed to get task payments' },
      { status: 500 }
    );
  }
}
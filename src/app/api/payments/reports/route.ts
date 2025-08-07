import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const reportType = searchParams.get('type') || 'summary';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const memberId = searchParams.get('memberId') || session.user.id;

    const dateFilter = startDate && endDate ? {
      createdAt: {
        gte: new Date(startDate),
        lte: new Date(endDate)
      }
    } : {};

    let reportData;

    switch (reportType) {
      case 'summary':
        reportData = await generateSummaryReport(memberId, dateFilter);
        break;
      case 'detailed':
        reportData = await generateDetailedReport(memberId, dateFilter);
        break;
      case 'projections':
        reportData = await generateProjectionsReport(memberId, dateFilter);
        break;
      case 'disputes':
        reportData = await generateDisputesReport(memberId, dateFilter);
        break;
      default:
        return NextResponse.json({ error: 'Invalid report type' }, { status: 400 });
    }

    return NextResponse.json(reportData);
  } catch (error) {
    console.error('Error generating report:', error);
    return NextResponse.json(
      { error: 'Failed to generate report' },
      { status: 500 }
    );
  }
}

async function generateSummaryReport(memberId: string, dateFilter: any) {
  const escrows = await prisma.projectEscrow.findMany({
    where: {
      OR: [
        { clientId: memberId },
        { contractorId: memberId }
      ],
      ...dateFilter
    },
    include: {
      taskPayments: true,
      paymentMilestones: true,
      escrowPayments: true,
      paymentDisputes: true
    }
  });

  return {
    totalProjects: escrows.length,
    totalValue: escrows.reduce((sum, e) => sum + e.totalProjectValue, 0),
    totalEscrowBalance: escrows.reduce((sum, e) => sum + e.escrowBalance, 0),
    totalPaid: escrows.reduce((sum, e) => sum + e.totalPaid, 0),
    activeEscrows: escrows.filter(e => e.escrowStatus === 'ACTIVE').length,
    completedEscrows: escrows.filter(e => e.escrowStatus === 'COMPLETED').length,
    totalDisputes: escrows.reduce((sum, e) => sum + e.paymentDisputes.length, 0),
    averageProjectValue: escrows.length > 0 
      ? escrows.reduce((sum, e) => sum + e.totalProjectValue, 0) / escrows.length 
      : 0
  };
}

async function generateDetailedReport(memberId: string, dateFilter: any) {
  const escrows = await prisma.projectEscrow.findMany({
    where: {
      OR: [
        { clientId: memberId },
        { contractorId: memberId }
      ],
      ...dateFilter
    },
    include: {
      client: { select: { id: true, name: true, email: true } },
      contractor: { select: { id: true, name: true, email: true } },
      taskPayments: {
        include: {
          contractor: { select: { id: true, name: true } }
        }
      },
      paymentMilestones: {
        include: {
          contractor: { select: { id: true, name: true } }
        }
      },
      escrowPayments: {
        include: {
          recipient: { select: { id: true, name: true } }
        }
      },
      paymentDisputes: {
        include: {
          submitter: { select: { id: true, name: true } },
          respondent: { select: { id: true, name: true } }
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  return {
    escrows: escrows.map(escrow => ({
      ...escrow,
      paymentHistory: escrow.escrowPayments.map(payment => ({
        id: payment.id,
        amount: payment.amount,
        paymentType: payment.paymentType,
        paymentDate: payment.paymentDate,
        recipient: payment.recipient.name,
        status: payment.paymentStatus
      })),
      taskSummary: {
        total: escrow.taskPayments.length,
        completed: escrow.taskPayments.filter(t => t.paymentStatus === 'PAID').length,
        pending: escrow.taskPayments.filter(t => t.paymentStatus === 'PENDING').length,
        totalAmount: escrow.taskPayments.reduce((sum, t) => sum + t.paymentAmount, 0)
      },
      milestoneSummary: {
        total: escrow.paymentMilestones.length,
        completed: escrow.paymentMilestones.filter(m => m.milestoneStatus === 'PAID').length,
        pending: escrow.paymentMilestones.filter(m => m.milestoneStatus === 'PENDING').length,
        totalAmount: escrow.paymentMilestones.reduce((sum, m) => sum + m.paymentAmount, 0)
      }
    }))
  };
}

async function generateProjectionsReport(memberId: string, dateFilter: any) {
  const projections = await prisma.cashFlowProjection.findMany({
    where: {
      memberId,
      ...dateFilter
    },
    include: {
      escrow: {
        select: {
          id: true,
          projectName: true,
          totalProjectValue: true,
          escrowStatus: true
        }
      }
    },
    orderBy: { projectionDate: 'desc' }
  });

  const accuracy = await calculateProjectionAccuracy(projections);

  return {
    projections: projections.map(p => ({
      ...p,
      riskFactors: p.riskFactors ? JSON.parse(p.riskFactors) : [],
      recommendations: p.recommendations ? JSON.parse(p.recommendations) : []
    })),
    accuracy,
    trends: calculateProjectionTrends(projections)
  };
}

async function generateDisputesReport(memberId: string, dateFilter: any) {
  const disputes = await prisma.paymentDispute.findMany({
    where: {
      OR: [
        { submittedBy: memberId },
        { respondentId: memberId }
      ],
      ...dateFilter
    },
    include: {
      submitter: { select: { id: true, name: true } },
      respondent: { select: { id: true, name: true } },
      escrow: {
        select: {
          id: true,
          projectName: true,
          totalProjectValue: true
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  return {
    disputes: disputes.map(d => ({
      ...d,
      evidenceProvided: d.evidenceProvided ? JSON.parse(d.evidenceProvided) : [],
      supportingDocs: d.supportingDocs ? JSON.parse(d.supportingDocs) : []
    })),
    summary: {
      total: disputes.length,
      resolved: disputes.filter(d => d.disputeStatus === 'RESOLVED').length,
      pending: disputes.filter(d => ['SUBMITTED', 'UNDER_REVIEW', 'MEDIATION'].includes(d.disputeStatus)).length,
      totalAmount: disputes.reduce((sum, d) => sum + d.disputeAmount, 0),
      averageResolutionTime: calculateAverageResolutionTime(disputes)
    }
  };
}

function calculateProjectionAccuracy(projections: any[]) {
  const completedProjections = projections.filter(p => 
    p.actualInflow !== null && p.actualOutflow !== null
  );

  if (completedProjections.length === 0) {
    return { accuracy: 0, sampleSize: 0 };
  }

  const accuracyScores = completedProjections.map(p => {
    const projectedNet = p.projectedInflow - p.projectedOutflow;
    const actualNet = p.actualInflow - p.actualOutflow;
    
    if (projectedNet === 0 && actualNet === 0) return 1;
    if (projectedNet === 0) return 0;
    
    return Math.max(0, 1 - Math.abs(projectedNet - actualNet) / Math.abs(projectedNet));
  });

  return {
    accuracy: accuracyScores.reduce((sum, score) => sum + score, 0) / accuracyScores.length,
    sampleSize: completedProjections.length
  };
}

function calculateProjectionTrends(projections: any[]) {
  if (projections.length < 2) return { trend: 'insufficient_data' };

  const sortedProjections = projections.sort((a, b) => 
    new Date(a.projectionDate).getTime() - new Date(b.projectionDate).getTime()
  );

  const netFlows = sortedProjections.map(p => p.netCashFlow);
  const trend = netFlows[netFlows.length - 1] - netFlows[0];

  return {
    trend: trend > 0 ? 'improving' : trend < 0 ? 'declining' : 'stable',
    changeAmount: trend,
    changePercentage: netFlows[0] !== 0 ? (trend / Math.abs(netFlows[0])) * 100 : 0
  };
}

function calculateAverageResolutionTime(disputes: any[]) {
  const resolvedDisputes = disputes.filter(d => 
    d.disputeStatus === 'RESOLVED' && d.resolutionDate
  );

  if (resolvedDisputes.length === 0) return 0;

  const resolutionTimes = resolvedDisputes.map(d => {
    const created = new Date(d.createdAt).getTime();
    const resolved = new Date(d.resolutionDate).getTime();
    return (resolved - created) / (1000 * 60 * 60 * 24); // Days
  });

  return resolutionTimes.reduce((sum, time) => sum + time, 0) / resolutionTimes.length;
}
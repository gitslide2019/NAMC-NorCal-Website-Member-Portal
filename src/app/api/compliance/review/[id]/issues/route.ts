import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { issueId, isResolved, resolutionNotes } = body;

    if (!issueId) {
      return NextResponse.json(
        { error: 'Issue ID is required' },
        { status: 400 }
      );
    }

    // Verify the compliance review belongs to the user
    const complianceReview = await prisma.complianceReview.findFirst({
      where: {
        id: params.id,
        memberId: session.user.id
      }
    });

    if (!complianceReview) {
      return NextResponse.json(
        { error: 'Compliance review not found' },
        { status: 404 }
      );
    }

    // Update the compliance issue
    const updatedIssue = await prisma.complianceIssue.update({
      where: {
        id: issueId,
        complianceReviewId: params.id
      },
      data: {
        isResolved: isResolved ?? false,
        resolutionNotes,
        resolvedAt: isResolved ? new Date() : null,
        updatedAt: new Date()
      }
    });

    // Update the compliance review's resolved issues count
    const allIssues = await prisma.complianceIssue.findMany({
      where: {
        complianceReviewId: params.id
      }
    });

    const resolvedIssuesCount = allIssues.filter(issue => issue.isResolved).length;
    const newComplianceStatus = resolvedIssuesCount === allIssues.length ? 'COMPLIANT' : 
                               resolvedIssuesCount > 0 ? 'REQUIRES_ACTION' : 
                               complianceReview.complianceStatus;

    await prisma.complianceReview.update({
      where: {
        id: params.id
      },
      data: {
        complianceStatus: newComplianceStatus,
        resolutionDate: newComplianceStatus === 'COMPLIANT' ? new Date() : null,
        updatedAt: new Date()
      }
    });

    return NextResponse.json({
      success: true,
      issue: updatedIssue,
      complianceStatus: newComplianceStatus
    });

  } catch (error) {
    console.error('Error updating compliance issue:', error);
    return NextResponse.json(
      { error: 'Failed to update compliance issue' },
      { status: 500 }
    );
  }
}
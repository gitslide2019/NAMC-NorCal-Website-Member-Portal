import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const complianceReview = await prisma.complianceReview.findFirst({
      where: {
        id: params.id,
        memberId: session.user.id
      },
      include: {
        member: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        issues: {
          orderBy: {
            severity: 'desc'
          }
        }
      }
    });

    if (!complianceReview) {
      return NextResponse.json(
        { error: 'Compliance review not found' },
        { status: 404 }
      );
    }

    // Parse JSON fields
    const formattedReview = {
      ...complianceReview,
      aiRecommendations: complianceReview.aiRecommendations ? JSON.parse(complianceReview.aiRecommendations) : [],
      regulatoryRequirements: complianceReview.regulatoryRequirements ? JSON.parse(complianceReview.regulatoryRequirements) : [],
      locationBasedRules: complianceReview.locationBasedRules ? JSON.parse(complianceReview.locationBasedRules) : []
    };

    return NextResponse.json({
      success: true,
      complianceReview: formattedReview
    });

  } catch (error) {
    console.error('Error fetching compliance review:', error);
    return NextResponse.json(
      { error: 'Failed to fetch compliance review' },
      { status: 500 }
    );
  }
}

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
    const { complianceStatus, resolutionDate } = body;

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

    const updatedReview = await prisma.complianceReview.update({
      where: {
        id: params.id
      },
      data: {
        complianceStatus,
        resolutionDate: resolutionDate ? new Date(resolutionDate) : null,
        updatedAt: new Date()
      },
      include: {
        member: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        issues: {
          orderBy: {
            severity: 'desc'
          }
        }
      }
    });

    // Parse JSON fields
    const formattedReview = {
      ...updatedReview,
      aiRecommendations: updatedReview.aiRecommendations ? JSON.parse(updatedReview.aiRecommendations) : [],
      regulatoryRequirements: updatedReview.regulatoryRequirements ? JSON.parse(updatedReview.regulatoryRequirements) : [],
      locationBasedRules: updatedReview.locationBasedRules ? JSON.parse(updatedReview.locationBasedRules) : []
    };

    return NextResponse.json({
      success: true,
      complianceReview: formattedReview
    });

  } catch (error) {
    console.error('Error updating compliance review:', error);
    return NextResponse.json(
      { error: 'Failed to update compliance review' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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

    await prisma.complianceReview.delete({
      where: {
        id: params.id
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Compliance review deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting compliance review:', error);
    return NextResponse.json(
      { error: 'Failed to delete compliance review' },
      { status: 500 }
    );
  }
}
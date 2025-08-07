import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';
import { HubSpotBackboneService } from '@/lib/services/hubspot-backbone.service';

const prisma = new PrismaClient();
const hubspotService = new HubSpotBackboneService();

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const committeeId = params.id;

    // Get committee with full details
    const committee = await prisma.committee.findUnique({
      where: { id: committeeId },
      include: {
        chair: {
          select: {
            id: true,
            name: true,
            email: true,
            company: true,
            memberType: true,
          },
        },
        memberships: {
          where: { status: 'ACTIVE' },
          include: {
            member: {
              select: {
                id: true,
                name: true,
                email: true,
                company: true,
                memberType: true,
              },
            },
          },
          orderBy: {
            joinedAt: 'asc',
          },
        },
        meetings: {
          orderBy: {
            scheduledDate: 'desc',
          },
          take: 5, // Get recent meetings
        },
        projects: {
          include: {
            leadMember: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            _count: {
              select: {
                tasks: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!committee) {
      return NextResponse.json(
        { error: 'Committee not found' },
        { status: 404 }
      );
    }

    // Check if user has access to this committee
    const userMembership = await prisma.committeeMembership.findUnique({
      where: {
        committeeId_memberId: {
          committeeId,
          memberId: session.user.id,
        },
      },
    });

    if (!committee.isPublic && !userMembership) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      committee: {
        ...committee,
        userMembership,
        isChair: committee.chairId === session.user.id,
        projects: committee.projects.map(project => ({
          ...project,
          taskCount: project._count.tasks,
          _count: undefined,
        })),
      },
    });
  } catch (error) {
    console.error('Error fetching committee:', error);
    return NextResponse.json(
      { error: 'Failed to fetch committee' },
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

    const committeeId = params.id;
    const body = await request.json();
    const {
      name,
      description,
      category,
      isPublic,
      meetingFrequency,
      maxMembers,
      requiresApproval,
      status,
    } = body;

    // Check if user is chair or has moderation permissions
    const committee = await prisma.committee.findUnique({
      where: { id: committeeId },
    });

    if (!committee) {
      return NextResponse.json(
        { error: 'Committee not found' },
        { status: 404 }
      );
    }

    const userMembership = await prisma.committeeMembership.findUnique({
      where: {
        committeeId_memberId: {
          committeeId,
          memberId: session.user.id,
        },
      },
    });

    if (committee.chairId !== session.user.id && !userMembership?.canModerate) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Update committee
    const updatedCommittee = await prisma.committee.update({
      where: { id: committeeId },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(category && { category }),
        ...(typeof isPublic === 'boolean' && { isPublic }),
        ...(meetingFrequency && { meetingFrequency }),
        ...(maxMembers && { maxMembers }),
        ...(typeof requiresApproval === 'boolean' && { requiresApproval }),
        ...(status && { status }),
        hubspotSyncStatus: 'PENDING',
      },
      include: {
        chair: {
          select: {
            id: true,
            name: true,
            email: true,
            company: true,
            memberType: true,
          },
        },
      },
    });

    // Sync to HubSpot in background
    try {
      await hubspotService.updateCommittee(committeeId, {
        name,
        description,
        category,
        isPublic,
        meetingFrequency,
        maxMembers,
        requiresApproval,
        status,
      });
    } catch (hubspotError) {
      console.error('HubSpot sync error:', hubspotError);
    }

    return NextResponse.json({ committee: updatedCommittee });
  } catch (error) {
    console.error('Error updating committee:', error);
    return NextResponse.json(
      { error: 'Failed to update committee' },
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

    const committeeId = params.id;

    // Check if user is chair
    const committee = await prisma.committee.findUnique({
      where: { id: committeeId },
    });

    if (!committee) {
      return NextResponse.json(
        { error: 'Committee not found' },
        { status: 404 }
      );
    }

    if (committee.chairId !== session.user.id) {
      return NextResponse.json(
        { error: 'Only the committee chair can delete the committee' },
        { status: 403 }
      );
    }

    // Soft delete by updating status
    await prisma.committee.update({
      where: { id: committeeId },
      data: {
        status: 'ARCHIVED',
        hubspotSyncStatus: 'PENDING',
      },
    });

    // Sync to HubSpot in background
    try {
      await hubspotService.archiveCommittee(committeeId);
    } catch (hubspotError) {
      console.error('HubSpot sync error:', hubspotError);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting committee:', error);
    return NextResponse.json(
      { error: 'Failed to delete committee' },
      { status: 500 }
    );
  }
}
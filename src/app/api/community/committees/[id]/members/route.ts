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

    // Check if user has access to this committee
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

    if (!committee.isPublic && !userMembership) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Get committee members
    const memberships = await prisma.committeeMembership.findMany({
      where: {
        committeeId,
        status: 'ACTIVE',
      },
      include: {
        member: {
          select: {
            id: true,
            name: true,
            email: true,
            company: true,
            memberType: true,
            location: true,
          },
        },
      },
      orderBy: [
        { role: 'asc' }, // Chair first, then others
        { joinedAt: 'asc' },
      ],
    });

    return NextResponse.json({ memberships });
  } catch (error) {
    console.error('Error fetching committee members:', error);
    return NextResponse.json(
      { error: 'Failed to fetch committee members' },
      { status: 500 }
    );
  }
}

export async function POST(
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
    const { memberId, role = 'MEMBER' } = body;

    // Check if user can invite members
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

    if (committee.chairId !== session.user.id && !userMembership?.canInvite) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Check if member exists
    const member = await prisma.user.findUnique({
      where: { id: memberId },
    });

    if (!member) {
      return NextResponse.json(
        { error: 'Member not found' },
        { status: 404 }
      );
    }

    // Check if member is already in committee
    const existingMembership = await prisma.committeeMembership.findUnique({
      where: {
        committeeId_memberId: {
          committeeId,
          memberId,
        },
      },
    });

    if (existingMembership) {
      return NextResponse.json(
        { error: 'Member is already in this committee' },
        { status: 400 }
      );
    }

    // Check max members limit
    if (committee.maxMembers) {
      const currentMemberCount = await prisma.committeeMembership.count({
        where: {
          committeeId,
          status: 'ACTIVE',
        },
      });

      if (currentMemberCount >= committee.maxMembers) {
        return NextResponse.json(
          { error: 'Committee has reached maximum member limit' },
          { status: 400 }
        );
      }
    }

    // Create membership
    const membership = await prisma.committeeMembership.create({
      data: {
        committeeId,
        memberId,
        role,
        status: committee.requiresApproval ? 'PENDING' : 'ACTIVE',
        canPost: true,
        canInvite: role === 'MODERATOR' || role === 'CHAIR',
        canModerate: role === 'MODERATOR' || role === 'CHAIR',
      },
      include: {
        member: {
          select: {
            id: true,
            name: true,
            email: true,
            company: true,
            memberType: true,
            location: true,
          },
        },
      },
    });

    // Update committee member count if approved
    if (!committee.requiresApproval) {
      await prisma.committee.update({
        where: { id: committeeId },
        data: {
          memberCount: { increment: 1 },
        },
      });
    }

    // Sync to HubSpot in background
    try {
      await hubspotService.addCommitteeMember({
        committeeId,
        memberId,
        role,
        status: membership.status,
        invitedBy: session.user.id,
      });
    } catch (hubspotError) {
      console.error('HubSpot sync error:', hubspotError);
    }

    return NextResponse.json({ membership });
  } catch (error) {
    console.error('Error adding committee member:', error);
    return NextResponse.json(
      { error: 'Failed to add committee member' },
      { status: 500 }
    );
  }
}
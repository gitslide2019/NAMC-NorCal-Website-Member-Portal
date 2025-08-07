import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';
import { HubSpotBackboneService } from '@/lib/services/hubspot-backbone.service';

const prisma = new PrismaClient();
const hubspotService = new HubSpotBackboneService();

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const status = searchParams.get('status') || 'ACTIVE';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search');
    const myCommittees = searchParams.get('myCommittees') === 'true';

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {
      status,
    };

    if (category && category !== 'ALL') {
      where.category = category;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (myCommittees) {
      where.OR = [
        { chairId: session.user.id },
        { 
          memberships: {
            some: {
              memberId: session.user.id,
              status: 'ACTIVE'
            }
          }
        }
      ];
    }

    // Get committees with chair and membership info
    const committees = await prisma.committee.findMany({
      where,
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
        },
        _count: {
          select: {
            memberships: {
              where: { status: 'ACTIVE' }
            },
            meetings: true,
            projects: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip,
      take: limit,
    });

    // Get total count for pagination
    const totalCount = await prisma.committee.count({ where });

    // Check user's membership status for each committee
    const committeesWithMembership = await Promise.all(
      committees.map(async (committee) => {
        const userMembership = await prisma.committeeMembership.findUnique({
          where: {
            committeeId_memberId: {
              committeeId: committee.id,
              memberId: session.user.id,
            },
          },
        });

        return {
          ...committee,
          memberCount: committee._count.memberships,
          meetingCount: committee._count.meetings,
          projectCount: committee._count.projects,
          userMembership,
          isChair: committee.chairId === session.user.id,
          _count: undefined,
        };
      })
    );

    return NextResponse.json({
      committees: committeesWithMembership,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching committees:', error);
    return NextResponse.json(
      { error: 'Failed to fetch committees' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      description,
      category = 'PROJECTS',
      isPublic = true,
      meetingFrequency,
      maxMembers,
      requiresApproval = false,
    } = body;

    // Validate required fields
    if (!name) {
      return NextResponse.json(
        { error: 'Committee name is required' },
        { status: 400 }
      );
    }

    // Create committee in local database
    const committee = await prisma.committee.create({
      data: {
        name,
        description,
        category,
        chairId: session.user.id,
        isPublic,
        meetingFrequency,
        maxMembers,
        requiresApproval,
        memberCount: 1, // Chair is automatically a member
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

    // Create chair membership
    await prisma.committeeMembership.create({
      data: {
        committeeId: committee.id,
        memberId: session.user.id,
        role: 'CHAIR',
        canPost: true,
        canInvite: true,
        canModerate: true,
      },
    });

    // Sync to HubSpot in background
    try {
      await hubspotService.createCommittee({
        committeeId: committee.id,
        name,
        description,
        category,
        chairId: session.user.id,
        isPublic,
        meetingFrequency,
        maxMembers,
        requiresApproval,
      });
    } catch (hubspotError) {
      console.error('HubSpot sync error:', hubspotError);
    }

    return NextResponse.json({
      committee: {
        ...committee,
        memberCount: 1,
        meetingCount: 0,
        projectCount: 0,
        userMembership: {
          role: 'CHAIR',
          status: 'ACTIVE',
          canPost: true,
          canInvite: true,
          canModerate: true,
        },
        isChair: true,
      },
    });
  } catch (error) {
    console.error('Error creating committee:', error);
    return NextResponse.json(
      { error: 'Failed to create committee' },
      { status: 500 }
    );
  }
}
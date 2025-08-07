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
    const status = searchParams.get('status') || 'ACTIVE';
    const committeeId = searchParams.get('committeeId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search');
    const myVotes = searchParams.get('myVotes') === 'true';

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {
      status,
    };

    if (committeeId) {
      where.committeeId = committeeId;
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (myVotes) {
      where.createdBy = session.user.id;
    }

    // Get votes with creator and committee info
    const votes = await prisma.communityVote.findMany({
      where,
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
            company: true,
            memberType: true,
          },
        },
        committee: {
          select: {
            id: true,
            name: true,
            category: true,
          },
        },
        options: {
          orderBy: { displayOrder: 'asc' },
        },
        _count: {
          select: {
            ballots: true,
            comments: true,
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
    const totalCount = await prisma.communityVote.count({ where });

    // Check user's voting status for each vote
    const votesWithUserStatus = await Promise.all(
      votes.map(async (vote) => {
        const userBallot = await prisma.voteBallot.findUnique({
          where: {
            voteId_voterId: {
              voteId: vote.id,
              voterId: session.user.id,
            },
          },
        });

        // Check if user is eligible to vote
        let isEligible = true;
        if (vote.eligibleVoters) {
          const eligibleList = JSON.parse(vote.eligibleVoters);
          isEligible = eligibleList.includes(session.user.id);
        }

        // Check if vote is still active
        const now = new Date();
        const isActive = vote.status === 'ACTIVE' && now <= vote.endDate;

        return {
          ...vote,
          ballotCount: vote._count.ballots,
          commentCount: vote._count.comments,
          userBallot,
          isEligible,
          isActive,
          canVote: isActive && isEligible && !userBallot,
          _count: undefined,
        };
      })
    );

    return NextResponse.json({
      votes: votesWithUserStatus,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching votes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch votes' },
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
      title,
      description,
      voteType = 'SIMPLE',
      committeeId,
      endDate,
      isAnonymous = false,
      requiresQuorum = false,
      quorumPercentage,
      eligibleVoters,
      allowAbstain = true,
      allowComments = true,
      options = [],
    } = body;

    // Validate required fields
    if (!title || !description || !endDate) {
      return NextResponse.json(
        { error: 'Title, description, and end date are required' },
        { status: 400 }
      );
    }

    // Validate end date is in the future
    if (new Date(endDate) <= new Date()) {
      return NextResponse.json(
        { error: 'End date must be in the future' },
        { status: 400 }
      );
    }

    // Validate options for non-simple votes
    if (voteType !== 'SIMPLE' && options.length < 2) {
      return NextResponse.json(
        { error: 'At least 2 options are required for this vote type' },
        { status: 400 }
      );
    }

    // Check committee access if specified
    if (committeeId) {
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
    }

    // Create vote in local database
    const vote = await prisma.communityVote.create({
      data: {
        title,
        description,
        voteType,
        createdBy: session.user.id,
        committeeId,
        endDate: new Date(endDate),
        isAnonymous,
        requiresQuorum,
        quorumPercentage,
        eligibleVoters: eligibleVoters ? JSON.stringify(eligibleVoters) : null,
        allowAbstain,
        allowComments,
        hubspotSyncStatus: 'PENDING',
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
            company: true,
            memberType: true,
          },
        },
        committee: {
          select: {
            id: true,
            name: true,
            category: true,
          },
        },
      },
    });

    // Create vote options if provided
    if (options.length > 0) {
      await prisma.voteOption.createMany({
        data: options.map((option: any, index: number) => ({
          voteId: vote.id,
          optionText: option.text,
          description: option.description,
          displayOrder: index,
        })),
      });
    } else if (voteType === 'SIMPLE') {
      // Create default Yes/No options for simple votes
      await prisma.voteOption.createMany({
        data: [
          {
            voteId: vote.id,
            optionText: 'Yes',
            displayOrder: 0,
          },
          {
            voteId: vote.id,
            optionText: 'No',
            displayOrder: 1,
          },
        ],
      });
    }

    // Create audit log entry
    await prisma.voteAuditLog.create({
      data: {
        voteId: vote.id,
        action: 'CREATED',
        performedBy: session.user.id,
        details: JSON.stringify({
          title,
          voteType,
          committeeId,
          endDate,
        }),
      },
    });

    // Sync to HubSpot in background
    try {
      await hubspotService.createCommunityVote({
        voteId: vote.id,
        title,
        description,
        voteType,
        createdBy: session.user.id,
        committeeId,
        endDate,
        isAnonymous,
        requiresQuorum,
        quorumPercentage,
        eligibleVoters,
        allowAbstain,
        allowComments,
      });
    } catch (hubspotError) {
      console.error('HubSpot sync error:', hubspotError);
    }

    return NextResponse.json({
      vote: {
        ...vote,
        ballotCount: 0,
        commentCount: 0,
        userBallot: null,
        isEligible: true,
        isActive: true,
        canVote: true,
      },
    });
  } catch (error) {
    console.error('Error creating vote:', error);
    return NextResponse.json(
      { error: 'Failed to create vote' },
      { status: 500 }
    );
  }
}
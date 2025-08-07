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

    const voteId = params.id;

    // Get vote with full details
    const vote = await prisma.communityVote.findUnique({
      where: { id: voteId },
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
        ballots: {
          include: {
            voter: {
              select: {
                id: true,
                name: true,
                email: true,
                company: true,
              },
            },
            option: true,
          },
          orderBy: { createdAt: 'desc' },
        },
        comments: {
          include: {
            author: {
              select: {
                id: true,
                name: true,
                email: true,
                company: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!vote) {
      return NextResponse.json(
        { error: 'Vote not found' },
        { status: 404 }
      );
    }

    // Check if user has access to this vote
    if (vote.committeeId) {
      const committee = await prisma.committee.findUnique({
        where: { id: vote.committeeId },
      });

      if (committee && !committee.isPublic) {
        const userMembership = await prisma.committeeMembership.findUnique({
          where: {
            committeeId_memberId: {
              committeeId: vote.committeeId,
              memberId: session.user.id,
            },
          },
        });

        if (!userMembership) {
          return NextResponse.json(
            { error: 'Access denied' },
            { status: 403 }
          );
        }
      }
    }

    // Check if user is eligible to vote
    let isEligible = true;
    if (vote.eligibleVoters) {
      const eligibleList = JSON.parse(vote.eligibleVoters);
      isEligible = eligibleList.includes(session.user.id);
    }

    // Get user's ballot
    const userBallot = vote.ballots.find(ballot => ballot.voterId === session.user.id);

    // Check if vote is still active
    const now = new Date();
    const isActive = vote.status === 'ACTIVE' && now <= vote.endDate;

    // Calculate results if vote is closed or user has voted
    let calculatedResults = null;
    if (vote.status === 'CLOSED' || userBallot) {
      calculatedResults = calculateVoteResults(vote);
    }

    // Filter ballots for anonymous votes
    let visibleBallots = vote.ballots;
    if (vote.isAnonymous && vote.createdBy !== session.user.id) {
      visibleBallots = vote.ballots.map(ballot => ({
        ...ballot,
        voter: { id: 'anonymous', name: 'Anonymous', email: '', company: '' },
      }));
    }

    return NextResponse.json({
      vote: {
        ...vote,
        ballots: visibleBallots,
        userBallot,
        isEligible,
        isActive,
        canVote: isActive && isEligible && !userBallot,
        results: calculatedResults,
      },
    });
  } catch (error) {
    console.error('Error fetching vote:', error);
    return NextResponse.json(
      { error: 'Failed to fetch vote' },
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

    const voteId = params.id;
    const body = await request.json();
    const { action, ...updateData } = body;

    // Get the vote
    const vote = await prisma.communityVote.findUnique({
      where: { id: voteId },
    });

    if (!vote) {
      return NextResponse.json(
        { error: 'Vote not found' },
        { status: 404 }
      );
    }

    // Check permissions
    if (vote.createdBy !== session.user.id) {
      return NextResponse.json(
        { error: 'Only the vote creator can modify the vote' },
        { status: 403 }
      );
    }

    let updatedVote;
    let auditAction = 'UPDATED';

    if (action === 'close') {
      // Close the vote and calculate results
      const results = await calculateAndSaveResults(voteId);
      
      updatedVote = await prisma.communityVote.update({
        where: { id: voteId },
        data: {
          status: 'CLOSED',
          results: JSON.stringify(results),
          winningOption: results.winner,
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
          options: {
            orderBy: { displayOrder: 'asc' },
          },
        },
      });

      auditAction = 'CLOSED';
    } else if (action === 'cancel') {
      updatedVote = await prisma.communityVote.update({
        where: { id: voteId },
        data: {
          status: 'CANCELLED',
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
          options: {
            orderBy: { displayOrder: 'asc' },
          },
        },
      });

      auditAction = 'CANCELLED';
    } else {
      // Regular update
      updatedVote = await prisma.communityVote.update({
        where: { id: voteId },
        data: {
          ...updateData,
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
          options: {
            orderBy: { displayOrder: 'asc' },
          },
        },
      });
    }

    // Create audit log entry
    await prisma.voteAuditLog.create({
      data: {
        voteId,
        action: auditAction,
        performedBy: session.user.id,
        details: JSON.stringify({ action, ...updateData }),
      },
    });

    // Sync to HubSpot in background
    try {
      await hubspotService.updateCommunityVote(voteId, {
        status: updatedVote.status,
        action,
        updatedBy: session.user.id,
      });
    } catch (hubspotError) {
      console.error('HubSpot sync error:', hubspotError);
    }

    return NextResponse.json({ vote: updatedVote });
  } catch (error) {
    console.error('Error updating vote:', error);
    return NextResponse.json(
      { error: 'Failed to update vote' },
      { status: 500 }
    );
  }
}

// Helper function to calculate vote results
function calculateVoteResults(vote: any) {
  const results: any = {
    totalVotes: vote.ballots.length,
    abstainVotes: vote.ballots.filter((b: any) => b.isAbstain).length,
    options: {},
    winner: null,
    winnerPercentage: 0,
  };

  // Count votes for each option
  vote.options.forEach((option: any) => {
    const optionVotes = vote.ballots.filter((b: any) => b.optionId === option.id).length;
    const percentage = vote.ballots.length > 0 ? (optionVotes / vote.ballots.length) * 100 : 0;
    
    results.options[option.id] = {
      text: option.optionText,
      votes: optionVotes,
      percentage: Math.round(percentage * 100) / 100,
    };

    // Track winner
    if (optionVotes > 0 && percentage > results.winnerPercentage) {
      results.winner = option.optionText;
      results.winnerPercentage = percentage;
    }
  });

  return results;
}

// Helper function to calculate and save results
async function calculateAndSaveResults(voteId: string) {
  const vote = await prisma.communityVote.findUnique({
    where: { id: voteId },
    include: {
      options: true,
      ballots: true,
    },
  });

  if (!vote) throw new Error('Vote not found');

  const results = calculateVoteResults(vote);

  // Update option vote counts
  for (const option of vote.options) {
    const optionResult = results.options[option.id];
    if (optionResult) {
      await prisma.voteOption.update({
        where: { id: option.id },
        data: {
          voteCount: optionResult.votes,
          percentage: optionResult.percentage,
        },
      });
    }
  }

  return results;
}
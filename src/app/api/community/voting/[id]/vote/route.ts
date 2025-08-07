import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';
import { HubSpotBackboneService } from '@/lib/services/hubspot-backbone.service';

const prisma = new PrismaClient();
const hubspotService = new HubSpotBackboneService();

export async function POST(
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
    const { optionId, rankedChoices, isAbstain = false, comment } = body;

    // Get the vote
    const vote = await prisma.communityVote.findUnique({
      where: { id: voteId },
      include: {
        options: true,
      },
    });

    if (!vote) {
      return NextResponse.json(
        { error: 'Vote not found' },
        { status: 404 }
      );
    }

    // Check if vote is still active
    const now = new Date();
    if (vote.status !== 'ACTIVE' || now > vote.endDate) {
      return NextResponse.json(
        { error: 'Vote is no longer active' },
        { status: 400 }
      );
    }

    // Check if user is eligible to vote
    if (vote.eligibleVoters) {
      const eligibleList = JSON.parse(vote.eligibleVoters);
      if (!eligibleList.includes(session.user.id)) {
        return NextResponse.json(
          { error: 'You are not eligible to vote on this item' },
          { status: 403 }
        );
      }
    }

    // Check if user has already voted
    const existingBallot = await prisma.voteBallot.findUnique({
      where: {
        voteId_voterId: {
          voteId,
          voterId: session.user.id,
        },
      },
    });

    if (existingBallot) {
      return NextResponse.json(
        { error: 'You have already voted on this item' },
        { status: 400 }
      );
    }

    // Validate vote data
    if (!isAbstain) {
      if (vote.voteType === 'SIMPLE' || vote.voteType === 'MULTIPLE_CHOICE') {
        if (!optionId) {
          return NextResponse.json(
            { error: 'Option selection is required' },
            { status: 400 }
          );
        }

        // Verify option exists
        const option = vote.options.find(o => o.id === optionId);
        if (!option) {
          return NextResponse.json(
            { error: 'Invalid option selected' },
            { status: 400 }
          );
        }
      } else if (vote.voteType === 'RANKED') {
        if (!rankedChoices || !Array.isArray(rankedChoices) || rankedChoices.length === 0) {
          return NextResponse.json(
            { error: 'Ranked choices are required for this vote type' },
            { status: 400 }
          );
        }

        // Verify all ranked choices are valid options
        for (const choiceId of rankedChoices) {
          const option = vote.options.find(o => o.id === choiceId);
          if (!option) {
            return NextResponse.json(
              { error: 'Invalid option in ranked choices' },
              { status: 400 }
            );
          }
        }
      }
    } else {
      // Check if abstain is allowed
      if (!vote.allowAbstain) {
        return NextResponse.json(
          { error: 'Abstaining is not allowed for this vote' },
          { status: 400 }
        );
      }
    }

    // Get client IP and user agent for audit
    const clientIP = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Create ballot
    const ballot = await prisma.voteBallot.create({
      data: {
        voteId,
        voterId: session.user.id,
        optionId: isAbstain ? null : optionId,
        rankedChoices: rankedChoices ? JSON.stringify(rankedChoices) : null,
        isAbstain,
        comment,
        ipAddress: clientIP,
        userAgent,
      },
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
    });

    // Update vote total count
    await prisma.communityVote.update({
      where: { id: voteId },
      data: {
        totalVotes: { increment: 1 },
      },
    });

    // Update option vote count if not abstain
    if (!isAbstain && optionId) {
      await prisma.voteOption.update({
        where: { id: optionId },
        data: {
          voteCount: { increment: 1 },
        },
      });

      // Recalculate percentages for all options
      const totalVotes = await prisma.voteBallot.count({
        where: { voteId, isAbstain: false },
      });

      if (totalVotes > 0) {
        for (const option of vote.options) {
          const optionVotes = await prisma.voteBallot.count({
            where: { voteId, optionId: option.id, isAbstain: false },
          });
          
          const percentage = (optionVotes / totalVotes) * 100;
          
          await prisma.voteOption.update({
            where: { id: option.id },
            data: { percentage: Math.round(percentage * 100) / 100 },
          });
        }
      }
    }

    // Create audit log entry
    await prisma.voteAuditLog.create({
      data: {
        voteId,
        action: 'VOTED',
        performedBy: session.user.id,
        details: JSON.stringify({
          optionId,
          rankedChoices,
          isAbstain,
          hasComment: !!comment,
        }),
        ipAddress: clientIP,
        userAgent,
      },
    });

    // Check if quorum is met and auto-close if needed
    if (vote.requiresQuorum && vote.quorumPercentage) {
      const totalEligibleVoters = vote.eligibleVoters 
        ? JSON.parse(vote.eligibleVoters).length 
        : await prisma.user.count({ where: { isActive: true } });
      
      const currentVotes = await prisma.voteBallot.count({ where: { voteId } });
      const participationRate = (currentVotes / totalEligibleVoters) * 100;
      
      if (participationRate >= vote.quorumPercentage) {
        // Quorum met - could auto-close or just mark as quorum achieved
        await prisma.communityVote.update({
          where: { id: voteId },
          data: {
            // Could add a quorumMet field to track this
          },
        });
      }
    }

    // Sync to HubSpot in background
    try {
      await hubspotService.recordVoteBallot({
        voteId,
        voterId: session.user.id,
        optionId,
        rankedChoices,
        isAbstain,
        hasComment: !!comment,
      });
    } catch (hubspotError) {
      console.error('HubSpot sync error:', hubspotError);
    }

    // Return ballot without sensitive info for anonymous votes
    const returnBallot = vote.isAnonymous ? {
      ...ballot,
      voter: { id: 'anonymous', name: 'Anonymous', email: '', company: '' },
      ipAddress: undefined,
      userAgent: undefined,
    } : {
      ...ballot,
      ipAddress: undefined,
      userAgent: undefined,
    };

    return NextResponse.json({ ballot: returnBallot });
  } catch (error) {
    console.error('Error casting vote:', error);
    return NextResponse.json(
      { error: 'Failed to cast vote' },
      { status: 500 }
    );
  }
}
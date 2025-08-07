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

    const discussionId = params.id;

    // Check if discussion exists
    const discussion = await prisma.communityDiscussion.findUnique({
      where: { id: discussionId },
    });

    if (!discussion) {
      return NextResponse.json(
        { error: 'Discussion not found' },
        { status: 404 }
      );
    }

    // Check if user already liked this discussion
    const existingLike = await prisma.discussionLike.findUnique({
      where: {
        discussionId_memberId: {
          discussionId,
          memberId: session.user.id,
        },
      },
    });

    if (existingLike) {
      return NextResponse.json(
        { error: 'Already liked this discussion' },
        { status: 400 }
      );
    }

    // Create like
    await prisma.discussionLike.create({
      data: {
        discussionId,
        memberId: session.user.id,
      },
    });

    // Update discussion like count
    const updatedDiscussion = await prisma.communityDiscussion.update({
      where: { id: discussionId },
      data: {
        likeCount: { increment: 1 },
      },
    });

    // Sync to HubSpot in background
    try {
      await hubspotService.recordDiscussionLike({
        discussionId,
        memberId: session.user.id,
        action: 'LIKE',
      });
    } catch (hubspotError) {
      console.error('HubSpot sync error:', hubspotError);
    }

    return NextResponse.json({
      success: true,
      likeCount: updatedDiscussion.likeCount,
    });
  } catch (error) {
    console.error('Error liking discussion:', error);
    return NextResponse.json(
      { error: 'Failed to like discussion' },
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

    const discussionId = params.id;

    // Check if user has liked this discussion
    const existingLike = await prisma.discussionLike.findUnique({
      where: {
        discussionId_memberId: {
          discussionId,
          memberId: session.user.id,
        },
      },
    });

    if (!existingLike) {
      return NextResponse.json(
        { error: 'Like not found' },
        { status: 404 }
      );
    }

    // Remove like
    await prisma.discussionLike.delete({
      where: {
        discussionId_memberId: {
          discussionId,
          memberId: session.user.id,
        },
      },
    });

    // Update discussion like count
    const updatedDiscussion = await prisma.communityDiscussion.update({
      where: { id: discussionId },
      data: {
        likeCount: { decrement: 1 },
      },
    });

    // Sync to HubSpot in background
    try {
      await hubspotService.recordDiscussionLike({
        discussionId,
        memberId: session.user.id,
        action: 'UNLIKE',
      });
    } catch (hubspotError) {
      console.error('HubSpot sync error:', hubspotError);
    }

    return NextResponse.json({
      success: true,
      likeCount: updatedDiscussion.likeCount,
    });
  } catch (error) {
    console.error('Error unliking discussion:', error);
    return NextResponse.json(
      { error: 'Failed to unlike discussion' },
      { status: 500 }
    );
  }
}
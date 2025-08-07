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

    const discussionId = params.id;

    // Get discussion with replies
    const discussion = await prisma.communityDiscussion.findUnique({
      where: { id: discussionId },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            company: true,
            memberType: true,
          },
        },
        replies: {
          include: {
            author: {
              select: {
                id: true,
                name: true,
                email: true,
                company: true,
                memberType: true,
              },
            },
            _count: {
              select: {
                likes: true,
              },
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
        likes: {
          where: {
            memberId: session.user.id,
          },
        },
        _count: {
          select: {
            replies: true,
            likes: true,
          },
        },
      },
    });

    if (!discussion) {
      return NextResponse.json(
        { error: 'Discussion not found' },
        { status: 404 }
      );
    }

    // Check if user can view this discussion
    if (!discussion.isPublic && discussion.authorId !== session.user.id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Increment view count
    await prisma.communityDiscussion.update({
      where: { id: discussionId },
      data: { viewCount: { increment: 1 } },
    });

    return NextResponse.json({
      discussion: {
        ...discussion,
        replyCount: discussion._count.replies,
        likeCount: discussion._count.likes,
        isLikedByUser: discussion.likes.length > 0,
        replies: discussion.replies.map(reply => ({
          ...reply,
          likeCount: reply._count.likes,
          _count: undefined,
        })),
        likes: undefined,
        _count: undefined,
      },
    });
  } catch (error) {
    console.error('Error fetching discussion:', error);
    return NextResponse.json(
      { error: 'Failed to fetch discussion' },
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

    const discussionId = params.id;
    const body = await request.json();
    const { title, content, category, tags, isPublic, allowReplies } = body;

    // Check if user owns this discussion
    const existingDiscussion = await prisma.communityDiscussion.findUnique({
      where: { id: discussionId },
    });

    if (!existingDiscussion) {
      return NextResponse.json(
        { error: 'Discussion not found' },
        { status: 404 }
      );
    }

    if (existingDiscussion.authorId !== session.user.id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Update discussion
    const updatedDiscussion = await prisma.communityDiscussion.update({
      where: { id: discussionId },
      data: {
        ...(title && { title }),
        ...(content && { content }),
        ...(category && { category }),
        ...(tags && { tags: JSON.stringify(tags) }),
        ...(typeof isPublic === 'boolean' && { isPublic }),
        ...(typeof allowReplies === 'boolean' && { allowReplies }),
        hubspotSyncStatus: 'PENDING',
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            company: true,
            memberType: true,
          },
        },
        _count: {
          select: {
            replies: true,
            likes: true,
          },
        },
      },
    });

    // Sync to HubSpot in background
    try {
      await hubspotService.updateCommunityDiscussion(discussionId, {
        title,
        content,
        category,
        tags,
        isPublic,
        allowReplies,
      });
    } catch (hubspotError) {
      console.error('HubSpot sync error:', hubspotError);
    }

    return NextResponse.json({
      discussion: {
        ...updatedDiscussion,
        replyCount: updatedDiscussion._count.replies,
        likeCount: updatedDiscussion._count.likes,
        _count: undefined,
      },
    });
  } catch (error) {
    console.error('Error updating discussion:', error);
    return NextResponse.json(
      { error: 'Failed to update discussion' },
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

    // Check if user owns this discussion or is admin
    const existingDiscussion = await prisma.communityDiscussion.findUnique({
      where: { id: discussionId },
    });

    if (!existingDiscussion) {
      return NextResponse.json(
        { error: 'Discussion not found' },
        { status: 404 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (
      existingDiscussion.authorId !== session.user.id &&
      user?.memberType !== 'ADMIN'
    ) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Soft delete by updating status
    await prisma.communityDiscussion.update({
      where: { id: discussionId },
      data: {
        status: 'ARCHIVED',
        hubspotSyncStatus: 'PENDING',
      },
    });

    // Sync to HubSpot in background
    try {
      await hubspotService.archiveCommunityDiscussion(discussionId);
    } catch (hubspotError) {
      console.error('HubSpot sync error:', hubspotError);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting discussion:', error);
    return NextResponse.json(
      { error: 'Failed to delete discussion' },
      { status: 500 }
    );
  }
}
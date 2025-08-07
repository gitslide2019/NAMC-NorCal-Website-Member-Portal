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
    const body = await request.json();
    const { content } = body;

    if (!content) {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      );
    }

    // Check if parent discussion exists and allows replies
    const parentDiscussion = await prisma.communityDiscussion.findUnique({
      where: { id: discussionId },
    });

    if (!parentDiscussion) {
      return NextResponse.json(
        { error: 'Discussion not found' },
        { status: 404 }
      );
    }

    if (!parentDiscussion.allowReplies) {
      return NextResponse.json(
        { error: 'Replies are not allowed on this discussion' },
        { status: 403 }
      );
    }

    if (parentDiscussion.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: 'Cannot reply to inactive discussion' },
        { status: 403 }
      );
    }

    // Create reply
    const reply = await prisma.communityDiscussion.create({
      data: {
        title: `Re: ${parentDiscussion.title}`,
        content,
        category: parentDiscussion.category,
        discussionType: 'DISCUSSION',
        authorId: session.user.id,
        parentId: discussionId,
        isPublic: parentDiscussion.isPublic,
        allowReplies: false, // Replies to replies are not allowed for simplicity
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
      },
    });

    // Update parent discussion reply count and last activity
    await prisma.communityDiscussion.update({
      where: { id: discussionId },
      data: {
        replyCount: { increment: 1 },
        lastActivityAt: new Date(),
      },
    });

    // Sync to HubSpot in background
    try {
      await hubspotService.createDiscussionReply({
        replyId: reply.id,
        parentDiscussionId: discussionId,
        content,
        authorId: session.user.id,
      });
    } catch (hubspotError) {
      console.error('HubSpot sync error:', hubspotError);
    }

    return NextResponse.json({
      reply: {
        ...reply,
        likeCount: 0,
      },
    });
  } catch (error) {
    console.error('Error creating reply:', error);
    return NextResponse.json(
      { error: 'Failed to create reply' },
      { status: 500 }
    );
  }
}
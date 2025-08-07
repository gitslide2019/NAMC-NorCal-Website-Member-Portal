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
    const type = searchParams.get('type');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search');
    const sortBy = searchParams.get('sortBy') || 'lastActivityAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {
      status: 'ACTIVE',
      parentId: null, // Only get top-level discussions
    };

    if (category && category !== 'ALL') {
      where.category = category;
    }

    if (type && type !== 'ALL') {
      where.discussionType = type;
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Get discussions with author and reply count
    const discussions = await prisma.communityDiscussion.findMany({
      where,
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
      orderBy: {
        [sortBy]: sortOrder as 'asc' | 'desc',
      },
      skip,
      take: limit,
    });

    // Get total count for pagination
    const totalCount = await prisma.communityDiscussion.count({ where });

    // Update view counts for discussions being viewed
    const discussionIds = discussions.map(d => d.id);
    if (discussionIds.length > 0) {
      await prisma.communityDiscussion.updateMany({
        where: { id: { in: discussionIds } },
        data: { viewCount: { increment: 1 } },
      });
    }

    return NextResponse.json({
      discussions: discussions.map(discussion => ({
        ...discussion,
        replyCount: discussion._count.replies,
        likeCount: discussion._count.likes,
        _count: undefined,
      })),
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching community discussions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch discussions' },
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
      content,
      category = 'GENERAL',
      discussionType = 'DISCUSSION',
      tags = [],
      isPublic = true,
      allowReplies = true,
    } = body;

    // Validate required fields
    if (!title || !content) {
      return NextResponse.json(
        { error: 'Title and content are required' },
        { status: 400 }
      );
    }

    // Create discussion in local database
    const discussion = await prisma.communityDiscussion.create({
      data: {
        title,
        content,
        category,
        discussionType,
        authorId: session.user.id,
        tags: JSON.stringify(tags),
        isPublic,
        allowReplies,
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

    // Sync to HubSpot in background
    try {
      await hubspotService.createCommunityDiscussion({
        discussionId: discussion.id,
        title,
        content,
        category,
        discussionType,
        authorId: session.user.id,
        tags,
        isPublic,
      });
    } catch (hubspotError) {
      console.error('HubSpot sync error:', hubspotError);
      // Continue - don't fail the request if HubSpot sync fails
    }

    return NextResponse.json({
      discussion: {
        ...discussion,
        replyCount: 0,
        likeCount: 0,
      },
    });
  } catch (error) {
    console.error('Error creating community discussion:', error);
    return NextResponse.json(
      { error: 'Failed to create discussion' },
      { status: 500 }
    );
  }
}
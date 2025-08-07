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
    const type = searchParams.get('type') || 'all'; // 'sent', 'received', 'all'
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search');
    const unreadOnly = searchParams.get('unreadOnly') === 'true';

    const skip = (page - 1) * limit;

    // Build where clause based on type
    let where: any = {
      isDeleted: false,
    };

    if (type === 'sent') {
      where.senderId = session.user.id;
    } else if (type === 'received') {
      where.recipientId = session.user.id;
    } else {
      // All messages (sent or received)
      where.OR = [
        { senderId: session.user.id },
        { recipientId: session.user.id },
      ];
    }

    if (unreadOnly) {
      where.isRead = false;
      where.recipientId = session.user.id; // Only received messages can be unread
    }

    if (search) {
      where.OR = [
        ...(where.OR || []),
        { subject: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Get messages with sender and recipient info
    const messages = await prisma.memberMessage.findMany({
      where,
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
            company: true,
            memberType: true,
          },
        },
        recipient: {
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
        createdAt: 'desc',
      },
      skip,
      take: limit,
    });

    // Get total count for pagination
    const totalCount = await prisma.memberMessage.count({ where });

    // Get unread count for current user
    const unreadCount = await prisma.memberMessage.count({
      where: {
        recipientId: session.user.id,
        isRead: false,
        isDeleted: false,
      },
    });

    return NextResponse.json({
      messages,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
      unreadCount,
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
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
      recipientId,
      subject,
      content,
      priority = 'NORMAL',
      threadId,
      attachments = [],
    } = body;

    // Validate required fields
    if (!recipientId || !content) {
      return NextResponse.json(
        { error: 'Recipient and content are required' },
        { status: 400 }
      );
    }

    // Check if recipient exists
    const recipient = await prisma.user.findUnique({
      where: { id: recipientId },
    });

    if (!recipient) {
      return NextResponse.json(
        { error: 'Recipient not found' },
        { status: 404 }
      );
    }

    // Create message
    const message = await prisma.memberMessage.create({
      data: {
        senderId: session.user.id,
        recipientId,
        subject,
        content,
        priority,
        threadId,
        attachments: attachments.length > 0 ? JSON.stringify(attachments) : null,
        hubspotSyncStatus: 'PENDING',
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
            company: true,
            memberType: true,
          },
        },
        recipient: {
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
      await hubspotService.createMemberMessage({
        messageId: message.id,
        senderId: session.user.id,
        recipientId,
        subject,
        content,
        priority,
        threadId,
      });
    } catch (hubspotError) {
      console.error('HubSpot sync error:', hubspotError);
    }

    return NextResponse.json({ message });
  } catch (error) {
    console.error('Error creating message:', error);
    return NextResponse.json(
      { error: 'Failed to create message' },
      { status: 500 }
    );
  }
}
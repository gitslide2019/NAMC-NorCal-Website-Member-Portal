import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(
  request: NextRequest,
  { params }: { params: { threadId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const threadId = params.threadId;

    // Get all messages in the thread where user is sender or recipient
    const messages = await prisma.memberMessage.findMany({
      where: {
        threadId,
        isDeleted: false,
        OR: [
          { senderId: session.user.id },
          { recipientId: session.user.id },
        ],
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
      orderBy: {
        createdAt: 'asc',
      },
    });

    if (messages.length === 0) {
      return NextResponse.json(
        { error: 'Thread not found or access denied' },
        { status: 404 }
      );
    }

    // Mark unread messages as read if user is the recipient
    const unreadMessageIds = messages
      .filter(msg => msg.recipientId === session.user.id && !msg.isRead)
      .map(msg => msg.id);

    if (unreadMessageIds.length > 0) {
      await prisma.memberMessage.updateMany({
        where: {
          id: { in: unreadMessageIds },
        },
        data: {
          isRead: true,
          readAt: new Date(),
        },
      });

      // Update the messages array to reflect the changes
      messages.forEach(msg => {
        if (unreadMessageIds.includes(msg.id)) {
          msg.isRead = true;
          msg.readAt = new Date();
        }
      });
    }

    return NextResponse.json({
      threadId,
      messages,
      messageCount: messages.length,
    });
  } catch (error) {
    console.error('Error fetching message thread:', error);
    return NextResponse.json(
      { error: 'Failed to fetch message thread' },
      { status: 500 }
    );
  }
}
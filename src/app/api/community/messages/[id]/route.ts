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

    const messageId = params.id;

    // Get message with sender and recipient info
    const message = await prisma.memberMessage.findUnique({
      where: { id: messageId },
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

    if (!message) {
      return NextResponse.json(
        { error: 'Message not found' },
        { status: 404 }
      );
    }

    // Check if user has access to this message
    if (
      message.senderId !== session.user.id &&
      message.recipientId !== session.user.id
    ) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Mark as read if user is the recipient and message is unread
    if (
      message.recipientId === session.user.id &&
      !message.isRead
    ) {
      await prisma.memberMessage.update({
        where: { id: messageId },
        data: {
          isRead: true,
          readAt: new Date(),
        },
      });

      // Update the message object to reflect the change
      message.isRead = true;
      message.readAt = new Date();
    }

    return NextResponse.json({ message });
  } catch (error) {
    console.error('Error fetching message:', error);
    return NextResponse.json(
      { error: 'Failed to fetch message' },
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

    const messageId = params.id;
    const body = await request.json();
    const { isArchived, isRead } = body;

    // Check if message exists and user has access
    const existingMessage = await prisma.memberMessage.findUnique({
      where: { id: messageId },
    });

    if (!existingMessage) {
      return NextResponse.json(
        { error: 'Message not found' },
        { status: 404 }
      );
    }

    if (
      existingMessage.senderId !== session.user.id &&
      existingMessage.recipientId !== session.user.id
    ) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Update message
    const updateData: any = {};
    
    if (typeof isArchived === 'boolean') {
      updateData.isArchived = isArchived;
    }
    
    if (typeof isRead === 'boolean' && existingMessage.recipientId === session.user.id) {
      updateData.isRead = isRead;
      if (isRead && !existingMessage.readAt) {
        updateData.readAt = new Date();
      }
    }

    const updatedMessage = await prisma.memberMessage.update({
      where: { id: messageId },
      data: updateData,
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

    return NextResponse.json({ message: updatedMessage });
  } catch (error) {
    console.error('Error updating message:', error);
    return NextResponse.json(
      { error: 'Failed to update message' },
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

    const messageId = params.id;

    // Check if message exists and user has access
    const existingMessage = await prisma.memberMessage.findUnique({
      where: { id: messageId },
    });

    if (!existingMessage) {
      return NextResponse.json(
        { error: 'Message not found' },
        { status: 404 }
      );
    }

    if (
      existingMessage.senderId !== session.user.id &&
      existingMessage.recipientId !== session.user.id
    ) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Soft delete by marking as deleted
    await prisma.memberMessage.update({
      where: { id: messageId },
      data: { isDeleted: true },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting message:', error);
    return NextResponse.json(
      { error: 'Failed to delete message' },
      { status: 500 }
    );
  }
}
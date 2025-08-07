import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';
import { HubSpotBackboneService } from '@/lib/services/hubspot-backbone.service';

const prisma = new PrismaClient();
const hubspotService = new HubSpotBackboneService();

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const requestId = params.id;
    const body = await request.json();
    const { action } = body; // 'ACCEPT', 'DECLINE', 'CANCEL'

    // Get the connection request
    const connectionRequest = await prisma.connectionRequest.findUnique({
      where: { id: requestId },
      include: {
        requester: {
          select: {
            id: true,
            name: true,
            email: true,
            company: true,
            memberType: true,
          },
        },
        receiver: {
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

    if (!connectionRequest) {
      return NextResponse.json(
        { error: 'Connection request not found' },
        { status: 404 }
      );
    }

    // Check permissions
    if (action === 'CANCEL' && connectionRequest.requesterId !== session.user.id) {
      return NextResponse.json(
        { error: 'Only the requester can cancel a connection request' },
        { status: 403 }
      );
    }

    if ((action === 'ACCEPT' || action === 'DECLINE') && connectionRequest.receiverId !== session.user.id) {
      return NextResponse.json(
        { error: 'Only the receiver can accept or decline a connection request' },
        { status: 403 }
      );
    }

    if (connectionRequest.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'Connection request has already been processed' },
        { status: 400 }
      );
    }

    let newStatus: string;
    switch (action) {
      case 'ACCEPT':
        newStatus = 'ACCEPTED';
        break;
      case 'DECLINE':
        newStatus = 'DECLINED';
        break;
      case 'CANCEL':
        newStatus = 'CANCELLED';
        break;
      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

    // Update connection request
    const updatedRequest = await prisma.connectionRequest.update({
      where: { id: requestId },
      data: {
        status: newStatus,
        respondedAt: new Date(),
        hubspotSyncStatus: 'PENDING',
      },
      include: {
        requester: {
          select: {
            id: true,
            name: true,
            email: true,
            company: true,
            memberType: true,
          },
        },
        receiver: {
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

    // If accepted, create the actual connection
    if (action === 'ACCEPT') {
      await prisma.memberConnection.createMany({
        data: [
          {
            fromMemberId: connectionRequest.requesterId,
            toMemberId: connectionRequest.receiverId,
            connectionType: connectionRequest.requestType,
            hubspotSyncStatus: 'PENDING',
          },
          {
            fromMemberId: connectionRequest.receiverId,
            toMemberId: connectionRequest.requesterId,
            connectionType: connectionRequest.requestType,
            hubspotSyncStatus: 'PENDING',
          },
        ],
      });

      // Update connection counts
      await prisma.memberProfile.updateMany({
        where: {
          memberId: {
            in: [connectionRequest.requesterId, connectionRequest.receiverId],
          },
        },
        data: {
          connectionCount: { increment: 1 },
        },
      });
    }

    // Sync to HubSpot in background
    try {
      await hubspotService.updateConnectionRequest(requestId, {
        status: newStatus,
        action,
        respondedBy: session.user.id,
      });
    } catch (hubspotError) {
      console.error('HubSpot sync error:', hubspotError);
    }

    return NextResponse.json({ connectionRequest: updatedRequest });
  } catch (error) {
    console.error('Error updating connection request:', error);
    return NextResponse.json(
      { error: 'Failed to update connection request' },
      { status: 500 }
    );
  }
}
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
    const status = searchParams.get('status'); // 'PENDING', 'ACCEPTED', 'DECLINED'

    let where: any = {};

    if (type === 'sent') {
      where.requesterId = session.user.id;
    } else if (type === 'received') {
      where.receiverId = session.user.id;
    } else {
      where.OR = [
        { requesterId: session.user.id },
        { receiverId: session.user.id },
      ];
    }

    if (status) {
      where.status = status;
    }

    const connectionRequests = await prisma.connectionRequest.findMany({
      where,
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
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({ connectionRequests });
  } catch (error) {
    console.error('Error fetching connection requests:', error);
    return NextResponse.json(
      { error: 'Failed to fetch connection requests' },
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
      receiverId,
      message,
      requestType = 'PROFESSIONAL',
    } = body;

    if (!receiverId) {
      return NextResponse.json(
        { error: 'Receiver ID is required' },
        { status: 400 }
      );
    }

    // Check if receiver exists
    const receiver = await prisma.user.findUnique({
      where: { id: receiverId },
    });

    if (!receiver) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if connection request already exists
    const existingRequest = await prisma.connectionRequest.findUnique({
      where: {
        requesterId_receiverId: {
          requesterId: session.user.id,
          receiverId,
        },
      },
    });

    if (existingRequest) {
      return NextResponse.json(
        { error: 'Connection request already exists' },
        { status: 400 }
      );
    }

    // Check if they are already connected
    const existingConnection = await prisma.memberConnection.findFirst({
      where: {
        OR: [
          { fromMemberId: session.user.id, toMemberId: receiverId },
          { fromMemberId: receiverId, toMemberId: session.user.id },
        ],
        isActive: true,
      },
    });

    if (existingConnection) {
      return NextResponse.json(
        { error: 'Already connected to this member' },
        { status: 400 }
      );
    }

    // Create connection request
    const connectionRequest = await prisma.connectionRequest.create({
      data: {
        requesterId: session.user.id,
        receiverId,
        message,
        requestType,
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

    // Sync to HubSpot in background
    try {
      await hubspotService.createConnectionRequest({
        requestId: connectionRequest.id,
        requesterId: session.user.id,
        receiverId,
        message,
        requestType,
      });
    } catch (hubspotError) {
      console.error('HubSpot sync error:', hubspotError);
    }

    return NextResponse.json({ connectionRequest });
  } catch (error) {
    console.error('Error creating connection request:', error);
    return NextResponse.json(
      { error: 'Failed to create connection request' },
      { status: 500 }
    );
  }
}
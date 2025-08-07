import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';
import { HubSpotBackboneService } from '@/lib/services/hubspot-backbone.service';

const prisma = new PrismaClient();

// Initialize HubSpot service
const hubspotService = new HubSpotBackboneService({
  accessToken: process.env.HUBSPOT_ACCESS_TOKEN!,
  portalId: process.env.HUBSPOT_PORTAL_ID
});

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const toolId = searchParams.get('toolId');
    const memberId = searchParams.get('memberId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    // Build filter conditions
    const where: any = {};

    // Non-admin users can only see their own reservations
    if (user.memberType !== 'ADMIN') {
      where.memberId = user.id;
    } else if (memberId) {
      where.memberId = memberId;
    }

    if (status) {
      where.status = status.toUpperCase();
    }

    if (toolId) {
      where.toolId = toolId;
    }

    // Get reservations with related data
    const [reservations, totalCount] = await Promise.all([
      prisma.toolReservation.findMany({
        where,
        include: {
          tool: {
            select: {
              id: true,
              name: true,
              category: true,
              dailyRate: true,
              condition: true,
              imageUrl: true
            }
          },
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              company: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit
      }),
      prisma.toolReservation.count({ where })
    ]);

    return NextResponse.json({
      reservations,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit)
      }
    });

  } catch (error: any) {
    console.error('Error fetching reservations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reservations' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await request.json();
    const { toolId, startDate, endDate, notes } = body;

    // Validate required fields
    if (!toolId || !startDate || !endDate) {
      return NextResponse.json(
        { error: 'Tool ID, start date, and end date are required' },
        { status: 400 }
      );
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    // Validate dates
    if (start >= end) {
      return NextResponse.json(
        { error: 'End date must be after start date' },
        { status: 400 }
      );
    }

    if (start < new Date()) {
      return NextResponse.json(
        { error: 'Start date cannot be in the past' },
        { status: 400 }
      );
    }

    // Check if tool exists and is available
    const tool = await prisma.tool.findUnique({
      where: { id: toolId },
      include: {
        reservations: {
          where: {
            status: {
              in: ['PENDING', 'CONFIRMED', 'CHECKED_OUT']
            },
            OR: [
              {
                AND: [
                  { startDate: { lte: end } },
                  { endDate: { gte: start } }
                ]
              }
            ]
          }
        },
        maintenanceRecords: {
          where: {
            status: {
              in: ['SCHEDULED', 'IN_PROGRESS']
            },
            OR: [
              {
                AND: [
                  { scheduledDate: { lte: end } },
                  { 
                    OR: [
                      { completedDate: { gte: start } },
                      { completedDate: null }
                    ]
                  }
                ]
              }
            ]
          }
        }
      }
    });

    if (!tool) {
      return NextResponse.json(
        { error: 'Tool not found' },
        { status: 404 }
      );
    }

    if (!tool.isAvailable) {
      return NextResponse.json(
        { error: 'Tool is not available for rental' },
        { status: 400 }
      );
    }

    // Check for conflicts
    if (tool.reservations.length > 0) {
      return NextResponse.json(
        { error: 'Tool is already reserved during this period' },
        { status: 409 }
      );
    }

    if (tool.maintenanceRecords.length > 0) {
      return NextResponse.json(
        { error: 'Tool has scheduled maintenance during this period' },
        { status: 409 }
      );
    }

    // Calculate cost
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const totalCost = days * tool.dailyRate;

    // Create reservation in local database
    const reservation = await prisma.toolReservation.create({
      data: {
        toolId,
        memberId: user.id,
        startDate: start,
        endDate: end,
        status: 'PENDING',
        totalCost,
        notes
      },
      include: {
        tool: {
          select: {
            id: true,
            name: true,
            category: true,
            dailyRate: true,
            condition: true,
            imageUrl: true
          }
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            company: true
          }
        }
      }
    });

    // Sync to HubSpot
    try {
      const hubspotReservation = await hubspotService.createToolReservation({
        memberId: user.hubspotContactId || user.id,
        toolId: tool.hubspotObjectId || tool.id,
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        totalCost,
        status: 'pending'
      });

      // Update local record with HubSpot ID
      await prisma.toolReservation.update({
        where: { id: reservation.id },
        data: {
          hubspotObjectId: hubspotReservation.id,
          hubspotSyncStatus: 'SYNCED',
          hubspotLastSync: new Date()
        }
      });
    } catch (hubspotError) {
      console.error('HubSpot sync error:', hubspotError);
      // Update sync status but don't fail the request
      await prisma.toolReservation.update({
        where: { id: reservation.id },
        data: {
          hubspotSyncStatus: 'ERROR',
          hubspotSyncError: (hubspotError as Error).message
        }
      });
    }

    return NextResponse.json(reservation, { status: 201 });

  } catch (error: any) {
    console.error('Error creating reservation:', error);
    return NextResponse.json(
      { error: 'Failed to create reservation' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await request.json();
    const { id, status, checkoutCondition, returnCondition, notes } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Reservation ID is required' },
        { status: 400 }
      );
    }

    // Get existing reservation
    const existingReservation = await prisma.toolReservation.findUnique({
      where: { id },
      include: { tool: true }
    });

    if (!existingReservation) {
      return NextResponse.json(
        { error: 'Reservation not found' },
        { status: 404 }
      );
    }

    // Check permissions
    const canUpdate = user.memberType === 'ADMIN' || existingReservation.memberId === user.id;
    if (!canUpdate) {
      return NextResponse.json(
        { error: 'Permission denied' },
        { status: 403 }
      );
    }

    // Validate status transitions
    const validTransitions: Record<string, string[]> = {
      'PENDING': ['CONFIRMED', 'CANCELLED'],
      'CONFIRMED': ['CHECKED_OUT', 'CANCELLED'],
      'CHECKED_OUT': ['RETURNED'],
      'RETURNED': [], // Final state
      'CANCELLED': [] // Final state
    };

    if (status && !validTransitions[existingReservation.status]?.includes(status)) {
      return NextResponse.json(
        { error: `Cannot transition from ${existingReservation.status} to ${status}` },
        { status: 400 }
      );
    }

    // Calculate late fees if returning late
    let lateFees = existingReservation.lateFees;
    if (status === 'RETURNED' && new Date() > existingReservation.endDate) {
      const daysLate = Math.ceil((new Date().getTime() - existingReservation.endDate.getTime()) / (1000 * 60 * 60 * 24));
      lateFees = daysLate * existingReservation.tool.dailyRate * 0.5; // 50% of daily rate as late fee
    }

    // Update reservation
    const updatedReservation = await prisma.toolReservation.update({
      where: { id },
      data: {
        status: status || existingReservation.status,
        checkoutCondition: checkoutCondition || existingReservation.checkoutCondition,
        returnCondition: returnCondition || existingReservation.returnCondition,
        notes: notes || existingReservation.notes,
        lateFees,
        updatedAt: new Date()
      },
      include: {
        tool: {
          select: {
            id: true,
            name: true,
            category: true,
            dailyRate: true,
            condition: true,
            imageUrl: true
          }
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            company: true
          }
        }
      }
    });

    // Sync to HubSpot if we have the HubSpot ID
    if (existingReservation.hubspotObjectId) {
      try {
        const hubspotUpdates: any = {};
        if (status) hubspotUpdates.status = status.toLowerCase();
        if (checkoutCondition) hubspotUpdates.checkout_condition = checkoutCondition;
        if (returnCondition) hubspotUpdates.return_condition = returnCondition;

        await hubspotService.updateToolReservation(existingReservation.hubspotObjectId, hubspotUpdates);

        // Update sync status
        await prisma.toolReservation.update({
          where: { id },
          data: {
            hubspotSyncStatus: 'SYNCED',
            hubspotLastSync: new Date()
          }
        });
      } catch (hubspotError) {
        console.error('HubSpot sync error:', hubspotError);
        await prisma.toolReservation.update({
          where: { id },
          data: {
            hubspotSyncStatus: 'ERROR',
            hubspotSyncError: (hubspotError as Error).message
          }
        });
      }
    }

    return NextResponse.json(updatedReservation);

  } catch (error: any) {
    console.error('Error updating reservation:', error);
    return NextResponse.json(
      { error: 'Failed to update reservation' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Reservation ID is required' },
        { status: 400 }
      );
    }

    // Get existing reservation
    const reservation = await prisma.toolReservation.findUnique({
      where: { id }
    });

    if (!reservation) {
      return NextResponse.json(
        { error: 'Reservation not found' },
        { status: 404 }
      );
    }

    // Check permissions
    const canDelete = user.memberType === 'ADMIN' || reservation.memberId === user.id;
    if (!canDelete) {
      return NextResponse.json(
        { error: 'Permission denied' },
        { status: 403 }
      );
    }

    // Only allow deletion of pending or cancelled reservations
    if (!['PENDING', 'CANCELLED'].includes(reservation.status)) {
      return NextResponse.json(
        { error: 'Can only delete pending or cancelled reservations' },
        { status: 400 }
      );
    }

    // Delete from HubSpot if synced
    if (reservation.hubspotObjectId) {
      try {
        await hubspotService.deleteCustomObject('tool_reservations', reservation.hubspotObjectId);
      } catch (hubspotError) {
        console.error('HubSpot deletion error:', hubspotError);
        // Continue with local deletion even if HubSpot fails
      }
    }

    // Delete from local database
    await prisma.toolReservation.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('Error deleting reservation:', error);
    return NextResponse.json(
      { error: 'Failed to delete reservation' },
      { status: 500 }
    );
  }
}
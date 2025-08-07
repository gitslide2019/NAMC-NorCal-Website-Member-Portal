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

    // Only admin or staff can perform checkout
    if (!['ADMIN'].includes(user.memberType)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { reservationId, checkoutCondition, staffNotes, actualStartDate } = body;

    if (!reservationId || !checkoutCondition) {
      return NextResponse.json(
        { error: 'Reservation ID and checkout condition are required' },
        { status: 400 }
      );
    }

    // Get reservation with related data
    const reservation = await prisma.toolReservation.findUnique({
      where: { id: reservationId },
      include: {
        tool: true,
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

    if (!reservation) {
      return NextResponse.json(
        { error: 'Reservation not found' },
        { status: 404 }
      );
    }

    // Validate reservation status
    if (reservation.status !== 'CONFIRMED') {
      return NextResponse.json(
        { error: 'Only confirmed reservations can be checked out' },
        { status: 400 }
      );
    }

    // Check if checkout is within reasonable time frame
    const today = new Date();
    const reservationStart = new Date(reservation.startDate);
    const daysDifference = Math.abs((today.getTime() - reservationStart.getTime()) / (1000 * 60 * 60 * 24));

    if (daysDifference > 2) {
      return NextResponse.json(
        { error: 'Checkout is too far from reservation start date' },
        { status: 400 }
      );
    }

    // Update reservation to checked out status
    const updatedReservation = await prisma.toolReservation.update({
      where: { id: reservationId },
      data: {
        status: 'CHECKED_OUT',
        checkoutCondition,
        notes: staffNotes ? `${reservation.notes || ''}\n\nCheckout Notes: ${staffNotes}` : reservation.notes,
        startDate: actualStartDate ? new Date(actualStartDate) : reservation.startDate,
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

    // Update tool availability if needed
    await prisma.tool.update({
      where: { id: reservation.toolId },
      data: {
        condition: checkoutCondition,
        updatedAt: new Date()
      }
    });

    // Sync to HubSpot
    if (reservation.hubspotObjectId) {
      try {
        await hubspotService.updateToolReservation(reservation.hubspotObjectId, {
          status: 'active',
          checkoutCondition
        });

        // Update sync status
        await prisma.toolReservation.update({
          where: { id: reservationId },
          data: {
            hubspotSyncStatus: 'SYNCED',
            hubspotLastSync: new Date()
          }
        });

        // Trigger HubSpot workflow for checkout
        await hubspotService.triggerWorkflow('tool_checked_out', reservation.hubspotObjectId);
      } catch (hubspotError) {
        console.error('HubSpot sync error:', hubspotError);
        await prisma.toolReservation.update({
          where: { id: reservationId },
          data: {
            hubspotSyncStatus: 'ERROR',
            hubspotSyncError: (hubspotError as Error).message
          }
        });
      }
    }

    return NextResponse.json({
      success: true,
      reservation: updatedReservation,
      message: `Tool "${reservation.tool.name}" successfully checked out to ${reservation.user.name}`
    });

  } catch (error: any) {
    console.error('Error checking out tool:', error);
    return NextResponse.json(
      { error: 'Failed to check out tool' },
      { status: 500 }
    );
  }
}
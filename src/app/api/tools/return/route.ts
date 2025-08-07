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

    // Only admin or staff can perform returns
    if (!['ADMIN'].includes(user.memberType)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { reservationId, returnCondition, staffNotes, actualReturnDate, damageAssessment } = body;

    if (!reservationId || !returnCondition) {
      return NextResponse.json(
        { error: 'Reservation ID and return condition are required' },
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
    if (reservation.status !== 'CHECKED_OUT') {
      return NextResponse.json(
        { error: 'Only checked out tools can be returned' },
        { status: 400 }
      );
    }

    const returnDate = actualReturnDate ? new Date(actualReturnDate) : new Date();
    const originalEndDate = new Date(reservation.endDate);

    // Calculate late fees if applicable
    let lateFees = 0;
    let isLate = false;
    if (returnDate > originalEndDate) {
      isLate = true;
      const daysLate = Math.ceil((returnDate.getTime() - originalEndDate.getTime()) / (1000 * 60 * 60 * 24));
      lateFees = daysLate * reservation.tool.dailyRate * 0.5; // 50% of daily rate as late fee
    }

    // Determine if tool needs maintenance based on condition
    const needsMaintenance = ['FAIR', 'NEEDS_REPAIR'].includes(returnCondition) || 
                            damageAssessment?.requiresMaintenance;

    // Update reservation to returned status
    const updatedReservation = await prisma.toolReservation.update({
      where: { id: reservationId },
      data: {
        status: 'RETURNED',
        returnCondition,
        lateFees,
        notes: staffNotes ? `${reservation.notes || ''}\n\nReturn Notes: ${staffNotes}` : reservation.notes,
        endDate: returnDate > originalEndDate ? returnDate : reservation.endDate,
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

    // Update tool condition and availability
    await prisma.tool.update({
      where: { id: reservation.toolId },
      data: {
        condition: returnCondition,
        isAvailable: !needsMaintenance, // Make unavailable if needs maintenance
        updatedAt: new Date()
      }
    });

    // Create maintenance record if needed
    let maintenanceRecord = null;
    if (needsMaintenance) {
      maintenanceRecord = await prisma.toolMaintenance.create({
        data: {
          toolId: reservation.toolId,
          maintenanceType: damageAssessment?.type || 'INSPECTION',
          description: damageAssessment?.description || `Tool returned in ${returnCondition} condition, requires inspection`,
          status: 'SCHEDULED',
          scheduledDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Schedule for tomorrow
          notes: `Triggered by return from reservation ${reservationId}. ${staffNotes || ''}`
        }
      });
    }

    // Sync to HubSpot
    if (reservation.hubspotObjectId) {
      try {
        await hubspotService.updateToolReservation(reservation.hubspotObjectId, {
          status: 'completed',
          returnCondition
        });

        // Update sync status
        await prisma.toolReservation.update({
          where: { id: reservationId },
          data: {
            hubspotSyncStatus: 'SYNCED',
            hubspotLastSync: new Date()
          }
        });

        // Trigger HubSpot workflow for return
        await hubspotService.triggerWorkflow('tool_returned', reservation.hubspotObjectId);

        // If late, trigger late return workflow
        if (isLate) {
          await hubspotService.triggerWorkflow('tool_returned_late', reservation.hubspotObjectId);
        }
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
      lateFees,
      isLate,
      maintenanceScheduled: !!maintenanceRecord,
      maintenanceRecord,
      message: `Tool "${reservation.tool.name}" successfully returned${isLate ? ' (LATE)' : ''}${needsMaintenance ? ' - Maintenance scheduled' : ''}`
    });

  } catch (error: any) {
    console.error('Error returning tool:', error);
    return NextResponse.json(
      { error: 'Failed to return tool' },
      { status: 500 }
    );
  }
}
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

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const toolId = searchParams.get('toolId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    // Build filter conditions
    const where: any = {};
    
    if (status) {
      where.status = status.toUpperCase();
    }
    
    if (toolId) {
      where.toolId = toolId;
    }

    // Get maintenance records with related data
    const [maintenance, totalCount] = await Promise.all([
      prisma.toolMaintenance.findMany({
        where,
        include: {
          tool: {
            select: {
              id: true,
              name: true,
              category: true,
              condition: true,
              serialNumber: true
            }
          }
        },
        orderBy: { scheduledDate: 'desc' },
        skip: offset,
        take: limit
      }),
      prisma.toolMaintenance.count({ where })
    ]);

    return NextResponse.json({
      maintenance,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit)
      }
    });

  } catch (error: any) {
    console.error('Error fetching maintenance records:', error);
    return NextResponse.json(
      { error: 'Failed to fetch maintenance records' },
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

    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user || user.memberType !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const {
      toolId,
      maintenanceType,
      description,
      cost,
      performedBy,
      scheduledDate,
      notes
    } = body;

    // Validate required fields
    if (!toolId || !maintenanceType || !description) {
      return NextResponse.json(
        { error: 'Tool ID, maintenance type, and description are required' },
        { status: 400 }
      );
    }

    // Verify tool exists
    const tool = await prisma.tool.findUnique({
      where: { id: toolId }
    });

    if (!tool) {
      return NextResponse.json(
        { error: 'Tool not found' },
        { status: 404 }
      );
    }

    // Create maintenance record
    const maintenance = await prisma.toolMaintenance.create({
      data: {
        toolId,
        maintenanceType: maintenanceType.toUpperCase(),
        description,
        cost: cost ? parseFloat(cost) : null,
        performedBy,
        scheduledDate: scheduledDate ? new Date(scheduledDate) : new Date(),
        status: 'SCHEDULED',
        notes
      },
      include: {
        tool: {
          select: {
            id: true,
            name: true,
            category: true,
            condition: true,
            serialNumber: true
          }
        }
      }
    });

    // If maintenance is scheduled, make tool unavailable
    if (maintenance.status === 'SCHEDULED') {
      await prisma.tool.update({
        where: { id: toolId },
        data: { isAvailable: false }
      });
    }

    // Sync to HubSpot (if we had maintenance custom objects)
    try {
      // This would sync to HubSpot maintenance custom objects
      console.log('Maintenance record created:', maintenance.id);
    } catch (hubspotError) {
      console.error('HubSpot sync error:', hubspotError);
    }

    return NextResponse.json(maintenance, { status: 201 });

  } catch (error: any) {
    console.error('Error creating maintenance record:', error);
    return NextResponse.json(
      { error: 'Failed to create maintenance record' },
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

    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user || user.memberType !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { id, status, cost, performedBy, completedDate, notes } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Maintenance record ID is required' },
        { status: 400 }
      );
    }

    // Get existing maintenance record
    const existingMaintenance = await prisma.toolMaintenance.findUnique({
      where: { id },
      include: { tool: true }
    });

    if (!existingMaintenance) {
      return NextResponse.json(
        { error: 'Maintenance record not found' },
        { status: 404 }
      );
    }

    // Validate status transitions
    const validTransitions: Record<string, string[]> = {
      'SCHEDULED': ['IN_PROGRESS', 'CANCELLED'],
      'IN_PROGRESS': ['COMPLETED', 'CANCELLED'],
      'COMPLETED': [], // Final state
      'CANCELLED': [] // Final state
    };

    if (status && !validTransitions[existingMaintenance.status]?.includes(status)) {
      return NextResponse.json(
        { error: `Cannot transition from ${existingMaintenance.status} to ${status}` },
        { status: 400 }
      );
    }

    // Update maintenance record
    const updatedMaintenance = await prisma.toolMaintenance.update({
      where: { id },
      data: {
        status: status || existingMaintenance.status,
        cost: cost !== undefined ? (cost ? parseFloat(cost) : null) : existingMaintenance.cost,
        performedBy: performedBy || existingMaintenance.performedBy,
        completedDate: completedDate ? new Date(completedDate) : 
                      (status === 'COMPLETED' ? new Date() : existingMaintenance.completedDate),
        notes: notes || existingMaintenance.notes,
        updatedAt: new Date()
      },
      include: {
        tool: {
          select: {
            id: true,
            name: true,
            category: true,
            condition: true,
            serialNumber: true
          }
        }
      }
    });

    // Update tool availability based on maintenance status
    if (status === 'COMPLETED' || status === 'CANCELLED') {
      // Check if there are other active maintenance records for this tool
      const otherActiveMaintenance = await prisma.toolMaintenance.count({
        where: {
          toolId: existingMaintenance.toolId,
          id: { not: id },
          status: { in: ['SCHEDULED', 'IN_PROGRESS'] }
        }
      });

      // If no other active maintenance, make tool available
      if (otherActiveMaintenance === 0) {
        await prisma.tool.update({
          where: { id: existingMaintenance.toolId },
          data: { isAvailable: true }
        });
      }
    }

    return NextResponse.json(updatedMaintenance);

  } catch (error: any) {
    console.error('Error updating maintenance record:', error);
    return NextResponse.json(
      { error: 'Failed to update maintenance record' },
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

    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user || user.memberType !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Maintenance record ID is required' },
        { status: 400 }
      );
    }

    // Get maintenance record
    const maintenance = await prisma.toolMaintenance.findUnique({
      where: { id }
    });

    if (!maintenance) {
      return NextResponse.json(
        { error: 'Maintenance record not found' },
        { status: 404 }
      );
    }

    // Only allow deletion of scheduled or cancelled maintenance
    if (!['SCHEDULED', 'CANCELLED'].includes(maintenance.status)) {
      return NextResponse.json(
        { error: 'Can only delete scheduled or cancelled maintenance records' },
        { status: 400 }
      );
    }

    // Delete maintenance record
    await prisma.toolMaintenance.delete({
      where: { id }
    });

    // Check if tool should be made available again
    const otherActiveMaintenance = await prisma.toolMaintenance.count({
      where: {
        toolId: maintenance.toolId,
        status: { in: ['SCHEDULED', 'IN_PROGRESS'] }
      }
    });

    if (otherActiveMaintenance === 0) {
      await prisma.tool.update({
        where: { id: maintenance.toolId },
        data: { isAvailable: true }
      });
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('Error deleting maintenance record:', error);
    return NextResponse.json(
      { error: 'Failed to delete maintenance record' },
      { status: 500 }
    );
  }
}
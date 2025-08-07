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
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const available = searchParams.get('available');
    const location = searchParams.get('location');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    // Build filter conditions
    const where: any = {};
    
    if (category) {
      where.category = category;
    }
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { manufacturer: { contains: search, mode: 'insensitive' } },
        { model: { contains: search, mode: 'insensitive' } }
      ];
    }
    
    if (available === 'true') {
      where.isAvailable = true;
    }
    
    if (location) {
      where.location = { contains: location, mode: 'insensitive' };
    }

    // Get tools from local database (cache)
    const [tools, totalCount] = await Promise.all([
      prisma.tool.findMany({
        where,
        include: {
          reservations: {
            where: {
              status: {
                in: ['PENDING', 'CONFIRMED', 'CHECKED_OUT']
              }
            },
            orderBy: { startDate: 'asc' }
          },
          maintenanceRecords: {
            where: {
              status: {
                in: ['SCHEDULED', 'IN_PROGRESS']
              }
            },
            orderBy: { scheduledDate: 'asc' }
          }
        },
        orderBy: { name: 'asc' },
        skip: offset,
        take: limit
      }),
      prisma.tool.count({ where })
    ]);

    // Calculate availability for each tool
    const toolsWithAvailability = tools.map(tool => {
      const activeReservations = tool.reservations.filter(res => 
        res.status === 'CONFIRMED' || res.status === 'CHECKED_OUT'
      );
      
      const upcomingMaintenance = tool.maintenanceRecords.filter(maint => 
        maint.status === 'SCHEDULED' || maint.status === 'IN_PROGRESS'
      );

      return {
        ...tool,
        activeReservations: activeReservations.length,
        upcomingMaintenance: upcomingMaintenance.length,
        nextAvailableDate: activeReservations.length > 0 
          ? activeReservations[activeReservations.length - 1].endDate 
          : null,
        maintenanceScheduled: upcomingMaintenance.length > 0 
          ? upcomingMaintenance[0].scheduledDate 
          : null
      };
    });

    return NextResponse.json({
      tools: toolsWithAvailability,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit)
      }
    });

  } catch (error: any) {
    console.error('Error fetching tools:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tools' },
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
      name,
      category,
      description,
      serialNumber,
      manufacturer,
      model,
      dailyRate,
      condition,
      location,
      requiresTraining,
      imageUrl,
      specifications
    } = body;

    // Validate required fields
    if (!name || !category || !dailyRate) {
      return NextResponse.json(
        { error: 'Name, category, and daily rate are required' },
        { status: 400 }
      );
    }

    // Create tool in local database
    const tool = await prisma.tool.create({
      data: {
        name,
        category,
        description,
        serialNumber,
        manufacturer,
        model,
        dailyRate: parseFloat(dailyRate),
        condition: condition || 'GOOD',
        location,
        requiresTraining: requiresTraining || false,
        imageUrl,
        specifications: specifications ? JSON.stringify(specifications) : null,
        isAvailable: true
      }
    });

    // Sync to HubSpot
    try {
      const hubspotTool = await hubspotService.createCustomObject('tools', {
        tool_name: name,
        category: category.toLowerCase().replace(/\s+/g, '_'),
        daily_rate: dailyRate,
        condition: condition?.toLowerCase() || 'good',
        serial_number: serialNumber || '',
        location: location || '',
        is_available: true
      });

      // Update local record with HubSpot ID
      await prisma.tool.update({
        where: { id: tool.id },
        data: {
          hubspotObjectId: hubspotTool.id,
          hubspotSyncStatus: 'SYNCED',
          hubspotLastSync: new Date()
        }
      });
    } catch (hubspotError) {
      console.error('HubSpot sync error:', hubspotError);
      // Update sync status but don't fail the request
      await prisma.tool.update({
        where: { id: tool.id },
        data: {
          hubspotSyncStatus: 'ERROR',
          hubspotSyncError: (hubspotError as Error).message
        }
      });
    }

    return NextResponse.json(tool, { status: 201 });

  } catch (error: any) {
    console.error('Error creating tool:', error);
    return NextResponse.json(
      { error: 'Failed to create tool' },
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
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Tool ID is required' },
        { status: 400 }
      );
    }

    // Update tool in local database
    const tool = await prisma.tool.update({
      where: { id },
      data: {
        ...updates,
        dailyRate: updates.dailyRate ? parseFloat(updates.dailyRate) : undefined,
        specifications: updates.specifications ? JSON.stringify(updates.specifications) : undefined,
        updatedAt: new Date()
      }
    });

    // Sync to HubSpot if we have the HubSpot ID
    if (tool.hubspotObjectId) {
      try {
        const hubspotUpdates: any = {};
        if (updates.name) hubspotUpdates.tool_name = updates.name;
        if (updates.category) hubspotUpdates.category = updates.category.toLowerCase().replace(/\s+/g, '_');
        if (updates.dailyRate) hubspotUpdates.daily_rate = updates.dailyRate;
        if (updates.condition) hubspotUpdates.condition = updates.condition.toLowerCase();
        if (updates.serialNumber !== undefined) hubspotUpdates.serial_number = updates.serialNumber || '';
        if (updates.location !== undefined) hubspotUpdates.location = updates.location || '';
        if (updates.isAvailable !== undefined) hubspotUpdates.is_available = updates.isAvailable;

        await hubspotService.updateCustomObject('tools', tool.hubspotObjectId, hubspotUpdates);

        // Update sync status
        await prisma.tool.update({
          where: { id },
          data: {
            hubspotSyncStatus: 'SYNCED',
            hubspotLastSync: new Date()
          }
        });
      } catch (hubspotError) {
        console.error('HubSpot sync error:', hubspotError);
        await prisma.tool.update({
          where: { id },
          data: {
            hubspotSyncStatus: 'ERROR',
            hubspotSyncError: (hubspotError as Error).message
          }
        });
      }
    }

    return NextResponse.json(tool);

  } catch (error: any) {
    console.error('Error updating tool:', error);
    return NextResponse.json(
      { error: 'Failed to update tool' },
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
        { error: 'Tool ID is required' },
        { status: 400 }
      );
    }

    // Get tool to check for HubSpot ID
    const tool = await prisma.tool.findUnique({
      where: { id },
      include: {
        reservations: {
          where: {
            status: {
              in: ['PENDING', 'CONFIRMED', 'CHECKED_OUT']
            }
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

    // Check if tool has active reservations
    if (tool.reservations.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete tool with active reservations' },
        { status: 400 }
      );
    }

    // Delete from HubSpot if synced
    if (tool.hubspotObjectId) {
      try {
        await hubspotService.deleteCustomObject('tools', tool.hubspotObjectId);
      } catch (hubspotError) {
        console.error('HubSpot deletion error:', hubspotError);
        // Continue with local deletion even if HubSpot fails
      }
    }

    // Delete from local database
    await prisma.tool.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('Error deleting tool:', error);
    return NextResponse.json(
      { error: 'Failed to delete tool' },
      { status: 500 }
    );
  }
}
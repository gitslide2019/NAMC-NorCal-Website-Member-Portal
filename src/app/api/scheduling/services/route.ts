import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { hubspotSchedulingService } from '@/lib/services/hubspot-scheduling.service';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const contractorId = searchParams.get('contractorId') || session.user.id;

    // If requesting another contractor's services, allow public access
    const services = await prisma.scheduleService.findMany({
      where: { 
        contractorId,
        isActive: true
      },
      include: {
        contractor: {
          select: {
            id: true,
            name: true,
            company: true
          }
        }
      },
      orderBy: {
        serviceName: 'asc'
      }
    });

    // Parse JSON fields
    const servicesData = services.map(service => ({
      ...service,
      requirements: service.requirements ? JSON.parse(service.requirements) : []
    }));

    return NextResponse.json(servicesData);
  } catch (error) {
    console.error('Error fetching schedule services:', error);
    return NextResponse.json(
      { error: 'Failed to fetch services' },
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
    
    // Validate required fields
    if (!body.serviceName || !body.duration || !body.price) {
      return NextResponse.json(
        { error: 'Service name, duration, and price are required' },
        { status: 400 }
      );
    }

    // Validate duration is positive
    if (body.duration <= 0) {
      return NextResponse.json(
        { error: 'Duration must be greater than 0' },
        { status: 400 }
      );
    }

    // Validate price is positive
    if (body.price <= 0) {
      return NextResponse.json(
        { error: 'Price must be greater than 0' },
        { status: 400 }
      );
    }

    const serviceData = {
      contractorId: session.user.id,
      serviceName: body.serviceName,
      description: body.description,
      duration: body.duration,
      price: body.price,
      depositRequired: body.depositRequired ?? true,
      depositAmount: body.depositAmount,
      preparationTime: body.preparationTime || 0,
      cleanupTime: body.cleanupTime || 0,
      category: body.category,
      requirements: body.requirements || []
    };

    const service = await hubspotSchedulingService.createScheduleService(serviceData);

    return NextResponse.json(service, { status: 201 });
  } catch (error) {
    console.error('Error creating schedule service:', error);
    return NextResponse.json(
      { error: 'Failed to create service' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { serviceId, ...updates } = body;
    
    if (!serviceId) {
      return NextResponse.json(
        { error: 'Service ID is required' },
        { status: 400 }
      );
    }

    // Verify service belongs to the contractor
    const existingService = await prisma.scheduleService.findFirst({
      where: {
        id: serviceId,
        contractorId: session.user.id
      }
    });

    if (!existingService) {
      return NextResponse.json(
        { error: 'Service not found' },
        { status: 404 }
      );
    }

    // Validate updates
    if (updates.duration !== undefined && updates.duration <= 0) {
      return NextResponse.json(
        { error: 'Duration must be greater than 0' },
        { status: 400 }
      );
    }

    if (updates.price !== undefined && updates.price <= 0) {
      return NextResponse.json(
        { error: 'Price must be greater than 0' },
        { status: 400 }
      );
    }

    const service = await prisma.scheduleService.update({
      where: { id: serviceId },
      data: {
        ...(updates.serviceName && { serviceName: updates.serviceName }),
        ...(updates.description !== undefined && { description: updates.description }),
        ...(updates.duration !== undefined && { duration: updates.duration }),
        ...(updates.price !== undefined && { price: updates.price }),
        ...(updates.depositRequired !== undefined && { depositRequired: updates.depositRequired }),
        ...(updates.depositAmount !== undefined && { depositAmount: updates.depositAmount }),
        ...(updates.preparationTime !== undefined && { preparationTime: updates.preparationTime }),
        ...(updates.cleanupTime !== undefined && { cleanupTime: updates.cleanupTime }),
        ...(updates.category !== undefined && { category: updates.category }),
        ...(updates.requirements !== undefined && { requirements: JSON.stringify(updates.requirements) }),
        ...(updates.isActive !== undefined && { isActive: updates.isActive }),
        hubspotSyncStatus: 'PENDING'
      }
    });

    return NextResponse.json(service);
  } catch (error) {
    console.error('Error updating schedule service:', error);
    return NextResponse.json(
      { error: 'Failed to update service' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const serviceId = searchParams.get('serviceId');
    
    if (!serviceId) {
      return NextResponse.json(
        { error: 'Service ID is required' },
        { status: 400 }
      );
    }

    // Verify service belongs to the contractor
    const existingService = await prisma.scheduleService.findFirst({
      where: {
        id: serviceId,
        contractorId: session.user.id
      }
    });

    if (!existingService) {
      return NextResponse.json(
        { error: 'Service not found' },
        { status: 404 }
      );
    }

    // Check if service has active appointments
    const activeAppointments = await prisma.appointment.findMany({
      where: {
        serviceId,
        status: {
          in: ['SCHEDULED', 'CONFIRMED']
        }
      }
    });

    if (activeAppointments.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete service with active appointments' },
        { status: 409 }
      );
    }

    // Soft delete by setting isActive to false
    await prisma.scheduleService.update({
      where: { id: serviceId },
      data: { 
        isActive: false,
        hubspotSyncStatus: 'PENDING'
      }
    });

    return NextResponse.json({ message: 'Service deleted successfully' });
  } catch (error) {
    console.error('Error deleting schedule service:', error);
    return NextResponse.json(
      { error: 'Failed to delete service' },
      { status: 500 }
    );
  }
}
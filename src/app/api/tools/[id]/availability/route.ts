import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface RouteParams {
  params: {
    id: string;
  };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const months = parseInt(searchParams.get('months') || '3');

    // Get tool with reservations and maintenance
    const tool = await prisma.tool.findUnique({
      where: { id },
      include: {
        reservations: {
          where: {
            status: {
              in: ['PENDING', 'CONFIRMED', 'CHECKED_OUT']
            },
            OR: [
              {
                startDate: {
                  gte: startDate ? new Date(startDate) : new Date(),
                  lte: endDate ? new Date(endDate) : new Date(Date.now() + months * 30 * 24 * 60 * 60 * 1000)
                }
              },
              {
                endDate: {
                  gte: startDate ? new Date(startDate) : new Date(),
                  lte: endDate ? new Date(endDate) : new Date(Date.now() + months * 30 * 24 * 60 * 60 * 1000)
                }
              },
              {
                AND: [
                  {
                    startDate: {
                      lte: startDate ? new Date(startDate) : new Date()
                    }
                  },
                  {
                    endDate: {
                      gte: endDate ? new Date(endDate) : new Date(Date.now() + months * 30 * 24 * 60 * 60 * 1000)
                    }
                  }
                ]
              }
            ]
          },
          orderBy: { startDate: 'asc' },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        },
        maintenanceRecords: {
          where: {
            status: {
              in: ['SCHEDULED', 'IN_PROGRESS']
            },
            OR: [
              {
                scheduledDate: {
                  gte: startDate ? new Date(startDate) : new Date(),
                  lte: endDate ? new Date(endDate) : new Date(Date.now() + months * 30 * 24 * 60 * 60 * 1000)
                }
              },
              {
                completedDate: {
                  gte: startDate ? new Date(startDate) : new Date(),
                  lte: endDate ? new Date(endDate) : new Date(Date.now() + months * 30 * 24 * 60 * 60 * 1000)
                }
              }
            ]
          },
          orderBy: { scheduledDate: 'asc' }
        }
      }
    });

    if (!tool) {
      return NextResponse.json(
        { error: 'Tool not found' },
        { status: 404 }
      );
    }

    // Generate availability calendar
    const calendar = generateAvailabilityCalendar(
      tool,
      startDate ? new Date(startDate) : new Date(),
      endDate ? new Date(endDate) : new Date(Date.now() + months * 30 * 24 * 60 * 60 * 1000)
    );

    return NextResponse.json({
      tool: {
        id: tool.id,
        name: tool.name,
        category: tool.category,
        dailyRate: tool.dailyRate,
        condition: tool.condition,
        isAvailable: tool.isAvailable,
        requiresTraining: tool.requiresTraining
      },
      availability: calendar,
      reservations: tool.reservations.map(res => ({
        id: res.id,
        startDate: res.startDate,
        endDate: res.endDate,
        status: res.status,
        member: res.user ? {
          name: res.user.name,
          email: res.user.email
        } : null
      })),
      maintenance: tool.maintenanceRecords.map(maint => ({
        id: maint.id,
        type: maint.maintenanceType,
        description: maint.description,
        scheduledDate: maint.scheduledDate,
        status: maint.status
      }))
    });

  } catch (error: any) {
    console.error('Error fetching tool availability:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tool availability' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    const body = await request.json();
    const { startDate, endDate } = body;

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'Start date and end date are required' },
        { status: 400 }
      );
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

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
      where: { id },
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
    const conflicts = [];

    if (tool.reservations.length > 0) {
      conflicts.push({
        type: 'reservation',
        message: 'Tool is already reserved during this period',
        conflictingReservations: tool.reservations.map(res => ({
          id: res.id,
          startDate: res.startDate,
          endDate: res.endDate,
          status: res.status
        }))
      });
    }

    if (tool.maintenanceRecords.length > 0) {
      conflicts.push({
        type: 'maintenance',
        message: 'Tool has scheduled maintenance during this period',
        conflictingMaintenance: tool.maintenanceRecords.map(maint => ({
          id: maint.id,
          type: maint.maintenanceType,
          scheduledDate: maint.scheduledDate,
          status: maint.status
        }))
      });
    }

    if (conflicts.length > 0) {
      return NextResponse.json({
        available: false,
        conflicts
      });
    }

    // Calculate cost
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const totalCost = days * tool.dailyRate;

    return NextResponse.json({
      available: true,
      tool: {
        id: tool.id,
        name: tool.name,
        dailyRate: tool.dailyRate,
        requiresTraining: tool.requiresTraining
      },
      period: {
        startDate: start,
        endDate: end,
        days
      },
      cost: {
        dailyRate: tool.dailyRate,
        totalDays: days,
        totalCost
      }
    });

  } catch (error: any) {
    console.error('Error checking tool availability:', error);
    return NextResponse.json(
      { error: 'Failed to check tool availability' },
      { status: 500 }
    );
  }
}

function generateAvailabilityCalendar(tool: any, startDate: Date, endDate: Date) {
  const calendar = [];
  const currentDate = new Date(startDate);
  
  while (currentDate <= endDate) {
    const dateStr = currentDate.toISOString().split('T')[0];
    
    // Check if date conflicts with reservations
    const hasReservation = tool.reservations.some((res: any) => {
      const resStart = new Date(res.startDate);
      const resEnd = new Date(res.endDate);
      return currentDate >= resStart && currentDate <= resEnd;
    });

    // Check if date conflicts with maintenance
    const hasMaintenance = tool.maintenanceRecords.some((maint: any) => {
      const maintStart = new Date(maint.scheduledDate);
      const maintEnd = maint.completedDate ? new Date(maint.completedDate) : maintStart;
      return currentDate >= maintStart && currentDate <= maintEnd;
    });

    calendar.push({
      date: dateStr,
      available: tool.isAvailable && !hasReservation && !hasMaintenance,
      reason: !tool.isAvailable ? 'tool_unavailable' : 
              hasReservation ? 'reserved' : 
              hasMaintenance ? 'maintenance' : null
    });

    currentDate.setDate(currentDate.getDate() + 1);
  }

  return calendar;
}
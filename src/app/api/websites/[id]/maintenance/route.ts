import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';
import { WebsiteMaintenanceService } from '@/lib/services/website-maintenance.service';

const prisma = new PrismaClient();
const maintenanceService = new WebsiteMaintenanceService();

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const website = await prisma.memberWebsite.findUnique({
      where: { id: params.id },
      include: {
        member: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    if (!website) {
      return NextResponse.json(
        { error: 'Website not found' },
        { status: 404 }
      );
    }

    // Check permissions
    const isAdmin = session.user.memberType === 'ADMIN';
    const isOwner = website.memberId === session.user.id;

    if (!isAdmin && !isOwner) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get maintenance status
    const maintenanceStatus = await maintenanceService.getMaintenanceStatus(params.id);

    return NextResponse.json({
      success: true,
      maintenance: {
        website: {
          id: website.id,
          websiteUrl: website.websiteUrl,
          domainName: website.domainName,
          status: website.status
        },
        ...maintenanceStatus
      }
    });

  } catch (error) {
    console.error('Website maintenance status error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch maintenance status' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();
    const { action, ...actionData } = data;

    const website = await prisma.memberWebsite.findUnique({
      where: { id: params.id },
      include: {
        member: true
      }
    });

    if (!website) {
      return NextResponse.json(
        { error: 'Website not found' },
        { status: 404 }
      );
    }

    // Check permissions
    const isAdmin = session.user.memberType === 'ADMIN';
    const isOwner = website.memberId === session.user.id;

    if (!isAdmin && !isOwner) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    let result;

    switch (action) {
      case 'backup':
        result = await maintenanceService.createAutomatedBackup(params.id);
        break;

      case 'security_update':
        if (!isAdmin) {
          return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
        }
        result = await maintenanceService.performSecurityUpdate(params.id);
        break;

      case 'performance_check':
        result = await maintenanceService.monitorPerformance(params.id);
        break;

      case 'schedule_maintenance':
        if (!isAdmin) {
          return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
        }
        const taskId = await maintenanceService.scheduleMaintenanceTask({
          type: actionData.type,
          websiteId: params.id,
          scheduledAt: new Date(actionData.scheduledAt),
          details: actionData.details
        });
        result = { taskId, scheduled: true };
        break;

      case 'create_support_ticket':
        const ticketId = await maintenanceService.createSupportTicket({
          websiteId: params.id,
          memberId: website.memberId,
          subject: actionData.subject,
          description: actionData.description,
          priority: actionData.priority || 'medium',
          category: actionData.category || 'technical'
        });
        result = { ticketId, created: true };
        break;

      case 'generate_report':
        result = await maintenanceService.generateMaintenanceReport(
          params.id,
          actionData.period || 'month'
        );
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid maintenance action' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      action,
      result
    });

  } catch (error) {
    console.error('Website maintenance action error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Maintenance action failed' },
      { status: 500 }
    );
  }
}
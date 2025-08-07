import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';
import { WebsiteMaintenanceService } from '@/lib/services/website-maintenance.service';

const prisma = new PrismaClient();
const maintenanceService = new WebsiteMaintenanceService();

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();
    const {
      websiteId,
      subject,
      description,
      priority = 'medium',
      category = 'technical'
    } = data;

    if (!websiteId || !subject || !description) {
      return NextResponse.json(
        { error: 'Website ID, subject, and description are required' },
        { status: 400 }
      );
    }

    // Verify website ownership
    const website = await prisma.memberWebsite.findUnique({
      where: { id: websiteId },
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

    // Create support ticket
    const ticketId = await maintenanceService.createSupportTicket({
      websiteId,
      memberId: website.memberId,
      subject,
      description,
      priority,
      category
    });

    return NextResponse.json({
      success: true,
      ticket: {
        id: ticketId,
        websiteId,
        subject,
        priority,
        category,
        status: 'open',
        createdAt: new Date()
      }
    });

  } catch (error) {
    console.error('Support ticket creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create support ticket' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const websiteId = searchParams.get('websiteId');
    const status = searchParams.get('status');
    const isAdmin = session.user.memberType === 'ADMIN';

    let whereClause: any = {};

    if (websiteId) {
      // Verify website access
      const website = await prisma.memberWebsite.findUnique({
        where: { id: websiteId }
      });

      if (!website) {
        return NextResponse.json(
          { error: 'Website not found' },
          { status: 404 }
        );
      }

      const isOwner = website.memberId === session.user.id;
      if (!isAdmin && !isOwner) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      whereClause.websiteId = websiteId;
    } else if (!isAdmin) {
      // Non-admin users can only see tickets for their websites
      const userWebsites = await prisma.memberWebsite.findMany({
        where: { memberId: session.user.id },
        select: { id: true }
      });
      
      whereClause.websiteId = {
        in: userWebsites.map(w => w.id)
      };
    }

    if (status) {
      whereClause.status = status;
    }

    // In a real implementation, this would query actual support tickets
    // For now, return mock data
    const mockTickets = [
      {
        id: 'ticket_001',
        websiteId: websiteId || 'website_001',
        subject: 'Website loading slowly',
        description: 'My website has been loading very slowly for the past few days',
        priority: 'medium',
        category: 'performance',
        status: 'open',
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        assignedTo: null
      },
      {
        id: 'ticket_002',
        websiteId: websiteId || 'website_001',
        subject: 'Update business information',
        description: 'Need to update my business description and services offered',
        priority: 'low',
        category: 'content',
        status: 'in_progress',
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        assignedTo: 'admin_001'
      }
    ];

    return NextResponse.json({
      success: true,
      tickets: mockTickets
    });

  } catch (error) {
    console.error('Support tickets fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch support tickets' },
      { status: 500 }
    );
  }
}
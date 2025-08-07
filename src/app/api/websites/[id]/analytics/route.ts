import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';
import { WebsiteGenerationService } from '@/lib/services/website-generation.service';

const prisma = new PrismaClient();
const websiteService = new WebsiteGenerationService();

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

    // Get analytics data
    const analytics = await websiteService.getWebsiteAnalytics(params.id);

    // Update analytics in database
    await prisma.memberWebsite.update({
      where: { id: params.id },
      data: {
        monthlyVisitors: analytics.monthlyVisitors,
        leadsGenerated: analytics.leadsGenerated,
        lastAnalyticsUpdate: new Date()
      }
    });

    return NextResponse.json({
      success: true,
      analytics: {
        ...analytics,
        website: {
          id: website.id,
          websiteUrl: website.websiteUrl,
          domainName: website.domainName,
          status: website.status,
          createdAt: website.createdAt,
          lastContentUpdate: website.lastContentUpdate
        }
      }
    });

  } catch (error) {
    console.error('Website analytics error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch website analytics' },
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
    const { action } = data;

    const website = await prisma.memberWebsite.findUnique({
      where: { id: params.id }
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
      case 'refresh':
        result = await websiteService.getWebsiteAnalytics(params.id);
        
        // Update database with fresh data
        await prisma.memberWebsite.update({
          where: { id: params.id },
          data: {
            monthlyVisitors: result.monthlyVisitors,
            leadsGenerated: result.leadsGenerated,
            lastAnalyticsUpdate: new Date()
          }
        });
        break;

      case 'backup':
        if (!isAdmin) {
          return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
        }
        result = await websiteService.backupWebsite(params.id);
        break;

      case 'performance_check':
        result = await websiteService.monitorWebsitePerformance(params.id);
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      result
    });

  } catch (error) {
    console.error('Website analytics action error:', error);
    return NextResponse.json(
      { error: 'Failed to perform analytics action' },
      { status: 500 }
    );
  }
}
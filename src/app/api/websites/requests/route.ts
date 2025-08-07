import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';
import { HubSpotBackboneService } from '@/lib/services/hubspot-backbone.service';

const prisma = new PrismaClient();
const hubspotService = new HubSpotBackboneService();

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();
    
    // Validate required fields
    const {
      businessName,
      businessType,
      businessFocus,
      domainPreference,
      useNamcSubdomain,
      professionalEmail,
      businessDescription,
      servicesOffered,
      yearsInBusiness,
      licenseNumbers,
      certifications,
      serviceAreas,
      includePortfolio,
      includeSocialImpact,
      includeTestimonials,
      includeBlog,
      customRequests
    } = data;

    if (!businessName || !businessType) {
      return NextResponse.json(
        { error: 'Business name and type are required' },
        { status: 400 }
      );
    }

    // Create website request in local database
    const websiteRequest = await prisma.websiteRequest.create({
      data: {
        memberId: session.user.id,
        businessName,
        businessType,
        businessFocus,
        domainPreference,
        useNamcSubdomain: useNamcSubdomain ?? true,
        professionalEmail,
        businessDescription,
        servicesOffered,
        yearsInBusiness: yearsInBusiness ? parseInt(yearsInBusiness) : null,
        licenseNumbers,
        certifications,
        serviceAreas,
        includePortfolio: includePortfolio ?? true,
        includeSocialImpact: includeSocialImpact ?? true,
        includeTestimonials: includeTestimonials ?? true,
        includeBlog: includeBlog ?? false,
        customRequests,
        status: 'PENDING',
        priority: 'NORMAL'
      },
      include: {
        member: {
          select: {
            id: true,
            name: true,
            email: true,
            company: true,
            memberType: true
          }
        }
      }
    });

    // Create HubSpot ticket for admin review
    try {
      const hubspotTicket = await hubspotService.createWebsiteRequestTicket({
        memberId: session.user.id,
        memberName: websiteRequest.member.name || 'Unknown',
        memberEmail: websiteRequest.member.email,
        businessName,
        businessType,
        businessFocus,
        domainPreference,
        professionalEmail,
        customRequests,
        requestId: websiteRequest.id
      });

      // Update local record with HubSpot ticket ID
      await prisma.websiteRequest.update({
        where: { id: websiteRequest.id },
        data: {
          hubspotTicketId: hubspotTicket.id,
          hubspotSyncStatus: 'SYNCED',
          hubspotLastSync: new Date()
        }
      });

      // Send notification email to member
      await hubspotService.sendWebsiteRequestConfirmation({
        memberEmail: websiteRequest.member.email,
        memberName: websiteRequest.member.name || 'Member',
        businessName,
        ticketId: hubspotTicket.id
      });

    } catch (hubspotError) {
      console.error('HubSpot integration error:', hubspotError);
      // Continue without HubSpot integration - request is still valid
    }

    return NextResponse.json({
      success: true,
      request: {
        id: websiteRequest.id,
        status: websiteRequest.status,
        businessName: websiteRequest.businessName,
        requestedAt: websiteRequest.requestedAt,
        hubspotTicketId: websiteRequest.hubspotTicketId
      }
    });

  } catch (error) {
    console.error('Website request creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create website request' },
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
    const status = searchParams.get('status');
    const isAdmin = session.user.memberType === 'ADMIN';

    let whereClause: any = {};

    if (!isAdmin) {
      // Regular members can only see their own requests
      whereClause.memberId = session.user.id;
    }

    if (status) {
      whereClause.status = status;
    }

    const requests = await prisma.websiteRequest.findMany({
      where: whereClause,
      include: {
        member: {
          select: {
            id: true,
            name: true,
            email: true,
            company: true,
            memberType: true
          }
        },
        assignedAdmin: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        website: {
          select: {
            id: true,
            websiteUrl: true,
            domainName: true,
            status: true,
            monthlyVisitors: true,
            leadsGenerated: true
          }
        }
      },
      orderBy: {
        requestedAt: 'desc'
      }
    });

    return NextResponse.json({
      success: true,
      requests
    });

  } catch (error) {
    console.error('Website requests fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch website requests' },
      { status: 500 }
    );
  }
}
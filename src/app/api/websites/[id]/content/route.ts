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
            email: true,
            company: true
          }
        },
        websiteRequest: {
          select: {
            businessName: true,
            businessType: true,
            businessDescription: true,
            servicesOffered: true,
            includePortfolio: true,
            includeSocialImpact: true,
            includeTestimonials: true,
            includeBlog: true
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

    // Get current customizations
    const customizations = website.customizations ? 
      JSON.parse(website.customizations) : {};

    return NextResponse.json({
      success: true,
      content: {
        website: {
          id: website.id,
          websiteUrl: website.websiteUrl,
          domainName: website.domainName,
          status: website.status,
          templateVersion: website.templateVersion,
          lastContentUpdate: website.lastContentUpdate
        },
        businessInfo: {
          businessName: website.websiteRequest.businessName,
          businessType: website.websiteRequest.businessType,
          businessDescription: website.websiteRequest.businessDescription,
          servicesOffered: website.websiteRequest.servicesOffered
        },
        features: {
          includePortfolio: website.websiteRequest.includePortfolio,
          includeSocialImpact: website.websiteRequest.includeSocialImpact,
          includeTestimonials: website.websiteRequest.includeTestimonials,
          includeBlog: website.websiteRequest.includeBlog
        },
        customizations
      }
    });

  } catch (error) {
    console.error('Website content fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch website content' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();
    const {
      businessDescription,
      servicesOffered,
      projectPortfolio,
      socialImpactMetrics,
      testimonials,
      customizations
    } = data;

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

    // Update website content
    await websiteService.updateWebsiteContent(params.id, {
      businessDescription,
      servicesOffered,
      projectPortfolio,
      socialImpactMetrics,
      testimonials
    });

    // Update customizations if provided
    if (customizations) {
      await prisma.memberWebsite.update({
        where: { id: params.id },
        data: {
          customizations: JSON.stringify(customizations),
          lastContentUpdate: new Date()
        }
      });
    }

    // Update related website request if business info changed
    if (businessDescription || servicesOffered) {
      await prisma.websiteRequest.update({
        where: { id: website.websiteRequestId },
        data: {
          ...(businessDescription && { businessDescription }),
          ...(servicesOffered && { servicesOffered })
        }
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Website content updated successfully'
    });

  } catch (error) {
    console.error('Website content update error:', error);
    return NextResponse.json(
      { error: 'Failed to update website content' },
      { status: 500 }
    );
  }
}
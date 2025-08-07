import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';
import { WebsiteGenerationService } from '@/lib/services/website-generation.service';

const prisma = new PrismaClient();
const websiteService = new WebsiteGenerationService();

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins can generate websites
    if (session.user.memberType !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const data = await request.json();
    const { requestId, templateId, customDomain, customizations } = data;

    if (!requestId) {
      return NextResponse.json(
        { error: 'Request ID is required' },
        { status: 400 }
      );
    }

    // Get the website request
    const websiteRequest = await prisma.websiteRequest.findUnique({
      where: { id: requestId },
      include: {
        member: {
          select: {
            id: true,
            name: true,
            email: true,
            company: true,
            phone: true,
            location: true,
            memberType: true
          }
        }
      }
    });

    if (!websiteRequest) {
      return NextResponse.json(
        { error: 'Website request not found' },
        { status: 404 }
      );
    }

    if (websiteRequest.status !== 'APPROVED') {
      return NextResponse.json(
        { error: 'Website request must be approved before generation' },
        { status: 400 }
      );
    }

    // Check if website already exists
    const existingWebsite = await prisma.memberWebsite.findUnique({
      where: { websiteRequestId: requestId }
    });

    if (existingWebsite) {
      return NextResponse.json(
        { error: 'Website already exists for this request' },
        { status: 400 }
      );
    }

    // Update request status to in progress
    await prisma.websiteRequest.update({
      where: { id: requestId },
      data: {
        status: 'IN_PROGRESS'
      }
    });

    // Generate domain name
    const domainName = customDomain || 
      websiteRequest.domainPreference || 
      generateDomainName(websiteRequest.businessName);

    // Generate the website
    const result = await websiteService.generateWebsite({
      requestId,
      member: websiteRequest.member,
      businessName: websiteRequest.businessName,
      businessType: websiteRequest.businessType,
      businessDescription: websiteRequest.businessDescription || undefined,
      servicesOffered: websiteRequest.servicesOffered || undefined,
      domainName,
      professionalEmail: websiteRequest.professionalEmail || undefined,
      templateId,
      customizations
    });

    return NextResponse.json({
      success: true,
      website: {
        id: requestId,
        websiteUrl: result.websiteUrl,
        hubspotPageId: result.hubspotPageId,
        professionalEmail: result.professionalEmail,
        domainName
      }
    });

  } catch (error) {
    console.error('Website generation error:', error);
    
    // Revert request status on error
    try {
      const { requestId } = await request.json();
      if (requestId) {
        await prisma.websiteRequest.update({
          where: { id: requestId },
          data: {
            status: 'APPROVED' // Revert to approved so it can be retried
          }
        });
      }
    } catch (revertError) {
      console.error('Failed to revert request status:', revertError);
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Website generation failed' },
      { status: 500 }
    );
  }
}

function generateDomainName(businessName: string): string {
  const cleanName = businessName
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '-')
    .substring(0, 30);
  
  return `${cleanName}.namc-norcal.org`;
}
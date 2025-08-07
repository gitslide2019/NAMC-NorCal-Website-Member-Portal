import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';
import { HubSpotBackboneService } from '@/lib/services/hubspot-backbone.service';

const prisma = new PrismaClient();
const hubspotService = new HubSpotBackboneService();

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const websiteRequest = await prisma.websiteRequest.findUnique({
      where: { id: params.id },
      include: {
        member: {
          select: {
            id: true,
            name: true,
            email: true,
            company: true,
            memberType: true,
            phone: true,
            location: true
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
            professionalEmail: true,
            status: true,
            templateVersion: true,
            monthlyVisitors: true,
            leadsGenerated: true,
            lastAnalyticsUpdate: true,
            createdAt: true,
            lastContentUpdate: true
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

    // Check permissions
    const isAdmin = session.user.memberType === 'ADMIN';
    const isOwner = websiteRequest.memberId === session.user.id;

    if (!isAdmin && !isOwner) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({
      success: true,
      request: websiteRequest
    });

  } catch (error) {
    console.error('Website request fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch website request' },
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
    const { action, ...updateData } = data;

    const websiteRequest = await prisma.websiteRequest.findUnique({
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

    if (!websiteRequest) {
      return NextResponse.json(
        { error: 'Website request not found' },
        { status: 404 }
      );
    }

    // Check permissions
    const isAdmin = session.user.memberType === 'ADMIN';
    const isOwner = websiteRequest.memberId === session.user.id;

    if (!isAdmin && !isOwner) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    let updatedRequest;

    if (action === 'approve' && isAdmin) {
      // Admin approving request
      updatedRequest = await prisma.websiteRequest.update({
        where: { id: params.id },
        data: {
          status: 'APPROVED',
          assignedAdminId: session.user.id,
          approvedAt: new Date(),
          estimatedCompletion: updateData.estimatedCompletion ? 
            new Date(updateData.estimatedCompletion) : 
            new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
        }
      });

      // Update HubSpot ticket
      try {
        await hubspotService.updateWebsiteRequestStatus({
          ticketId: websiteRequest.hubspotTicketId!,
          status: 'APPROVED',
          assignedAdmin: session.user.name || session.user.email,
          estimatedCompletion: updatedRequest.estimatedCompletion
        });

        // Send approval notification
        await hubspotService.sendWebsiteRequestApproval({
          memberEmail: websiteRequest.member.email,
          memberName: websiteRequest.member.name || 'Member',
          businessName: websiteRequest.businessName,
          estimatedCompletion: updatedRequest.estimatedCompletion
        });
      } catch (hubspotError) {
        console.error('HubSpot update error:', hubspotError);
      }

    } else if (action === 'reject' && isAdmin) {
      // Admin rejecting request
      updatedRequest = await prisma.websiteRequest.update({
        where: { id: params.id },
        data: {
          status: 'REJECTED',
          assignedAdminId: session.user.id,
          reviewedAt: new Date()
        }
      });

      // Update HubSpot ticket and send notification
      try {
        await hubspotService.updateWebsiteRequestStatus({
          ticketId: websiteRequest.hubspotTicketId!,
          status: 'REJECTED',
          assignedAdmin: session.user.name || session.user.email,
          rejectionReason: updateData.rejectionReason
        });

        await hubspotService.sendWebsiteRequestRejection({
          memberEmail: websiteRequest.member.email,
          memberName: websiteRequest.member.name || 'Member',
          businessName: websiteRequest.businessName,
          rejectionReason: updateData.rejectionReason || 'Request did not meet requirements'
        });
      } catch (hubspotError) {
        console.error('HubSpot update error:', hubspotError);
      }

    } else if (action === 'assign' && isAdmin) {
      // Admin assigning request to themselves or another admin
      updatedRequest = await prisma.websiteRequest.update({
        where: { id: params.id },
        data: {
          status: 'UNDER_REVIEW',
          assignedAdminId: updateData.assignedAdminId || session.user.id,
          reviewedAt: new Date(),
          priority: updateData.priority || websiteRequest.priority
        }
      });

    } else if (isOwner) {
      // Member updating their own request (only if still pending)
      if (websiteRequest.status !== 'PENDING') {
        return NextResponse.json(
          { error: 'Cannot modify request after review has started' },
          { status: 400 }
        );
      }

      updatedRequest = await prisma.websiteRequest.update({
        where: { id: params.id },
        data: {
          businessName: updateData.businessName || websiteRequest.businessName,
          businessType: updateData.businessType || websiteRequest.businessType,
          businessFocus: updateData.businessFocus || websiteRequest.businessFocus,
          domainPreference: updateData.domainPreference || websiteRequest.domainPreference,
          professionalEmail: updateData.professionalEmail || websiteRequest.professionalEmail,
          businessDescription: updateData.businessDescription || websiteRequest.businessDescription,
          servicesOffered: updateData.servicesOffered || websiteRequest.servicesOffered,
          customRequests: updateData.customRequests || websiteRequest.customRequests
        }
      });
    } else {
      return NextResponse.json(
        { error: 'Invalid action or insufficient permissions' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      request: updatedRequest
    });

  } catch (error) {
    console.error('Website request update error:', error);
    return NextResponse.json(
      { error: 'Failed to update website request' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const websiteRequest = await prisma.websiteRequest.findUnique({
      where: { id: params.id }
    });

    if (!websiteRequest) {
      return NextResponse.json(
        { error: 'Website request not found' },
        { status: 404 }
      );
    }

    // Check permissions - only owner can delete and only if pending
    const isOwner = websiteRequest.memberId === session.user.id;
    
    if (!isOwner) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (websiteRequest.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'Cannot delete request after review has started' },
        { status: 400 }
      );
    }

    // Delete from database
    await prisma.websiteRequest.delete({
      where: { id: params.id }
    });

    // Close HubSpot ticket if exists
    if (websiteRequest.hubspotTicketId) {
      try {
        await hubspotService.closeWebsiteRequestTicket(websiteRequest.hubspotTicketId);
      } catch (hubspotError) {
        console.error('HubSpot ticket closure error:', hubspotError);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Website request deleted successfully'
    });

  } catch (error) {
    console.error('Website request deletion error:', error);
    return NextResponse.json(
      { error: 'Failed to delete website request' },
      { status: 500 }
    );
  }
}
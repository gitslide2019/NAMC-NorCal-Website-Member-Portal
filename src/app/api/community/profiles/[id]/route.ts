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

    const memberId = params.id;

    // Get member profile
    const profile = await prisma.memberProfile.findUnique({
      where: { memberId },
      include: {
        member: {
          select: {
            id: true,
            name: true,
            email: true,
            company: true,
            memberType: true,
            location: true,
            website: true,
            joinDate: true,
            lastActive: true,
          },
        },
      },
    });

    if (!profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      );
    }

    // Check if profile is public or if user owns it
    if (!profile.isPublic && profile.memberId !== session.user.id) {
      return NextResponse.json(
        { error: 'Profile is private' },
        { status: 403 }
      );
    }

    // Increment profile views if not viewing own profile
    if (profile.memberId !== session.user.id) {
      await prisma.memberProfile.update({
        where: { memberId },
        data: { profileViews: { increment: 1 } },
      });
    }

    // Check if current user is connected to this member
    const connection = await prisma.memberConnection.findFirst({
      where: {
        fromMemberId: session.user.id,
        toMemberId: memberId,
        isActive: true,
      },
    });

    // Check if there's a pending connection request
    const pendingRequest = await prisma.connectionRequest.findFirst({
      where: {
        OR: [
          { requesterId: session.user.id, receiverId: memberId },
          { requesterId: memberId, receiverId: session.user.id },
        ],
        status: 'PENDING',
      },
    });

    return NextResponse.json({
      profile: {
        ...profile,
        specialties: profile.specialties ? JSON.parse(profile.specialties) : [],
        certifications: profile.certifications ? JSON.parse(profile.certifications) : [],
        projectTypes: profile.projectTypes ? JSON.parse(profile.projectTypes) : [],
        serviceAreas: profile.serviceAreas ? JSON.parse(profile.serviceAreas) : [],
        portfolioImages: profile.portfolioImages ? JSON.parse(profile.portfolioImages) : [],
        testimonials: profile.testimonials ? JSON.parse(profile.testimonials) : [],
        socialLinks: profile.socialLinks ? JSON.parse(profile.socialLinks) : {},
      },
      connectionStatus: {
        isConnected: !!connection,
        hasPendingRequest: !!pendingRequest,
        pendingRequestId: pendingRequest?.id,
        isRequester: pendingRequest?.requesterId === session.user.id,
      },
    });
  } catch (error) {
    console.error('Error fetching member profile:', error);
    return NextResponse.json(
      { error: 'Failed to fetch member profile' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const memberId = params.id;

    // Check if user owns this profile
    if (memberId !== session.user.id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      bio,
      specialties = [],
      certifications = [],
      yearsExperience,
      projectTypes = [],
      serviceAreas = [],
      businessSize,
      portfolioImages = [],
      testimonials = [],
      socialLinks = {},
      isPublic = true,
      showContact = true,
      showProjects = true,
      showCertifications = true,
    } = body;

    // Update or create profile
    const profile = await prisma.memberProfile.upsert({
      where: { memberId },
      update: {
        bio,
        specialties: JSON.stringify(specialties),
        certifications: JSON.stringify(certifications),
        yearsExperience,
        projectTypes: JSON.stringify(projectTypes),
        serviceAreas: JSON.stringify(serviceAreas),
        businessSize,
        portfolioImages: JSON.stringify(portfolioImages),
        testimonials: JSON.stringify(testimonials),
        socialLinks: JSON.stringify(socialLinks),
        isPublic,
        showContact,
        showProjects,
        showCertifications,
        hubspotSyncStatus: 'PENDING',
      },
      create: {
        memberId,
        bio,
        specialties: JSON.stringify(specialties),
        certifications: JSON.stringify(certifications),
        yearsExperience,
        projectTypes: JSON.stringify(projectTypes),
        serviceAreas: JSON.stringify(serviceAreas),
        businessSize,
        portfolioImages: JSON.stringify(portfolioImages),
        testimonials: JSON.stringify(testimonials),
        socialLinks: JSON.stringify(socialLinks),
        isPublic,
        showContact,
        showProjects,
        showCertifications,
        hubspotSyncStatus: 'PENDING',
      },
      include: {
        member: {
          select: {
            id: true,
            name: true,
            email: true,
            company: true,
            memberType: true,
            location: true,
            website: true,
            joinDate: true,
          },
        },
      },
    });

    // Sync to HubSpot in background
    try {
      await hubspotService.updateMemberProfile(memberId, {
        bio,
        specialties,
        certifications,
        yearsExperience,
        projectTypes,
        serviceAreas,
        businessSize,
        isPublic,
      });
    } catch (hubspotError) {
      console.error('HubSpot sync error:', hubspotError);
    }

    return NextResponse.json({
      profile: {
        ...profile,
        specialties: JSON.parse(profile.specialties || '[]'),
        certifications: JSON.parse(profile.certifications || '[]'),
        projectTypes: JSON.parse(profile.projectTypes || '[]'),
        serviceAreas: JSON.parse(profile.serviceAreas || '[]'),
        portfolioImages: JSON.parse(profile.portfolioImages || '[]'),
        testimonials: JSON.parse(profile.testimonials || '[]'),
        socialLinks: JSON.parse(profile.socialLinks || '{}'),
      },
    });
  } catch (error) {
    console.error('Error updating member profile:', error);
    return NextResponse.json(
      { error: 'Failed to update member profile' },
      { status: 500 }
    );
  }
}
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const specialty = searchParams.get('specialty');
    const location = searchParams.get('location');
    const businessSize = searchParams.get('businessSize');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {
      isPublic: true,
      member: {
        isActive: true,
      },
    };

    if (search) {
      where.OR = [
        { member: { name: { contains: search, mode: 'insensitive' } } },
        { member: { company: { contains: search, mode: 'insensitive' } } },
        { bio: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (specialty) {
      where.specialties = { contains: specialty };
    }

    if (location) {
      where.member = {
        ...where.member,
        location: { contains: location, mode: 'insensitive' },
      };
    }

    if (businessSize) {
      where.businessSize = businessSize;
    }

    // Get member profiles
    const profiles = await prisma.memberProfile.findMany({
      where,
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
      orderBy: {
        profileViews: 'desc',
      },
      skip,
      take: limit,
    });

    // Get total count for pagination
    const totalCount = await prisma.memberProfile.count({ where });

    // Increment profile views for profiles being viewed
    const profileIds = profiles.map(p => p.id);
    if (profileIds.length > 0) {
      await prisma.memberProfile.updateMany({
        where: { id: { in: profileIds } },
        data: { profileViews: { increment: 1 } },
      });
    }

    return NextResponse.json({
      profiles: profiles.map(profile => ({
        ...profile,
        specialties: profile.specialties ? JSON.parse(profile.specialties) : [],
        certifications: profile.certifications ? JSON.parse(profile.certifications) : [],
        projectTypes: profile.projectTypes ? JSON.parse(profile.projectTypes) : [],
        serviceAreas: profile.serviceAreas ? JSON.parse(profile.serviceAreas) : [],
        portfolioImages: profile.portfolioImages ? JSON.parse(profile.portfolioImages) : [],
        testimonials: profile.testimonials ? JSON.parse(profile.testimonials) : [],
        socialLinks: profile.socialLinks ? JSON.parse(profile.socialLinks) : {},
      })),
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching member profiles:', error);
    return NextResponse.json(
      { error: 'Failed to fetch member profiles' },
      { status: 500 }
    );
  }
}
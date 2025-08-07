import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { SponsoredLearningService } from '@/lib/services/sponsored-learning.service';

const sponsoredLearningService = new SponsoredLearningService();

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    const partnerships = await sponsoredLearningService.getSponsorPartnerships(status || undefined);

    return NextResponse.json({
      success: true,
      data: partnerships,
    });
  } catch (error) {
    console.error('Error fetching sponsor partnerships:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sponsor partnerships' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    if (session.user.memberType !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const data = await request.json();

    // Validate required fields
    if (!data.name || !data.partnershipType || !data.partnershipStartDate) {
      return NextResponse.json(
        { error: 'Missing required fields: name, partnershipType, partnershipStartDate' },
        { status: 400 }
      );
    }

    const partnership = await sponsoredLearningService.createSponsorPartnership({
      name: data.name,
      partnershipType: data.partnershipType,
      courseCategories: data.courseCategories,
      specializations: data.specializations,
      revenueSharePercentage: data.revenueSharePercentage || 0,
      minimumCommitment: data.minimumCommitment,
      partnershipStartDate: new Date(data.partnershipStartDate),
      partnershipEndDate: data.partnershipEndDate ? new Date(data.partnershipEndDate) : undefined,
      contactEmail: data.contactEmail,
      contactPhone: data.contactPhone,
      logoUrl: data.logoUrl,
      websiteUrl: data.websiteUrl,
    });

    return NextResponse.json({
      success: true,
      data: partnership,
    });
  } catch (error) {
    console.error('Error creating sponsor partnership:', error);
    return NextResponse.json(
      { error: 'Failed to create sponsor partnership' },
      { status: 500 }
    );
  }
}
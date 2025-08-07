import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { ProficiencyBadgesService } from '@/lib/services/proficiency-badges.service';

const proficiencyBadgesService = new ProficiencyBadgesService();

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    if (session.user.memberType !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const verifications = await proficiencyBadgesService.getPendingVerifications();

    return NextResponse.json({
      success: true,
      data: verifications,
    });
  } catch (error) {
    console.error('Error fetching pending verifications:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pending verifications' },
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

    const data = await request.json();

    // Validate required fields
    if (!data.badgeId || !data.memberId || !data.verificationType || !data.verificationMethod) {
      return NextResponse.json(
        { error: 'Missing required fields: badgeId, memberId, verificationType, verificationMethod' },
        { status: 400 }
      );
    }

    // Validate verification type
    const validVerificationTypes = ['INITIAL', 'RENEWAL', 'AUDIT'];
    if (!validVerificationTypes.includes(data.verificationType)) {
      return NextResponse.json(
        { error: 'Invalid verification type. Must be one of: ' + validVerificationTypes.join(', ') },
        { status: 400 }
      );
    }

    // Validate verification method
    const validVerificationMethods = ['ASSESSMENT', 'PROJECT_REVIEW', 'PEER_REVIEW', 'SPONSOR_VERIFICATION'];
    if (!validVerificationMethods.includes(data.verificationMethod)) {
      return NextResponse.json(
        { error: 'Invalid verification method. Must be one of: ' + validVerificationMethods.join(', ') },
        { status: 400 }
      );
    }

    const verification = await proficiencyBadgesService.createBadgeVerification({
      badgeId: data.badgeId,
      memberId: data.memberId,
      verificationType: data.verificationType,
      verificationMethod: data.verificationMethod,
      verifiedBy: data.verifiedBy,
      verificationNotes: data.verificationNotes,
      evidenceUrls: data.evidenceUrls,
      expirationDate: data.expirationDate ? new Date(data.expirationDate) : undefined,
    });

    return NextResponse.json({
      success: true,
      data: verification,
    });
  } catch (error) {
    console.error('Error creating badge verification:', error);
    return NextResponse.json(
      { error: 'Failed to create badge verification' },
      { status: 500 }
    );
  }
}
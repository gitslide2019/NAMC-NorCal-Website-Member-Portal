import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { ProficiencyBadgesService } from '@/lib/services/proficiency-badges.service';

const proficiencyBadgesService = new ProficiencyBadgesService();

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const badge = await proficiencyBadgesService.getBadgeById(params.id);

    // Check if user can access this badge
    if (badge.memberId !== session.user.id && session.user.memberType !== 'ADMIN') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    return NextResponse.json({
      success: true,
      data: badge,
    });
  } catch (error) {
    console.error('Error fetching badge:', error);
    if (error instanceof Error && error.message === 'Badge not found') {
      return NextResponse.json({ error: 'Badge not found' }, { status: 404 });
    }
    return NextResponse.json(
      { error: 'Failed to fetch badge' },
      { status: 500 }
    );
  }
}
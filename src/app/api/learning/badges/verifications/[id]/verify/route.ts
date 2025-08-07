import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { ProficiencyBadgesService } from '@/lib/services/proficiency-badges.service';

const proficiencyBadgesService = new ProficiencyBadgesService();

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const verification = await proficiencyBadgesService.verifyBadge(
      params.id,
      session.user.id,
      data.notes
    );

    return NextResponse.json({
      success: true,
      data: verification,
    });
  } catch (error) {
    console.error('Error verifying badge:', error);
    return NextResponse.json(
      { error: 'Failed to verify badge' },
      { status: 500 }
    );
  }
}
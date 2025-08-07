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

    const { searchParams } = new URL(request.url);
    const timeframe = searchParams.get('timeframe') as 'week' | 'month' | 'quarter' | 'year' || 'month';

    // Validate timeframe
    const validTimeframes = ['week', 'month', 'quarter', 'year'];
    if (!validTimeframes.includes(timeframe)) {
      return NextResponse.json(
        { error: 'Invalid timeframe. Must be one of: ' + validTimeframes.join(', ') },
        { status: 400 }
      );
    }

    const analytics = await proficiencyBadgesService.getBadgeAnalytics(timeframe);

    return NextResponse.json({
      success: true,
      data: analytics,
    });
  } catch (error) {
    console.error('Error fetching badge analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch badge analytics' },
      { status: 500 }
    );
  }
}
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { podcastManagementService } from '@/lib/services/podcast-management.service';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get('includeInactive') === 'true';

    const podcasts = await podcastManagementService.getAllPodcasts(includeInactive);

    return NextResponse.json(podcasts);
  } catch (error) {
    console.error('Error fetching podcasts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch podcasts' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.memberType !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const data = await request.json();

    const podcast = await podcastManagementService.createPodcast(data, session.user.id);

    return NextResponse.json(podcast, { status: 201 });
  } catch (error) {
    console.error('Error creating podcast:', error);
    return NextResponse.json(
      { error: 'Failed to create podcast' },
      { status: 500 }
    );
  }
}
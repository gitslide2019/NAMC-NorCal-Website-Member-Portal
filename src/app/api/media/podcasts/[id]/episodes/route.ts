import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { podcastManagementService } from '@/lib/services/podcast-management.service';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    const result = await podcastManagementService.getPodcastEpisodes(params.id, limit, offset);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching podcast episodes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch podcast episodes' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.memberType !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const data = await request.json();
    data.podcastId = params.id;
    data.authorId = session.user.id;

    const episode = await podcastManagementService.createEpisode(data);

    return NextResponse.json(episode, { status: 201 });
  } catch (error) {
    console.error('Error creating podcast episode:', error);
    return NextResponse.json(
      { error: 'Failed to create podcast episode' },
      { status: 500 }
    );
  }
}
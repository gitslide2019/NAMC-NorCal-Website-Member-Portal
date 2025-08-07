import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { videoManagementService } from '@/lib/services/video-management.service';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    let timeRange;
    if (startDate && endDate) {
      timeRange = {
        start: new Date(startDate),
        end: new Date(endDate)
      };
    }

    const analytics = await videoManagementService.getVideoAnalytics(params.id, timeRange);

    return NextResponse.json(analytics);
  } catch (error) {
    console.error('Error fetching video analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch video analytics' },
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
    const data = await request.json();

    const { eventType, eventData } = data;

    switch (eventType) {
      case 'play':
        await videoManagementService.trackVideoPlay(params.id, session?.user?.id);
        break;
      case 'pause':
        await videoManagementService.trackVideoPause(params.id, session?.user?.id, eventData?.currentTime);
        break;
      case 'complete':
        await videoManagementService.trackVideoComplete(params.id, session?.user?.id, eventData?.watchTime);
        break;
      case 'view':
        await videoManagementService.trackVideoView(params.id, session?.user?.id, eventData?.watchTime);
        break;
      default:
        return NextResponse.json(
          { error: 'Invalid event type' },
          { status: 400 }
        );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error tracking video event:', error);
    return NextResponse.json(
      { error: 'Failed to track video event' },
      { status: 500 }
    );
  }
}
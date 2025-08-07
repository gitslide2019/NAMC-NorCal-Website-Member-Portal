import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { chapterConnectionsService } from '@/lib/services/chapter-connections.service';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const directory = await chapterConnectionsService.getChapterDirectory();

    return NextResponse.json({
      success: true,
      data: directory
    });
  } catch (error) {
    console.error('Error fetching chapter directory:', error);
    return NextResponse.json(
      { error: 'Failed to fetch chapter directory' },
      { status: 500 }
    );
  }
}
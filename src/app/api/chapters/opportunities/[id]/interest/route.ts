import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { chapterConnectionsService } from '@/lib/services/chapter-connections.service';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();
    const { chapter } = data;

    if (!chapter) {
      return NextResponse.json(
        { error: 'Chapter is required' },
        { status: 400 }
      );
    }

    const opportunity = await chapterConnectionsService.expressInterestInOpportunity(
      params.id,
      chapter
    );

    return NextResponse.json({
      success: true,
      data: opportunity
    });
  } catch (error) {
    console.error('Error expressing interest in opportunity:', error);
    return NextResponse.json(
      { error: 'Failed to express interest in opportunity' },
      { status: 500 }
    );
  }
}
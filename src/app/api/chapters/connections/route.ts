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

    const { searchParams } = new URL(request.url);
    const chapter = searchParams.get('chapter');

    const connections = await chapterConnectionsService.getChapterConnections(chapter || undefined);

    return NextResponse.json({
      success: true,
      data: connections
    });
  } catch (error) {
    console.error('Error fetching chapter connections:', error);
    return NextResponse.json(
      { error: 'Failed to fetch chapter connections' },
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

    const connection = await chapterConnectionsService.createChapterConnection({
      fromChapter: data.fromChapter,
      toChapter: data.toChapter,
      connectionType: data.connectionType,
      allowMemberExchange: data.allowMemberExchange,
      allowResourceSharing: data.allowResourceSharing,
      allowProjectSharing: data.allowProjectSharing,
      terms: data.terms,
      contactPersonId: session.user.id
    });

    return NextResponse.json({
      success: true,
      data: connection
    });
  } catch (error) {
    console.error('Error creating chapter connection:', error);
    return NextResponse.json(
      { error: 'Failed to create chapter connection' },
      { status: 500 }
    );
  }
}
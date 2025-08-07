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
    const memberId = searchParams.get('memberId');
    const chapter = searchParams.get('chapter');

    const exchanges = await chapterConnectionsService.getMemberExchanges(
      memberId || undefined,
      chapter || undefined
    );

    return NextResponse.json({
      success: true,
      data: exchanges
    });
  } catch (error) {
    console.error('Error fetching member exchanges:', error);
    return NextResponse.json(
      { error: 'Failed to fetch member exchanges' },
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

    const exchange = await chapterConnectionsService.createMemberExchange({
      memberId: data.memberId || session.user.id,
      originChapter: data.originChapter,
      targetChapter: data.targetChapter,
      exchangeType: data.exchangeType,
      purpose: data.purpose,
      duration: data.duration
    });

    return NextResponse.json({
      success: true,
      data: exchange
    });
  } catch (error) {
    console.error('Error creating member exchange:', error);
    return NextResponse.json(
      { error: 'Failed to create member exchange' },
      { status: 500 }
    );
  }
}
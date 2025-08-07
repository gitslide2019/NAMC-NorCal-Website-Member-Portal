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

    const opportunities = await chapterConnectionsService.getCrossChapterOpportunities(
      chapter || undefined
    );

    return NextResponse.json({
      success: true,
      data: opportunities
    });
  } catch (error) {
    console.error('Error fetching cross-chapter opportunities:', error);
    return NextResponse.json(
      { error: 'Failed to fetch cross-chapter opportunities' },
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

    const opportunity = await chapterConnectionsService.shareOpportunityAcrossChapters({
      originalOpportunityId: data.originalOpportunityId,
      originChapter: data.originChapter,
      targetChapters: data.targetChapters,
      sharingType: data.sharingType,
      title: data.title,
      description: data.description,
      estimatedValue: data.estimatedValue,
      expirationDate: data.expirationDate ? new Date(data.expirationDate) : undefined
    });

    return NextResponse.json({
      success: true,
      data: opportunity
    });
  } catch (error) {
    console.error('Error sharing opportunity across chapters:', error);
    return NextResponse.json(
      { error: 'Failed to share opportunity across chapters' },
      { status: 500 }
    );
  }
}
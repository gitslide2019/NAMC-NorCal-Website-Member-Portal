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
    const memberId = searchParams.get('memberId');

    const projects = await chapterConnectionsService.getInterChapterProjects(
      chapter || undefined,
      memberId || undefined
    );

    return NextResponse.json({
      success: true,
      data: projects
    });
  } catch (error) {
    console.error('Error fetching inter-chapter projects:', error);
    return NextResponse.json(
      { error: 'Failed to fetch inter-chapter projects' },
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

    const project = await chapterConnectionsService.createInterChapterProject({
      title: data.title,
      description: data.description,
      projectType: data.projectType,
      leadChapter: data.leadChapter,
      participatingChapters: data.participatingChapters,
      leadMemberId: data.leadMemberId || session.user.id,
      memberIds: data.memberIds || [session.user.id],
      estimatedValue: data.estimatedValue,
      projectLocation: data.projectLocation,
      memberAllocation: data.memberAllocation,
      resourceSharing: data.resourceSharing,
      revenueSharing: data.revenueSharing
    });

    return NextResponse.json({
      success: true,
      data: project
    });
  } catch (error) {
    console.error('Error creating inter-chapter project:', error);
    return NextResponse.json(
      { error: 'Failed to create inter-chapter project' },
      { status: 500 }
    );
  }
}
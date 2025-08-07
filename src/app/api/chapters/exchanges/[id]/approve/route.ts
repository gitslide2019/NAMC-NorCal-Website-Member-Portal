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

    const exchange = await chapterConnectionsService.approveMemberExchange(params.id);

    return NextResponse.json({
      success: true,
      data: exchange
    });
  } catch (error) {
    console.error('Error approving member exchange:', error);
    return NextResponse.json(
      { error: 'Failed to approve member exchange' },
      { status: 500 }
    );
  }
}
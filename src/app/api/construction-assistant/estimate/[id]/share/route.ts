import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const estimateId = params.id;

    // Verify estimate ownership
    const estimate = await prisma.costEstimate.findFirst({
      where: {
        id: estimateId,
        memberId: session.user.id
      }
    });

    if (!estimate) {
      return NextResponse.json({ error: 'Estimate not found' }, { status: 404 });
    }

    // Generate share token
    const shareToken = generateShareToken();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Update estimate with share token
    await prisma.costEstimate.update({
      where: { id: estimateId },
      data: {
        shareToken,
        shareExpiresAt: expiresAt,
        isShared: true
      }
    });

    // Generate share URL
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const shareUrl = `${baseUrl}/shared/estimate/${shareToken}`;

    return NextResponse.json({
      success: true,
      shareUrl,
      expiresAt: expiresAt.toISOString()
    });
  } catch (error) {
    console.error('Share error:', error);
    return NextResponse.json(
      { error: 'Failed to share estimate' },
      { status: 500 }
    );
  }
}

function generateShareToken(): string {
  return `share_${Date.now()}_${Math.random().toString(36).substr(2, 12)}`;
}
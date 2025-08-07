/**
 * Digital Product Streaming API
 * Handles secure streaming URLs for video/audio content
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';
import { sign } from 'jsonwebtoken';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { productId, fileId } = body;

    if (!productId || !fileId) {
      return NextResponse.json(
        { success: false, error: 'Product ID and file ID are required' },
        { status: 400 }
      );
    }

    // Verify user has access to this product
    const hasAccess = await verifyProductAccess(session.user.id, productId);
    
    if (!hasAccess.success) {
      return NextResponse.json(
        { success: false, error: hasAccess.error },
        { status: 403 }
      );
    }

    const product = hasAccess.product;
    const specifications = product.specifications ? JSON.parse(product.specifications) : {};

    // Generate secure streaming URL with expiration
    const streamToken = sign(
      {
        userId: session.user.id,
        productId,
        fileId,
        type: 'stream',
        exp: Math.floor(Date.now() / 1000) + (60 * 60 * 2), // 2 hours for streaming
      },
      process.env.NEXTAUTH_SECRET!
    );

    // Generate streaming URL based on file type
    const streamUrl = generateSecureStreamUrl(productId, fileId, streamToken);

    // Update last accessed time
    specifications.lastAccessed = new Date().toISOString();
    specifications.streamCount = (specifications.streamCount || 0) + 1;

    await prisma.product.update({
      where: { id: productId },
      data: {
        specifications: JSON.stringify(specifications),
      },
    });

    // Log streaming activity
    await logStreamActivity(session.user.id, productId, fileId);

    return NextResponse.json({
      success: true,
      streamUrl,
      expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours
    });
  } catch (error) {
    console.error('Error generating stream URL:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to generate stream URL',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

async function verifyProductAccess(userId: string, productId: string) {
  try {
    // Check if user has purchased this product
    const order = await prisma.order.findFirst({
      where: {
        memberId: userId,
        paymentStatus: 'PAID',
        status: { in: ['CONFIRMED', 'DELIVERED'] },
        items: {
          some: {
            productId: productId,
          },
        },
      },
      include: {
        items: {
          where: { productId },
          include: { product: true },
        },
      },
    });

    if (!order || order.items.length === 0) {
      return { success: false, error: 'Product not found in your purchases' };
    }

    const product = order.items[0].product;
    
    if (!product.isDigital) {
      return { success: false, error: 'Product is not a digital product' };
    }

    const specifications = product.specifications ? JSON.parse(product.specifications) : {};
    const digitalAccess = specifications.digitalAccess;

    // Check if digital access has been granted
    if (!digitalAccess || digitalAccess.grantedTo !== userId) {
      return { success: false, error: 'Digital access not granted for this product' };
    }

    // Check if access has expired
    if (digitalAccess.expirationDate && new Date(digitalAccess.expirationDate) < new Date()) {
      return { success: false, error: 'Digital access has expired' };
    }

    return { success: true, product };
  } catch (error) {
    console.error('Error verifying product access:', error);
    return { success: false, error: 'Failed to verify product access' };
  }
}

function generateSecureStreamUrl(productId: string, fileId: string, token: string): string {
  // In a real implementation, this would generate streaming URLs for different file types:
  // - Video: HLS or DASH streaming URLs
  // - Audio: Progressive download or streaming URLs
  // - PDF: Secure viewer URLs
  
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
  
  // For video/audio files, you might use a CDN with signed URLs
  // For PDF files, you might use a secure document viewer
  
  return `${baseUrl}/api/shop/digital-access/stream/${productId}/${fileId}?token=${token}`;
}

async function logStreamActivity(userId: string, productId: string, fileId: string) {
  try {
    // Log streaming activity for analytics
    console.log(`Stream activity: User ${userId} streamed file ${fileId} from product ${productId}`);
    
    // In a real implementation, you might:
    // 1. Log to an analytics service
    // 2. Track viewing time and completion rates
    // 3. Store in a dedicated streaming_logs table
    // 4. Update user engagement metrics
  } catch (error) {
    console.error('Error logging stream activity:', error);
  }
}
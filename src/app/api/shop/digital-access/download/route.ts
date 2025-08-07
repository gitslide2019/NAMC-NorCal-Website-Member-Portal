/**
 * Digital Product Download API
 * Handles secure file downloads for digital products
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

    // Check download limits
    if (specifications.maxDownloads && specifications.downloadCount >= specifications.maxDownloads) {
      return NextResponse.json(
        { success: false, error: 'Download limit reached for this product' },
        { status: 403 }
      );
    }

    // Generate secure download URL with expiration
    const downloadToken = sign(
      {
        userId: session.user.id,
        productId,
        fileId,
        exp: Math.floor(Date.now() / 1000) + (60 * 15), // 15 minutes
      },
      process.env.NEXTAUTH_SECRET!
    );

    // In a real implementation, this would be a secure file storage URL
    // For now, we'll generate a mock download URL
    const downloadUrl = generateSecureDownloadUrl(productId, fileId, downloadToken);

    // Update download count
    specifications.downloadCount = (specifications.downloadCount || 0) + 1;
    specifications.lastAccessed = new Date().toISOString();

    await prisma.product.update({
      where: { id: productId },
      data: {
        specifications: JSON.stringify(specifications),
      },
    });

    // Log download activity
    await logDownloadActivity(session.user.id, productId, fileId);

    return NextResponse.json({
      success: true,
      downloadUrl,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(), // 15 minutes
    });
  } catch (error) {
    console.error('Error generating download URL:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to generate download URL',
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

function generateSecureDownloadUrl(productId: string, fileId: string, token: string): string {
  // In a real implementation, this would generate a signed URL to a secure file storage service
  // like AWS S3, Google Cloud Storage, or Azure Blob Storage
  
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
  return `${baseUrl}/api/shop/digital-access/files/${productId}/${fileId}?token=${token}`;
}

async function logDownloadActivity(userId: string, productId: string, fileId: string) {
  try {
    // In a real implementation, you might want to log this to a separate analytics table
    // For now, we'll just log to console
    console.log(`Download activity: User ${userId} downloaded file ${fileId} from product ${productId}`);
    
    // You could also send this to an analytics service like Google Analytics, Mixpanel, etc.
    // or store it in a dedicated downloads table for reporting
  } catch (error) {
    console.error('Error logging download activity:', error);
  }
}
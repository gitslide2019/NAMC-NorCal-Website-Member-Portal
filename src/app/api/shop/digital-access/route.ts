/**
 * Digital Product Access API Routes
 * Handles digital product delivery and access management
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get('memberId') || session.user.id;

    // Verify user can access this member's digital products
    if (memberId !== session.user.id && session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }

    // Get user's orders with digital products
    const orders = await prisma.order.findMany({
      where: {
        memberId,
        paymentStatus: 'PAID',
        status: { in: ['CONFIRMED', 'DELIVERED'] },
      },
      include: {
        items: {
          include: {
            product: {
              where: { isDigital: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Transform orders into digital products with access information
    const digitalProducts = [];

    for (const order of orders) {
      for (const item of order.items) {
        if (!item.product.isDigital) continue;

        const product = item.product;
        const specifications = product.specifications ? JSON.parse(product.specifications) : {};
        
        // Check if digital access has been granted
        const digitalAccess = specifications.digitalAccess;
        const hasAccess = digitalAccess && digitalAccess.grantedTo === memberId;
        
        // Determine access level
        let accessLevel = 'PREVIEW';
        if (hasAccess) {
          if (digitalAccess.expirationDate && new Date(digitalAccess.expirationDate) < new Date()) {
            accessLevel = 'EXPIRED';
          } else {
            accessLevel = 'FULL';
          }
        }

        // Mock file structure (in a real implementation, this would come from a file management system)
        const files = generateMockFiles(product, specifications);

        digitalProducts.push({
          id: product.id,
          name: product.name,
          description: product.description,
          category: product.category,
          productType: specifications.productType || 'guide',
          accessLevel,
          purchaseDate: order.createdAt.toISOString(),
          expirationDate: digitalAccess?.expirationDate,
          downloadCount: specifications.downloadCount || 0,
          maxDownloads: specifications.maxDownloads,
          fileSize: specifications.totalFileSize,
          duration: specifications.duration,
          progress: specifications.progress || 0,
          lastAccessed: specifications.lastAccessed,
          files,
          metadata: {
            author: specifications.author,
            version: specifications.version,
            format: specifications.format,
            language: specifications.language || 'English',
            requirements: specifications.requirements || [],
          },
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: digitalProducts,
    });
  } catch (error) {
    console.error('Error fetching digital products:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch digital products',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

function generateMockFiles(product: any, specifications: any) {
  // In a real implementation, this would query a file management system
  // For now, we'll generate mock files based on product type
  
  const files = [];
  const productType = specifications.productType || 'guide';

  switch (productType) {
    case 'course':
      files.push(
        {
          id: `${product.id}-intro`,
          name: 'Course Introduction.mp4',
          type: 'video',
          size: 150 * 1024 * 1024, // 150MB
          isPreview: true,
          requiresAuth: false,
        },
        {
          id: `${product.id}-materials`,
          name: 'Course Materials.pdf',
          type: 'pdf',
          size: 5 * 1024 * 1024, // 5MB
          isPreview: false,
          requiresAuth: true,
        },
        {
          id: `${product.id}-videos`,
          name: 'Full Video Course.zip',
          type: 'zip',
          size: 2 * 1024 * 1024 * 1024, // 2GB
          isPreview: false,
          requiresAuth: true,
        }
      );
      break;

    case 'ebook':
      files.push(
        {
          id: `${product.id}-preview`,
          name: 'Preview Chapter.pdf',
          type: 'pdf',
          size: 2 * 1024 * 1024, // 2MB
          isPreview: true,
          requiresAuth: false,
        },
        {
          id: `${product.id}-full`,
          name: `${product.name}.pdf`,
          type: 'pdf',
          size: 15 * 1024 * 1024, // 15MB
          isPreview: false,
          requiresAuth: true,
        }
      );
      break;

    case 'video':
      files.push(
        {
          id: `${product.id}-trailer`,
          name: 'Video Trailer.mp4',
          type: 'video',
          size: 50 * 1024 * 1024, // 50MB
          isPreview: true,
          requiresAuth: false,
        },
        {
          id: `${product.id}-hd`,
          name: `${product.name} - HD.mp4`,
          type: 'video',
          size: 800 * 1024 * 1024, // 800MB
          isPreview: false,
          requiresAuth: true,
        }
      );
      break;

    case 'audio':
      files.push(
        {
          id: `${product.id}-sample`,
          name: 'Audio Sample.mp3',
          type: 'audio',
          size: 5 * 1024 * 1024, // 5MB
          isPreview: true,
          requiresAuth: false,
        },
        {
          id: `${product.id}-full`,
          name: `${product.name}.mp3`,
          type: 'audio',
          size: 120 * 1024 * 1024, // 120MB
          isPreview: false,
          requiresAuth: true,
        }
      );
      break;

    case 'software':
      files.push(
        {
          id: `${product.id}-readme`,
          name: 'README.txt',
          type: 'other',
          size: 1024, // 1KB
          isPreview: true,
          requiresAuth: false,
        },
        {
          id: `${product.id}-installer`,
          name: `${product.name}-installer.zip`,
          type: 'zip',
          size: 500 * 1024 * 1024, // 500MB
          isPreview: false,
          requiresAuth: true,
        }
      );
      break;

    case 'template':
      files.push(
        {
          id: `${product.id}-preview`,
          name: 'Template Preview.pdf',
          type: 'pdf',
          size: 1 * 1024 * 1024, // 1MB
          isPreview: true,
          requiresAuth: false,
        },
        {
          id: `${product.id}-files`,
          name: 'Template Files.zip',
          type: 'zip',
          size: 25 * 1024 * 1024, // 25MB
          isPreview: false,
          requiresAuth: true,
        }
      );
      break;

    default: // guide
      files.push(
        {
          id: `${product.id}-guide`,
          name: `${product.name}.pdf`,
          type: 'pdf',
          size: 10 * 1024 * 1024, // 10MB
          isPreview: false,
          requiresAuth: true,
        }
      );
  }

  return files;
}

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
    const { action, productId, progress } = body;

    switch (action) {
      case 'update_progress':
        if (!productId || progress === undefined) {
          return NextResponse.json(
            { success: false, error: 'Product ID and progress are required' },
            { status: 400 }
          );
        }

        // Update progress in product specifications
        const product = await prisma.product.findUnique({
          where: { id: productId },
        });

        if (!product) {
          return NextResponse.json(
            { success: false, error: 'Product not found' },
            { status: 404 }
          );
        }

        const specifications = product.specifications ? JSON.parse(product.specifications) : {};
        specifications.progress = Math.max(0, Math.min(100, progress));
        specifications.lastAccessed = new Date().toISOString();

        await prisma.product.update({
          where: { id: productId },
          data: {
            specifications: JSON.stringify(specifications),
          },
        });

        return NextResponse.json({
          success: true,
          data: { progress: specifications.progress },
        });

      case 'track_access':
        // Track when a user accesses digital content
        const accessProduct = await prisma.product.findUnique({
          where: { id: productId },
        });

        if (!accessProduct) {
          return NextResponse.json(
            { success: false, error: 'Product not found' },
            { status: 404 }
          );
        }

        const accessSpecs = accessProduct.specifications ? JSON.parse(accessProduct.specifications) : {};
        accessSpecs.lastAccessed = new Date().toISOString();
        accessSpecs.accessCount = (accessSpecs.accessCount || 0) + 1;

        await prisma.product.update({
          where: { id: productId },
          data: {
            specifications: JSON.stringify(accessSpecs),
          },
        });

        return NextResponse.json({
          success: true,
          data: { lastAccessed: accessSpecs.lastAccessed },
        });

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Error processing digital access request:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process request',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
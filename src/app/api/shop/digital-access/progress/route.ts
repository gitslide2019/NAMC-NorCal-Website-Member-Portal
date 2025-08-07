/**
 * Digital Product Progress API
 * Handles progress tracking for courses and other trackable content
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { productId, progress, lessonId, timeSpent, completed } = body;

    if (!productId || progress === undefined) {
      return NextResponse.json(
        { success: false, error: 'Product ID and progress are required' },
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

    // Update progress information
    const currentProgress = Math.max(0, Math.min(100, progress));
    specifications.progress = currentProgress;
    specifications.lastAccessed = new Date().toISOString();

    // Track lesson-specific progress if provided
    if (lessonId) {
      if (!specifications.lessonProgress) {
        specifications.lessonProgress = {};
      }
      
      specifications.lessonProgress[lessonId] = {
        progress: currentProgress,
        timeSpent: (specifications.lessonProgress[lessonId]?.timeSpent || 0) + (timeSpent || 0),
        completed: completed || false,
        lastAccessed: new Date().toISOString(),
      };
    }

    // Track total time spent
    if (timeSpent) {
      specifications.totalTimeSpent = (specifications.totalTimeSpent || 0) + timeSpent;
    }

    // Mark as completed if progress reaches 100%
    if (currentProgress >= 100 && !specifications.completedAt) {
      specifications.completedAt = new Date().toISOString();
      specifications.completed = true;
    }

    // Update the product with new progress
    await prisma.product.update({
      where: { id: productId },
      data: {
        specifications: JSON.stringify(specifications),
      },
    });

    // Log progress update
    await logProgressUpdate(session.user.id, productId, currentProgress, lessonId);

    return NextResponse.json({
      success: true,
      data: {
        progress: currentProgress,
        completed: specifications.completed || false,
        completedAt: specifications.completedAt,
        totalTimeSpent: specifications.totalTimeSpent || 0,
        lastAccessed: specifications.lastAccessed,
      },
    });
  } catch (error) {
    console.error('Error updating progress:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update progress',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

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
    const productId = searchParams.get('productId');

    if (!productId) {
      return NextResponse.json(
        { success: false, error: 'Product ID is required' },
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

    // Return detailed progress information
    const progressData = {
      productId,
      progress: specifications.progress || 0,
      completed: specifications.completed || false,
      completedAt: specifications.completedAt,
      totalTimeSpent: specifications.totalTimeSpent || 0,
      lastAccessed: specifications.lastAccessed,
      lessonProgress: specifications.lessonProgress || {},
      startedAt: specifications.startedAt,
      milestones: specifications.milestones || [],
    };

    return NextResponse.json({
      success: true,
      data: progressData,
    });
  } catch (error) {
    console.error('Error fetching progress:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch progress',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
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
    const { action, productId, milestoneId, lessonId, note } = body;

    if (!productId) {
      return NextResponse.json(
        { success: false, error: 'Product ID is required' },
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

    switch (action) {
      case 'start_course':
        if (!specifications.startedAt) {
          specifications.startedAt = new Date().toISOString();
          specifications.progress = specifications.progress || 0;
        }
        break;

      case 'complete_milestone':
        if (!specifications.milestones) {
          specifications.milestones = [];
        }
        
        const milestone = {
          id: milestoneId,
          completedAt: new Date().toISOString(),
          note: note || '',
        };
        
        specifications.milestones.push(milestone);
        break;

      case 'bookmark_lesson':
        if (!specifications.bookmarks) {
          specifications.bookmarks = [];
        }
        
        const bookmark = {
          lessonId,
          bookmarkedAt: new Date().toISOString(),
          note: note || '',
        };
        
        specifications.bookmarks.push(bookmark);
        break;

      case 'add_note':
        if (!specifications.notes) {
          specifications.notes = [];
        }
        
        const noteEntry = {
          id: Date.now().toString(),
          lessonId: lessonId || null,
          content: note,
          createdAt: new Date().toISOString(),
        };
        
        specifications.notes.push(noteEntry);
        break;

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }

    specifications.lastAccessed = new Date().toISOString();

    // Update the product with new data
    await prisma.product.update({
      where: { id: productId },
      data: {
        specifications: JSON.stringify(specifications),
      },
    });

    return NextResponse.json({
      success: true,
      data: { message: `${action} completed successfully` },
    });
  } catch (error) {
    console.error('Error processing progress action:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process action',
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

async function logProgressUpdate(userId: string, productId: string, progress: number, lessonId?: string) {
  try {
    // Log progress update for analytics
    console.log(`Progress update: User ${userId} reached ${progress}% in product ${productId}${lessonId ? ` (lesson: ${lessonId})` : ''}`);
    
    // In a real implementation, you might:
    // 1. Send to analytics service
    // 2. Update user engagement metrics
    // 3. Trigger completion certificates
    // 4. Send progress notifications
    // 5. Update learning path recommendations
  } catch (error) {
    console.error('Error logging progress update:', error);
  }
}
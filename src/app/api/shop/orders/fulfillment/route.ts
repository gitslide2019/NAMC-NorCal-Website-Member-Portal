/**
 * Order Fulfillment API Routes
 * Handles automated order fulfillment, shipping, and tracking
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';
import ShopService from '@/lib/services/shop.service';

const prisma = new PrismaClient();
const shopService = new ShopService();

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
    const { action, orderId, options } = body;

    if (!orderId) {
      return NextResponse.json(
        { success: false, error: 'Order ID required' },
        { status: 400 }
      );
    }

    // Verify user has access to this order (admin or order owner)
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { user: true },
    });

    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      );
    }

    const isAdmin = session.user.memberType === 'ADMIN';
    const isOrderOwner = order.memberId === session.user.id;

    if (!isAdmin && !isOrderOwner) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }

    switch (action) {
      case 'complete_fulfillment':
        const fulfillmentResult = await shopService.processOrderFulfillment(orderId);
        
        return NextResponse.json({
          success: fulfillmentResult.success,
          data: fulfillmentResult,
          message: fulfillmentResult.success 
            ? 'Order fulfillment completed successfully' 
            : 'Order fulfillment completed with errors',
        });

      case 'submit_to_production':
        const productionResult = await shopService.submitPrintifyOrderToProduction(orderId);
        
        return NextResponse.json({
          success: productionResult.success,
          data: productionResult,
          message: productionResult.success 
            ? 'Order submitted to production successfully' 
            : 'Failed to submit order to production',
        });

      case 'grant_digital_access':
        const accessResult = await shopService.grantDigitalContentAccess(orderId);
        
        return NextResponse.json({
          success: accessResult.success,
          data: accessResult,
          message: accessResult.success 
            ? `Digital access granted for ${accessResult.grantedProducts.length} products` 
            : 'Failed to grant digital access',
        });

      case 'sync_inventory':
        await shopService.updateInventoryAfterOrder(orderId);
        
        return NextResponse.json({
          success: true,
          message: 'Inventory synchronized successfully',
        });

      case 'award_points':
        const pointsResult = await shopService.awardLoyaltyPoints(orderId);
        
        return NextResponse.json({
          success: pointsResult.success,
          data: pointsResult,
          message: pointsResult.success 
            ? `Awarded ${pointsResult.pointsAwarded} loyalty points` 
            : 'Failed to award loyalty points',
        });

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Error processing fulfillment request:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process fulfillment request',
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
    const orderId = searchParams.get('orderId');
    const action = searchParams.get('action');

    if (!orderId) {
      return NextResponse.json(
        { success: false, error: 'Order ID required' },
        { status: 400 }
      );
    }

    // Verify user has access to this order
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { 
        user: true,
        items: {
          include: { product: true },
        },
      },
    });

    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      );
    }

    const isAdmin = session.user.memberType === 'ADMIN';
    const isOrderOwner = order.memberId === session.user.id;

    if (!isAdmin && !isOrderOwner) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }

    switch (action) {
      case 'status':
        // Get comprehensive order status including external services
        const externalStatus = await shopService.getOrderStatus(orderId);
        
        return NextResponse.json({
          success: true,
          data: {
            order,
            externalStatus,
            fulfillmentStatus: {
              hasShopifyOrder: !!order.shopifyOrderId,
              hasPrintifyOrder: !!order.printifyOrderId,
              hasDigitalProducts: order.items.some(item => item.product.isDigital),
              hasPrintOnDemandProducts: order.items.some(item => !!item.product.printifyProductId),
            },
          },
        });

      case 'tracking':
        const trackingResult = await shopService.getShippingAndTracking(orderId);
        
        return NextResponse.json({
          success: trackingResult.success,
          data: trackingResult.tracking,
          error: trackingResult.error,
        });

      case 'loyalty_status':
        // Get user's current loyalty points and tier information
        const userSpecs = JSON.parse(order.user?.hubspotSyncError || '{}');
        const loyaltyData = {
          currentPoints: userSpecs.loyaltyPoints || 0,
          currentTier: order.user?.memberType || 'REGULAR',
          pointsHistory: userSpecs.pointsHistory || [],
          lastPointsAwarded: userSpecs.lastPointsAwarded || 0,
          lastPointsAwardedDate: userSpecs.lastPointsAwardedDate,
        };
        
        return NextResponse.json({
          success: true,
          data: loyaltyData,
        });

      case 'fulfillment_history':
        // Get fulfillment history and status for this order
        const fulfillmentHistory = {
          orderCreated: order.createdAt,
          lastUpdated: order.updatedAt,
          currentStatus: order.status,
          paymentStatus: order.paymentStatus,
          shopifySync: {
            status: order.shopifySyncStatus,
            lastSync: order.shopifyLastSync,
            orderId: order.shopifyOrderId,
            orderNumber: order.shopifyOrderNumber,
          },
          printifySync: {
            status: order.printifySyncStatus,
            lastSync: order.printifyLastSync,
            orderId: order.printifyOrderId,
            externalId: order.printifyExternalId,
          },
          hubspotSync: {
            status: order.hubspotSyncStatus,
            lastSync: order.hubspotLastSync,
            objectId: order.hubspotObjectId,
          },
        };
        
        return NextResponse.json({
          success: true,
          data: fulfillmentHistory,
        });

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Error fetching fulfillment data:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch fulfillment data',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
/**
 * Shop Sync API Routes
 * Handles automated synchronization with Shopify and Printify
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import ShopService from '@/lib/services/shop.service';

const shopService = new ShopService();

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    // Only allow admin users to trigger sync
    if (!session?.user || session.user.memberType !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { syncType } = body;

    switch (syncType) {
      case 'shopify_products':
        const shopifyResult = await shopService.syncShopifyProducts();
        return NextResponse.json({
          success: true,
          data: shopifyResult,
          message: `Synced ${shopifyResult.productsProcessed} products from Shopify`,
        });

      case 'shopify_inventory':
        const inventoryResult = await shopService.syncShopifyInventory();
        return NextResponse.json({
          success: true,
          data: inventoryResult,
          message: `Updated inventory for ${inventoryResult.productsProcessed} products`,
        });

      case 'printify_products':
        const printifyResult = await shopService.syncPrintifyProducts();
        return NextResponse.json({
          success: true,
          data: printifyResult,
          message: `Synced ${printifyResult.productsProcessed} products from Printify`,
        });

      case 'all_products':
        const allResults = await shopService.syncAllProducts();
        return NextResponse.json({
          success: true,
          data: allResults,
          message: `Synced ${allResults.shopify.productsProcessed} Shopify products and ${allResults.printify.productsProcessed} Printify products`,
        });

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid sync type' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Error during sync operation:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Sync operation failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.memberType !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    switch (action) {
      case 'sync_status':
        // Get sync status from database
        const { PrismaClient } = await import('@prisma/client');
        const prisma = new PrismaClient();

        const syncStats = await prisma.product.groupBy({
          by: ['shopifySyncStatus', 'printifySyncStatus'],
          _count: {
            id: true,
          },
        });

        const lastSyncTimes = await prisma.product.aggregate({
          _max: {
            shopifyLastSync: true,
            printifyLastSync: true,
          },
        });

        await prisma.$disconnect();

        return NextResponse.json({
          success: true,
          data: {
            syncStats,
            lastSyncTimes,
          },
        });

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Error fetching sync status:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch sync status',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
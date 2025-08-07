/**
 * Shop Inventory API Routes
 * Handles inventory updates and synchronization
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';
import ShopifyService from '@/lib/services/shopify-api.service';

const prisma = new PrismaClient();

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { productId, inventory } = body;

    if (!productId || inventory === undefined) {
      return NextResponse.json(
        { success: false, error: 'Product ID and inventory are required' },
        { status: 400 }
      );
    }

    // Get the product to check if it has Shopify integration
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      );
    }

    // Update local inventory
    const updatedProduct = await prisma.product.update({
      where: { id: productId },
      data: { 
        inventory: parseInt(inventory),
        updatedAt: new Date(),
      },
    });

    // Update Shopify inventory if product is synced with Shopify
    if (product.shopifyInventoryItemId) {
      try {
        const shopifyService = new ShopifyService();
        await shopifyService.updateInventoryLevel(
          parseInt(product.shopifyInventoryItemId),
          parseInt(inventory)
        );

        // Update sync status
        await prisma.product.update({
          where: { id: productId },
          data: {
            shopifyLastSync: new Date(),
            shopifySyncStatus: 'SYNCED',
            shopifySyncError: null,
          },
        });
      } catch (error) {
        console.error('Failed to update Shopify inventory:', error);
        
        // Update sync status to show error
        await prisma.product.update({
          where: { id: productId },
          data: {
            shopifySyncStatus: 'ERROR',
            shopifySyncError: error instanceof Error ? error.message : 'Unknown error',
          },
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: updatedProduct,
    });
  } catch (error) {
    console.error('Error updating inventory:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update inventory',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const lowStockOnly = searchParams.get('lowStock') === 'true';
    const category = searchParams.get('category');

    // Build where clause
    const where: any = {};
    
    if (lowStockOnly) {
      where.AND = [
        { isDigital: false },
        { printifyProductId: null },
        { inventory: { lte: 5 } },
      ];
    }
    
    if (category && category !== 'all') {
      where.category = category;
    }

    const products = await prisma.product.findMany({
      where,
      orderBy: [
        { inventory: 'asc' },
        { name: 'asc' },
      ],
      select: {
        id: true,
        name: true,
        category: true,
        sku: true,
        inventory: true,
        isDigital: true,
        isActive: true,
        shopifyProductId: true,
        printifyProductId: true,
        shopifyInventoryItemId: true,
        shopifyLastSync: true,
        shopifySyncStatus: true,
        printifyLastSync: true,
        printifySyncStatus: true,
        updatedAt: true,
      },
    });

    // Calculate inventory statistics
    const stats = {
      totalProducts: products.length,
      inStock: products.filter(p => p.isDigital || p.printifyProductId || p.inventory > 0).length,
      lowStock: products.filter(p => !p.isDigital && !p.printifyProductId && p.inventory > 0 && p.inventory <= 5).length,
      outOfStock: products.filter(p => !p.isDigital && !p.printifyProductId && p.inventory === 0).length,
      needsSync: products.filter(p => 
        p.shopifySyncStatus === 'PENDING' || 
        p.printifySyncStatus === 'PENDING' ||
        (p.shopifyLastSync && (Date.now() - new Date(p.shopifyLastSync).getTime()) > 24 * 60 * 60 * 1000)
      ).length,
    };

    return NextResponse.json({
      success: true,
      data: products,
      stats,
    });
  } catch (error) {
    console.error('Error fetching inventory:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch inventory',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { action, productIds, adjustments } = body;

    switch (action) {
      case 'bulk_update':
        if (!Array.isArray(adjustments)) {
          return NextResponse.json(
            { success: false, error: 'Adjustments array is required' },
            { status: 400 }
          );
        }

        const results = [];
        const shopifyService = new ShopifyService();

        for (const adjustment of adjustments) {
          try {
            const { productId, inventory } = adjustment;
            
            // Get product for Shopify sync
            const product = await prisma.product.findUnique({
              where: { id: productId },
            });

            if (!product) {
              results.push({ productId, success: false, error: 'Product not found' });
              continue;
            }

            // Update local inventory
            await prisma.product.update({
              where: { id: productId },
              data: { 
                inventory: parseInt(inventory),
                updatedAt: new Date(),
              },
            });

            // Update Shopify if applicable
            if (product.shopifyInventoryItemId) {
              try {
                await shopifyService.updateInventoryLevel(
                  parseInt(product.shopifyInventoryItemId),
                  parseInt(inventory)
                );

                await prisma.product.update({
                  where: { id: productId },
                  data: {
                    shopifyLastSync: new Date(),
                    shopifySyncStatus: 'SYNCED',
                    shopifySyncError: null,
                  },
                });
              } catch (error) {
                await prisma.product.update({
                  where: { id: productId },
                  data: {
                    shopifySyncStatus: 'ERROR',
                    shopifySyncError: error instanceof Error ? error.message : 'Unknown error',
                  },
                });
              }
            }

            results.push({ productId, success: true });
          } catch (error) {
            results.push({ 
              productId: adjustment.productId, 
              success: false, 
              error: error instanceof Error ? error.message : 'Unknown error' 
            });
          }
        }

        return NextResponse.json({
          success: true,
          data: results,
        });

      case 'sync_all_inventory':
        try {
          const shopifyService = new ShopifyService();
          const inventoryLevels = await shopifyService.getInventoryLevels();
          
          let syncedCount = 0;
          const errors = [];

          for (const level of inventoryLevels) {
            try {
              const products = await prisma.product.findMany({
                where: {
                  shopifyInventoryItemId: level.inventory_item_id.toString(),
                },
              });

              for (const product of products) {
                await prisma.product.update({
                  where: { id: product.id },
                  data: { 
                    inventory: level.available,
                    shopifyLastSync: new Date(),
                    shopifySyncStatus: 'SYNCED',
                    shopifySyncError: null,
                  },
                });
                syncedCount++;
              }
            } catch (error) {
              errors.push(`Error syncing inventory item ${level.inventory_item_id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          }

          return NextResponse.json({
            success: true,
            data: {
              syncedCount,
              errors,
            },
          });
        } catch (error) {
          return NextResponse.json(
            {
              success: false,
              error: 'Failed to sync inventory from Shopify',
              details: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
          );
        }

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Error processing inventory request:', error);
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
/**
 * Shop API Routes
 * Handles product catalog and shop operations
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import ShopService from '@/lib/services/shop.service';

const shopService = new ShopService();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') || undefined;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined;
    const admin = searchParams.get('admin') === 'true';
    
    // Check if user is a member for pricing
    const session = await getServerSession(authOptions);
    const isMember = !!session?.user;

    // For admin requests, return additional product management data
    if (admin) {
      if (!session?.user || session.user.role !== 'ADMIN') {
        return NextResponse.json(
          { success: false, error: 'Admin access required' },
          { status: 403 }
        );
      }

      const products = await shopService.getProductsForAdmin(category, limit);
      return NextResponse.json({
        success: true,
        data: products,
        isAdmin: true,
      });
    }

    const products = await shopService.getProducts(isMember, category, limit);

    return NextResponse.json({
      success: true,
      data: products,
      isMember,
    });
  } catch (error) {
    console.error('Error fetching shop products:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch products',
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
    const { action } = body;

    switch (action) {
      case 'sync_products':
        const syncResult = await shopService.syncAllProducts();
        return NextResponse.json({
          success: true,
          data: syncResult,
        });

      case 'sync_shopify_inventory':
        const inventoryResult = await shopService.syncShopifyInventory();
        return NextResponse.json({
          success: true,
          data: inventoryResult,
        });

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Error processing shop request:', error);
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
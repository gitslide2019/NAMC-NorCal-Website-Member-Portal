/**
 * Shop Search API Routes
 * Handles product search and filtering
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const category = searchParams.get('category');
    const minPrice = searchParams.get('minPrice');
    const maxPrice = searchParams.get('maxPrice');
    const digitalOnly = searchParams.get('digitalOnly') === 'true';
    const inStockOnly = searchParams.get('inStockOnly') === 'true';
    const sortBy = searchParams.get('sortBy') || 'name';
    const sortOrder = searchParams.get('sortOrder') || 'asc';
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 50;
    const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0;

    // Check if user is a member for pricing
    const session = await getServerSession(authOptions);
    const isMember = !!session?.user;

    // Build where clause for search
    const where: any = {
      isActive: true,
    };

    // Text search across multiple fields
    if (query) {
      where.OR = [
        { name: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
        { category: { contains: query, mode: 'insensitive' } },
        { sku: { contains: query, mode: 'insensitive' } },
      ];
    }

    // Category filter
    if (category && category !== 'all') {
      where.category = category;
    }

    // Price range filter
    if (minPrice || maxPrice) {
      const priceField = isMember ? 'memberPrice' : 'publicPrice';
      where[priceField] = {};
      
      if (minPrice) {
        where[priceField].gte = parseFloat(minPrice);
      }
      
      if (maxPrice) {
        where[priceField].lte = parseFloat(maxPrice);
      }
    }

    // Digital products filter
    if (digitalOnly) {
      where.isDigital = true;
    }

    // In stock filter
    if (inStockOnly) {
      where.OR = [
        { isDigital: true },
        { printifyProductId: { not: null } },
        { inventory: { gt: 0 } },
      ];
    }

    // Build orderBy clause
    const orderBy: any = {};
    switch (sortBy) {
      case 'name':
        orderBy.name = sortOrder;
        break;
      case 'price':
        orderBy[isMember && 'memberPrice' ? 'memberPrice' : 'publicPrice'] = sortOrder;
        break;
      case 'category':
        orderBy.category = sortOrder;
        break;
      case 'created':
        orderBy.createdAt = sortOrder;
        break;
      case 'updated':
        orderBy.updatedAt = sortOrder;
        break;
      default:
        orderBy.name = 'asc';
    }

    // Execute search query
    const [products, totalCount] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy,
        take: limit,
        skip: offset,
        select: {
          id: true,
          name: true,
          description: true,
          category: true,
          sku: true,
          publicPrice: true,
          memberPrice: true,
          isDigital: true,
          isActive: true,
          inventory: true,
          imageUrl: true,
          specifications: true,
          shopifyProductId: true,
          printifyProductId: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.product.count({ where }),
    ]);

    // Transform products to include appropriate pricing
    const transformedProducts = products.map(product => ({
      ...product,
      price: isMember && product.memberPrice ? product.memberPrice : product.publicPrice,
      specifications: product.specifications ? JSON.parse(product.specifications) : null,
    }));

    // Get search facets for filtering
    const facets = await getSearchFacets(where);

    return NextResponse.json({
      success: true,
      data: {
        products: transformedProducts,
        pagination: {
          total: totalCount,
          limit,
          offset,
          hasMore: offset + limit < totalCount,
        },
        facets,
        isMember,
      },
    });
  } catch (error) {
    console.error('Error searching products:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to search products',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

async function getSearchFacets(baseWhere: any) {
  try {
    // Get categories with counts
    const categories = await prisma.product.groupBy({
      by: ['category'],
      where: { ...baseWhere, category: undefined }, // Remove category filter for facets
      _count: { category: true },
      orderBy: { category: 'asc' },
    });

    // Get price ranges
    const priceStats = await prisma.product.aggregate({
      where: baseWhere,
      _min: { publicPrice: true },
      _max: { publicPrice: true },
      _avg: { publicPrice: true },
    });

    // Get digital vs physical counts
    const digitalCounts = await prisma.product.groupBy({
      by: ['isDigital'],
      where: baseWhere,
      _count: { isDigital: true },
    });

    // Get stock status counts
    const stockCounts = await prisma.$queryRaw`
      SELECT 
        CASE 
          WHEN "isDigital" = true OR "printifyProductId" IS NOT NULL THEN 'unlimited'
          WHEN "inventory" > 10 THEN 'in_stock'
          WHEN "inventory" > 0 THEN 'low_stock'
          ELSE 'out_of_stock'
        END as stock_status,
        COUNT(*) as count
      FROM "Product"
      WHERE "isActive" = true
      GROUP BY stock_status
    `;

    return {
      categories: categories.map(c => ({
        name: c.category,
        count: c._count.category,
      })),
      priceRange: {
        min: priceStats._min.publicPrice || 0,
        max: priceStats._max.publicPrice || 1000,
        avg: priceStats._avg.publicPrice || 0,
      },
      productTypes: digitalCounts.map(d => ({
        type: d.isDigital ? 'digital' : 'physical',
        count: d._count.isDigital,
      })),
      stockStatus: stockCounts,
    };
  } catch (error) {
    console.error('Error getting search facets:', error);
    return {
      categories: [],
      priceRange: { min: 0, max: 1000, avg: 0 },
      productTypes: [],
      stockStatus: [],
    };
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
    const { action, searchTerm, filters } = body;

    switch (action) {
      case 'save_search':
        // Save search for user (could be implemented as saved searches feature)
        // For now, just return success
        return NextResponse.json({
          success: true,
          message: 'Search saved successfully',
        });

      case 'get_suggestions':
        // Get search suggestions based on partial input
        if (!searchTerm || searchTerm.length < 2) {
          return NextResponse.json({
            success: true,
            data: { suggestions: [] },
          });
        }

        const suggestions = await prisma.product.findMany({
          where: {
            isActive: true,
            OR: [
              { name: { contains: searchTerm, mode: 'insensitive' } },
              { category: { contains: searchTerm, mode: 'insensitive' } },
              { sku: { contains: searchTerm, mode: 'insensitive' } },
            ],
          },
          select: {
            id: true,
            name: true,
            category: true,
            sku: true,
          },
          take: 10,
          orderBy: { name: 'asc' },
        });

        // Also get category suggestions
        const categorySuggestions = await prisma.product.findMany({
          where: {
            isActive: true,
            category: { contains: searchTerm, mode: 'insensitive' },
          },
          select: { category: true },
          distinct: ['category'],
          take: 5,
          orderBy: { category: 'asc' },
        });

        return NextResponse.json({
          success: true,
          data: {
            suggestions: {
              products: suggestions,
              categories: categorySuggestions.map(c => c.category),
            },
          },
        });

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Error processing search request:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process search request',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
/**
 * Shop Categories API Routes
 * Handles product category management and retrieval
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const includeCount = searchParams.get('includeCount') === 'true';
    const activeOnly = searchParams.get('activeOnly') !== 'false'; // Default to true

    // Check if user is a member for pricing context
    const session = await getServerSession(authOptions);
    const isMember = !!session?.user;

    if (includeCount) {
      // Get categories with product counts
      const categories = await prisma.product.groupBy({
        by: ['category'],
        where: {
          ...(activeOnly && { isActive: true }),
        },
        _count: { category: true },
        orderBy: { category: 'asc' },
      });

      const categoriesWithCount = categories.map(cat => ({
        name: cat.category,
        count: cat._count.category,
        slug: cat.category.toLowerCase().replace(/\s+/g, '-'),
      }));

      return NextResponse.json({
        success: true,
        data: categoriesWithCount,
        isMember,
      });
    } else {
      // Get unique categories only
      const categories = await prisma.product.findMany({
        where: {
          ...(activeOnly && { isActive: true }),
        },
        select: { category: true },
        distinct: ['category'],
        orderBy: { category: 'asc' },
      });

      const categoryNames = categories.map(cat => ({
        name: cat.category,
        slug: cat.category.toLowerCase().replace(/\s+/g, '-'),
      }));

      return NextResponse.json({
        success: true,
        data: categoryNames,
        isMember,
      });
    }
  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch categories',
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
    const { action, categoryName, newCategoryName, productIds } = body;

    switch (action) {
      case 'create_category':
        if (!categoryName) {
          return NextResponse.json(
            { success: false, error: 'Category name is required' },
            { status: 400 }
          );
        }

        // Check if category already exists
        const existingCategory = await prisma.product.findFirst({
          where: { category: categoryName },
        });

        if (existingCategory) {
          return NextResponse.json(
            { success: false, error: 'Category already exists' },
            { status: 400 }
          );
        }

        return NextResponse.json({
          success: true,
          message: 'Category can be created by adding products to it',
          data: { categoryName },
        });

      case 'rename_category':
        if (!categoryName || !newCategoryName) {
          return NextResponse.json(
            { success: false, error: 'Both current and new category names are required' },
            { status: 400 }
          );
        }

        // Update all products in the category
        const updateResult = await prisma.product.updateMany({
          where: { category: categoryName },
          data: { category: newCategoryName },
        });

        return NextResponse.json({
          success: true,
          message: `Renamed category "${categoryName}" to "${newCategoryName}"`,
          data: { 
            productsUpdated: updateResult.count,
            oldName: categoryName,
            newName: newCategoryName,
          },
        });

      case 'move_products':
        if (!newCategoryName || !Array.isArray(productIds) || productIds.length === 0) {
          return NextResponse.json(
            { success: false, error: 'New category name and product IDs are required' },
            { status: 400 }
          );
        }

        // Move specified products to new category
        const moveResult = await prisma.product.updateMany({
          where: { 
            id: { in: productIds },
          },
          data: { category: newCategoryName },
        });

        return NextResponse.json({
          success: true,
          message: `Moved ${moveResult.count} products to "${newCategoryName}"`,
          data: { 
            productsUpdated: moveResult.count,
            newCategory: newCategoryName,
          },
        });

      case 'delete_category':
        if (!categoryName) {
          return NextResponse.json(
            { success: false, error: 'Category name is required' },
            { status: 400 }
          );
        }

        // Check if category has products
        const productsInCategory = await prisma.product.count({
          where: { category: categoryName },
        });

        if (productsInCategory > 0) {
          return NextResponse.json(
            { 
              success: false, 
              error: `Cannot delete category "${categoryName}" because it contains ${productsInCategory} products. Move or delete the products first.` 
            },
            { status: 400 }
          );
        }

        return NextResponse.json({
          success: true,
          message: `Category "${categoryName}" has no products and can be considered deleted`,
          data: { categoryName },
        });

      case 'get_category_stats':
        // Get detailed statistics for all categories
        const stats = await prisma.product.groupBy({
          by: ['category'],
          _count: { category: true },
          _avg: { publicPrice: true },
          _min: { publicPrice: true },
          _max: { publicPrice: true },
          where: { isActive: true },
          orderBy: { category: 'asc' },
        });

        const categoryStats = await Promise.all(
          stats.map(async (stat) => {
            const digitalCount = await prisma.product.count({
              where: { 
                category: stat.category,
                isDigital: true,
                isActive: true,
              },
            });

            const physicalCount = await prisma.product.count({
              where: { 
                category: stat.category,
                isDigital: false,
                isActive: true,
              },
            });

            const lowStockCount = await prisma.product.count({
              where: { 
                category: stat.category,
                isDigital: false,
                inventory: { lte: 5 },
                isActive: true,
              },
            });

            return {
              name: stat.category,
              slug: stat.category.toLowerCase().replace(/\s+/g, '-'),
              totalProducts: stat._count.category,
              digitalProducts: digitalCount,
              physicalProducts: physicalCount,
              lowStockProducts: lowStockCount,
              averagePrice: stat._avg.publicPrice,
              minPrice: stat._min.publicPrice,
              maxPrice: stat._max.publicPrice,
            };
          })
        );

        return NextResponse.json({
          success: true,
          data: categoryStats,
        });

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Error processing category request:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process category request',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
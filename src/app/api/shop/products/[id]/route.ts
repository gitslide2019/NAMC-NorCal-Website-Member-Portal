/**
 * Individual Product Management API
 * Handles CRUD operations for specific products
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    const productId = params.id;

    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      );
    }

    // Check if user is a member for pricing
    const isMember = !!session?.user;
    
    const transformedProduct = {
      ...product,
      price: isMember && product.memberPrice ? product.memberPrice : product.publicPrice,
      specifications: product.specifications ? JSON.parse(product.specifications) : null,
    };

    return NextResponse.json({
      success: true,
      data: transformedProduct,
      isMember,
    });
  } catch (error) {
    console.error('Error fetching product:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch product',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      );
    }

    const productId = params.id;
    const body = await request.json();

    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      );
    }

    // Update product with provided fields
    const updateData: any = {};
    
    if (body.name !== undefined) updateData.name = body.name;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.category !== undefined) updateData.category = body.category;
    if (body.publicPrice !== undefined) updateData.publicPrice = parseFloat(body.publicPrice);
    if (body.memberPrice !== undefined) updateData.memberPrice = parseFloat(body.memberPrice);
    if (body.inventory !== undefined) updateData.inventory = parseInt(body.inventory);
    if (body.isActive !== undefined) updateData.isActive = body.isActive;
    if (body.isDigital !== undefined) updateData.isDigital = body.isDigital;
    if (body.imageUrl !== undefined) updateData.imageUrl = body.imageUrl;
    
    if (body.specifications !== undefined) {
      updateData.specifications = typeof body.specifications === 'string' 
        ? body.specifications 
        : JSON.stringify(body.specifications);
    }

    updateData.updatedAt = new Date();

    const updatedProduct = await prisma.product.update({
      where: { id: productId },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      data: {
        ...updatedProduct,
        specifications: updatedProduct.specifications ? JSON.parse(updatedProduct.specifications) : null,
      },
    });
  } catch (error) {
    console.error('Error updating product:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update product',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      );
    }

    const productId = params.id;

    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        orderItems: true,
        cartItems: true,
      },
    });

    if (!product) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      );
    }

    // Check if product has been ordered
    if (product.orderItems.length > 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Cannot delete product that has been ordered. Consider deactivating instead.' 
        },
        { status: 400 }
      );
    }

    // Remove from any shopping carts first
    if (product.cartItems.length > 0) {
      await prisma.shoppingCartItem.deleteMany({
        where: { productId },
      });
    }

    // Delete the product
    await prisma.product.delete({
      where: { id: productId },
    });

    return NextResponse.json({
      success: true,
      message: 'Product deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting product:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete product',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
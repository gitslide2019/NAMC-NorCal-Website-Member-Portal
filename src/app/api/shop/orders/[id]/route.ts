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
    const orderId = params.id;

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: true
      }
    });

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // Parse shipping address if it exists
    let shippingAddress = null;
    if (order.shippingAddress) {
      try {
        shippingAddress = JSON.parse(order.shippingAddress);
      } catch (error) {
        console.error('Error parsing shipping address:', error);
      }
    }

    return NextResponse.json({
      id: order.id,
      orderNumber: order.orderNumber,
      total: order.totalAmount,
      status: order.status,
      paymentStatus: order.paymentStatus,
      items: order.items.map(item => ({
        id: item.id,
        productId: item.productId,
        name: item.name || 'Product',
        quantity: item.quantity,
        price: item.unitPrice,
        variant: item.variant,
        isDigital: item.isDigital
      })),
      customer: {
        email: order.customerEmail,
        firstName: order.customerName?.split(' ')[0] || '',
        lastName: order.customerName?.split(' ').slice(1).join(' ') || ''
      },
      shippingAddress,
      createdAt: order.createdAt,
      estimatedDelivery: order.estimatedDelivery
    });

  } catch (error) {
    console.error('Error fetching order:', error);
    return NextResponse.json(
      { error: 'Failed to fetch order' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const orderId = params.id;
    const updates = await request.json();

    const order = await prisma.order.update({
      where: { id: orderId },
      data: {
        ...updates,
        updatedAt: new Date()
      },
      include: {
        items: true
      }
    });

    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        paymentStatus: order.paymentStatus,
        total: order.totalAmount,
        updatedAt: order.updatedAt
      }
    });

  } catch (error) {
    console.error('Error updating order:', error);
    return NextResponse.json(
      { error: 'Failed to update order' },
      { status: 500 }
    );
  }
}
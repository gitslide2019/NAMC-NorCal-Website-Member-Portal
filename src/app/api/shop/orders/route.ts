/**
 * Shop Orders API Routes
 * Handles order creation and fulfillment
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';
import ShopService from '@/lib/services/shop.service';

const prisma = new PrismaClient();
const shopService = new ShopService();

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

    if (orderId) {
      // Get specific order with status from external services
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          items: {
            include: { product: true },
          },
          user: true,
        },
      });

      if (!order) {
        return NextResponse.json(
          { success: false, error: 'Order not found' },
          { status: 404 }
        );
      }

      // Get external order status
      const externalStatus = await shopService.getOrderStatus(orderId);

      return NextResponse.json({
        success: true,
        data: {
          ...order,
          externalStatus,
        },
      });
    } else {
      // Get user's orders
      const orders = await prisma.order.findMany({
        where: { memberId: session.user.id },
        include: {
          items: {
            include: { product: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return NextResponse.json({
        success: true,
        data: orders,
      });
    }
  } catch (error) {
    console.error('Error fetching orders:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch orders',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const body = await request.json();
    
    // Handle direct order creation (new checkout flow)
    if (!body.action) {
      const {
        items,
        customer,
        shippingAddress,
        subtotal,
        tax,
        shipping,
        total,
        isMember,
        status = 'pending'
      } = body;

      if (!items || !Array.isArray(items) || items.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Items are required' },
          { status: 400 }
        );
      }

      // Generate order number
      const orderNumber = `NAMC-${Date.now()}`;

      // Calculate totals if not provided
      const calculatedSubtotal = subtotal || items.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0);
      const calculatedTax = tax || (calculatedSubtotal * 0.0875); // CA sales tax
      const calculatedShipping = shipping || (isMember || calculatedSubtotal >= 50 ? 0 : 9.99);
      const calculatedTotal = total || (calculatedSubtotal + calculatedTax + calculatedShipping);

      // Create local order record
      const order = await prisma.order.create({
        data: {
          orderNumber,
          memberId: session?.user?.id,
          customerEmail: customer?.email || session?.user?.email || '',
          customerName: customer ? `${customer.firstName} ${customer.lastName}` : session?.user?.name || '',
          totalAmount: calculatedTotal,
          shippingAddress: shippingAddress ? JSON.stringify(shippingAddress) : null,
          status: status,
          paymentStatus: 'pending',
          isMember: isMember || false,
          items: {
            create: items.map((item: any) => ({
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: item.price,
              totalPrice: item.price * item.quantity,
              variant: item.variant,
              isDigital: item.isDigital || false
            }))
          }
        },
        include: {
          items: true
        }
      });

      return NextResponse.json({
        success: true,
        id: order.id,
        orderNumber: order.orderNumber,
        total: order.totalAmount,
        status: order.status,
        items: order.items.map(item => ({
          id: item.id,
          productId: item.productId,
          name: item.name || 'Product',
          quantity: item.quantity,
          price: item.unitPrice,
          variant: item.variant,
          isDigital: item.isDigital
        })),
        customer: customer ? {
          email: customer.email,
          firstName: customer.firstName,
          lastName: customer.lastName
        } : null,
        shippingAddress,
        createdAt: order.createdAt
      });
    }

    // Handle legacy action-based requests
    const { action, orderId, orderData } = body;

    switch (action) {
      case 'create_checkout_order':
        // Handle new checkout flow
        const {
          items,
          customer,
          shippingAddress,
          subtotal,
          tax,
          shipping,
          total,
          isMember,
          status = 'pending'
        } = body;

        if (!items || !Array.isArray(items) || items.length === 0) {
          return NextResponse.json(
            { success: false, error: 'Items are required' },
            { status: 400 }
          );
        }

        // Generate order number
        const checkoutOrderNumber = `NAMC-${Date.now()}`;

        // Calculate totals if not provided
        const calculatedSubtotal = subtotal || items.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0);
        const calculatedTax = tax || (calculatedSubtotal * 0.0875); // CA sales tax
        const calculatedShipping = shipping || (isMember || calculatedSubtotal >= 50 ? 0 : 9.99);
        const calculatedTotal = total || (calculatedSubtotal + calculatedTax + calculatedShipping);

        // Create local order record
        const checkoutOrder = await prisma.order.create({
          data: {
            orderNumber: checkoutOrderNumber,
            memberId: session?.user?.id,
            customerEmail: customer?.email || session?.user?.email || '',
            customerName: customer ? `${customer.firstName} ${customer.lastName}` : session?.user?.name || '',
            totalAmount: calculatedTotal,
            shippingAddress: shippingAddress ? JSON.stringify(shippingAddress) : null,
            status: status,
            paymentStatus: 'pending',
            isMember: isMember || false,
            items: {
              create: items.map((item: any) => ({
                productId: item.productId,
                quantity: item.quantity,
                unitPrice: item.price,
                totalPrice: item.price * item.quantity,
                variant: item.variant,
                isDigital: item.isDigital || false
              }))
            }
          },
          include: {
            items: true
          }
        });

        return NextResponse.json({
          success: true,
          data: {
            id: checkoutOrder.id,
            orderNumber: checkoutOrder.orderNumber,
            total: checkoutOrder.totalAmount,
            status: checkoutOrder.status,
            items: checkoutOrder.items.map(item => ({
              id: item.id,
              productId: item.productId,
              name: item.name || 'Product',
              quantity: item.quantity,
              price: item.unitPrice,
              variant: item.variant,
              isDigital: item.isDigital
            })),
            customer: customer ? {
              email: customer.email,
              firstName: customer.firstName,
              lastName: customer.lastName
            } : null,
            shippingAddress,
            createdAt: checkoutOrder.createdAt
          }
        });

      case 'create_order':
        if (!orderData) {
          return NextResponse.json(
            { success: false, error: 'Order data required' },
            { status: 400 }
          );
        }

        // Generate unique order number
        const orderNumber = `NAMC-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

        // Create order in local database
        const order = await prisma.order.create({
          data: {
            orderNumber,
            memberId: session?.user?.id,
            customerEmail: orderData.customerEmail || session?.user?.email || '',
            customerName: orderData.customerName || session?.user?.name || '',
            totalAmount: orderData.totalAmount,
            shippingAddress: JSON.stringify(orderData.shippingAddress),
            billingAddress: JSON.stringify(orderData.billingAddress),
            notes: orderData.notes,
            items: {
              create: orderData.items.map((item: any) => ({
                productId: item.productId,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                totalPrice: item.totalPrice,
              })),
            },
          },
          include: {
            items: {
              include: { product: true },
            },
          },
        });

        // Fulfill order with external services
        const fulfillmentResult1 = await shopService.fulfillOrder(order.id);

        // Update inventory
        await shopService.updateInventoryAfterOrder(order.id);

        return NextResponse.json({
          success: true,
          data: {
            order,
            fulfillment: fulfillmentResult1,
          },
        });

      case 'fulfill_order':
        if (!orderId) {
          return NextResponse.json(
            { success: false, error: 'Order ID required' },
            { status: 400 }
          );
        }

        const fulfillment = await shopService.fulfillOrder(orderId);

        return NextResponse.json({
          success: true,
          data: fulfillment,
        });

      case 'update_inventory':
        if (!orderId) {
          return NextResponse.json(
            { success: false, error: 'Order ID required' },
            { status: 400 }
          );
        }

        await shopService.updateInventoryAfterOrder(orderId);

        return NextResponse.json({
          success: true,
          message: 'Inventory updated successfully',
        });

      case 'process_fulfillment':
        if (!orderId) {
          return NextResponse.json(
            { success: false, error: 'Order ID required' },
            { status: 400 }
          );
        }

        const fulfillmentResult = await shopService.processOrderFulfillment(orderId);

        return NextResponse.json({
          success: fulfillmentResult.success,
          data: fulfillmentResult,
          message: fulfillmentResult.success 
            ? 'Order fulfillment completed successfully' 
            : 'Order fulfillment completed with errors',
        });

      case 'submit_printify_production':
        if (!orderId) {
          return NextResponse.json(
            { success: false, error: 'Order ID required' },
            { status: 400 }
          );
        }

        const printifyResult = await shopService.submitPrintifyOrderToProduction(orderId);

        return NextResponse.json({
          success: printifyResult.success,
          data: printifyResult,
        });

      case 'grant_digital_access':
        if (!orderId) {
          return NextResponse.json(
            { success: false, error: 'Order ID required' },
            { status: 400 }
          );
        }

        const digitalAccessResult = await shopService.grantDigitalContentAccess(orderId);

        return NextResponse.json({
          success: digitalAccessResult.success,
          data: digitalAccessResult,
        });

      case 'get_tracking':
        if (!orderId) {
          return NextResponse.json(
            { success: false, error: 'Order ID required' },
            { status: 400 }
          );
        }

        const trackingResult = await shopService.getShippingAndTracking(orderId);

        return NextResponse.json({
          success: trackingResult.success,
          data: trackingResult.tracking,
          error: trackingResult.error,
        });

      case 'award_loyalty_points':
        if (!orderId) {
          return NextResponse.json(
            { success: false, error: 'Order ID required' },
            { status: 400 }
          );
        }

        const loyaltyResult = await shopService.awardLoyaltyPoints(orderId);

        return NextResponse.json({
          success: loyaltyResult.success,
          data: loyaltyResult,
        });

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Error processing order request:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process order request',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
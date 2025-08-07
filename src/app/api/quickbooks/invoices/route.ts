/**
 * QuickBooks Invoice Management Route
 * Create invoices from cost estimates and shop orders
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { QuickBooksAPIService } from '@/lib/services/quickbooks-api.service';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { type, sourceId, customerEmail, customerName, companyName } = body;

    const quickbooksService = new QuickBooksAPIService();
    let invoice;

    switch (type) {
      case 'cost_estimate':
        if (!sourceId || !customerEmail || !customerName) {
          return NextResponse.json(
            { error: 'Missing required fields: sourceId, customerEmail, customerName' },
            { status: 400 }
          );
        }
        
        invoice = await quickbooksService.createInvoiceFromCostEstimate(
          sourceId,
          customerEmail,
          customerName,
          companyName
        );
        break;

      case 'shop_order':
        // Implementation for shop order invoices would go here
        return NextResponse.json(
          { error: 'Shop order invoices not yet implemented' },
          { status: 501 }
        );

      default:
        return NextResponse.json(
          { error: 'Invalid invoice type. Supported types: cost_estimate, shop_order' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      invoice
    });
  } catch (error) {
    console.error('Error creating QuickBooks invoice:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create invoice' },
      { status: 500 }
    );
  }
}
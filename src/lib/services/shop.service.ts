/**
 * Shop Service
 * Integrates Shopify and Printify for dual-facing shop system
 */

import { PrismaClient } from '@prisma/client';
import ShopifyService from './shopify-api.service';
import PrintifyService from './printify-api.service';

const prisma = new PrismaClient();

export interface ProductSyncResult {
  success: boolean;
  productsProcessed: number;
  errors: string[];
}

export interface OrderFulfillmentResult {
  success: boolean;
  shopifyOrderId?: string;
  printifyOrderId?: string;
  error?: string;
}

export class ShopService {
  private shopifyService: ShopifyService;
  private printifyService: PrintifyService;

  constructor() {
    this.shopifyService = new ShopifyService();
    this.printifyService = new PrintifyService();
  }

  /**
   * Sync all products from Shopify to local database
   */
  async syncShopifyProducts(): Promise<ProductSyncResult> {
    const result: ProductSyncResult = {
      success: true,
      productsProcessed: 0,
      errors: [],
    };

    try {
      console.log('Starting Shopify product sync...');
      
      const shopifyProducts = await this.shopifyService.getProducts();
      const inventoryLevels = await this.shopifyService.getInventoryLevels();
      
      // Create a map of inventory levels by inventory_item_id
      const inventoryMap = new Map<number, number>();
      inventoryLevels.forEach(level => {
        inventoryMap.set(level.inventory_item_id, level.available);
      });

      for (const shopifyProduct of shopifyProducts) {
        try {
          // Use the first variant for pricing and inventory
          const primaryVariant = shopifyProduct.variants[0];
          if (!primaryVariant) {
            result.errors.push(`Product ${shopifyProduct.title} has no variants`);
            continue;
          }

          const inventory = inventoryMap.get(primaryVariant.inventory_item_id) || 0;

          // Upsert product in local database
          await prisma.product.upsert({
            where: { sku: primaryVariant.sku || `shopify-${shopifyProduct.id}` },
            update: {
              name: shopifyProduct.title,
              description: shopifyProduct.body_html,
              category: shopifyProduct.product_type || 'General',
              publicPrice: parseFloat(primaryVariant.price),
              memberPrice: parseFloat(primaryVariant.price) * 0.9, // 10% member discount
              inventory: inventory,
              imageUrl: shopifyProduct.image?.src,
              specifications: JSON.stringify({
                vendor: shopifyProduct.vendor,
                tags: shopifyProduct.tags,
                variants: shopifyProduct.variants.length,
                options: shopifyProduct.options,
              }),
              shopifyProductId: shopifyProduct.id.toString(),
              shopifyVariantId: primaryVariant.id.toString(),
              shopifyInventoryItemId: primaryVariant.inventory_item_id.toString(),
              shopifyLastSync: new Date(),
              shopifySyncStatus: 'SYNCED',
              shopifySyncError: null,
              isActive: shopifyProduct.status === 'active',
            },
            create: {
              name: shopifyProduct.title,
              description: shopifyProduct.body_html,
              category: shopifyProduct.product_type || 'General',
              sku: primaryVariant.sku || `shopify-${shopifyProduct.id}`,
              publicPrice: parseFloat(primaryVariant.price),
              memberPrice: parseFloat(primaryVariant.price) * 0.9, // 10% member discount
              inventory: inventory,
              imageUrl: shopifyProduct.image?.src,
              specifications: JSON.stringify({
                vendor: shopifyProduct.vendor,
                tags: shopifyProduct.tags,
                variants: shopifyProduct.variants.length,
                options: shopifyProduct.options,
              }),
              shopifyProductId: shopifyProduct.id.toString(),
              shopifyVariantId: primaryVariant.id.toString(),
              shopifyInventoryItemId: primaryVariant.inventory_item_id.toString(),
              shopifyLastSync: new Date(),
              shopifySyncStatus: 'SYNCED',
              isActive: shopifyProduct.status === 'active',
            },
          });

          result.productsProcessed++;
        } catch (error) {
          const errorMessage = `Error syncing product ${shopifyProduct.title}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          result.errors.push(errorMessage);
          console.error(errorMessage);
        }
      }

      console.log(`Successfully synced ${result.productsProcessed} products from Shopify`);
    } catch (error) {
      result.success = false;
      const errorMessage = `Error syncing products from Shopify: ${error instanceof Error ? error.message : 'Unknown error'}`;
      result.errors.push(errorMessage);
      console.error(errorMessage);
    }

    return result;
  }

  /**
   * Sync inventory levels from Shopify to local database
   */
  async syncShopifyInventory(): Promise<ProductSyncResult> {
    const result: ProductSyncResult = {
      success: true,
      productsProcessed: 0,
      errors: [],
    };

    try {
      console.log('Starting Shopify inventory sync...');
      
      const inventoryLevels = await this.shopifyService.getInventoryLevels();
      
      for (const level of inventoryLevels) {
        try {
          // Find products by shopifyInventoryItemId
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
              },
            });
            result.productsProcessed++;
          }
        } catch (error) {
          const errorMessage = `Error syncing inventory for item ${level.inventory_item_id}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          result.errors.push(errorMessage);
          console.error(errorMessage);
        }
      }

      console.log(`Successfully synced inventory for ${result.productsProcessed} products`);
    } catch (error) {
      result.success = false;
      const errorMessage = `Error syncing inventory from Shopify: ${error instanceof Error ? error.message : 'Unknown error'}`;
      result.errors.push(errorMessage);
      console.error(errorMessage);
    }

    return result;
  }

  /**
   * Sync products from Printify to local database
   */
  async syncPrintifyProducts(): Promise<ProductSyncResult> {
    const result: ProductSyncResult = {
      success: true,
      productsProcessed: 0,
      errors: [],
    };

    try {
      console.log('Starting Printify product sync...');
      
      let page = 1;
      let hasMorePages = true;

      while (hasMorePages) {
        const response = await this.printifyService.getProducts(100, page);
        
        for (const printifyProduct of response.data) {
          try {
            // Use the first enabled variant for pricing
            const primaryVariant = printifyProduct.variants.find(v => v.is_enabled) || printifyProduct.variants[0];
            if (!primaryVariant) {
              result.errors.push(`Printify product ${printifyProduct.title} has no enabled variants`);
              continue;
            }

            // Create or update product in local database
            await prisma.product.upsert({
              where: { sku: primaryVariant.sku || `printify-${printifyProduct.id}` },
              update: {
                name: printifyProduct.title,
                description: printifyProduct.description,
                category: 'Print-on-Demand',
                publicPrice: primaryVariant.price,
                memberPrice: primaryVariant.price * 0.9, // 10% member discount
                inventory: 999, // Print-on-demand has unlimited inventory
                imageUrl: printifyProduct.images[0]?.name,
                specifications: JSON.stringify({
                  printify: true,
                  blueprint_id: printifyProduct.blueprint_id,
                  print_provider_id: printifyProduct.print_provider_id,
                  variants: printifyProduct.variants.length,
                  options: printifyProduct.options,
                }),
                printifyProductId: printifyProduct.id,
                printifyVariantId: primaryVariant.id.toString(),
                printifyBlueprintId: printifyProduct.blueprint_id.toString(),
                printifyProviderId: printifyProduct.print_provider_id.toString(),
                printifyLastSync: new Date(),
                printifySyncStatus: 'SYNCED',
                printifySyncError: null,
                isActive: printifyProduct.visible,
                isDigital: false,
              },
              create: {
                name: printifyProduct.title,
                description: printifyProduct.description,
                category: 'Print-on-Demand',
                sku: primaryVariant.sku || `printify-${printifyProduct.id}`,
                publicPrice: primaryVariant.price,
                memberPrice: primaryVariant.price * 0.9, // 10% member discount
                inventory: 999, // Print-on-demand has unlimited inventory
                imageUrl: printifyProduct.images[0]?.name,
                specifications: JSON.stringify({
                  printify: true,
                  blueprint_id: printifyProduct.blueprint_id,
                  print_provider_id: printifyProduct.print_provider_id,
                  variants: printifyProduct.variants.length,
                  options: printifyProduct.options,
                }),
                printifyProductId: printifyProduct.id,
                printifyVariantId: primaryVariant.id.toString(),
                printifyBlueprintId: printifyProduct.blueprint_id.toString(),
                printifyProviderId: printifyProduct.print_provider_id.toString(),
                printifyLastSync: new Date(),
                printifySyncStatus: 'SYNCED',
                isActive: printifyProduct.visible,
                isDigital: false,
              },
            });

            result.productsProcessed++;
          } catch (error) {
            const errorMessage = `Error syncing Printify product ${printifyProduct.title}: ${error instanceof Error ? error.message : 'Unknown error'}`;
            result.errors.push(errorMessage);
            console.error(errorMessage);
          }
        }

        hasMorePages = page < response.last_page;
        page++;
      }

      console.log(`Successfully synced ${result.productsProcessed} products from Printify`);
    } catch (error) {
      result.success = false;
      const errorMessage = `Error syncing products from Printify: ${error instanceof Error ? error.message : 'Unknown error'}`;
      result.errors.push(errorMessage);
      console.error(errorMessage);
    }

    return result;
  }

  /**
   * Sync all products from both Shopify and Printify
   */
  async syncAllProducts(): Promise<{
    shopify: ProductSyncResult;
    printify: ProductSyncResult;
  }> {
    console.log('Starting full product sync from Shopify and Printify...');
    
    const [shopifyResult, printifyResult] = await Promise.allSettled([
      this.syncShopifyProducts(),
      this.syncPrintifyProducts(),
    ]);

    return {
      shopify: shopifyResult.status === 'fulfilled' ? shopifyResult.value : {
        success: false,
        productsProcessed: 0,
        errors: [shopifyResult.reason?.message || 'Shopify sync failed'],
      },
      printify: printifyResult.status === 'fulfilled' ? printifyResult.value : {
        success: false,
        productsProcessed: 0,
        errors: [printifyResult.reason?.message || 'Printify sync failed'],
      },
    };
  }

  /**
   * Process order fulfillment - create orders in Shopify and/or Printify
   */
  async fulfillOrder(localOrderId: string): Promise<OrderFulfillmentResult> {
    try {
      const localOrder = await prisma.order.findUnique({
        where: { id: localOrderId },
        include: {
          items: {
            include: { product: true },
          },
        },
      });

      if (!localOrder) {
        return {
          success: false,
          error: `Local order ${localOrderId} not found`,
        };
      }

      // Separate items by fulfillment method
      const shopifyItems = localOrder.items.filter(item => item.product.shopifyProductId);
      const printifyItems = localOrder.items.filter(item => item.product.printifyProductId);

      let shopifyOrderId: string | undefined;
      let printifyOrderId: string | undefined;
      const errors: string[] = [];

      // Create Shopify order if there are Shopify items
      if (shopifyItems.length > 0) {
        try {
          const shopifyOrder = await this.shopifyService.createOrderFromLocal(localOrderId);
          shopifyOrderId = shopifyOrder.id.toString();
          
          // Update local order with Shopify order ID
          await prisma.order.update({
            where: { id: localOrderId },
            data: {
              shopifyOrderId: shopifyOrderId,
              shopifyOrderNumber: shopifyOrder.order_number.toString(),
              shopifyLastSync: new Date(),
              shopifySyncStatus: 'SYNCED',
            },
          });
        } catch (error) {
          const errorMessage = `Failed to create Shopify order: ${error instanceof Error ? error.message : 'Unknown error'}`;
          errors.push(errorMessage);
          console.error(errorMessage);
        }
      }

      // Create Printify order if there are Printify items
      if (printifyItems.length > 0) {
        try {
          const printifyOrder = await this.printifyService.createOrderFromLocal(localOrderId);
          printifyOrderId = printifyOrder.id;
          
          // Update local order with Printify order ID
          await prisma.order.update({
            where: { id: localOrderId },
            data: {
              printifyOrderId: printifyOrderId,
              printifyExternalId: printifyOrder.external_id,
              printifyLastSync: new Date(),
              printifySyncStatus: 'SYNCED',
            },
          });
        } catch (error) {
          const errorMessage = `Failed to create Printify order: ${error instanceof Error ? error.message : 'Unknown error'}`;
          errors.push(errorMessage);
          console.error(errorMessage);
        }
      }

      const success = errors.length === 0 || (shopifyOrderId || printifyOrderId);

      return {
        success,
        shopifyOrderId,
        printifyOrderId,
        error: errors.length > 0 ? errors.join('; ') : undefined,
      };
    } catch (error) {
      const errorMessage = `Error fulfilling order ${localOrderId}: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error(errorMessage);
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Get products with member/public pricing
   */
  async getProducts(isMember: boolean = false, category?: string, limit?: number): Promise<any[]> {
    try {
      const products = await prisma.product.findMany({
        where: {
          isActive: true,
          ...(category && { category }),
        },
        take: limit,
        orderBy: { createdAt: 'desc' },
      });

      return products.map(product => ({
        ...product,
        price: isMember && product.memberPrice ? product.memberPrice : product.publicPrice,
        specifications: product.specifications ? JSON.parse(product.specifications) : null,
      }));
    } catch (error) {
      console.error('Error fetching products:', error);
      throw error;
    }
  }

  /**
   * Get products for admin management with full details
   */
  async getProductsForAdmin(category?: string, limit?: number): Promise<any[]> {
    try {
      const products = await prisma.product.findMany({
        where: {
          ...(category && category !== 'all' && { category }),
        },
        take: limit,
        orderBy: { updatedAt: 'desc' },
      });

      return products.map(product => ({
        ...product,
        specifications: product.specifications ? JSON.parse(product.specifications) : null,
      }));
    } catch (error) {
      console.error('Error fetching products for admin:', error);
      throw error;
    }
  }

  /**
   * Update inventory after order
   */
  async updateInventoryAfterOrder(orderId: string): Promise<void> {
    try {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          items: {
            include: { product: true },
          },
        },
      });

      if (!order) {
        throw new Error(`Order ${orderId} not found`);
      }

      for (const item of order.items) {
        // Only update inventory for non-print-on-demand items
        if (!item.product.printifyProductId) {
          const newInventory = Math.max(0, item.product.inventory - item.quantity);
          
          await prisma.product.update({
            where: { id: item.product.id },
            data: { inventory: newInventory },
          });

          // Update Shopify inventory if it's a Shopify product
          if (item.product.shopifyInventoryItemId) {
            try {
              await this.shopifyService.updateInventoryLevel(
                parseInt(item.product.shopifyInventoryItemId),
                newInventory
              );
            } catch (error) {
              console.error(`Failed to update Shopify inventory for product ${item.product.id}:`, error);
            }
          }
        }
      }
    } catch (error) {
      console.error(`Error updating inventory after order ${orderId}:`, error);
      throw error;
    }
  }

  /**
   * Get order status from external services
   */
  async getOrderStatus(orderId: string): Promise<{
    shopify?: any;
    printify?: any;
  }> {
    try {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
      });

      if (!order) {
        throw new Error(`Order ${orderId} not found`);
      }

      const result: { shopify?: any; printify?: any } = {};

      // Get Shopify order status
      if (order.shopifyOrderId) {
        try {
          result.shopify = await this.shopifyService.getOrder(parseInt(order.shopifyOrderId));
        } catch (error) {
          console.error(`Error fetching Shopify order status:`, error);
        }
      }

      // Get Printify order status
      if (order.printifyOrderId) {
        try {
          result.printify = await this.printifyService.getOrder(order.printifyOrderId);
        } catch (error) {
          console.error(`Error fetching Printify order status:`, error);
        }
      }

      return result;
    } catch (error) {
      console.error(`Error getting order status for ${orderId}:`, error);
      throw error;
    }
  }

  /**
   * Process automated print-on-demand order submission to Printify
   */
  async submitPrintifyOrderToProduction(orderId: string): Promise<{
    success: boolean;
    printifyOrderId?: string;
    error?: string;
  }> {
    try {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          items: {
            include: { product: true },
          },
        },
      });

      if (!order) {
        return {
          success: false,
          error: `Order ${orderId} not found`,
        };
      }

      if (!order.printifyOrderId) {
        return {
          success: false,
          error: `No Printify order ID found for order ${orderId}`,
        };
      }

      // Send order to production in Printify
      await this.printifyService.sendOrderToProduction(order.printifyOrderId);

      // Update local order status
      await prisma.order.update({
        where: { id: orderId },
        data: {
          status: 'IN_PRODUCTION',
          printifySyncStatus: 'SYNCED',
          printifyLastSync: new Date(),
        },
      });

      return {
        success: true,
        printifyOrderId: order.printifyOrderId,
      };
    } catch (error) {
      const errorMessage = `Error submitting Printify order to production: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error(errorMessage);
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Grant digital content access for digital products in order
   */
  async grantDigitalContentAccess(orderId: string): Promise<{
    success: boolean;
    grantedProducts: string[];
    errors: string[];
  }> {
    try {
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
        return {
          success: false,
          grantedProducts: [],
          errors: [`Order ${orderId} not found`],
        };
      }

      const grantedProducts: string[] = [];
      const errors: string[] = [];

      // Find digital products in the order
      const digitalItems = order.items.filter(item => item.product.isDigital);

      for (const item of digitalItems) {
        try {
          // Create digital access record (this would typically involve creating access tokens, 
          // updating user permissions, or sending download links)
          
          // For now, we'll simulate this by updating the product specifications
          // In a real implementation, this would involve:
          // 1. Creating access tokens
          // 2. Updating user permissions in the database
          // 3. Sending download links via email
          // 4. Integrating with a digital asset management system

          const currentSpecs = JSON.parse(item.product.specifications || '{}');
          const updatedSpecs = {
            ...currentSpecs,
            digitalAccess: {
              grantedTo: order.memberId,
              grantedAt: new Date().toISOString(),
              orderId: orderId,
              accessLevel: 'FULL',
              expirationDate: null, // No expiration for purchased content
            },
          };

          await prisma.product.update({
            where: { id: item.product.id },
            data: {
              specifications: JSON.stringify(updatedSpecs),
            },
          });

          grantedProducts.push(item.product.name);

          // TODO: Send email with download links or access instructions
          // TODO: Update user's digital library
          // TODO: Create access tokens for secure downloads

        } catch (error) {
          const errorMessage = `Error granting access to ${item.product.name}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          errors.push(errorMessage);
          console.error(errorMessage);
        }
      }

      return {
        success: errors.length === 0,
        grantedProducts,
        errors,
      };
    } catch (error) {
      const errorMessage = `Error granting digital content access for order ${orderId}: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error(errorMessage);
      return {
        success: false,
        grantedProducts: [],
        errors: [errorMessage],
      };
    }
  }

  /**
   * Get shipping and tracking information for an order
   */
  async getShippingAndTracking(orderId: string): Promise<{
    success: boolean;
    tracking?: {
      shopify?: {
        fulfillments: any[];
        trackingNumbers: string[];
        trackingUrls: string[];
      };
      printify?: {
        shipments: any[];
        trackingNumbers: string[];
        trackingUrls: string[];
      };
    };
    error?: string;
  }> {
    try {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
      });

      if (!order) {
        return {
          success: false,
          error: `Order ${orderId} not found`,
        };
      }

      const tracking: any = {};

      // Get Shopify tracking information
      if (order.shopifyOrderId) {
        try {
          const shopifyOrder = await this.shopifyService.getOrder(parseInt(order.shopifyOrderId));
          tracking.shopify = {
            fulfillments: shopifyOrder.fulfillments || [],
            trackingNumbers: shopifyOrder.fulfillments?.map((f: any) => f.tracking_number).filter(Boolean) || [],
            trackingUrls: shopifyOrder.fulfillments?.map((f: any) => f.tracking_url).filter(Boolean) || [],
          };
        } catch (error) {
          console.error(`Error fetching Shopify tracking info:`, error);
        }
      }

      // Get Printify tracking information
      if (order.printifyOrderId) {
        try {
          const printifyOrder = await this.printifyService.getOrder(order.printifyOrderId);
          tracking.printify = {
            shipments: printifyOrder.shipments || [],
            trackingNumbers: printifyOrder.shipments?.map((s: any) => s.number).filter(Boolean) || [],
            trackingUrls: printifyOrder.shipments?.map((s: any) => s.url).filter(Boolean) || [],
          };
        } catch (error) {
          console.error(`Error fetching Printify tracking info:`, error);
        }
      }

      return {
        success: true,
        tracking,
      };
    } catch (error) {
      const errorMessage = `Error getting shipping and tracking for order ${orderId}: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error(errorMessage);
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Award loyalty points for order
   */
  async awardLoyaltyPoints(orderId: string): Promise<{
    success: boolean;
    pointsAwarded: number;
    newTotalPoints: number;
    tierUpdated?: boolean;
    newTier?: string;
    error?: string;
  }> {
    try {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          user: true,
          items: {
            include: { product: true },
          },
        },
      });

      if (!order || !order.user) {
        return {
          success: false,
          pointsAwarded: 0,
          newTotalPoints: 0,
          error: `Order ${orderId} or associated user not found`,
        };
      }

      // Calculate points based on order total (1 point per dollar spent)
      const basePoints = Math.floor(order.totalAmount);
      
      // Bonus points for digital products (encourage learning)
      const digitalBonus = order.items
        .filter(item => item.product.isDigital)
        .reduce((bonus, item) => bonus + (item.quantity * 5), 0); // 5 bonus points per digital item

      // Member tier multiplier
      const tierMultiplier = this.getTierMultiplier(order.user.memberType);
      const totalPoints = Math.floor((basePoints + digitalBonus) * tierMultiplier);

      // Get current user points from specifications (we'll store loyalty data there for now)
      const currentSpecs = JSON.parse(order.user.hubspotSyncError || '{}'); // Using hubspotSyncError as temp storage
      const currentPoints = currentSpecs.loyaltyPoints || 0;
      const newTotalPoints = currentPoints + totalPoints;

      // Determine new tier based on total points
      const currentTier = order.user.memberType;
      const newTier = this.calculateMemberTier(newTotalPoints);
      const tierUpdated = currentTier !== newTier;

      // Update user with new points and tier
      const updatedSpecs = {
        ...currentSpecs,
        loyaltyPoints: newTotalPoints,
        lastPointsAwarded: totalPoints,
        lastPointsAwardedDate: new Date().toISOString(),
        pointsHistory: [
          ...(currentSpecs.pointsHistory || []),
          {
            orderId,
            points: totalPoints,
            date: new Date().toISOString(),
            reason: 'order_purchase',
          },
        ],
      };

      await prisma.user.update({
        where: { id: order.user.id },
        data: {
          memberType: newTier,
          hubspotSyncError: JSON.stringify(updatedSpecs), // Temporary storage
          hubspotSyncStatus: 'PENDING', // Mark for HubSpot sync
        },
      });

      return {
        success: true,
        pointsAwarded: totalPoints,
        newTotalPoints,
        tierUpdated,
        newTier: tierUpdated ? newTier : undefined,
      };
    } catch (error) {
      const errorMessage = `Error awarding loyalty points for order ${orderId}: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error(errorMessage);
      return {
        success: false,
        pointsAwarded: 0,
        newTotalPoints: 0,
        error: errorMessage,
      };
    }
  }

  /**
   * Get tier multiplier for loyalty points
   */
  private getTierMultiplier(memberType: string): number {
    switch (memberType) {
      case 'EXECUTIVE':
        return 2.0;
      case 'PREMIUM':
        return 1.5;
      case 'REGULAR':
        return 1.0;
      default:
        return 1.0;
    }
  }

  /**
   * Calculate member tier based on loyalty points
   */
  private calculateMemberTier(totalPoints: number): string {
    if (totalPoints >= 10000) {
      return 'EXECUTIVE';
    } else if (totalPoints >= 5000) {
      return 'PREMIUM';
    } else {
      return 'REGULAR';
    }
  }

  /**
   * Process complete order fulfillment workflow
   */
  async processOrderFulfillment(orderId: string): Promise<{
    success: boolean;
    fulfillmentSteps: {
      orderCreation: boolean;
      inventoryUpdate: boolean;
      printifySubmission?: boolean;
      digitalAccess?: boolean;
      loyaltyPoints: boolean;
    };
    errors: string[];
  }> {
    const fulfillmentSteps = {
      orderCreation: false,
      inventoryUpdate: false,
      printifySubmission: false,
      digitalAccess: false,
      loyaltyPoints: false,
    };
    const errors: string[] = [];

    try {
      // Step 1: Create orders in external services
      const fulfillmentResult = await this.fulfillOrder(orderId);
      fulfillmentSteps.orderCreation = fulfillmentResult.success;
      if (!fulfillmentResult.success && fulfillmentResult.error) {
        errors.push(fulfillmentResult.error);
      }

      // Step 2: Update inventory
      try {
        await this.updateInventoryAfterOrder(orderId);
        fulfillmentSteps.inventoryUpdate = true;
      } catch (error) {
        const errorMessage = `Inventory update failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
        errors.push(errorMessage);
      }

      // Step 3: Submit Printify orders to production (if applicable)
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          items: {
            include: { product: true },
          },
        },
      });

      if (order?.printifyOrderId) {
        const printifyResult = await this.submitPrintifyOrderToProduction(orderId);
        fulfillmentSteps.printifySubmission = printifyResult.success;
        if (!printifyResult.success && printifyResult.error) {
          errors.push(printifyResult.error);
        }
      }

      // Step 4: Grant digital content access (if applicable)
      const digitalAccessResult = await this.grantDigitalContentAccess(orderId);
      fulfillmentSteps.digitalAccess = digitalAccessResult.success;
      if (!digitalAccessResult.success) {
        errors.push(...digitalAccessResult.errors);
      }

      // Step 5: Award loyalty points
      const loyaltyResult = await this.awardLoyaltyPoints(orderId);
      fulfillmentSteps.loyaltyPoints = loyaltyResult.success;
      if (!loyaltyResult.success && loyaltyResult.error) {
        errors.push(loyaltyResult.error);
      }

      // Update order status based on fulfillment success
      const overallSuccess = fulfillmentSteps.orderCreation && fulfillmentSteps.inventoryUpdate && fulfillmentSteps.loyaltyPoints;
      
      await prisma.order.update({
        where: { id: orderId },
        data: {
          status: overallSuccess ? 'CONFIRMED' : 'PROCESSING',
          hubspotSyncStatus: 'PENDING', // Mark for HubSpot sync
        },
      });

      return {
        success: overallSuccess,
        fulfillmentSteps,
        errors,
      };
    } catch (error) {
      const errorMessage = `Error processing order fulfillment for ${orderId}: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error(errorMessage);
      errors.push(errorMessage);

      return {
        success: false,
        fulfillmentSteps,
        errors,
      };
    }
  }
}

export default ShopService;
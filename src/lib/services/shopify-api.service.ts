/**
 * Shopify API Service
 * Handles product catalog synchronization and order management with Shopify
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface ShopifyProduct {
  id: number;
  title: string;
  body_html: string;
  vendor: string;
  product_type: string;
  created_at: string;
  handle: string;
  updated_at: string;
  published_at: string;
  template_suffix: string;
  status: string;
  published_scope: string;
  tags: string;
  admin_graphql_api_id: string;
  variants: ShopifyVariant[];
  options: ShopifyOption[];
  images: ShopifyImage[];
  image: ShopifyImage;
}

export interface ShopifyVariant {
  id: number;
  product_id: number;
  title: string;
  price: string;
  sku: string;
  position: number;
  inventory_policy: string;
  compare_at_price: string;
  fulfillment_service: string;
  inventory_management: string;
  option1: string;
  option2: string;
  option3: string;
  created_at: string;
  updated_at: string;
  taxable: boolean;
  barcode: string;
  grams: number;
  image_id: number;
  weight: number;
  weight_unit: string;
  inventory_item_id: number;
  inventory_quantity: number;
  old_inventory_quantity: number;
  requires_shipping: boolean;
  admin_graphql_api_id: string;
}

export interface ShopifyOption {
  id: number;
  product_id: number;
  name: string;
  position: number;
  values: string[];
}

export interface ShopifyImage {
  id: number;
  product_id: number;
  position: number;
  created_at: string;
  updated_at: string;
  alt: string;
  width: number;
  height: number;
  src: string;
  variant_ids: number[];
  admin_graphql_api_id: string;
}

export interface ShopifyOrder {
  id: number;
  email: string;
  closed_at: string;
  created_at: string;
  updated_at: string;
  number: number;
  note: string;
  token: string;
  gateway: string;
  test: boolean;
  total_price: string;
  subtotal_price: string;
  total_weight: number;
  total_tax: string;
  taxes_included: boolean;
  currency: string;
  financial_status: string;
  confirmed: boolean;
  total_discounts: string;
  buyer_accepts_marketing: boolean;
  name: string;
  referring_site: string;
  landing_site: string;
  cancelled_at: string;
  cancel_reason: string;
  total_price_usd: string;
  checkout_token: string;
  reference: string;
  user_id: number;
  location_id: number;
  source_identifier: string;
  source_url: string;
  processed_at: string;
  device_id: number;
  phone: string;
  customer_locale: string;
  app_id: number;
  browser_ip: string;
  landing_site_ref: string;
  order_number: number;
  discount_applications: any[];
  discount_codes: any[];
  note_attributes: any[];
  payment_gateway_names: string[];
  processing_method: string;
  checkout_id: number;
  source_name: string;
  fulfillment_status: string;
  tax_lines: any[];
  tags: string;
  contact_email: string;
  order_status_url: string;
  presentment_currency: string;
  total_line_items_price_set: any;
  total_discounts_set: any;
  total_shipping_price_set: any;
  subtotal_price_set: any;
  total_price_set: any;
  total_tax_set: any;
  line_items: ShopifyLineItem[];
  shipping_lines: any[];
  billing_address: ShopifyAddress;
  shipping_address: ShopifyAddress;
  fulfillments: any[];
  client_details: any;
  refunds: any[];
  customer: ShopifyCustomer;
}

export interface ShopifyLineItem {
  id: number;
  variant_id: number;
  title: string;
  quantity: number;
  sku: string;
  variant_title: string;
  vendor: string;
  fulfillment_service: string;
  product_id: number;
  requires_shipping: boolean;
  taxable: boolean;
  gift_card: boolean;
  name: string;
  variant_inventory_management: string;
  properties: any[];
  product_exists: boolean;
  fulfillable_quantity: number;
  grams: number;
  price: string;
  total_discount: string;
  fulfillment_status: string;
  price_set: any;
  total_discount_set: any;
  discount_allocations: any[];
  duties: any[];
  admin_graphql_api_id: string;
  tax_lines: any[];
}

export interface ShopifyAddress {
  first_name: string;
  address1: string;
  phone: string;
  city: string;
  zip: string;
  province: string;
  country: string;
  last_name: string;
  address2: string;
  company: string;
  latitude: number;
  longitude: number;
  name: string;
  country_code: string;
  province_code: string;
}

export interface ShopifyCustomer {
  id: number;
  email: string;
  accepts_marketing: boolean;
  created_at: string;
  updated_at: string;
  first_name: string;
  last_name: string;
  orders_count: number;
  state: string;
  total_spent: string;
  last_order_id: number;
  note: string;
  verified_email: boolean;
  multipass_identifier: string;
  tax_exempt: boolean;
  phone: string;
  tags: string;
  last_order_name: string;
  currency: string;
  addresses: ShopifyAddress[];
  accepts_marketing_updated_at: string;
  marketing_opt_in_level: string;
  tax_exemptions: any[];
  admin_graphql_api_id: string;
  default_address: ShopifyAddress;
}

export interface ShopifyInventoryLevel {
  inventory_item_id: number;
  location_id: number;
  available: number;
  updated_at: string;
  admin_graphql_api_id: string;
}

export class ShopifyService {
  private baseUrl: string;
  private accessToken: string;
  private locationId: string;

  constructor() {
    const storeUrl = process.env.SHOPIFY_STORE_URL;
    const accessToken = process.env.SHOPIFY_ACCESS_TOKEN;
    const locationId = process.env.SHOPIFY_LOCATION_ID;

    if (!storeUrl || !accessToken || !locationId) {
      throw new Error('Missing required Shopify environment variables');
    }

    this.baseUrl = `https://${storeUrl}/admin/api/2023-10`;
    this.accessToken = accessToken;
    this.locationId = locationId;
  }

  private async makeRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'X-Shopify-Access-Token': this.accessToken,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Shopify API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    return response.json();
  }

  /**
   * Get all products from Shopify
   */
  async getProducts(limit: number = 250): Promise<ShopifyProduct[]> {
    try {
      const response = await this.makeRequest<{ products: ShopifyProduct[] }>(`/products.json?limit=${limit}`);
      return response.products;
    } catch (error) {
      console.error('Error fetching Shopify products:', error);
      throw error;
    }
  }

  /**
   * Get a specific product by ID
   */
  async getProduct(productId: number): Promise<ShopifyProduct> {
    try {
      const response = await this.makeRequest<{ product: ShopifyProduct }>(`/products/${productId}.json`);
      return response.product;
    } catch (error) {
      console.error(`Error fetching Shopify product ${productId}:`, error);
      throw error;
    }
  }

  /**
   * Get inventory levels for a location
   */
  async getInventoryLevels(): Promise<ShopifyInventoryLevel[]> {
    try {
      const response = await this.makeRequest<{ inventory_levels: ShopifyInventoryLevel[] }>(
        `/locations/${this.locationId}/inventory_levels.json`
      );
      return response.inventory_levels;
    } catch (error) {
      console.error('Error fetching Shopify inventory levels:', error);
      throw error;
    }
  }

  /**
   * Update inventory level for a specific item
   */
  async updateInventoryLevel(inventoryItemId: number, available: number): Promise<ShopifyInventoryLevel> {
    try {
      const response = await this.makeRequest<{ inventory_level: ShopifyInventoryLevel }>(
        `/inventory_levels/set.json`,
        {
          method: 'POST',
          body: JSON.stringify({
            location_id: parseInt(this.locationId),
            inventory_item_id: inventoryItemId,
            available: available,
          }),
        }
      );
      return response.inventory_level;
    } catch (error) {
      console.error(`Error updating inventory for item ${inventoryItemId}:`, error);
      throw error;
    }
  }

  /**
   * Create an order in Shopify
   */
  async createOrder(orderData: {
    email: string;
    line_items: Array<{
      variant_id: number;
      quantity: number;
      price?: string;
    }>;
    billing_address?: Partial<ShopifyAddress>;
    shipping_address?: Partial<ShopifyAddress>;
    financial_status?: string;
    send_receipt?: boolean;
    send_fulfillment_receipt?: boolean;
  }): Promise<ShopifyOrder> {
    try {
      const response = await this.makeRequest<{ order: ShopifyOrder }>('/orders.json', {
        method: 'POST',
        body: JSON.stringify({
          order: {
            ...orderData,
            financial_status: orderData.financial_status || 'pending',
            send_receipt: orderData.send_receipt || false,
            send_fulfillment_receipt: orderData.send_fulfillment_receipt || false,
          },
        }),
      });
      return response.order;
    } catch (error) {
      console.error('Error creating Shopify order:', error);
      throw error;
    }
  }

  /**
   * Get orders from Shopify
   */
  async getOrders(status?: string, limit: number = 250): Promise<ShopifyOrder[]> {
    try {
      let endpoint = `/orders.json?limit=${limit}`;
      if (status) {
        endpoint += `&status=${status}`;
      }
      
      const response = await this.makeRequest<{ orders: ShopifyOrder[] }>(endpoint);
      return response.orders;
    } catch (error) {
      console.error('Error fetching Shopify orders:', error);
      throw error;
    }
  }

  /**
   * Get a specific order by ID
   */
  async getOrder(orderId: number): Promise<ShopifyOrder> {
    try {
      const response = await this.makeRequest<{ order: ShopifyOrder }>(`/orders/${orderId}.json`);
      return response.order;
    } catch (error) {
      console.error(`Error fetching Shopify order ${orderId}:`, error);
      throw error;
    }
  }

  /**
   * Update order status
   */
  async updateOrder(orderId: number, updates: Partial<ShopifyOrder>): Promise<ShopifyOrder> {
    try {
      const response = await this.makeRequest<{ order: ShopifyOrder }>(`/orders/${orderId}.json`, {
        method: 'PUT',
        body: JSON.stringify({ order: updates }),
      });
      return response.order;
    } catch (error) {
      console.error(`Error updating Shopify order ${orderId}:`, error);
      throw error;
    }
  }

  /**
   * Sync products from Shopify to local database
   */
  async syncProductsToLocal(): Promise<void> {
    try {
      console.log('Starting Shopify product sync...');
      
      const shopifyProducts = await this.getProducts();
      const inventoryLevels = await this.getInventoryLevels();
      
      // Create a map of inventory levels by inventory_item_id
      const inventoryMap = new Map<number, number>();
      inventoryLevels.forEach(level => {
        inventoryMap.set(level.inventory_item_id, level.available);
      });

      for (const shopifyProduct of shopifyProducts) {
        // Use the first variant for pricing and inventory
        const primaryVariant = shopifyProduct.variants[0];
        if (!primaryVariant) continue;

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
            hubspotSyncStatus: 'PENDING',
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
              shopifyProductId: shopifyProduct.id,
              shopifyVariantId: primaryVariant.id,
            }),
            isActive: shopifyProduct.status === 'active',
            hubspotSyncStatus: 'PENDING',
          },
        });
      }

      console.log(`Successfully synced ${shopifyProducts.length} products from Shopify`);
    } catch (error) {
      console.error('Error syncing products from Shopify:', error);
      throw error;
    }
  }

  /**
   * Sync inventory levels from Shopify to local database
   */
  async syncInventoryToLocal(): Promise<void> {
    try {
      console.log('Starting Shopify inventory sync...');
      
      const inventoryLevels = await this.getInventoryLevels();
      
      for (const level of inventoryLevels) {
        // Find the product by inventory_item_id in specifications
        const products = await prisma.product.findMany({
          where: {
            specifications: {
              contains: `"shopifyVariantId":${level.inventory_item_id}`,
            },
          },
        });

        for (const product of products) {
          await prisma.product.update({
            where: { id: product.id },
            data: { inventory: level.available },
          });
        }
      }

      console.log(`Successfully synced inventory for ${inventoryLevels.length} items`);
    } catch (error) {
      console.error('Error syncing inventory from Shopify:', error);
      throw error;
    }
  }

  /**
   * Create order in Shopify from local order
   */
  async createOrderFromLocal(localOrderId: string): Promise<ShopifyOrder> {
    try {
      const localOrder = await prisma.order.findUnique({
        where: { id: localOrderId },
        include: {
          items: {
            include: { product: true },
          },
          user: true,
        },
      });

      if (!localOrder) {
        throw new Error(`Local order ${localOrderId} not found`);
      }

      // Map local order items to Shopify line items
      const lineItems = localOrder.items.map(item => {
        const specs = JSON.parse(item.product.specifications || '{}');
        return {
          variant_id: specs.shopifyVariantId,
          quantity: item.quantity,
          price: item.unitPrice.toString(),
        };
      });

      const shopifyOrder = await this.createOrder({
        email: localOrder.customerEmail,
        line_items: lineItems,
        financial_status: localOrder.paymentStatus === 'PAID' ? 'paid' : 'pending',
      });

      // Update local order with Shopify order ID
      await prisma.order.update({
        where: { id: localOrderId },
        data: {
          hubspotObjectId: shopifyOrder.id.toString(),
          hubspotSyncStatus: 'SYNCED',
          hubspotLastSync: new Date(),
        },
      });

      return shopifyOrder;
    } catch (error) {
      console.error(`Error creating Shopify order from local order ${localOrderId}:`, error);
      throw error;
    }
  }
}

export default ShopifyService;
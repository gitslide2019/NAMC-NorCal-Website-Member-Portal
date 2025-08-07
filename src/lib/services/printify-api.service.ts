/**
 * Printify API Service
 * Handles print-on-demand fulfillment integration
 */

export interface PrintifyProduct {
  id: string;
  title: string;
  description: string;
  tags: string[];
  options: PrintifyOption[];
  variants: PrintifyVariant[];
  images: PrintifyImage[];
  created_at: string;
  updated_at: string;
  visible: boolean;
  is_locked: boolean;
  blueprint_id: number;
  user_id: number;
  shop_id: number;
  print_provider_id: number;
  print_areas: PrintifyPrintArea[];
  sales_channel_properties: any[];
}

export interface PrintifyOption {
  name: string;
  type: string;
  values: PrintifyOptionValue[];
}

export interface PrintifyOptionValue {
  id: number;
  title: string;
  colors?: string[];
}

export interface PrintifyVariant {
  id: number;
  sku: string;
  cost: number;
  price: number;
  title: string;
  grams: number;
  is_enabled: boolean;
  is_default: boolean;
  is_available: boolean;
  options: number[];
}

export interface PrintifyImage {
  id: string;
  name: string;
  type: string;
  height: number;
  width: number;
  x: number;
  y: number;
  scale: number;
  angle: number;
}

export interface PrintifyPrintArea {
  variant_ids: number[];
  placeholders: PrintifyPlaceholder[];
}

export interface PrintifyPlaceholder {
  position: string;
  images: PrintifyImage[];
}

export interface PrintifyOrder {
  id: string;
  external_id: string;
  shop_id: number;
  status: string;
  shipping_method: number;
  is_printify_express: boolean;
  is_economy_shipping: boolean;
  shipments: PrintifyShipment[];
  address_to: PrintifyAddress;
  line_items: PrintifyLineItem[];
  metadata: any;
  total_price: number;
  total_shipping: number;
  total_tax: number;
  status_updated_at: string;
  sent_to_production_at: string;
  fulfilled_at: string;
  created_at: string;
  updated_at: string;
}

export interface PrintifyShipment {
  carrier: string;
  number: string;
  url: string;
  delivered_at: string;
}

export interface PrintifyAddress {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  country: string;
  region: string;
  address1: string;
  address2: string;
  city: string;
  zip: string;
}

export interface PrintifyLineItem {
  product_id: string;
  variant_id: number;
  quantity: number;
  print_provider_id: number;
  blueprint_id: number;
  sku: string;
  cost: number;
  shipping_cost: number;
  status: string;
  metadata: any;
  sent_to_production_at: string;
  fulfilled_at: string;
}

export interface PrintifyBlueprint {
  id: number;
  title: string;
  description: string;
  brand: string;
  model: string;
  images: string[];
}

export interface PrintifyPrintProvider {
  id: number;
  title: string;
  location: {
    address1: string;
    address2: string;
    city: string;
    country: string;
    region: string;
    zip: string;
  };
}

export interface PrintifyShippingInfo {
  handling_time: {
    value: number;
    unit: string;
  };
  profiles: PrintifyShippingProfile[];
}

export interface PrintifyShippingProfile {
  variant_ids: number[];
  first_item: {
    cost: number;
    currency: string;
  };
  additional_item: {
    cost: number;
    currency: string;
  };
  countries: string[];
}

export class PrintifyService {
  private baseUrl: string = 'https://api.printify.com/v1';
  private apiKey: string;
  private shopId: string;

  constructor() {
    const apiKey = process.env.PRINTIFY_API_KEY;
    const shopId = process.env.PRINTIFY_SHOP_ID;

    if (!apiKey || !shopId) {
      throw new Error('Missing required Printify environment variables');
    }

    this.apiKey = apiKey;
    this.shopId = shopId;
  }

  private async makeRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Printify API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    return response.json();
  }

  /**
   * Get all products from Printify shop
   */
  async getProducts(limit: number = 100, page: number = 1): Promise<{ data: PrintifyProduct[]; current_page: number; last_page: number; total: number }> {
    try {
      const response = await this.makeRequest<{ data: PrintifyProduct[]; current_page: number; last_page: number; total: number }>(
        `/shops/${this.shopId}/products.json?limit=${limit}&page=${page}`
      );
      return response;
    } catch (error) {
      console.error('Error fetching Printify products:', error);
      throw error;
    }
  }

  /**
   * Get a specific product by ID
   */
  async getProduct(productId: string): Promise<PrintifyProduct> {
    try {
      const response = await this.makeRequest<PrintifyProduct>(`/shops/${this.shopId}/products/${productId}.json`);
      return response;
    } catch (error) {
      console.error(`Error fetching Printify product ${productId}:`, error);
      throw error;
    }
  }

  /**
   * Create a new product in Printify
   */
  async createProduct(productData: {
    title: string;
    description: string;
    blueprint_id: number;
    print_provider_id: number;
    variants: Array<{
      id: number;
      price: number;
      is_enabled: boolean;
    }>;
    print_areas: PrintifyPrintArea[];
  }): Promise<PrintifyProduct> {
    try {
      const response = await this.makeRequest<PrintifyProduct>(`/shops/${this.shopId}/products.json`, {
        method: 'POST',
        body: JSON.stringify(productData),
      });
      return response;
    } catch (error) {
      console.error('Error creating Printify product:', error);
      throw error;
    }
  }

  /**
   * Update an existing product
   */
  async updateProduct(productId: string, updates: Partial<PrintifyProduct>): Promise<PrintifyProduct> {
    try {
      const response = await this.makeRequest<PrintifyProduct>(`/shops/${this.shopId}/products/${productId}.json`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
      return response;
    } catch (error) {
      console.error(`Error updating Printify product ${productId}:`, error);
      throw error;
    }
  }

  /**
   * Delete a product
   */
  async deleteProduct(productId: string): Promise<void> {
    try {
      await this.makeRequest(`/shops/${this.shopId}/products/${productId}.json`, {
        method: 'DELETE',
      });
    } catch (error) {
      console.error(`Error deleting Printify product ${productId}:`, error);
      throw error;
    }
  }

  /**
   * Get all orders from Printify
   */
  async getOrders(limit: number = 100, page: number = 1): Promise<{ data: PrintifyOrder[]; current_page: number; last_page: number; total: number }> {
    try {
      const response = await this.makeRequest<{ data: PrintifyOrder[]; current_page: number; last_page: number; total: number }>(
        `/shops/${this.shopId}/orders.json?limit=${limit}&page=${page}`
      );
      return response;
    } catch (error) {
      console.error('Error fetching Printify orders:', error);
      throw error;
    }
  }

  /**
   * Get a specific order by ID
   */
  async getOrder(orderId: string): Promise<PrintifyOrder> {
    try {
      const response = await this.makeRequest<PrintifyOrder>(`/shops/${this.shopId}/orders/${orderId}.json`);
      return response;
    } catch (error) {
      console.error(`Error fetching Printify order ${orderId}:`, error);
      throw error;
    }
  }

  /**
   * Create an order in Printify
   */
  async createOrder(orderData: {
    external_id: string;
    line_items: Array<{
      product_id: string;
      variant_id: number;
      quantity: number;
    }>;
    shipping_method: number;
    is_printify_express?: boolean;
    send_shipping_notification?: boolean;
    address_to: PrintifyAddress;
  }): Promise<PrintifyOrder> {
    try {
      const response = await this.makeRequest<PrintifyOrder>(`/shops/${this.shopId}/orders.json`, {
        method: 'POST',
        body: JSON.stringify({
          ...orderData,
          is_printify_express: orderData.is_printify_express || false,
          send_shipping_notification: orderData.send_shipping_notification || true,
        }),
      });
      return response;
    } catch (error) {
      console.error('Error creating Printify order:', error);
      throw error;
    }
  }

  /**
   * Cancel an order
   */
  async cancelOrder(orderId: string): Promise<void> {
    try {
      await this.makeRequest(`/shops/${this.shopId}/orders/${orderId}/cancel.json`, {
        method: 'POST',
      });
    } catch (error) {
      console.error(`Error canceling Printify order ${orderId}:`, error);
      throw error;
    }
  }

  /**
   * Send order to production
   */
  async sendOrderToProduction(orderId: string): Promise<void> {
    try {
      await this.makeRequest(`/shops/${this.shopId}/orders/${orderId}/send_to_production.json`, {
        method: 'POST',
      });
    } catch (error) {
      console.error(`Error sending Printify order ${orderId} to production:`, error);
      throw error;
    }
  }

  /**
   * Get available blueprints
   */
  async getBlueprints(): Promise<PrintifyBlueprint[]> {
    try {
      const response = await this.makeRequest<PrintifyBlueprint[]>('/catalog/blueprints.json');
      return response;
    } catch (error) {
      console.error('Error fetching Printify blueprints:', error);
      throw error;
    }
  }

  /**
   * Get blueprint details
   */
  async getBlueprint(blueprintId: number): Promise<PrintifyBlueprint> {
    try {
      const response = await this.makeRequest<PrintifyBlueprint>(`/catalog/blueprints/${blueprintId}.json`);
      return response;
    } catch (error) {
      console.error(`Error fetching Printify blueprint ${blueprintId}:`, error);
      throw error;
    }
  }

  /**
   * Get print providers for a blueprint
   */
  async getPrintProviders(blueprintId: number): Promise<PrintifyPrintProvider[]> {
    try {
      const response = await this.makeRequest<PrintifyPrintProvider[]>(`/catalog/blueprints/${blueprintId}/print_providers.json`);
      return response;
    } catch (error) {
      console.error(`Error fetching print providers for blueprint ${blueprintId}:`, error);
      throw error;
    }
  }

  /**
   * Get variants for a blueprint and print provider
   */
  async getVariants(blueprintId: number, printProviderId: number): Promise<PrintifyVariant[]> {
    try {
      const response = await this.makeRequest<{ variants: PrintifyVariant[] }>(
        `/catalog/blueprints/${blueprintId}/print_providers/${printProviderId}/variants.json`
      );
      return response.variants;
    } catch (error) {
      console.error(`Error fetching variants for blueprint ${blueprintId} and provider ${printProviderId}:`, error);
      throw error;
    }
  }

  /**
   * Get shipping information for a blueprint and print provider
   */
  async getShippingInfo(blueprintId: number, printProviderId: number): Promise<PrintifyShippingInfo> {
    try {
      const response = await this.makeRequest<PrintifyShippingInfo>(
        `/catalog/blueprints/${blueprintId}/print_providers/${printProviderId}/shipping.json`
      );
      return response;
    } catch (error) {
      console.error(`Error fetching shipping info for blueprint ${blueprintId} and provider ${printProviderId}:`, error);
      throw error;
    }
  }

  /**
   * Upload an image to Printify
   */
  async uploadImage(imageData: {
    file_name: string;
    contents: string; // Base64 encoded image
  }): Promise<{ id: string; file_name: string; height: number; width: number; size: number; mime_type: string; preview_url: string; upload_time: string }> {
    try {
      const response = await this.makeRequest<{ id: string; file_name: string; height: number; width: number; size: number; mime_type: string; preview_url: string; upload_time: string }>(
        '/uploads/images.json',
        {
          method: 'POST',
          body: JSON.stringify(imageData),
        }
      );
      return response;
    } catch (error) {
      console.error('Error uploading image to Printify:', error);
      throw error;
    }
  }

  /**
   * Calculate shipping cost for an order
   */
  async calculateShipping(orderData: {
    line_items: Array<{
      product_id: string;
      variant_id: number;
      quantity: number;
    }>;
    address_to: PrintifyAddress;
  }): Promise<{ standard: number; express: number }> {
    try {
      const response = await this.makeRequest<{ standard: number; express: number }>(
        `/shops/${this.shopId}/orders/shipping.json`,
        {
          method: 'POST',
          body: JSON.stringify(orderData),
        }
      );
      return response;
    } catch (error) {
      console.error('Error calculating Printify shipping:', error);
      throw error;
    }
  }

  /**
   * Get order events/tracking
   */
  async getOrderEvents(orderId: string): Promise<Array<{ type: string; created_at: string; resource: any }>> {
    try {
      const response = await this.makeRequest<Array<{ type: string; created_at: string; resource: any }>>(
        `/shops/${this.shopId}/orders/${orderId}/events.json`
      );
      return response;
    } catch (error) {
      console.error(`Error fetching events for Printify order ${orderId}:`, error);
      throw error;
    }
  }

  /**
   * Create order from local order data
   */
  async createOrderFromLocal(localOrderId: string, shippingMethod: number = 1): Promise<PrintifyOrder> {
    try {
      const { PrismaClient } = await import('@prisma/client');
      const prisma = new PrismaClient();

      const localOrder = await prisma.order.findUnique({
        where: { id: localOrderId },
        include: {
          items: {
            include: { product: true },
          },
        },
      });

      if (!localOrder) {
        throw new Error(`Local order ${localOrderId} not found`);
      }

      // Parse shipping address
      const shippingAddress = localOrder.shippingAddress 
        ? JSON.parse(localOrder.shippingAddress) 
        : null;

      if (!shippingAddress) {
        throw new Error(`No shipping address found for order ${localOrderId}`);
      }

      // Map local order items to Printify line items
      const lineItems = localOrder.items
        .filter(item => {
          const specs = JSON.parse(item.product.specifications || '{}');
          return specs.printifyProductId && specs.printifyVariantId;
        })
        .map(item => {
          const specs = JSON.parse(item.product.specifications || '{}');
          return {
            product_id: specs.printifyProductId,
            variant_id: specs.printifyVariantId,
            quantity: item.quantity,
          };
        });

      if (lineItems.length === 0) {
        throw new Error(`No Printify products found in order ${localOrderId}`);
      }

      const printifyOrder = await this.createOrder({
        external_id: localOrder.orderNumber,
        line_items: lineItems,
        shipping_method: shippingMethod,
        address_to: {
          first_name: shippingAddress.firstName || '',
          last_name: shippingAddress.lastName || '',
          email: localOrder.customerEmail,
          phone: shippingAddress.phone || '',
          country: shippingAddress.country || 'US',
          region: shippingAddress.state || shippingAddress.province || '',
          address1: shippingAddress.address1 || '',
          address2: shippingAddress.address2 || '',
          city: shippingAddress.city || '',
          zip: shippingAddress.zip || shippingAddress.postalCode || '',
        },
      });

      // Update local order with Printify order ID
      await prisma.order.update({
        where: { id: localOrderId },
        data: {
          hubspotSyncError: `printify:${printifyOrder.id}`,
        },
      });

      await prisma.$disconnect();
      return printifyOrder;
    } catch (error) {
      console.error(`Error creating Printify order from local order ${localOrderId}:`, error);
      throw error;
    }
  }
}

export default PrintifyService;
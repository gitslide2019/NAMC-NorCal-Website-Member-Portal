/**
 * HubSpot Backbone Service
 * 
 * Comprehensive HubSpot integration service that serves as the primary data repository
 * and workflow engine for all NAMC member portal features. This service manages:
 * - Custom objects for tools, growth plans, cost estimates, camera estimates, shop orders
 * - Custom properties for member portal features
 * - Automated workflows for member engagement and task management
 * - Real-time data synchronization via webhooks
 * - Core CRUD operations for all custom objects
 */

import { Client } from '@hubspot/api-client';
import { number } from 'framer-motion';
import { progressPercentage } from 'framer-motion';
import { progressPercentage } from 'framer-motion';
import { progressPercentage } from 'framer-motion';
import { progressPercentage } from 'framer-motion';
import { progressPercentage } from 'framer-motion';
import { progressPercentage } from 'framer-motion';
import { progressPercentage } from 'framer-motion';
import { progressPercentage } from 'framer-motion';
import { number } from 'framer-motion';
import { number } from 'framer-motion';
import { number } from 'framer-motion';
import { number } from 'framer-motion';
import { number } from 'framer-motion';
import { number } from 'framer-motion';
import { number } from 'framer-motion';
import { progressPercentage } from 'framer-motion';
import { number } from 'framer-motion';
import { number } from 'framer-motion';
import { number } from 'framer-motion';
import { number } from 'framer-motion';
import { number } from 'framer-motion';

interface HubSpotConfig {
  accessToken: string;
  portalId?: string;
}

interface HubSpotCustomObject {
  id?: string;
  properties: Record<string, any>;
  associations?: Array<{
    to: { id: string };
    types: Array<{
      associationCategory: string;
      associationTypeId: number | string;
    }>;
  }>;
}

interface HubSpotCustomProperty {
  name: string;
  label: string;
  description: string;
  groupName: string;
  type: 'string' | 'number' | 'date' | 'datetime' | 'enumeration' | 'bool';
  fieldType: 'text' | 'textarea' | 'select' | 'radio' | 'checkbox' | 'date' | 'file' | 'number';
  options?: Array<{ label: string; value: string; displayOrder?: number }>;
  required?: boolean;
  searchableInGlobalSearch?: boolean;
  calculated?: boolean;
  externalOptions?: boolean;
}

interface ToolReservationData {
  memberId: string;
  toolId: string;
  startDate: string;
  endDate: string;
  totalCost: number;
  status: 'pending' | 'confirmed' | 'active' | 'completed' | 'cancelled';
  checkoutCondition?: string;
  returnCondition?: string;
}

interface GrowthPlanData {
  memberId: string;
  planName: string;
  currentPhase: string;
  progressScore: number;
  aiAnalysis: any;
  roadmap: any;
  milestones: any[];
}

interface CostEstimateData {
  memberId: string;
  projectName: string;
  projectType: string;
  totalEstimate: number;
  rsMeansData: any;
  aiAdjustments: any;
  confidenceScore: number;
  forBidding?: boolean;
}

interface CameraEstimateData {
  memberId: string;
  sessionId: string;
  sceneAnalysis: any;
  materialAnalysis: any;
  estimatedCosts: any;
  confidence: number;
  mediaUrl: string;
}

interface ShopOrderData {
  memberId?: string;
  orderNumber: string;
  totalAmount: number;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  items: any[];
  shippingAddress?: any;
}

export class HubSpotBackboneService {
  private hubspotClient: Client;
  private portalId?: string;

  constructor(config: HubSpotConfig) {
    this.hubspotClient = new Client({
      accessToken: config.accessToken
    });
    this.portalId = config.portalId;
  }

  /**
   * Initialize HubSpot custom objects schema
   */
  async initializeCustomObjects(): Promise<{ success: boolean; results: any[] }> {
    const results: any[] = [];

    try {
      // Define custom objects
      const customObjects = [
        {
          name: 'tools',
          labels: {
            singular: 'Tool',
            plural: 'Tools'
          },
          primaryDisplayProperty: 'tool_name',
          requiredProperties: ['tool_name'],
          searchableProperties: ['tool_name', 'category', 'serial_number'],
          properties: [
            {
              name: 'tool_name',
              label: 'Tool Name',
              type: 'string',
              fieldType: 'text',
              description: 'Name of the tool or equipment'
            },
            {
              name: 'category',
              label: 'Category',
              type: 'enumeration',
              fieldType: 'select',
              description: 'Tool category',
              options: [
                { label: 'Power Tools', value: 'power_tools' },
                { label: 'Hand Tools', value: 'hand_tools' },
                { label: 'Heavy Equipment', value: 'heavy_equipment' },
                { label: 'Safety Equipment', value: 'safety_equipment' },
                { label: 'Measuring Tools', value: 'measuring_tools' }
              ]
            },
            {
              name: 'daily_rate',
              label: 'Daily Rate',
              type: 'number',
              fieldType: 'number',
              description: 'Daily rental rate in USD'
            },
            {
              name: 'condition',
              label: 'Condition',
              type: 'enumeration',
              fieldType: 'select',
              description: 'Current condition of the tool',
              options: [
                { label: 'Excellent', value: 'excellent' },
                { label: 'Good', value: 'good' },
                { label: 'Fair', value: 'fair' },
                { label: 'Needs Maintenance', value: 'needs_maintenance' }
              ]
            },
            {
              name: 'serial_number',
              label: 'Serial Number',
              type: 'string',
              fieldType: 'text',
              description: 'Tool serial number'
            },
            {
              name: 'location',
              label: 'Location',
              type: 'string',
              fieldType: 'text',
              description: 'Storage location'
            },
            {
              name: 'is_available',
              label: 'Available',
              type: 'bool',
              fieldType: 'checkbox',
              description: 'Whether tool is available for rental'
            }
          ]
        },
        {
          name: 'tool_reservations',
          labels: {
            singular: 'Tool Reservation',
            plural: 'Tool Reservations'
          },
          primaryDisplayProperty: 'reservation_id',
          requiredProperties: ['start_date', 'end_date'],
          searchableProperties: ['reservation_id', 'status'],
          properties: [
            {
              name: 'reservation_id',
              label: 'Reservation ID',
              type: 'string',
              fieldType: 'text',
              description: 'Unique reservation identifier'
            },
            {
              name: 'start_date',
              label: 'Start Date',
              type: 'date',
              fieldType: 'date',
              description: 'Reservation start date'
            },
            {
              name: 'end_date',
              label: 'End Date',
              type: 'date',
              fieldType: 'date',
              description: 'Reservation end date'
            },
            {
              name: 'status',
              label: 'Status',
              type: 'enumeration',
              fieldType: 'select',
              description: 'Reservation status',
              options: [
                { label: 'Pending', value: 'pending' },
                { label: 'Confirmed', value: 'confirmed' },
                { label: 'Active', value: 'active' },
                { label: 'Completed', value: 'completed' },
                { label: 'Cancelled', value: 'cancelled' }
              ]
            },
            {
              name: 'total_cost',
              label: 'Total Cost',
              type: 'number',
              fieldType: 'number',
              description: 'Total rental cost'
            },
            {
              name: 'checkout_condition',
              label: 'Checkout Condition',
              type: 'string',
              fieldType: 'textarea',
              description: 'Tool condition at checkout'
            },
            {
              name: 'return_condition',
              label: 'Return Condition',
              type: 'string',
              fieldType: 'textarea',
              description: 'Tool condition at return'
            }
          ]
        },
        {
          name: 'growth_plans',
          labels: {
            singular: 'Growth Plan',
            plural: 'Growth Plans'
          },
          primaryDisplayProperty: 'plan_name',
          requiredProperties: ['plan_name'],
          searchableProperties: ['plan_name', 'current_phase'],
          properties: [
            {
              name: 'plan_name',
              label: 'Plan Name',
              type: 'string',
              fieldType: 'text',
              description: 'Name of the business growth plan'
            },
            {
              name: 'current_phase',
              label: 'Current Phase',
              type: 'string',
              fieldType: 'text',
              description: 'Current phase of the growth plan'
            },
            {
              name: 'progress_score',
              label: 'Progress Score',
              type: 'number',
              fieldType: 'number',
              description: 'Progress score (0-100)'
            },
            {
              name: 'ai_analysis',
              label: 'AI Analysis',
              type: 'string',
              fieldType: 'textarea',
              description: 'AI-generated analysis and recommendations'
            },
            {
              name: 'roadmap_data',
              label: 'Roadmap Data',
              type: 'string',
              fieldType: 'textarea',
              description: 'JSON data for roadmap visualization'
            },
            {
              name: 'milestones',
              label: 'Milestones',
              type: 'string',
              fieldType: 'textarea',
              description: 'JSON data for milestones'
            }
          ]
        },
        {
          name: 'cost_estimates',
          labels: {
            singular: 'Cost Estimate',
            plural: 'Cost Estimates'
          },
          primaryDisplayProperty: 'project_name',
          requiredProperties: ['project_name', 'total_estimate'],
          searchableProperties: ['project_name', 'project_type'],
          properties: [
            {
              name: 'project_name',
              label: 'Project Name',
              type: 'string',
              fieldType: 'text',
              description: 'Name of the project'
            },
            {
              name: 'project_type',
              label: 'Project Type',
              type: 'enumeration',
              fieldType: 'select',
              description: 'Type of construction project',
              options: [
                { label: 'Residential', value: 'residential' },
                { label: 'Commercial', value: 'commercial' },
                { label: 'Industrial', value: 'industrial' },
                { label: 'Infrastructure', value: 'infrastructure' }
              ]
            },
            {
              name: 'total_estimate',
              label: 'Total Estimate',
              type: 'number',
              fieldType: 'number',
              description: 'Total project cost estimate'
            },
            {
              name: 'rs_means_data',
              label: 'RS Means Data',
              type: 'string',
              fieldType: 'textarea',
              description: 'JSON data from RS Means API'
            },
            {
              name: 'ai_adjustments',
              label: 'AI Adjustments',
              type: 'string',
              fieldType: 'textarea',
              description: 'AI-powered cost adjustments'
            },
            {
              name: 'confidence_score',
              label: 'Confidence Score',
              type: 'number',
              fieldType: 'number',
              description: 'Estimate confidence score (0-100)'
            },
            {
              name: 'bid_submitted',
              label: 'Bid Submitted',
              type: 'bool',
              fieldType: 'checkbox',
              description: 'Whether bid was submitted'
            },
            {
              name: 'bid_result',
              label: 'Bid Result',
              type: 'enumeration',
              fieldType: 'select',
              description: 'Result of submitted bid',
              options: [
                { label: 'Pending', value: 'pending' },
                { label: 'Won', value: 'won' },
                { label: 'Lost', value: 'lost' },
                { label: 'Withdrawn', value: 'withdrawn' }
              ]
            }
          ]
        },
        {
          name: 'camera_estimates',
          labels: {
            singular: 'Camera Estimate',
            plural: 'Camera Estimates'
          },
          primaryDisplayProperty: 'session_id',
          requiredProperties: ['session_id'],
          searchableProperties: ['session_id'],
          properties: [
            {
              name: 'session_id',
              label: 'Session ID',
              type: 'string',
              fieldType: 'text',
              description: 'Camera session identifier'
            },
            {
              name: 'scene_analysis',
              label: 'Scene Analysis',
              type: 'string',
              fieldType: 'textarea',
              description: 'AI scene analysis results'
            },
            {
              name: 'material_analysis',
              label: 'Material Analysis',
              type: 'string',
              fieldType: 'textarea',
              description: 'Material identification and analysis'
            },
            {
              name: 'estimated_costs',
              label: 'Estimated Costs',
              type: 'string',
              fieldType: 'textarea',
              description: 'Cost estimates from camera analysis'
            },
            {
              name: 'confidence',
              label: 'Confidence',
              type: 'number',
              fieldType: 'number',
              description: 'Analysis confidence score (0-100)'
            },
            {
              name: 'media_url',
              label: 'Media URL',
              type: 'string',
              fieldType: 'text',
              description: 'URL to captured media'
            }
          ]
        },
        {
          name: 'shop_orders',
          labels: {
            singular: 'Shop Order',
            plural: 'Shop Orders'
          },
          primaryDisplayProperty: 'order_number',
          requiredProperties: ['order_number', 'total_amount'],
          searchableProperties: ['order_number', 'order_status'],
          properties: [
            {
              name: 'order_number',
              label: 'Order Number',
              type: 'string',
              fieldType: 'text',
              description: 'Unique order number'
            },
            {
              name: 'total_amount',
              label: 'Total Amount',
              type: 'number',
              fieldType: 'number',
              description: 'Total order amount'
            },
            {
              name: 'order_status',
              label: 'Order Status',
              type: 'enumeration',
              fieldType: 'select',
              description: 'Current order status',
              options: [
                { label: 'Pending', value: 'pending' },
                { label: 'Processing', value: 'processing' },
                { label: 'Shipped', value: 'shipped' },
                { label: 'Delivered', value: 'delivered' },
                { label: 'Cancelled', value: 'cancelled' }
              ]
            },
            {
              name: 'payment_status',
              label: 'Payment Status',
              type: 'enumeration',
              fieldType: 'select',
              description: 'Payment status',
              options: [
                { label: 'Pending', value: 'pending' },
                { label: 'Paid', value: 'paid' },
                { label: 'Failed', value: 'failed' },
                { label: 'Refunded', value: 'refunded' }
              ]
            },
            {
              name: 'items_data',
              label: 'Items Data',
              type: 'string',
              fieldType: 'textarea',
              description: 'JSON data for order items'
            },
            {
              name: 'shipping_address',
              label: 'Shipping Address',
              type: 'string',
              fieldType: 'textarea',
              description: 'Shipping address information'
            }
          ]
        }
      ];

      // Create each custom object
      for (const objectDef of customObjects) {
        try {
          const response = await this.hubspotClient.crm.schemas.coreApi.create({
            name: objectDef.name,
            labels: objectDef.labels,
            primaryDisplayProperty: objectDef.primaryDisplayProperty,
            requiredProperties: objectDef.requiredProperties,
            searchableProperties: objectDef.searchableProperties,
            properties: objectDef.properties
          });

          results.push({
            object: objectDef.name,
            status: 'created',
            id: response.id
          });
        } catch (error: any) {
          if (error.code === 409) {
            results.push({
              object: objectDef.name,
              status: 'exists',
              message: 'Custom object already exists'
            });
          } else {
            results.push({
              object: objectDef.name,
              status: 'error',
              error: error.message
            });
          }
        }
      }

      return { success: true, results };
    } catch (error: any) {
      throw new Error(`Failed to initialize custom objects: ${error.message}`);
    }
  }

  /**
   * Configure custom properties for member portal features
   */
  async configureCustomProperties(): Promise<{ success: boolean; results: any[] }> {
    const results: any[] = [];

    try {
      // Enhanced contact properties for member portal
      const contactProperties: HubSpotCustomProperty[] = [
        {
          name: 'member_portal_access',
          label: 'Member Portal Access',
          description: 'Whether member has access to the portal',
          groupName: 'namc_member_portal',
          type: 'bool',
          fieldType: 'checkbox'
        },
        {
          name: 'onboarding_progress',
          label: 'Onboarding Progress',
          description: 'Member onboarding completion percentage',
          groupName: 'namc_member_portal',
          type: 'number',
          fieldType: 'number'
        },
        {
          name: 'onboarding_step',
          label: 'Current Onboarding Step',
          description: 'Current step in onboarding process',
          groupName: 'namc_member_portal',
          type: 'string',
          fieldType: 'text'
        },
        {
          name: 'tool_reservations_count',
          label: 'Tool Reservations Count',
          description: 'Number of tool reservations made',
          groupName: 'namc_member_metrics',
          type: 'number',
          fieldType: 'number'
        },
        {
          name: 'growth_plan_active',
          label: 'Active Growth Plan',
          description: 'Whether member has an active growth plan',
          groupName: 'namc_member_portal',
          type: 'bool',
          fieldType: 'checkbox'
        },
        {
          name: 'cost_estimates_count',
          label: 'Cost Estimates Count',
          description: 'Number of cost estimates created',
          groupName: 'namc_member_metrics',
          type: 'number',
          fieldType: 'number'
        },
        {
          name: 'shop_orders_count',
          label: 'Shop Orders Count',
          description: 'Number of shop orders placed',
          groupName: 'namc_member_metrics',
          type: 'number',
          fieldType: 'number'
        },
        {
          name: 'last_portal_activity',
          label: 'Last Portal Activity',
          description: 'Date of last portal activity',
          groupName: 'namc_member_portal',
          type: 'datetime',
          fieldType: 'date'
        },
        {
          name: 'portal_engagement_score',
          label: 'Portal Engagement Score',
          description: 'Member engagement score (0-100)',
          groupName: 'namc_member_metrics',
          type: 'number',
          fieldType: 'number'
        }
      ];

      // Create contact properties
      for (const property of contactProperties) {
        try {
          await this.hubspotClient.crm.properties.coreApi.create('contacts', {
            name: property.name,
            label: property.label,
            description: property.description,
            groupName: property.groupName,
            type: property.type,
            fieldType: property.fieldType,
            options: property.options,
            required: property.required || false,
            searchableInGlobalSearch: property.searchableInGlobalSearch || false,
            calculated: property.calculated || false,
            externalOptions: property.externalOptions || false
          });

          results.push({
            object: 'contact',
            property: property.name,
            status: 'created'
          });
        } catch (error: any) {
          if (error.code === 409) {
            results.push({
              object: 'contact',
              property: property.name,
              status: 'exists'
            });
          } else {
            results.push({
              object: 'contact',
              property: property.name,
              status: 'error',
              error: error.message
            });
          }
        }
      }

      return { success: true, results };
    } catch (error: any) {
      throw new Error(`Failed to configure custom properties: ${error.message}`);
    }
  }

  /**
   * Tool Lending Library Operations
   */
  async createToolReservation(data: ToolReservationData): Promise<HubSpotCustomObject> {
    try {
      const reservation = await this.hubspotClient.crm.objects.basicApi.create('tool_reservations', {
        properties: {
          reservation_id: `RES-${Date.now()}`,
          start_date: data.startDate,
          end_date: data.endDate,
          status: data.status,
          total_cost: data.totalCost.toString(),
          checkout_condition: data.checkoutCondition || '',
          return_condition: data.returnCondition || ''
        },
        associations: [
          {
            to: { id: data.memberId },
            types: [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 1 }]
          },
          {
            to: { id: data.toolId },
            types: [{ associationCategory: 'USER_DEFINED', associationTypeId: 'tool_to_reservation' }]
          }
        ]
      });

      // Trigger tool reservation workflow
      await this.triggerWorkflow('tool_reservation_created', reservation.id);

      return reservation;
    } catch (error: any) {
      throw new Error(`Failed to create tool reservation: ${error.message}`);
    }
  }

  async updateToolReservation(reservationId: string, updates: Partial<ToolReservationData>): Promise<HubSpotCustomObject> {
    try {
      const updateData: any = {};
      
      if (updates.status) updateData.status = updates.status;
      if (updates.totalCost) updateData.total_cost = updates.totalCost.toString();
      if (updates.checkoutCondition) updateData.checkout_condition = updates.checkoutCondition;
      if (updates.returnCondition) updateData.return_condition = updates.returnCondition;

      const reservation = await this.hubspotClient.crm.objects.basicApi.update('tool_reservations', reservationId, {
        properties: updateData
      });

      // Trigger update workflow
      await this.triggerWorkflow('tool_reservation_updated', reservationId);

      return reservation;
    } catch (error: any) {
      throw new Error(`Failed to update tool reservation: ${error.message}`);
    }
  }

  /**
   * Growth Plan Operations
   */
  async createGrowthPlan(data: GrowthPlanData): Promise<HubSpotCustomObject> {
    try {
      const growthPlan = await this.hubspotClient.crm.objects.basicApi.create('growth_plans', {
        properties: {
          plan_name: data.planName,
          current_phase: data.currentPhase,
          progress_score: data.progressScore.toString(),
          ai_analysis: JSON.stringify(data.aiAnalysis),
          roadmap_data: JSON.stringify(data.roadmap),
          milestones: JSON.stringify(data.milestones)
        },
        associations: [
          {
            to: { id: data.memberId },
            types: [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 1 }]
          }
        ]
      });

      // Trigger growth plan workflow
      await this.triggerWorkflow('growth_plan_created', growthPlan.id);

      return growthPlan;
    } catch (error: any) {
      throw new Error(`Failed to create growth plan: ${error.message}`);
    }
  }

  async updateGrowthPlan(planId: string, updates: Partial<GrowthPlanData>): Promise<HubSpotCustomObject> {
    try {
      const updateData: any = {};
      
      if (updates.currentPhase) updateData.current_phase = updates.currentPhase;
      if (updates.progressScore !== undefined) updateData.progress_score = updates.progressScore.toString();
      if (updates.aiAnalysis) updateData.ai_analysis = JSON.stringify(updates.aiAnalysis);
      if (updates.roadmap) updateData.roadmap_data = JSON.stringify(updates.roadmap);
      if (updates.milestones) updateData.milestones = JSON.stringify(updates.milestones);

      const growthPlan = await this.hubspotClient.crm.objects.basicApi.update('growth_plans', planId, {
        properties: updateData
      });

      // Trigger update workflow
      await this.triggerWorkflow('growth_plan_updated', planId);

      return growthPlan;
    } catch (error: any) {
      throw new Error(`Failed to update growth plan: ${error.message}`);
    }
  }

  /**
   * Cost Estimate Operations
   */
  async createCostEstimate(data: CostEstimateData): Promise<HubSpotCustomObject> {
    try {
      const costEstimate = await this.hubspotClient.crm.objects.basicApi.create('cost_estimates', {
        properties: {
          project_name: data.projectName,
          project_type: data.projectType,
          total_estimate: data.totalEstimate.toString(),
          rs_means_data: JSON.stringify(data.rsMeansData),
          ai_adjustments: JSON.stringify(data.aiAdjustments),
          confidence_score: data.confidenceScore.toString(),
          bid_submitted: data.forBidding ? 'true' : 'false',
          bid_result: 'pending'
        },
        associations: [
          {
            to: { id: data.memberId },
            types: [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 1 }]
          }
        ]
      });

      // Trigger cost estimate workflow
      await this.triggerWorkflow('cost_estimate_created', costEstimate.id);

      return costEstimate;
    } catch (error: any) {
      throw new Error(`Failed to create cost estimate: ${error.message}`);
    }
  }

  /**
   * Camera Estimate Operations
   */
  async createCameraEstimate(data: CameraEstimateData): Promise<HubSpotCustomObject> {
    try {
      const cameraEstimate = await this.hubspotClient.crm.objects.basicApi.create('camera_estimates', {
        properties: {
          session_id: data.sessionId,
          scene_analysis: JSON.stringify(data.sceneAnalysis),
          material_analysis: JSON.stringify(data.materialAnalysis),
          estimated_costs: JSON.stringify(data.estimatedCosts),
          confidence: data.confidence.toString(),
          media_url: data.mediaUrl
        },
        associations: [
          {
            to: { id: data.memberId },
            types: [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 1 }]
          }
        ]
      });

      // Trigger camera estimate workflow
      await this.triggerWorkflow('camera_estimate_created', cameraEstimate.id);

      return cameraEstimate;
    } catch (error: any) {
      throw new Error(`Failed to create camera estimate: ${error.message}`);
    }
  }

  /**
   * Shop Order Operations
   */
  async createShopOrder(data: ShopOrderData): Promise<HubSpotCustomObject> {
    try {
      const shopOrder = await this.hubspotClient.crm.objects.basicApi.create('shop_orders', {
        properties: {
          order_number: data.orderNumber,
          total_amount: data.totalAmount.toString(),
          order_status: data.status,
          payment_status: data.paymentStatus,
          items_data: JSON.stringify(data.items),
          shipping_address: data.shippingAddress ? JSON.stringify(data.shippingAddress) : ''
        },
        associations: data.memberId ? [
          {
            to: { id: data.memberId },
            types: [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 1 }]
          }
        ] : []
      });

      // Trigger shop order workflow
      await this.triggerWorkflow('shop_order_created', shopOrder.id);

      return shopOrder;
    } catch (error: any) {
      throw new Error(`Failed to create shop order: ${error.message}`);
    }
  }

  /**
   * Generic CRUD Operations
   */
  async getCustomObject(objectType: string, objectId: string): Promise<HubSpotCustomObject> {
    try {
      return await this.hubspotClient.crm.objects.basicApi.getById(objectType, objectId);
    } catch (error: any) {
      throw new Error(`Failed to get ${objectType}: ${error.message}`);
    }
  }

  async updateCustomObject(objectType: string, objectId: string, properties: Record<string, any>): Promise<HubSpotCustomObject> {
    try {
      return await this.hubspotClient.crm.objects.basicApi.update(objectType, objectId, { properties });
    } catch (error: any) {
      throw new Error(`Failed to update ${objectType}: ${error.message}`);
    }
  }

  async deleteCustomObject(objectType: string, objectId: string): Promise<void> {
    try {
      await this.hubspotClient.crm.objects.basicApi.archive(objectType, objectId);
    } catch (error: any) {
      throw new Error(`Failed to delete ${objectType}: ${error.message}`);
    }
  }

  async searchCustomObjects(objectType: string, filters: any[]): Promise<any> {
    try {
      const searchRequest = {
        filterGroups: [{ filters }],
        properties: ['*'],
        associations: ['contacts', 'deals', 'companies']
      };

      return await this.hubspotClient.crm.objects.searchApi.doSearch(objectType, searchRequest);
    } catch (error: any) {
      throw new Error(`Failed to search ${objectType}: ${error.message}`);
    }
  }

  /**
   * Task Management Operations
   */
  async createTask(taskData: {
    subject: string;
    description: string;
    priority: string;
    type: string;
    dueDate?: Date;
    assigneeId: string;
    memberId: string;
    projectId?: string;
    companyId?: string;
  }): Promise<any> {
    try {
      const task = await this.hubspotClient.crm.objects.tasks.basicApi.create({
        properties: {
          hs_task_subject: taskData.subject,
          hs_task_body: taskData.description,
          hs_task_status: 'NOT_STARTED',
          hs_task_priority: taskData.priority,
          hs_task_type: taskData.type,
          hubspot_owner_id: taskData.assigneeId,
          hs_task_due_date: taskData.dueDate?.toISOString(),
          assigned_by: taskData.memberId,
          assigned_date: new Date().toISOString()
        },
        associations: [
          // Associate with contact (member)
          {
            to: { id: taskData.memberId },
            types: [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 204 }]
          },
          // Associate with project/deal if applicable
          ...(taskData.projectId ? [{
            to: { id: taskData.projectId },
            types: [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 214 }]
          }] : []),
          // Associate with company if applicable
          ...(taskData.companyId ? [{
            to: { id: taskData.companyId },
            types: [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 190 }]
          }] : [])
        ]
      });

      // Trigger task assignment workflow
      await this.triggerWorkflow('task_assigned', task.id);

      return task;
    } catch (error: any) {
      throw new Error(`Failed to create task: ${error.message}`);
    }
  }

  async assignTaskToMember(
    taskId: string,
    assigneeId: string,
    assignedBy: string
  ): Promise<void> {
    try {
      await this.hubspotClient.crm.objects.tasks.basicApi.update(taskId, {
        properties: {
          hubspot_owner_id: assigneeId,
          assigned_by: assignedBy,
          assigned_date: new Date().toISOString(),
          hs_task_status: 'IN_PROGRESS'
        }
      });

      // Trigger assignment notification workflow
      await this.triggerWorkflow('task_reassigned', taskId);
    } catch (error: any) {
      throw new Error(`Failed to assign task: ${error.message}`);
    }
  }

  async completeTask(
    taskId: string,
    completedBy: string,
    completionNotes?: string
  ): Promise<void> {
    try {
      await this.hubspotClient.crm.objects.tasks.basicApi.update(taskId, {
        properties: {
          hs_task_status: 'COMPLETED',
          completed_by: completedBy,
          completion_date: new Date().toISOString(),
          completion_notes: completionNotes || ''
        }
      });

      // Update project progress if task is project-related
      const task = await this.hubspotClient.crm.objects.tasks.basicApi.getById(taskId, undefined, undefined, ['deals']);
      if (task.associations?.deals && task.associations.deals.length > 0) {
        await this.updateProjectProgress(task.associations.deals[0].id);
      }

      // Trigger completion workflow
      await this.triggerWorkflow('task_completed', taskId);
    } catch (error: any) {
      throw new Error(`Failed to complete task: ${error.message}`);
    }
  }

  async getMemberTasks(
    memberId: string,
    status?: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED'
  ): Promise<any[]> {
    try {
      const filterGroups = [
        {
          filters: [
            {
              propertyName: 'associations.contact',
              operator: 'EQ',
              value: memberId
            },
            ...(status ? [{
              propertyName: 'hs_task_status',
              operator: 'EQ',
              value: status
            }] : [])
          ]
        }
      ];

      const tasks = await this.hubspotClient.crm.objects.tasks.searchApi.doSearch({
        filterGroups,
        properties: [
          'hs_task_subject',
          'hs_task_body',
          'hs_task_status',
          'hs_task_priority',
          'hs_task_due_date',
          'hubspot_owner_id',
          'hs_createdate',
          'hs_lastmodifieddate',
          'assigned_by',
          'assigned_date',
          'completed_by',
          'completion_date',
          'completion_notes',
          'delegated_from',
          'delegated_to',
          'delegation_date',
          'delegation_notes'
        ],
        associations: ['contacts', 'deals']
      });

      return tasks.results;
    } catch (error: any) {
      throw new Error(`Failed to get member tasks: ${error.message}`);
    }
  }

  async delegateTask(
    taskId: string,
    fromMemberId: string,
    toMemberId: string,
    delegationNotes?: string
  ): Promise<void> {
    try {
      // Create delegation record
      await this.hubspotClient.crm.objects.tasks.basicApi.update(taskId, {
        properties: {
          delegated_from: fromMemberId,
          delegated_to: toMemberId,
          delegation_date: new Date().toISOString(),
          delegation_notes: delegationNotes || '',
          hubspot_owner_id: toMemberId,
          hs_task_status: 'IN_PROGRESS'
        }
      });

      // Trigger delegation workflow
      await this.triggerWorkflow('task_delegated', taskId);
    } catch (error: any) {
      throw new Error(`Failed to delegate task: ${error.message}`);
    }
  }

  async searchTasks(searchRequest: any): Promise<any> {
    try {
      return await this.hubspotClient.crm.objects.tasks.searchApi.doSearch(searchRequest);
    } catch (error: any) {
      throw new Error(`Failed to search tasks: ${error.message}`);
    }
  }

  async getTask(taskId: string): Promise<any> {
    try {
      return await this.hubspotClient.crm.objects.tasks.basicApi.getById(
        taskId,
        [
          'hs_task_subject',
          'hs_task_body',
          'hs_task_status',
          'hs_task_priority',
          'hs_task_type',
          'hs_task_due_date',
          'hubspot_owner_id',
          'hs_createdate',
          'hs_lastmodifieddate',
          'assigned_by',
          'assigned_date',
          'completed_by',
          'completion_date',
          'completion_notes',
          'delegated_from',
          'delegated_to',
          'delegation_date',
          'delegation_notes'
        ],
        undefined,
        ['contacts', 'deals', 'companies']
      );
    } catch (error: any) {
      throw new Error(`Failed to get task: ${error.message}`);
    }
  }

  async updateTask(taskId: string, updates: Record<string, any>): Promise<any> {
    try {
      return await this.hubspotClient.crm.objects.tasks.basicApi.update(taskId, {
        properties: updates
      });
    } catch (error: any) {
      throw new Error(`Failed to update task: ${error.message}`);
    }
  }

  async deleteTask(taskId: string): Promise<void> {
    try {
      await this.hubspotClient.crm.objects.tasks.basicApi.archive(taskId);
    } catch (error: any) {
      throw new Error(`Failed to delete task: ${error.message}`);
    }
  }

  /**
   * Project Progress Tracking
   */
  async updateProjectProgress(projectId: string): Promise<void> {
    try {
      // Get all tasks associated with the project
      const tasks = await this.hubspotClient.crm.objects.tasks.searchApi.doSearch({
        filterGroups: [{
          filters: [{
            propertyName: 'associations.deal',
            operator: 'EQ',
            value: projectId
          }]
        }],
        properties: ['hs_task_status']
      });

      if (tasks.results.length === 0) return;

      // Calculate completion percentage
      const completedTasks = tasks.results.filter(
        (task: any) => task.properties.hs_task_status === 'COMPLETED'
      ).length;
      
      const progressPercentage = Math.round((completedTasks / tasks.results.length) * 100);

      // Update project deal with progress
      await this.hubspotClient.crm.deals.basicApi.update(projectId, {
        properties: {
          project_progress: progressPercentage.toString(),
          completed_tasks: completedTasks.toString(),
          total_tasks: tasks.results.length.toString(),
          last_task_update: new Date().toISOString()
        }
      });

      // Trigger project progress workflow if milestone reached
      if (progressPercentage === 25 || progressPercentage === 50 || 
          progressPercentage === 75 || progressPercentage === 100) {
        await this.triggerWorkflow('project_milestone_reached', projectId);
      }
    } catch (error: any) {
      console.error('Failed to update project progress:', error.message);
      // Don't throw error to avoid breaking task completion
    }
  }e<any[]> {
    try {
      const response = await this.hubspotClient.crm.objects.searchApi.doSearch(objectType, {
        filterGroups: [{ filters }],
        properties: ['*'],
        limit: 100
      });
      return response.results;
    } catch (error: any) {
      throw new Error(`Failed to search ${objectType}: ${error.message}`);
    }
  }

  /**
   * Create a custom object
   */
  async createCustomObject(objectType: string, properties: Record<string, any>): Promise<HubSpotCustomObject> {
    try {
      return await this.hubspotClient.crm.objects.basicApi.create(objectType, { properties });
    } catch (error: any) {
      throw new Error(`Failed to create ${objectType}: ${error.message}`);
    }
  }

  /**
   * Trigger HubSpot workflow
   */
  async triggerWorkflow(workflowName: string, objectId: string): Promise<void> {
    try {
      // This would typically use HubSpot's workflow API
      // For now, we'll log the workflow trigger
      console.log(`Triggering workflow: ${workflowName} for object: ${objectId}`);
      
      // In a real implementation, you would:
      // 1. Get the workflow ID by name
      // 2. Enroll the object in the workflow
      // await this.hubspotClient.automation.workflows.enrollmentsApi.create(workflowId, { objectId });
    } catch (error: any) {
      console.error(`Failed to trigger workflow ${workflowName}:`, error);
      // Don't throw error to avoid breaking the main operation
    }
  }e<any> {
    try {
      return await this.hubspotClient.crm.objects.searchApi.doSearch(objectType, {
        filterGroups: [{ filters }],
        properties: ['*']
      });
    } catch (error: any) {
      throw new Error(`Failed to search ${objectType}: ${error.message}`);
    }
  }

  /**
   * Workflow Management
   */
  private async triggerWorkflow(workflowName: string, objectId: string): Promise<void> {
    try {
      // In a real implementation, this would trigger specific HubSpot workflows
      // For now, we'll log the workflow trigger
      console.log(`Triggering workflow: ${workflowName} for object: ${objectId}`);
      
      // This would be implemented with HubSpot's workflow API or webhook calls
      // await this.hubspotClient.automation.workflows.enrollmentApi.enroll(workflowId, { objectId });
    } catch (error: any) {
      console.error(`Failed to trigger workflow ${workflowName}:`, error.message);
    }
  }

  /**
   * Member Profile Integration
   */
  async getMemberProfile(memberId: string): Promise<any> {
    try {
      const contact = await this.hubspotClient.crm.contacts.basicApi.getById(
        memberId,
        [
          'email', 'firstname', 'lastname', 'company', 'member_type',
          'onboarding_current_step', 'onboarding_completed_steps', 'onboarding_skipped_steps',
          'onboarding_tech_comfort', 'onboarding_progress_percentage', 'onboarding_struggling_areas',
          'onboarding_badges', 'onboarding_is_completed', 'onboarding_completed_at'
        ]
      );
      
      return {
        id: contact.id,
        email: contact.properties.email,
        firstName: contact.properties.firstname,
        lastName: contact.properties.lastname,
        company: contact.properties.company,
        memberType: contact.properties.member_type,
        onboarding_current_step: contact.properties.onboarding_current_step ? 
          parseInt(contact.properties.onboarding_current_step) : 0,
        onboarding_completed_steps: contact.properties.onboarding_completed_steps,
        onboarding_skipped_steps: contact.properties.onboarding_skipped_steps,
        onboarding_tech_comfort: contact.properties.onboarding_tech_comfort,
        onboarding_progress_percentage: contact.properties.onboarding_progress_percentage ? 
          parseFloat(contact.properties.onboarding_progress_percentage) : 0,
        onboarding_struggling_areas: contact.properties.onboarding_struggling_areas,
        onboarding_badges: contact.properties.onboarding_badges,
        onboarding_is_completed: contact.properties.onboarding_is_completed === 'true',
        onboarding_completed_at: contact.properties.onboarding_completed_at
      };
    } catch (error: any) {
      throw new Error(`Failed to get member profile: ${error.message}`);
    }
  }

  async updateMemberProfile(memberId: string, updates: Record<string, any>): Promise<void> {
    try {
      const hubspotProperties: Record<string, string> = {};
      
      // Transform updates to HubSpot property format
      Object.keys(updates).forEach(key => {
        const value = updates[key];
        if (value !== undefined && value !== null) {
          if (typeof value === 'boolean') {
            hubspotProperties[key] = value.toString();
          } else if (typeof value === 'number') {
            hubspotProperties[key] = value.toString();
          } else if (value instanceof Date) {
            hubspotProperties[key] = value.toISOString();
          } else {
            hubspotProperties[key] = value.toString();
          }
        }
      });

      await this.hubspotClient.crm.contacts.basicApi.update(memberId, {
        properties: hubspotProperties
      });
    } catch (error: any) {
      throw new Error(`Failed to update member profile: ${error.message}`);
    }
  }

  async updateMemberPortalMetrics(memberId: string, metrics: {
    toolReservationsCount?: number;
    costEstimatesCount?: number;
    shopOrdersCount?: number;
    lastPortalActivity?: Date;
    engagementScore?: number;
  }): Promise<void> {
    try {
      const updateData: any = {};
      
      if (metrics.toolReservationsCount !== undefined) {
        updateData.tool_reservations_count = metrics.toolReservationsCount.toString();
      }
      if (metrics.costEstimatesCount !== undefined) {
        updateData.cost_estimates_count = metrics.costEstimatesCount.toString();
      }
      if (metrics.shopOrdersCount !== undefined) {
        updateData.shop_orders_count = metrics.shopOrdersCount.toString();
      }
      if (metrics.lastPortalActivity) {
        updateData.last_portal_activity = metrics.lastPortalActivity.toISOString();
      }
      if (metrics.engagementScore !== undefined) {
        updateData.portal_engagement_score = metrics.engagementScore.toString();
      }

      await this.hubspotClient.crm.contacts.basicApi.update(memberId, {
        properties: updateData
      });
    } catch (error: any) {
      throw new Error(`Failed to update member portal metrics: ${error.message}`);
    }
  }

  /**
   * Association Management
   */
  async createAssociation(fromObjectType: string, fromObjectId: string, toObjectType: string, toObjectId: string, associationTypeId: number): Promise<void> {
    try {
      await this.hubspotClient.crm.associations.v4.basicApi.create(
        fromObjectType,
        fromObjectId,
        toObjectType,
        toObjectId,
        [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId }]
      );
    } catch (error: any) {
      throw new Error(`Failed to create association: ${error.message}`);
    }
  }

  /**
   * Batch Operations
   */
  async batchCreateCustomObjects(objectType: string, objects: Array<{ properties: Record<string, any> }>): Promise<any> {
    try {
      return await this.hubspotClient.crm.objects.batchApi.create(objectType, { inputs: objects });
    } catch (error: any) {
      throw new Error(`Failed to batch create ${objectType}: ${error.message}`);
    }
  }

  async batchUpdateCustomObjects(objectType: string, updates: Array<{ id: string; properties: Record<string, any> }>): Promise<any> {
    try {
      return await this.hubspotClient.crm.objects.batchApi.update(objectType, { inputs: updates });
    } catch (error: any) {
      throw new Error(`Failed to batch update ${objectType}: ${error.message}`);
    }
  }

  /**
   * OCR Business Card Contact Management
   */
  async createContactFromOCR(
    ocrData: {
      firstName?: string;
      lastName?: string;
      company?: string;
      title?: string;
      email?: string;
      phone?: string;
      website?: string;
      address?: string;
      confidence: number;
    },
    scannedBy: string
  ): Promise<any> {
    try {
      const contactProperties: Record<string, any> = {
        lead_source: 'business_card_scan',
        scanned_by: scannedBy,
        ocr_confidence: ocrData.confidence.toString(),
        hs_lead_status: 'NEW'
      };

      // Add contact information if available
      if (ocrData.firstName) contactProperties.firstname = ocrData.firstName;
      if (ocrData.lastName) contactProperties.lastname = ocrData.lastName;
      if (ocrData.email) contactProperties.email = ocrData.email;
      if (ocrData.phone) contactProperties.phone = ocrData.phone;
      if (ocrData.company) contactProperties.company = ocrData.company;
      if (ocrData.title) contactProperties.jobtitle = ocrData.title;
      if (ocrData.website) contactProperties.website = ocrData.website;
      if (ocrData.address) contactProperties.address = ocrData.address;

      const contact = await this.hubspotClient.crm.contacts.basicApi.create({
        properties: contactProperties
      });

      // Trigger business card scanned workflow
      await this.triggerWorkflow('business_card_scanned', contact.id);

      return contact;
    } catch (error: any) {
      throw new Error(`Failed to create contact from OCR: ${error.message}`);
    }
  }

  async checkForDuplicateContacts(
    email?: string,
    phone?: string,
    firstName?: string,
    lastName?: string,
    company?: string
  ): Promise<{ isDuplicate: boolean; existingContactId?: string }> {
    try {
      // Check by email first (most reliable)
      if (email) {
        const emailSearch = await this.hubspotClient.crm.contacts.searchApi.doSearch({
          filterGroups: [{
            filters: [{
              propertyName: 'email',
              operator: 'EQ',
              value: email
            }]
          }],
          properties: ['email', 'firstname', 'lastname'],
          limit: 1
        });

        if (emailSearch.results && emailSearch.results.length > 0) {
          return {
            isDuplicate: true,
            existingContactId: emailSearch.results[0].id
          };
        }
      }

      // Check by phone if no email match
      if (phone) {
        const phoneSearch = await this.hubspotClient.crm.contacts.searchApi.doSearch({
          filterGroups: [{
            filters: [{
              propertyName: 'phone',
              operator: 'EQ',
              value: phone
            }]
          }],
          properties: ['phone', 'firstname', 'lastname'],
          limit: 1
        });

        if (phoneSearch.results && phoneSearch.results.length > 0) {
          return {
            isDuplicate: true,
            existingContactId: phoneSearch.results[0].id
          };
        }
      }

      // Check by name and company combination
      if (firstName && lastName && company) {
        const nameCompanySearch = await this.hubspotClient.crm.contacts.searchApi.doSearch({
          filterGroups: [{
            filters: [
              {
                propertyName: 'firstname',
                operator: 'EQ',
                value: firstName
              },
              {
                propertyName: 'lastname',
                operator: 'EQ',
                value: lastName
              },
              {
                propertyName: 'company',
                operator: 'EQ',
                value: company
              }
            ]
          }],
          properties: ['firstname', 'lastname', 'company'],
          limit: 1
        });

        if (nameCompanySearch.results && nameCompanySearch.results.length > 0) {
          return {
            isDuplicate: true,
            existingContactId: nameCompanySearch.results[0].id
          };
        }
      }

      return { isDuplicate: false };
    } catch (error: any) {
      console.error('Error checking for duplicate contacts:', error);
      return { isDuplicate: false };
    }
  }

  async inviteContactToMembership(contactId: string): Promise<void> {
    try {
      // Update contact with membership invitation status
      await this.hubspotClient.crm.contacts.basicApi.update(contactId, {
        properties: {
          membership_invitation_sent: 'true',
          membership_invitation_date: new Date().toISOString(),
          hs_lead_status: 'INVITED_TO_MEMBERSHIP'
        }
      });

      // Trigger membership invitation workflow
      await this.triggerWorkflow('membership_invitation', contactId);
    } catch (error: any) {
      throw new Error(`Failed to invite contact to membership: ${error.message}`);
    }
  }

  async createNetworkingTask(
    contactId: string,
    assigneeId: string,
    taskType: 'follow_up' | 'meeting_request' | 'project_discussion',
    dueDate?: Date
  ): Promise<any> {
    try {
      const taskProperties: Record<string, any> = {
        hs_task_subject: this.getTaskSubjectByType(taskType),
        hs_task_body: this.getTaskBodyByType(taskType),
        hs_task_status: 'NOT_STARTED',
        hs_task_priority: 'MEDIUM',
        hs_task_type: 'CALL',
        hubspot_owner_id: assigneeId
      };

      if (dueDate) {
        taskProperties.hs_task_due_date = dueDate.toISOString();
      }

      const task = await this.hubspotClient.crm.objects.tasks.basicApi.create({
        properties: taskProperties,
        associations: [
          {
            to: { id: contactId },
            types: [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 204 }]
          }
        ]
      });

      return task;
    } catch (error: any) {
      throw new Error(`Failed to create networking task: ${error.message}`);
    }
  }

  private getTaskSubjectByType(taskType: string): string {
    switch (taskType) {
      case 'follow_up':
        return 'Follow up with business card contact';
      case 'meeting_request':
        return 'Schedule meeting with new contact';
      case 'project_discussion':
        return 'Discuss potential project opportunities';
      default:
        return 'Contact networking task';
    }
  }

  private getTaskBodyByType(taskType: string): string {
    switch (taskType) {
      case 'follow_up':
        return 'Follow up with this contact from business card scan to introduce NAMC and explore potential collaboration opportunities.';
      case 'meeting_request':
        return 'Reach out to schedule an introductory meeting to discuss NAMC membership benefits and potential project collaborations.';
      case 'project_discussion':
        return 'Contact to discuss specific project opportunities and how NAMC members can provide value.';
      default:
        return 'General networking task for business card contact.';
    }
  }
}

  /**
   * Task Management Operations
   */
  async createTask(taskData: {
    subject: string;
    description: string;
    priority: string;
    type: string;
    dueDate?: Date;
    assigneeId: string;
    memberId: string;
    projectId?: string;
    companyId?: string;
  }): Promise<any> {
    try {
      const task = await this.hubspotClient.crm.objects.tasks.basicApi.create({
        properties: {
          hs_task_subject: taskData.subject,
          hs_task_body: taskData.description,
          hs_task_status: 'NOT_STARTED',
          hs_task_priority: taskData.priority,
          hs_task_type: taskData.type,
          hubspot_owner_id: taskData.assigneeId,
          hs_task_due_date: taskData.dueDate?.toISOString(),
          assigned_by: taskData.memberId,
          assigned_date: new Date().toISOString()
        },
        associations: [
          // Associate with contact (member)
          {
            to: { id: taskData.memberId },
            types: [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 204 }]
          },
          // Associate with project/deal if applicable
          ...(taskData.projectId ? [{
            to: { id: taskData.projectId },
            types: [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 214 }]
          }] : []),
          // Associate with company if applicable
          ...(taskData.companyId ? [{
            to: { id: taskData.companyId },
            types: [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 190 }]
          }] : [])
        ]
      });

      // Trigger task assignment workflow
      await this.triggerWorkflow('task_assigned', task.id);

      return task;
    } catch (error: any) {
      throw new Error(`Failed to create task: ${error.message}`);
    }
  }

  async assignTaskToMember(
    taskId: string,
    assigneeId: string,
    assignedBy: string
  ): Promise<void> {
    try {
      await this.hubspotClient.crm.objects.tasks.basicApi.update(taskId, {
        properties: {
          hubspot_owner_id: assigneeId,
          assigned_by: assignedBy,
          assigned_date: new Date().toISOString(),
          hs_task_status: 'IN_PROGRESS'
        }
      });

      // Trigger assignment notification workflow
      await this.triggerWorkflow('task_reassigned', taskId);
    } catch (error: any) {
      throw new Error(`Failed to assign task: ${error.message}`);
    }
  }

  async completeTask(
    taskId: string,
    completedBy: string,
    completionNotes?: string
  ): Promise<void> {
    try {
      await this.hubspotClient.crm.objects.tasks.basicApi.update(taskId, {
        properties: {
          hs_task_status: 'COMPLETED',
          completed_by: completedBy,
          completion_date: new Date().toISOString(),
          completion_notes: completionNotes || ''
        }
      });

      // Update project progress if task is project-related
      const task = await this.hubspotClient.crm.objects.tasks.basicApi.getById(taskId, undefined, undefined, ['deals']);
      if (task.associations?.deals && task.associations.deals.length > 0) {
        await this.updateProjectProgress(task.associations.deals[0].id);
      }

      // Trigger completion workflow
      await this.triggerWorkflow('task_completed', taskId);
    } catch (error: any) {
      throw new Error(`Failed to complete task: ${error.message}`);
    }
  }

  async getMemberTasks(
    memberId: string,
    status?: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED'
  ): Promise<any[]> {
    try {
      const filterGroups = [
        {
          filters: [
            {
              propertyName: 'associations.contact',
              operator: 'EQ',
              value: memberId
            },
            ...(status ? [{
              propertyName: 'hs_task_status',
              operator: 'EQ',
              value: status
            }] : [])
          ]
        }
      ];

      const tasks = await this.hubspotClient.crm.objects.tasks.searchApi.doSearch({
        filterGroups,
        properties: [
          'hs_task_subject',
          'hs_task_body',
          'hs_task_status',
          'hs_task_priority',
          'hs_task_due_date',
          'hubspot_owner_id',
          'hs_createdate',
          'hs_lastmodifieddate',
          'assigned_by',
          'assigned_date',
          'completed_by',
          'completion_date',
          'completion_notes',
          'delegated_from',
          'delegated_to',
          'delegation_date',
          'delegation_notes'
        ],
        associations: ['contacts', 'deals']
      });

      return tasks.results;
    } catch (error: any) {
      throw new Error(`Failed to get member tasks: ${error.message}`);
    }
  }

  async delegateTask(
    taskId: string,
    fromMemberId: string,
    toMemberId: string,
    delegationNotes?: string
  ): Promise<void> {
    try {
      // Create delegation record
      await this.hubspotClient.crm.objects.tasks.basicApi.update(taskId, {
        properties: {
          delegated_from: fromMemberId,
          delegated_to: toMemberId,
          delegation_date: new Date().toISOString(),
          delegation_notes: delegationNotes || '',
          hubspot_owner_id: toMemberId,
          hs_task_status: 'IN_PROGRESS'
        }
      });

      // Trigger delegation workflow
      await this.triggerWorkflow('task_delegated', taskId);
    } catch (error: any) {
      throw new Error(`Failed to delegate task: ${error.message}`);
    }
  }

  async searchTasks(searchRequest: any): Promise<any> {
    try {
      return await this.hubspotClient.crm.objects.tasks.searchApi.doSearch(searchRequest);
    } catch (error: any) {
      throw new Error(`Failed to search tasks: ${error.message}`);
    }
  }

  async getTask(taskId: string): Promise<any> {
    try {
      return await this.hubspotClient.crm.objects.tasks.basicApi.getById(
        taskId,
        [
          'hs_task_subject',
          'hs_task_body',
          'hs_task_status',
          'hs_task_priority',
          'hs_task_type',
          'hs_task_due_date',
          'hubspot_owner_id',
          'hs_createdate',
          'hs_lastmodifieddate',
          'assigned_by',
          'assigned_date',
          'completed_by',
          'completion_date',
          'completion_notes',
          'delegated_from',
          'delegated_to',
          'delegation_date',
          'delegation_notes'
        ],
        undefined,
        ['contacts', 'deals', 'companies']
      );
    } catch (error: any) {
      throw new Error(`Failed to get task: ${error.message}`);
    }
  }

  async updateTask(taskId: string, updates: Record<string, any>): Promise<any> {
    try {
      return await this.hubspotClient.crm.objects.tasks.basicApi.update(taskId, {
        properties: updates
      });
    } catch (error: any) {
      throw new Error(`Failed to update task: ${error.message}`);
    }
  }

  async deleteTask(taskId: string): Promise<void> {
    try {
      await this.hubspotClient.crm.objects.tasks.basicApi.archive(taskId);
    } catch (error: any) {
      throw new Error(`Failed to delete task: ${error.message}`);
    }
  }

  /**
   * Project Progress Tracking
   */
  async updateProjectProgress(projectId: string): Promise<void> {
    try {
      // Get all tasks associated with the project
      const tasks = await this.hubspotClient.crm.objects.tasks.searchApi.doSearch({
        filterGroups: [{
          filters: [{
            propertyName: 'associations.deal',
            operator: 'EQ',
            value: projectId
          }]
        }],
        properties: ['hs_task_status']
      });

      if (tasks.results.length === 0) return;

      // Calculate completion percentage
      const completedTasks = tasks.results.filter(
        (task: any) => task.properties.hs_task_status === 'COMPLETED'
      ).length;
      
      const progressPercentage = Math.round((completedTasks / tasks.results.length) * 100);

      // Update project deal with progress
      await this.hubspotClient.crm.deals.basicApi.update(projectId, {
        properties: {
          project_progress: progressPercentage.toString(),
          completed_tasks: completedTasks.toString(),
          total_tasks: tasks.results.length.toString(),
          last_task_update: new Date().toISOString()
        }
      });

      // Trigger project progress workflow if milestone reached
      if (progressPercentage === 25 || progressPercentage === 50 || 
          progressPercentage === 75 || progressPercentage === 100) {
        await this.triggerWorkflow('project_milestone_reached', projectId);
      }
    } catch (error: any) {
      console.error('Failed to update project progress:', error.message);
      // Don't throw error to avoid breaking task completion
    }
  }

  /**
   * Growth Plan Management
   */
  async createOrUpdateGrowthPlan(
    memberId: string,
    planData: {
      planId: string;
      planName: string;
      currentPhase: string;
      assessmentData: any;
      progressScore: number;
    }
  ): Promise<any> {
    try {
      // For now, return a mock response since HubSpot integration is not fully set up
      // In production, this would create/update HubSpot custom objects
      console.log('Creating/updating growth plan in HubSpot:', {
        memberId,
        planData
      });

      return {
        id: `hubspot_plan_${planData.planId}`,
        properties: {
          plan_name: planData.planName,
          current_phase: planData.currentPhase,
          progress_score: planData.progressScore.toString(),
          ai_analysis: JSON.stringify(planData.assessmentData)
        }
      };
    } catch (error) {
      console.error('HubSpot growth plan creation error:', error);
      throw error;
    }
  }

  async getOwnerForMember(memberId: string): Promise<string> {
    try {
      // Get the member's assigned owner or default to a system owner
      const contact = await this.hubspotClient.crm.contacts.basicApi.getById(
        memberId,
        ['hubspot_owner_id']
      );
      
      return contact.properties.hubspot_owner_id || process.env.HUBSPOT_DEFAULT_OWNER_ID || '';
    } catch (error: any) {
      console.error('Failed to get owner for member:', error.message);
      return process.env.HUBSPOT_DEFAULT_OWNER_ID || '';
    }
  }

  async triggerWorkflow(workflowName: string, objectId: string): Promise<void> {
    try {
      // In a real implementation, this would trigger specific HubSpot workflows
      // For now, we'll log the workflow trigger for debugging
      console.log(`Triggering workflow: ${workflowName} for object: ${objectId}`);
      
      // You would implement actual workflow triggering here based on your HubSpot setup
      // This might involve calling specific workflow endpoints or updating properties
      // that trigger automated workflows in HubSpot
    } catch (error: any) {
      console.error(`Failed to trigger workflow ${workflowName}:`, error.message);
      // Don't throw error to avoid breaking the main operation
    }
  }

  /**
   * Project Management Methods
   */
  async getProject(projectId: string): Promise<any> {
    try {
      return await this.hubspotClient.crm.deals.basicApi.getById(
        projectId,
        [
          'dealname',
          'dealstage',
          'amount',
          'hubspot_owner_id',
          'project_start_date',
          'project_end_date',
          'project_progress',
          'completed_tasks',
          'total_tasks',
          'last_task_update',
          'tasks_generated',
          'tasks_generated_date',
          'tasks_generated_count',
          'template_type'
        ],
        undefined,
        ['contacts', 'companies']
      );
    } catch (error: any) {
      throw new Error(`Failed to get project: ${error.message}`);
    }
  }

  async updateProject(projectId: string, updates: Record<string, any>): Promise<any> {
    try {
      return await this.hubspotClient.crm.deals.basicApi.update(projectId, {
        properties: updates
      });
    } catch (error: any) {
      throw new Error(`Failed to update project: ${error.message}`);
    }
  }

  async getProjectTasks(projectId: string): Promise<any[]> {
    try {
      const tasks = await this.hubspotClient.crm.objects.tasks.searchApi.doSearch({
        filterGroups: [{
          filters: [{
            propertyName: 'associations.deal',
            operator: 'EQ',
            value: projectId
          }]
        }],
        properties: [
          'hs_task_subject',
          'hs_task_body',
          'hs_task_status',
          'hs_task_priority',
          'hs_task_type',
          'hs_task_due_date',
          'hubspot_owner_id',
          'hs_createdate',
          'hs_lastmodifieddate',
          'assigned_by',
          'assigned_date',
          'completed_by',
          'completion_date',
          'completion_notes'
        ],
        associations: ['contacts', 'deals'],
        sorts: [{
          propertyName: 'hs_task_due_date',
          direction: 'ASCENDING'
        }]
      });

      return tasks.results;
    } catch (error: any) {
      throw new Error(`Failed to get project tasks: ${error.message}`);
    }
  }

  async addProjectNote(projectId: string, noteData: {
    note: string;
    author: string;
    timestamp: string;
    type: string;
  }): Promise<any> {
    try {
      // Create a note associated with the project deal
      const note = await this.hubspotClient.crm.objects.notes.basicApi.create({
        properties: {
          hs_note_body: noteData.note,
          hs_timestamp: noteData.timestamp,
          note_type: noteData.type,
          note_author: noteData.author
        },
        associations: [{
          to: { id: projectId },
          types: [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 214 }]
        }]
      });

      return note;
    } catch (error: any) {
      throw new Error(`Failed to add project note: ${error.message}`);
    }
  }

  /**
   * QuickBooks Integration Methods
   */
  async updateMemberProperty(propertyName: string, value: string, memberId?: string): Promise<void> {
    try {
      // If no memberId provided, this would need to be called with a specific member context
      if (!memberId) {
        throw new Error('Member ID required for property update');
      }

      await this.hubspotClient.crm.contacts.basicApi.update(memberId, {
        properties: {
          [propertyName]: value
        }
      });
    } catch (error: any) {
      throw new Error(`Failed to update member property ${propertyName}: ${error.message}`);
    }
  }

  async getMemberProperty(propertyName: string, memberId?: string): Promise<string | null> {
    try {
      if (!memberId) {
        throw new Error('Member ID required for property retrieval');
      }

      const contact = await this.hubspotClient.crm.contacts.basicApi.getById(
        memberId,
        [propertyName]
      );

      return contact.properties?.[propertyName] || null;
    } catch (error: any) {
      console.error(`Failed to get member property ${propertyName}:`, error);
      return null;
    }
  }

  async updateQuickBooksConnectionStatus(
    memberId: string,
    connected: boolean,
    realmId?: string,
    companyName?: string
  ): Promise<void> {
    try {
      const properties: Record<string, string> = {
        quickbooks_connected: connected.toString(),
        quickbooks_connected_date: connected ? new Date().toISOString() : '',
        quickbooks_disconnected_date: !connected ? new Date().toISOString() : ''
      };

      if (realmId) {
        properties.quickbooks_realm_id = realmId;
      }

      if (companyName) {
        properties.quickbooks_company_name = companyName;
      }

      await this.hubspotClient.crm.contacts.basicApi.update(memberId, {
        properties
      });

      // Trigger appropriate workflow
      if (connected) {
        await this.triggerWorkflow('quickbooks_connected', memberId);
      } else {
        await this.triggerWorkflow('quickbooks_disconnected', memberId);
      }
    } catch (error: any) {
      throw new Error(`Failed to update QuickBooks connection status: ${error.message}`);
    }
  }

  async getQuickBooksConnectionInfo(memberId: string): Promise<{
    connected: boolean;
    realmId?: string;
    companyName?: string;
    connectedDate?: string;
    lastSync?: string;
  }> {
    try {
      const contact = await this.hubspotClient.crm.contacts.basicApi.getById(
        memberId,
        [
          'quickbooks_connected',
          'quickbooks_realm_id',
          'quickbooks_company_name',
          'quickbooks_connected_date',
          'quickbooks_last_sync'
        ]
      );

      const properties = contact.properties || {};

      return {
        connected: properties.quickbooks_connected === 'true',
        realmId: properties.quickbooks_realm_id || undefined,
        companyName: properties.quickbooks_company_name || undefined,
        connectedDate: properties.quickbooks_connected_date || undefined,
        lastSync: properties.quickbooks_last_sync || undefined
      };
    } catch (error: any) {
      console.error('Failed to get QuickBooks connection info:', error);
      return { connected: false };
    }
  }

  async updateQuickBooksSyncStatus(
    memberId: string,
    syncStatus: 'PENDING' | 'SYNCED' | 'ERROR',
    syncError?: string
  ): Promise<void> {
    try {
      const properties: Record<string, string> = {
        quickbooks_sync_status: syncStatus,
        quickbooks_last_sync: new Date().toISOString()
      };

      if (syncError) {
        properties.quickbooks_sync_error = syncError;
      }

      await this.hubspotClient.crm.contacts.basicApi.update(memberId, {
        properties
      });
    } catch (error: any) {
      throw new Error(`Failed to update QuickBooks sync status: ${error.message}`);
    }
  }
}

export default HubSpotBackboneService;//
 Project Budget Management Interfaces
interface ProjectBudgetData {
  projectId: string;
  memberId: string;
  totalBudget: number;
  memberFunding: number;
  sponsorFunding: number;
  crowdFunding: number;
  contractValue: number;
  profitMargin: number;
}

interface BudgetAlertData {
  projectId: string;
  budgetId: string;
  utilizationPercentage: number;
  spentAmount: number;
  totalBudget: number;
}

interface FundingCampaignData {
  budgetId?: string;
  createdBy: string;
  campaignTitle: string;
  targetAmount: number;
  campaignType: string;
  campaignStatus: string;
  startDate: string;
  endDate: string;
  jobsToCreate: number;
  trainingHours: number;
  localHireTarget: number;
}

interface SocialImpactMetricsData {
  projectId: string;
  memberId: string;
  jobsCreated: number;
  jobsPlanned: number;
  trainingHoursProvided: number;
  localHirePercentage: number;
  minorityHirePercentage: number;
  communityBenefitScore: number;
  socialValueCreated: number;
  investmentAmount: number;
  sroiRatio: number;
  milestonesCompleted?: number;
}

// Project Budget Management Methods
export class ProjectBudgetService {
  private hubspotClient: Client;

  constructor() {
    this.hubspotClient = new Client({
      accessToken: process.env.HUBSPOT_ACCESS_TOKEN
    });
  }

  // Project Budget Management
  async createProjectBudget(budgetData: ProjectBudgetData): Promise<HubSpotCustomObject> {
    const budget = await this.hubspotClient.crm.objects.basicApi.create(
      'project_budgets',
      {
        properties: {
          project_id: budgetData.projectId,
          total_project_value: budgetData.contractValue,
          total_budget: budgetData.totalBudget,
          member_funding: budgetData.memberFunding,
          sponsor_funding: budgetData.sponsorFunding,
          crowd_funding: budgetData.crowdFunding,
          profit_margin: budgetData.profitMargin,
          budget_status: 'ACTIVE'
        },
        associations: [
          {
            to: { id: budgetData.memberId },
            types: [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 1 }]
          },
          {
            to: { id: budgetData.projectId },
            types: [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 5 }]
          }
        ]
      }
    );

    // Trigger budget creation workflow
    await this.triggerWorkflow('project_budget_created', budget.id);

    return budget;
  }

  async updateProjectBudget(
    budgetId: string,
    updates: Partial<ProjectBudgetData>
  ): Promise<void> {
    await this.hubspotClient.crm.objects.basicApi.update(
      'project_budgets',
      budgetId,
      {
        properties: this.transformToHubSpotProperties(updates)
      }
    );

    // Trigger budget update workflow
    await this.triggerWorkflow('project_budget_updated', budgetId);
  }

  async triggerBudgetAlert(alertData: BudgetAlertData): Promise<void> {
    // Create engagement for budget alert
    await this.hubspotClient.crm.objects.basicApi.create(
      'engagements',
      {
        properties: {
          engagement_type: 'BUDGET_ALERT',
          project_id: alertData.projectId,
          budget_id: alertData.budgetId,
          utilization_percentage: alertData.utilizationPercentage,
          spent_amount: alertData.spentAmount,
          total_budget: alertData.totalBudget,
          alert_level: alertData.utilizationPercentage >= 0.9 ? 'CRITICAL' : 'WARNING'
        }
      }
    );

    // Trigger budget alert workflow
    await this.triggerWorkflow('budget_threshold_alert', alertData.budgetId);
  }

  // Funding Campaign Management
  async createFundingCampaign(campaignData: FundingCampaignData): Promise<HubSpotCustomObject> {
    const campaign = await this.hubspotClient.crm.objects.basicApi.create(
      'funding_campaigns',
      {
        properties: {
          campaign_title: campaignData.campaignTitle,
          target_amount: campaignData.targetAmount,
          raised_amount: 0,
          campaign_type: campaignData.campaignType,
          campaign_status: campaignData.campaignStatus,
          start_date: campaignData.startDate,
          end_date: campaignData.endDate,
          jobs_to_create: campaignData.jobsToCreate,
          training_hours: campaignData.trainingHours,
          local_hire_target: campaignData.localHireTarget
        },
        associations: [
          {
            to: { id: campaignData.createdBy },
            types: [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 1 }]
          },
          ...(campaignData.budgetId ? [{
            to: { id: campaignData.budgetId },
            types: [{ associationCategory: 'USER_DEFINED', associationTypeId: 'budget_to_campaign' }]
          }] : [])
        ]
      }
    );

    // Trigger campaign creation workflow
    await this.triggerWorkflow('funding_campaign_created', campaign.id);

    return campaign;
  }

  async updateFundingCampaign(
    campaignId: string,
    updates: Partial<FundingCampaignData>
  ): Promise<void> {
    await this.hubspotClient.crm.objects.basicApi.update(
      'funding_campaigns',
      campaignId,
      {
        properties: this.transformToHubSpotProperties(updates)
      }
    );

    // Trigger campaign update workflow
    await this.triggerWorkflow('funding_campaign_updated', campaignId);
  }

  // Social Impact Metrics
  async createSocialImpactMetrics(metricsData: SocialImpactMetricsData): Promise<HubSpotCustomObject> {
    const metrics = await this.hubspotClient.crm.objects.basicApi.create(
      'social_impact_metrics',
      {
        properties: {
          project_id: metricsData.projectId,
          jobs_created: metricsData.jobsCreated,
          jobs_planned: metricsData.jobsPlanned,
          training_hours_provided: metricsData.trainingHoursProvided,
          local_hire_percentage: metricsData.localHirePercentage,
          minority_hire_percentage: metricsData.minorityHirePercentage,
          community_benefit_score: metricsData.communityBenefitScore,
          social_value_created: metricsData.socialValueCreated,
          investment_amount: metricsData.investmentAmount,
          sroi_ratio: metricsData.sroiRatio
        },
        associations: [
          {
            to: { id: metricsData.memberId },
            types: [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 1 }]
          },
          {
            to: { id: metricsData.projectId },
            types: [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 5 }]
          }
        ]
      }
    );

    return metrics;
  }

  async updateSocialImpactMetrics(
    metricsId: string,
    updates: Partial<SocialImpactMetricsData>
  ): Promise<void> {
    await this.hubspotClient.crm.objects.basicApi.update(
      'social_impact_metrics',
      metricsId,
      {
        properties: this.transformToHubSpotProperties(updates)
      }
    );

    // Trigger impact milestone workflow if significant progress
    if (updates.milestonesCompleted) {
      await this.triggerWorkflow('social_impact_milestone', metricsId);
    }
  }

  // Helper methods
  private transformToHubSpotProperties(data: any): Record<string, any> {
    const properties: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined && value !== null) {
        // Convert camelCase to snake_case for HubSpot
        const hubspotKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
        properties[hubspotKey] = value;
      }
    }
    
    return properties;
  }

  private async triggerWorkflow(workflowName: string, objectId: string): Promise<void> {
    try {
      // This would trigger a HubSpot workflow
      // Implementation depends on specific workflow setup
      console.log(`Triggering workflow: ${workflowName} for object: ${objectId}`);
    } catch (error) {
      console.error(`Failed to trigger workflow ${workflowName}:`, error);
    }
  }
}

  // Website Request Integration
  async createWebsiteRequestTicket(requestData: {
    memberId: string;
    memberName: string;
    memberEmail: string;
    businessName: string;
    businessType: string;
    businessFocus?: string;
    domainPreference?: string;
    professionalEmail?: string;
    customRequests?: string;
    requestId: string;
  }): Promise<any> {
    try {
      const ticket = await this.hubspotClient.crm.tickets.basicApi.create({
        properties: {
          hs_ticket_subject: `Website Request: ${requestData.businessName}`,
          content: `New professional website request from ${requestData.memberName}
          
Business Details:
- Business Name: ${requestData.businessName}
- Business Type: ${requestData.businessType}
- Business Focus: ${requestData.businessFocus || 'Not specified'}
- Domain Preference: ${requestData.domainPreference || 'Use NAMC subdomain'}
- Professional Email: ${requestData.professionalEmail || 'Not specified'}

Custom Requests:
${requestData.customRequests || 'None'}

Request ID: ${requestData.requestId}
Member Email: ${requestData.memberEmail}`,
          hs_ticket_priority: 'MEDIUM',
          hs_ticket_category: 'WEBSITE_REQUEST',
          hs_pipeline: 'website_requests',
          hs_pipeline_stage: 'pending_review'
        },
        associations: [
          {
            to: { id: requestData.memberId },
            types: [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 16 }]
          }
        ]
      });

      return ticket;
    } catch (error: any) {
      throw new Error(`Failed to create website request ticket: ${error.message}`);
    }
  }

  async updateWebsiteRequestStatus(updateData: {
    ticketId: string;
    status: string;
    assignedAdmin?: string;
    estimatedCompletion?: Date;
    rejectionReason?: string;
  }): Promise<void> {
    try {
      const stageMap = {
        'APPROVED': 'approved',
        'REJECTED': 'rejected',
        'IN_PROGRESS': 'in_progress',
        'COMPLETED': 'completed'
      };

      const updateProperties: any = {
        hs_pipeline_stage: stageMap[updateData.status as keyof typeof stageMap] || 'pending_review'
      };

      if (updateData.assignedAdmin) {
        updateProperties.hubspot_owner_id = await this.getOwnerIdByName(updateData.assignedAdmin);
      }

      if (updateData.estimatedCompletion) {
        updateProperties.estimated_completion = updateData.estimatedCompletion.toISOString();
      }

      if (updateData.rejectionReason) {
        updateProperties.rejection_reason = updateData.rejectionReason;
      }

      await this.hubspotClient.crm.tickets.basicApi.update(updateData.ticketId, {
        properties: updateProperties
      });
    } catch (error: any) {
      throw new Error(`Failed to update website request status: ${error.message}`);
    }
  }

  async closeWebsiteRequestTicket(ticketId: string): Promise<void> {
    try {
      await this.hubspotClient.crm.tickets.basicApi.update(ticketId, {
        properties: {
          hs_pipeline_stage: 'closed'
        }
      });
    } catch (error: any) {
      throw new Error(`Failed to close website request ticket: ${error.message}`);
    }
  }

  async sendWebsiteRequestConfirmation(data: {
    memberEmail: string;
    memberName: string;
    businessName: string;
    ticketId: string;
  }): Promise<void> {
    try {
      // This would integrate with HubSpot's email service
      // For now, we'll log the action
      console.log('Website request confirmation sent:', {
        to: data.memberEmail,
        subject: `Website Request Received - ${data.businessName}`,
        ticketId: data.ticketId
      });
    } catch (error: any) {
      console.error('Failed to send website request confirmation:', error.message);
    }
  }

  async sendWebsiteRequestApproval(data: {
    memberEmail: string;
    memberName: string;
    businessName: string;
    estimatedCompletion?: Date;
  }): Promise<void> {
    try {
      console.log('Website request approval sent:', {
        to: data.memberEmail,
        subject: `Website Request Approved - ${data.businessName}`,
        estimatedCompletion: data.estimatedCompletion
      });
    } catch (error: any) {
      console.error('Failed to send website request approval:', error.message);
    }
  }

  async sendWebsiteRequestRejection(data: {
    memberEmail: string;
    memberName: string;
    businessName: string;
    rejectionReason: string;
  }): Promise<void> {
    try {
      console.log('Website request rejection sent:', {
        to: data.memberEmail,
        subject: `Website Request Update - ${data.businessName}`,
        reason: data.rejectionReason
      });
    } catch (error: any) {
      console.error('Failed to send website request rejection:', error.message);
    }
  }

  private async getOwnerIdByName(name: string): Promise<string> {
    try {
      // This would look up HubSpot owner by name
      // For now, return a placeholder
      return 'owner_id_placeholder';
    } catch (error: any) {
      console.error('Failed to get owner ID by name:', error.message);
      return 'owner_id_placeholder';
    }
  }
}
/
/ Compliance Review Integration Types
interface ComplianceReviewData {
  localId: string;
  memberId: string;
  documentType: string;
  documentName: string;
  complianceScore: number;
  riskLevel: string;
  complianceStatus: string;
  issuesFound: number;
  aiRecommendations: string[];
  regulatoryRequirements: string[];
}

// Add compliance methods to HubSpotBackboneService class
export class HubSpotComplianceService extends HubSpotBackboneService {
  // Compliance Review Integration
  async createComplianceReview(reviewData: ComplianceReviewData): Promise<any> {
    try {
      const review = await this.hubspotClient.crm.objects.basicApi.create(
        'compliance_reviews',
        {
          properties: {
            document_id: reviewData.localId,
            document_type: reviewData.documentType,
            document_name: reviewData.documentName,
            compliance_score: reviewData.complianceScore.toString(),
            risk_level: reviewData.riskLevel,
            compliance_status: reviewData.complianceStatus,
            issues_found: reviewData.issuesFound.toString(),
            ai_recommendations: JSON.stringify(reviewData.aiRecommendations),
            regulatory_requirements: JSON.stringify(reviewData.regulatoryRequirements),
            review_date: new Date().toISOString()
          },
          associations: [
            {
              to: { id: reviewData.memberId },
              types: [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 1 }]
            }
          ]
        }
      );

      return review;
    } catch (error) {
      console.error('Error creating compliance review in HubSpot:', error);
      throw error;
    }
  }

  async updateComplianceReview(
    hubspotId: string,
    updates: Partial<ComplianceReviewData>
  ): Promise<void> {
    try {
      const properties: Record<string, string> = {};
      
      if (updates.complianceScore !== undefined) {
        properties.compliance_score = updates.complianceScore.toString();
      }
      if (updates.riskLevel) {
        properties.risk_level = updates.riskLevel;
      }
      if (updates.complianceStatus) {
        properties.compliance_status = updates.complianceStatus;
      }
      if (updates.issuesFound !== undefined) {
        properties.issues_found = updates.issuesFound.toString();
      }
      if (updates.aiRecommendations) {
        properties.ai_recommendations = JSON.stringify(updates.aiRecommendations);
      }
      if (updates.regulatoryRequirements) {
        properties.regulatory_requirements = JSON.stringify(updates.regulatoryRequirements);
      }

      await this.hubspotClient.crm.objects.basicApi.update(hubspotId, {
        properties
      });
    } catch (error) {
      console.error('Error updating compliance review in HubSpot:', error);
      throw error;
    }
  }

  async getComplianceReviews(memberId: string): Promise<any[]> {
    try {
      const results = await this.hubspotClient.crm.objects.searchApi.doSearch('compliance_reviews', {
        filterGroups: [
          {
            filters: [
              {
                propertyName: 'associations.contact',
                operator: 'EQ',
                value: memberId
              }
            ]
          }
        ],
        properties: [
          'document_id',
          'document_type',
          'document_name',
          'compliance_score',
          'risk_level',
          'compliance_status',
          'issues_found',
          'ai_recommendations',
          'regulatory_requirements',
          'review_date'
        ],
        sorts: [
          {
            propertyName: 'review_date',
            direction: 'DESCENDING'
          }
        ]
      });

      return results.results || [];
    } catch (error) {
      console.error('Error fetching compliance reviews from HubSpot:', error);
      return [];
    }
  }
}
// Communi
ty Platform Integration Methods
export class HubSpotCommunityService extends HubSpotBackboneService {
  
  // Community Discussion Methods
  async createCommunityDiscussion(discussionData: {
    discussionId: string;
    title: string;
    content: string;
    category: string;
    discussionType: string;
    authorId: string;
    tags: string[];
    isPublic: boolean;
  }): Promise<any> {
    try {
      const discussion = await this.hubspotClient.crm.objects.basicApi.create(
        'community_discussions',
        {
          properties: {
            title: discussionData.title,
            category: discussionData.category,
            discussion_type: discussionData.discussionType,
            tags: JSON.stringify(discussionData.tags),
            view_count: '0',
            reply_count: '0',
            like_count: '0',
            status: 'ACTIVE',
            is_public: discussionData.isPublic.toString(),
            is_pinned: 'false',
            is_featured: 'false',
            allow_replies: 'true',
            moderation_flags: '0',
            last_activity_at: new Date().toISOString()
          },
          associations: [
            {
              to: { id: discussionData.authorId },
              types: [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 1 }]
            }
          ]
        }
      );

      // Update local database with HubSpot ID
      await this.syncToLocalCache('community_discussion', discussionData.discussionId, {
        hubspotObjectId: discussion.id,
        hubspotSyncStatus: 'SYNCED',
        hubspotLastSync: new Date()
      });

      return discussion;
    } catch (error: any) {
      console.error('Error creating community discussion in HubSpot:', error);
      throw error;
    }
  }

  async updateCommunityDiscussion(discussionId: string, updates: {
    title?: string;
    content?: string;
    category?: string;
    tags?: string[];
    isPublic?: boolean;
    allowReplies?: boolean;
  }): Promise<void> {
    try {
      const properties: Record<string, string> = {};
      
      if (updates.title) properties.title = updates.title;
      if (updates.category) properties.category = updates.category;
      if (updates.tags) properties.tags = JSON.stringify(updates.tags);
      if (typeof updates.isPublic === 'boolean') properties.is_public = updates.isPublic.toString();
      if (typeof updates.allowReplies === 'boolean') properties.allow_replies = updates.allowReplies.toString();

      // Get HubSpot ID from local database
      const hubspotId = await this.getHubSpotId('community_discussion', discussionId);
      if (hubspotId) {
        await this.hubspotClient.crm.objects.basicApi.update(hubspotId, {
          properties
        });
      }
    } catch (error: any) {
      console.error('Error updating community discussion in HubSpot:', error);
    }
  }

  async archiveCommunityDiscussion(discussionId: string): Promise<void> {
    try {
      const hubspotId = await this.getHubSpotId('community_discussion', discussionId);
      if (hubspotId) {
        await this.hubspotClient.crm.objects.basicApi.update(hubspotId, {
          properties: {
            status: 'ARCHIVED'
          }
        });
      }
    } catch (error: any) {
      console.error('Error archiving community discussion in HubSpot:', error);
    }
  }

  async createDiscussionReply(replyData: {
    replyId: string;
    parentDiscussionId: string;
    content: string;
    authorId: string;
  }): Promise<any> {
    try {
      // Create reply as a new discussion with parent reference
      const reply = await this.hubspotClient.crm.objects.basicApi.create(
        'community_discussions',
        {
          properties: {
            title: `Reply to discussion`,
            category: 'REPLY',
            discussion_type: 'DISCUSSION',
            parent_discussion_id: replyData.parentDiscussionId,
            view_count: '0',
            reply_count: '0',
            like_count: '0',
            status: 'ACTIVE',
            is_public: 'true',
            allow_replies: 'false'
          },
          associations: [
            {
              to: { id: replyData.authorId },
              types: [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 1 }]
            }
          ]
        }
      );

      // Update parent discussion reply count
      const parentHubSpotId = await this.getHubSpotId('community_discussion', replyData.parentDiscussionId);
      if (parentHubSpotId) {
        await this.hubspotClient.crm.objects.basicApi.update(parentHubSpotId, {
          properties: {
            last_activity_at: new Date().toISOString()
          }
        });
      }

      return reply;
    } catch (error: any) {
      console.error('Error creating discussion reply in HubSpot:', error);
      throw error;
    }
  }

  async recordDiscussionLike(likeData: {
    discussionId: string;
    memberId: string;
    action: 'LIKE' | 'UNLIKE';
  }): Promise<void> {
    try {
      // Create engagement record for the like/unlike action
      await this.hubspotClient.crm.objects.basicApi.create(
        'engagements',
        {
          properties: {
            engagement_type: 'DISCUSSION_LIKE',
            discussion_id: likeData.discussionId,
            action: likeData.action,
            timestamp: new Date().toISOString()
          },
          associations: [
            {
              to: { id: likeData.memberId },
              types: [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 1 }]
            }
          ]
        }
      );
    } catch (error: any) {
      console.error('Error recording discussion like in HubSpot:', error);
    }
  }

  // Member Messaging Methods
  async createMemberMessage(messageData: {
    messageId: string;
    senderId: string;
    recipientId: string;
    subject?: string;
    content: string;
    priority: string;
    threadId?: string;
  }): Promise<any> {
    try {
      const message = await this.hubspotClient.crm.objects.basicApi.create(
        'member_messages',
        {
          properties: {
            sender_id: messageData.senderId,
            recipient_id: messageData.recipientId,
            subject: messageData.subject || '',
            message_type: 'DIRECT',
            is_read: 'false',
            priority: messageData.priority,
            thread_id: messageData.threadId || '',
            is_archived: 'false',
            is_deleted: 'false'
          },
          associations: [
            {
              to: { id: messageData.senderId },
              types: [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 1 }]
            },
            {
              to: { id: messageData.recipientId },
              types: [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 1 }]
            }
          ]
        }
      );

      // Update local database with HubSpot ID
      await this.syncToLocalCache('member_message', messageData.messageId, {
        hubspotEngagementId: message.id,
        hubspotSyncStatus: 'SYNCED',
        hubspotLastSync: new Date()
      });

      return message;
    } catch (error: any) {
      console.error('Error creating member message in HubSpot:', error);
      throw error;
    }
  }

  // Connection Request Methods
  async createConnectionRequest(requestData: {
    requestId: string;
    requesterId: string;
    receiverId: string;
    message?: string;
    requestType: string;
  }): Promise<any> {
    try {
      const request = await this.hubspotClient.crm.objects.basicApi.create(
        'connection_requests',
        {
          properties: {
            requester_id: requestData.requesterId,
            receiver_id: requestData.receiverId,
            message: requestData.message || '',
            status: 'PENDING',
            request_type: requestData.requestType
          },
          associations: [
            {
              to: { id: requestData.requesterId },
              types: [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 1 }]
            },
            {
              to: { id: requestData.receiverId },
              types: [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 1 }]
            }
          ]
        }
      );

      return request;
    } catch (error: any) {
      console.error('Error creating connection request in HubSpot:', error);
      throw error;
    }
  }

  async updateConnectionRequest(requestId: string, updates: {
    status: string;
    action: string;
    respondedBy: string;
  }): Promise<void> {
    try {
      const hubspotId = await this.getHubSpotId('connection_request', requestId);
      if (hubspotId) {
        await this.hubspotClient.crm.objects.basicApi.update(hubspotId, {
          properties: {
            status: updates.status,
            responded_at: new Date().toISOString(),
            responded_by: updates.respondedBy
          }
        });

        // Trigger appropriate workflow
        if (updates.action === 'ACCEPT') {
          await this.triggerWorkflow('connection_accepted', hubspotId);
        } else if (updates.action === 'DECLINE') {
          await this.triggerWorkflow('connection_declined', hubspotId);
        }
      }
    } catch (error: any) {
      console.error('Error updating connection request in HubSpot:', error);
    }
  }

  // Member Profile Methods
  async updateMemberProfile(memberId: string, profileData: {
    bio?: string;
    specialties?: string[];
    certifications?: string[];
    yearsExperience?: number;
    projectTypes?: string[];
    serviceAreas?: string[];
    businessSize?: string;
    isPublic?: boolean;
  }): Promise<void> {
    try {
      const properties: Record<string, string> = {};
      
      if (profileData.bio) properties.member_bio = profileData.bio;
      if (profileData.specialties) properties.member_specialties = JSON.stringify(profileData.specialties);
      if (profileData.certifications) properties.member_certifications = JSON.stringify(profileData.certifications);
      if (profileData.yearsExperience) properties.years_experience = profileData.yearsExperience.toString();
      if (profileData.projectTypes) properties.project_types = JSON.stringify(profileData.projectTypes);
      if (profileData.serviceAreas) properties.service_areas = JSON.stringify(profileData.serviceAreas);
      if (profileData.businessSize) properties.business_size = profileData.businessSize;
      if (typeof profileData.isPublic === 'boolean') properties.profile_is_public = profileData.isPublic.toString();

      await this.hubspotClient.crm.contacts.basicApi.update(memberId, {
        properties
      });

      // Trigger profile update workflow
      await this.triggerWorkflow('member_profile_updated', memberId);
    } catch (error: any) {
      console.error('Error updating member profile in HubSpot:', error);
    }
  }

  // Helper Methods
  private async getHubSpotId(objectType: string, localId: string): Promise<string | null> {
    try {
      // This would query the local database to get the HubSpot ID
      // Implementation depends on your local database structure
      return null; // Placeholder
    } catch (error: any) {
      console.error(`Error getting HubSpot ID for ${objectType}:`, error);
      return null;
    }
  }

  private async syncToLocalCache(objectType: string, localId: string, syncData: any): Promise<void> {
    try {
      // This would update the local database with HubSpot sync information
      // Implementation depends on your local database structure
      console.log(`Syncing ${objectType} ${localId} to local cache:`, syncData);
    } catch (error: any) {
      console.error(`Error syncing ${objectType} to local cache:`, error);
    }
  }
}  // C
ommittee Management Methods
  async createCommittee(committeeData: {
    committeeId: string;
    name: string;
    description?: string;
    category: string;
    chairId: string;
    isPublic: boolean;
    meetingFrequency?: string;
    maxMembers?: number;
    requiresApproval: boolean;
  }): Promise<any> {
    try {
      const committee = await this.hubspotClient.crm.objects.basicApi.create(
        'committees',
        {
          properties: {
            name: committeeData.name,
            description: committeeData.description || '',
            category: committeeData.category,
            chair_id: committeeData.chairId,
            member_count: '1',
            status: 'ACTIVE',
            is_public: committeeData.isPublic.toString(),
            meeting_frequency: committeeData.meetingFrequency || '',
            max_members: committeeData.maxMembers?.toString() || '',
            requires_approval: committeeData.requiresApproval.toString()
          },
          associations: [
            {
              to: { id: committeeData.chairId },
              types: [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 1 }]
            }
          ]
        }
      );

      // Update local database with HubSpot ID
      await this.syncToLocalCache('committee', committeeData.committeeId, {
        hubspotObjectId: committee.id,
        hubspotSyncStatus: 'SYNCED',
        hubspotLastSync: new Date()
      });

      return committee;
    } catch (error: any) {
      console.error('Error creating committee in HubSpot:', error);
      throw error;
    }
  }

  async updateCommittee(committeeId: string, updates: {
    name?: string;
    description?: string;
    category?: string;
    isPublic?: boolean;
    meetingFrequency?: string;
    maxMembers?: number;
    requiresApproval?: boolean;
    status?: string;
  }): Promise<void> {
    try {
      const properties: Record<string, string> = {};
      
      if (updates.name) properties.name = updates.name;
      if (updates.description !== undefined) properties.description = updates.description;
      if (updates.category) properties.category = updates.category;
      if (typeof updates.isPublic === 'boolean') properties.is_public = updates.isPublic.toString();
      if (updates.meetingFrequency) properties.meeting_frequency = updates.meetingFrequency;
      if (updates.maxMembers) properties.max_members = updates.maxMembers.toString();
      if (typeof updates.requiresApproval === 'boolean') properties.requires_approval = updates.requiresApproval.toString();
      if (updates.status) properties.status = updates.status;

      const hubspotId = await this.getHubSpotId('committee', committeeId);
      if (hubspotId) {
        await this.hubspotClient.crm.objects.basicApi.update(hubspotId, {
          properties
        });
      }
    } catch (error: any) {
      console.error('Error updating committee in HubSpot:', error);
    }
  }

  async archiveCommittee(committeeId: string): Promise<void> {
    try {
      const hubspotId = await this.getHubSpotId('committee', committeeId);
      if (hubspotId) {
        await this.hubspotClient.crm.objects.basicApi.update(hubspotId, {
          properties: {
            status: 'ARCHIVED'
          }
        });
      }
    } catch (error: any) {
      console.error('Error archiving committee in HubSpot:', error);
    }
  }

  async addCommitteeMember(memberData: {
    committeeId: string;
    memberId: string;
    role: string;
    status: string;
    invitedBy: string;
  }): Promise<any> {
    try {
      // Create committee membership engagement
      const membership = await this.hubspotClient.crm.objects.basicApi.create(
        'engagements',
        {
          properties: {
            engagement_type: 'COMMITTEE_MEMBERSHIP',
            committee_id: memberData.committeeId,
            member_id: memberData.memberId,
            role: memberData.role,
            status: memberData.status,
            invited_by: memberData.invitedBy,
            timestamp: new Date().toISOString()
          },
          associations: [
            {
              to: { id: memberData.memberId },
              types: [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 1 }]
            }
          ]
        }
      );

      return membership;
    } catch (error: any) {
      console.error('Error adding committee member in HubSpot:', error);
      throw error;
    }
  }

  async createCommitteeMeeting(meetingData: {
    meetingId: string;
    committeeId: string;
    title: string;
    description?: string;
    scheduledDate: string;
    duration: number;
    location?: string;
    meetingType: string;
    agenda: any[];
    createdBy: string;
  }): Promise<any> {
    try {
      const meeting = await this.hubspotClient.crm.objects.basicApi.create(
        'committee_meetings',
        {
          properties: {
            committee_id: meetingData.committeeId,
            title: meetingData.title,
            description: meetingData.description || '',
            scheduled_date: meetingData.scheduledDate,
            duration: meetingData.duration.toString(),
            location: meetingData.location || '',
            meeting_type: meetingData.meetingType,
            agenda: JSON.stringify(meetingData.agenda),
            status: 'SCHEDULED',
            attendee_count: '0'
          },
          associations: [
            {
              to: { id: meetingData.createdBy },
              types: [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 1 }]
            }
          ]
        }
      );

      // Update local database with HubSpot ID
      await this.syncToLocalCache('committee_meeting', meetingData.meetingId, {
        hubspotObjectId: meeting.id,
        hubspotSyncStatus: 'SYNCED',
        hubspotLastSync: new Date()
      });

      return meeting;
    } catch (error: any) {
      console.error('Error creating committee meeting in HubSpot:', error);
      throw error;
    }
  }
} 
 // Community Voting Methods
  async createCommunityVote(voteData: {
    voteId: string;
    title: string;
    description: string;
    voteType: string;
    createdBy: string;
    committeeId?: string;
    endDate: string;
    isAnonymous: boolean;
    requiresQuorum: boolean;
    quorumPercentage?: number;
    eligibleVoters?: string[];
    allowAbstain: boolean;
    allowComments: boolean;
  }): Promise<any> {
    try {
      const vote = await this.hubspotClient.crm.objects.basicApi.create(
        'community_votes',
        {
          properties: {
            title: voteData.title,
            description: voteData.description,
            vote_type: voteData.voteType,
            created_by: voteData.createdBy,
            committee_id: voteData.committeeId || '',
            start_date: new Date().toISOString(),
            end_date: voteData.endDate,
            status: 'ACTIVE',
            is_anonymous: voteData.isAnonymous.toString(),
            requires_quorum: voteData.requiresQuorum.toString(),
            quorum_percentage: voteData.quorumPercentage?.toString() || '',
            eligible_voters: voteData.eligibleVoters ? JSON.stringify(voteData.eligibleVoters) : '',
            allow_abstain: voteData.allowAbstain.toString(),
            allow_comments: voteData.allowComments.toString(),
            total_votes: '0'
          },
          associations: [
            {
              to: { id: voteData.createdBy },
              types: [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 1 }]
            },
            ...(voteData.committeeId ? [{
              to: { id: voteData.committeeId },
              types: [{ associationCategory: 'USER_DEFINED', associationTypeId: 'committee_to_vote' }]
            }] : [])
          ]
        }
      );

      // Update local database with HubSpot ID
      await this.syncToLocalCache('community_vote', voteData.voteId, {
        hubspotObjectId: vote.id,
        hubspotSyncStatus: 'SYNCED',
        hubspotLastSync: new Date()
      });

      return vote;
    } catch (error: any) {
      console.error('Error creating community vote in HubSpot:', error);
      throw error;
    }
  }

  async updateCommunityVote(voteId: string, updates: {
    status?: string;
    action?: string;
    updatedBy: string;
  }): Promise<void> {
    try {
      const properties: Record<string, string> = {};
      
      if (updates.status) properties.status = updates.status;

      const hubspotId = await this.getHubSpotId('community_vote', voteId);
      if (hubspotId) {
        await this.hubspotClient.crm.objects.basicApi.update(hubspotId, {
          properties
        });

        // Trigger appropriate workflow
        if (updates.action === 'close') {
          await this.triggerWorkflow('vote_closed', hubspotId);
        } else if (updates.action === 'cancel') {
          await this.triggerWorkflow('vote_cancelled', hubspotId);
        }
      }
    } catch (error: any) {
      console.error('Error updating community vote in HubSpot:', error);
    }
  }

  async recordVoteBallot(ballotData: {
    voteId: string;
    voterId: string;
    optionId?: string;
    rankedChoices?: string[];
    isAbstain: boolean;
    hasComment: boolean;
  }): Promise<any> {
    try {
      // Create engagement record for the vote
      const ballot = await this.hubspotClient.crm.objects.basicApi.create(
        'engagements',
        {
          properties: {
            engagement_type: 'VOTE_BALLOT',
            vote_id: ballotData.voteId,
            voter_id: ballotData.voterId,
            option_id: ballotData.optionId || '',
            ranked_choices: ballotData.rankedChoices ? JSON.stringify(ballotData.rankedChoices) : '',
            is_abstain: ballotData.isAbstain.toString(),
            has_comment: ballotData.hasComment.toString(),
            timestamp: new Date().toISOString()
          },
          associations: [
            {
              to: { id: ballotData.voterId },
              types: [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 1 }]
            }
          ]
        }
      );

      return ballot;
    } catch (error: any) {
      console.error('Error recording vote ballot in HubSpot:', error);
      throw error;
    }
  }
}
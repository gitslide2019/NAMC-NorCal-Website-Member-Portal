import { prisma } from '@/lib/prisma';
import { HubSpotBackboneService } from './hubspot-backbone.service';

export interface BadgeShopCampaignData {
  memberId: string;
  badgeId: string;
  campaignType: 'BADGE_EARNED' | 'SKILL_ADVANCEMENT' | 'PROJECT_COMPLETION';
  title: string;
  description?: string;
  productIds?: string[];
  productCategories?: string[];
  discountPercentage?: number;
  campaignDuration?: number;
  memberProjectFundPercentage?: number;
  namcSupportPercentage?: number;
  sponsorPartnershipPercentage?: number;
}

export interface MemberProjectFundData {
  memberId: string;
  transactionType: 'EARNED' | 'SPENT' | 'WITHDRAWN' | 'REFUND';
  amount: number;
  source: 'BADGE_SHOP_CAMPAIGN' | 'PROJECT_COMPLETION' | 'MANUAL_ADJUSTMENT';
  sourceId?: string;
  description?: string;
}

export interface CampaignPerformanceData {
  campaignId: string;
  viewCount?: number;
  clickCount?: number;
  purchaseCount?: number;
  totalRevenue?: number;
}

export class BadgeShopCampaignsService {
  private hubspotService: HubSpotBackboneService;

  constructor() {
    this.hubspotService = new HubSpotBackboneService();
  }

  // Campaign Management
  async createBadgeShopCampaign(data: BadgeShopCampaignData) {
    try {
      // Validate fund allocation percentages
      const totalPercentage = (data.memberProjectFundPercentage || 50) + 
                             (data.namcSupportPercentage || 30) + 
                             (data.sponsorPartnershipPercentage || 20);
      
      if (Math.abs(totalPercentage - 100) > 0.01) {
        throw new Error('Fund allocation percentages must total 100%');
      }

      const endDate = new Date();
      endDate.setDate(endDate.getDate() + (data.campaignDuration || 30));

      const campaign = await prisma.badgeShopCampaign.create({
        data: {
          ...data,
          productIds: data.productIds ? JSON.stringify(data.productIds) : null,
          productCategories: data.productCategories ? JSON.stringify(data.productCategories) : null,
          discountPercentage: data.discountPercentage || 0,
          campaignDuration: data.campaignDuration || 30,
          endDate,
          memberProjectFundPercentage: data.memberProjectFundPercentage || 50,
          namcSupportPercentage: data.namcSupportPercentage || 30,
          sponsorPartnershipPercentage: data.sponsorPartnershipPercentage || 20,
        },
        include: {
          member: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          badge: {
            select: {
              id: true,
              badgeName: true,
              category: true,
              skillArea: true,
            },
          },
        },
      });

      // Ensure member has a project fund
      await this.ensureMemberProjectFund(data.memberId);

      // Sync to HubSpot
      await this.syncCampaignToHubSpot(campaign);

      return {
        ...campaign,
        productIds: campaign.productIds ? JSON.parse(campaign.productIds) : [],
        productCategories: campaign.productCategories ? JSON.parse(campaign.productCategories) : [],
      };
    } catch (error) {
      console.error('Error creating badge shop campaign:', error);
      throw error;
    }
  }

  async getMemberCampaigns(memberId: string, status?: string) {
    try {
      const campaigns = await prisma.badgeShopCampaign.findMany({
        where: {
          memberId,
          ...(status && { status }),
        },
        include: {
          badge: {
            select: {
              id: true,
              badgeName: true,
              category: true,
              skillArea: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return campaigns.map(campaign => ({
        ...campaign,
        productIds: campaign.productIds ? JSON.parse(campaign.productIds) : [],
        productCategories: campaign.productCategories ? JSON.parse(campaign.productCategories) : [],
      }));
    } catch (error) {
      console.error('Error fetching member campaigns:', error);
      throw error;
    }
  }

  async getActiveCampaigns() {
    try {
      const campaigns = await prisma.badgeShopCampaign.findMany({
        where: {
          status: 'ACTIVE',
          endDate: {
            gt: new Date(),
          },
        },
        include: {
          member: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          badge: {
            select: {
              id: true,
              badgeName: true,
              category: true,
              skillArea: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return campaigns.map(campaign => ({
        ...campaign,
        productIds: campaign.productIds ? JSON.parse(campaign.productIds) : [],
        productCategories: campaign.productCategories ? JSON.parse(campaign.productCategories) : [],
      }));
    } catch (error) {
      console.error('Error fetching active campaigns:', error);
      throw error;
    }
  }

  async getCampaignById(campaignId: string) {
    try {
      const campaign = await prisma.badgeShopCampaign.findUnique({
        where: { id: campaignId },
        include: {
          member: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          badge: {
            select: {
              id: true,
              badgeName: true,
              category: true,
              skillArea: true,
            },
          },
        },
      });

      if (!campaign) {
        throw new Error('Campaign not found');
      }

      return {
        ...campaign,
        productIds: campaign.productIds ? JSON.parse(campaign.productIds) : [],
        productCategories: campaign.productCategories ? JSON.parse(campaign.productCategories) : [],
      };
    } catch (error) {
      console.error('Error fetching campaign by ID:', error);
      throw error;
    }
  }

  // Campaign Performance Tracking
  async updateCampaignPerformance(data: CampaignPerformanceData) {
    try {
      const updateData: any = {};
      
      if (data.viewCount !== undefined) {
        updateData.viewCount = { increment: data.viewCount };
      }
      
      if (data.clickCount !== undefined) {
        updateData.clickCount = { increment: data.clickCount };
      }
      
      if (data.purchaseCount !== undefined) {
        updateData.purchaseCount = { increment: data.purchaseCount };
      }
      
      if (data.totalRevenue !== undefined) {
        updateData.totalRevenue = { increment: data.totalRevenue };
      }

      const campaign = await prisma.badgeShopCampaign.update({
        where: { id: data.campaignId },
        data: updateData,
      });

      // If revenue was added, distribute funds
      if (data.totalRevenue && data.totalRevenue > 0) {
        await this.distributeCampaignRevenue(data.campaignId, data.totalRevenue);
      }

      return campaign;
    } catch (error) {
      console.error('Error updating campaign performance:', error);
      throw error;
    }
  }

  async recordCampaignPurchase(campaignId: string, purchaseAmount: number) {
    try {
      const campaign = await prisma.badgeShopCampaign.findUnique({
        where: { id: campaignId },
      });

      if (!campaign) {
        throw new Error('Campaign not found');
      }

      // Update campaign performance
      await this.updateCampaignPerformance({
        campaignId,
        purchaseCount: 1,
        totalRevenue: purchaseAmount,
      });

      // Distribute revenue
      await this.distributeCampaignRevenue(campaignId, purchaseAmount);

      return { success: true };
    } catch (error) {
      console.error('Error recording campaign purchase:', error);
      throw error;
    }
  }

  // Revenue Distribution
  private async distributeCampaignRevenue(campaignId: string, totalRevenue: number) {
    try {
      const campaign = await prisma.badgeShopCampaign.findUnique({
        where: { id: campaignId },
      });

      if (!campaign) {
        throw new Error('Campaign not found');
      }

      // Calculate distribution amounts
      const memberProjectFund = totalRevenue * (campaign.memberProjectFundPercentage / 100);
      const namcSupport = totalRevenue * (campaign.namcSupportPercentage / 100);
      const sponsorPartnership = totalRevenue * (campaign.sponsorPartnershipPercentage / 100);

      // Add to member project fund
      if (memberProjectFund > 0) {
        await this.addToMemberProjectFund({
          memberId: campaign.memberId,
          transactionType: 'EARNED',
          amount: memberProjectFund,
          source: 'BADGE_SHOP_CAMPAIGN',
          sourceId: campaignId,
          description: `Revenue from badge shop campaign: ${campaign.title}`,
        });
      }

      // Update campaign with generated amounts
      await prisma.badgeShopCampaign.update({
        where: { id: campaignId },
        data: {
          memberProjectFundGenerated: { increment: memberProjectFund },
          namcSupportGenerated: { increment: namcSupport },
          sponsorPartnershipGenerated: { increment: sponsorPartnership },
        },
      });

      return {
        memberProjectFund,
        namcSupport,
        sponsorPartnership,
      };
    } catch (error) {
      console.error('Error distributing campaign revenue:', error);
      throw error;
    }
  }

  // Member Project Fund Management
  async ensureMemberProjectFund(memberId: string) {
    try {
      const existingFund = await prisma.memberProjectFund.findUnique({
        where: { memberId },
      });

      if (!existingFund) {
        await prisma.memberProjectFund.create({
          data: {
            memberId,
            currentBalance: 0,
            totalEarned: 0,
            totalSpent: 0,
            totalWithdrawn: 0,
          },
        });
      }
    } catch (error) {
      console.error('Error ensuring member project fund:', error);
      throw error;
    }
  }

  async getMemberProjectFund(memberId: string) {
    try {
      await this.ensureMemberProjectFund(memberId);
      
      const fund = await prisma.memberProjectFund.findUnique({
        where: { memberId },
        include: {
          transactions: {
            orderBy: { createdAt: 'desc' },
            take: 10, // Last 10 transactions
          },
        },
      });

      return fund;
    } catch (error) {
      console.error('Error fetching member project fund:', error);
      throw error;
    }
  }

  async addToMemberProjectFund(data: MemberProjectFundData) {
    try {
      await this.ensureMemberProjectFund(data.memberId);

      // Create transaction
      const transaction = await prisma.projectFundTransaction.create({
        data: {
          fundId: '', // Will be updated below
          transactionType: data.transactionType,
          amount: data.amount,
          source: data.source,
          sourceId: data.sourceId,
          description: data.description,
        },
      });

      // Get fund and update transaction with fund ID
      const fund = await prisma.memberProjectFund.findUnique({
        where: { memberId: data.memberId },
      });

      if (!fund) {
        throw new Error('Member project fund not found');
      }

      await prisma.projectFundTransaction.update({
        where: { id: transaction.id },
        data: { fundId: fund.id },
      });

      // Update fund balance
      const balanceChange = data.transactionType === 'EARNED' ? data.amount : -data.amount;
      const totalEarnedChange = data.transactionType === 'EARNED' ? data.amount : 0;
      const totalSpentChange = data.transactionType === 'SPENT' ? data.amount : 0;
      const totalWithdrawnChange = data.transactionType === 'WITHDRAWN' ? data.amount : 0;

      await prisma.memberProjectFund.update({
        where: { id: fund.id },
        data: {
          currentBalance: { increment: balanceChange },
          totalEarned: { increment: totalEarnedChange },
          totalSpent: { increment: totalSpentChange },
          totalWithdrawn: { increment: totalWithdrawnChange },
          lastTransactionDate: new Date(),
        },
      });

      return transaction;
    } catch (error) {
      console.error('Error adding to member project fund:', error);
      throw error;
    }
  }

  async getMemberProjectFundTransactions(memberId: string, limit: number = 50) {
    try {
      const fund = await prisma.memberProjectFund.findUnique({
        where: { memberId },
      });

      if (!fund) {
        return [];
      }

      const transactions = await prisma.projectFundTransaction.findMany({
        where: { fundId: fund.id },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });

      return transactions;
    } catch (error) {
      console.error('Error fetching member project fund transactions:', error);
      throw error;
    }
  }

  // Campaign Analytics
  async getCampaignAnalytics(timeframe: 'week' | 'month' | 'quarter' | 'year' = 'month') {
    try {
      const startDate = new Date();
      switch (timeframe) {
        case 'week':
          startDate.setDate(startDate.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(startDate.getMonth() - 1);
          break;
        case 'quarter':
          startDate.setMonth(startDate.getMonth() - 3);
          break;
        case 'year':
          startDate.setFullYear(startDate.getFullYear() - 1);
          break;
      }

      const campaigns = await prisma.badgeShopCampaign.findMany({
        where: {
          createdAt: {
            gte: startDate,
          },
        },
        include: {
          badge: {
            select: {
              category: true,
            },
          },
        },
      });

      const analytics = {
        totalCampaigns: campaigns.length,
        activeCampaigns: campaigns.filter(c => c.status === 'ACTIVE').length,
        totalRevenue: campaigns.reduce((sum, c) => sum + c.totalRevenue, 0),
        totalViews: campaigns.reduce((sum, c) => sum + c.viewCount, 0),
        totalClicks: campaigns.reduce((sum, c) => sum + c.clickCount, 0),
        totalPurchases: campaigns.reduce((sum, c) => sum + c.purchaseCount, 0),
        averageConversionRate: campaigns.length > 0 
          ? campaigns.reduce((sum, c) => sum + (c.clickCount > 0 ? c.purchaseCount / c.clickCount : 0), 0) / campaigns.length 
          : 0,
        campaignsByType: campaigns.reduce((acc, c) => {
          acc[c.campaignType] = (acc[c.campaignType] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        campaignsByBadgeCategory: campaigns.reduce((acc, c) => {
          const category = c.badge?.category || 'UNKNOWN';
          acc[category] = (acc[category] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        fundDistribution: {
          memberProjectFunds: campaigns.reduce((sum, c) => sum + c.memberProjectFundGenerated, 0),
          namcSupport: campaigns.reduce((sum, c) => sum + c.namcSupportGenerated, 0),
          sponsorPartnerships: campaigns.reduce((sum, c) => sum + c.sponsorPartnershipGenerated, 0),
        },
      };

      return analytics;
    } catch (error) {
      console.error('Error fetching campaign analytics:', error);
      throw error;
    }
  }

  // Campaign Lifecycle Management
  async pauseCampaign(campaignId: string) {
    try {
      const campaign = await prisma.badgeShopCampaign.update({
        where: { id: campaignId },
        data: { status: 'PAUSED' },
      });

      return campaign;
    } catch (error) {
      console.error('Error pausing campaign:', error);
      throw error;
    }
  }

  async resumeCampaign(campaignId: string) {
    try {
      const campaign = await prisma.badgeShopCampaign.update({
        where: { id: campaignId },
        data: { status: 'ACTIVE' },
      });

      return campaign;
    } catch (error) {
      console.error('Error resuming campaign:', error);
      throw error;
    }
  }

  async expireCampaigns() {
    try {
      const expiredCampaigns = await prisma.badgeShopCampaign.updateMany({
        where: {
          status: 'ACTIVE',
          endDate: {
            lt: new Date(),
          },
        },
        data: {
          status: 'EXPIRED',
        },
      });

      return expiredCampaigns;
    } catch (error) {
      console.error('Error expiring campaigns:', error);
      throw error;
    }
  }

  // HubSpot Sync Methods
  private async syncCampaignToHubSpot(campaign: any) {
    try {
      // Sync campaign as a custom object in HubSpot
      const hubspotData = {
        member_id: campaign.memberId,
        badge_id: campaign.badgeId,
        campaign_type: campaign.campaignType,
        title: campaign.title,
        status: campaign.status,
        total_revenue: campaign.totalRevenue,
        view_count: campaign.viewCount,
        click_count: campaign.clickCount,
        purchase_count: campaign.purchaseCount,
        member_project_fund_generated: campaign.memberProjectFundGenerated,
      };

      console.log('Syncing campaign to HubSpot:', hubspotData);
    } catch (error) {
      console.error('Error syncing campaign to HubSpot:', error);
    }
  }
}
import { prisma } from '@/lib/prisma';
import { HubSpotBackboneService } from './hubspot-backbone.service';

export interface ProficiencyBadgeData {
  memberId: string;
  courseId?: string;
  badgeId: string;
  badgeName: string;
  category: 'RESIDENTIAL' | 'COMMERCIAL' | 'INDUSTRIAL' | 'BUSINESS_DEVELOPMENT' | 'COURSE_COMPLETION';
  skillArea: string;
  level: 'BASIC' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';
  expirationDate?: Date;
  requiresContinuingEd?: boolean;
  projectOpportunitiesUnlocked?: string[];
  digitalCertificateUrl?: string;
}

export interface BadgeVerificationData {
  badgeId: string;
  memberId: string;
  verificationType: 'INITIAL' | 'RENEWAL' | 'AUDIT';
  verificationMethod: 'ASSESSMENT' | 'PROJECT_REVIEW' | 'PEER_REVIEW' | 'SPONSOR_VERIFICATION';
  verifiedBy?: string;
  verificationNotes?: string;
  evidenceUrls?: string[];
  expirationDate?: Date;
}

export interface BadgeRenewalData {
  badgeId: string;
  memberId: string;
  continuingEdHours: number;
  renewalAssessmentScore?: number;
  renewalEvidence?: string[];
}

export class ProficiencyBadgesService {
  private hubspotService: HubSpotBackboneService;

  constructor() {
    this.hubspotService = new HubSpotBackboneService();
  }

  // Badge Management
  async awardProficiencyBadge(data: ProficiencyBadgeData) {
    try {
      // Check if member already has this badge
      const existingBadge = await prisma.proficiencyBadge.findFirst({
        where: {
          memberId: data.memberId,
          badgeId: data.badgeId,
          verificationStatus: {
            in: ['PENDING', 'VERIFIED'],
          },
        },
      });

      if (existingBadge) {
        throw new Error('Member already has this badge');
      }

      // Calculate expiration date if continuing education is required
      let expirationDate = data.expirationDate;
      let nextRenewalDate = null;

      if (data.requiresContinuingEd) {
        expirationDate = expirationDate || new Date(Date.now() + 2 * 365 * 24 * 60 * 60 * 1000); // 2 years default
        nextRenewalDate = new Date(expirationDate.getTime() - 90 * 24 * 60 * 60 * 1000); // 90 days before expiration
      }

      const badge = await prisma.proficiencyBadge.create({
        data: {
          ...data,
          expirationDate,
          nextRenewalDate,
          projectOpportunitiesUnlocked: data.projectOpportunitiesUnlocked 
            ? JSON.stringify(data.projectOpportunitiesUnlocked) 
            : null,
        },
        include: {
          member: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      // Generate digital certificate
      const certificateUrl = await this.generateDigitalCertificate(badge);
      
      // Update badge with certificate URL
      const updatedBadge = await prisma.proficiencyBadge.update({
        where: { id: badge.id },
        data: {
          digitalCertificateUrl: certificateUrl,
        },
        include: {
          member: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      // Create initial verification record
      await this.createBadgeVerification({
        badgeId: badge.id,
        memberId: data.memberId,
        verificationType: 'INITIAL',
        verificationMethod: data.courseId ? 'ASSESSMENT' : 'PROJECT_REVIEW',
        verificationNotes: data.courseId ? `Awarded upon course completion` : 'Awarded based on project review',
        expirationDate,
      });

      // Trigger badge shop campaigns
      await this.triggerBadgeShopCampaigns(badge.id, data.memberId);

      // Sync to HubSpot
      await this.syncBadgeToHubSpot(updatedBadge);

      return updatedBadge;
    } catch (error) {
      console.error('Error awarding proficiency badge:', error);
      throw error;
    }
  }

  async getMemberBadges(memberId: string, status?: string) {
    try {
      const badges = await prisma.proficiencyBadge.findMany({
        where: {
          memberId,
          ...(status && { verificationStatus: status }),
        },
        include: {
          verifications: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
          shopCampaigns: {
            where: {
              status: 'ACTIVE',
            },
          },
        },
        orderBy: { earnedDate: 'desc' },
      });

      return badges.map(badge => ({
        ...badge,
        projectOpportunitiesUnlocked: badge.projectOpportunitiesUnlocked 
          ? JSON.parse(badge.projectOpportunitiesUnlocked) 
          : [],
      }));
    } catch (error) {
      console.error('Error fetching member badges:', error);
      throw error;
    }
  }

  async getBadgesByCategory(category: string) {
    try {
      const badges = await prisma.proficiencyBadge.findMany({
        where: {
          category,
          verificationStatus: 'VERIFIED',
        },
        include: {
          member: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { earnedDate: 'desc' },
      });

      return badges;
    } catch (error) {
      console.error('Error fetching badges by category:', error);
      throw error;
    }
  }

  async getBadgeById(badgeId: string) {
    try {
      const badge = await prisma.proficiencyBadge.findUnique({
        where: { id: badgeId },
        include: {
          member: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          verifications: {
            orderBy: { createdAt: 'desc' },
          },
          shopCampaigns: true,
        },
      });

      if (!badge) {
        throw new Error('Badge not found');
      }

      return {
        ...badge,
        projectOpportunitiesUnlocked: badge.projectOpportunitiesUnlocked 
          ? JSON.parse(badge.projectOpportunitiesUnlocked) 
          : [],
      };
    } catch (error) {
      console.error('Error fetching badge by ID:', error);
      throw error;
    }
  }

  // Badge Verification Management
  async createBadgeVerification(data: BadgeVerificationData) {
    try {
      const verification = await prisma.badgeVerification.create({
        data: {
          ...data,
          evidenceUrls: data.evidenceUrls ? JSON.stringify(data.evidenceUrls) : null,
          verificationStatus: 'PENDING',
        },
        include: {
          badge: {
            include: {
              member: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
      });

      // Auto-verify if it's an initial verification from course completion
      if (data.verificationType === 'INITIAL' && data.verificationMethod === 'ASSESSMENT') {
        await this.verifyBadge(verification.id, 'SYSTEM', 'Auto-verified upon course completion');
      }

      return verification;
    } catch (error) {
      console.error('Error creating badge verification:', error);
      throw error;
    }
  }

  async verifyBadge(verificationId: string, verifiedBy: string, notes?: string) {
    try {
      const verification = await prisma.badgeVerification.update({
        where: { id: verificationId },
        data: {
          verificationStatus: 'VERIFIED',
          verifiedBy,
          verificationDate: new Date(),
          verificationNotes: notes,
        },
        include: {
          badge: true,
        },
      });

      // Update badge verification status
      await prisma.proficiencyBadge.update({
        where: { id: verification.badgeId },
        data: {
          verificationStatus: 'VERIFIED',
        },
      });

      return verification;
    } catch (error) {
      console.error('Error verifying badge:', error);
      throw error;
    }
  }

  async getPendingVerifications() {
    try {
      const verifications = await prisma.badgeVerification.findMany({
        where: {
          verificationStatus: 'PENDING',
        },
        include: {
          badge: {
            include: {
              member: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      });

      return verifications.map(verification => ({
        ...verification,
        evidenceUrls: verification.evidenceUrls ? JSON.parse(verification.evidenceUrls) : [],
      }));
    } catch (error) {
      console.error('Error fetching pending verifications:', error);
      throw error;
    }
  }

  // Badge Renewal Management
  async renewBadge(data: BadgeRenewalData) {
    try {
      const badge = await prisma.proficiencyBadge.findFirst({
        where: {
          id: data.badgeId,
          memberId: data.memberId,
        },
      });

      if (!badge) {
        throw new Error('Badge not found');
      }

      // Check if badge requires renewal
      if (!badge.requiresContinuingEd) {
        throw new Error('Badge does not require renewal');
      }

      // Create renewal verification
      const verification = await this.createBadgeVerification({
        badgeId: data.badgeId,
        memberId: data.memberId,
        verificationType: 'RENEWAL',
        verificationMethod: 'ASSESSMENT',
        verificationNotes: `Renewal with ${data.continuingEdHours} continuing education hours`,
        evidenceUrls: data.renewalEvidence,
        expirationDate: new Date(Date.now() + 2 * 365 * 24 * 60 * 60 * 1000), // 2 years
      });

      // Update badge renewal date
      const nextRenewalDate = new Date(Date.now() + 2 * 365 * 24 * 60 * 60 * 1000 - 90 * 24 * 60 * 60 * 1000);
      
      await prisma.proficiencyBadge.update({
        where: { id: data.badgeId },
        data: {
          nextRenewalDate,
          expirationDate: new Date(Date.now() + 2 * 365 * 24 * 60 * 60 * 1000),
        },
      });

      return verification;
    } catch (error) {
      console.error('Error renewing badge:', error);
      throw error;
    }
  }

  async getExpiringBadges(daysAhead: number = 90) {
    try {
      const expirationDate = new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000);
      
      const badges = await prisma.proficiencyBadge.findMany({
        where: {
          requiresContinuingEd: true,
          expirationDate: {
            lte: expirationDate,
          },
          verificationStatus: 'VERIFIED',
        },
        include: {
          member: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { expirationDate: 'asc' },
      });

      return badges;
    } catch (error) {
      console.error('Error fetching expiring badges:', error);
      throw error;
    }
  }

  // Project Opportunity Integration
  async unlockProjectOpportunities(badgeId: string) {
    try {
      const badge = await prisma.proficiencyBadge.findUnique({
        where: { id: badgeId },
      });

      if (!badge || !badge.projectOpportunitiesUnlocked) {
        return [];
      }

      const opportunityIds = JSON.parse(badge.projectOpportunitiesUnlocked);
      
      // This would integrate with the project opportunities system
      // For now, we'll return the opportunity IDs
      return opportunityIds;
    } catch (error) {
      console.error('Error unlocking project opportunities:', error);
      throw error;
    }
  }

  async checkBadgeRequirements(memberId: string, requiredBadges: string[]) {
    try {
      const memberBadges = await prisma.proficiencyBadge.findMany({
        where: {
          memberId,
          badgeId: {
            in: requiredBadges,
          },
          verificationStatus: 'VERIFIED',
          OR: [
            { expirationDate: null },
            { expirationDate: { gt: new Date() } },
          ],
        },
      });

      const earnedBadgeIds = memberBadges.map(badge => badge.badgeId);
      const missingBadges = requiredBadges.filter(badgeId => !earnedBadgeIds.includes(badgeId));

      return {
        hasAllRequiredBadges: missingBadges.length === 0,
        earnedBadges: earnedBadgeIds,
        missingBadges,
      };
    } catch (error) {
      console.error('Error checking badge requirements:', error);
      throw error;
    }
  }

  // Badge Shop Campaign Integration
  private async triggerBadgeShopCampaigns(badgeId: string, memberId: string) {
    try {
      // This would integrate with the badge shop campaign system
      // For now, we'll create a placeholder campaign
      const campaign = await prisma.badgeShopCampaign.create({
        data: {
          memberId,
          badgeId,
          campaignType: 'BADGE_EARNED',
          title: 'Congratulations on Your New Badge!',
          description: 'Celebrate your achievement with exclusive products and tools.',
          campaignDuration: 30,
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          discountPercentage: 15,
          memberProjectFundPercentage: 50,
          namcSupportPercentage: 30,
          sponsorPartnershipPercentage: 20,
        },
      });

      return campaign;
    } catch (error) {
      console.error('Error triggering badge shop campaigns:', error);
      throw error;
    }
  }

  // Digital Certificate Generation
  private async generateDigitalCertificate(badge: any): Promise<string> {
    try {
      // This would integrate with a certificate generation service
      // For now, we'll return a placeholder URL
      const certificateUrl = `/certificates/${badge.id}.pdf`;
      
      // In a real implementation, this would:
      // 1. Generate a PDF certificate with member name, badge details, etc.
      // 2. Upload to CDN or file storage
      // 3. Optionally create blockchain hash for verification
      
      return certificateUrl;
    } catch (error) {
      console.error('Error generating digital certificate:', error);
      throw error;
    }
  }

  // Analytics and Reporting
  async getBadgeAnalytics(timeframe: 'week' | 'month' | 'quarter' | 'year' = 'month') {
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

      const badges = await prisma.proficiencyBadge.findMany({
        where: {
          earnedDate: {
            gte: startDate,
          },
        },
        include: {
          member: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      const analytics = {
        totalBadgesAwarded: badges.length,
        badgesByCategory: badges.reduce((acc, badge) => {
          acc[badge.category] = (acc[badge.category] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        badgesByLevel: badges.reduce((acc, badge) => {
          acc[badge.level] = (acc[badge.level] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        uniqueMembers: new Set(badges.map(badge => badge.memberId)).size,
        verificationStatus: badges.reduce((acc, badge) => {
          acc[badge.verificationStatus] = (acc[badge.verificationStatus] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
      };

      return analytics;
    } catch (error) {
      console.error('Error fetching badge analytics:', error);
      throw error;
    }
  }

  // HubSpot Sync Methods
  private async syncBadgeToHubSpot(badge: any) {
    try {
      // Sync badge as a custom object in HubSpot
      const hubspotData = {
        member_id: badge.memberId,
        badge_id: badge.badgeId,
        badge_name: badge.badgeName,
        category: badge.category,
        skill_area: badge.skillArea,
        level: badge.level,
        earned_date: badge.earnedDate,
        verification_status: badge.verificationStatus,
        expiration_date: badge.expirationDate,
      };

      console.log('Syncing badge to HubSpot:', hubspotData);
    } catch (error) {
      console.error('Error syncing badge to HubSpot:', error);
    }
  }
}
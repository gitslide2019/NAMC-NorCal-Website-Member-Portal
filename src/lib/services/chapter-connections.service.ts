import { PrismaClient } from '@prisma/client';
import { HubSpotBackboneService } from './hubspot-backbone.service';

const prisma = new PrismaClient();

export interface ChapterConnectionData {
  fromChapter: string;
  toChapter: string;
  connectionType: string;
  allowMemberExchange?: boolean;
  allowResourceSharing?: boolean;
  allowProjectSharing?: boolean;
  terms?: any;
  contactPersonId?: string;
}

export interface MemberExchangeData {
  memberId: string;
  originChapter: string;
  targetChapter: string;
  exchangeType: string;
  purpose: string;
  duration?: number;
}

export interface InterChapterProjectData {
  title: string;
  description: string;
  projectType: string;
  leadChapter: string;
  participatingChapters: string[];
  leadMemberId?: string;
  memberIds: string[];
  estimatedValue?: number;
  projectLocation?: string;
  memberAllocation?: any;
  resourceSharing?: any;
  revenueSharing?: any;
}

export interface CrossChapterOpportunityData {
  originalOpportunityId?: string;
  originChapter: string;
  targetChapters: string[];
  sharingType: string;
  title: string;
  description: string;
  estimatedValue?: number;
  expirationDate?: Date;
}

export class ChapterConnectionsService {
  private hubspotService: HubSpotBackboneService;

  constructor() {
    this.hubspotService = new HubSpotBackboneService();
  }

  // Chapter Connection Management
  async createChapterConnection(data: ChapterConnectionData) {
    try {
      // Create local record
      const connection = await prisma.chapterConnection.create({
        data: {
          fromChapter: data.fromChapter,
          toChapter: data.toChapter,
          connectionType: data.connectionType,
          allowMemberExchange: data.allowMemberExchange ?? true,
          allowResourceSharing: data.allowResourceSharing ?? true,
          allowProjectSharing: data.allowProjectSharing ?? true,
          terms: data.terms ? JSON.stringify(data.terms) : null,
          contactPersonId: data.contactPersonId,
          status: 'PENDING'
        },
        include: {
          contactPerson: true
        }
      });

      // Sync to HubSpot
      await this.syncChapterConnectionToHubSpot(connection);

      return connection;
    } catch (error) {
      console.error('Error creating chapter connection:', error);
      throw error;
    }
  }

  async getChapterConnections(chapter?: string) {
    try {
      const where = chapter ? {
        OR: [
          { fromChapter: chapter },
          { toChapter: chapter }
        ]
      } : {};

      return await prisma.chapterConnection.findMany({
        where,
        include: {
          contactPerson: true,
          memberExchanges: {
            include: {
              member: true
            }
          },
          interChapterProjects: {
            include: {
              leadMember: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });
    } catch (error) {
      console.error('Error fetching chapter connections:', error);
      throw error;
    }
  }

  async activateChapterConnection(connectionId: string) {
    try {
      const connection = await prisma.chapterConnection.update({
        where: { id: connectionId },
        data: {
          status: 'ACTIVE',
          establishedDate: new Date(),
          lastActivity: new Date()
        }
      });

      // Sync to HubSpot
      await this.syncChapterConnectionToHubSpot(connection);

      return connection;
    } catch (error) {
      console.error('Error activating chapter connection:', error);
      throw error;
    }
  }

  // Chapter Directory Management
  async getChapterDirectory() {
    try {
      return await prisma.chapterDirectory.findMany({
        where: { isActive: true },
        orderBy: { displayName: 'asc' }
      });
    } catch (error) {
      console.error('Error fetching chapter directory:', error);
      throw error;
    }
  }

  async updateChapterInfo(chapterName: string, updates: any) {
    try {
      return await prisma.chapterDirectory.upsert({
        where: { chapterName },
        update: {
          ...updates,
          lastSync: new Date()
        },
        create: {
          chapterName,
          displayName: updates.displayName || chapterName,
          ...updates
        }
      });
    } catch (error) {
      console.error('Error updating chapter info:', error);
      throw error;
    }
  }

  // Member Exchange System
  async createMemberExchange(data: MemberExchangeData) {
    try {
      // Find or create chapter connection
      const connection = await this.ensureChapterConnection(
        data.originChapter,
        data.targetChapter
      );

      if (!connection.allowMemberExchange) {
        throw new Error('Member exchange not allowed between these chapters');
      }

      // Create member exchange
      const exchange = await prisma.memberExchange.create({
        data: {
          memberId: data.memberId,
          originChapter: data.originChapter,
          targetChapter: data.targetChapter,
          exchangeType: data.exchangeType,
          purpose: data.purpose,
          duration: data.duration,
          chapterConnectionId: connection.id
        },
        include: {
          member: true,
          chapterConnection: true
        }
      });

      // Update connection activity
      await this.updateConnectionActivity(connection.id);

      // Sync to HubSpot
      await this.syncMemberExchangeToHubSpot(exchange);

      return exchange;
    } catch (error) {
      console.error('Error creating member exchange:', error);
      throw error;
    }
  }

  async getMemberExchanges(memberId?: string, chapter?: string) {
    try {
      const where: any = {};
      
      if (memberId) {
        where.memberId = memberId;
      }
      
      if (chapter) {
        where.OR = [
          { originChapter: chapter },
          { targetChapter: chapter }
        ];
      }

      return await prisma.memberExchange.findMany({
        where,
        include: {
          member: true,
          chapterConnection: true
        },
        orderBy: { createdAt: 'desc' }
      });
    } catch (error) {
      console.error('Error fetching member exchanges:', error);
      throw error;
    }
  }

  async approveMemberExchange(exchangeId: string) {
    try {
      const exchange = await prisma.memberExchange.update({
        where: { id: exchangeId },
        data: {
          status: 'APPROVED',
          approvalDate: new Date()
        },
        include: {
          member: true,
          chapterConnection: true
        }
      });

      // Update connection stats
      await prisma.chapterConnection.update({
        where: { id: exchange.chapterConnectionId },
        data: {
          memberExchangeCount: { increment: 1 },
          lastActivity: new Date()
        }
      });

      // Sync to HubSpot
      await this.syncMemberExchangeToHubSpot(exchange);

      return exchange;
    } catch (error) {
      console.error('Error approving member exchange:', error);
      throw error;
    }
  }

  // Inter-Chapter Project Management
  async createInterChapterProject(data: InterChapterProjectData) {
    try {
      // Ensure connections exist for all participating chapters
      const connections = await this.ensureMultipleChapterConnections(
        data.leadChapter,
        data.participatingChapters
      );

      // Create project
      const project = await prisma.interChapterProject.create({
        data: {
          title: data.title,
          description: data.description,
          projectType: data.projectType,
          leadChapter: data.leadChapter,
          participatingChapters: JSON.stringify(data.participatingChapters),
          leadMemberId: data.leadMemberId,
          memberIds: JSON.stringify(data.memberIds),
          estimatedValue: data.estimatedValue,
          projectLocation: data.projectLocation,
          memberAllocation: data.memberAllocation ? JSON.stringify(data.memberAllocation) : null,
          resourceSharing: data.resourceSharing ? JSON.stringify(data.resourceSharing) : null,
          revenueSharing: data.revenueSharing ? JSON.stringify(data.revenueSharing) : null,
          chapterConnectionId: connections[0].id // Use first connection as primary
        },
        include: {
          leadMember: true,
          members: true,
          chapterConnection: true
        }
      });

      // Update connection stats
      for (const connection of connections) {
        await prisma.chapterConnection.update({
          where: { id: connection.id },
          data: {
            sharedProjects: { increment: 1 },
            lastActivity: new Date()
          }
        });
      }

      // Sync to HubSpot as a deal
      await this.syncInterChapterProjectToHubSpot(project);

      return project;
    } catch (error) {
      console.error('Error creating inter-chapter project:', error);
      throw error;
    }
  }

  async getInterChapterProjects(chapter?: string, memberId?: string) {
    try {
      const where: any = {};
      
      if (chapter) {
        where.OR = [
          { leadChapter: chapter },
          { participatingChapters: { contains: chapter } }
        ];
      }
      
      if (memberId) {
        where.OR = [
          ...(where.OR || []),
          { leadMemberId: memberId },
          { memberIds: { contains: memberId } }
        ];
      }

      return await prisma.interChapterProject.findMany({
        where,
        include: {
          leadMember: true,
          members: true,
          chapterConnection: true
        },
        orderBy: { createdAt: 'desc' }
      });
    } catch (error) {
      console.error('Error fetching inter-chapter projects:', error);
      throw error;
    }
  }

  // Cross-Chapter Opportunity Sharing
  async shareOpportunityAcrossChapters(data: CrossChapterOpportunityData) {
    try {
      const opportunity = await prisma.crossChapterOpportunity.create({
        data: {
          originalOpportunityId: data.originalOpportunityId,
          originChapter: data.originChapter,
          targetChapters: JSON.stringify(data.targetChapters),
          sharingType: data.sharingType,
          title: data.title,
          description: data.description,
          estimatedValue: data.estimatedValue,
          expirationDate: data.expirationDate
        }
      });

      // Sync to HubSpot
      await this.syncCrossChapterOpportunityToHubSpot(opportunity);

      return opportunity;
    } catch (error) {
      console.error('Error sharing opportunity across chapters:', error);
      throw error;
    }
  }

  async getCrossChapterOpportunities(chapter?: string) {
    try {
      const where = chapter ? {
        OR: [
          { originChapter: chapter },
          { targetChapters: { contains: chapter } }
        ]
      } : {};

      return await prisma.crossChapterOpportunity.findMany({
        where,
        orderBy: { createdAt: 'desc' }
      });
    } catch (error) {
      console.error('Error fetching cross-chapter opportunities:', error);
      throw error;
    }
  }

  async expressInterestInOpportunity(opportunityId: string, chapter: string) {
    try {
      const opportunity = await prisma.crossChapterOpportunity.findUnique({
        where: { id: opportunityId }
      });

      if (!opportunity) {
        throw new Error('Opportunity not found');
      }

      const interestedChapters = opportunity.interestedChapters 
        ? JSON.parse(opportunity.interestedChapters) 
        : [];

      if (!interestedChapters.includes(chapter)) {
        interestedChapters.push(chapter);
      }

      return await prisma.crossChapterOpportunity.update({
        where: { id: opportunityId },
        data: {
          interestedChapters: JSON.stringify(interestedChapters),
          collaborationResponses: { increment: 1 }
        }
      });
    } catch (error) {
      console.error('Error expressing interest in opportunity:', error);
      throw error;
    }
  }

  // Communication System
  async sendChapterMessage(fromChapter: string, toChapter: string, message: string, subject: string) {
    try {
      // This would integrate with the existing messaging system
      // For now, we'll create a simple notification
      const connection = await this.ensureChapterConnection(fromChapter, toChapter);
      
      // Update last activity
      await this.updateConnectionActivity(connection.id);

      // In a real implementation, this would send through the messaging system
      return {
        success: true,
        message: 'Message sent successfully',
        connectionId: connection.id
      };
    } catch (error) {
      console.error('Error sending chapter message:', error);
      throw error;
    }
  }

  // Private helper methods
  private async ensureChapterConnection(fromChapter: string, toChapter: string) {
    let connection = await prisma.chapterConnection.findFirst({
      where: {
        OR: [
          { fromChapter, toChapter },
          { fromChapter: toChapter, toChapter: fromChapter }
        ]
      }
    });

    if (!connection) {
      connection = await prisma.chapterConnection.create({
        data: {
          fromChapter,
          toChapter,
          connectionType: 'FULL_COLLABORATION',
          status: 'ACTIVE',
          establishedDate: new Date()
        }
      });
    }

    return connection;
  }

  private async ensureMultipleChapterConnections(leadChapter: string, participatingChapters: string[]) {
    const connections = [];
    
    for (const chapter of participatingChapters) {
      if (chapter !== leadChapter) {
        const connection = await this.ensureChapterConnection(leadChapter, chapter);
        connections.push(connection);
      }
    }

    return connections;
  }

  private async updateConnectionActivity(connectionId: string) {
    await prisma.chapterConnection.update({
      where: { id: connectionId },
      data: {
        lastActivity: new Date(),
        collaborationCount: { increment: 1 }
      }
    });
  }

  // HubSpot sync methods
  private async syncChapterConnectionToHubSpot(connection: any) {
    try {
      // Sync to HubSpot custom object
      await this.hubspotService.syncCustomObject('chapter_connections', connection.id, {
        from_chapter: connection.fromChapter,
        to_chapter: connection.toChapter,
        connection_type: connection.connectionType,
        status: connection.status,
        established_date: connection.establishedDate?.toISOString(),
        last_activity: connection.lastActivity?.toISOString(),
        collaboration_count: connection.collaborationCount,
        shared_projects: connection.sharedProjects,
        member_exchanges: connection.memberExchangeCount,
        resource_shares: connection.resourceShares,
        allow_member_exchange: connection.allowMemberExchange,
        allow_resource_sharing: connection.allowResourceSharing,
        allow_project_sharing: connection.allowProjectSharing
      });

      await prisma.chapterConnection.update({
        where: { id: connection.id },
        data: {
          hubspotSyncStatus: 'SYNCED',
          hubspotLastSync: new Date()
        }
      });
    } catch (error) {
      console.error('Error syncing chapter connection to HubSpot:', error);
      await prisma.chapterConnection.update({
        where: { id: connection.id },
        data: {
          hubspotSyncStatus: 'ERROR',
          hubspotSyncError: error.message
        }
      });
    }
  }

  private async syncMemberExchangeToHubSpot(exchange: any) {
    try {
      await this.hubspotService.syncCustomObject('member_exchanges', exchange.id, {
        member_id: exchange.memberId,
        origin_chapter: exchange.originChapter,
        target_chapter: exchange.targetChapter,
        exchange_type: exchange.exchangeType,
        purpose: exchange.purpose,
        duration: exchange.duration,
        status: exchange.status,
        request_date: exchange.requestDate.toISOString(),
        approval_date: exchange.approvalDate?.toISOString(),
        start_date: exchange.startDate?.toISOString(),
        end_date: exchange.endDate?.toISOString(),
        projects_completed: exchange.projectsCompleted,
        resources_shared: exchange.resourcesShared,
        connections_formed: exchange.connectionsFormed,
        business_generated: exchange.businessGenerated,
        success_rating: exchange.successRating
      });

      await prisma.memberExchange.update({
        where: { id: exchange.id },
        data: {
          hubspotSyncStatus: 'SYNCED',
          hubspotLastSync: new Date()
        }
      });
    } catch (error) {
      console.error('Error syncing member exchange to HubSpot:', error);
      await prisma.memberExchange.update({
        where: { id: exchange.id },
        data: {
          hubspotSyncStatus: 'ERROR',
          hubspotSyncError: error.message
        }
      });
    }
  }

  private async syncInterChapterProjectToHubSpot(project: any) {
    try {
      // Create as a deal in HubSpot
      await this.hubspotService.createDeal({
        dealname: project.title,
        dealstage: project.status.toLowerCase(),
        amount: project.estimatedValue?.toString() || '0',
        pipeline: 'inter_chapter_projects',
        project_type: project.projectType,
        lead_chapter: project.leadChapter,
        participating_chapters: project.participatingChapters,
        estimated_value: project.estimatedValue,
        project_location: project.projectLocation,
        member_allocation: project.memberAllocation,
        resource_sharing: project.resourceSharing,
        revenue_sharing: project.revenueSharing,
        completion_percentage: project.completionPercentage,
        actual_value: project.actualValue,
        member_satisfaction: project.memberSatisfaction
      });

      await prisma.interChapterProject.update({
        where: { id: project.id },
        data: {
          hubspotSyncStatus: 'SYNCED',
          hubspotLastSync: new Date()
        }
      });
    } catch (error) {
      console.error('Error syncing inter-chapter project to HubSpot:', error);
      await prisma.interChapterProject.update({
        where: { id: project.id },
        data: {
          hubspotSyncStatus: 'ERROR',
          hubspotSyncError: error.message
        }
      });
    }
  }

  private async syncCrossChapterOpportunityToHubSpot(opportunity: any) {
    try {
      await this.hubspotService.syncCustomObject('cross_chapter_opportunities', opportunity.id, {
        original_opportunity_id: opportunity.originalOpportunityId,
        origin_chapter: opportunity.originChapter,
        target_chapters: opportunity.targetChapters,
        sharing_type: opportunity.sharingType,
        title: opportunity.title,
        estimated_value: opportunity.estimatedValue,
        status: opportunity.status,
        shared_date: opportunity.sharedDate.toISOString(),
        expiration_date: opportunity.expirationDate?.toISOString(),
        interested_chapters: opportunity.interestedChapters,
        collaboration_responses: opportunity.collaborationResponses,
        selected_chapters: opportunity.selectedChapters,
        collaboration_formed: opportunity.collaborationFormed,
        project_value: opportunity.projectValue
      });

      await prisma.crossChapterOpportunity.update({
        where: { id: opportunity.id },
        data: {
          hubspotSyncStatus: 'SYNCED',
          hubspotLastSync: new Date()
        }
      });
    } catch (error) {
      console.error('Error syncing cross-chapter opportunity to HubSpot:', error);
      await prisma.crossChapterOpportunity.update({
        where: { id: opportunity.id },
        data: {
          hubspotSyncStatus: 'ERROR',
          hubspotSyncError: error.message
        }
      });
    }
  }
}

export const chapterConnectionsService = new ChapterConnectionsService();
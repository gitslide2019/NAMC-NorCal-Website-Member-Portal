/**
 * Member Engagement Scoring Service
 * 
 * Calculates and tracks member engagement scores based on community participation,
 * provides recognition and rewards system, and generates engagement analytics.
 */

import { prisma } from '@/lib/prisma';
import { HubSpotBackboneService } from './hubspot-backbone.service';

interface EngagementActivity {
  type: 'discussion' | 'committee' | 'voting' | 'networking' | 'event';
  action: 'create' | 'participate' | 'like' | 'comment' | 'attend' | 'organize';
  value: number;
  metadata?: Record<string, any>;
}

interface EngagementScore {
  totalScore: number;
  breakdown: {
    discussions: number;
    committees: number;
    voting: number;
    networking: number;
    events: number;
  };
  level: 'NEWCOMER' | 'ACTIVE' | 'CONTRIBUTOR' | 'CHAMPION' | 'LEADER';
  badges: string[];
  nextMilestone: {
    level: string;
    pointsNeeded: number;
    description: string;
  };
}

interface RecognitionProgram {
  id: string;
  name: string;
  description: string;
  criteria: {
    minScore?: number;
    minActivities?: number;
    timeframe?: number; // days
    specificActions?: string[];
  };
  rewards: {
    badge?: string;
    points?: number;
    privileges?: string[];
  };
}

export class MemberEngagementScoringService {
  private hubspotService: HubSpotBackboneService;

  // Scoring weights for different activities
  private readonly SCORING_WEIGHTS = {
    discussion: {
      create: 10,
      participate: 5,
      like: 1,
      comment: 3
    },
    committee: {
      join: 15,
      participate: 8,
      lead: 25,
      organize: 20
    },
    voting: {
      participate: 12,
      create: 20,
      comment: 5
    },
    networking: {
      connect: 8,
      collaborate: 15,
      refer: 10,
      mentor: 20
    },
    event: {
      attend: 10,
      organize: 25,
      speak: 30,
      sponsor: 40
    }
  };

  // Recognition programs
  private readonly RECOGNITION_PROGRAMS: RecognitionProgram[] = [
    {
      id: 'community_champion',
      name: 'Community Champion',
      description: 'Awarded monthly to the most active community contributor',
      criteria: {
        minScore: 500,
        timeframe: 30,
        minActivities: 20
      },
      rewards: {
        badge: 'community_champion',
        points: 100,
        privileges: ['featured_profile', 'priority_support']
      }
    },
    {
      id: 'networking_star',
      name: 'Networking Star',
      description: 'Recognizes members who facilitate successful business connections',
      criteria: {
        minScore: 300,
        specificActions: ['networking.collaborate', 'networking.refer'],
        minActivities: 10
      },
      rewards: {
        badge: 'networking_star',
        points: 75,
        privileges: ['networking_spotlight', 'business_directory_featured']
      }
    },
    {
      id: 'discussion_leader',
      name: 'Discussion Leader',
      description: 'Awarded for starting meaningful discussions and providing valuable insights',
      criteria: {
        minScore: 200,
        specificActions: ['discussion.create', 'discussion.comment'],
        minActivities: 15
      },
      rewards: {
        badge: 'discussion_leader',
        points: 50,
        privileges: ['discussion_moderator', 'topic_suggestions']
      }
    },
    {
      id: 'committee_contributor',
      name: 'Committee Contributor',
      description: 'Recognizes active participation in committee work and projects',
      criteria: {
        minScore: 250,
        specificActions: ['committee.participate', 'committee.lead'],
        minActivities: 8
      },
      rewards: {
        badge: 'committee_contributor',
        points: 60,
        privileges: ['committee_leadership_track', 'project_priority']
      }
    },
    {
      id: 'civic_participant',
      name: 'Civic Participant',
      description: 'Awarded for active participation in community voting and governance',
      criteria: {
        minScore: 150,
        specificActions: ['voting.participate', 'voting.create'],
        minActivities: 5
      },
      rewards: {
        badge: 'civic_participant',
        points: 40,
        privileges: ['voting_insights', 'governance_updates']
      }
    }
  ];

  constructor() {
    this.hubspotService = new HubSpotBackboneService();
  }

  /**
   * Record an engagement activity and update member's score
   */
  async recordActivity(memberId: string, activity: EngagementActivity): Promise<void> {
    try {
      // Calculate points for this activity
      const points = this.calculateActivityPoints(activity);

      // Get current user data
      const user = await prisma.user.findUnique({
        where: { id: memberId }
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Mock engagement score update (would update database in real implementation)
      const newScore = Math.floor(Math.random() * 1000) + points;
      console.log(`Updated engagement score for ${user.name}: ${newScore}`);

      // Track activity in HubSpot
      await this.hubspotService.trackCommunityEngagement(memberId, {
        type: activity.type.toUpperCase(),
        action: activity.action.toUpperCase(),
        value: points,
        metadata: activity.metadata
      });

      // Check for new achievements
      await this.checkAchievements(memberId, newScore);

      // Update member's engagement level
      await this.updateEngagementLevel(memberId, newScore);

    } catch (error) {
      console.error('Error recording engagement activity:', error);
      throw error;
    }
  }

  /**
   * Calculate points for a specific activity
   */
  private calculateActivityPoints(activity: EngagementActivity): number {
    const typeWeights = this.SCORING_WEIGHTS[activity.type];
    if (!typeWeights) return 0;

    const basePoints = typeWeights[activity.action] || 0;
    
    // Apply multipliers based on metadata
    let multiplier = 1;
    
    if (activity.metadata) {
      // Quality multiplier for high-engagement content
      if (activity.metadata.likes > 10) multiplier *= 1.5;
      if (activity.metadata.replies > 5) multiplier *= 1.3;
      if (activity.metadata.views > 100) multiplier *= 1.2;
      
      // Leadership multiplier
      if (activity.metadata.isLeadership) multiplier *= 2;
      
      // First-time activity bonus
      if (activity.metadata.isFirstTime) multiplier *= 1.5;
    }

    return Math.round(basePoints * multiplier);
  }

  /**
   * Get comprehensive engagement score for a member
   */
  async getMemberEngagementScore(memberId: string): Promise<EngagementScore> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: memberId }
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Mock engagement score calculation
      const totalScore = Math.floor(Math.random() * 1000) + 100;

      // Mock breakdown by activity type
      const breakdown = {
        discussions: Math.floor(Math.random() * 100) + 50,
        committees: Math.floor(Math.random() * 80) + 30,
        voting: Math.floor(Math.random() * 60) + 20,
        networking: Math.floor(Math.random() * 90) + 40,
        events: Math.floor(Math.random() * 70) + 25
      };

      // Determine engagement level
      const level = this.calculateEngagementLevel(totalScore);

      // Get earned badges (simplified - would be stored in database)
      const badges = await this.getMemberBadges(memberId);

      // Calculate next milestone
      const nextMilestone = this.getNextMilestone(totalScore, level);

      return {
        totalScore,
        breakdown,
        level,
        badges,
        nextMilestone
      };

    } catch (error) {
      console.error('Error getting member engagement score:', error);
      throw error;
    }
  }

  /**
   * Calculate engagement level based on total score
   */
  private calculateEngagementLevel(score: number): EngagementScore['level'] {
    if (score >= 1000) return 'LEADER';
    if (score >= 500) return 'CHAMPION';
    if (score >= 200) return 'CONTRIBUTOR';
    if (score >= 50) return 'ACTIVE';
    return 'NEWCOMER';
  }

  /**
   * Get next milestone for member progression
   */
  private getNextMilestone(currentScore: number, currentLevel: EngagementScore['level']) {
    const milestones = {
      NEWCOMER: { level: 'ACTIVE', threshold: 50, description: 'Participate in discussions and committees' },
      ACTIVE: { level: 'CONTRIBUTOR', threshold: 200, description: 'Lead discussions and help other members' },
      CONTRIBUTOR: { level: 'CHAMPION', threshold: 500, description: 'Organize events and mentor newcomers' },
      CHAMPION: { level: 'LEADER', threshold: 1000, description: 'Lead major initiatives and drive community growth' },
      LEADER: { level: 'LEADER', threshold: 1000, description: 'Continue leading and inspiring the community' }
    };

    const milestone = milestones[currentLevel];
    const pointsNeeded = Math.max(0, milestone.threshold - currentScore);

    return {
      level: milestone.level,
      pointsNeeded,
      description: milestone.description
    };
  }

  /**
   * Check for new achievements and award recognition
   */
  private async checkAchievements(memberId: string, newScore: number): Promise<void> {
    try {
      // Get member's recent activities
      const recentActivities = await this.getRecentActivities(memberId, 30); // Last 30 days

      for (const program of this.RECOGNITION_PROGRAMS) {
        const qualifies = await this.checkProgramQualification(memberId, program, recentActivities, newScore);
        
        if (qualifies) {
          await this.awardRecognition(memberId, program);
        }
      }
    } catch (error) {
      console.error('Error checking achievements:', error);
    }
  }

  /**
   * Check if member qualifies for a recognition program
   */
  private async checkProgramQualification(
    memberId: string,
    program: RecognitionProgram,
    recentActivities: any[],
    currentScore: number
  ): Promise<boolean> {
    const { criteria } = program;

    // Check minimum score
    if (criteria.minScore && currentScore < criteria.minScore) {
      return false;
    }

    // Check minimum activities
    if (criteria.minActivities && recentActivities.length < criteria.minActivities) {
      return false;
    }

    // Check specific actions
    if (criteria.specificActions) {
      const hasRequiredActions = criteria.specificActions.some(action => 
        recentActivities.some(activity => 
          `${activity.type}.${activity.action}` === action
        )
      );
      if (!hasRequiredActions) return false;
    }

    // Check if already awarded recently (prevent duplicate awards)
    const recentAward = await this.hasRecentAward(memberId, program.id, 30);
    if (recentAward) return false;

    return true;
  }

  /**
   * Award recognition to a member
   */
  private async awardRecognition(memberId: string, program: RecognitionProgram): Promise<void> {
    try {
      // Create recognition record (would be stored in database)
      // For now, we'll update the member's engagement score with bonus points
      if (program.rewards.points) {
        await prisma.member.update({
          where: { id: memberId },
          data: {
            engagementScore: {
              increment: program.rewards.points
            }
          }
        });
      }

      // Send recognition notification
      const member = await prisma.member.findUnique({
        where: { id: memberId }
      });

      if (member) {
        await prisma.memberMessage.create({
          data: {
            senderId: 'system', // System message
            recipientId: memberId,
            subject: `🏆 Congratulations! You've earned: ${program.name}`,
            content: `Congratulations ${member.firstName}!\n\nYou've been awarded the "${program.name}" recognition!\n\n${program.description}\n\nRewards:\n${program.rewards.points ? `• ${program.rewards.points} bonus points\n` : ''}${program.rewards.privileges ? `• Special privileges: ${program.rewards.privileges.join(', ')}\n` : ''}\n\nKeep up the great work in our community!`,
            messageType: 'SYSTEM_RECOGNITION',
            priority: 'HIGH'
          }
        });
      }

      // Track in HubSpot
      await this.hubspotService.trackCommunityEngagement(memberId, {
        type: 'RECOGNITION',
        action: 'AWARDED',
        value: program.rewards.points || 0,
        metadata: {
          programId: program.id,
          programName: program.name,
          badges: program.rewards.badge ? [program.rewards.badge] : [],
          privileges: program.rewards.privileges || []
        }
      });

    } catch (error) {
      console.error('Error awarding recognition:', error);
    }
  }

  /**
   * Get member's recent activities
   */
  private async getRecentActivities(memberId: string, days: number): Promise<any[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // This would query various activity tables
    // For now, return a simplified structure
    const activities = [];

    // Get discussions
    const discussions = await prisma.communityDiscussion.findMany({
      where: {
        authorId: memberId,
        createdAt: { gte: startDate }
      }
    });

    activities.push(...discussions.map(d => ({
      type: 'discussion',
      action: 'create',
      createdAt: d.createdAt,
      metadata: { id: d.id }
    })));

    // Get committee activities
    const committeeJoins = await prisma.committeeMember.findMany({
      where: {
        memberId,
        joinedAt: { gte: startDate }
      }
    });

    activities.push(...committeeJoins.map(c => ({
      type: 'committee',
      action: 'join',
      createdAt: c.joinedAt,
      metadata: { committeeId: c.committeeId }
    })));

    // Get voting activities
    const votes = await prisma.voteBallot.findMany({
      where: {
        memberId,
        createdAt: { gte: startDate }
      }
    });

    activities.push(...votes.map(v => ({
      type: 'voting',
      action: 'participate',
      createdAt: v.createdAt,
      metadata: { voteId: v.voteId }
    })));

    return activities.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * Check if member has received a specific award recently
   */
  private async hasRecentAward(memberId: string, programId: string, days: number): Promise<boolean> {
    // This would check a recognition/awards table
    // For now, return false to allow awards
    return false;
  }

  /**
   * Get member's earned badges
   */
  private async getMemberBadges(memberId: string): Promise<string[]> {
    // This would query a badges table
    // For now, return empty array
    return [];
  }

  /**
   * Update member's engagement level in HubSpot
   */
  private async updateEngagementLevel(memberId: string, score: number): Promise<void> {
    try {
      const level = this.calculateEngagementLevel(score);
      
      await this.hubspotService.updateMemberEngagementScore(memberId, score, {
        discussions: 0, // Would calculate from actual data
        committees: 0,
        voting: 0,
        networking: 0
      });

    } catch (error) {
      console.error('Error updating engagement level:', error);
    }
  }

  /**
   * Get community leaderboard
   */
  async getCommunityLeaderboard(limit: number = 10): Promise<any[]> {
    try {
      const topMembers = await prisma.member.findMany({
        orderBy: {
          engagementScore: 'desc'
        },
        take: limit,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          engagementScore: true,
          profileImage: true
        }
      });

      return topMembers.map((member, index) => ({
        rank: index + 1,
        id: member.id,
        name: `${member.firstName} ${member.lastName}`,
        score: member.engagementScore || 0,
        avatar: member.profileImage,
        level: this.calculateEngagementLevel(member.engagementScore || 0)
      }));

    } catch (error) {
      console.error('Error getting community leaderboard:', error);
      throw error;
    }
  }

  /**
   * Generate engagement analytics for admin dashboard
   */
  async generateEngagementAnalytics(timeframe: 'week' | 'month' | 'quarter' = 'month'): Promise<any> {
    try {
      const days = timeframe === 'week' ? 7 : timeframe === 'quarter' ? 90 : 30;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Get engagement trends
      const trends = [];
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dayStart = new Date(date.setHours(0, 0, 0, 0));
        const dayEnd = new Date(date.setHours(23, 59, 59, 999));

        // Count activities for this day
        const dayActivities = {
          discussions: await prisma.communityDiscussion.count({
            where: { createdAt: { gte: dayStart, lte: dayEnd } }
          }),
          committees: await prisma.committeeMember.count({
            where: { joinedAt: { gte: dayStart, lte: dayEnd } }
          }),
          voting: await prisma.voteBallot.count({
            where: { createdAt: { gte: dayStart, lte: dayEnd } }
          }),
          networking: await prisma.memberConnection.count({
            where: { createdAt: { gte: dayStart, lte: dayEnd } }
          })
        };

        trends.push({
          date: dayStart.toISOString().split('T')[0],
          ...dayActivities
        });
      }

      // Get top contributors
      const topContributors = await this.getCommunityLeaderboard(10);

      // Calculate overall metrics
      const totalMembers = await prisma.member.count();
      const activeMembers = await prisma.member.count({
        where: {
          lastLoginAt: { gte: startDate }
        }
      });

      return {
        timeframe,
        totalMembers,
        activeMembers,
        topContributors,
        trends,
        recognitionPrograms: this.RECOGNITION_PROGRAMS.map(p => ({
          id: p.id,
          name: p.name,
          description: p.description
        }))
      };

    } catch (error) {
      console.error('Error generating engagement analytics:', error);
      throw error;
    }
  }
}
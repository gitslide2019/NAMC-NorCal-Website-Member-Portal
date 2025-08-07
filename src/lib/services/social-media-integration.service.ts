import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface SocialMediaAccountData {
  platform: 'twitter' | 'facebook' | 'instagram' | 'linkedin' | 'youtube';
  handle: string;
  displayName: string;
  description?: string;
  avatarUrl?: string;
  followerCount?: number;
  followingCount?: number;
  postCount?: number;
  isOfficial?: boolean;
  isActive?: boolean;
  accessToken?: string;
  refreshToken?: string;
  tokenExpiresAt?: Date;
  syncFrequency?: number;
}

export interface SocialMediaPostData {
  contentId?: string;
  platform: string;
  postId: string;
  postUrl?: string;
  postText?: string;
  postMedia?: any;
  authorHandle?: string;
  authorName?: string;
  authorAvatar?: string;
  publishedAt: Date;
  engagementData?: any;
  hashtags?: string;
  mentions?: string;
  isNamcOfficial?: boolean;
}

export class SocialMediaIntegrationService {
  // Account Management
  async addSocialMediaAccount(data: SocialMediaAccountData) {
    try {
      const account = await prisma.socialMediaAccount.create({
        data: {
          platform: data.platform,
          handle: data.handle,
          displayName: data.displayName,
          description: data.description,
          avatarUrl: data.avatarUrl,
          followerCount: data.followerCount || 0,
          followingCount: data.followingCount || 0,
          postCount: data.postCount || 0,
          isOfficial: data.isOfficial || false,
          isActive: data.isActive ?? true,
          accessToken: data.accessToken ? this.encryptToken(data.accessToken) : null,
          refreshToken: data.refreshToken ? this.encryptToken(data.refreshToken) : null,
          tokenExpiresAt: data.tokenExpiresAt,
          syncFrequency: data.syncFrequency || 3600 // 1 hour default
        }
      });

      return account;
    } catch (error) {
      console.error('Error adding social media account:', error);
      throw new Error('Failed to add social media account');
    }
  }

  async updateSocialMediaAccount(id: string, data: Partial<SocialMediaAccountData>) {
    try {
      const updateData: any = { ...data };
      
      if (data.accessToken) {
        updateData.accessToken = this.encryptToken(data.accessToken);
      }
      
      if (data.refreshToken) {
        updateData.refreshToken = this.encryptToken(data.refreshToken);
      }

      const account = await prisma.socialMediaAccount.update({
        where: { id },
        data: updateData
      });

      return account;
    } catch (error) {
      console.error('Error updating social media account:', error);
      throw new Error('Failed to update social media account');
    }
  }

  async getSocialMediaAccounts(includeInactive = false) {
    try {
      const where = includeInactive ? {} : { isActive: true };
      
      return await prisma.socialMediaAccount.findMany({
        where,
        orderBy: [
          { isOfficial: 'desc' },
          { platform: 'asc' }
        ]
      });
    } catch (error) {
      console.error('Error fetching social media accounts:', error);
      throw new Error('Failed to fetch social media accounts');
    }
  }

  async getOfficialAccounts() {
    try {
      return await prisma.socialMediaAccount.findMany({
        where: {
          isOfficial: true,
          isActive: true
        },
        orderBy: { platform: 'asc' }
      });
    } catch (error) {
      console.error('Error fetching official accounts:', error);
      throw new Error('Failed to fetch official accounts');
    }
  }

  // Post Management
  async syncSocialMediaPost(data: SocialMediaPostData) {
    try {
      const existingPost = await prisma.socialMediaPost.findUnique({
        where: {
          platform_postId: {
            platform: data.platform,
            postId: data.postId
          }
        }
      });

      if (existingPost) {
        // Update existing post
        return await prisma.socialMediaPost.update({
          where: { id: existingPost.id },
          data: {
            postUrl: data.postUrl,
            postText: data.postText,
            postMedia: data.postMedia ? JSON.stringify(data.postMedia) : null,
            authorHandle: data.authorHandle,
            authorName: data.authorName,
            authorAvatar: data.authorAvatar,
            engagementData: data.engagementData ? JSON.stringify(data.engagementData) : null,
            hashtags: data.hashtags,
            mentions: data.mentions,
            syncStatus: 'synced',
            lastSyncAt: new Date()
          }
        });
      } else {
        // Create new post
        return await prisma.socialMediaPost.create({
          data: {
            contentId: data.contentId,
            platform: data.platform,
            postId: data.postId,
            postUrl: data.postUrl,
            postText: data.postText,
            postMedia: data.postMedia ? JSON.stringify(data.postMedia) : null,
            authorHandle: data.authorHandle,
            authorName: data.authorName,
            authorAvatar: data.authorAvatar,
            publishedAt: data.publishedAt,
            engagementData: data.engagementData ? JSON.stringify(data.engagementData) : null,
            hashtags: data.hashtags,
            mentions: data.mentions,
            isNamcOfficial: data.isNamcOfficial || false,
            syncStatus: 'synced',
            lastSyncAt: new Date()
          }
        });
      }
    } catch (error) {
      console.error('Error syncing social media post:', error);
      throw new Error('Failed to sync social media post');
    }
  }

  async getSocialMediaPosts(params: {
    platform?: string;
    isNamcOfficial?: boolean;
    limit?: number;
    offset?: number;
    sortBy?: 'publishedAt' | 'lastSyncAt';
    sortOrder?: 'asc' | 'desc';
  } = {}) {
    try {
      const {
        platform,
        isNamcOfficial,
        limit = 20,
        offset = 0,
        sortBy = 'publishedAt',
        sortOrder = 'desc'
      } = params;

      const where: any = {};
      
      if (platform) {
        where.platform = platform;
      }
      
      if (isNamcOfficial !== undefined) {
        where.isNamcOfficial = isNamcOfficial;
      }

      const [posts, total] = await Promise.all([
        prisma.socialMediaPost.findMany({
          where,
          include: {
            content: {
              include: {
                author: true
              }
            }
          },
          orderBy: { [sortBy]: sortOrder },
          take: limit,
          skip: offset
        }),
        prisma.socialMediaPost.count({ where })
      ]);

      return {
        posts,
        total,
        hasMore: offset + limit < total
      };
    } catch (error) {
      console.error('Error fetching social media posts:', error);
      throw new Error('Failed to fetch social media posts');
    }
  }

  async getRecentSocialMediaFeed(limit = 10) {
    try {
      const posts = await prisma.socialMediaPost.findMany({
        where: {
          isNamcOfficial: true
        },
        orderBy: {
          publishedAt: 'desc'
        },
        take: limit
      });

      return posts.map(post => ({
        id: post.id,
        platform: post.platform,
        postUrl: post.postUrl,
        postText: post.postText,
        postMedia: post.postMedia ? JSON.parse(post.postMedia) : null,
        authorHandle: post.authorHandle,
        authorName: post.authorName,
        authorAvatar: post.authorAvatar,
        publishedAt: post.publishedAt,
        engagementData: post.engagementData ? JSON.parse(post.engagementData) : null,
        hashtags: post.hashtags?.split(',').map(tag => tag.trim()) || [],
        mentions: post.mentions?.split(',').map(mention => mention.trim()) || []
      }));
    } catch (error) {
      console.error('Error fetching social media feed:', error);
      throw new Error('Failed to fetch social media feed');
    }
  }

  // Content Sharing
  async shareContentToSocialMedia(contentId: string, platforms: string[], customMessage?: string) {
    try {
      // This would integrate with actual social media APIs
      // For now, we'll create placeholder posts
      
      const results = await Promise.all(
        platforms.map(async (platform) => {
          try {
            // In a real implementation, this would:
            // 1. Get the content details
            // 2. Format the post for the specific platform
            // 3. Use the platform's API to create the post
            // 4. Store the result in our database
            
            const postId = `shared_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            
            const post = await this.syncSocialMediaPost({
              contentId,
              platform,
              postId,
              postUrl: `https://${platform}.com/namc/status/${postId}`,
              postText: customMessage || 'Check out our latest content!',
              authorHandle: '@namc_norcal',
              authorName: 'NAMC Northern California',
              publishedAt: new Date(),
              isNamcOfficial: true
            });

            return { platform, success: true, post };
          } catch (error) {
            console.error(`Error sharing to ${platform}:`, error);
            return { platform, success: false, error: error.message };
          }
        })
      );

      return results;
    } catch (error) {
      console.error('Error sharing content to social media:', error);
      throw new Error('Failed to share content to social media');
    }
  }

  // Analytics
  async getSocialMediaAnalytics(timeRange?: { start: Date; end: Date }) {
    try {
      const where: any = {
        isNamcOfficial: true
      };

      if (timeRange) {
        where.publishedAt = {
          gte: timeRange.start,
          lte: timeRange.end
        };
      }

      const [platformStats, totalPosts, engagementData] = await Promise.all([
        prisma.socialMediaPost.groupBy({
          by: ['platform'],
          where,
          _count: {
            platform: true
          }
        }),
        prisma.socialMediaPost.count({ where }),
        prisma.socialMediaPost.findMany({
          where,
          select: {
            platform: true,
            engagementData: true
          }
        })
      ]);

      // Calculate engagement metrics
      const engagementByPlatform = engagementData.reduce((acc, post) => {
        if (!post.engagementData) return acc;
        
        try {
          const engagement = JSON.parse(post.engagementData);
          if (!acc[post.platform]) {
            acc[post.platform] = {
              likes: 0,
              shares: 0,
              comments: 0,
              views: 0
            };
          }
          
          acc[post.platform].likes += engagement.likes || 0;
          acc[post.platform].shares += engagement.shares || 0;
          acc[post.platform].comments += engagement.comments || 0;
          acc[post.platform].views += engagement.views || 0;
        } catch (error) {
          // Skip invalid engagement data
        }
        
        return acc;
      }, {} as Record<string, any>);

      return {
        totalPosts,
        platformStats: platformStats.reduce((acc, stat) => {
          acc[stat.platform] = stat._count.platform;
          return acc;
        }, {} as Record<string, number>),
        engagementByPlatform
      };
    } catch (error) {
      console.error('Error fetching social media analytics:', error);
      throw new Error('Failed to fetch social media analytics');
    }
  }

  // Sync Operations
  async syncAllAccounts() {
    try {
      const accounts = await this.getSocialMediaAccounts();
      const results = [];

      for (const account of accounts) {
        try {
          const syncResult = await this.syncAccountPosts(account.id);
          results.push({
            accountId: account.id,
            platform: account.platform,
            success: true,
            postsSync: syncResult.postsSync
          });
        } catch (error) {
          results.push({
            accountId: account.id,
            platform: account.platform,
            success: false,
            error: error.message
          });
        }
      }

      return results;
    } catch (error) {
      console.error('Error syncing all accounts:', error);
      throw new Error('Failed to sync all accounts');
    }
  }

  async syncAccountPosts(accountId: string) {
    try {
      const account = await prisma.socialMediaAccount.findUnique({
        where: { id: accountId }
      });

      if (!account) {
        throw new Error('Account not found');
      }

      // In a real implementation, this would:
      // 1. Use the account's access token to fetch recent posts
      // 2. Parse the posts and extract relevant data
      // 3. Sync each post to our database
      // 4. Update the account's last sync time

      // For now, we'll simulate syncing some posts
      const mockPosts = this.generateMockPosts(account.platform, account.handle, 5);
      
      const syncedPosts = await Promise.all(
        mockPosts.map(post => this.syncSocialMediaPost(post))
      );

      // Update account sync time
      await prisma.socialMediaAccount.update({
        where: { id: accountId },
        data: { lastSyncAt: new Date() }
      });

      return {
        postsSync: syncedPosts.length,
        lastSyncAt: new Date()
      };
    } catch (error) {
      console.error('Error syncing account posts:', error);
      throw new Error('Failed to sync account posts');
    }
  }

  // Helper Methods
  private encryptToken(token: string): string {
    // In a real implementation, use proper encryption
    // For now, just base64 encode (NOT SECURE - for demo only)
    return Buffer.from(token).toString('base64');
  }

  private decryptToken(encryptedToken: string): string {
    // In a real implementation, use proper decryption
    // For now, just base64 decode (NOT SECURE - for demo only)
    return Buffer.from(encryptedToken, 'base64').toString();
  }

  private generateMockPosts(platform: string, handle: string, count: number): SocialMediaPostData[] {
    const posts: SocialMediaPostData[] = [];
    
    for (let i = 0; i < count; i++) {
      const postId = `mock_${Date.now()}_${i}`;
      const publishedAt = new Date(Date.now() - (i * 24 * 60 * 60 * 1000)); // i days ago
      
      posts.push({
        platform,
        postId,
        postUrl: `https://${platform}.com/${handle}/status/${postId}`,
        postText: `Mock post ${i + 1} from ${handle} on ${platform}`,
        authorHandle: handle,
        authorName: 'NAMC Northern California',
        publishedAt,
        engagementData: {
          likes: Math.floor(Math.random() * 100),
          shares: Math.floor(Math.random() * 50),
          comments: Math.floor(Math.random() * 25),
          views: Math.floor(Math.random() * 1000)
        },
        hashtags: '#NAMC,#Construction,#Contractors',
        isNamcOfficial: true
      });
    }
    
    return posts;
  }

  // Platform-specific methods (placeholders for real API integrations)
  async postToTwitter(message: string, mediaUrls?: string[]) {
    // Twitter API integration would go here
    throw new Error('Twitter integration not implemented');
  }

  async postToFacebook(message: string, mediaUrls?: string[]) {
    // Facebook API integration would go here
    throw new Error('Facebook integration not implemented');
  }

  async postToInstagram(imageUrl: string, caption: string) {
    // Instagram API integration would go here
    throw new Error('Instagram integration not implemented');
  }

  async postToLinkedIn(message: string, mediaUrls?: string[]) {
    // LinkedIn API integration would go here
    throw new Error('LinkedIn integration not implemented');
  }
}

export const socialMediaIntegrationService = new SocialMediaIntegrationService();
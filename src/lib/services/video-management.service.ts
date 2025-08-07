import { PrismaClient } from '@prisma/client';
import { mediaManagementService } from './media-management.service';

const prisma = new PrismaClient();

export interface VideoData {
  title: string;
  description?: string;
  videoUrl: string;
  thumbnailUrl?: string;
  duration?: number;
  fileSize?: number;
  videoFormat?: string;
  resolution?: string;
  quality?: string;
  authorId?: string;
  categoryIds?: string[];
  tagIds?: string[];
  isPublic?: boolean;
  isFeatured?: boolean;
  allowComments?: boolean;
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string;
}

export interface VideoPlaylistData {
  name: string;
  description?: string;
  thumbnailUrl?: string;
  isPublic?: boolean;
  creatorId: string;
}

export interface VideoQuality {
  quality: string;
  url: string;
  resolution: string;
  fileSize?: number;
}

export class VideoManagementService {
  // Video Content Management
  async createVideo(data: VideoData) {
    try {
      // Generate video slug
      const slug = data.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');

      // Create the media content
      const mediaContent = await mediaManagementService.createMediaContent({
        title: data.title,
        slug,
        description: data.description,
        contentType: 'video',
        status: 'published',
        authorId: data.authorId,
        featuredImage: data.thumbnailUrl,
        mediaUrl: data.videoUrl,
        duration: data.duration,
        fileSize: data.fileSize,
        mimeType: data.videoFormat || 'video/mp4',
        seoTitle: data.seoTitle,
        seoDescription: data.seoDescription,
        seoKeywords: data.seoKeywords,
        isPublic: data.isPublic ?? true,
        isFeatured: data.isFeatured ?? false,
        allowComments: data.allowComments ?? true,
        categoryIds: data.categoryIds,
        tagIds: data.tagIds
      });

      return mediaContent;
    } catch (error) {
      console.error('Error creating video:', error);
      throw new Error('Failed to create video');
    }
  }

  async updateVideo(id: string, data: Partial<VideoData>) {
    try {
      const updatedContent = await mediaManagementService.updateMediaContent(id, {
        title: data.title,
        description: data.description,
        featuredImage: data.thumbnailUrl,
        mediaUrl: data.videoUrl,
        duration: data.duration,
        fileSize: data.fileSize,
        mimeType: data.videoFormat,
        seoTitle: data.seoTitle,
        seoDescription: data.seoDescription,
        seoKeywords: data.seoKeywords,
        isPublic: data.isPublic,
        isFeatured: data.isFeatured,
        allowComments: data.allowComments,
        categoryIds: data.categoryIds,
        tagIds: data.tagIds
      });

      return updatedContent;
    } catch (error) {
      console.error('Error updating video:', error);
      throw new Error('Failed to update video');
    }
  }

  async getVideo(id: string) {
    try {
      const video = await mediaManagementService.getMediaContent(id);
      
      if (!video || video.contentType !== 'video') {
        return null;
      }

      return video;
    } catch (error) {
      console.error('Error fetching video:', error);
      throw new Error('Failed to fetch video');
    }
  }

  async getVideoBySlug(slug: string) {
    try {
      const video = await mediaManagementService.getMediaContentBySlug(slug);
      
      if (!video || video.contentType !== 'video') {
        return null;
      }

      return video;
    } catch (error) {
      console.error('Error fetching video by slug:', error);
      throw new Error('Failed to fetch video');
    }
  }

  async searchVideos(params: {
    query?: string;
    categoryId?: string;
    tagId?: string;
    authorId?: string;
    isPublic?: boolean;
    isFeatured?: boolean;
    limit?: number;
    offset?: number;
    sortBy?: 'createdAt' | 'publishedAt' | 'viewCount' | 'likeCount';
    sortOrder?: 'asc' | 'desc';
  }) {
    try {
      return await mediaManagementService.searchMediaContent({
        ...params,
        contentType: 'video'
      });
    } catch (error) {
      console.error('Error searching videos:', error);
      throw new Error('Failed to search videos');
    }
  }

  async deleteVideo(id: string) {
    try {
      return await mediaManagementService.deleteMediaContent(id);
    } catch (error) {
      console.error('Error deleting video:', error);
      throw new Error('Failed to delete video');
    }
  }

  // Video Playlist Management
  async createPlaylist(data: VideoPlaylistData) {
    try {
      const playlist = await prisma.videoPlaylist.create({
        data: {
          name: data.name,
          description: data.description,
          thumbnailUrl: data.thumbnailUrl,
          isPublic: data.isPublic ?? true,
          creatorId: data.creatorId
        },
        include: {
          creator: true,
          items: {
            include: {
              content: {
                include: {
                  author: true
                }
              }
            },
            orderBy: {
              sortOrder: 'asc'
            }
          }
        }
      });

      return playlist;
    } catch (error) {
      console.error('Error creating video playlist:', error);
      throw new Error('Failed to create video playlist');
    }
  }

  async updatePlaylist(id: string, data: Partial<VideoPlaylistData>) {
    try {
      const playlist = await prisma.videoPlaylist.update({
        where: { id },
        data: {
          name: data.name,
          description: data.description,
          thumbnailUrl: data.thumbnailUrl,
          isPublic: data.isPublic
        },
        include: {
          creator: true,
          items: {
            include: {
              content: {
                include: {
                  author: true
                }
              }
            },
            orderBy: {
              sortOrder: 'asc'
            }
          }
        }
      });

      return playlist;
    } catch (error) {
      console.error('Error updating video playlist:', error);
      throw new Error('Failed to update video playlist');
    }
  }

  async getPlaylist(id: string) {
    try {
      return await prisma.videoPlaylist.findUnique({
        where: { id },
        include: {
          creator: true,
          items: {
            include: {
              content: {
                include: {
                  author: true,
                  categories: {
                    include: {
                      category: true
                    }
                  },
                  tags: {
                    include: {
                      tag: true
                    }
                  }
                }
              }
            },
            orderBy: {
              sortOrder: 'asc'
            }
          }
        }
      });
    } catch (error) {
      console.error('Error fetching video playlist:', error);
      throw new Error('Failed to fetch video playlist');
    }
  }

  async getUserPlaylists(userId: string, includePrivate = false) {
    try {
      const where: any = { creatorId: userId };
      
      if (!includePrivate) {
        where.isPublic = true;
      }

      return await prisma.videoPlaylist.findMany({
        where,
        include: {
          creator: true,
          items: {
            take: 5, // First 5 videos for preview
            include: {
              content: {
                include: {
                  author: true
                }
              }
            },
            orderBy: {
              sortOrder: 'asc'
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });
    } catch (error) {
      console.error('Error fetching user playlists:', error);
      throw new Error('Failed to fetch user playlists');
    }
  }

  async addVideoToPlaylist(playlistId: string, videoId: string, sortOrder?: number) {
    try {
      // Check if video is already in playlist
      const existingItem = await prisma.playlistItem.findFirst({
        where: {
          playlistId,
          contentId: videoId
        }
      });

      if (existingItem) {
        throw new Error('Video is already in playlist');
      }

      // Get the next sort order if not provided
      if (sortOrder === undefined) {
        const lastItem = await prisma.playlistItem.findFirst({
          where: { playlistId },
          orderBy: { sortOrder: 'desc' }
        });
        sortOrder = (lastItem?.sortOrder || 0) + 1;
      }

      const playlistItem = await prisma.playlistItem.create({
        data: {
          playlistId,
          contentId: videoId,
          sortOrder
        },
        include: {
          content: {
            include: {
              author: true
            }
          }
        }
      });

      // Update playlist statistics
      await this.updatePlaylistStats(playlistId);

      return playlistItem;
    } catch (error) {
      console.error('Error adding video to playlist:', error);
      throw new Error('Failed to add video to playlist');
    }
  }

  async removeVideoFromPlaylist(playlistId: string, videoId: string) {
    try {
      await prisma.playlistItem.deleteMany({
        where: {
          playlistId,
          contentId: videoId
        }
      });

      // Update playlist statistics
      await this.updatePlaylistStats(playlistId);

      return true;
    } catch (error) {
      console.error('Error removing video from playlist:', error);
      throw new Error('Failed to remove video from playlist');
    }
  }

  async reorderPlaylistItems(playlistId: string, itemOrders: { itemId: string; sortOrder: number }[]) {
    try {
      await Promise.all(
        itemOrders.map(({ itemId, sortOrder }) =>
          prisma.playlistItem.update({
            where: { id: itemId },
            data: { sortOrder }
          })
        )
      );

      return true;
    } catch (error) {
      console.error('Error reordering playlist items:', error);
      throw new Error('Failed to reorder playlist items');
    }
  }

  // Video Analytics and Tracking
  async trackVideoView(videoId: string, userId?: string, watchTime?: number) {
    try {
      // Track analytics event
      await mediaManagementService.trackEvent({
        contentId: videoId,
        userId,
        eventType: 'view',
        eventData: watchTime ? { watchTime } : undefined
      });

      return true;
    } catch (error) {
      console.error('Error tracking video view:', error);
      throw new Error('Failed to track video view');
    }
  }

  async trackVideoPlay(videoId: string, userId?: string) {
    try {
      await mediaManagementService.trackEvent({
        contentId: videoId,
        userId,
        eventType: 'play'
      });

      return true;
    } catch (error) {
      console.error('Error tracking video play:', error);
      throw new Error('Failed to track video play');
    }
  }

  async trackVideoPause(videoId: string, userId?: string, currentTime?: number) {
    try {
      await mediaManagementService.trackEvent({
        contentId: videoId,
        userId,
        eventType: 'pause',
        eventData: currentTime ? { currentTime } : undefined
      });

      return true;
    } catch (error) {
      console.error('Error tracking video pause:', error);
      throw new Error('Failed to track video pause');
    }
  }

  async trackVideoComplete(videoId: string, userId?: string, watchTime?: number) {
    try {
      await mediaManagementService.trackEvent({
        contentId: videoId,
        userId,
        eventType: 'complete',
        eventData: watchTime ? { watchTime } : undefined
      });

      return true;
    } catch (error) {
      console.error('Error tracking video completion:', error);
      throw new Error('Failed to track video completion');
    }
  }

  async getVideoAnalytics(videoId: string, timeRange?: { start: Date; end: Date }) {
    try {
      return await mediaManagementService.getContentAnalytics(videoId, timeRange);
    } catch (error) {
      console.error('Error fetching video analytics:', error);
      throw new Error('Failed to fetch video analytics');
    }
  }

  // Video Recommendations
  async getRecommendedVideos(videoId: string, limit = 10) {
    try {
      const currentVideo = await this.getVideo(videoId);
      if (!currentVideo) {
        throw new Error('Video not found');
      }

      // Get videos from same categories
      const categoryIds = currentVideo.categories.map(c => c.category.id);
      
      const recommendedVideos = await mediaManagementService.searchMediaContent({
        contentType: 'video',
        categoryId: categoryIds[0], // Use first category for now
        limit,
        sortBy: 'viewCount',
        sortOrder: 'desc'
      });

      // Filter out current video
      recommendedVideos.content = recommendedVideos.content.filter(v => v.id !== videoId);

      return recommendedVideos;
    } catch (error) {
      console.error('Error fetching recommended videos:', error);
      throw new Error('Failed to fetch recommended videos');
    }
  }

  // Video Quality Management
  async addVideoQuality(videoId: string, quality: VideoQuality) {
    try {
      // For now, we'll store quality options in the media content metadata
      // In a real implementation, you might have a separate table for video qualities
      const video = await this.getVideo(videoId);
      if (!video) {
        throw new Error('Video not found');
      }

      // This would be implemented based on your video processing pipeline
      // For now, we'll just return success
      return true;
    } catch (error) {
      console.error('Error adding video quality:', error);
      throw new Error('Failed to add video quality');
    }
  }

  // Helper Methods
  private async updatePlaylistStats(playlistId: string) {
    try {
      const stats = await prisma.playlistItem.aggregate({
        where: { playlistId },
        _count: { id: true }
      });

      // Get total duration from all videos in playlist
      const items = await prisma.playlistItem.findMany({
        where: { playlistId },
        include: {
          content: true
        }
      });

      const totalDuration = items.reduce((sum, item) => {
        return sum + (item.content.duration || 0);
      }, 0);

      await prisma.videoPlaylist.update({
        where: { id: playlistId },
        data: {
          videoCount: stats._count.id,
          totalDuration
        }
      });
    } catch (error) {
      console.error('Error updating playlist stats:', error);
    }
  }

  // Video Processing (placeholder for future implementation)
  async processVideoUpload(file: File, userId: string) {
    try {
      // This would integrate with a video processing service like:
      // - AWS MediaConvert
      // - Google Cloud Video Intelligence
      // - Azure Media Services
      // - Or a custom FFmpeg-based solution

      // For now, return a placeholder response
      return {
        videoUrl: '/placeholder-video.mp4',
        thumbnailUrl: '/placeholder-thumbnail.jpg',
        duration: 300, // 5 minutes
        fileSize: file.size,
        videoFormat: 'video/mp4',
        resolution: '1920x1080',
        qualities: [
          { quality: '1080p', url: '/placeholder-1080p.mp4', resolution: '1920x1080' },
          { quality: '720p', url: '/placeholder-720p.mp4', resolution: '1280x720' },
          { quality: '480p', url: '/placeholder-480p.mp4', resolution: '854x480' }
        ]
      };
    } catch (error) {
      console.error('Error processing video upload:', error);
      throw new Error('Failed to process video upload');
    }
  }
}

export const videoManagementService = new VideoManagementService();
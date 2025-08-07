import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface MediaContentData {
  title: string;
  slug: string;
  description?: string;
  content?: string;
  contentType: 'podcast' | 'video' | 'blog' | 'social';
  status?: 'draft' | 'review' | 'published' | 'archived';
  authorId?: string;
  featuredImage?: string;
  mediaUrl?: string;
  duration?: number;
  fileSize?: number;
  mimeType?: string;
  transcription?: string;
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string;
  isPublic?: boolean;
  isFeatured?: boolean;
  allowComments?: boolean;
  categoryIds?: string[];
  tagIds?: string[];
}

export interface MediaCategoryData {
  name: string;
  slug: string;
  description?: string;
  parentId?: string;
  color?: string;
  icon?: string;
  isActive?: boolean;
  sortOrder?: number;
}

export interface MediaTagData {
  name: string;
  slug: string;
  description?: string;
  color?: string;
}

export interface MediaCommentData {
  contentId: string;
  authorId?: string;
  parentId?: string;
  comment: string;
  status?: 'pending' | 'approved' | 'rejected' | 'spam';
}

export interface MediaAnalyticsEvent {
  contentId: string;
  userId?: string;
  eventType: 'view' | 'like' | 'share' | 'download' | 'play' | 'pause' | 'complete';
  eventData?: any;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
  referrer?: string;
}

export class MediaManagementService {
  // Content Management
  async createMediaContent(data: MediaContentData) {
    try {
      const mediaContent = await prisma.mediaContent.create({
        data: {
          title: data.title,
          slug: data.slug,
          description: data.description,
          content: data.content,
          contentType: data.contentType,
          status: data.status || 'draft',
          authorId: data.authorId,
          featuredImage: data.featuredImage,
          mediaUrl: data.mediaUrl,
          duration: data.duration,
          fileSize: data.fileSize,
          mimeType: data.mimeType,
          transcription: data.transcription,
          seoTitle: data.seoTitle,
          seoDescription: data.seoDescription,
          seoKeywords: data.seoKeywords,
          isPublic: data.isPublic ?? true,
          isFeatured: data.isFeatured ?? false,
          allowComments: data.allowComments ?? true,
          publishedAt: data.status === 'published' ? new Date() : null,
        },
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
      });

      // Add categories if provided
      if (data.categoryIds && data.categoryIds.length > 0) {
        await Promise.all(
          data.categoryIds.map(categoryId =>
            prisma.mediaContentCategory.create({
              data: {
                contentId: mediaContent.id,
                categoryId
              }
            })
          )
        );
      }

      // Add tags if provided
      if (data.tagIds && data.tagIds.length > 0) {
        await Promise.all(
          data.tagIds.map(tagId =>
            prisma.mediaContentTag.create({
              data: {
                contentId: mediaContent.id,
                tagId
              }
            })
          )
        );
      }

      return mediaContent;
    } catch (error) {
      console.error('Error creating media content:', error);
      throw new Error('Failed to create media content');
    }
  }

  async updateMediaContent(id: string, data: Partial<MediaContentData>) {
    try {
      const updateData: any = { ...data };
      
      // Handle publish status change
      if (data.status === 'published' && !updateData.publishedAt) {
        updateData.publishedAt = new Date();
      }

      const mediaContent = await prisma.mediaContent.update({
        where: { id },
        data: updateData,
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
      });

      // Update categories if provided
      if (data.categoryIds) {
        // Remove existing categories
        await prisma.mediaContentCategory.deleteMany({
          where: { contentId: id }
        });

        // Add new categories
        if (data.categoryIds.length > 0) {
          await Promise.all(
            data.categoryIds.map(categoryId =>
              prisma.mediaContentCategory.create({
                data: {
                  contentId: id,
                  categoryId
                }
              })
            )
          );
        }
      }

      // Update tags if provided
      if (data.tagIds) {
        // Remove existing tags
        await prisma.mediaContentTag.deleteMany({
          where: { contentId: id }
        });

        // Add new tags
        if (data.tagIds.length > 0) {
          await Promise.all(
            data.tagIds.map(tagId =>
              prisma.mediaContentTag.create({
                data: {
                  contentId: id,
                  tagId
                }
              })
            )
          );
        }
      }

      return mediaContent;
    } catch (error) {
      console.error('Error updating media content:', error);
      throw new Error('Failed to update media content');
    }
  }

  async getMediaContent(id: string) {
    try {
      return await prisma.mediaContent.findUnique({
        where: { id },
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
          },
          comments: {
            where: { status: 'approved' },
            include: {
              author: true,
              replies: {
                include: {
                  author: true
                }
              }
            },
            orderBy: { createdAt: 'desc' }
          },
          podcasts: true,
          podcastEpisodes: true
        }
      });
    } catch (error) {
      console.error('Error fetching media content:', error);
      throw new Error('Failed to fetch media content');
    }
  }

  async getMediaContentBySlug(slug: string) {
    try {
      return await prisma.mediaContent.findUnique({
        where: { slug },
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
          },
          comments: {
            where: { status: 'approved' },
            include: {
              author: true,
              replies: {
                include: {
                  author: true
                }
              }
            },
            orderBy: { createdAt: 'desc' }
          }
        }
      });
    } catch (error) {
      console.error('Error fetching media content by slug:', error);
      throw new Error('Failed to fetch media content');
    }
  }

  async searchMediaContent(params: {
    query?: string;
    contentType?: string;
    categoryId?: string;
    tagId?: string;
    status?: string;
    isPublic?: boolean;
    isFeatured?: boolean;
    authorId?: string;
    limit?: number;
    offset?: number;
    sortBy?: 'createdAt' | 'publishedAt' | 'viewCount' | 'likeCount';
    sortOrder?: 'asc' | 'desc';
  }) {
    try {
      const {
        query,
        contentType,
        categoryId,
        tagId,
        status = 'published',
        isPublic = true,
        isFeatured,
        authorId,
        limit = 20,
        offset = 0,
        sortBy = 'publishedAt',
        sortOrder = 'desc'
      } = params;

      const where: any = {
        status,
        isPublic
      };

      if (query) {
        where.OR = [
          { title: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
          { content: { contains: query, mode: 'insensitive' } },
          { seoKeywords: { contains: query, mode: 'insensitive' } }
        ];
      }

      if (contentType) {
        where.contentType = contentType;
      }

      if (isFeatured !== undefined) {
        where.isFeatured = isFeatured;
      }

      if (authorId) {
        where.authorId = authorId;
      }

      if (categoryId) {
        where.categories = {
          some: {
            categoryId
          }
        };
      }

      if (tagId) {
        where.tags = {
          some: {
            tagId
          }
        };
      }

      const [content, total] = await Promise.all([
        prisma.mediaContent.findMany({
          where,
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
          },
          orderBy: { [sortBy]: sortOrder },
          take: limit,
          skip: offset
        }),
        prisma.mediaContent.count({ where })
      ]);

      return {
        content,
        total,
        hasMore: offset + limit < total
      };
    } catch (error) {
      console.error('Error searching media content:', error);
      throw new Error('Failed to search media content');
    }
  }

  async deleteMediaContent(id: string) {
    try {
      // Delete related records first
      await Promise.all([
        prisma.mediaContentCategory.deleteMany({ where: { contentId: id } }),
        prisma.mediaContentTag.deleteMany({ where: { contentId: id } }),
        prisma.mediaComment.deleteMany({ where: { contentId: id } }),
        prisma.mediaAnalytics.deleteMany({ where: { contentId: id } }),
        prisma.playlistItem.deleteMany({ where: { contentId: id } })
      ]);

      // Delete the content
      return await prisma.mediaContent.delete({
        where: { id }
      });
    } catch (error) {
      console.error('Error deleting media content:', error);
      throw new Error('Failed to delete media content');
    }
  }

  // Category Management
  async createCategory(data: MediaCategoryData) {
    try {
      return await prisma.mediaCategory.create({
        data: {
          name: data.name,
          slug: data.slug,
          description: data.description,
          parentId: data.parentId,
          color: data.color,
          icon: data.icon,
          isActive: data.isActive ?? true,
          sortOrder: data.sortOrder ?? 0
        },
        include: {
          parent: true,
          children: true
        }
      });
    } catch (error) {
      console.error('Error creating media category:', error);
      throw new Error('Failed to create media category');
    }
  }

  async getCategories(includeInactive = false) {
    try {
      const where = includeInactive ? {} : { isActive: true };
      
      return await prisma.mediaCategory.findMany({
        where,
        include: {
          parent: true,
          children: true,
          _count: {
            select: {
              mediaContent: true
            }
          }
        },
        orderBy: [
          { sortOrder: 'asc' },
          { name: 'asc' }
        ]
      });
    } catch (error) {
      console.error('Error fetching media categories:', error);
      throw new Error('Failed to fetch media categories');
    }
  }

  // Tag Management
  async createTag(data: MediaTagData) {
    try {
      return await prisma.mediaTag.create({
        data: {
          name: data.name,
          slug: data.slug,
          description: data.description,
          color: data.color
        }
      });
    } catch (error) {
      console.error('Error creating media tag:', error);
      throw new Error('Failed to create media tag');
    }
  }

  async getTags() {
    try {
      return await prisma.mediaTag.findMany({
        include: {
          _count: {
            select: {
              mediaContent: true
            }
          }
        },
        orderBy: [
          { usageCount: 'desc' },
          { name: 'asc' }
        ]
      });
    } catch (error) {
      console.error('Error fetching media tags:', error);
      throw new Error('Failed to fetch media tags');
    }
  }

  // Comment Management
  async createComment(data: MediaCommentData) {
    try {
      return await prisma.mediaComment.create({
        data: {
          contentId: data.contentId,
          authorId: data.authorId,
          parentId: data.parentId,
          comment: data.comment,
          status: data.status || 'pending'
        },
        include: {
          author: true,
          parent: true
        }
      });
    } catch (error) {
      console.error('Error creating media comment:', error);
      throw new Error('Failed to create media comment');
    }
  }

  async moderateComment(id: string, status: 'approved' | 'rejected' | 'spam') {
    try {
      return await prisma.mediaComment.update({
        where: { id },
        data: { status },
        include: {
          author: true,
          content: true
        }
      });
    } catch (error) {
      console.error('Error moderating media comment:', error);
      throw new Error('Failed to moderate media comment');
    }
  }

  // Analytics
  async trackEvent(data: MediaAnalyticsEvent) {
    try {
      // Record the analytics event
      await prisma.mediaAnalytics.create({
        data: {
          contentId: data.contentId,
          userId: data.userId,
          eventType: data.eventType,
          eventData: data.eventData ? JSON.stringify(data.eventData) : null,
          sessionId: data.sessionId,
          ipAddress: data.ipAddress,
          userAgent: data.userAgent,
          referrer: data.referrer
        }
      });

      // Update content counters based on event type
      if (data.eventType === 'view') {
        await prisma.mediaContent.update({
          where: { id: data.contentId },
          data: {
            viewCount: {
              increment: 1
            }
          }
        });
      } else if (data.eventType === 'like') {
        await prisma.mediaContent.update({
          where: { id: data.contentId },
          data: {
            likeCount: {
              increment: 1
            }
          }
        });
      } else if (data.eventType === 'share') {
        await prisma.mediaContent.update({
          where: { id: data.contentId },
          data: {
            shareCount: {
              increment: 1
            }
          }
        });
      }

      return true;
    } catch (error) {
      console.error('Error tracking media analytics event:', error);
      throw new Error('Failed to track analytics event');
    }
  }

  async getContentAnalytics(contentId: string, timeRange?: { start: Date; end: Date }) {
    try {
      const where: any = { contentId };
      
      if (timeRange) {
        where.timestamp = {
          gte: timeRange.start,
          lte: timeRange.end
        };
      }

      const [events, summary] = await Promise.all([
        prisma.mediaAnalytics.findMany({
          where,
          orderBy: { timestamp: 'desc' },
          take: 100
        }),
        prisma.mediaAnalytics.groupBy({
          by: ['eventType'],
          where,
          _count: {
            eventType: true
          }
        })
      ]);

      return {
        events,
        summary: summary.reduce((acc, item) => {
          acc[item.eventType] = item._count.eventType;
          return acc;
        }, {} as Record<string, number>)
      };
    } catch (error) {
      console.error('Error fetching content analytics:', error);
      throw new Error('Failed to fetch content analytics');
    }
  }

  // SEO Optimization
  async optimizeContentForSEO(contentId: string) {
    try {
      const content = await prisma.mediaContent.findUnique({
        where: { id: contentId },
        include: {
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
      });

      if (!content) {
        throw new Error('Content not found');
      }

      // Generate SEO title if not provided
      let seoTitle = content.seoTitle;
      if (!seoTitle) {
        seoTitle = content.title.length > 60 
          ? content.title.substring(0, 57) + '...'
          : content.title;
      }

      // Generate SEO description if not provided
      let seoDescription = content.seoDescription;
      if (!seoDescription && content.description) {
        seoDescription = content.description.length > 160
          ? content.description.substring(0, 157) + '...'
          : content.description;
      }

      // Generate SEO keywords from categories and tags
      let seoKeywords = content.seoKeywords;
      if (!seoKeywords) {
        const categoryNames = content.categories.map(c => c.category.name);
        const tagNames = content.tags.map(t => t.tag.name);
        seoKeywords = [...categoryNames, ...tagNames].join(', ');
      }

      // Update content with SEO optimizations
      return await prisma.mediaContent.update({
        where: { id: contentId },
        data: {
          seoTitle,
          seoDescription,
          seoKeywords
        }
      });
    } catch (error) {
      console.error('Error optimizing content for SEO:', error);
      throw new Error('Failed to optimize content for SEO');
    }
  }

  // Content Publishing Workflow
  async submitForReview(contentId: string) {
    try {
      return await prisma.mediaContent.update({
        where: { id: contentId },
        data: { status: 'review' }
      });
    } catch (error) {
      console.error('Error submitting content for review:', error);
      throw new Error('Failed to submit content for review');
    }
  }

  async approveContent(contentId: string) {
    try {
      return await prisma.mediaContent.update({
        where: { id: contentId },
        data: { 
          status: 'published',
          publishedAt: new Date()
        }
      });
    } catch (error) {
      console.error('Error approving content:', error);
      throw new Error('Failed to approve content');
    }
  }

  async rejectContent(contentId: string) {
    try {
      return await prisma.mediaContent.update({
        where: { id: contentId },
        data: { status: 'draft' }
      });
    } catch (error) {
      console.error('Error rejecting content:', error);
      throw new Error('Failed to reject content');
    }
  }
}

export const mediaManagementService = new MediaManagementService();
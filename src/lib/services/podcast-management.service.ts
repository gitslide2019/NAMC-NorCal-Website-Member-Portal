import { PrismaClient } from '@prisma/client';
import { mediaManagementService } from './media-management.service';

const prisma = new PrismaClient();

export interface PodcastData {
  podcastTitle: string;
  podcastDescription?: string;
  podcastCategory?: string;
  podcastLanguage?: string;
  podcastAuthor?: string;
  podcastEmail?: string;
  podcastWebsite?: string;
  podcastImage?: string;
  iTunesUrl?: string;
  spotifyUrl?: string;
  googlePodcastsUrl?: string;
  isActive?: boolean;
}

export interface PodcastEpisodeData {
  podcastId: string;
  title: string;
  description?: string;
  episodeNumber?: number;
  seasonNumber?: number;
  episodeType?: 'full' | 'trailer' | 'bonus';
  audioUrl: string;
  audioFileSize?: number;
  audioDuration?: number;
  audioFormat?: string;
  transcriptUrl?: string;
  showNotes?: string;
  chapters?: any;
  isExplicit?: boolean;
  publishDate: Date;
  authorId?: string;
  featuredImage?: string;
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string;
}

export class PodcastManagementService {
  // Podcast Management
  async createPodcast(data: PodcastData, authorId?: string) {
    try {
      // First create the media content
      const mediaContent = await mediaManagementService.createMediaContent({
        title: data.podcastTitle,
        slug: data.podcastTitle
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, ''),
        description: data.podcastDescription,
        contentType: 'podcast',
        status: 'published',
        authorId,
        featuredImage: data.podcastImage,
        isPublic: true,
        isFeatured: false,
        allowComments: true
      });

      // Create the podcast record
      const podcast = await prisma.podcast.create({
        data: {
          contentId: mediaContent.id,
          podcastTitle: data.podcastTitle,
          podcastDescription: data.podcastDescription,
          podcastCategory: data.podcastCategory,
          podcastLanguage: data.podcastLanguage || 'en',
          podcastAuthor: data.podcastAuthor,
          podcastEmail: data.podcastEmail,
          podcastWebsite: data.podcastWebsite,
          podcastImage: data.podcastImage,
          iTunesUrl: data.iTunesUrl,
          spotifyUrl: data.spotifyUrl,
          googlePodcastsUrl: data.googlePodcastsUrl,
          isActive: data.isActive ?? true
        },
        include: {
          content: {
            include: {
              author: true
            }
          },
          episodes: {
            include: {
              content: true
            },
            orderBy: {
              episodeNumber: 'desc'
            }
          }
        }
      });

      // Generate RSS URL
      const rssUrl = `/api/media/podcasts/${podcast.id}/rss`;
      await prisma.podcast.update({
        where: { id: podcast.id },
        data: { rssUrl }
      });

      return { ...podcast, rssUrl };
    } catch (error) {
      console.error('Error creating podcast:', error);
      throw new Error('Failed to create podcast');
    }
  }

  async updatePodcast(id: string, data: Partial<PodcastData>) {
    try {
      const podcast = await prisma.podcast.update({
        where: { id },
        data: {
          podcastTitle: data.podcastTitle,
          podcastDescription: data.podcastDescription,
          podcastCategory: data.podcastCategory,
          podcastLanguage: data.podcastLanguage,
          podcastAuthor: data.podcastAuthor,
          podcastEmail: data.podcastEmail,
          podcastWebsite: data.podcastWebsite,
          podcastImage: data.podcastImage,
          iTunesUrl: data.iTunesUrl,
          spotifyUrl: data.spotifyUrl,
          googlePodcastsUrl: data.googlePodcastsUrl,
          isActive: data.isActive
        },
        include: {
          content: {
            include: {
              author: true
            }
          },
          episodes: {
            include: {
              content: true
            },
            orderBy: {
              episodeNumber: 'desc'
            }
          }
        }
      });

      // Update the associated media content
      if (data.podcastTitle || data.podcastDescription || data.podcastImage) {
        await mediaManagementService.updateMediaContent(podcast.contentId, {
          title: data.podcastTitle,
          description: data.podcastDescription,
          featuredImage: data.podcastImage
        });
      }

      return podcast;
    } catch (error) {
      console.error('Error updating podcast:', error);
      throw new Error('Failed to update podcast');
    }
  }

  async getPodcast(id: string) {
    try {
      return await prisma.podcast.findUnique({
        where: { id },
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
          },
          episodes: {
            include: {
              content: {
                include: {
                  author: true
                }
              }
            },
            orderBy: {
              episodeNumber: 'desc'
            }
          }
        }
      });
    } catch (error) {
      console.error('Error fetching podcast:', error);
      throw new Error('Failed to fetch podcast');
    }
  }

  async getAllPodcasts(includeInactive = false) {
    try {
      const where = includeInactive ? {} : { isActive: true };
      
      return await prisma.podcast.findMany({
        where,
        include: {
          content: {
            include: {
              author: true
            }
          },
          episodes: {
            take: 5, // Latest 5 episodes
            include: {
              content: true
            },
            orderBy: {
              episodeNumber: 'desc'
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });
    } catch (error) {
      console.error('Error fetching podcasts:', error);
      throw new Error('Failed to fetch podcasts');
    }
  }

  // Episode Management
  async createEpisode(data: PodcastEpisodeData) {
    try {
      // Generate episode slug
      const episodeSlug = `${data.title}-episode-${data.episodeNumber || 'special'}`
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');

      // Create the media content for the episode
      const mediaContent = await mediaManagementService.createMediaContent({
        title: data.title,
        slug: episodeSlug,
        description: data.description,
        contentType: 'podcast',
        status: 'published',
        authorId: data.authorId,
        featuredImage: data.featuredImage,
        mediaUrl: data.audioUrl,
        duration: data.audioDuration,
        fileSize: data.audioFileSize,
        mimeType: data.audioFormat || 'audio/mpeg',
        transcription: data.transcriptUrl,
        seoTitle: data.seoTitle,
        seoDescription: data.seoDescription,
        seoKeywords: data.seoKeywords,
        isPublic: true,
        allowComments: true,
        publishedAt: data.publishDate
      });

      // Create the episode record
      const episode = await prisma.podcastEpisode.create({
        data: {
          podcastId: data.podcastId,
          contentId: mediaContent.id,
          episodeNumber: data.episodeNumber,
          seasonNumber: data.seasonNumber,
          episodeType: data.episodeType || 'full',
          audioUrl: data.audioUrl,
          audioFileSize: data.audioFileSize,
          audioDuration: data.audioDuration,
          audioFormat: data.audioFormat,
          transcriptUrl: data.transcriptUrl,
          showNotes: data.showNotes,
          chapters: data.chapters ? JSON.stringify(data.chapters) : null,
          isExplicit: data.isExplicit || false,
          publishDate: data.publishDate
        },
        include: {
          podcast: true,
          content: {
            include: {
              author: true
            }
          }
        }
      });

      // Update podcast statistics
      await this.updatePodcastStats(data.podcastId);

      return episode;
    } catch (error) {
      console.error('Error creating podcast episode:', error);
      throw new Error('Failed to create podcast episode');
    }
  }

  async updateEpisode(id: string, data: Partial<PodcastEpisodeData>) {
    try {
      const episode = await prisma.podcastEpisode.update({
        where: { id },
        data: {
          episodeNumber: data.episodeNumber,
          seasonNumber: data.seasonNumber,
          episodeType: data.episodeType,
          audioUrl: data.audioUrl,
          audioFileSize: data.audioFileSize,
          audioDuration: data.audioDuration,
          audioFormat: data.audioFormat,
          transcriptUrl: data.transcriptUrl,
          showNotes: data.showNotes,
          chapters: data.chapters ? JSON.stringify(data.chapters) : undefined,
          isExplicit: data.isExplicit,
          publishDate: data.publishDate
        },
        include: {
          podcast: true,
          content: {
            include: {
              author: true
            }
          }
        }
      });

      // Update the associated media content
      await mediaManagementService.updateMediaContent(episode.contentId, {
        title: data.title,
        description: data.description,
        featuredImage: data.featuredImage,
        mediaUrl: data.audioUrl,
        duration: data.audioDuration,
        fileSize: data.audioFileSize,
        mimeType: data.audioFormat,
        transcription: data.transcriptUrl,
        seoTitle: data.seoTitle,
        seoDescription: data.seoDescription,
        seoKeywords: data.seoKeywords,
        publishedAt: data.publishDate
      });

      // Update podcast statistics
      await this.updatePodcastStats(episode.podcastId);

      return episode;
    } catch (error) {
      console.error('Error updating podcast episode:', error);
      throw new Error('Failed to update podcast episode');
    }
  }

  async getEpisode(id: string) {
    try {
      return await prisma.podcastEpisode.findUnique({
        where: { id },
        include: {
          podcast: {
            include: {
              content: {
                include: {
                  author: true
                }
              }
            }
          },
          content: {
            include: {
              author: true,
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
          }
        }
      });
    } catch (error) {
      console.error('Error fetching podcast episode:', error);
      throw new Error('Failed to fetch podcast episode');
    }
  }

  async getPodcastEpisodes(podcastId: string, limit = 20, offset = 0) {
    try {
      const [episodes, total] = await Promise.all([
        prisma.podcastEpisode.findMany({
          where: { podcastId },
          include: {
            content: {
              include: {
                author: true
              }
            }
          },
          orderBy: [
            { seasonNumber: 'desc' },
            { episodeNumber: 'desc' }
          ],
          take: limit,
          skip: offset
        }),
        prisma.podcastEpisode.count({
          where: { podcastId }
        })
      ]);

      return {
        episodes,
        total,
        hasMore: offset + limit < total
      };
    } catch (error) {
      console.error('Error fetching podcast episodes:', error);
      throw new Error('Failed to fetch podcast episodes');
    }
  }

  // RSS Feed Generation
  async generateRSSFeed(podcastId: string) {
    try {
      const podcast = await this.getPodcast(podcastId);
      if (!podcast) {
        throw new Error('Podcast not found');
      }

      const episodes = await prisma.podcastEpisode.findMany({
        where: { podcastId },
        include: {
          content: {
            include: {
              author: true
            }
          }
        },
        orderBy: {
          publishDate: 'desc'
        }
      });

      const baseUrl = process.env.NEXTAUTH_URL || 'https://namc-norcal.org';
      
      const rssItems = episodes.map(episode => `
        <item>
          <title><![CDATA[${episode.content.title}]]></title>
          <description><![CDATA[${episode.content.description || ''}]]></description>
          <link>${baseUrl}/media/podcasts/${podcastId}/episodes/${episode.id}</link>
          <guid isPermaLink="true">${baseUrl}/media/podcasts/${podcastId}/episodes/${episode.id}</guid>
          <pubDate>${episode.publishDate.toUTCString()}</pubDate>
          <enclosure url="${episode.audioUrl}" length="${episode.audioFileSize || 0}" type="${episode.audioFormat || 'audio/mpeg'}" />
          <itunes:duration>${this.formatDuration(episode.audioDuration || 0)}</itunes:duration>
          <itunes:episodeType>${episode.episodeType}</itunes:episodeType>
          ${episode.episodeNumber ? `<itunes:episode>${episode.episodeNumber}</itunes:episode>` : ''}
          ${episode.seasonNumber ? `<itunes:season>${episode.seasonNumber}</itunes:season>` : ''}
          <itunes:explicit>${episode.isExplicit ? 'yes' : 'no'}</itunes:explicit>
          ${episode.content.featuredImage ? `<itunes:image href="${episode.content.featuredImage}" />` : ''}
        </item>
      `).join('');

      const rssXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title><![CDATA[${podcast.podcastTitle}]]></title>
    <description><![CDATA[${podcast.podcastDescription || ''}]]></description>
    <link>${baseUrl}/media/podcasts/${podcastId}</link>
    <language>${podcast.podcastLanguage}</language>
    <copyright>© ${new Date().getFullYear()} NAMC Northern California</copyright>
    <itunes:author>${podcast.podcastAuthor || 'NAMC Northern California'}</itunes:author>
    <itunes:summary><![CDATA[${podcast.podcastDescription || ''}]]></itunes:summary>
    <itunes:owner>
      <itunes:name>${podcast.podcastAuthor || 'NAMC Northern California'}</itunes:name>
      <itunes:email>${podcast.podcastEmail || 'info@namc-norcal.org'}</itunes:email>
    </itunes:owner>
    ${podcast.podcastImage ? `<itunes:image href="${podcast.podcastImage}" />` : ''}
    <itunes:category text="${podcast.podcastCategory || 'Business'}" />
    <itunes:explicit>no</itunes:explicit>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    ${rssItems}
  </channel>
</rss>`;

      return rssXml;
    } catch (error) {
      console.error('Error generating RSS feed:', error);
      throw new Error('Failed to generate RSS feed');
    }
  }

  // Analytics and Tracking
  async trackEpisodePlay(episodeId: string, userId?: string) {
    try {
      const episode = await prisma.podcastEpisode.findUnique({
        where: { id: episodeId }
      });

      if (!episode) {
        throw new Error('Episode not found');
      }

      // Update play count
      await prisma.podcastEpisode.update({
        where: { id: episodeId },
        data: {
          playCount: {
            increment: 1
          }
        }
      });

      // Track analytics event
      await mediaManagementService.trackEvent({
        contentId: episode.contentId,
        userId,
        eventType: 'play'
      });

      return true;
    } catch (error) {
      console.error('Error tracking episode play:', error);
      throw new Error('Failed to track episode play');
    }
  }

  async trackEpisodeDownload(episodeId: string, userId?: string) {
    try {
      const episode = await prisma.podcastEpisode.findUnique({
        where: { id: episodeId }
      });

      if (!episode) {
        throw new Error('Episode not found');
      }

      // Update download count
      await prisma.podcastEpisode.update({
        where: { id: episodeId },
        data: {
          downloadCount: {
            increment: 1
          }
        }
      });

      // Track analytics event
      await mediaManagementService.trackEvent({
        contentId: episode.contentId,
        userId,
        eventType: 'download'
      });

      return true;
    } catch (error) {
      console.error('Error tracking episode download:', error);
      throw new Error('Failed to track episode download');
    }
  }

  async getPodcastAnalytics(podcastId: string, timeRange?: { start: Date; end: Date }) {
    try {
      const podcast = await this.getPodcast(podcastId);
      if (!podcast) {
        throw new Error('Podcast not found');
      }

      // Get episode analytics
      const episodeIds = podcast.episodes.map(ep => ep.contentId);
      
      const where: any = {
        contentId: { in: episodeIds }
      };

      if (timeRange) {
        where.timestamp = {
          gte: timeRange.start,
          lte: timeRange.end
        };
      }

      const [analytics, episodeStats] = await Promise.all([
        prisma.mediaAnalytics.groupBy({
          by: ['eventType'],
          where,
          _count: {
            eventType: true
          }
        }),
        prisma.podcastEpisode.aggregate({
          where: { podcastId },
          _sum: {
            playCount: true,
            downloadCount: true
          },
          _avg: {
            averageRating: true
          }
        })
      ]);

      return {
        totalPlays: episodeStats._sum.playCount || 0,
        totalDownloads: episodeStats._sum.downloadCount || 0,
        averageRating: episodeStats._avg.averageRating || 0,
        totalEpisodes: podcast.totalEpisodes,
        totalDuration: podcast.totalDuration,
        subscriberCount: podcast.subscriberCount,
        analytics: analytics.reduce((acc, item) => {
          acc[item.eventType] = item._count.eventType;
          return acc;
        }, {} as Record<string, number>)
      };
    } catch (error) {
      console.error('Error fetching podcast analytics:', error);
      throw new Error('Failed to fetch podcast analytics');
    }
  }

  // Helper Methods
  private async updatePodcastStats(podcastId: string) {
    try {
      const stats = await prisma.podcastEpisode.aggregate({
        where: { podcastId },
        _count: { id: true },
        _sum: { audioDuration: true },
        _avg: { averageRating: true }
      });

      await prisma.podcast.update({
        where: { id: podcastId },
        data: {
          totalEpisodes: stats._count.id,
          totalDuration: stats._sum.audioDuration || 0,
          averageRating: stats._avg.averageRating
        }
      });
    } catch (error) {
      console.error('Error updating podcast stats:', error);
    }
  }

  private formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    } else {
      return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }
  }
}

export const podcastManagementService = new PodcastManagementService();
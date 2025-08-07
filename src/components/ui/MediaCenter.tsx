'use client';

import React, { useState, useEffect } from 'react';
import { Search, Filter, Play, Eye, Calendar, User, Tag, Heart, Share2, MessageCircle } from 'lucide-react';
import { Button } from './Button';
import { Input } from './Input';
import { VideoPlayer } from './VideoPlayer';
import { PodcastPlayer } from './PodcastPlayer';

interface MediaItem {
  id: string;
  title: string;
  slug: string;
  description?: string;
  contentType: 'podcast' | 'video' | 'blog' | 'social';
  status: string;
  publishedAt?: string;
  author?: {
    id: string;
    name?: string;
  };
  featuredImage?: string;
  mediaUrl?: string;
  duration?: number;
  viewCount: number;
  likeCount: number;
  shareCount: number;
  categories: Array<{
    category: {
      id: string;
      name: string;
      color?: string;
    };
  }>;
  tags: Array<{
    tag: {
      id: string;
      name: string;
      color?: string;
    };
  }>;
}

interface MediaCenterProps {
  showSearch?: boolean;
  showFilters?: boolean;
  showFeatured?: boolean;
  contentTypes?: string[];
  limit?: number;
  className?: string;
}

export function MediaCenter({
  showSearch = true,
  showFilters = true,
  showFeatured = true,
  contentTypes = ['podcast', 'video', 'blog'],
  limit = 20,
  className = ''
}: MediaCenterProps) {
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [featuredItems, setFeaturedItems] = useState<MediaItem[]>([]);
  const [categories, setCategories] = useState<Array<{ id: string; name: string; color?: string }>>([]);
  const [tags, setTags] = useState<Array<{ id: string; name: string; color?: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedContentType, setSelectedContentType] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'publishedAt' | 'viewCount' | 'likeCount'>('publishedAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [selectedItem, setSelectedItem] = useState<MediaItem | null>(null);

  useEffect(() => {
    loadMediaContent();
    loadCategories();
    loadTags();
    if (showFeatured) {
      loadFeaturedContent();
    }
  }, []);

  useEffect(() => {
    loadMediaContent();
  }, [searchQuery, selectedContentType, selectedCategory, selectedTag, sortBy, sortOrder]);

  const loadMediaContent = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: ((currentPage - 1) * limit).toString(),
        sortBy,
        sortOrder
      });

      if (searchQuery) params.append('query', searchQuery);
      if (selectedContentType !== 'all') params.append('contentType', selectedContentType);
      if (selectedCategory !== 'all') params.append('categoryId', selectedCategory);
      if (selectedTag !== 'all') params.append('tagId', selectedTag);

      const response = await fetch(`/api/media/content?${params}`);
      const data = await response.json();

      if (response.ok) {
        setMediaItems(data.content || []);
        setHasMore(data.hasMore || false);
      }
    } catch (error) {
      console.error('Error loading media content:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadFeaturedContent = async () => {
    try {
      const response = await fetch('/api/media/content?isFeatured=true&limit=5');
      const data = await response.json();

      if (response.ok) {
        setFeaturedItems(data.content || []);
      }
    } catch (error) {
      console.error('Error loading featured content:', error);
    }
  };

  const loadCategories = async () => {
    try {
      const response = await fetch('/api/media/categories');
      const data = await response.json();

      if (response.ok) {
        setCategories(data || []);
      }
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const loadTags = async () => {
    try {
      const response = await fetch('/api/media/tags');
      const data = await response.json();

      if (response.ok) {
        setTags(data || []);
      }
    } catch (error) {
      console.error('Error loading tags:', error);
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setCurrentPage(1);
  };

  const handleFilterChange = (filterType: string, value: string) => {
    switch (filterType) {
      case 'contentType':
        setSelectedContentType(value);
        break;
      case 'category':
        setSelectedCategory(value);
        break;
      case 'tag':
        setSelectedTag(value);
        break;
    }
    setCurrentPage(1);
  };

  const handleSortChange = (newSortBy: string) => {
    if (newSortBy === sortBy) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(newSortBy as any);
      setSortOrder('desc');
    }
    setCurrentPage(1);
  };

  const handleItemClick = (item: MediaItem) => {
    setSelectedItem(item);
  };

  const handleLike = async (itemId: string) => {
    try {
      // Track like event
      await fetch(`/api/media/content/${itemId}/analytics`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventType: 'like' })
      });

      // Update local state
      setMediaItems(prev => prev.map(item => 
        item.id === itemId 
          ? { ...item, likeCount: item.likeCount + 1 }
          : item
      ));
    } catch (error) {
      console.error('Error liking item:', error);
    }
  };

  const handleShare = async (item: MediaItem) => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: item.title,
          text: item.description,
          url: window.location.origin + `/media/${item.contentType}/${item.slug}`
        });
      } else {
        // Fallback: copy to clipboard
        await navigator.clipboard.writeText(
          window.location.origin + `/media/${item.contentType}/${item.slug}`
        );
        alert('Link copied to clipboard!');
      }

      // Track share event
      await fetch(`/api/media/content/${item.id}/analytics`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventType: 'share' })
      });

      // Update local state
      setMediaItems(prev => prev.map(mediaItem => 
        mediaItem.id === item.id 
          ? { ...mediaItem, shareCount: mediaItem.shareCount + 1 }
          : mediaItem
      ));
    } catch (error) {
      console.error('Error sharing item:', error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getContentTypeIcon = (contentType: string) => {
    switch (contentType) {
      case 'video':
        return <Play className="w-4 h-4" />;
      case 'podcast':
        return <Play className="w-4 h-4" />;
      case 'blog':
        return <Eye className="w-4 h-4" />;
      default:
        return <Eye className="w-4 h-4" />;
    }
  };

  const getContentTypeColor = (contentType: string) => {
    switch (contentType) {
      case 'video':
        return 'bg-red-100 text-red-800';
      case 'podcast':
        return 'bg-purple-100 text-purple-800';
      case 'blog':
        return 'bg-blue-100 text-blue-800';
      case 'social':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className={`bg-white dark:bg-gray-900 ${className}`}>
      {/* Header */}
      <div className="border-b border-gray-200 dark:border-gray-700 pb-6 mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
          Media Center
        </h1>
        
        {/* Search */}
        {showSearch && (
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              type="text"
              placeholder="Search media content..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        )}

        {/* Filters */}
        {showFilters && (
          <div className="flex flex-wrap gap-4">
            {/* Content Type Filter */}
            <select
              value={selectedContentType}
              onChange={(e) => handleFilterChange('contentType', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            >
              <option value="all">All Types</option>
              {contentTypes.map(type => (
                <option key={type} value={type}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </option>
              ))}
            </select>

            {/* Category Filter */}
            {categories.length > 0 && (
              <select
                value={selectedCategory}
                onChange={(e) => handleFilterChange('category', e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value="all">All Categories</option>
                {categories.map(category => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            )}

            {/* Tag Filter */}
            {tags.length > 0 && (
              <select
                value={selectedTag}
                onChange={(e) => handleFilterChange('tag', e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value="all">All Tags</option>
                {tags.map(tag => (
                  <option key={tag.id} value={tag.id}>
                    {tag.name}
                  </option>
                ))}
              </select>
            )}

            {/* Sort Options */}
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">Sort by:</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleSortChange('publishedAt')}
                className={sortBy === 'publishedAt' ? 'bg-yellow-100 text-yellow-800' : ''}
              >
                Date {sortBy === 'publishedAt' && (sortOrder === 'asc' ? '↑' : '↓')}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleSortChange('viewCount')}
                className={sortBy === 'viewCount' ? 'bg-yellow-100 text-yellow-800' : ''}
              >
                Views {sortBy === 'viewCount' && (sortOrder === 'asc' ? '↑' : '↓')}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleSortChange('likeCount')}
                className={sortBy === 'likeCount' ? 'bg-yellow-100 text-yellow-800' : ''}
              >
                Likes {sortBy === 'likeCount' && (sortOrder === 'asc' ? '↑' : '↓')}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Featured Content */}
      {showFeatured && featuredItems.length > 0 && (
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Featured Content
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredItems.map(item => (
              <div
                key={item.id}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden cursor-pointer hover:shadow-xl transition-shadow"
                onClick={() => handleItemClick(item)}
              >
                {item.featuredImage && (
                  <div className="relative">
                    <img
                      src={item.featuredImage}
                      alt={item.title}
                      className="w-full h-48 object-cover"
                    />
                    <div className="absolute top-2 left-2">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getContentTypeColor(item.contentType)}`}>
                        {getContentTypeIcon(item.contentType)}
                        <span className="ml-1">{item.contentType}</span>
                      </span>
                    </div>
                    {item.duration && (
                      <div className="absolute bottom-2 right-2 bg-black bg-opacity-75 text-white px-2 py-1 rounded text-xs">
                        {formatDuration(item.duration)}
                      </div>
                    )}
                  </div>
                )}
                <div className="p-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 line-clamp-2">
                    {item.title}
                  </h3>
                  {item.description && (
                    <p className="text-gray-600 dark:text-gray-400 text-sm mb-3 line-clamp-2">
                      {item.description}
                    </p>
                  )}
                  <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                    <div className="flex items-center space-x-4">
                      <span className="flex items-center">
                        <Eye className="w-3 h-3 mr-1" />
                        {item.viewCount}
                      </span>
                      <span className="flex items-center">
                        <Heart className="w-3 h-3 mr-1" />
                        {item.likeCount}
                      </span>
                    </div>
                    {item.publishedAt && (
                      <span className="flex items-center">
                        <Calendar className="w-3 h-3 mr-1" />
                        {formatDate(item.publishedAt)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Media Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {loading ? (
          // Loading skeletons
          Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden animate-pulse">
              <div className="w-full h-48 bg-gray-300 dark:bg-gray-700" />
              <div className="p-4">
                <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded mb-2" />
                <div className="h-3 bg-gray-300 dark:bg-gray-700 rounded mb-3" />
                <div className="flex justify-between">
                  <div className="h-3 bg-gray-300 dark:bg-gray-700 rounded w-16" />
                  <div className="h-3 bg-gray-300 dark:bg-gray-700 rounded w-20" />
                </div>
              </div>
            </div>
          ))
        ) : mediaItems.length > 0 ? (
          mediaItems.map(item => (
            <div
              key={item.id}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow"
            >
              {item.featuredImage && (
                <div className="relative cursor-pointer" onClick={() => handleItemClick(item)}>
                  <img
                    src={item.featuredImage}
                    alt={item.title}
                    className="w-full h-48 object-cover"
                  />
                  <div className="absolute top-2 left-2">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getContentTypeColor(item.contentType)}`}>
                      {getContentTypeIcon(item.contentType)}
                      <span className="ml-1">{item.contentType}</span>
                    </span>
                  </div>
                  {item.duration && (
                    <div className="absolute bottom-2 right-2 bg-black bg-opacity-75 text-white px-2 py-1 rounded text-xs">
                      {formatDuration(item.duration)}
                    </div>
                  )}
                </div>
              )}
              <div className="p-4">
                <h3 
                  className="text-lg font-semibold text-gray-900 dark:text-white mb-2 line-clamp-2 cursor-pointer hover:text-yellow-600"
                  onClick={() => handleItemClick(item)}
                >
                  {item.title}
                </h3>
                {item.description && (
                  <p className="text-gray-600 dark:text-gray-400 text-sm mb-3 line-clamp-2">
                    {item.description}
                  </p>
                )}
                
                {/* Tags */}
                {item.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {item.tags.slice(0, 3).map(({ tag }) => (
                      <span
                        key={tag.id}
                        className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
                      >
                        <Tag className="w-3 h-3 mr-1" />
                        {tag.name}
                      </span>
                    ))}
                    {item.tags.length > 3 && (
                      <span className="text-xs text-gray-500">+{item.tags.length - 3} more</span>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleLike(item.id)}
                      className="flex items-center space-x-1 text-gray-500 hover:text-red-500"
                    >
                      <Heart className="w-4 h-4" />
                      <span>{item.likeCount}</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleShare(item)}
                      className="flex items-center space-x-1 text-gray-500 hover:text-blue-500"
                    >
                      <Share2 className="w-4 h-4" />
                      <span>{item.shareCount}</span>
                    </Button>
                  </div>
                  
                  <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                    <Eye className="w-3 h-3 mr-1" />
                    {item.viewCount}
                  </div>
                </div>

                {/* Author and Date */}
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                  {item.author && (
                    <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                      <User className="w-3 h-3 mr-1" />
                      {item.author.name}
                    </div>
                  )}
                  {item.publishedAt && (
                    <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                      <Calendar className="w-3 h-3 mr-1" />
                      {formatDate(item.publishedAt)}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full text-center py-12">
            <p className="text-gray-500 dark:text-gray-400 text-lg">
              No media content found.
            </p>
          </div>
        )}
      </div>

      {/* Load More */}
      {hasMore && !loading && (
        <div className="text-center mt-8">
          <Button
            onClick={() => {
              setCurrentPage(prev => prev + 1);
              loadMediaContent();
            }}
            className="bg-yellow-500 hover:bg-yellow-600 text-black"
          >
            Load More
          </Button>
        </div>
      )}

      {/* Media Player Modal */}
      {selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {selectedItem.title}
                </h2>
                <Button
                  variant="ghost"
                  onClick={() => setSelectedItem(null)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </Button>
              </div>

              {selectedItem.contentType === 'video' && selectedItem.mediaUrl && (
                <VideoPlayer
                  video={{
                    id: selectedItem.id,
                    title: selectedItem.title,
                    mediaUrl: selectedItem.mediaUrl,
                    duration: selectedItem.duration,
                    featuredImage: selectedItem.featuredImage,
                    author: selectedItem.author
                  }}
                  className="mb-6"
                />
              )}

              {selectedItem.contentType === 'podcast' && selectedItem.mediaUrl && (
                <PodcastPlayer
                  episode={{
                    id: selectedItem.id,
                    title: selectedItem.title,
                    audioUrl: selectedItem.mediaUrl,
                    audioDuration: selectedItem.duration,
                    content: {
                      description: selectedItem.description,
                      featuredImage: selectedItem.featuredImage
                    },
                    podcast: {
                      podcastTitle: 'NAMC Podcast'
                    }
                  }}
                />
              )}

              {selectedItem.description && (
                <div className="mt-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    Description
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    {selectedItem.description}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
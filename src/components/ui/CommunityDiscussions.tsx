'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/badge';
import { 
  MessageSquare, 
  Heart, 
  Search, 
  Filter, 
  Plus, 
  Eye,
  Clock,
  User,
  Building,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface Discussion {
  id: string;
  title: string;
  content: string;
  category: string;
  discussionType: string;
  author: {
    id: string;
    name: string;
    email: string;
    company?: string;
    memberType: string;
  };
  viewCount: number;
  replyCount: number;
  likeCount: number;
  isLikedByUser?: boolean;
  status: string;
  isPublic: boolean;
  isPinned: boolean;
  isFeatured: boolean;
  lastActivityAt: string;
  createdAt: string;
  tags?: string[];
}

interface CommunityDiscussionsProps {
  onCreateDiscussion?: () => void;
  onViewDiscussion?: (discussionId: string) => void;
}

const CATEGORIES = [
  { value: 'ALL', label: 'All Categories' },
  { value: 'GENERAL', label: 'General' },
  { value: 'PROJECTS', label: 'Projects' },
  { value: 'TOOLS', label: 'Tools & Equipment' },
  { value: 'BUSINESS', label: 'Business' },
  { value: 'TECHNICAL', label: 'Technical' },
  { value: 'NETWORKING', label: 'Networking' },
];

const DISCUSSION_TYPES = [
  { value: 'ALL', label: 'All Types' },
  { value: 'DISCUSSION', label: 'Discussion' },
  { value: 'QUESTION', label: 'Question' },
  { value: 'ANNOUNCEMENT', label: 'Announcement' },
  { value: 'POLL', label: 'Poll' },
];

export function CommunityDiscussions({ 
  onCreateDiscussion, 
  onViewDiscussion 
}: CommunityDiscussionsProps) {
  const { data: session } = useSession();
  const [discussions, setDiscussions] = useState<Discussion[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedType, setSelectedType] = useState('ALL');
  const [sortBy, setSortBy] = useState('lastActivityAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchDiscussions();
  }, [selectedCategory, selectedType, sortBy, sortOrder, page]);

  const fetchDiscussions = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        category: selectedCategory,
        type: selectedType,
        sortBy,
        sortOrder,
        page: page.toString(),
        limit: '20',
        ...(searchTerm && { search: searchTerm }),
      });

      const response = await fetch(`/api/community/discussions?${params}`);
      if (!response.ok) throw new Error('Failed to fetch discussions');

      const data = await response.json();
      setDiscussions(data.discussions);
      setTotalPages(data.pagination.totalPages);
    } catch (error) {
      console.error('Error fetching discussions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchDiscussions();
  };

  const handleLike = async (discussionId: string, isLiked: boolean) => {
    try {
      const method = isLiked ? 'DELETE' : 'POST';
      const response = await fetch(`/api/community/discussions/${discussionId}/like`, {
        method,
      });

      if (!response.ok) throw new Error('Failed to update like');

      const data = await response.json();
      
      // Update the discussion in the list
      setDiscussions(prev => prev.map(discussion => 
        discussion.id === discussionId 
          ? { 
              ...discussion, 
              likeCount: data.likeCount,
              isLikedByUser: !isLiked 
            }
          : discussion
      ));
    } catch (error) {
      console.error('Error updating like:', error);
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`;
    return date.toLocaleDateString();
  };

  const getCategoryColor = (category: string) => {
    const colors = {
      GENERAL: 'bg-gray-100 text-gray-800',
      PROJECTS: 'bg-blue-100 text-blue-800',
      TOOLS: 'bg-green-100 text-green-800',
      BUSINESS: 'bg-purple-100 text-purple-800',
      TECHNICAL: 'bg-orange-100 text-orange-800',
      NETWORKING: 'bg-pink-100 text-pink-800',
    };
    return colors[category as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'QUESTION': return '❓';
      case 'ANNOUNCEMENT': return '📢';
      case 'POLL': return '📊';
      default: return '💬';
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <Card key={i} className="p-6">
            <div className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2 mb-4"></div>
              <div className="h-20 bg-gray-200 rounded mb-4"></div>
              <div className="flex space-x-4">
                <div className="h-3 bg-gray-200 rounded w-16"></div>
                <div className="h-3 bg-gray-200 rounded w-16"></div>
                <div className="h-3 bg-gray-200 rounded w-16"></div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Community Discussions</h2>
          <p className="text-gray-600">Connect, share, and learn with fellow NAMC members</p>
        </div>
        {onCreateDiscussion && (
          <Button onClick={onCreateDiscussion} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            New Discussion
          </Button>
        )}
      </div>

      {/* Search and Filters */}
      <Card className="p-4">
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4 mb-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                type="text"
                placeholder="Search discussions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <Button type="submit" variant="outline">
            Search
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2"
          >
            <Filter className="h-4 w-4" />
            Filters
            {showFilters ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </form>

        {showFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                {CATEGORIES.map(category => (
                  <option key={category.value} value={category.value}>
                    {category.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                {DISCUSSION_TYPES.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sort By</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="lastActivityAt">Recent Activity</option>
                <option value="createdAt">Date Created</option>
                <option value="likeCount">Most Liked</option>
                <option value="replyCount">Most Replies</option>
                <option value="viewCount">Most Viewed</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Order</label>
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="desc">Descending</option>
                <option value="asc">Ascending</option>
              </select>
            </div>
          </div>
        )}
      </Card>

      {/* Discussions List */}
      <div className="space-y-4">
        {discussions.length === 0 ? (
          <Card className="p-8 text-center">
            <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No discussions found</h3>
            <p className="text-gray-600 mb-4">
              {searchTerm ? 'Try adjusting your search terms or filters.' : 'Be the first to start a discussion!'}
            </p>
            {onCreateDiscussion && (
              <Button onClick={onCreateDiscussion}>
                Start a Discussion
              </Button>
            )}
          </Card>
        ) : (
          discussions.map((discussion) => (
            <Card key={discussion.id} className="p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">{getTypeIcon(discussion.discussionType)}</span>
                    <Badge className={getCategoryColor(discussion.category)}>
                      {discussion.category}
                    </Badge>
                    {discussion.isPinned && (
                      <Badge variant="outline" className="text-blue-600 border-blue-600">
                        📌 Pinned
                      </Badge>
                    )}
                    {discussion.isFeatured && (
                      <Badge variant="outline" className="text-purple-600 border-purple-600">
                        ⭐ Featured
                      </Badge>
                    )}
                  </div>
                  <h3 
                    className="text-lg font-semibold text-gray-900 mb-2 cursor-pointer hover:text-blue-600"
                    onClick={() => onViewDiscussion?.(discussion.id)}
                  >
                    {discussion.title}
                  </h3>
                  <p className="text-gray-600 mb-4 line-clamp-3">
                    {discussion.content}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <div className="flex items-center gap-1">
                    <User className="h-4 w-4" />
                    <span>{discussion.author.name}</span>
                    {discussion.author.company && (
                      <>
                        <Building className="h-4 w-4 ml-1" />
                        <span>{discussion.author.company}</span>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    <span>{formatTimeAgo(discussion.lastActivityAt)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1 text-sm text-gray-500">
                    <Eye className="h-4 w-4" />
                    <span>{discussion.viewCount}</span>
                  </div>
                  <div className="flex items-center gap-1 text-sm text-gray-500">
                    <MessageSquare className="h-4 w-4" />
                    <span>{discussion.replyCount}</span>
                  </div>
                  <button
                    onClick={() => handleLike(discussion.id, discussion.isLikedByUser || false)}
                    className={`flex items-center gap-1 text-sm transition-colors ${
                      discussion.isLikedByUser 
                        ? 'text-red-600 hover:text-red-700' 
                        : 'text-gray-500 hover:text-red-600'
                    }`}
                  >
                    <Heart 
                      className={`h-4 w-4 ${discussion.isLikedByUser ? 'fill-current' : ''}`} 
                    />
                    <span>{discussion.likeCount}</span>
                  </button>
                </div>
              </div>

              {discussion.tags && discussion.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t">
                  {discussion.tags.map((tag, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      #{tag}
                    </Badge>
                  ))}
                </div>
              )}
            </Card>
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            Previous
          </Button>
          <span className="flex items-center px-4 py-2 text-sm text-gray-700">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
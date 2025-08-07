'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/badge';
import { 
  Vote, 
  Clock, 
  Users, 
  MessageSquare, 
  CheckCircle,
  XCircle,
  Plus,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  BarChart3,
  Eye,
  EyeOff,
  Calendar,
  User,
  Building
} from 'lucide-react';

interface VoteOption {
  id: string;
  optionText: string;
  description?: string;
  displayOrder: number;
  voteCount: number;
  percentage: number;
}

interface CommunityVote {
  id: string;
  title: string;
  description: string;
  voteType: string;
  creator: {
    id: string;
    name: string;
    email: string;
    company?: string;
    memberType: string;
  };
  committee?: {
    id: string;
    name: string;
    category: string;
  };
  startDate: string;
  endDate: string;
  status: string;
  isAnonymous: boolean;
  requiresQuorum: boolean;
  quorumPercentage?: number;
  allowAbstain: boolean;
  allowComments: boolean;
  totalVotes: number;
  results?: any;
  winningOption?: string;
  options: VoteOption[];
  ballotCount: number;
  commentCount: number;
  userBallot?: any;
  isEligible: boolean;
  isActive: boolean;
  canVote: boolean;
  createdAt: string;
}

interface CommunityVotingProps {
  onCreateVote?: () => void;
  onViewVote?: (voteId: string) => void;
  onCastVote?: (voteId: string) => void;
}

const VOTE_TYPES = {
  SIMPLE: 'Simple (Yes/No)',
  MULTIPLE_CHOICE: 'Multiple Choice',
  RANKED: 'Ranked Choice',
  APPROVAL: 'Approval Voting',
};

const STATUS_COLORS = {
  ACTIVE: 'bg-green-100 text-green-800',
  CLOSED: 'bg-gray-100 text-gray-800',
  CANCELLED: 'bg-red-100 text-red-800',
  DRAFT: 'bg-yellow-100 text-yellow-800',
};

export function CommunityVoting({ 
  onCreateVote, 
  onViewVote,
  onCastVote 
}: CommunityVotingProps) {
  const { data: session } = useSession();
  const [votes, setVotes] = useState<CommunityVote[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('ACTIVE');
  const [myVotes, setMyVotes] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchVotes();
  }, [selectedStatus, myVotes, page]);

  const fetchVotes = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        status: selectedStatus,
        page: page.toString(),
        limit: '12',
        ...(searchTerm && { search: searchTerm }),
        ...(myVotes && { myVotes: 'true' }),
      });

      const response = await fetch(`/api/community/voting?${params}`);
      if (!response.ok) throw new Error('Failed to fetch votes');

      const data = await response.json();
      setVotes(data.votes);
      setTotalPages(data.pagination.totalPages);
    } catch (error) {
      console.error('Error fetching votes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchVotes();
  };

  const handleCastVote = async (voteId: string, optionId: string, isAbstain = false) => {
    try {
      const response = await fetch(`/api/community/voting/${voteId}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ optionId, isAbstain }),
      });

      if (!response.ok) throw new Error('Failed to cast vote');

      // Refresh votes list
      fetchVotes();
      
      if (onCastVote) {
        onCastVote(voteId);
      }
    } catch (error) {
      console.error('Error casting vote:', error);
    }
  };

  const getStatusColor = (status: string) => {
    return STATUS_COLORS[status as keyof typeof STATUS_COLORS] || 'bg-gray-100 text-gray-800';
  };

  const getVoteTypeIcon = (voteType: string) => {
    switch (voteType) {
      case 'SIMPLE': return '✓';
      case 'MULTIPLE_CHOICE': return '◉';
      case 'RANKED': return '1️⃣';
      case 'APPROVAL': return '👍';
      default: return '📊';
    }
  };

  const formatTimeRemaining = (endDate: string) => {
    const end = new Date(endDate);
    const now = new Date();
    const diffInHours = Math.floor((end.getTime() - now.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 0) return 'Ended';
    if (diffInHours < 1) return 'Less than 1 hour';
    if (diffInHours < 24) return `${diffInHours} hours remaining`;
    const days = Math.floor(diffInHours / 24);
    return `${days} day${days !== 1 ? 's' : ''} remaining`;
  };

  const getWinningOption = (vote: CommunityVote) => {
    if (!vote.results || vote.status !== 'CLOSED') return null;
    
    let maxVotes = 0;
    let winner = null;
    
    vote.options.forEach(option => {
      if (option.voteCount > maxVotes) {
        maxVotes = option.voteCount;
        winner = option;
      }
    });
    
    return winner;
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="p-6">
            <div className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2 mb-4"></div>
              <div className="h-20 bg-gray-200 rounded mb-4"></div>
              <div className="flex justify-between mb-4">
                <div className="h-3 bg-gray-200 rounded w-16"></div>
                <div className="h-3 bg-gray-200 rounded w-16"></div>
              </div>
              <div className="h-8 bg-gray-200 rounded"></div>
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
          <h2 className="text-2xl font-bold text-gray-900">Community Voting</h2>
          <p className="text-gray-600">Participate in community governance and decision-making</p>
        </div>
        {onCreateVote && (
          <Button onClick={onCreateVote} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Create Vote
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
                placeholder="Search votes..."
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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="ACTIVE">Active</option>
                <option value="CLOSED">Closed</option>
                <option value="CANCELLED">Cancelled</option>
                <option value="DRAFT">Draft</option>
              </select>
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="myVotes"
                checked={myVotes}
                onChange={(e) => setMyVotes(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="myVotes" className="ml-2 text-sm text-gray-700">
                My votes only
              </label>
            </div>
          </div>
        )}
      </Card>

      {/* Votes Grid */}
      {votes.length === 0 ? (
        <Card className="p-8 text-center">
          <Vote className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No votes found</h3>
          <p className="text-gray-600 mb-4">
            {searchTerm ? 'Try adjusting your search terms or filters.' : 'No votes are currently available.'}
          </p>
          {onCreateVote && (
            <Button onClick={onCreateVote}>
              Create First Vote
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {votes.map((vote) => {
            const winningOption = getWinningOption(vote);
            
            return (
              <Card key={vote.id} className="p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">{getVoteTypeIcon(vote.voteType)}</span>
                      <Badge className={getStatusColor(vote.status)}>
                        {vote.status}
                      </Badge>
                      {vote.isAnonymous && (
                        <Badge variant="outline" className="text-purple-600 border-purple-600">
                          <EyeOff className="h-3 w-3 mr-1" />
                          Anonymous
                        </Badge>
                      )}
                      {vote.requiresQuorum && (
                        <Badge variant="outline" className="text-orange-600 border-orange-600">
                          Quorum Required
                        </Badge>
                      )}
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {vote.title}
                    </h3>
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                      {vote.description}
                    </p>
                  </div>
                </div>

                {/* Creator Info */}
                <div className="flex items-center gap-2 mb-4 p-3 bg-blue-50 rounded-lg">
                  <User className="h-4 w-4 text-blue-600" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-blue-900">
                      {vote.creator.name}
                    </p>
                    <p className="text-xs text-blue-700 truncate">
                      {vote.creator.company}
                    </p>
                  </div>
                </div>

                {/* Committee Info */}
                {vote.committee && (
                  <div className="flex items-center gap-2 mb-4 p-2 bg-purple-50 rounded-lg">
                    <Building className="h-4 w-4 text-purple-600" />
                    <span className="text-sm text-purple-900">{vote.committee.name}</span>
                  </div>
                )}

                {/* Vote Stats */}
                <div className="grid grid-cols-2 gap-4 mb-4 text-center">
                  <div>
                    <div className="flex items-center justify-center gap-1 text-sm text-gray-500">
                      <Users className="h-4 w-4" />
                      <span>{vote.totalVotes}</span>
                    </div>
                    <p className="text-xs text-gray-400">Votes</p>
                  </div>
                  <div>
                    <div className="flex items-center justify-center gap-1 text-sm text-gray-500">
                      <MessageSquare className="h-4 w-4" />
                      <span>{vote.commentCount}</span>
                    </div>
                    <p className="text-xs text-gray-400">Comments</p>
                  </div>
                </div>

                {/* Time Info */}
                <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="h-4 w-4 text-gray-600" />
                    <span className="text-sm font-medium text-gray-900">
                      {formatTimeRemaining(vote.endDate)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600">
                    Ends: {new Date(vote.endDate).toLocaleDateString()}
                  </p>
                </div>

                {/* Results Preview for Closed Votes */}
                {vote.status === 'CLOSED' && winningOption && (
                  <div className="mb-4 p-3 bg-green-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium text-green-900">Winner</span>
                    </div>
                    <p className="text-sm text-green-800">
                      {winningOption.optionText} ({winningOption.percentage}%)
                    </p>
                  </div>
                )}

                {/* User Vote Status */}
                {vote.userBallot && (
                  <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-900">
                        You voted: {vote.userBallot.isAbstain ? 'Abstain' : vote.userBallot.option?.optionText}
                      </span>
                    </div>
                  </div>
                )}

                {/* Voting Options for Active Votes */}
                {vote.canVote && vote.status === 'ACTIVE' && (
                  <div className="mb-4 space-y-2">
                    <p className="text-sm font-medium text-gray-900">Quick Vote:</p>
                    <div className="grid grid-cols-1 gap-2">
                      {vote.options.slice(0, 2).map((option) => (
                        <Button
                          key={option.id}
                          variant="outline"
                          size="sm"
                          onClick={() => handleCastVote(vote.id, option.id)}
                          className="text-left justify-start"
                        >
                          {option.optionText}
                        </Button>
                      ))}
                      {vote.allowAbstain && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCastVote(vote.id, '', true)}
                          className="text-gray-600"
                        >
                          Abstain
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onViewVote?.(vote.id)}
                    className="flex-1"
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    View Details
                  </Button>
                  
                  {vote.status === 'CLOSED' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.location.href = `/member/community/voting/${vote.id}/results`}
                      className="flex items-center gap-1"
                    >
                      <BarChart3 className="h-3 w-3" />
                      Results
                    </Button>
                  )}
                </div>

                {/* Eligibility Warning */}
                {!vote.isEligible && (
                  <div className="mt-4 p-2 bg-yellow-50 rounded-lg">
                    <p className="text-xs text-yellow-700">
                      You are not eligible to vote on this item
                    </p>
                  </div>
                )}

                {/* Created Date */}
                <div className="mt-4 pt-4 border-t text-xs text-gray-500 text-center">
                  Created {new Date(vote.createdAt).toLocaleDateString()}
                </div>
              </Card>
            );
          })}
        </div>
      )}

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
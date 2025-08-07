'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  Calendar, 
  FolderOpen, 
  Settings, 
  Plus, 
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  Crown,
  UserCheck,
  Clock,
  MapPin,
  Star
} from 'lucide-react';

interface Committee {
  id: string;
  name: string;
  description?: string;
  category: string;
  chair: {
    id: string;
    name: string;
    email: string;
    company?: string;
    memberType: string;
  };
  memberCount: number;
  meetingCount: number;
  projectCount: number;
  status: string;
  isPublic: boolean;
  meetingFrequency?: string;
  nextMeeting?: string;
  maxMembers?: number;
  requiresApproval: boolean;
  userMembership?: {
    role: string;
    status: string;
    canPost: boolean;
    canInvite: boolean;
    canModerate: boolean;
  };
  isChair: boolean;
  createdAt: string;
}

interface CommitteeManagementProps {
  onCreateCommittee?: () => void;
  onViewCommittee?: (committeeId: string) => void;
  onJoinCommittee?: (committeeId: string) => void;
}

const CATEGORIES = [
  { value: 'ALL', label: 'All Categories' },
  { value: 'PROJECTS', label: 'Projects' },
  { value: 'BUSINESS', label: 'Business' },
  { value: 'TECHNICAL', label: 'Technical' },
  { value: 'SOCIAL', label: 'Social' },
  { value: 'GOVERNANCE', label: 'Governance' },
];

const MEETING_FREQUENCIES = {
  WEEKLY: 'Weekly',
  MONTHLY: 'Monthly',
  QUARTERLY: 'Quarterly',
  AS_NEEDED: 'As Needed',
};

export function CommitteeManagement({ 
  onCreateCommittee, 
  onViewCommittee,
  onJoinCommittee 
}: CommitteeManagementProps) {
  const { data: session } = useSession();
  const [committees, setCommittees] = useState<Committee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [myCommittees, setMyCommittees] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchCommittees();
  }, [selectedCategory, myCommittees, page]);

  const fetchCommittees = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        category: selectedCategory,
        page: page.toString(),
        limit: '12',
        ...(searchTerm && { search: searchTerm }),
        ...(myCommittees && { myCommittees: 'true' }),
      });

      const response = await fetch(`/api/community/committees?${params}`);
      if (!response.ok) throw new Error('Failed to fetch committees');

      const data = await response.json();
      setCommittees(data.committees);
      setTotalPages(data.pagination.totalPages);
    } catch (error) {
      console.error('Error fetching committees:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchCommittees();
  };

  const handleJoinCommittee = async (committeeId: string) => {
    try {
      const response = await fetch(`/api/community/committees/${committeeId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId: session?.user?.id }),
      });

      if (!response.ok) throw new Error('Failed to join committee');

      // Refresh committees list
      fetchCommittees();
      
      if (onJoinCommittee) {
        onJoinCommittee(committeeId);
      }
    } catch (error) {
      console.error('Error joining committee:', error);
    }
  };

  const getCategoryColor = (category: string) => {
    const colors = {
      PROJECTS: 'bg-blue-100 text-blue-800',
      BUSINESS: 'bg-green-100 text-green-800',
      TECHNICAL: 'bg-purple-100 text-purple-800',
      SOCIAL: 'bg-pink-100 text-pink-800',
      GOVERNANCE: 'bg-orange-100 text-orange-800',
    };
    return colors[category as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getRoleColor = (role: string) => {
    const colors = {
      CHAIR: 'bg-yellow-100 text-yellow-800',
      MODERATOR: 'bg-purple-100 text-purple-800',
      SECRETARY: 'bg-blue-100 text-blue-800',
      TREASURER: 'bg-green-100 text-green-800',
      MEMBER: 'bg-gray-100 text-gray-800',
    };
    return colors[role as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const formatNextMeeting = (dateString?: string) => {
    if (!dateString) return 'No upcoming meetings';
    const date = new Date(dateString);
    const now = new Date();
    const diffInDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) return 'Today';
    if (diffInDays === 1) return 'Tomorrow';
    if (diffInDays < 7) return `In ${diffInDays} days`;
    return date.toLocaleDateString();
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
          <h2 className="text-2xl font-bold text-gray-900">Committees</h2>
          <p className="text-gray-600">Join committees to collaborate on projects and initiatives</p>
        </div>
        {onCreateCommittee && (
          <Button onClick={onCreateCommittee} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Create Committee
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
                placeholder="Search committees..."
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
            <div className="flex items-center">
              <input
                type="checkbox"
                id="myCommittees"
                checked={myCommittees}
                onChange={(e) => setMyCommittees(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="myCommittees" className="ml-2 text-sm text-gray-700">
                My committees only
              </label>
            </div>
          </div>
        )}
      </Card>

      {/* Committees Grid */}
      {committees.length === 0 ? (
        <Card className="p-8 text-center">
          <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No committees found</h3>
          <p className="text-gray-600 mb-4">
            {searchTerm ? 'Try adjusting your search terms or filters.' : 'No committees are currently available.'}
          </p>
          {onCreateCommittee && (
            <Button onClick={onCreateCommittee}>
              Create First Committee
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {committees.map((committee) => (
            <Card key={committee.id} className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className={getCategoryColor(committee.category)}>
                      {committee.category}
                    </Badge>
                    {!committee.isPublic && (
                      <Badge variant="outline" className="text-orange-600 border-orange-600">
                        Private
                      </Badge>
                    )}
                    {committee.requiresApproval && (
                      <Badge variant="outline" className="text-purple-600 border-purple-600">
                        Approval Required
                      </Badge>
                    )}
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {committee.name}
                  </h3>
                  {committee.description && (
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                      {committee.description}
                    </p>
                  )}
                </div>
              </div>

              {/* Chair Info */}
              <div className="flex items-center gap-2 mb-4 p-3 bg-yellow-50 rounded-lg">
                <Crown className="h-4 w-4 text-yellow-600" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-yellow-900">
                    {committee.chair.name}
                  </p>
                  <p className="text-xs text-yellow-700 truncate">
                    Chair • {committee.chair.company}
                  </p>
                </div>
              </div>

              {/* Committee Stats */}
              <div className="grid grid-cols-3 gap-4 mb-4 text-center">
                <div>
                  <div className="flex items-center justify-center gap-1 text-sm text-gray-500">
                    <Users className="h-4 w-4" />
                    <span>{committee.memberCount}</span>
                  </div>
                  <p className="text-xs text-gray-400">Members</p>
                </div>
                <div>
                  <div className="flex items-center justify-center gap-1 text-sm text-gray-500">
                    <Calendar className="h-4 w-4" />
                    <span>{committee.meetingCount}</span>
                  </div>
                  <p className="text-xs text-gray-400">Meetings</p>
                </div>
                <div>
                  <div className="flex items-center justify-center gap-1 text-sm text-gray-500">
                    <FolderOpen className="h-4 w-4" />
                    <span>{committee.projectCount}</span>
                  </div>
                  <p className="text-xs text-gray-400">Projects</p>
                </div>
              </div>

              {/* Meeting Info */}
              {committee.meetingFrequency && (
                <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-900">
                      {MEETING_FREQUENCIES[committee.meetingFrequency as keyof typeof MEETING_FREQUENCIES]}
                    </span>
                  </div>
                  <p className="text-xs text-blue-700">
                    Next: {formatNextMeeting(committee.nextMeeting)}
                  </p>
                </div>
              )}

              {/* User Membership Status */}
              {committee.userMembership && (
                <div className="mb-4">
                  <Badge className={getRoleColor(committee.userMembership.role)}>
                    {committee.userMembership.role}
                  </Badge>
                  {committee.userMembership.status === 'PENDING' && (
                    <Badge variant="outline" className="ml-2 text-orange-600 border-orange-600">
                      Pending Approval
                    </Badge>
                  )}
                </div>
              )}

              {/* Max Members Warning */}
              {committee.maxMembers && committee.memberCount >= committee.maxMembers && (
                <div className="mb-4 p-2 bg-red-50 rounded-lg">
                  <p className="text-xs text-red-700">
                    Committee is full ({committee.memberCount}/{committee.maxMembers} members)
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onViewCommittee?.(committee.id)}
                  className="flex-1"
                >
                  View Details
                </Button>
                
                {!committee.userMembership && (
                  <Button
                    size="sm"
                    onClick={() => handleJoinCommittee(committee.id)}
                    disabled={committee.maxMembers ? committee.memberCount >= committee.maxMembers : false}
                    className="flex items-center gap-1"
                  >
                    <UserCheck className="h-3 w-3" />
                    Join
                  </Button>
                )}
                
                {committee.isChair && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.location.href = `/member/community/committees/${committee.id}/manage`}
                    className="flex items-center gap-1"
                  >
                    <Settings className="h-3 w-3" />
                  </Button>
                )}
              </div>

              {/* Created Date */}
              <div className="mt-4 pt-4 border-t text-xs text-gray-500 text-center">
                Created {new Date(committee.createdAt).toLocaleDateString()}
              </div>
            </Card>
          ))}
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
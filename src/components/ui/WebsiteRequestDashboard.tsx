'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/badge';
import { Alert } from '@/components/ui/alert';
import { 
  Globe, 
  Mail, 
  Building, 
  Calendar, 
  User, 
  CheckCircle, 
  XCircle,
  Clock,
  AlertCircle,
  ExternalLink,
  Eye,
  Edit,
  Trash2,
  Filter,
  Search,
  MoreVertical
} from 'lucide-react';

interface WebsiteRequest {
  id: string;
  businessName: string;
  businessType: string;
  businessFocus?: string;
  domainPreference?: string;
  professionalEmail?: string;
  status: string;
  priority: string;
  requestedAt: string;
  reviewedAt?: string;
  approvedAt?: string;
  estimatedCompletion?: string;
  completedAt?: string;
  member: {
    id: string;
    name?: string;
    email: string;
    company?: string;
    memberType: string;
  };
  assignedAdmin?: {
    id: string;
    name?: string;
    email: string;
  };
  website?: {
    id: string;
    websiteUrl: string;
    domainName: string;
    status: string;
    monthlyVisitors: number;
    leadsGenerated: number;
  };
}

interface WebsiteRequestDashboardProps {
  isAdmin?: boolean;
  memberId?: string;
  onWebsiteSelect?: (website: any) => void;
}

const statusColors = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  UNDER_REVIEW: 'bg-blue-100 text-blue-800',
  APPROVED: 'bg-green-100 text-green-800',
  IN_PROGRESS: 'bg-purple-100 text-purple-800',
  COMPLETED: 'bg-emerald-100 text-emerald-800',
  REJECTED: 'bg-red-100 text-red-800'
};

const priorityColors = {
  LOW: 'bg-gray-100 text-gray-800',
  NORMAL: 'bg-blue-100 text-blue-800',
  HIGH: 'bg-orange-100 text-orange-800',
  URGENT: 'bg-red-100 text-red-800'
};

export function WebsiteRequestDashboard({ isAdmin = false, memberId, onWebsiteSelect }: WebsiteRequestDashboardProps) {
  const [requests, setRequests] = useState<WebsiteRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<WebsiteRequest | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchRequests();
  }, [filterStatus]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filterStatus !== 'all') {
        params.append('status', filterStatus);
      }

      const response = await fetch(`/api/websites/requests?${params}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch requests');
      }

      setRequests(result.requests);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (requestId: string, action: string, data?: any) => {
    try {
      setActionLoading(requestId);
      const response = await fetch(`/api/websites/requests/${requestId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action, ...data }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Action failed');
      }

      // Refresh requests
      await fetchRequests();
      
      // Close details if showing the updated request
      if (selectedRequest?.id === requestId) {
        setSelectedRequest(result.request);
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setActionLoading(null);
    }
  };

  const handleGenerateWebsite = async (requestId: string) => {
    try {
      setActionLoading(requestId);
      const response = await fetch('/api/websites/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          requestId,
          templateId: 'professional-contractor-v1' // Default template
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Website generation failed');
      }

      // Refresh requests to show completed status
      await fetchRequests();
      
      // Show success message
      setError(null);
      alert(`Website generated successfully! URL: ${result.website.websiteUrl}`);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Website generation failed');
    } finally {
      setActionLoading(null);
    }
  };

  const filteredRequests = requests.filter(request => {
    const matchesSearch = searchTerm === '' || 
      request.businessName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.member.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.member.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Clock className="h-4 w-4" />;
      case 'UNDER_REVIEW':
        return <Eye className="h-4 w-4" />;
      case 'APPROVED':
      case 'COMPLETED':
        return <CheckCircle className="h-4 w-4" />;
      case 'REJECTED':
        return <XCircle className="h-4 w-4" />;
      case 'IN_PROGRESS':
        return <Edit className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            {isAdmin ? 'Website Requests' : 'My Website Requests'}
          </h2>
          <p className="text-gray-600">
            {isAdmin ? 'Manage member website generation requests' : 'Track your professional website requests'}
          </p>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <div className="text-red-800">{error}</div>
        </Alert>
      )}

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by business name, member name, or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
            />
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Filter className="h-4 w-4 text-gray-500" />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
          >
            <option value="all">All Status</option>
            <option value="PENDING">Pending</option>
            <option value="UNDER_REVIEW">Under Review</option>
            <option value="APPROVED">Approved</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="COMPLETED">Completed</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>
      </div>

      {/* Requests Grid */}
      <div className="grid gap-6">
        {filteredRequests.length === 0 ? (
          <Card className="p-8 text-center">
            <Globe className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No website requests found</h3>
            <p className="text-gray-600">
              {searchTerm || filterStatus !== 'all' 
                ? 'Try adjusting your search or filters'
                : isAdmin 
                  ? 'No members have requested websites yet'
                  : 'You haven\'t requested a professional website yet'
              }
            </p>
          </Card>
        ) : (
          filteredRequests.map((request) => (
            <Card key={request.id} className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-3">
                    <Building className="h-5 w-5 text-gray-500" />
                    <h3 className="text-lg font-semibold text-gray-900">
                      {request.businessName}
                    </h3>
                    <Badge className={statusColors[request.status as keyof typeof statusColors]}>
                      {getStatusIcon(request.status)}
                      <span className="ml-1">{request.status.replace('_', ' ')}</span>
                    </Badge>
                    <Badge className={priorityColors[request.priority as keyof typeof priorityColors]}>
                      {request.priority}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <User className="h-4 w-4" />
                      <span>{request.member.name || request.member.email}</span>
                    </div>
                    
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <Building className="h-4 w-4" />
                      <span>{request.businessType}</span>
                    </div>

                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <Calendar className="h-4 w-4" />
                      <span>Requested {formatDate(request.requestedAt)}</span>
                    </div>

                    {request.domainPreference && (
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <Globe className="h-4 w-4" />
                        <span>{request.domainPreference}</span>
                      </div>
                    )}

                    {request.professionalEmail && (
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <Mail className="h-4 w-4" />
                        <span>{request.professionalEmail}</span>
                      </div>
                    )}

                    {request.assignedAdmin && (
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <User className="h-4 w-4" />
                        <span>Assigned to {request.assignedAdmin.name || request.assignedAdmin.email}</span>
                      </div>
                    )}
                  </div>

                  {request.businessFocus && (
                    <p className="text-sm text-gray-600 mb-4">
                      <strong>Focus:</strong> {request.businessFocus}
                    </p>
                  )}

                  {request.website && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-green-900">Website Live</h4>
                          <p className="text-sm text-green-700">{request.website.websiteUrl}</p>
                          <div className="flex items-center space-x-4 mt-2 text-xs text-green-600">
                            <span>{request.website.monthlyVisitors} monthly visitors</span>
                            <span>{request.website.leadsGenerated} leads generated</span>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(request.website!.websiteUrl, '_blank')}
                          >
                            <ExternalLink className="h-4 w-4 mr-1" />
                            Visit
                          </Button>
                          {onWebsiteSelect && (
                            <Button
                              size="sm"
                              onClick={() => onWebsiteSelect(request.website)}
                              className="bg-blue-600 hover:bg-blue-700 text-white"
                            >
                              <Edit className="h-4 w-4 mr-1" />
                              Manage
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center space-x-2 ml-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedRequest(request);
                      setShowDetails(true);
                    }}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    View
                  </Button>

                  {isAdmin && request.status === 'PENDING' && (
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        onClick={() => handleAction(request.id, 'approve')}
                        disabled={actionLoading === request.id}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Approve
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleAction(request.id, 'reject', { 
                          rejectionReason: 'Request needs more information' 
                        })}
                        disabled={actionLoading === request.id}
                        className="border-red-300 text-red-700 hover:bg-red-50"
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Reject
                      </Button>
                    </div>
                  )}

                  {isAdmin && request.status === 'UNDER_REVIEW' && (
                    <Button
                      size="sm"
                      onClick={() => handleAction(request.id, 'assign')}
                      disabled={actionLoading === request.id}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      Assign to Me
                    </Button>
                  )}

                  {isAdmin && request.status === 'APPROVED' && (
                    <Button
                      size="sm"
                      onClick={() => handleGenerateWebsite(request.id)}
                      disabled={actionLoading === request.id}
                      className="bg-purple-600 hover:bg-purple-700 text-white"
                    >
                      <Globe className="h-4 w-4 mr-1" />
                      Generate Website
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Request Details Modal */}
      {showDetails && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-gray-900">
                  Website Request Details
                </h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDetails(false)}
                >
                  Close
                </Button>
              </div>

              <div className="space-y-6">
                {/* Business Information */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Business Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-gray-700">Business Name:</span>
                      <p className="text-gray-900">{selectedRequest.businessName}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Business Type:</span>
                      <p className="text-gray-900">{selectedRequest.businessType}</p>
                    </div>
                    {selectedRequest.businessFocus && (
                      <div className="md:col-span-2">
                        <span className="font-medium text-gray-700">Business Focus:</span>
                        <p className="text-gray-900">{selectedRequest.businessFocus}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Member Information */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Member Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-gray-700">Name:</span>
                      <p className="text-gray-900">{selectedRequest.member.name || 'Not provided'}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Email:</span>
                      <p className="text-gray-900">{selectedRequest.member.email}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Member Type:</span>
                      <p className="text-gray-900">{selectedRequest.member.memberType}</p>
                    </div>
                    {selectedRequest.member.company && (
                      <div>
                        <span className="font-medium text-gray-700">Company:</span>
                        <p className="text-gray-900">{selectedRequest.member.company}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Request Timeline */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Request Timeline</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-700">Requested:</span>
                      <span className="text-gray-900">{formatDate(selectedRequest.requestedAt)}</span>
                    </div>
                    {selectedRequest.reviewedAt && (
                      <div className="flex justify-between">
                        <span className="text-gray-700">Reviewed:</span>
                        <span className="text-gray-900">{formatDate(selectedRequest.reviewedAt)}</span>
                      </div>
                    )}
                    {selectedRequest.approvedAt && (
                      <div className="flex justify-between">
                        <span className="text-gray-700">Approved:</span>
                        <span className="text-gray-900">{formatDate(selectedRequest.approvedAt)}</span>
                      </div>
                    )}
                    {selectedRequest.estimatedCompletion && (
                      <div className="flex justify-between">
                        <span className="text-gray-700">Estimated Completion:</span>
                        <span className="text-gray-900">{formatDate(selectedRequest.estimatedCompletion)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
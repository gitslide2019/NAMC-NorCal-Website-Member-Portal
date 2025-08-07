'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Users, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Settings,
  BarChart3,
  Calendar,
  Activity,
  Eye,
  UserCheck,
  UserX,
  Filter
} from 'lucide-react';

interface AccessRequest {
  id: string;
  memberId: string;
  memberName: string;
  memberEmail: string;
  accessLevel: 'basic' | 'standard' | 'advanced';
  durationDays: number;
  requestDate: Date;
  status: 'pending' | 'approved' | 'denied';
  justification?: string;
  approvedBy?: string;
  approvedDate?: Date;
  deniedReason?: string;
}

interface ArcGISAccessAdminProps {
  className?: string;
}

export const ArcGISAccessAdmin: React.FC<ArcGISAccessAdminProps> = ({
  className = ''
}) => {
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending');
  const [selectedRequest, setSelectedRequest] = useState<AccessRequest | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [stats, setStats] = useState({
    totalRequests: 0,
    pendingRequests: 0,
    approvedRequests: 0,
    deniedRequests: 0,
    activeUsers: 0
  });

  useEffect(() => {
    loadRequests();
    loadStats();
  }, []);

  const loadRequests = async () => {
    try {
      const response = await fetch('/api/arcgis/access-requests?admin=true');
      const data = await response.json();
      
      if (data.success) {
        const requestsWithDates = data.data.requests.map((req: any) => ({
          ...req,
          requestDate: new Date(req.requestDate),
          approvedDate: req.approvedDate ? new Date(req.approvedDate) : undefined
        }));
        setRequests(requestsWithDates);
      }
    } catch (error) {
      console.error('Error loading requests:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadStats = async () => {
    // Mock stats - replace with actual API call
    setStats({
      totalRequests: 45,
      pendingRequests: 8,
      approvedRequests: 32,
      deniedRequests: 5,
      activeUsers: 28
    });
  };

  const handleRequestAction = async (requestId: string, action: 'approve' | 'deny', reason?: string) => {
    setIsProcessing(true);
    try {
      const response = await fetch('/api/arcgis/access-requests', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requestId,
          action,
          reason
        })
      });

      const data = await response.json();
      
      if (data.success) {
        await loadRequests();
        await loadStats();
        setSelectedRequest(null);
      } else {
        throw new Error(data.error || 'Failed to process request');
      }
    } catch (error) {
      console.error('Error processing request:', error);
      alert('Failed to process request. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'denied': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getAccessLevelColor = (level: string) => {
    switch (level) {
      case 'basic': return 'bg-blue-100 text-blue-800';
      case 'standard': return 'bg-green-100 text-green-800';
      case 'advanced': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredRequests = requests.filter(req => {
    if (activeTab === 'all') return true;
    return req.status === activeTab;
  });

  if (isLoading) {
    return (
      <div className={`space-y-4 ${className}`}>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-center space-x-2">
              <Activity className="h-5 w-5 animate-pulse" />
              <span>Loading access requests...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center">
            <Settings className="h-6 w-6 mr-2" />
            ArcGIS Access Administration
          </h2>
          <p className="text-gray-600 mt-1">
            Manage member ArcGIS access requests and permissions
          </p>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Requests</p>
                <p className="text-2xl font-bold">{stats.totalRequests}</p>
              </div>
              <div className="p-3 rounded-full bg-blue-50 text-blue-600">
                <BarChart3 className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.pendingRequests}</p>
              </div>
              <div className="p-3 rounded-full bg-yellow-50 text-yellow-600">
                <Clock className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Approved</p>
                <p className="text-2xl font-bold text-green-600">{stats.approvedRequests}</p>
              </div>
              <div className="p-3 rounded-full bg-green-50 text-green-600">
                <CheckCircle className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Denied</p>
                <p className="text-2xl font-bold text-red-600">{stats.deniedRequests}</p>
              </div>
              <div className="p-3 rounded-full bg-red-50 text-red-600">
                <XCircle className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Users</p>
                <p className="text-2xl font-bold text-purple-600">{stats.activeUsers}</p>
              </div>
              <div className="p-3 rounded-full bg-purple-50 text-purple-600">
                <Users className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Requests Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="h-5 w-5 mr-2" />
            Access Requests
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="pending">Pending ({stats.pendingRequests})</TabsTrigger>
              <TabsTrigger value="approved">Approved</TabsTrigger>
              <TabsTrigger value="denied">Denied</TabsTrigger>
              <TabsTrigger value="all">All Requests</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="space-y-4 mt-6">
              {filteredRequests.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No {activeTab === 'all' ? '' : activeTab} requests found</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredRequests.map((request) => (
                    <div key={request.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div>
                            <h3 className="font-medium">{request.memberName}</h3>
                            <p className="text-sm text-gray-600">{request.memberEmail}</p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge className={getAccessLevelColor(request.accessLevel)}>
                              {request.accessLevel.charAt(0).toUpperCase() + request.accessLevel.slice(1)}
                            </Badge>
                            <Badge variant="outline">
                              {request.durationDays} days
                            </Badge>
                            <Badge className={getStatusColor(request.status)}>
                              {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                            </Badge>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedRequest(request)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                          
                          {request.status === 'pending' && (
                            <>
                              <Button
                                size="sm"
                                onClick={() => handleRequestAction(request.id, 'approve')}
                                disabled={isProcessing}
                              >
                                <UserCheck className="h-4 w-4 mr-1" />
                                Approve
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => {
                                  const reason = prompt('Reason for denial (optional):');
                                  if (reason !== null) {
                                    handleRequestAction(request.id, 'deny', reason);
                                  }
                                }}
                                disabled={isProcessing}
                              >
                                <UserX className="h-4 w-4 mr-1" />
                                Deny
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                      
                      <div className="mt-3 text-sm text-gray-600">
                        <div className="flex items-center space-x-4">
                          <span className="flex items-center">
                            <Calendar className="h-4 w-4 mr-1" />
                            Requested: {request.requestDate.toLocaleDateString()}
                          </span>
                          {request.approvedDate && (
                            <span className="flex items-center">
                              <CheckCircle className="h-4 w-4 mr-1 text-green-600" />
                              Approved: {request.approvedDate.toLocaleDateString()}
                            </span>
                          )}
                        </div>
                        
                        {request.justification && (
                          <div className="mt-2 p-2 bg-gray-50 rounded text-sm">
                            <strong>Justification:</strong> {request.justification}
                          </div>
                        )}
                        
                        {request.deniedReason && (
                          <div className="mt-2 p-2 bg-red-50 rounded text-sm">
                            <strong>Denial Reason:</strong> {request.deniedReason}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Request Details Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Access Request Details</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedRequest(null)}
                >
                  Close
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Member Name</label>
                  <p className="font-medium">{selectedRequest.memberName}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Email</label>
                  <p className="font-medium">{selectedRequest.memberEmail}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Access Level</label>
                  <Badge className={getAccessLevelColor(selectedRequest.accessLevel)}>
                    {selectedRequest.accessLevel.charAt(0).toUpperCase() + selectedRequest.accessLevel.slice(1)}
                  </Badge>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Duration</label>
                  <p className="font-medium">{selectedRequest.durationDays} days</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Status</label>
                  <Badge className={getStatusColor(selectedRequest.status)}>
                    {selectedRequest.status.charAt(0).toUpperCase() + selectedRequest.status.slice(1)}
                  </Badge>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Request Date</label>
                  <p className="font-medium">{selectedRequest.requestDate.toLocaleDateString()}</p>
                </div>
              </div>

              {selectedRequest.justification && (
                <div>
                  <label className="text-sm font-medium text-gray-600">Justification</label>
                  <div className="mt-1 p-3 bg-gray-50 rounded">
                    {selectedRequest.justification}
                  </div>
                </div>
              )}

              {selectedRequest.status === 'approved' && selectedRequest.approvedBy && (
                <div className="p-3 bg-green-50 rounded">
                  <p className="text-sm">
                    <strong>Approved by:</strong> {selectedRequest.approvedBy}
                  </p>
                  {selectedRequest.approvedDate && (
                    <p className="text-sm">
                      <strong>Approved on:</strong> {selectedRequest.approvedDate.toLocaleDateString()}
                    </p>
                  )}
                </div>
              )}

              {selectedRequest.status === 'denied' && selectedRequest.deniedReason && (
                <div className="p-3 bg-red-50 rounded">
                  <p className="text-sm">
                    <strong>Denial Reason:</strong> {selectedRequest.deniedReason}
                  </p>
                </div>
              )}

              {selectedRequest.status === 'pending' && (
                <div className="flex space-x-3 pt-4">
                  <Button
                    onClick={() => handleRequestAction(selectedRequest.id, 'approve')}
                    disabled={isProcessing}
                    className="flex-1"
                  >
                    <UserCheck className="h-4 w-4 mr-2" />
                    Approve Request
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => {
                      const reason = prompt('Reason for denial (optional):');
                      if (reason !== null) {
                        handleRequestAction(selectedRequest.id, 'deny', reason);
                      }
                    }}
                    disabled={isProcessing}
                    className="flex-1"
                  >
                    <UserX className="h-4 w-4 mr-2" />
                    Deny Request
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Alerts */}
      {stats.pendingRequests > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            You have {stats.pendingRequests} pending access request{stats.pendingRequests > 1 ? 's' : ''} 
            that require{stats.pendingRequests === 1 ? 's' : ''} review.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default ArcGISAccessAdmin;
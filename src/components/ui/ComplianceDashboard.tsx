'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  FileText, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  TrendingUp,
  Download,
  Upload,
  Calendar,
  Shield,
  AlertCircle,
  XCircle
} from 'lucide-react';

interface ComplianceReview {
  id: string;
  documentName: string;
  documentType: string;
  complianceScore: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  complianceStatus: 'PENDING' | 'IN_REVIEW' | 'COMPLIANT' | 'NON_COMPLIANT' | 'REQUIRES_ACTION';
  issuesFound: number;
  reviewDate: string;
  resolutionDate?: string;
}

interface ComplianceDeadline {
  id: string;
  title: string;
  deadlineType: string;
  dueDate: string;
  status: string;
  priority: string;
  daysUntilDue: number;
  isOverdue: boolean;
}

interface RegulatoryUpdate {
  id: string;
  title: string;
  regulatoryBody: string;
  updateType: string;
  impactLevel: string;
  effectiveDate: string;
  daysUntilEffective: number;
  isEffective: boolean;
  isUpcoming: boolean;
}

interface ComplianceMetrics {
  totalReviews: number;
  compliantDocuments: number;
  pendingReviews: number;
  criticalIssues: number;
  averageComplianceScore: number;
  upcomingDeadlines: number;
  overdueDeadlines: number;
  recentUpdates: number;
}

export default function ComplianceDashboard() {
  const [metrics, setMetrics] = useState<ComplianceMetrics | null>(null);
  const [recentReviews, setRecentReviews] = useState<ComplianceReview[]>([]);
  const [upcomingDeadlines, setUpcomingDeadlines] = useState<ComplianceDeadline[]>([]);
  const [recentUpdates, setRecentUpdates] = useState<RegulatoryUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch compliance reviews
      const reviewsResponse = await fetch('/api/compliance/review');
      const reviewsData = await reviewsResponse.json();
      
      // Fetch upcoming deadlines
      const deadlinesResponse = await fetch('/api/compliance/deadlines?upcoming=true');
      const deadlinesData = await deadlinesResponse.json();
      
      // Fetch recent regulatory updates
      const updatesResponse = await fetch('/api/compliance/regulatory-updates?recent=true');
      const updatesData = await updatesResponse.json();

      if (reviewsData.success) {
        const reviews = reviewsData.complianceReviews || [];
        setRecentReviews(reviews.slice(0, 5));
        
        // Calculate metrics
        const totalReviews = reviews.length;
        const compliantDocuments = reviews.filter((r: ComplianceReview) => r.complianceStatus === 'COMPLIANT').length;
        const pendingReviews = reviews.filter((r: ComplianceReview) => r.complianceStatus === 'PENDING' || r.complianceStatus === 'IN_REVIEW').length;
        const criticalIssues = reviews.filter((r: ComplianceReview) => r.riskLevel === 'CRITICAL').length;
        const averageScore = reviews.length > 0 ? reviews.reduce((sum: number, r: ComplianceReview) => sum + r.complianceScore, 0) / reviews.length : 0;
        
        setMetrics({
          totalReviews,
          compliantDocuments,
          pendingReviews,
          criticalIssues,
          averageComplianceScore: Math.round(averageScore),
          upcomingDeadlines: deadlinesData.success ? deadlinesData.deadlines?.length || 0 : 0,
          overdueDeadlines: deadlinesData.success ? deadlinesData.deadlines?.filter((d: ComplianceDeadline) => d.isOverdue).length || 0 : 0,
          recentUpdates: updatesData.success ? updatesData.updates?.length || 0 : 0
        });
      }

      if (deadlinesData.success) {
        setUpcomingDeadlines(deadlinesData.deadlines?.slice(0, 5) || []);
      }

      if (updatesData.success) {
        setRecentUpdates(updatesData.updates?.slice(0, 5) || []);
      }

    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Failed to load compliance dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const getRiskLevelColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'LOW': return 'bg-green-100 text-green-800';
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800';
      case 'HIGH': return 'bg-orange-100 text-orange-800';
      case 'CRITICAL': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLIANT': return 'bg-green-100 text-green-800';
      case 'NON_COMPLIANT': return 'bg-red-100 text-red-800';
      case 'REQUIRES_ACTION': return 'bg-orange-100 text-orange-800';
      case 'PENDING': return 'bg-blue-100 text-blue-800';
      case 'IN_REVIEW': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'LOW': return 'bg-green-100 text-green-800';
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800';
      case 'HIGH': return 'bg-orange-100 text-orange-800';
      case 'CRITICAL': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getImpactLevelColor = (impactLevel: string) => {
    switch (impactLevel) {
      case 'LOW': return 'bg-green-100 text-green-800';
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800';
      case 'HIGH': return 'bg-orange-100 text-orange-800';
      case 'CRITICAL': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="h-96 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Compliance Dashboard</h1>
          <p className="text-gray-600 mt-1">Monitor compliance status, deadlines, and regulatory updates</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Upload Document
          </Button>
          <Button className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Metrics Cards */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Reviews</p>
                <p className="text-3xl font-bold text-gray-900">{metrics.totalReviews}</p>
              </div>
              <FileText className="h-8 w-8 text-blue-600" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Compliant Documents</p>
                <p className="text-3xl font-bold text-green-600">{metrics.compliantDocuments}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Critical Issues</p>
                <p className="text-3xl font-bold text-red-600">{metrics.criticalIssues}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg. Compliance Score</p>
                <p className="text-3xl font-bold text-blue-600">{metrics.averageComplianceScore}%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-600" />
            </div>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Compliance Reviews */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Recent Reviews</h2>
            <Button variant="outline" size="sm">View All</Button>
          </div>
          <div className="space-y-4">
            {recentReviews.length > 0 ? (
              recentReviews.map((review) => (
                <div key={review.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">{review.documentName}</h3>
                    <p className="text-sm text-gray-600">{review.documentType}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge className={getRiskLevelColor(review.riskLevel)}>
                        {review.riskLevel}
                      </Badge>
                      <Badge className={getStatusColor(review.complianceStatus)}>
                        {review.complianceStatus.replace('_', ' ')}
                      </Badge>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold text-gray-900">{review.complianceScore}%</p>
                    <p className="text-sm text-gray-600">{review.issuesFound} issues</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-8">No compliance reviews yet</p>
            )}
          </div>
        </Card>

        {/* Upcoming Deadlines */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Upcoming Deadlines</h2>
            <Button variant="outline" size="sm">View All</Button>
          </div>
          <div className="space-y-4">
            {upcomingDeadlines.length > 0 ? (
              upcomingDeadlines.map((deadline) => (
                <div key={deadline.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">{deadline.title}</h3>
                    <p className="text-sm text-gray-600">{deadline.deadlineType}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge className={getPriorityColor(deadline.priority)}>
                        {deadline.priority}
                      </Badge>
                      {deadline.isOverdue && (
                        <Badge className="bg-red-100 text-red-800">
                          OVERDUE
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-gray-600">
                      <Calendar className="h-4 w-4" />
                      <span className="text-sm">
                        {deadline.isOverdue ? 
                          `${Math.abs(deadline.daysUntilDue)} days overdue` :
                          `${deadline.daysUntilDue} days left`
                        }
                      </span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-8">No upcoming deadlines</p>
            )}
          </div>
        </Card>
      </div>

      {/* Recent Regulatory Updates */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Recent Regulatory Updates</h2>
          <Button variant="outline" size="sm">View All</Button>
        </div>
        <div className="space-y-4">
          {recentUpdates.length > 0 ? (
            recentUpdates.map((update) => (
              <div key={update.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900">{update.title}</h3>
                  <p className="text-sm text-gray-600">{update.regulatoryBody} • {update.updateType}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge className={getImpactLevelColor(update.impactLevel)}>
                      {update.impactLevel} Impact
                    </Badge>
                    {update.isUpcoming && (
                      <Badge className="bg-blue-100 text-blue-800">
                        Upcoming
                      </Badge>
                    )}
                    {update.isEffective && (
                      <Badge className="bg-green-100 text-green-800">
                        Effective
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1 text-gray-600">
                    <Clock className="h-4 w-4" />
                    <span className="text-sm">
                      {update.isEffective ? 
                        'Now effective' :
                        `Effective in ${update.daysUntilEffective} days`
                      }
                    </span>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p className="text-gray-500 text-center py-8">No recent regulatory updates</p>
          )}
        </div>
      </Card>
    </div>
  );
}
'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Users, 
  MessageSquare, 
  Vote, 
  Calendar,
  TrendingUp,
  Award,
  AlertTriangle,
  Eye,
  ThumbsUp,
  UserCheck,
  Activity,
  BarChart3,
  Target,
  Clock,
  CheckCircle,
  XCircle,
  Flag
} from 'lucide-react';

interface CommunityMetrics {
  totalMembers: number;
  activeMembers: number;
  discussionActivity: {
    totalDiscussions: number;
    totalReplies: number;
    totalViews: number;
    totalLikes: number;
    weeklyGrowth: number;
  };
  committeeActivity: {
    totalCommittees: number;
    activeMemberships: number;
    meetingsThisMonth: number;
    projectsInProgress: number;
    participationRate: number;
  };
  votingActivity: {
    activeVotes: number;
    completedVotes: number;
    participationRate: number;
    averageEngagement: number;
  };
  networkingSuccess: {
    connectionsFormed: number;
    businessOpportunities: number;
    collaborationsStarted: number;
    conversionRate: number;
  };
  memberEngagement: {
    topContributors: Array<{
      id: string;
      name: string;
      score: number;
      contributions: number;
      avatar?: string;
    }>;
    engagementTrends: Array<{
      date: string;
      discussions: number;
      committees: number;
      voting: number;
      networking: number;
    }>;
  };
}

interface ModerationAlert {
  id: string;
  type: 'inappropriate_content' | 'spam' | 'harassment' | 'off_topic';
  severity: 'low' | 'medium' | 'high';
  content: string;
  reportedBy: string;
  reportedAt: string;
  status: 'pending' | 'reviewed' | 'resolved';
  context: {
    discussionId?: string;
    messageId?: string;
    memberId: string;
    memberName: string;
  };
}

interface CommunityEvent {
  id: string;
  title: string;
  type: 'networking' | 'committee_meeting' | 'workshop' | 'social';
  date: string;
  attendees: number;
  maxAttendees?: number;
  status: 'upcoming' | 'ongoing' | 'completed';
  committee?: string;
  description: string;
}

export default function CommunityEngagementDashboard() {
  const [metrics, setMetrics] = useState<CommunityMetrics | null>(null);
  const [moderationAlerts, setModerationAlerts] = useState<ModerationAlert[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<CommunityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTimeframe, setSelectedTimeframe] = useState<'week' | 'month' | 'quarter'>('month');

  useEffect(() => {
    fetchCommunityMetrics();
    fetchModerationAlerts();
    fetchUpcomingEvents();
  }, [selectedTimeframe]);

  const fetchCommunityMetrics = async () => {
    try {
      const response = await fetch(`/api/community/analytics?timeframe=${selectedTimeframe}`);
      if (response.ok) {
        const data = await response.json();
        setMetrics(data);
      }
    } catch (error) {
      console.error('Error fetching community metrics:', error);
    }
  };

  const fetchModerationAlerts = async () => {
    try {
      const response = await fetch('/api/community/moderation/alerts');
      if (response.ok) {
        const data = await response.json();
        setModerationAlerts(data);
      }
    } catch (error) {
      console.error('Error fetching moderation alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUpcomingEvents = async () => {
    try {
      const response = await fetch('/api/community/events?status=upcoming&limit=10');
      if (response.ok) {
        const data = await response.json();
        setUpcomingEvents(data);
      }
    } catch (error) {
      console.error('Error fetching upcoming events:', error);
    }
  };

  const handleModerationAction = async (alertId: string, action: 'approve' | 'remove' | 'warn') => {
    try {
      const response = await fetch(`/api/community/moderation/alerts/${alertId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });

      if (response.ok) {
        setModerationAlerts(prev => 
          prev.map(alert => 
            alert.id === alertId 
              ? { ...alert, status: 'resolved' }
              : alert
          )
        );
      }
    } catch (error) {
      console.error('Error handling moderation action:', error);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getEngagementTrend = (current: number, previous: number) => {
    const change = ((current - previous) / previous) * 100;
    return {
      value: Math.abs(change).toFixed(1),
      isPositive: change > 0,
      isNeutral: Math.abs(change) < 1
    };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Community Analytics</h1>
          <p className="text-gray-600 mt-1">Monitor engagement, track success, and manage community health</p>
        </div>
        <div className="flex gap-2">
          <select
            value={selectedTimeframe}
            onChange={(e) => setSelectedTimeframe(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
          >
            <option value="week">Last Week</option>
            <option value="month">Last Month</option>
            <option value="quarter">Last Quarter</option>
          </select>
        </div>
      </div>

      {/* Key Metrics Overview */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Members</p>
                <p className="text-2xl font-bold text-gray-900">{metrics.activeMembers}</p>
                <p className="text-xs text-gray-500">of {metrics.totalMembers} total</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Discussion Activity</p>
                <p className="text-2xl font-bold text-gray-900">{metrics.discussionActivity.totalDiscussions}</p>
                <div className="flex items-center mt-1">
                  <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
                  <p className="text-xs text-green-600">+{metrics.discussionActivity.weeklyGrowth}% this week</p>
                </div>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <MessageSquare className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Committee Participation</p>
                <p className="text-2xl font-bold text-gray-900">{metrics.committeeActivity.participationRate}%</p>
                <p className="text-xs text-gray-500">{metrics.committeeActivity.activeMemberships} memberships</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-full">
                <UserCheck className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Business Opportunities</p>
                <p className="text-2xl font-bold text-gray-900">{metrics.networkingSuccess.businessOpportunities}</p>
                <p className="text-xs text-gray-500">{metrics.networkingSuccess.conversionRate}% conversion</p>
              </div>
              <div className="p-3 bg-yellow-100 rounded-full">
                <Target className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </Card>
        </div>
      )}

      <Tabs defaultValue="engagement" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="engagement">Engagement Analytics</TabsTrigger>
          <TabsTrigger value="moderation">Content Moderation</TabsTrigger>
          <TabsTrigger value="events">Community Events</TabsTrigger>
          <TabsTrigger value="recognition">Member Recognition</TabsTrigger>
        </TabsList>

        <TabsContent value="engagement" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Discussion Analytics */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Discussion Analytics</h3>
              {metrics && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Total Discussions</span>
                    <span className="font-semibold">{metrics.discussionActivity.totalDiscussions}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Total Replies</span>
                    <span className="font-semibold">{metrics.discussionActivity.totalReplies}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Total Views</span>
                    <span className="font-semibold">{metrics.discussionActivity.totalViews.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Total Likes</span>
                    <span className="font-semibold">{metrics.discussionActivity.totalLikes}</span>
                  </div>
                  <div className="pt-2 border-t">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Engagement Rate</span>
                      <div className="flex items-center">
                        <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                        <span className="text-sm font-semibold text-green-600">
                          {((metrics.discussionActivity.totalLikes + metrics.discussionActivity.totalReplies) / metrics.discussionActivity.totalViews * 100).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </Card>

            {/* Committee Analytics */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Committee Analytics</h3>
              {metrics && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Active Committees</span>
                    <span className="font-semibold">{metrics.committeeActivity.totalCommittees}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Active Memberships</span>
                    <span className="font-semibold">{metrics.committeeActivity.activeMemberships}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Meetings This Month</span>
                    <span className="font-semibold">{metrics.committeeActivity.meetingsThisMonth}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Projects in Progress</span>
                    <span className="font-semibold">{metrics.committeeActivity.projectsInProgress}</span>
                  </div>
                  <div className="pt-2 border-t">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Participation Rate</span>
                      <span className="text-sm font-semibold text-blue-600">
                        {metrics.committeeActivity.participationRate}%
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </Card>

            {/* Voting Analytics */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Voting Analytics</h3>
              {metrics && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Active Votes</span>
                    <span className="font-semibold">{metrics.votingActivity.activeVotes}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Completed Votes</span>
                    <span className="font-semibold">{metrics.votingActivity.completedVotes}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Participation Rate</span>
                    <span className="font-semibold">{metrics.votingActivity.participationRate}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Avg. Engagement</span>
                    <span className="font-semibold">{metrics.votingActivity.averageEngagement}%</span>
                  </div>
                </div>
              )}
            </Card>

            {/* Networking Success */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Networking Success</h3>
              {metrics && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Connections Formed</span>
                    <span className="font-semibold">{metrics.networkingSuccess.connectionsFormed}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Business Opportunities</span>
                    <span className="font-semibold">{metrics.networkingSuccess.businessOpportunities}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Collaborations Started</span>
                    <span className="font-semibold">{metrics.networkingSuccess.collaborationsStarted}</span>
                  </div>
                  <div className="pt-2 border-t">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Conversion Rate</span>
                      <span className="text-sm font-semibold text-green-600">
                        {metrics.networkingSuccess.conversionRate}%
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          </div>

          {/* Top Contributors */}
          {metrics && metrics.memberEngagement.topContributors.length > 0 && (
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Contributors</h3>
              <div className="space-y-3">
                {metrics.memberEngagement.topContributors.map((contributor, index) => (
                  <div key={contributor.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center justify-center w-8 h-8 bg-yellow-100 rounded-full">
                        <span className="text-sm font-semibold text-yellow-800">#{index + 1}</span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{contributor.name}</p>
                        <p className="text-sm text-gray-600">{contributor.contributions} contributions</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant="secondary">
                        {contributor.score} points
                      </Badge>
                      <Award className="h-4 w-4 text-yellow-500" />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="moderation" className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900">Content Moderation</h3>
            <Badge variant={moderationAlerts.filter(a => a.status === 'pending').length > 0 ? "destructive" : "secondary"}>
              {moderationAlerts.filter(a => a.status === 'pending').length} pending alerts
            </Badge>
          </div>

          <div className="space-y-4">
            {moderationAlerts.length === 0 ? (
              <Card className="p-8 text-center">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">All Clear!</h3>
                <p className="text-gray-600">No moderation alerts at this time.</p>
              </Card>
            ) : (
              moderationAlerts.map((alert) => (
                <Card key={alert.id} className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <Badge className={getSeverityColor(alert.severity)}>
                          {alert.severity.toUpperCase()}
                        </Badge>
                        <Badge variant="outline">
                          {alert.type.replace('_', ' ').toUpperCase()}
                        </Badge>
                        <span className="text-sm text-gray-500">
                          {new Date(alert.reportedAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-gray-900 mb-2">{alert.content}</p>
                      <div className="text-sm text-gray-600">
                        <p>Reported by: {alert.reportedBy}</p>
                        <p>Member: {alert.context.memberName}</p>
                      </div>
                    </div>
                    {alert.status === 'pending' && (
                      <div className="flex space-x-2 ml-4">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleModerationAction(alert.id, 'approve')}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleModerationAction(alert.id, 'warn')}
                        >
                          <AlertTriangle className="h-4 w-4 mr-1" />
                          Warn
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleModerationAction(alert.id, 'remove')}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Remove
                        </Button>
                      </div>
                    )}
                  </div>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="events" className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900">Community Events</h3>
            <Button>
              <Calendar className="h-4 w-4 mr-2" />
              Create Event
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {upcomingEvents.map((event) => (
              <Card key={event.id} className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <Badge variant={event.type === 'networking' ? 'default' : 'secondary'}>
                    {event.type.replace('_', ' ')}
                  </Badge>
                  <span className="text-sm text-gray-500">
                    {new Date(event.date).toLocaleDateString()}
                  </span>
                </div>
                <h4 className="font-semibold text-gray-900 mb-2">{event.title}</h4>
                <p className="text-sm text-gray-600 mb-3">{event.description}</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center text-sm text-gray-600">
                    <Users className="h-4 w-4 mr-1" />
                    {event.attendees}{event.maxAttendees && `/${event.maxAttendees}`}
                  </div>
                  <Button size="sm" variant="outline">
                    View Details
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="recognition" className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900">Member Recognition</h3>
            <Button>
              <Award className="h-4 w-4 mr-2" />
              Create Recognition
            </Button>
          </div>

          {metrics && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="p-6">
                <h4 className="font-semibold text-gray-900 mb-4">Engagement Leaderboard</h4>
                <div className="space-y-3">
                  {metrics.memberEngagement.topContributors.slice(0, 5).map((contributor, index) => (
                    <div key={contributor.id} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          index === 0 ? 'bg-yellow-100 text-yellow-800' :
                          index === 1 ? 'bg-gray-100 text-gray-800' :
                          index === 2 ? 'bg-orange-100 text-orange-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {index + 1}
                        </div>
                        <span className="font-medium">{contributor.name}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-600">{contributor.score} pts</span>
                        {index < 3 && <Award className="h-4 w-4 text-yellow-500" />}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="p-6">
                <h4 className="font-semibold text-gray-900 mb-4">Recognition Programs</h4>
                <div className="space-y-4">
                  <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                    <div className="flex items-center space-x-2 mb-2">
                      <Award className="h-5 w-5 text-yellow-600" />
                      <span className="font-medium text-yellow-800">Community Champion</span>
                    </div>
                    <p className="text-sm text-yellow-700">
                      Awarded monthly to the most active community contributor
                    </p>
                  </div>
                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center space-x-2 mb-2">
                      <Users className="h-5 w-5 text-blue-600" />
                      <span className="font-medium text-blue-800">Networking Star</span>
                    </div>
                    <p className="text-sm text-blue-700">
                      Recognizes members who facilitate successful business connections
                    </p>
                  </div>
                  <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex items-center space-x-2 mb-2">
                      <MessageSquare className="h-5 w-5 text-green-600" />
                      <span className="font-medium text-green-800">Discussion Leader</span>
                    </div>
                    <p className="text-sm text-green-700">
                      Awarded for starting meaningful discussions and providing valuable insights
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
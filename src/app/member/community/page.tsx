'use client';

import React, { useState } from 'react';
import { useSession } from 'next-auth/react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CommunityDiscussions } from '@/components/ui/CommunityDiscussions';
import { MemberMessaging } from '@/components/ui/MemberMessaging';
import { MemberProfileShowcase } from '@/components/ui/MemberProfileShowcase';
import { 
  MessageSquare, 
  Mail, 
  Users, 
  Plus,
  TrendingUp,
  Award,
  Calendar,
  Bell
} from 'lucide-react';

export default function CommunityPage() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState('discussions');
  const [showCreateDiscussion, setShowCreateDiscussion] = useState(false);
  const [showComposeMessage, setShowComposeMessage] = useState(false);

  const handleCreateDiscussion = () => {
    setShowCreateDiscussion(true);
  };

  const handleComposeMessage = () => {
    setShowComposeMessage(true);
  };

  const handleViewDiscussion = (discussionId: string) => {
    // Navigate to discussion detail page
    window.location.href = `/member/community/discussions/${discussionId}`;
  };

  const handleViewMessage = (messageId: string) => {
    // Navigate to message detail page
    window.location.href = `/member/community/messages/${messageId}`;
  };

  const handleViewThread = (threadId: string) => {
    // Navigate to message thread page
    window.location.href = `/member/community/messages/threads/${threadId}`;
  };

  const handleViewProfile = (memberId: string) => {
    // Navigate to member profile page
    window.location.href = `/member/community/profiles/${memberId}`;
  };

  const handleSendMessage = (memberId: string) => {
    // Navigate to compose message with recipient pre-filled
    window.location.href = `/member/community/messages/compose?to=${memberId}`;
  };

  const handleConnect = (memberId: string) => {
    // Navigate to connection request page
    window.location.href = `/member/community/connections/request?member=${memberId}`;
  };

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h2>
          <p className="text-gray-600 mb-4">Please sign in to access the community platform.</p>
          <Button onClick={() => window.location.href = '/auth/signin'}>
            Sign In
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Community Platform</h1>
          <p className="text-lg text-gray-600">
            Connect, collaborate, and grow with fellow NAMC members
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-blue-100 text-blue-600">
                <MessageSquare className="h-6 w-6" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Discussions</p>
                <p className="text-2xl font-bold text-gray-900">127</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-green-100 text-green-600">
                <Users className="h-6 w-6" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Members</p>
                <p className="text-2xl font-bold text-gray-900">1,234</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-purple-100 text-purple-600">
                <TrendingUp className="h-6 w-6" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Connections Made</p>
                <p className="text-2xl font-bold text-gray-900">856</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-orange-100 text-orange-600">
                <Award className="h-6 w-6" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Business Opportunities</p>
                <p className="text-2xl font-bold text-gray-900">43</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="discussions" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Discussions
            </TabsTrigger>
            <TabsTrigger value="messages" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Messages
            </TabsTrigger>
            <TabsTrigger value="opportunities" className="flex items-center gap-2">
              <Award className="h-4 w-4" />
              Opportunities
            </TabsTrigger>
            <TabsTrigger value="directory" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Member Directory
            </TabsTrigger>
          </TabsList>

          <TabsContent value="discussions" className="space-y-6">
            <CommunityDiscussions
              onCreateDiscussion={handleCreateDiscussion}
              onViewDiscussion={handleViewDiscussion}
            />
          </TabsContent>

          <TabsContent value="messages" className="space-y-6">
            <MemberMessaging
              onComposeMessage={handleComposeMessage}
              onViewMessage={handleViewMessage}
              onViewThread={handleViewThread}
            />
          </TabsContent>

          <TabsContent value="opportunities" className="space-y-6">
            <Card className="p-6">
              <div className="text-center">
                <Award className="h-12 w-12 text-blue-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Business Opportunities</h3>
                <p className="text-gray-600 mb-6">
                  Connect with fellow contractors for projects, partnerships, and resource sharing
                </p>
                <Button onClick={() => window.location.href = '/member/community/opportunities'}>
                  Browse Opportunities
                </Button>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="directory" className="space-y-6">
            <MemberProfileShowcase
              onViewProfile={handleViewProfile}
              onSendMessage={handleSendMessage}
              onConnect={handleConnect}
            />
          </TabsContent>
        </Tabs>

        {/* Floating Action Buttons */}
        <div className="fixed bottom-6 right-6 flex flex-col gap-3">
          {activeTab === 'discussions' && (
            <Button
              onClick={handleCreateDiscussion}
              className="rounded-full w-14 h-14 shadow-lg"
              title="Start New Discussion"
            >
              <Plus className="h-6 w-6" />
            </Button>
          )}
          
          {activeTab === 'messages' && (
            <Button
              onClick={handleComposeMessage}
              className="rounded-full w-14 h-14 shadow-lg"
              title="Compose Message"
            >
              <Plus className="h-6 w-6" />
            </Button>
          )}
        </div>

        {/* Upcoming Events Sidebar */}
        <div className="fixed top-20 right-6 w-80 hidden xl:block">
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="h-5 w-5 text-blue-600" />
              <h3 className="font-semibold text-gray-900">Upcoming Events</h3>
            </div>
            <div className="space-y-3">
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="font-medium text-sm text-blue-900">Monthly Networking Mixer</p>
                <p className="text-xs text-blue-700">Tomorrow, 6:00 PM</p>
              </div>
              <div className="p-3 bg-green-50 rounded-lg">
                <p className="font-medium text-sm text-green-900">Project Management Workshop</p>
                <p className="text-xs text-green-700">Friday, 2:00 PM</p>
              </div>
              <div className="p-3 bg-purple-50 rounded-lg">
                <p className="font-medium text-sm text-purple-900">Business Growth Seminar</p>
                <p className="text-xs text-purple-700">Next Monday, 10:00 AM</p>
              </div>
            </div>
            <Button variant="outline" size="sm" className="w-full mt-4">
              View All Events
            </Button>
          </Card>
        </div>

        {/* Notifications */}
        <div className="fixed top-6 right-6 xl:right-96">
          <Button variant="outline" size="sm" className="relative">
            <Bell className="h-4 w-4" />
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
              3
            </span>
          </Button>
        </div>
      </div>
    </div>
  );
}
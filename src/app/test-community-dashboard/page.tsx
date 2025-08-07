'use client';

import React from 'react';
import CommunityEngagementDashboard from '@/components/ui/CommunityEngagementDashboard';

export default function TestCommunityDashboard() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Community Engagement Dashboard Test</h1>
          <p className="text-gray-600">Testing the community engagement and analytics dashboard implementation.</p>
        </div>
        <CommunityEngagementDashboard />
      </div>
    </div>
  );
}
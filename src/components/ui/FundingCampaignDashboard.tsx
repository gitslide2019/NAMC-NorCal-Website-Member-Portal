'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  DollarSign, 
  Users, 
  Target, 
  Calendar,
  TrendingUp,
  Heart,
  Building,
  Award,
  PlusCircle,
  Share2,
  Mail,
  ExternalLink
} from 'lucide-react';

interface FundingCampaign {
  id: string;
  campaignTitle: string;
  description: string;
  targetAmount: number;
  raisedAmount: number;
  campaignType: string;
  campaignStatus: string;
  startDate: string;
  endDate: string;
  jobsToCreate: number;
  trainingHours: number;
  localHireTarget: number;
  minorityHireTarget: number;
  womenHireTarget: number;
  housingUnitsTarget: number;
  affordableUnitsTarget: number;
  communityBenefitScore: number;
  contributions: CampaignContribution[];
  sponsors: CampaignSponsor[];
  _count: {
    contributions: number;
    sponsors: number;
  };
}

interface CampaignContribution {
  id: string;
  contributorName: string;
  amount: number;
  contributionType: string;
  paymentStatus: string;
  isAnonymous: boolean;
  message?: string;
  createdAt: string;
}

interface CampaignSponsor {
  id: string;
  sponsorName: string;
  sponsorType: string;
  sponsorshipLevel: string;
  amount: number;
  logoUrl?: string;
  websiteUrl?: string;
  contractSigned: boolean;
  recognitionApproved: boolean;
}

interface FundingCampaignDashboardProps {
  projectId: string;
  campaignId?: string;
}

export function FundingCampaignDashboard({ projectId, campaignId }: FundingCampaignDashboardProps) {
  const [campaigns, setCampaigns] = useState<FundingCampaign[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<FundingCampaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  useEffect(() => {
    fetchCampaigns();
  }, [projectId]);

  useEffect(() => {
    if (campaignId && campaigns.length > 0) {
      const campaign = campaigns.find(c => c.id === campaignId);
      if (campaign) {
        setSelectedCampaign(campaign);
      }
    } else if (campaigns.length > 0) {
      setSelectedCampaign(campaigns[0]);
    }
  }, [campaignId, campaigns]);

  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/projects/${projectId}/funding-campaigns`);
      if (!response.ok) {
        throw new Error('Failed to fetch campaigns');
      }
      const data = await response.json();
      setCampaigns(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const getProgressPercentage = (campaign: FundingCampaign) => {
    return Math.min((campaign.raisedAmount / campaign.targetAmount) * 100, 100);
  };

  const getDaysRemaining = (endDate: string) => {
    const end = new Date(endDate);
    const now = new Date();
    const diffTime = end.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(diffDays, 0);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'bg-green-500';
      case 'DRAFT': return 'bg-yellow-500';
      case 'COMPLETED': return 'bg-blue-500';
      case 'PAUSED': return 'bg-orange-500';
      case 'CANCELLED': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert className="border-red-200 bg-red-50">
        <div className="text-red-800">
          <strong>Error loading campaigns:</strong> {error}
        </div>
      </Alert>
    );
  }

  if (campaigns.length === 0) {
    return (
      <Card className="p-8 text-center">
        <div className="space-y-4">
          <Target className="h-16 w-16 text-gray-400 mx-auto" />
          <h3 className="text-xl font-semibold text-gray-900">No Funding Campaigns</h3>
          <p className="text-gray-600">
            Create your first funding campaign to raise money for your project and achieve social impact goals.
          </p>
          <Button onClick={() => setShowCreateForm(true)}>
            <PlusCircle className="h-4 w-4 mr-2" />
            Create Campaign
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Funding Campaigns</h2>
        <Button onClick={() => setShowCreateForm(true)}>
          <PlusCircle className="h-4 w-4 mr-2" />
          New Campaign
        </Button>
      </div>

      {/* Campaign Selection */}
      {campaigns.length > 1 && (
        <div className="flex space-x-2 overflow-x-auto pb-2">
          {campaigns.map((campaign) => (
            <button
              key={campaign.id}
              onClick={() => setSelectedCampaign(campaign)}
              className={`flex-shrink-0 px-4 py-2 rounded-lg border transition-colors ${
                selectedCampaign?.id === campaign.id
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              <div className="text-sm font-medium">{campaign.campaignTitle}</div>
              <div className="text-xs text-gray-500">
                {formatCurrency(campaign.raisedAmount)} / {formatCurrency(campaign.targetAmount)}
              </div>
            </button>
          ))}
        </div>
      )}

      {selectedCampaign && (
        <>
          {/* Campaign Overview */}
          <Card className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {selectedCampaign.campaignTitle}
                </h3>
                <div className="flex items-center space-x-2">
                  <Badge className={getStatusColor(selectedCampaign.campaignStatus)}>
                    {selectedCampaign.campaignStatus}
                  </Badge>
                  <Badge variant="outline">{selectedCampaign.campaignType}</Badge>
                </div>
              </div>
              <div className="flex space-x-2">
                <Button variant="outline" size="sm">
                  <Share2 className="h-4 w-4 mr-2" />
                  Share
                </Button>
                <Button variant="outline" size="sm">
                  <Mail className="h-4 w-4 mr-2" />
                  Update Contributors
                </Button>
              </div>
            </div>

            <p className="text-gray-600 mb-6">{selectedCampaign.description}</p>

            {/* Progress Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Campaign Progress</span>
                <span className="text-sm text-gray-600">
                  {getProgressPercentage(selectedCampaign).toFixed(1)}% of goal
                </span>
              </div>
              <Progress 
                value={getProgressPercentage(selectedCampaign)} 
                className="h-3"
              />
              <div className="flex justify-between text-sm text-gray-600">
                <span>{formatCurrency(selectedCampaign.raisedAmount)} raised</span>
                <span>{formatCurrency(selectedCampaign.targetAmount)} goal</span>
              </div>
            </div>

            {/* Campaign Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-gray-200">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {selectedCampaign._count.contributions}
                </div>
                <div className="text-sm text-gray-600">Contributors</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {selectedCampaign._count.sponsors}
                </div>
                <div className="text-sm text-gray-600">Sponsors</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {getDaysRemaining(selectedCampaign.endDate)}
                </div>
                <div className="text-sm text-gray-600">Days Left</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {selectedCampaign.communityBenefitScore}
                </div>
                <div className="text-sm text-gray-600">Impact Score</div>
              </div>
            </div>
          </Card>

          {/* Social Impact Goals */}
          <Card className="p-6">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Social Impact Goals</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {selectedCampaign.jobsToCreate > 0 && (
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <Users className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                  <div className="text-xl font-bold text-blue-900">
                    {selectedCampaign.jobsToCreate}
                  </div>
                  <div className="text-sm text-blue-600">Jobs to Create</div>
                </div>
              )}
              {selectedCampaign.trainingHours > 0 && (
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <Award className="h-8 w-8 text-green-600 mx-auto mb-2" />
                  <div className="text-xl font-bold text-green-900">
                    {selectedCampaign.trainingHours}
                  </div>
                  <div className="text-sm text-green-600">Training Hours</div>
                </div>
              )}
              {selectedCampaign.localHireTarget > 0 && (
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <Target className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                  <div className="text-xl font-bold text-purple-900">
                    {selectedCampaign.localHireTarget}%
                  </div>
                  <div className="text-sm text-purple-600">Local Hire Target</div>
                </div>
              )}
              {selectedCampaign.housingUnitsTarget > 0 && (
                <div className="text-center p-4 bg-orange-50 rounded-lg">
                  <Building className="h-8 w-8 text-orange-600 mx-auto mb-2" />
                  <div className="text-xl font-bold text-orange-900">
                    {selectedCampaign.housingUnitsTarget}
                  </div>
                  <div className="text-sm text-orange-600">Housing Units</div>
                </div>
              )}
            </div>
          </Card>

          {/* Recent Contributors */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-semibold text-gray-900">Recent Contributors</h4>
              <Button variant="outline" size="sm">
                View All
              </Button>
            </div>
            <div className="space-y-3">
              {selectedCampaign.contributions.slice(0, 5).map((contribution) => (
                <div key={contribution.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <Heart className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {contribution.isAnonymous ? 'Anonymous' : contribution.contributorName}
                      </p>
                      <p className="text-sm text-gray-600">
                        {new Date(contribution.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900">
                      {formatCurrency(contribution.amount)}
                    </p>
                    <Badge 
                      className={
                        contribution.paymentStatus === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                        contribution.paymentStatus === 'FAILED' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }
                    >
                      {contribution.paymentStatus}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Sponsors */}
          {selectedCampaign.sponsors.length > 0 && (
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-semibold text-gray-900">Campaign Sponsors</h4>
                <Button variant="outline" size="sm">
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Add Sponsor
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {selectedCampaign.sponsors.map((sponsor) => (
                  <div key={sponsor.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center space-x-3">
                        {sponsor.logoUrl ? (
                          <img 
                            src={sponsor.logoUrl} 
                            alt={sponsor.sponsorName}
                            className="w-12 h-12 object-contain rounded"
                          />
                        ) : (
                          <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center">
                            <Building className="h-6 w-6 text-gray-400" />
                          </div>
                        )}
                        <div>
                          <h5 className="font-medium text-gray-900">{sponsor.sponsorName}</h5>
                          <p className="text-sm text-gray-600">{sponsor.sponsorType}</p>
                        </div>
                      </div>
                      {sponsor.websiteUrl && (
                        <Button variant="outline" size="sm">
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <Badge>{sponsor.sponsorshipLevel}</Badge>
                      <span className="font-medium text-gray-900">
                        {formatCurrency(sponsor.amount)}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2 mt-2">
                      <Badge 
                        className={sponsor.contractSigned ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}
                      >
                        {sponsor.contractSigned ? 'Contract Signed' : 'Pending Contract'}
                      </Badge>
                      <Badge 
                        className={sponsor.recognitionApproved ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}
                      >
                        {sponsor.recognitionApproved ? 'Recognition Approved' : 'Pending Approval'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
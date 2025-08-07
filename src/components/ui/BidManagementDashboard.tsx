'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Target, 
  Clock, 
  Award,
  AlertTriangle,
  CheckCircle,
  XCircle,
  FileText,
  BarChart3,
  PieChart,
  Activity
} from 'lucide-react';

interface BidData {
  id: string;
  projectName: string;
  projectType: string;
  totalBidAmount: number;
  bidStatus: string;
  actualOutcome?: string;
  winProbability: number;
  riskScore: number;
  competitivenessScore: number;
  submittedDate?: string;
  responseDate?: string;
  createdAt: string;
}

interface PerformanceMetrics {
  totalBidsGenerated: number;
  totalBidsSubmitted: number;
  totalBidsWon: number;
  totalBidsLost: number;
  overallWinRate: number;
  averageBidAccuracy: number;
  totalProjectValue: number;
  averageProjectValue: number;
  averageProfitMargin: number;
  competitivePosition: string;
  pricingTrend: string;
  improvementAreas: string[];
  strengthAreas: string[];
}

export default function BidManagementDashboard() {
  const [bids, setBids] = useState<BidData[]>([]);
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedPeriod, setSelectedPeriod] = useState('MONTHLY');

  useEffect(() => {
    fetchBids();
    fetchMetrics();
  }, []);

  const fetchBids = async () => {
    try {
      const response = await fetch('/api/bids');
      const data = await response.json();
      if (data.success) {
        setBids(data.data);
      }
    } catch (error) {
      console.error('Error fetching bids:', error);
    }
  };

  const fetchMetrics = async () => {
    try {
      const response = await fetch('/api/bids/performance');
      const data = await response.json();
      if (data.success) {
        setMetrics(data.data);
      }
    } catch (error) {
      console.error('Error fetching metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string, outcome?: string) => {
    if (outcome === 'WON') return <CheckCircle className="h-4 w-4 text-green-500" />;
    if (outcome === 'LOST') return <XCircle className="h-4 w-4 text-red-500" />;
    if (status === 'SUBMITTED') return <Clock className="h-4 w-4 text-blue-500" />;
    return <FileText className="h-4 w-4 text-gray-500" />;
  };

  const getStatusColor = (status: string, outcome?: string) => {
    if (outcome === 'WON') return 'bg-green-100 text-green-800';
    if (outcome === 'LOST') return 'bg-red-100 text-red-800';
    if (status === 'SUBMITTED') return 'bg-blue-100 text-blue-800';
    return 'bg-gray-100 text-gray-800';
  };

  const getRiskColor = (riskScore: number) => {
    if (riskScore < 30) return 'text-green-600';
    if (riskScore < 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
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
          <h1 className="text-3xl font-bold text-gray-900">Bid Management Dashboard</h1>
          <p className="text-gray-600 mt-1">Track your bidding performance and optimize your strategy</p>
        </div>
        <div className="flex space-x-3">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
          >
            <option value="MONTHLY">Monthly</option>
            <option value="QUARTERLY">Quarterly</option>
            <option value="YEARLY">Yearly</option>
          </select>
          <Button className="bg-yellow-600 hover:bg-yellow-700">
            Generate Report
          </Button>
        </div>
      </div>

      {/* Key Metrics Cards */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Win Rate</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatPercentage(metrics.overallWinRate)}
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <Target className="h-6 w-6 text-green-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center">
              <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
              <span className="text-sm text-green-600">+2.3% from last month</span>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Value Won</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(metrics.totalProjectValue)}
                </p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <DollarSign className="h-6 w-6 text-blue-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center">
              <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
              <span className="text-sm text-green-600">+15.2% from last month</span>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Bid Accuracy</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatPercentage(metrics.averageBidAccuracy)}
                </p>
              </div>
              <div className="p-3 bg-purple-100 rounded-full">
                <Activity className="h-6 w-6 text-purple-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center">
              <TrendingDown className="h-4 w-4 text-red-500 mr-1" />
              <span className="text-sm text-red-600">-1.1% from last month</span>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg Profit Margin</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatPercentage(metrics.averageProfitMargin)}
                </p>
              </div>
              <div className="p-3 bg-yellow-100 rounded-full">
                <Award className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center">
              <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
              <span className="text-sm text-green-600">+0.8% from last month</span>
            </div>
          </Card>
        </div>
      )}

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="bids">Active Bids</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="optimization">Optimization</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Bids */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Recent Bids</h3>
                <Button variant="outline" size="sm">View All</Button>
              </div>
              <div className="space-y-4">
                {bids.slice(0, 5).map((bid) => (
                  <div key={bid.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      {getStatusIcon(bid.bidStatus, bid.actualOutcome)}
                      <div>
                        <p className="font-medium text-gray-900">{bid.projectName}</p>
                        <p className="text-sm text-gray-600">{bid.projectType}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-gray-900">{formatCurrency(bid.totalBidAmount)}</p>
                      <Badge className={getStatusColor(bid.bidStatus, bid.actualOutcome)}>
                        {bid.actualOutcome || bid.bidStatus}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Performance Summary */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Summary</h3>
              {metrics && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Competitive Position</span>
                    <Badge className="bg-blue-100 text-blue-800">
                      {metrics.competitivePosition}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Pricing Trend</span>
                    <Badge className={
                      metrics.pricingTrend === 'INCREASING' ? 'bg-green-100 text-green-800' :
                      metrics.pricingTrend === 'DECREASING' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }>
                      {metrics.pricingTrend}
                    </Badge>
                  </div>
                  <div>
                    <span className="text-gray-600 block mb-2">Strength Areas</span>
                    <div className="flex flex-wrap gap-2">
                      {metrics.strengthAreas.map((area, index) => (
                        <Badge key={index} className="bg-green-100 text-green-800">
                          {area}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-600 block mb-2">Improvement Areas</span>
                    <div className="flex flex-wrap gap-2">
                      {metrics.improvementAreas.map((area, index) => (
                        <Badge key={index} className="bg-yellow-100 text-yellow-800">
                          {area}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="bids" className="space-y-6">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">All Bids</h3>
              <div className="flex space-x-3">
                <select className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
                  <option value="">All Status</option>
                  <option value="DRAFT">Draft</option>
                  <option value="SUBMITTED">Submitted</option>
                  <option value="WON">Won</option>
                  <option value="LOST">Lost</option>
                </select>
                <Button className="bg-yellow-600 hover:bg-yellow-700">
                  New Bid
                </Button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Project</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Type</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Amount</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Win Prob.</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Risk</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Status</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {bids.map((bid) => (
                    <tr key={bid.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium text-gray-900">{bid.projectName}</p>
                          <p className="text-sm text-gray-600">
                            {new Date(bid.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <Badge className="bg-gray-100 text-gray-800">
                          {bid.projectType}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 font-medium">
                        {formatCurrency(bid.totalBidAmount)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center">
                          <div className="w-12 bg-gray-200 rounded-full h-2 mr-2">
                            <div 
                              className="bg-green-500 h-2 rounded-full" 
                              style={{ width: `${bid.winProbability}%` }}
                            ></div>
                          </div>
                          <span className="text-sm text-gray-600">
                            {formatPercentage(bid.winProbability)}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`font-medium ${getRiskColor(bid.riskScore)}`}>
                          {bid.riskScore < 30 ? 'Low' : bid.riskScore < 60 ? 'Medium' : 'High'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <Badge className={getStatusColor(bid.bidStatus, bid.actualOutcome)}>
                          {bid.actualOutcome || bid.bidStatus}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex space-x-2">
                          <Button variant="outline" size="sm">
                            View
                          </Button>
                          <Button variant="outline" size="sm">
                            Review
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Win Rate by Project Type</h3>
                <BarChart3 className="h-5 w-5 text-gray-400" />
              </div>
              <div className="space-y-3">
                {metrics && Object.entries(metrics.winRateByProjectType || {}).map(([type, rate]) => (
                  <div key={type} className="flex items-center justify-between">
                    <span className="text-gray-600">{type}</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-20 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-500 h-2 rounded-full" 
                          style={{ width: `${rate}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium text-gray-900 w-12">
                        {formatPercentage(rate as number)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Bid Distribution</h3>
                <PieChart className="h-5 w-5 text-gray-400" />
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span className="text-gray-600">Won</span>
                  </div>
                  <span className="font-medium text-gray-900">
                    {metrics?.totalBidsWon || 0}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <span className="text-gray-600">Lost</span>
                  </div>
                  <span className="font-medium text-gray-900">
                    {metrics?.totalBidsLost || 0}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <span className="text-gray-600">Pending</span>
                  </div>
                  <span className="font-medium text-gray-900">
                    {(metrics?.totalBidsSubmitted || 0) - (metrics?.totalBidsWon || 0) - (metrics?.totalBidsLost || 0)}
                  </span>
                </div>
              </div>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="optimization" className="space-y-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Optimization Recommendations</h3>
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-blue-900">Improve Win Rate</h4>
                    <p className="text-blue-700 text-sm mt-1">
                      Your current win rate is below industry average. Consider reviewing your pricing strategy and value proposition.
                    </p>
                    <Button variant="outline" size="sm" className="mt-2">
                      View Strategy Guide
                    </Button>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-start space-x-3">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-green-900">Strong Accuracy</h4>
                    <p className="text-green-700 text-sm mt-1">
                      Your bid accuracy is excellent. Continue using data-driven estimation methods.
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-yellow-900">Market Positioning</h4>
                    <p className="text-yellow-700 text-sm mt-1">
                      Consider focusing on commercial projects where you have a higher win rate.
                    </p>
                    <Button variant="outline" size="sm" className="mt-2">
                      Analyze Market Focus
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle, AlertCircle, TrendingUp, Target, Calendar, DollarSign } from 'lucide-react';

interface AssessmentData {
  businessStatus: string;
  currentRevenue: string;
  employeeCount: string;
  yearsInBusiness: string;
  primaryServices: string[];
  serviceAreas: string[];
  goals: {
    revenueTarget: string;
    timeframe: string;
    growthAreas: string[];
    specificGoals: string;
  };
  challenges: {
    current: string[];
    biggest: string;
    resourceNeeds: string[];
  };
  marketPosition: {
    competitiveAdvantage: string;
    targetMarket: string;
    marketShare: string;
  };
  resources: {
    budget: string;
    timeCommitment: string;
    teamCapacity: string;
  };
}

interface GrowthPlanAssessmentProps {
  onComplete: (assessmentData: AssessmentData) => void;
  initialData?: Partial<AssessmentData>;
  isLoading?: boolean;
}

export function GrowthPlanAssessment({ 
  onComplete, 
  initialData, 
  isLoading = false 
}: GrowthPlanAssessmentProps) {
  const [currentTab, setCurrentTab] = useState('business-status');
  const [assessmentData, setAssessmentData] = useState<AssessmentData>({
    businessStatus: '',
    currentRevenue: '',
    employeeCount: '',
    yearsInBusiness: '',
    primaryServices: [],
    serviceAreas: [],
    goals: {
      revenueTarget: '',
      timeframe: '',
      growthAreas: [],
      specificGoals: ''
    },
    challenges: {
      current: [],
      biggest: '',
      resourceNeeds: []
    },
    marketPosition: {
      competitiveAdvantage: '',
      targetMarket: '',
      marketShare: ''
    },
    resources: {
      budget: '',
      timeCommitment: '',
      teamCapacity: ''
    }
  });

  const [completedSections, setCompletedSections] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (initialData) {
      setAssessmentData(prev => ({ ...prev, ...initialData }));
    }
  }, [initialData]);

  const updateAssessmentData = (section: string, data: any) => {
    setAssessmentData(prev => ({
      ...prev,
      [section]: typeof data === 'object' && !Array.isArray(data) 
        ? { ...prev[section as keyof AssessmentData], ...data }
        : data
    }));
  };

  const toggleArrayItem = (array: string[], item: string) => {
    return array.includes(item) 
      ? array.filter(i => i !== item)
      : [...array, item];
  };

  const validateSection = (sectionId: string): boolean => {
    switch (sectionId) {
      case 'business-status':
        return !!(assessmentData.businessStatus && assessmentData.currentRevenue && 
                 assessmentData.employeeCount && assessmentData.yearsInBusiness);
      case 'services':
        return assessmentData.primaryServices.length > 0 && assessmentData.serviceAreas.length > 0;
      case 'goals':
        return !!(assessmentData.goals.revenueTarget && assessmentData.goals.timeframe && 
                 assessmentData.goals.growthAreas.length > 0);
      case 'challenges':
        return !!(assessmentData.challenges.current.length > 0 && assessmentData.challenges.biggest);
      case 'market':
        return !!(assessmentData.marketPosition.competitiveAdvantage && 
                 assessmentData.marketPosition.targetMarket);
      case 'resources':
        return !!(assessmentData.resources.budget && assessmentData.resources.timeCommitment);
      default:
        return false;
    }
  };

  const handleSectionComplete = (sectionId: string) => {
    if (validateSection(sectionId)) {
      setCompletedSections(prev => new Set([...prev, sectionId]));
    }
  };

  const handleSubmit = () => {
    const allSections = ['business-status', 'services', 'goals', 'challenges', 'market', 'resources'];
    const allComplete = allSections.every(section => validateSection(section));
    
    if (allComplete) {
      onComplete(assessmentData);
    }
  };

  const tabs = [
    { id: 'business-status', label: 'Business Status', icon: TrendingUp },
    { id: 'services', label: 'Services', icon: Target },
    { id: 'goals', label: 'Goals', icon: Target },
    { id: 'challenges', label: 'Challenges', icon: AlertCircle },
    { id: 'market', label: 'Market Position', icon: TrendingUp },
    { id: 'resources', label: 'Resources', icon: DollarSign }
  ];

  const serviceOptions = [
    'Residential Construction', 'Commercial Construction', 'Industrial Construction',
    'Renovation/Remodeling', 'Electrical Work', 'Plumbing', 'HVAC', 'Roofing',
    'Concrete Work', 'Landscaping', 'Interior Design', 'Project Management'
  ];

  const challengeOptions = [
    'Finding qualified workers', 'Cash flow management', 'Winning bids',
    'Project management', 'Marketing and sales', 'Equipment costs',
    'Regulatory compliance', 'Insurance costs', 'Material costs',
    'Competition', 'Seasonal fluctuations', 'Technology adoption'
  ];

  const growthAreaOptions = [
    'Increase project size', 'Expand service offerings', 'Enter new markets',
    'Improve profit margins', 'Build team capacity', 'Enhance technology',
    'Develop partnerships', 'Improve efficiency', 'Brand recognition',
    'Customer retention', 'Quality certifications', 'Sustainability practices'
  ];

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">
          Business Growth Assessment
        </h2>
        <p className="text-gray-600">
          Help us understand your business to create a personalized growth plan
        </p>
      </div>

      <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-full">
        <TabsList className="grid w-full grid-cols-6 mb-8">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isCompleted = completedSections.has(tab.id);
            return (
              <TabsTrigger 
                key={tab.id} 
                value={tab.id}
                className="flex items-center gap-2"
              >
                {isCompleted ? (
                  <CheckCircle className="w-4 h-4 text-green-600" />
                ) : (
                  <Icon className="w-4 h-4" />
                )}
                <span className="hidden sm:inline">{tab.label}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        <TabsContent value="business-status">
          <Card className="p-6">
            <h3 className="text-xl font-semibold mb-4">Current Business Status</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="businessStatus">Business Stage</Label>
                <Select 
                  value={assessmentData.businessStatus} 
                  onValueChange={(value) => updateAssessmentData('businessStatus', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select business stage" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="startup">Startup (0-2 years)</SelectItem>
                    <SelectItem value="growing">Growing (2-5 years)</SelectItem>
                    <SelectItem value="established">Established (5-10 years)</SelectItem>
                    <SelectItem value="mature">Mature (10+ years)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="currentRevenue">Annual Revenue Range</Label>
                <Select 
                  value={assessmentData.currentRevenue} 
                  onValueChange={(value) => updateAssessmentData('currentRevenue', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select revenue range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="under-100k">Under $100K</SelectItem>
                    <SelectItem value="100k-250k">$100K - $250K</SelectItem>
                    <SelectItem value="250k-500k">$250K - $500K</SelectItem>
                    <SelectItem value="500k-1m">$500K - $1M</SelectItem>
                    <SelectItem value="1m-2m">$1M - $2M</SelectItem>
                    <SelectItem value="over-2m">Over $2M</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="employeeCount">Number of Employees</Label>
                <Select 
                  value={assessmentData.employeeCount} 
                  onValueChange={(value) => updateAssessmentData('employeeCount', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select employee count" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="just-me">Just me</SelectItem>
                    <SelectItem value="2-5">2-5 employees</SelectItem>
                    <SelectItem value="6-10">6-10 employees</SelectItem>
                    <SelectItem value="11-25">11-25 employees</SelectItem>
                    <SelectItem value="26-50">26-50 employees</SelectItem>
                    <SelectItem value="over-50">Over 50 employees</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="yearsInBusiness">Years in Business</Label>
                <Input
                  id="yearsInBusiness"
                  type="number"
                  value={assessmentData.yearsInBusiness}
                  onChange={(e) => updateAssessmentData('yearsInBusiness', e.target.value)}
                  placeholder="Enter years in business"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <Button 
                onClick={() => {
                  handleSectionComplete('business-status');
                  setCurrentTab('services');
                }}
                disabled={!validateSection('business-status')}
              >
                Continue to Services
              </Button>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="services">
          <Card className="p-6">
            <h3 className="text-xl font-semibold mb-4">Services & Markets</h3>
            
            <div className="mb-6">
              <Label>Primary Services (Select all that apply)</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-2">
                {serviceOptions.map(service => (
                  <label key={service} className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={assessmentData.primaryServices.includes(service)}
                      onChange={() => updateAssessmentData('primaryServices', 
                        toggleArrayItem(assessmentData.primaryServices, service)
                      )}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm">{service}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="mb-6">
              <Label>Service Areas</Label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2">
                {['Local (within 25 miles)', 'Regional (25-100 miles)', 'Statewide', 'Multi-state'].map(area => (
                  <label key={area} className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={assessmentData.serviceAreas.includes(area)}
                      onChange={() => updateAssessmentData('serviceAreas', 
                        toggleArrayItem(assessmentData.serviceAreas, area)
                      )}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm">{area}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex justify-between">
              <Button 
                variant="outline" 
                onClick={() => setCurrentTab('business-status')}
              >
                Back
              </Button>
              <Button 
                onClick={() => {
                  handleSectionComplete('services');
                  setCurrentTab('goals');
                }}
                disabled={!validateSection('services')}
              >
                Continue to Goals
              </Button>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="goals">
          <Card className="p-6">
            <h3 className="text-xl font-semibold mb-4">Growth Goals</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <Label htmlFor="revenueTarget">Revenue Target</Label>
                <Select 
                  value={assessmentData.goals.revenueTarget} 
                  onValueChange={(value) => updateAssessmentData('goals', { revenueTarget: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select target revenue" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="25-percent">25% increase</SelectItem>
                    <SelectItem value="50-percent">50% increase</SelectItem>
                    <SelectItem value="double">Double current revenue</SelectItem>
                    <SelectItem value="triple">Triple current revenue</SelectItem>
                    <SelectItem value="specific">Specific amount</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="timeframe">Timeframe</Label>
                <Select 
                  value={assessmentData.goals.timeframe} 
                  onValueChange={(value) => updateAssessmentData('goals', { timeframe: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select timeframe" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="6-months">6 months</SelectItem>
                    <SelectItem value="1-year">1 year</SelectItem>
                    <SelectItem value="2-years">2 years</SelectItem>
                    <SelectItem value="3-years">3 years</SelectItem>
                    <SelectItem value="5-years">5 years</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="mb-6">
              <Label>Growth Areas (Select all that apply)</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-2">
                {growthAreaOptions.map(area => (
                  <label key={area} className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={assessmentData.goals.growthAreas.includes(area)}
                      onChange={() => updateAssessmentData('goals', {
                        growthAreas: toggleArrayItem(assessmentData.goals.growthAreas, area)
                      })}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm">{area}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="mb-6">
              <Label htmlFor="specificGoals">Specific Goals & Vision</Label>
              <Textarea
                id="specificGoals"
                value={assessmentData.goals.specificGoals}
                onChange={(e) => updateAssessmentData('goals', { specificGoals: e.target.value })}
                placeholder="Describe your specific business goals and vision..."
                rows={4}
              />
            </div>

            <div className="flex justify-between">
              <Button 
                variant="outline" 
                onClick={() => setCurrentTab('services')}
              >
                Back
              </Button>
              <Button 
                onClick={() => {
                  handleSectionComplete('goals');
                  setCurrentTab('challenges');
                }}
                disabled={!validateSection('goals')}
              >
                Continue to Challenges
              </Button>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="challenges">
          <Card className="p-6">
            <h3 className="text-xl font-semibold mb-4">Current Challenges</h3>
            
            <div className="mb-6">
              <Label>Current Challenges (Select all that apply)</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-2">
                {challengeOptions.map(challenge => (
                  <label key={challenge} className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={assessmentData.challenges.current.includes(challenge)}
                      onChange={() => updateAssessmentData('challenges', {
                        current: toggleArrayItem(assessmentData.challenges.current, challenge)
                      })}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm">{challenge}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="mb-6">
              <Label htmlFor="biggestChallenge">Biggest Challenge</Label>
              <Textarea
                id="biggestChallenge"
                value={assessmentData.challenges.biggest}
                onChange={(e) => updateAssessmentData('challenges', { biggest: e.target.value })}
                placeholder="Describe your biggest business challenge..."
                rows={3}
              />
            </div>

            <div className="mb-6">
              <Label>Resource Needs (Select all that apply)</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-2">
                {['Funding', 'Equipment', 'Training', 'Marketing', 'Technology', 'Mentorship', 'Networking', 'Legal Support'].map(resource => (
                  <label key={resource} className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={assessmentData.challenges.resourceNeeds.includes(resource)}
                      onChange={() => updateAssessmentData('challenges', {
                        resourceNeeds: toggleArrayItem(assessmentData.challenges.resourceNeeds, resource)
                      })}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm">{resource}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex justify-between">
              <Button 
                variant="outline" 
                onClick={() => setCurrentTab('goals')}
              >
                Back
              </Button>
              <Button 
                onClick={() => {
                  handleSectionComplete('challenges');
                  setCurrentTab('market');
                }}
                disabled={!validateSection('challenges')}
              >
                Continue to Market Position
              </Button>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="market">
          <Card className="p-6">
            <h3 className="text-xl font-semibold mb-4">Market Position</h3>
            
            <div className="space-y-6">
              <div>
                <Label htmlFor="competitiveAdvantage">Competitive Advantage</Label>
                <Textarea
                  id="competitiveAdvantage"
                  value={assessmentData.marketPosition.competitiveAdvantage}
                  onChange={(e) => updateAssessmentData('marketPosition', { competitiveAdvantage: e.target.value })}
                  placeholder="What sets your business apart from competitors?"
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="targetMarket">Target Market</Label>
                <Textarea
                  id="targetMarket"
                  value={assessmentData.marketPosition.targetMarket}
                  onChange={(e) => updateAssessmentData('marketPosition', { targetMarket: e.target.value })}
                  placeholder="Describe your ideal customers and target market..."
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="marketShare">Market Share Assessment</Label>
                <Select 
                  value={assessmentData.marketPosition.marketShare} 
                  onValueChange={(value) => updateAssessmentData('marketPosition', { marketShare: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="How do you view your market position?" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new-entrant">New entrant</SelectItem>
                    <SelectItem value="small-player">Small player</SelectItem>
                    <SelectItem value="established-player">Established player</SelectItem>
                    <SelectItem value="market-leader">Market leader</SelectItem>
                    <SelectItem value="niche-specialist">Niche specialist</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-between mt-6">
              <Button 
                variant="outline" 
                onClick={() => setCurrentTab('challenges')}
              >
                Back
              </Button>
              <Button 
                onClick={() => {
                  handleSectionComplete('market');
                  setCurrentTab('resources');
                }}
                disabled={!validateSection('market')}
              >
                Continue to Resources
              </Button>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="resources">
          <Card className="p-6">
            <h3 className="text-xl font-semibold mb-4">Available Resources</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <Label htmlFor="budget">Growth Investment Budget</Label>
                <Select 
                  value={assessmentData.resources.budget} 
                  onValueChange={(value) => updateAssessmentData('resources', { budget: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select budget range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="under-5k">Under $5K</SelectItem>
                    <SelectItem value="5k-15k">$5K - $15K</SelectItem>
                    <SelectItem value="15k-50k">$15K - $50K</SelectItem>
                    <SelectItem value="50k-100k">$50K - $100K</SelectItem>
                    <SelectItem value="over-100k">Over $100K</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="timeCommitment">Time Commitment</Label>
                <Select 
                  value={assessmentData.resources.timeCommitment} 
                  onValueChange={(value) => updateAssessmentData('resources', { timeCommitment: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select time commitment" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="few-hours-week">Few hours per week</SelectItem>
                    <SelectItem value="part-time">Part-time (10-20 hours/week)</SelectItem>
                    <SelectItem value="significant">Significant (20-40 hours/week)</SelectItem>
                    <SelectItem value="full-time">Full-time focus</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="mb-6">
              <Label htmlFor="teamCapacity">Team Capacity</Label>
              <Textarea
                id="teamCapacity"
                value={assessmentData.resources.teamCapacity}
                onChange={(e) => updateAssessmentData('resources', { teamCapacity: e.target.value })}
                placeholder="Describe your team's capacity for growth initiatives..."
                rows={3}
              />
            </div>

            <div className="flex justify-between">
              <Button 
                variant="outline" 
                onClick={() => setCurrentTab('market')}
              >
                Back
              </Button>
              <Button 
                onClick={handleSubmit}
                disabled={!validateSection('resources') || isLoading}
                className="bg-yellow-500 hover:bg-yellow-600 text-black"
              >
                {isLoading ? 'Processing...' : 'Complete Assessment'}
              </Button>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="mt-8">
        <div className="bg-gray-100 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Assessment Progress</span>
            <span className="text-sm text-gray-600">
              {completedSections.size} of {tabs.length} sections completed
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-yellow-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(completedSections.size / tabs.length) * 100}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
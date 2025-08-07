'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  Calculator, 
  MapPin, 
  Building, 
  Clock, 
  DollarSign,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Loader2
} from 'lucide-react';

interface ProjectSpecification {
  projectName: string;
  projectType: 'RESIDENTIAL' | 'COMMERCIAL' | 'INDUSTRIAL' | 'INFRASTRUCTURE';
  location: string;
  description?: string;
  squareFootage?: number;
  stories?: number;
  estimatedDuration?: number;
  scope?: string[];
  specialRequirements?: string[];
}

interface BidGenerationOptions {
  includeRSMeansData?: boolean;
  includeArcGISData?: boolean;
  includeShovelsData?: boolean;
  includeHistoricalData?: boolean;
  includeMarketData?: boolean;
  overheadPercentage?: number;
  profitMargin?: number;
  contingencyPercentage?: number;
  riskTolerance?: 'LOW' | 'MEDIUM' | 'HIGH';
}

interface BidAnalysisResult {
  totalBidAmount: number;
  costBreakdown: {
    materials: number;
    labor: number;
    equipment: number;
    permits: number;
    overhead: number;
    profit: number;
    contingency: number;
  };
  confidenceScore: number;
  winProbability: number;
  riskScore: number;
  competitivenessScore: number;
  aiAnalysis: {
    strengths: string[];
    weaknesses: string[];
    opportunities: string[];
    risks: string[];
    recommendations: string[];
  };
  marketAnalysis: {
    averageMarketPrice: number;
    competitorRange: { min: number; max: number };
    marketConditions: string;
    pricingPosition: string;
  };
}

export default function BidGenerationForm() {
  const [projectSpec, setProjectSpec] = useState<ProjectSpecification>({
    projectName: '',
    projectType: 'RESIDENTIAL',
    location: '',
    description: '',
    squareFootage: undefined,
    stories: undefined,
    estimatedDuration: undefined,
    scope: [],
    specialRequirements: [],
  });

  const [options, setOptions] = useState<BidGenerationOptions>({
    includeRSMeansData: true,
    includeArcGISData: true,
    includeShovelsData: true,
    includeHistoricalData: true,
    includeMarketData: true,
    overheadPercentage: 15,
    profitMargin: 10,
    contingencyPercentage: 5,
    riskTolerance: 'MEDIUM',
  });

  const [bidResult, setBidResult] = useState<BidAnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [scopeInput, setScopeInput] = useState('');
  const [requirementInput, setRequirementInput] = useState('');

  const handleInputChange = (field: keyof ProjectSpecification, value: any) => {
    setProjectSpec(prev => ({ ...prev, [field]: value }));
  };

  const handleOptionsChange = (field: keyof BidGenerationOptions, value: any) => {
    setOptions(prev => ({ ...prev, [field]: value }));
  };

  const addScopeItem = () => {
    if (scopeInput.trim()) {
      setProjectSpec(prev => ({
        ...prev,
        scope: [...(prev.scope || []), scopeInput.trim()]
      }));
      setScopeInput('');
    }
  };

  const addRequirement = () => {
    if (requirementInput.trim()) {
      setProjectSpec(prev => ({
        ...prev,
        specialRequirements: [...(prev.specialRequirements || []), requirementInput.trim()]
      }));
      setRequirementInput('');
    }
  };

  const removeScopeItem = (index: number) => {
    setProjectSpec(prev => ({
      ...prev,
      scope: prev.scope?.filter((_, i) => i !== index) || []
    }));
  };

  const removeRequirement = (index: number) => {
    setProjectSpec(prev => ({
      ...prev,
      specialRequirements: prev.specialRequirements?.filter((_, i) => i !== index) || []
    }));
  };

  const generateBid = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/bids/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectSpec,
          options,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setBidResult(data.data);
        setStep(3);
      } else {
        console.error('Error generating bid:', data.error);
      }
    } catch (error) {
      console.error('Error generating bid:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveBid = async () => {
    if (!bidResult) return;

    try {
      const response = await fetch('/api/bids', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectSpec,
          bidAnalysis: bidResult,
          options,
        }),
      });

      const data = await response.json();
      if (data.success) {
        // Redirect to bid management or show success message
        window.location.href = '/member/bids';
      }
    } catch (error) {
      console.error('Error saving bid:', error);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBadgeColor = (score: number) => {
    if (score >= 80) return 'bg-green-100 text-green-800';
    if (score >= 60) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  if (step === 1) {
    return (
      <Card className="max-w-4xl mx-auto p-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Project Information</h2>
          <p className="text-gray-600">Enter the basic details about your construction project</p>
        </div>

        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="projectName">Project Name *</Label>
              <Input
                id="projectName"
                value={projectSpec.projectName}
                onChange={(e) => handleInputChange('projectName', e.target.value)}
                placeholder="Enter project name"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="projectType">Project Type *</Label>
              <Select
                value={projectSpec.projectType}
                onValueChange={(value) => handleInputChange('projectType', value)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="RESIDENTIAL">Residential</SelectItem>
                  <SelectItem value="COMMERCIAL">Commercial</SelectItem>
                  <SelectItem value="INDUSTRIAL">Industrial</SelectItem>
                  <SelectItem value="INFRASTRUCTURE">Infrastructure</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="location">Location *</Label>
            <div className="relative mt-1">
              <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                id="location"
                value={projectSpec.location}
                onChange={(e) => handleInputChange('location', e.target.value)}
                placeholder="Enter project location (city, state)"
                className="pl-10"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="description">Project Description</Label>
            <Textarea
              id="description"
              value={projectSpec.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Describe the project scope and requirements"
              className="mt-1"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <Label htmlFor="squareFootage">Square Footage</Label>
              <div className="relative mt-1">
                <Building className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="squareFootage"
                  type="number"
                  value={projectSpec.squareFootage || ''}
                  onChange={(e) => handleInputChange('squareFootage', parseInt(e.target.value) || undefined)}
                  placeholder="0"
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="stories">Number of Stories</Label>
              <Input
                id="stories"
                type="number"
                value={projectSpec.stories || ''}
                onChange={(e) => handleInputChange('stories', parseInt(e.target.value) || undefined)}
                placeholder="1"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="duration">Estimated Duration (days)</Label>
              <div className="relative mt-1">
                <Clock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="duration"
                  type="number"
                  value={projectSpec.estimatedDuration || ''}
                  onChange={(e) => handleInputChange('estimatedDuration', parseInt(e.target.value) || undefined)}
                  placeholder="30"
                  className="pl-10"
                />
              </div>
            </div>
          </div>

          <div>
            <Label>Project Scope</Label>
            <div className="mt-1 space-y-2">
              <div className="flex space-x-2">
                <Input
                  value={scopeInput}
                  onChange={(e) => setScopeInput(e.target.value)}
                  placeholder="Add scope item (e.g., Foundation work, Framing, Electrical)"
                  onKeyPress={(e) => e.key === 'Enter' && addScopeItem()}
                />
                <Button type="button" onClick={addScopeItem} variant="outline">
                  Add
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {projectSpec.scope?.map((item, index) => (
                  <Badge key={index} className="bg-blue-100 text-blue-800">
                    {item}
                    <button
                      onClick={() => removeScopeItem(index)}
                      className="ml-2 text-blue-600 hover:text-blue-800"
                    >
                      ×
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          <div>
            <Label>Special Requirements</Label>
            <div className="mt-1 space-y-2">
              <div className="flex space-x-2">
                <Input
                  value={requirementInput}
                  onChange={(e) => setRequirementInput(e.target.value)}
                  placeholder="Add special requirement (e.g., LEED certification, Historic preservation)"
                  onKeyPress={(e) => e.key === 'Enter' && addRequirement()}
                />
                <Button type="button" onClick={addRequirement} variant="outline">
                  Add
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {projectSpec.specialRequirements?.map((req, index) => (
                  <Badge key={index} className="bg-purple-100 text-purple-800">
                    {req}
                    <button
                      onClick={() => removeRequirement(index)}
                      className="ml-2 text-purple-600 hover:text-purple-800"
                    >
                      ×
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end mt-8">
          <Button
            onClick={() => setStep(2)}
            disabled={!projectSpec.projectName || !projectSpec.location}
            className="bg-yellow-600 hover:bg-yellow-700"
          >
            Next: Configure Options
          </Button>
        </div>
      </Card>
    );
  }

  if (step === 2) {
    return (
      <Card className="max-w-4xl mx-auto p-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Bid Generation Options</h2>
          <p className="text-gray-600">Configure data sources and financial parameters</p>
        </div>

        <div className="space-y-8">
          {/* Data Sources */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Data Sources</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={options.includeRSMeansData}
                  onChange={(e) => handleOptionsChange('includeRSMeansData', e.target.checked)}
                  className="rounded border-gray-300 text-yellow-600 focus:ring-yellow-500"
                />
                <div>
                  <p className="font-medium text-gray-900">RS Means Data</p>
                  <p className="text-sm text-gray-600">Industry-standard cost data</p>
                </div>
              </label>

              <label className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={options.includeArcGISData}
                  onChange={(e) => handleOptionsChange('includeArcGISData', e.target.checked)}
                  className="rounded border-gray-300 text-yellow-600 focus:ring-yellow-500"
                />
                <div>
                  <p className="font-medium text-gray-900">ArcGIS Market Data</p>
                  <p className="text-sm text-gray-600">Location-based market insights</p>
                </div>
              </label>

              <label className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={options.includeShovelsData}
                  onChange={(e) => handleOptionsChange('includeShovelsData', e.target.checked)}
                  className="rounded border-gray-300 text-yellow-600 focus:ring-yellow-500"
                />
                <div>
                  <p className="font-medium text-gray-900">Shovels Permit Data</p>
                  <p className="text-sm text-gray-600">Permit requirements and costs</p>
                </div>
              </label>

              <label className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={options.includeHistoricalData}
                  onChange={(e) => handleOptionsChange('includeHistoricalData', e.target.checked)}
                  className="rounded border-gray-300 text-yellow-600 focus:ring-yellow-500"
                />
                <div>
                  <p className="font-medium text-gray-900">Historical Data</p>
                  <p className="text-sm text-gray-600">Your past project performance</p>
                </div>
              </label>
            </div>
          </div>

          {/* Financial Parameters */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Financial Parameters</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <Label htmlFor="overhead">Overhead Percentage</Label>
                <div className="relative mt-1">
                  <Input
                    id="overhead"
                    type="number"
                    value={options.overheadPercentage || ''}
                    onChange={(e) => handleOptionsChange('overheadPercentage', parseFloat(e.target.value) || 0)}
                    placeholder="15"
                    min="0"
                    max="50"
                    step="0.5"
                  />
                  <span className="absolute right-3 top-3 text-gray-400">%</span>
                </div>
              </div>

              <div>
                <Label htmlFor="profit">Profit Margin</Label>
                <div className="relative mt-1">
                  <Input
                    id="profit"
                    type="number"
                    value={options.profitMargin || ''}
                    onChange={(e) => handleOptionsChange('profitMargin', parseFloat(e.target.value) || 0)}
                    placeholder="10"
                    min="0"
                    max="30"
                    step="0.5"
                  />
                  <span className="absolute right-3 top-3 text-gray-400">%</span>
                </div>
              </div>

              <div>
                <Label htmlFor="contingency">Contingency</Label>
                <div className="relative mt-1">
                  <Input
                    id="contingency"
                    type="number"
                    value={options.contingencyPercentage || ''}
                    onChange={(e) => handleOptionsChange('contingencyPercentage', parseFloat(e.target.value) || 0)}
                    placeholder="5"
                    min="0"
                    max="20"
                    step="0.5"
                  />
                  <span className="absolute right-3 top-3 text-gray-400">%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Risk Tolerance */}
          <div>
            <Label>Risk Tolerance</Label>
            <Select
              value={options.riskTolerance}
              onValueChange={(value) => handleOptionsChange('riskTolerance', value)}
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="LOW">Low - Conservative approach</SelectItem>
                <SelectItem value="MEDIUM">Medium - Balanced approach</SelectItem>
                <SelectItem value="HIGH">High - Aggressive approach</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex justify-between mt-8">
          <Button variant="outline" onClick={() => setStep(1)}>
            Back
          </Button>
          <Button
            onClick={generateBid}
            disabled={loading}
            className="bg-yellow-600 hover:bg-yellow-700"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating Bid...
              </>
            ) : (
              <>
                <Calculator className="mr-2 h-4 w-4" />
                Generate Bid
              </>
            )}
          </Button>
        </div>
      </Card>
    );
  }

  if (step === 3 && bidResult) {
    return (
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{projectSpec.projectName}</h2>
              <p className="text-gray-600">{projectSpec.projectType} • {projectSpec.location}</p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-gray-900">
                {formatCurrency(bidResult.totalBidAmount)}
              </p>
              <p className="text-gray-600">Total Bid Amount</p>
            </div>
          </div>
        </Card>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Win Probability</p>
                <p className={`text-2xl font-bold ${getScoreColor(bidResult.winProbability)}`}>
                  {bidResult.winProbability.toFixed(1)}%
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Confidence Score</p>
                <p className={`text-2xl font-bold ${getScoreColor(bidResult.confidenceScore)}`}>
                  {bidResult.confidenceScore.toFixed(1)}%
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-blue-500" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Risk Score</p>
                <p className={`text-2xl font-bold ${getScoreColor(100 - bidResult.riskScore)}`}>
                  {bidResult.riskScore.toFixed(1)}%
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-yellow-500" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Competitiveness</p>
                <p className={`text-2xl font-bold ${getScoreColor(bidResult.competitivenessScore)}`}>
                  {bidResult.competitivenessScore.toFixed(1)}%
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-purple-500" />
            </div>
          </Card>
        </div>

        {/* Cost Breakdown */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Cost Breakdown</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(bidResult.costBreakdown).map(([category, amount]) => (
              <div key={category} className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium text-gray-600 capitalize">
                  {category.replace(/([A-Z])/g, ' $1').trim()}
                </p>
                <p className="text-lg font-bold text-gray-900">
                  {formatCurrency(amount)}
                </p>
              </div>
            ))}
          </div>
        </Card>

        {/* AI Analysis */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Strengths & Opportunities</h3>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-green-900 mb-2">Strengths</h4>
                <ul className="space-y-1">
                  {bidResult.aiAnalysis.strengths.map((strength, index) => (
                    <li key={index} className="text-sm text-green-700 flex items-start">
                      <CheckCircle className="h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                      {strength}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-blue-900 mb-2">Opportunities</h4>
                <ul className="space-y-1">
                  {bidResult.aiAnalysis.opportunities.map((opportunity, index) => (
                    <li key={index} className="text-sm text-blue-700 flex items-start">
                      <TrendingUp className="h-4 w-4 text-blue-500 mr-2 mt-0.5 flex-shrink-0" />
                      {opportunity}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Risks & Recommendations</h3>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-red-900 mb-2">Risks</h4>
                <ul className="space-y-1">
                  {bidResult.aiAnalysis.risks.map((risk, index) => (
                    <li key={index} className="text-sm text-red-700 flex items-start">
                      <AlertTriangle className="h-4 w-4 text-red-500 mr-2 mt-0.5 flex-shrink-0" />
                      {risk}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-purple-900 mb-2">Recommendations</h4>
                <ul className="space-y-1">
                  {bidResult.aiAnalysis.recommendations.map((rec, index) => (
                    <li key={index} className="text-sm text-purple-700 flex items-start">
                      <CheckCircle className="h-4 w-4 text-purple-500 mr-2 mt-0.5 flex-shrink-0" />
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Card>
        </div>

        {/* Market Analysis */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Market Analysis</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <p className="text-sm font-medium text-gray-600">Your Bid</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(bidResult.totalBidAmount)}
              </p>
              <Badge className={getScoreBadgeColor(bidResult.competitivenessScore)}>
                {bidResult.marketAnalysis.pricingPosition}
              </Badge>
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-gray-600">Market Average</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(bidResult.marketAnalysis.averageMarketPrice)}
              </p>
              <p className="text-sm text-gray-600">
                {bidResult.marketAnalysis.marketConditions} conditions
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-gray-600">Competitor Range</p>
              <p className="text-lg font-bold text-gray-900">
                {formatCurrency(bidResult.marketAnalysis.competitorRange.min)} - {formatCurrency(bidResult.marketAnalysis.competitorRange.max)}
              </p>
              <p className="text-sm text-gray-600">Typical range</p>
            </div>
          </div>
        </Card>

        {/* Actions */}
        <div className="flex justify-between">
          <Button variant="outline" onClick={() => setStep(1)}>
            Start New Bid
          </Button>
          <div className="space-x-3">
            <Button variant="outline">
              Request Review
            </Button>
            <Button onClick={saveBid} className="bg-yellow-600 hover:bg-yellow-700">
              Save Bid
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
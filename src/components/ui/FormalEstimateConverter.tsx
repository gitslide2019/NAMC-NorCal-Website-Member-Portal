'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, 
  DollarSign, 
  Calendar, 
  AlertTriangle,
  CheckCircle,
  Download,
  TrendingUp,
  Clock,
  MapPin,
  Settings,
  BarChart3,
  Shield,
  Truck
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface CameraAnalysisResult {
  sessionId: string;
  timestamp: Date;
  sceneDescription: string;
  totalEstimatedCost: number;
  overallConfidence: number;
}

interface FormalEstimateRequest {
  cameraAnalysisId: string;
  projectDetails: {
    name: string;
    type: string;
    location: {
      latitude: number;
      longitude: number;
      address?: string;
      city?: string;
      state?: string;
      zipCode?: string;
    };
    timeline?: {
      startDate: string;
      endDate: string;
    };
  };
  businessParameters: {
    overheadPercentage: number;
    profitMarginPercentage: number;
    contingencyPercentage: number;
    bondingPercentage?: number;
    insurancePercentage?: number;
  };
  validationRequirements: {
    requirePhysicalVerification: boolean;
    confidenceThreshold: number;
    highRiskItemThreshold: number;
  };
}

interface FormalEstimateResponse {
  estimateId: string;
  projectName: string;
  totalEstimate: number;
  breakdown: {
    materials: number;
    labor: number;
    equipment: number;
    subtotal: number;
    overhead: number;
    profit: number;
    contingency: number;
    bonding?: number;
    insurance?: number;
    grandTotal: number;
  };
  confidence: {
    overall: number;
    highRiskItems: number;
    verificationRequired: number;
  };
  timeline: {
    estimatedDuration: number;
    criticalPath: string[];
    milestones: Array<{
      name: string;
      date: string;
      dependencies: string[];
    }>;
  };
  procurement: {
    immediateOrders: Array<{
      material: string;
      quantity: number;
      unit: string;
      estimatedCost: number;
      leadTime: number;
      supplier?: string;
    }>;
    longLeadItems: Array<{
      material: string;
      quantity: number;
      unit: string;
      estimatedCost: number;
      leadTime: number;
      orderBy: string;
    }>;
  };
  riskAssessment: {
    highRiskItems: Array<{
      item: string;
      risk: string;
      impact: 'low' | 'medium' | 'high';
      mitigation: string;
      additionalCost: number;
    }>;
    weatherFactors: string[];
    marketConditions: string[];
    regulatoryRisks: string[];
  };
  qualityControl: {
    inspectionPoints: string[];
    testingRequirements: string[];
    complianceChecks: string[];
  };
  exportOptions: {
    pdfUrl?: string;
    excelUrl?: string;
    csvUrl?: string;
  };
}

interface FormalEstimateConverterProps {
  cameraAnalysis: CameraAnalysisResult;
  onEstimateGenerated?: (estimate: FormalEstimateResponse) => void;
}

export function FormalEstimateConverter({ 
  cameraAnalysis, 
  onEstimateGenerated 
}: FormalEstimateConverterProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [formalEstimate, setFormalEstimate] = useState<FormalEstimateResponse | null>(null);
  const [currentStep, setCurrentStep] = useState<'setup' | 'generating' | 'results'>('setup');
  
  // Form state
  const [projectDetails, setProjectDetails] = useState({
    name: '',
    type: 'residential',
    location: {
      latitude: 37.7749,
      longitude: -122.4194,
      address: '',
      city: 'San Francisco',
      state: 'CA',
      zipCode: ''
    },
    timeline: {
      startDate: '',
      endDate: ''
    }
  });

  const [businessParameters, setBusinessParameters] = useState({
    overheadPercentage: 15,
    profitMarginPercentage: 10,
    contingencyPercentage: 5,
    bondingPercentage: 2,
    insurancePercentage: 3
  });

  const [validationRequirements, setValidationRequirements] = useState({
    requirePhysicalVerification: true,
    confidenceThreshold: 70,
    highRiskItemThreshold: 10000
  });

  const generateFormalEstimate = async () => {
    setIsGenerating(true);
    setCurrentStep('generating');

    try {
      const request: FormalEstimateRequest = {
        cameraAnalysisId: cameraAnalysis.sessionId,
        projectDetails,
        businessParameters,
        validationRequirements
      };

      const response = await fetch('/api/construction-assistant/estimate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        throw new Error('Failed to generate estimate');
      }

      const data = await response.json();
      setFormalEstimate(data.estimate);
      setCurrentStep('results');
      onEstimateGenerated?.(data.estimate);
    } catch (error) {
      console.error('Error generating formal estimate:', error);
      alert('Failed to generate formal estimate. Please try again.');
      setCurrentStep('setup');
    } finally {
      setIsGenerating(false);
    }
  };

  const exportEstimate = async (format: 'pdf' | 'excel' | 'csv') => {
    if (!formalEstimate) return;

    try {
      const url = formalEstimate.exportOptions[`${format}Url`];
      if (url) {
        window.open(url, '_blank');
      } else {
        // Fallback: download as JSON
        const dataStr = JSON.stringify(formalEstimate, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const downloadUrl = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = `formal-estimate-${formalEstimate.estimateId}.json`;
        link.click();
        URL.revokeObjectURL(downloadUrl);
      }
    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to export estimate. Please try again.');
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'text-red-600 bg-red-50';
      case 'medium': return 'text-orange-600 bg-orange-50';
      case 'low': return 'text-yellow-600 bg-yellow-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  if (currentStep === 'generating') {
    return (
      <Card className="p-8 text-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-6"
        />
        <h3 className="text-xl font-bold mb-2">Generating Formal Estimate</h3>
        <p className="text-gray-600 mb-4">
          Processing camera analysis with RS Means data and business intelligence...
        </p>
        <div className="space-y-2 text-sm text-gray-500">
          <div>✓ Analyzing construction elements</div>
          <div>✓ Calculating RS Means pricing</div>
          <div>✓ Applying location factors</div>
          <div>✓ Generating risk assessment</div>
          <div>✓ Creating procurement timeline</div>
        </div>
      </Card>
    );
  }

  if (currentStep === 'results' && formalEstimate) {
    return (
      <div className="space-y-6">
        {/* Estimate Header */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <FileText className="w-6 h-6 text-blue-600" />
                Formal Construction Estimate
              </h2>
              <p className="text-gray-600">
                Generated from camera analysis • ID: {formalEstimate.estimateId}
              </p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-green-600">
                ${formalEstimate.totalEstimate.toLocaleString()}
              </div>
              <div className="text-sm text-gray-500">
                {formalEstimate.confidence.overall}% confidence
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <Calendar className="w-6 h-6 text-blue-600 mx-auto mb-2" />
              <div className="font-semibold">{formalEstimate.timeline.estimatedDuration} days</div>
              <div className="text-sm text-gray-600">Duration</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <CheckCircle className="w-6 h-6 text-green-600 mx-auto mb-2" />
              <div className="font-semibold">{formalEstimate.confidence.overall}%</div>
              <div className="text-sm text-gray-600">Confidence</div>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-orange-600 mx-auto mb-2" />
              <div className="font-semibold">{formalEstimate.confidence.highRiskItems}</div>
              <div className="text-sm text-gray-600">High Risk Items</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <Shield className="w-6 h-6 text-purple-600 mx-auto mb-2" />
              <div className="font-semibold">{formalEstimate.confidence.verificationRequired}</div>
              <div className="text-sm text-gray-600">Need Verification</div>
            </div>
          </div>
        </Card>

        {/* Cost Breakdown */}
        <Card className="p-6">
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Cost Breakdown
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="flex justify-between">
                <span>Materials</span>
                <span className="font-medium">${formalEstimate.breakdown.materials.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Labor</span>
                <span className="font-medium">${formalEstimate.breakdown.labor.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Equipment</span>
                <span className="font-medium">${formalEstimate.breakdown.equipment.toLocaleString()}</span>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span className="font-medium">Subtotal</span>
                <span className="font-medium">${formalEstimate.breakdown.subtotal.toLocaleString()}</span>
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between">
                <span>Overhead</span>
                <span className="font-medium">${formalEstimate.breakdown.overhead.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Profit</span>
                <span className="font-medium">${formalEstimate.breakdown.profit.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Contingency</span>
                <span className="font-medium">${formalEstimate.breakdown.contingency.toLocaleString()}</span>
              </div>
              {formalEstimate.breakdown.bonding && (
                <div className="flex justify-between">
                  <span>Bonding</span>
                  <span className="font-medium">${formalEstimate.breakdown.bonding.toLocaleString()}</span>
                </div>
              )}
              {formalEstimate.breakdown.insurance && (
                <div className="flex justify-between">
                  <span>Insurance</span>
                  <span className="font-medium">${formalEstimate.breakdown.insurance.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between border-t pt-2 text-lg font-bold">
                <span>Grand Total</span>
                <span className="text-green-600">${formalEstimate.breakdown.grandTotal.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Timeline & Milestones */}
        <Card className="p-6">
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Project Timeline
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold mb-3">Critical Path</h4>
              <div className="space-y-2">
                {formalEstimate.timeline.criticalPath.map((item, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div>
              <h4 className="font-semibold mb-3">Key Milestones</h4>
              <div className="space-y-3">
                {formalEstimate.timeline.milestones.map((milestone, index) => (
                  <div key={index} className="border-l-2 border-blue-500 pl-4">
                    <div className="font-medium">{milestone.name}</div>
                    <div className="text-sm text-gray-600">{milestone.date}</div>
                    {milestone.dependencies.length > 0 && (
                      <div className="text-xs text-gray-500">
                        Depends on: {milestone.dependencies.join(', ')}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>

        {/* Procurement Planning */}
        <Card className="p-6">
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Truck className="w-5 h-5" />
            Procurement Planning
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold mb-3 text-green-600">Immediate Orders</h4>
              <div className="space-y-3">
                {formalEstimate.procurement.immediateOrders.map((item, index) => (
                  <Card key={index} className="p-3">
                    <div className="flex justify-between items-start mb-2">
                      <div className="font-medium">{item.material}</div>
                      <div className="text-right">
                        <div className="font-semibold">${item.estimatedCost.toLocaleString()}</div>
                        <div className="text-sm text-gray-500">{item.leadTime} days</div>
                      </div>
                    </div>
                    <div className="text-sm text-gray-600">
                      {item.quantity} {item.unit}
                      {item.supplier && <span className="ml-2">• {item.supplier}</span>}
                    </div>
                  </Card>
                ))}
              </div>
            </div>
            
            <div>
              <h4 className="font-semibold mb-3 text-orange-600">Long Lead Items</h4>
              <div className="space-y-3">
                {formalEstimate.procurement.longLeadItems.map((item, index) => (
                  <Card key={index} className="p-3">
                    <div className="flex justify-between items-start mb-2">
                      <div className="font-medium">{item.material}</div>
                      <div className="text-right">
                        <div className="font-semibold">${item.estimatedCost.toLocaleString()}</div>
                        <div className="text-sm text-orange-600">{item.leadTime} days</div>
                      </div>
                    </div>
                    <div className="text-sm text-gray-600">
                      {item.quantity} {item.unit}
                    </div>
                    <div className="text-sm text-orange-600 mt-1">
                      Order by: {item.orderBy}
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </Card>

        {/* Risk Assessment */}
        <Card className="p-6">
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Risk Assessment
          </h3>
          
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold mb-3">High Risk Items</h4>
              <div className="space-y-3">
                {formalEstimate.riskAssessment.highRiskItems.map((risk, index) => (
                  <Card key={index} className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div className="font-medium">{risk.item}</div>
                      <Badge className={getImpactColor(risk.impact)}>
                        {risk.impact} impact
                      </Badge>
                    </div>
                    <div className="text-sm text-gray-600 mb-2">{risk.risk}</div>
                    <div className="text-sm text-blue-600 mb-2">
                      <strong>Mitigation:</strong> {risk.mitigation}
                    </div>
                    <div className="text-sm font-medium text-red-600">
                      Additional Cost: ${risk.additionalCost.toLocaleString()}
                    </div>
                  </Card>
                ))}
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <h5 className="font-medium mb-2">Weather Factors</h5>
                <ul className="text-sm space-y-1">
                  {formalEstimate.riskAssessment.weatherFactors.map((factor, index) => (
                    <li key={index} className="flex items-center gap-1">
                      <div className="w-1 h-1 bg-blue-500 rounded-full"></div>
                      {factor}
                    </li>
                  ))}
                </ul>
              </div>
              
              <div>
                <h5 className="font-medium mb-2">Market Conditions</h5>
                <ul className="text-sm space-y-1">
                  {formalEstimate.riskAssessment.marketConditions.map((condition, index) => (
                    <li key={index} className="flex items-center gap-1">
                      <div className="w-1 h-1 bg-orange-500 rounded-full"></div>
                      {condition}
                    </li>
                  ))}
                </ul>
              </div>
              
              <div>
                <h5 className="font-medium mb-2">Regulatory Risks</h5>
                <ul className="text-sm space-y-1">
                  {formalEstimate.riskAssessment.regulatoryRisks.map((risk, index) => (
                    <li key={index} className="flex items-center gap-1">
                      <div className="w-1 h-1 bg-red-500 rounded-full"></div>
                      {risk}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </Card>

        {/* Quality Control */}
        <Card className="p-6">
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Quality Control Plan
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h4 className="font-semibold mb-3">Inspection Points</h4>
              <ul className="space-y-2">
                {formalEstimate.qualityControl.inspectionPoints.map((point, index) => (
                  <li key={index} className="flex items-center gap-2 text-sm">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    {point}
                  </li>
                ))}
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-3">Testing Requirements</h4>
              <ul className="space-y-2">
                {formalEstimate.qualityControl.testingRequirements.map((test, index) => (
                  <li key={index} className="flex items-center gap-2 text-sm">
                    <CheckCircle className="w-4 h-4 text-blue-500" />
                    {test}
                  </li>
                ))}
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-3">Compliance Checks</h4>
              <ul className="space-y-2">
                {formalEstimate.qualityControl.complianceChecks.map((check, index) => (
                  <li key={index} className="flex items-center gap-2 text-sm">
                    <CheckCircle className="w-4 h-4 text-purple-500" />
                    {check}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Card>

        {/* Export Options */}
        <Card className="p-6">
          <h3 className="text-xl font-bold mb-4">Export Options</h3>
          <div className="flex gap-3">
            <Button
              onClick={() => exportEstimate('pdf')}
              className="flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export PDF
            </Button>
            <Button
              onClick={() => exportEstimate('excel')}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export Excel
            </Button>
            <Button
              onClick={() => exportEstimate('csv')}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // Setup form
  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
          <TrendingUp className="w-6 h-6 text-blue-600" />
          Generate Formal Estimate
        </h2>
        <p className="text-gray-600 mb-6">
          Convert your camera analysis into a comprehensive formal estimate with RS Means pricing, 
          business intelligence, and project planning.
        </p>

        {/* Camera Analysis Summary */}
        <Card className="p-4 mb-6 bg-blue-50 border-blue-200">
          <h3 className="font-semibold mb-2">Source Camera Analysis</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Session ID:</span>
              <span className="ml-2 font-mono">{cameraAnalysis.sessionId.slice(-8)}</span>
            </div>
            <div>
              <span className="text-gray-600">Estimated Cost:</span>
              <span className="ml-2 font-semibold">${cameraAnalysis.totalEstimatedCost.toLocaleString()}</span>
            </div>
            <div>
              <span className="text-gray-600">Confidence:</span>
              <span className="ml-2 font-semibold">{cameraAnalysis.overallConfidence}%</span>
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Project Details */}
          <div>
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Project Details
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Project Name</label>
                <Input
                  value={projectDetails.name}
                  onChange={(e) => setProjectDetails(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter project name"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Project Type</label>
                <select
                  value={projectDetails.type}
                  onChange={(e) => setProjectDetails(prev => ({ ...prev, type: e.target.value }))}
                  className="w-full p-2 border rounded-md"
                >
                  <option value="residential">Residential</option>
                  <option value="commercial">Commercial</option>
                  <option value="industrial">Industrial</option>
                  <option value="renovation">Renovation</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Location</label>
                <Input
                  value={projectDetails.location.address}
                  onChange={(e) => setProjectDetails(prev => ({ 
                    ...prev, 
                    location: { ...prev.location, address: e.target.value }
                  }))}
                  placeholder="Project address"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-medium mb-1">City</label>
                  <Input
                    value={projectDetails.location.city}
                    onChange={(e) => setProjectDetails(prev => ({ 
                      ...prev, 
                      location: { ...prev.location, city: e.target.value }
                    }))}
                    placeholder="City"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">ZIP Code</label>
                  <Input
                    value={projectDetails.location.zipCode}
                    onChange={(e) => setProjectDetails(prev => ({ 
                      ...prev, 
                      location: { ...prev.location, zipCode: e.target.value }
                    }))}
                    placeholder="ZIP"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Business Parameters */}
          <div>
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Business Parameters
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Overhead Percentage ({businessParameters.overheadPercentage}%)
                </label>
                <input
                  type="range"
                  min="5"
                  max="30"
                  value={businessParameters.overheadPercentage}
                  onChange={(e) => setBusinessParameters(prev => ({ 
                    ...prev, 
                    overheadPercentage: parseInt(e.target.value)
                  }))}
                  className="w-full"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">
                  Profit Margin ({businessParameters.profitMarginPercentage}%)
                </label>
                <input
                  type="range"
                  min="5"
                  max="25"
                  value={businessParameters.profitMarginPercentage}
                  onChange={(e) => setBusinessParameters(prev => ({ 
                    ...prev, 
                    profitMarginPercentage: parseInt(e.target.value)
                  }))}
                  className="w-full"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">
                  Contingency ({businessParameters.contingencyPercentage}%)
                </label>
                <input
                  type="range"
                  min="2"
                  max="15"
                  value={businessParameters.contingencyPercentage}
                  onChange={(e) => setBusinessParameters(prev => ({ 
                    ...prev, 
                    contingencyPercentage: parseInt(e.target.value)
                  }))}
                  className="w-full"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">
                  Bonding ({businessParameters.bondingPercentage}%)
                </label>
                <input
                  type="range"
                  min="0"
                  max="5"
                  value={businessParameters.bondingPercentage}
                  onChange={(e) => setBusinessParameters(prev => ({ 
                    ...prev, 
                    bondingPercentage: parseInt(e.target.value)
                  }))}
                  className="w-full"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Validation Requirements */}
        <div className="mt-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Validation Requirements
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={validationRequirements.requirePhysicalVerification}
                onChange={(e) => setValidationRequirements(prev => ({ 
                  ...prev, 
                  requirePhysicalVerification: e.target.checked
                }))}
                className="rounded"
              />
              <label className="text-sm">Require physical verification</label>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">
                Confidence Threshold ({validationRequirements.confidenceThreshold}%)
              </label>
              <input
                type="range"
                min="50"
                max="95"
                value={validationRequirements.confidenceThreshold}
                onChange={(e) => setValidationRequirements(prev => ({ 
                  ...prev, 
                  confidenceThreshold: parseInt(e.target.value)
                }))}
                className="w-full"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">High Risk Threshold</label>
              <Input
                type="number"
                value={validationRequirements.highRiskItemThreshold}
                onChange={(e) => setValidationRequirements(prev => ({ 
                  ...prev, 
                  highRiskItemThreshold: parseInt(e.target.value) || 0
                }))}
                placeholder="Dollar amount"
              />
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <Button
            onClick={generateFormalEstimate}
            disabled={!projectDetails.name || isGenerating}
            className="flex items-center gap-2"
          >
            <TrendingUp className="w-4 h-4" />
            Generate Formal Estimate
          </Button>
          <Button
            onClick={() => setCurrentStep('setup')}
            variant="outline"
          >
            Reset Form
          </Button>
        </div>
      </Card>
    </div>
  );
}
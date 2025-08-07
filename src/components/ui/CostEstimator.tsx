'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Calculator, 
  Download, 
  Share2, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  MapPin,
  Clock,
  DollarSign,
  BarChart3,
  FileText,
  Camera,
  Lightbulb
} from 'lucide-react';
import { RSMeansLocation, MaterialSpecification, RSMeansEstimate } from '@/lib/services/rs-means-api.service';
import { useCostEstimator } from '@/hooks/useCostEstimator';

interface ProjectElement {
  id: string;
  element: string;
  specifications: MaterialSpecification[];
  quantity: number;
  unit: string;
  description?: string;
}

interface CostEstimatorProps {
  onEstimateGenerated?: (estimate: RSMeansEstimate) => void;
  initialLocation?: RSMeansLocation;
  projectType?: string;
}

export function CostEstimator({ onEstimateGenerated, initialLocation, projectType = 'residential' }: CostEstimatorProps) {
  const [projectElements, setProjectElements] = useState<ProjectElement[]>([]);
  const [location, setLocation] = useState<RSMeansLocation>(
    initialLocation || {
      latitude: 37.7749,
      longitude: -122.4194,
      city: 'San Francisco',
      state: 'CA',
      zipCode: '94102'
    }
  );
  const [overheadPercentage, setOverheadPercentage] = useState(15);
  const [profitPercentage, setProfitPercentage] = useState(10);
  const [activeTab, setActiveTab] = useState('specifications');
  const [showOptimizations, setShowOptimizations] = useState(false);

  const {
    estimate,
    isLoading,
    error,
    generateEstimate,
    exportEstimate,
    shareEstimate,
    optimizeEstimate
  } = useCostEstimator();

  const addProjectElement = () => {
    const newElement: ProjectElement = {
      id: `element-${Date.now()}`,
      element: '',
      specifications: [],
      quantity: 0,
      unit: 'SF',
      description: ''
    };
    setProjectElements([...projectElements, newElement]);
  };

  const updateProjectElement = (id: string, updates: Partial<ProjectElement>) => {
    setProjectElements(elements =>
      elements.map(element =>
        element.id === id ? { ...element, ...updates } : element
      )
    );
  };

  const removeProjectElement = (id: string) => {
    setProjectElements(elements => elements.filter(element => element.id !== id));
  };

  const addSpecification = (elementId: string) => {
    const newSpec: MaterialSpecification = {
      material: '',
      type: '',
      quantity: 0,
      unit: 'SF',
      quality: 'standard'
    };

    updateProjectElement(elementId, {
      specifications: [
        ...projectElements.find(e => e.id === elementId)?.specifications || [],
        newSpec
      ]
    });
  };

  const updateSpecification = (elementId: string, specIndex: number, updates: Partial<MaterialSpecification>) => {
    const element = projectElements.find(e => e.id === elementId);
    if (!element) return;

    const updatedSpecs = element.specifications.map((spec, index) =>
      index === specIndex ? { ...spec, ...updates } : spec
    );

    updateProjectElement(elementId, { specifications: updatedSpecs });
  };

  const handleGenerateEstimate = async () => {
    if (projectElements.length === 0) return;

    const elements = projectElements.map(element => ({
      element: element.element,
      specifications: element.specifications,
      quantity: element.quantity
    }));

    const result = await generateEstimate(
      elements,
      location,
      projectType,
      overheadPercentage,
      profitPercentage
    );

    if (result && onEstimateGenerated) {
      onEstimateGenerated(result);
    }
  };

  const handleOptimizeEstimate = async () => {
    if (!estimate) return;
    
    setShowOptimizations(true);
    await optimizeEstimate(estimate.estimateId || '');
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 0.8) return <Badge variant="default" className="bg-green-100 text-green-800">High Confidence</Badge>;
    if (confidence >= 0.6) return <Badge variant="default" className="bg-yellow-100 text-yellow-800">Medium Confidence</Badge>;
    return <Badge variant="default" className="bg-red-100 text-red-800">Low Confidence</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">RS Means Cost Estimator</h2>
          <p className="text-gray-600">Generate accurate construction cost estimates with AI-enhanced analysis</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            onClick={handleGenerateEstimate}
            disabled={isLoading || projectElements.length === 0}
            className="bg-yellow-500 hover:bg-yellow-600 text-black"
          >
            <Calculator className="w-4 h-4 mr-2" />
            {isLoading ? 'Generating...' : 'Generate Estimate'}
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="specifications">Project Specifications</TabsTrigger>
          <TabsTrigger value="estimate" disabled={!estimate}>Cost Breakdown</TabsTrigger>
          <TabsTrigger value="analysis" disabled={!estimate}>Analysis & Insights</TabsTrigger>
          <TabsTrigger value="optimization" disabled={!estimate}>Optimization</TabsTrigger>
        </TabsList>

        {/* Project Specifications Tab */}
        <TabsContent value="specifications" className="space-y-6">
          {/* Location Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <MapPin className="w-5 h-5 mr-2" />
                Project Location
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                <Input
                  value={location.city || ''}
                  onChange={(e) => setLocation({ ...location, city: e.target.value })}
                  placeholder="San Francisco"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                <Input
                  value={location.state || ''}
                  onChange={(e) => setLocation({ ...location, state: e.target.value })}
                  placeholder="CA"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ZIP Code</label>
                <Input
                  value={location.zipCode || ''}
                  onChange={(e) => setLocation({ ...location, zipCode: e.target.value })}
                  placeholder="94102"
                />
              </div>
            </CardContent>
          </Card>

          {/* Project Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Project Settings</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Overhead (%)</label>
                <Input
                  type="number"
                  value={overheadPercentage}
                  onChange={(e) => setOverheadPercentage(Number(e.target.value))}
                  min="0"
                  max="50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Profit (%)</label>
                <Input
                  type="number"
                  value={profitPercentage}
                  onChange={(e) => setProfitPercentage(Number(e.target.value))}
                  min="0"
                  max="50"
                />
              </div>
            </CardContent>
          </Card>

          {/* Project Elements */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Project Elements
                <Button onClick={addProjectElement} variant="outline" size="sm">
                  Add Element
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {projectElements.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No project elements added yet. Click "Add Element" to get started.</p>
                </div>
              ) : (
                projectElements.map((element) => (
                  <Card key={element.id} className="border-l-4 border-l-yellow-500">
                    <CardContent className="pt-4">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Element Type</label>
                          <Select
                            value={element.element}
                            onValueChange={(value) => updateProjectElement(element.id, { element: value })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select element" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="framing">Framing</SelectItem>
                              <SelectItem value="foundation">Foundation</SelectItem>
                              <SelectItem value="roofing">Roofing</SelectItem>
                              <SelectItem value="siding">Siding</SelectItem>
                              <SelectItem value="drywall">Drywall</SelectItem>
                              <SelectItem value="flooring">Flooring</SelectItem>
                              <SelectItem value="electrical">Electrical</SelectItem>
                              <SelectItem value="plumbing">Plumbing</SelectItem>
                              <SelectItem value="hvac">HVAC</SelectItem>
                              <SelectItem value="windows">Windows</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                          <Input
                            type="number"
                            value={element.quantity}
                            onChange={(e) => updateProjectElement(element.id, { quantity: Number(e.target.value) })}
                            min="0"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
                          <Select
                            value={element.unit}
                            onValueChange={(value) => updateProjectElement(element.id, { unit: value })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="SF">Square Feet</SelectItem>
                              <SelectItem value="LF">Linear Feet</SelectItem>
                              <SelectItem value="EA">Each</SelectItem>
                              <SelectItem value="CY">Cubic Yards</SelectItem>
                              <SelectItem value="SY">Square Yards</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex items-end">
                          <Button
                            onClick={() => removeProjectElement(element.id)}
                            variant="outline"
                            size="sm"
                            className="text-red-600 hover:text-red-700"
                          >
                            Remove
                          </Button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Description (Optional)</label>
                        <Input
                          value={element.description || ''}
                          onChange={(e) => updateProjectElement(element.id, { description: e.target.value })}
                          placeholder="Additional details about this element"
                        />
                      </div>

                      {/* Material Specifications */}
                      <div className="mt-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-sm font-medium text-gray-700">Material Specifications</h4>
                          <Button
                            onClick={() => addSpecification(element.id)}
                            variant="outline"
                            size="sm"
                          >
                            Add Specification
                          </Button>
                        </div>
                        
                        {element.specifications.map((spec, specIndex) => (
                          <div key={specIndex} className="grid grid-cols-1 md:grid-cols-5 gap-2 mb-2 p-3 bg-gray-50 rounded">
                            <Input
                              value={spec.material}
                              onChange={(e) => updateSpecification(element.id, specIndex, { material: e.target.value })}
                              placeholder="Material"
                            />
                            <Input
                              value={spec.type}
                              onChange={(e) => updateSpecification(element.id, specIndex, { type: e.target.value })}
                              placeholder="Type"
                            />
                            <Input
                              type="number"
                              value={spec.quantity}
                              onChange={(e) => updateSpecification(element.id, specIndex, { quantity: Number(e.target.value) })}
                              placeholder="Quantity"
                              min="0"
                            />
                            <Select
                              value={spec.quality || 'standard'}
                              onValueChange={(value: 'standard' | 'premium' | 'economy') => 
                                updateSpecification(element.id, specIndex, { quality: value })
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="economy">Economy</SelectItem>
                                <SelectItem value="standard">Standard</SelectItem>
                                <SelectItem value="premium">Premium</SelectItem>
                              </SelectContent>
                            </Select>
                            <Button
                              onClick={() => {
                                const updatedSpecs = element.specifications.filter((_, i) => i !== specIndex);
                                updateProjectElement(element.id, { specifications: updatedSpecs });
                              }}
                              variant="outline"
                              size="sm"
                              className="text-red-600"
                            >
                              Remove
                            </Button>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Cost Breakdown Tab */}
        <TabsContent value="estimate" className="space-y-6">
          {estimate && (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center">
                      <DollarSign className="h-8 w-8 text-green-600" />
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">Total Cost</p>
                        <p className="text-2xl font-bold text-gray-900">
                          ${estimate.grandTotal.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center">
                      <BarChart3 className="h-8 w-8 text-blue-600" />
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">Materials</p>
                        <p className="text-2xl font-bold text-gray-900">
                          ${estimate.totalMaterialCost.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center">
                      <Clock className="h-8 w-8 text-orange-600" />
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">Labor</p>
                        <p className="text-2xl font-bold text-gray-900">
                          ${estimate.totalLaborCost.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center">
                      <TrendingUp className="h-8 w-8 text-purple-600" />
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">Confidence</p>
                        <div className="flex items-center space-x-2">
                          <p className={`text-2xl font-bold ${getConfidenceColor(estimate.confidence)}`}>
                            {Math.round(estimate.confidence * 100)}%
                          </p>
                          {getConfidenceBadge(estimate.confidence)}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Detailed Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle>Detailed Cost Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {estimate.items.map((item, index) => (
                      <div key={index} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-gray-900">{item.description}</h4>
                          <div className="flex items-center space-x-2">
                            {getConfidenceBadge(item.confidence || 0.8)}
                            <span className="text-lg font-bold text-gray-900">
                              ${item.totalCost.toLocaleString()}
                            </span>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-gray-600">Materials:</span>
                            <span className="ml-2 font-medium">${item.materialCost.toLocaleString()}</span>
                          </div>
                          <div>
                            <span className="text-gray-600">Labor:</span>
                            <span className="ml-2 font-medium">${item.laborCost.toLocaleString()}</span>
                          </div>
                          <div>
                            <span className="text-gray-600">Equipment:</span>
                            <span className="ml-2 font-medium">${item.equipmentCost.toLocaleString()}</span>
                          </div>
                          <div>
                            <span className="text-gray-600">Labor Hours:</span>
                            <span className="ml-2 font-medium">{item.laborHours.toFixed(1)} hrs</span>
                          </div>
                        </div>
                        
                        <div className="mt-2 text-xs text-gray-500">
                          Item Code: {item.itemCode} | Source: {item.source} | Price Date: {item.priceDate}
                        </div>
                      </div>
                    ))}

                    {/* Summary Totals */}
                    <div className="border-t pt-4 space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Subtotal:</span>
                        <span className="font-medium">${estimate.totalCost.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Overhead ({overheadPercentage}%):</span>
                        <span className="font-medium">${estimate.overhead.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Profit ({profitPercentage}%):</span>
                        <span className="font-medium">${estimate.profit.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-lg font-bold border-t pt-2">
                        <span>Grand Total:</span>
                        <span>${estimate.grandTotal.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Export Actions */}
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">Export & Share</h3>
                      <p className="text-gray-600">Download or share your cost estimate</p>
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        onClick={() => exportEstimate(estimate.estimateId || '', 'pdf')}
                        variant="outline"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Export PDF
                      </Button>
                      <Button
                        onClick={() => exportEstimate(estimate.estimateId || '', 'excel')}
                        variant="outline"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Export Excel
                      </Button>
                      <Button
                        onClick={() => shareEstimate(estimate.estimateId || '')}
                        variant="outline"
                      >
                        <Share2 className="w-4 h-4 mr-2" />
                        Share
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* Analysis & Insights Tab */}
        <TabsContent value="analysis" className="space-y-6">
          {estimate && (
            <>
              {/* Market Adjustments */}
              {estimate.marketAdjustments && estimate.marketAdjustments.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <TrendingUp className="w-5 h-5 mr-2" />
                      Market Adjustments
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {estimate.marketAdjustments.map((adjustment, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                          <div>
                            <h4 className="font-medium text-gray-900">{adjustment.factor}</h4>
                            <p className="text-sm text-gray-600">{adjustment.reason}</p>
                          </div>
                          <div className="text-right">
                            <span className={`font-medium ${adjustment.adjustment > 0 ? 'text-red-600' : 'text-green-600'}`}>
                              {adjustment.adjustment > 0 ? '+' : ''}{(adjustment.adjustment * 100).toFixed(1)}%
                            </span>
                            <div className="text-xs text-gray-500">
                              Confidence: {Math.round(adjustment.confidence * 100)}%
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Confidence Interval */}
              {estimate.confidenceInterval && (
                <Card>
                  <CardHeader>
                    <CardTitle>Cost Range Analysis</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Low Estimate:</span>
                        <span className="font-medium text-green-600">
                          ${estimate.confidenceInterval.low.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Expected Cost:</span>
                        <span className="font-medium text-gray-900">
                          ${estimate.confidenceInterval.mean.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">High Estimate:</span>
                        <span className="font-medium text-red-600">
                          ${estimate.confidenceInterval.high.toLocaleString()}
                        </span>
                      </div>
                      
                      <div className="mt-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-gray-600">Confidence Level</span>
                          <span className="text-sm font-medium">
                            {Math.round(estimate.confidenceInterval.confidence * 100)}%
                          </span>
                        </div>
                        <Progress 
                          value={estimate.confidenceInterval.confidence * 100} 
                          className="h-2"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Cross Validation Results */}
              {estimate.crossValidation && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Camera className="w-5 h-5 mr-2" />
                      Camera vs RS Means Validation
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div className="text-center">
                        <p className="text-sm text-gray-600">Camera Confidence</p>
                        <p className="text-2xl font-bold text-blue-600">
                          {Math.round(estimate.crossValidation.cameraConfidence * 100)}%
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-gray-600">RS Means Confidence</p>
                        <p className="text-2xl font-bold text-green-600">
                          {Math.round(estimate.crossValidation.rsMeansConfidence * 100)}%
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-gray-600">Combined Confidence</p>
                        <p className="text-2xl font-bold text-purple-600">
                          {Math.round(estimate.crossValidation.combinedConfidence * 100)}%
                        </p>
                      </div>
                    </div>

                    <div className="mb-4">
                      <h4 className="font-medium text-gray-900 mb-2">Recommendation</h4>
                      <Badge 
                        variant={
                          estimate.crossValidation.recommendation === 'use_average' ? 'default' :
                          estimate.crossValidation.recommendation === 'requires_verification' ? 'destructive' :
                          'secondary'
                        }
                      >
                        {estimate.crossValidation.recommendation.replace('_', ' ').toUpperCase()}
                      </Badge>
                    </div>

                    {estimate.crossValidation.discrepancies.length > 0 && (
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">Discrepancies Found</h4>
                        <div className="space-y-2">
                          {estimate.crossValidation.discrepancies.map((discrepancy, index) => (
                            <div key={index} className="p-3 bg-yellow-50 border border-yellow-200 rounded">
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-medium text-gray-900">{discrepancy.item}</span>
                                <span className="text-sm text-red-600">
                                  ${discrepancy.difference.toLocaleString()} difference
                                </span>
                              </div>
                              <div className="text-sm text-gray-600">
                                Camera: ${discrepancy.cameraEstimate.toLocaleString()} | 
                                RS Means: ${discrepancy.rsMeansEstimate.toLocaleString()}
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                Possible reasons: {discrepancy.possibleReasons.join(', ')}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>

        {/* Optimization Tab */}
        <TabsContent value="optimization" className="space-y-6">
          {estimate && (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Cost Optimization</h3>
                  <p className="text-gray-600">AI-powered suggestions to reduce project costs</p>
                </div>
                <Button
                  onClick={handleOptimizeEstimate}
                  disabled={isLoading}
                  className="bg-yellow-500 hover:bg-yellow-600 text-black"
                >
                  <Lightbulb className="w-4 h-4 mr-2" />
                  {isLoading ? 'Analyzing...' : 'Optimize Costs'}
                </Button>
              </div>

              {estimate.pricingOptimization && (
                <>
                  {/* Optimization Summary */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Optimization Summary</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="text-center">
                          <p className="text-sm text-gray-600">Original Estimate</p>
                          <p className="text-2xl font-bold text-gray-900">
                            ${estimate.pricingOptimization.originalEstimate.toLocaleString()}
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-sm text-gray-600">Optimized Estimate</p>
                          <p className="text-2xl font-bold text-green-600">
                            ${estimate.pricingOptimization.optimizedEstimate.toLocaleString()}
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-sm text-gray-600">Potential Savings</p>
                          <p className="text-2xl font-bold text-green-600">
                            ${estimate.pricingOptimization.savings.toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Recommendations */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Optimization Recommendations</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {estimate.pricingOptimization.recommendations.map((rec, index) => (
                          <div key={index} className="border rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                              <div>
                                <h4 className="font-medium text-gray-900">{rec.category.replace('_', ' ').toUpperCase()}</h4>
                                <p className="text-sm text-gray-600">{rec.suggestion}</p>
                              </div>
                              <div className="text-right">
                                <span className="text-lg font-bold text-green-600">
                                  ${rec.potentialSavings.toLocaleString()}
                                </span>
                                <div className="text-xs text-gray-500">savings</div>
                              </div>
                            </div>
                            
                            <div className="flex items-center space-x-4 text-sm">
                              <Badge 
                                variant={
                                  rec.riskLevel === 'low' ? 'default' :
                                  rec.riskLevel === 'medium' ? 'secondary' :
                                  'destructive'
                                }
                              >
                                {rec.riskLevel} risk
                              </Badge>
                              <Badge variant="outline">
                                {rec.implementationDifficulty} to implement
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Material Substitutions */}
                  {estimate.pricingOptimization.materialSubstitutions.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Material Substitutions</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {estimate.pricingOptimization.materialSubstitutions.map((sub, index) => (
                            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                              <div>
                                <h4 className="font-medium text-gray-900">
                                  {sub.original} → {sub.substitute}
                                </h4>
                                <p className="text-sm text-gray-600">{sub.qualityImpact}</p>
                                <p className="text-xs text-gray-500">Availability: {sub.availability}</p>
                              </div>
                              <div className="text-right">
                                <span className={`font-medium ${sub.costDifference < 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  {sub.costDifference < 0 ? '-' : '+'}${Math.abs(sub.costDifference).toLocaleString()}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
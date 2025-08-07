'use client';

import React from 'react';
import { CostEstimator } from '@/components/ui/CostEstimator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calculator, TrendingUp, BarChart3, Lightbulb } from 'lucide-react';

export default function CostEstimatorPage() {
  const handleEstimateGenerated = (estimate: any) => {
    console.log('Estimate generated:', estimate);
    // Handle the generated estimate (e.g., save to state, navigate to results)
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center mb-4">
            <Calculator className="w-8 h-8 text-yellow-500 mr-3" />
            <h1 className="text-3xl font-bold text-gray-900">RS Means Cost Estimator</h1>
          </div>
          <p className="text-lg text-gray-600 max-w-3xl">
            Generate accurate construction cost estimates using RS Means data enhanced with AI analysis, 
            local market conditions, and camera-based validation.
          </p>
        </div>

        {/* Feature Highlights */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <Calculator className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <h3 className="text-lg font-semibold text-gray-900">RS Means Data</h3>
                  <p className="text-sm text-gray-600">Industry-standard cost database</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <TrendingUp className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <h3 className="text-lg font-semibold text-gray-900">Market Analysis</h3>
                  <p className="text-sm text-gray-600">Real-time market conditions</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <BarChart3 className="h-8 w-8 text-purple-600" />
                <div className="ml-4">
                  <h3 className="text-lg font-semibold text-gray-900">AI Enhancement</h3>
                  <p className="text-sm text-gray-600">Machine learning optimization</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <Lightbulb className="h-8 w-8 text-orange-600" />
                <div className="ml-4">
                  <h3 className="text-lg font-semibold text-gray-900">Smart Insights</h3>
                  <p className="text-sm text-gray-600">Cost optimization suggestions</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Cost Estimator Component */}
        <CostEstimator
          onEstimateGenerated={handleEstimateGenerated}
          projectType="residential"
        />
      </div>
    </div>
  );
}
'use client';

import { useState, useCallback } from 'react';
import { RSMeansEstimate, RSMeansLocation, MaterialSpecification } from '@/lib/services/rs-means-api.service';

interface CostEstimatorState {
  estimate: (RSMeansEstimate & {
    marketAdjustments?: any[];
    confidenceInterval?: any;
    pricingOptimization?: any;
    crossValidation?: any;
  }) | null;
  isLoading: boolean;
  error: string | null;
}

export function useCostEstimator() {
  const [state, setState] = useState<CostEstimatorState>({
    estimate: null,
    isLoading: false,
    error: null
  });

  const generateEstimate = useCallback(async (
    elements: Array<{
      element: string;
      specifications: MaterialSpecification[];
      quantity: number;
    }>,
    location: RSMeansLocation,
    projectType: string,
    overheadPercentage: number = 15,
    profitPercentage: number = 10
  ) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await fetch('/api/construction-assistant/estimate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          elements,
          location,
          projectType,
          overheadPercentage,
          profitPercentage
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }

      setState(prev => ({
        ...prev,
        estimate: data.estimate,
        isLoading: false
      }));

      return data.estimate;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate estimate';
      setState(prev => ({
        ...prev,
        error: errorMessage,
        isLoading: false
      }));
      return null;
    }
  }, []);

  const exportEstimate = useCallback(async (estimateId: string, format: 'pdf' | 'excel') => {
    try {
      const response = await fetch(`/api/construction-assistant/estimate/${estimateId}/export`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ format }),
      });

      if (!response.ok) {
        throw new Error(`Export failed: ${response.statusText}`);
      }

      // Handle file download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `cost-estimate.${format === 'pdf' ? 'pdf' : 'xlsx'}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Export failed:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Export failed'
      }));
    }
  }, []);

  const shareEstimate = useCallback(async (estimateId: string) => {
    try {
      const response = await fetch(`/api/construction-assistant/estimate/${estimateId}/share`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Share failed: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Copy share URL to clipboard
      if (navigator.clipboard && data.shareUrl) {
        await navigator.clipboard.writeText(data.shareUrl);
        alert('Share link copied to clipboard!');
      } else {
        alert(`Share URL: ${data.shareUrl}`);
      }
    } catch (error) {
      console.error('Share failed:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Share failed'
      }));
    }
  }, []);

  const optimizeEstimate = useCallback(async (estimateId: string) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await fetch(`/api/construction-assistant/estimate/${estimateId}/optimize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Optimization failed: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }

      setState(prev => ({
        ...prev,
        estimate: prev.estimate ? {
          ...prev.estimate,
          pricingOptimization: data.optimization
        } : null,
        isLoading: false
      }));

      return data.optimization;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Optimization failed';
      setState(prev => ({
        ...prev,
        error: errorMessage,
        isLoading: false
      }));
      return null;
    }
  }, []);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  const resetEstimate = useCallback(() => {
    setState({
      estimate: null,
      isLoading: false,
      error: null
    });
  }, []);

  return {
    estimate: state.estimate,
    isLoading: state.isLoading,
    error: state.error,
    generateEstimate,
    exportEstimate,
    shareEstimate,
    optimizeEstimate,
    clearError,
    resetEstimate
  };
}
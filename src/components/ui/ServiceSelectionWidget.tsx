'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ScheduleService } from '@/hooks/useContractorScheduling';

interface ServiceSelectionWidgetProps {
  contractorId: string;
  onServiceSelect: (service: ScheduleService) => void;
  selectedServiceId?: string;
}

export function ServiceSelectionWidget({ 
  contractorId, 
  onServiceSelect, 
  selectedServiceId 
}: ServiceSelectionWidgetProps) {
  const [services, setServices] = useState<ScheduleService[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchServices = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/scheduling/services?contractorId=${contractorId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch services');
        }

        const servicesData = await response.json();
        setServices(servicesData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch services');
      } finally {
        setLoading(false);
      }
    };

    if (contractorId) {
      fetchServices();
    }
  }, [contractorId]);

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (hours === 0) {
      return `${mins} min`;
    } else if (mins === 0) {
      return `${hours} hr`;
    } else {
      return `${hours} hr ${mins} min`;
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price);
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-6">
        <div className="text-center text-red-600">
          <p>{error}</p>
          <Button 
            onClick={() => window.location.reload()} 
            className="mt-2"
            variant="outline"
          >
            Try Again
          </Button>
        </div>
      </Card>
    );
  }

  if (services.length === 0) {
    return (
      <Card className="p-6">
        <div className="text-center text-gray-500">
          <p>No services available for booking at this time.</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Select a Service</h3>
      
      <div className="space-y-3">
        {services.map((service) => (
          <div
            key={service.id}
            className={`border rounded-lg p-4 cursor-pointer transition-colors ${
              selectedServiceId === service.id
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => onServiceSelect(service)}
          >
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h4 className="font-medium text-gray-900">{service.serviceName}</h4>
                {service.description && (
                  <p className="text-sm text-gray-600 mt-1">{service.description}</p>
                )}
                
                <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                  <span>Duration: {formatDuration(service.duration)}</span>
                  {service.category && (
                    <span>Category: {service.category}</span>
                  )}
                </div>

                {service.requirements && service.requirements.length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs text-gray-500 mb-1">Requirements:</p>
                    <ul className="text-xs text-gray-600 list-disc list-inside">
                      {service.requirements.map((req, index) => (
                        <li key={index}>{req}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div className="text-right ml-4">
                <div className="text-lg font-semibold text-gray-900">
                  {formatPrice(service.price)}
                </div>
                {service.depositRequired && service.depositAmount && (
                  <div className="text-sm text-gray-500">
                    Deposit: {formatPrice(service.depositAmount)}
                  </div>
                )}
              </div>
            </div>

            {selectedServiceId === service.id && (
              <div className="mt-3 pt-3 border-t border-blue-200">
                <div className="flex items-center text-sm text-blue-600">
                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Selected
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}
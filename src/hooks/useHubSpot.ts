import { useState, useCallback } from 'react';

interface UseHubSpotSyncOptions {
  onSuccess?: (data: any) => void;
  onError?: (error: Error) => void;
}

interface HubSpotContactData {
  userId: string;
  properties: {
    firstname: string;
    lastname: string;
    email: string;
    company?: string;
    phone?: string;
    jobtitle?: string;
    specialties?: string;
    membership_tier?: string;
    membership_status?: string;
    years_experience?: string;
    certifications?: string;
  };
}

interface HubSpotDealData {
  projectId: string;
  memberId: string;
  dealName: string;
  amount: number;
  closeDate: string;
  projectType?: string;
  location?: string;
  budgetRange?: string;
}

export function useHubSpotSync(options: UseHubSpotSyncOptions = {}) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const syncContact = useCallback(async (contactData: HubSpotContactData) => {
    setIsSyncing(true);
    setError(null);

    try {
      const response = await fetch('/api/hubspot/contacts/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(contactData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to sync contact');
      }

      const data = await response.json();
      options.onSuccess?.(data);
      return data;
    } catch (err) {
      const error = err as Error;
      setError(error);
      options.onError?.(error);
      throw error;
    } finally {
      setIsSyncing(false);
    }
  }, [options]);

  const createDeal = useCallback(async (dealData: HubSpotDealData) => {
    setIsSyncing(true);
    setError(null);

    try {
      const response = await fetch('/api/hubspot/deals/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dealData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create deal');
      }

      const data = await response.json();
      options.onSuccess?.(data);
      return data;
    } catch (err) {
      const error = err as Error;
      setError(error);
      options.onError?.(error);
      throw error;
    } finally {
      setIsSyncing(false);
    }
  }, [options]);

  return {
    syncContact,
    createDeal,
    isSyncing,
    error,
  };
}

export function useHubSpotForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const submitForm = useCallback(async (formId: string, fields: Record<string, string>) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/hubspot/forms/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          formId,
          fields: Object.entries(fields).map(([name, value]) => ({ name, value })),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit form');
      }

      return await response.json();
    } catch (err) {
      const error = err as Error;
      setError(error);
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  return {
    submitForm,
    isSubmitting,
    error,
  };
}

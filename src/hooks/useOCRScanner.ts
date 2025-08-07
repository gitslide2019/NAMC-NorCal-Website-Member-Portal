import { useState, useCallback } from 'react';
import { OCRExtractedData, BusinessCardData, ContactCreationResult } from '@/lib/services/ocr-business-card.service';

interface NetworkingOpportunities {
  recentScans: BusinessCardData[];
  pendingFollowUps: BusinessCardData[];
  potentialMembers: BusinessCardData[];
}

interface UseOCRScannerReturn {
  // State
  isScanning: boolean;
  isProcessing: boolean;
  isCreatingContact: boolean;
  businessCards: BusinessCardData[];
  currentCard: BusinessCardData | null;
  networkingOpportunities: NetworkingOpportunities | null;
  error: string | null;
  
  // Actions
  scanBusinessCard: (file: File) => Promise<BusinessCardData | null>;
  getBusinessCards: () => Promise<void>;
  getBusinessCard: (id: string) => Promise<BusinessCardData | null>;
  updateBusinessCard: (id: string, updates: Partial<OCRExtractedData>) => Promise<BusinessCardData | null>;
  createContact: (businessCardId: string, verifiedData?: Partial<OCRExtractedData>) => Promise<ContactCreationResult | null>;
  inviteToMembership: (businessCardId: string) => Promise<boolean>;
  createNetworkingTask: (businessCardId: string, taskType?: string, dueDate?: Date) => Promise<boolean>;
  getNetworkingOpportunities: () => Promise<void>;
  deleteBusinessCard: (id: string) => Promise<boolean>;
  clearError: () => void;
}

export function useOCRScanner(): UseOCRScannerReturn {
  const [isScanning, setIsScanning] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCreatingContact, setIsCreatingContact] = useState(false);
  const [businessCards, setBusinessCards] = useState<BusinessCardData[]>([]);
  const [currentCard, setCurrentCard] = useState<BusinessCardData | null>(null);
  const [networkingOpportunities, setNetworkingOpportunities] = useState<NetworkingOpportunities | null>(null);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const scanBusinessCard = useCallback(async (file: File): Promise<BusinessCardData | null> => {
    try {
      setIsScanning(true);
      setError(null);

      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch('/api/ocr/scan', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to scan business card');
      }

      if (data.success) {
        setCurrentCard(data.businessCard);
        return data.businessCard;
      }

      return null;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to scan business card';
      setError(errorMessage);
      console.error('Scan error:', err);
      return null;
    } finally {
      setIsScanning(false);
    }
  }, []);

  const getBusinessCards = useCallback(async (): Promise<void> => {
    try {
      setIsProcessing(true);
      setError(null);

      const response = await fetch('/api/ocr/business-cards');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch business cards');
      }

      if (data.success) {
        setBusinessCards(data.businessCards);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch business cards';
      setError(errorMessage);
      console.error('Fetch error:', err);
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const getBusinessCard = useCallback(async (id: string): Promise<BusinessCardData | null> => {
    try {
      setIsProcessing(true);
      setError(null);

      const response = await fetch(`/api/ocr/business-cards/${id}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch business card');
      }

      if (data.success) {
        setCurrentCard(data.businessCard);
        return data.businessCard;
      }

      return null;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch business card';
      setError(errorMessage);
      console.error('Fetch error:', err);
      return null;
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const updateBusinessCard = useCallback(async (
    id: string, 
    updates: Partial<OCRExtractedData>
  ): Promise<BusinessCardData | null> => {
    try {
      setIsProcessing(true);
      setError(null);

      const response = await fetch(`/api/ocr/business-cards/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update business card');
      }

      if (data.success) {
        setCurrentCard(data.businessCard);
        
        // Update in the list if it exists
        setBusinessCards(prev => 
          prev.map(card => card.id === id ? data.businessCard : card)
        );
        
        return data.businessCard;
      }

      return null;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update business card';
      setError(errorMessage);
      console.error('Update error:', err);
      return null;
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const createContact = useCallback(async (
    businessCardId: string,
    verifiedData?: Partial<OCRExtractedData>
  ): Promise<ContactCreationResult | null> => {
    try {
      setIsCreatingContact(true);
      setError(null);

      const response = await fetch('/api/ocr/business-cards', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          businessCardId,
          verifiedData,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create contact');
      }

      if (data.success) {
        // Update the business card status
        setBusinessCards(prev =>
          prev.map(card =>
            card.id === businessCardId
              ? { ...card, contactCreated: true }
              : card
          )
        );

        if (currentCard?.id === businessCardId) {
          setCurrentCard(prev => prev ? { ...prev, contactCreated: true } : null);
        }

        return data.result;
      }

      return null;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create contact';
      setError(errorMessage);
      console.error('Create contact error:', err);
      return null;
    } finally {
      setIsCreatingContact(false);
    }
  }, [currentCard]);

  const deleteBusinessCard = useCallback(async (id: string): Promise<boolean> => {
    try {
      setIsProcessing(true);
      setError(null);

      const response = await fetch(`/api/ocr/business-cards/${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete business card');
      }

      if (data.success) {
        // Remove from the list
        setBusinessCards(prev => prev.filter(card => card.id !== id));
        
        // Clear current card if it's the deleted one
        if (currentCard?.id === id) {
          setCurrentCard(null);
        }

        return true;
      }

      return false;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete business card';
      setError(errorMessage);
      console.error('Delete error:', err);
      return false;
    } finally {
      setIsProcessing(false);
    }
  }, [currentCard]);

  const inviteToMembership = useCallback(async (businessCardId: string): Promise<boolean> => {
    try {
      setIsProcessing(true);
      setError(null);

      const response = await fetch('/api/ocr/business-cards/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ businessCardId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send membership invitation');
      }

      return data.success;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send membership invitation';
      setError(errorMessage);
      console.error('Invite error:', err);
      return false;
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const createNetworkingTask = useCallback(async (
    businessCardId: string,
    taskType: string = 'follow_up',
    dueDate?: Date
  ): Promise<boolean> => {
    try {
      setIsProcessing(true);
      setError(null);

      const response = await fetch('/api/ocr/networking-tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          businessCardId,
          taskType,
          dueDate: dueDate?.toISOString(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create networking task');
      }

      return data.success;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create networking task';
      setError(errorMessage);
      console.error('Create task error:', err);
      return false;
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const getNetworkingOpportunities = useCallback(async (): Promise<void> => {
    try {
      setIsProcessing(true);
      setError(null);

      const response = await fetch('/api/ocr/networking-tasks');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch networking opportunities');
      }

      if (data.success) {
        setNetworkingOpportunities(data.opportunities);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch networking opportunities';
      setError(errorMessage);
      console.error('Fetch opportunities error:', err);
    } finally {
      setIsProcessing(false);
    }
  }, []);

  return {
    // State
    isScanning,
    isProcessing,
    isCreatingContact,
    businessCards,
    currentCard,
    networkingOpportunities,
    error,
    
    // Actions
    scanBusinessCard,
    getBusinessCards,
    getBusinessCard,
    updateBusinessCard,
    createContact,
    inviteToMembership,
    createNetworkingTask,
    getNetworkingOpportunities,
    deleteBusinessCard,
    clearError,
  };
}
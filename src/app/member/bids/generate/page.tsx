import { Metadata } from 'next';
import BidGenerationForm from '@/components/ui/BidGenerationForm';

export const metadata: Metadata = {
  title: 'Generate Bid | NAMC Member Portal',
  description: 'AI-powered bid generation with RS Means data, ArcGIS insights, and market analysis',
};

export default function GenerateBidPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Generate AI-Powered Bid</h1>
          <p className="text-gray-600 mt-2">
            Create accurate, competitive bids using RS Means data, ArcGIS market insights, and AI analysis
          </p>
        </div>
        
        <BidGenerationForm />
      </div>
    </div>
  );
}
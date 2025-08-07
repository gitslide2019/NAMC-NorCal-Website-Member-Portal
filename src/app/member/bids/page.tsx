import { Metadata } from 'next';
import BidManagementDashboard from '@/components/ui/BidManagementDashboard';

export const metadata: Metadata = {
  title: 'Bid Management | NAMC Member Portal',
  description: 'AI-powered bid generation, review, and performance tracking for construction projects',
};

export default function BidsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <BidManagementDashboard />
      </div>
    </div>
  );
}
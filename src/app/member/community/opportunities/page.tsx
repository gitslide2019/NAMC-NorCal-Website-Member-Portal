import { Metadata } from 'next';
import BusinessOpportunityPlatform from '@/components/ui/BusinessOpportunityPlatform';

export const metadata: Metadata = {
  title: 'Business Opportunities | NAMC Member Portal',
  description: 'Connect with fellow contractors for projects, partnerships, and resource sharing opportunities.',
};

export default function BusinessOpportunitiesPage() {
  return <BusinessOpportunityPlatform />;
}
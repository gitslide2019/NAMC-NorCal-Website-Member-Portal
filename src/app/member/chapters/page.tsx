'use client';

import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import InterChapterCollaboration from '@/components/ui/InterChapterCollaboration';

export default function ChaptersPage() {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!session) {
    redirect('/auth/signin');
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <InterChapterCollaboration />
    </div>
  );
}
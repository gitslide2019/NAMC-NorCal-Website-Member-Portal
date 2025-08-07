import { MediaCenter } from '@/components/ui/MediaCenter';

export default function MemberMediaPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <MediaCenter
        showSearch={true}
        showFilters={true}
        showFeatured={true}
        contentTypes={['podcast', 'video', 'blog']}
        limit={24}
        className="min-h-screen"
      />
    </div>
  );
}
import { MediaCenter } from '@/components/ui/MediaCenter';

export default function PublicMediaPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-yellow-400 to-yellow-600 text-black py-16">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-4">
            NAMC Media Center
          </h1>
          <p className="text-xl md:text-2xl mb-8 max-w-3xl mx-auto">
            Discover podcasts, videos, articles, and insights from the National Association of Minority Contractors
          </p>
        </div>
      </div>

      {/* Media Content */}
      <div className="container mx-auto px-4 py-12">
        <MediaCenter
          showSearch={true}
          showFilters={true}
          showFeatured={true}
          contentTypes={['podcast', 'video', 'blog', 'social']}
          limit={20}
        />
      </div>

      {/* Call to Action */}
      <div className="bg-gray-900 text-white py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">
            Join NAMC Northern California
          </h2>
          <p className="text-xl mb-8 max-w-2xl mx-auto">
            Get access to exclusive member content, networking opportunities, and professional development resources.
          </p>
          <div className="space-x-4">
            <a
              href="/auth/register"
              className="inline-block bg-yellow-500 hover:bg-yellow-600 text-black font-semibold px-8 py-3 rounded-lg transition-colors"
            >
              Become a Member
            </a>
            <a
              href="/contact"
              className="inline-block border border-white text-white hover:bg-white hover:text-black font-semibold px-8 py-3 rounded-lg transition-colors"
            >
              Learn More
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
export default function ProjectsPage() {
  return (
    <div className="min-h-screen pt-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">Public Projects</h1>
        <div className="prose prose-lg max-w-none">
          <p className="text-lg text-gray-600">
            Explore public construction projects and opportunities for minority contractors in Northern California.
          </p>
          <p className="text-gray-600 mt-4">
            This page is under construction. Please check back soon for information about current project opportunities,
            completed projects, and how to get involved with NAMC NorCal construction initiatives.
          </p>
          <p className="text-sm text-gray-500 mt-6">
            <strong>Note:</strong> For member project management and tracking, please <a href="/auth/signin" className="text-blue-600 hover:underline">sign in to the member portal</a>.
          </p>
        </div>
      </div>
    </div>
  )
}
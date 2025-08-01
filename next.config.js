const path = require('path')

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['localhost', 'images.unsplash.com', 'namc-norcal.org'],
  },
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3000']
    }
  },
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // Add explicit webpack aliases for better module resolution
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname, 'src'),
      '@/components': path.resolve(__dirname, 'src/components'),
      '@/components/ui': path.resolve(__dirname, 'src/components/ui'),
      '@/lib': path.resolve(__dirname, 'src/lib'),
      '@/hooks': path.resolve(__dirname, 'src/hooks'),
      '@/types': path.resolve(__dirname, 'src/types'),
      '@/services': path.resolve(__dirname, 'src/services'),
      '@/styles': path.resolve(__dirname, 'src/styles'),
    }

    // Ensure proper module resolution for UI components
    config.resolve.extensions = ['.tsx', '.ts', '.jsx', '.js', '.json']
    
    return config
  },
}

module.exports = nextConfig
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  typescript: {
    // ⚠️ Jangan permanent, hanya debugging
    ignoreBuildErrors: true,
  },
  eslint: {
    // ⚠️ Jangan guna permanent, hanya debugging
    ignoreDuringBuilds: true,
  },
  images: {
    domains: ['localhost', 'res.cloudinary.com'],
  },
  env: {
    BILLPLZ_CALLBACK_URL: process.env.NODE_ENV === 'production' 
      ? 'https://my.kareerfit.com/api/payment/webhook/billplz' 
      : 'http://localhost:3000/api/payment/webhook/billplz',
    BILLPLZ_REDIRECT_URL: process.env.NODE_ENV === 'production'
      ? 'https://my.kareerfit.com/payment/status'
      : 'http://localhost:3000/payment/status',
  },
  serverExternalPackages: ['bcryptjs', '@prisma/client'],
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Don't attempt to import these modules on the client-side
      config.resolve.fallback = {
        fs: false,
        path: false,
        os: false,
        crypto: false,
      };
    }
    return config;
  },
  async rewrites() {
    return [
      {
        source: '/assessment/:type/standard-results/:id',
        destination: '/assessment/[type]/standard-results/[id]',
      },
      {
        source: '/assessment/:type/premium-results/:id',
        destination: '/assessment/[type]/premium-results/[id]',
      },
    ]
  }
}

module.exports = nextConfig
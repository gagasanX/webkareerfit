/** @type {import('next').NextConfig} */
const nextConfig = {
  // 🔥 ESSENTIAL SETTINGS ONLY - Simplified to prevent webpack conflicts
  reactStrictMode: true,
  compress: true,
  
  // 🔥 SIMPLIFIED: Minimal experimental options for Next.js 15
  experimental: {
    optimizeCss: true,
    // 🔥 CRITICAL FIX: Server Actions configuration
    serverActions: {
      allowedOrigins: [
        'localhost:3000',
        '*.app.github.dev',
        '*.githubpreview.dev',
        'my.kareerfit.com',
        '*.vercel.app',
      ],
    },
  },

  // 🔥 BASIC COMPILER SETTINGS
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },

  // 🔥 BASIC IMAGE OPTIMIZATION
  images: {
    domains: ['localhost', 'res.cloudinary.com'],
    formats: ['image/webp', 'image/avif'],
  },

  // 🔥 ENVIRONMENT VARIABLES
  env: {
    BILLPLZ_CALLBACK_URL: process.env.NODE_ENV === 'production' 
      ? 'https://my.kareerfit.com/api/payment/webhook/billplz' 
      : 'http://localhost:3000/api/payment/webhook/billplz',
    BILLPLZ_REDIRECT_URL: process.env.NODE_ENV === 'production'
      ? 'https://my.kareerfit.com/payment/status'
      : 'http://localhost:3000/payment/status',
  },

  // 🔥 SIMPLIFIED WEBPACK - Remove complex optimizations that cause conflicts
  webpack: (config, { isServer, dev }) => {
    // Basic client-side fallbacks only
    if (!isServer) {
      config.resolve.fallback = {
        fs: false,
        path: false,
        os: false,
        crypto: false,
        stream: false,
        buffer: false,
      };
    }

    // 🔥 FIX: Ensure proper module resolution
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': require('path').resolve(__dirname, 'src'),
    };

    // 🔥 FIX: Handle potential circular dependency issues
    config.resolve.symlinks = false;

    return config;
  },

  // 🔥 BASIC HEADERS ONLY
  async headers() {
    return [
      {
        source: '/_next/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/api/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, max-age=0',
          },
        ],
      },
    ];
  },

  // 🔥 BASIC REWRITES
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
    ];
  },

  // 🔥 OUTPUT SETTINGS
  output: 'standalone',
  poweredByHeader: false,
  generateEtags: false,
};

module.exports = nextConfig;
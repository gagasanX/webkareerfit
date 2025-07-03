/** @type {import('next').NextConfig} */
const nextConfig = {
  // 🔥 PERFORMANCE CRITICAL SETTINGS
  reactStrictMode: true,
  swcMinify: true,
  compress: true,
  
  // 🔥 BUNDLE OPTIMIZATION FOR VERCEL FREE
  experimental: {
    optimizeCss: true,
    optimizeServerReact: true,
    // Modern bundling
    turbotrace: {
      logLevel: 'error'
    }
  },

  // 🔥 COMPILER OPTIMIZATIONS
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },

  // 🔥 IMAGE OPTIMIZATION
  images: {
    domains: ['localhost', 'res.cloudinary.com'],
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 828, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
    minimumCacheTTL: 60,
  },

  env: {
    BILLPLZ_CALLBACK_URL: process.env.NODE_ENV === 'production' 
      ? 'https://my.kareerfit.com/api/payment/webhook/billplz' 
      : 'http://localhost:3000/api/payment/webhook/billplz',
    BILLPLZ_REDIRECT_URL: process.env.NODE_ENV === 'production'
      ? 'https://my.kareerfit.com/payment/status'
      : 'http://localhost:3000/payment/status',
  },

  // 🔥 WEBPACK OPTIMIZATION FOR SPEED
  webpack: (config, { isServer, dev }) => {
    // Production optimizations
    if (!dev) {
      // Advanced code splitting
      config.optimization.splitChunks = {
        chunks: 'all',
        minSize: 20000,
        maxSize: 200000,
        cacheGroups: {
          framework: {
            chunks: 'all',
            name: 'framework',
            test: /(?<!node_modules.*)[\\/]node_modules[\\/](react|react-dom|scheduler|prop-types|use-subscription)[\\/]/,
            priority: 40,
            enforce: true,
          },
          lib: {
            test: /[\\/]node_modules[\\/]/,
            name: 'lib',
            priority: 30,
            minChunks: 1,
          },
          commons: {
            name: 'commons',
            minChunks: 2,
            priority: 20,
          },
          shared: {
            name: 'shared',
            chunks: 'all',
            test: /[\\/]src[\\/]/,
            minChunks: 2,
            priority: 10,
          },
        },
      };

      // Tree shaking
      config.optimization.usedExports = true;
      config.optimization.sideEffects = false;
    }

    // Client-side fallbacks
    if (!isServer) {
      config.resolve.fallback = {
        fs: false,
        path: false,
        os: false,
        crypto: false,
      };
    }

    // Optimize imports
    config.resolve.alias = {
      ...config.resolve.alias,
      '@heroicons/react/24/outline': '@heroicons/react/24/outline',
      '@heroicons/react/24/solid': '@heroicons/react/24/solid',
    };

    return config;
  },

  // 🔥 HEADERS FOR BETTER CACHING & PERFORMANCE
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
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
        ],
      },
    ];
  },

  // 🔥 MODULAR IMPORTS TO REDUCE BUNDLE SIZE
  modularizeImports: {
    'lucide-react': {
      transform: 'lucide-react/dist/esm/icons/{{member}}',
    },
    '@heroicons/react/24/outline': {
      transform: '@heroicons/react/24/outline/{{member}}',
    },
    '@heroicons/react/24/solid': {
      transform: '@heroicons/react/24/solid/{{member}}',
    },
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
    ];
  },

  // 🔥 OUTPUT OPTIMIZATION FOR VERCEL
  output: 'standalone',
  poweredByHeader: false,
  generateEtags: false,
};

module.exports = nextConfig;
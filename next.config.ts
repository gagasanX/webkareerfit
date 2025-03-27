/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['localhost', 'res.cloudinary.com'],
  },
  env: {
    TOYYIBPAY_CALLBACK_URL: process.env.NODE_ENV === 'production' 
      ? 'https://yourwebsite.com/api/payment/callback' 
      : 'http://localhost:3000/api/payment/callback',
  },
  experimental: {
    serverComponentsExternalPackages: ['bcryptjs', '@prisma/client']
  }
}

module.exports = nextConfig
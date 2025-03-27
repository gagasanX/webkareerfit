/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ['bcryptjs'],
  eslint: {
    // Mengabaikan ESLint saat build
    ignoreDuringBuilds: true,
  },
}

module.exports = nextConfig

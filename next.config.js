/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // ⚠️ Jangan gunakan ini secara permanent, hanya untuk debugging
    ignoreBuildErrors: true,
  },
  eslint: {
    // ⚠️ Jangan gunakan ini secara permanent, hanya untuk debugging
    ignoreDuringBuilds: true,
  },
}

module.exports = nextConfig

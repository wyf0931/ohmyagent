/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  async rewrites() {
    return [
      {
        source: '/api/chat/:path*',
        destination: 'http://localhost:4000/api/chat/:path*',
      },
      {
        source: '/api/events',
        destination: 'http://localhost:4000/api/events',
      },
    ]
  },
}

module.exports = nextConfig

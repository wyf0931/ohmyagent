/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  async rewrites() {
    const agentServerUrl = process.env.AGENT_SERVER_URL || 'http://localhost:4000'

    // Only add rewrites if we're in development or AGENT_SERVER_URL is explicitly set
    if (process.env.NODE_ENV === 'development' || process.env.AGENT_SERVER_URL) {
      return [
        {
          source: '/api/chat/:path*',
          destination: `${agentServerUrl}/api/chat/:path*`,
        },
        {
          source: '/api/events',
          destination: `${agentServerUrl}/api/events`,
        },
      ]
    }

    // In production Railway deployment, use Next.js API routes directly
    return []
  },
}

module.exports = nextConfig

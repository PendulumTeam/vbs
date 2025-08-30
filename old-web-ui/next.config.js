/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    domains: ["localhost", "minio"],
    unoptimized: process.env.NODE_ENV === "development",
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.digitaloceanspaces.com",
        port: "",
        pathname: "/**",
      },
    ],
  },
  async rewrites() {
    return [
      // Proxy chat and AI API calls to backend
      {
        source: "/api/chat/:path*",
        destination: "http://localhost:8000/api/chat/:path*",
      },
      {
        source: "/api/ai/:path*",
        destination: "http://localhost:8000/api/ai/:path*",
      },
      // WebSocket connections
      {
        source: "/ws/:path*",
        destination: "http://localhost:8000/ws/:path*",
      },
      // Note: /api/files/* routes are served by Next.js locally (no proxy)
    ];
  },
};

module.exports = nextConfig;

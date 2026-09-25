/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: process.env.INTERNAL_BACKEND_URL || 'http://backend:8000/api/:path*',
      },
    ];
  },
};

export default nextConfig;

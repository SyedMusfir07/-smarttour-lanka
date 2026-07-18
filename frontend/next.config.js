/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['localhost'],
  },
};

// API proxy for development — routes /api/* to the Express backend
if (process.env.NODE_ENV === 'development') {
  nextConfig.rewrites = async () => [
    {
      source: '/api/:path*',
      destination: 'http://localhost:4000/api/:path*',
    },
  ];
}

module.exports = nextConfig;

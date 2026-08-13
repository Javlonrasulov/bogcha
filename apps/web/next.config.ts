import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@bogcha/shared'],
  experimental: {
    optimizePackageImports: ['lucide-react', 'recharts'],
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;

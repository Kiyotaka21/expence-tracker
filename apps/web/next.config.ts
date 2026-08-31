import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // @expence/contracts публикуется собранным (dist, CommonJS), поэтому
  // transpilePackages здесь не нужен.
};

export default nextConfig;

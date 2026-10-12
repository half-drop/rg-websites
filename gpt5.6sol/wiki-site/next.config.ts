import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  ...(process.env.WIKI_BASE_PATH ? { output: 'export' as const } : {}),
};

export default nextConfig;

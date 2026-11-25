import type { NextConfig } from 'next';
import path from 'node:path';

const repoRoot = path.resolve(process.cwd(), '../..');
const nextConfig: NextConfig = {
  output: 'standalone',
  outputFileTracingRoot: repoRoot,
  turbopack: { root: repoRoot },
};
export default nextConfig;

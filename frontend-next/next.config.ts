import path from 'path';
import { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Turbopack config can be empty for now
  turbopack: {},

  // Webpack alias
  webpack: (config: any) => {
    config.resolve.alias['@'] = path.resolve(__dirname, 'src');
    return config;
  },
};

export default nextConfig;

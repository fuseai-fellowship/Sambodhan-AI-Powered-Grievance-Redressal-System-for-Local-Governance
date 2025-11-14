const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    resolveOptions: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },
  },
};

module.exports = nextConfig;
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://localhost:8000/api/:path*", // Proxy to FastAPI backend
      },
    ];
  },
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;

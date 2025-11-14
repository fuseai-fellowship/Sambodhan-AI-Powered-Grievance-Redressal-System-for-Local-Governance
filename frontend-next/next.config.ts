import path from "path";

const nextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://localhost:8000/api/:path*", // Proxy to FastAPI backend
      },
    ];
  },
  turbopack: {
    root: process.cwd(),
  },
  webpack: (config: any) => {
    config.resolve.alias['@'] = path.resolve(process.cwd(), 'src');
    return config;
  },
};

export default nextConfig;

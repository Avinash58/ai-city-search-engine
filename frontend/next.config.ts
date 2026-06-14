import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    // If BACKEND_URL is set (e.g. on Vercel), point to the deployed backend
    // Otherwise point to the local FastAPI dev server
    const backendUrl = process.env.BACKEND_URL || "http://127.0.0.1:8000";
    return [
      {
        source: "/api/:path*",
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;

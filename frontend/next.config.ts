import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    // Support both NEXT_PUBLIC_API_URL (Vercel) and BACKEND_URL (legacy)
    // Fall back to local FastAPI dev server
    const backendUrl =
      process.env.NEXT_PUBLIC_API_URL ||
      process.env.BACKEND_URL ||
      "http://127.0.0.1:8000";
    return [
      {
        source: "/api/:path*",
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;

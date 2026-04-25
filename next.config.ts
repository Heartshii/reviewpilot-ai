import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: [
    "192.168.2.10",
    "localhost",
    "http://192.168.2.10:3000",
    "http://192.168.2.10:3001",
    "http://localhost:3000",
    "http://localhost:3001",
  ],
  typescript: {
    ignoreBuildErrors: false,
  },
};

export default nextConfig;

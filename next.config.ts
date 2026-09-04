import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pg", "pg-cloudflare"],
  devIndicators: false,
};

export default nextConfig;

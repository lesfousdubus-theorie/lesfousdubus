import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains; preload" },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""} https://www.youtube.com https://s.ytimg.com blob:`,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://i.ytimg.com https://img.youtube.com",
      "font-src 'self' data:",
      "connect-src 'self' https://www.youtube.com https://www.youtube-nocookie.com https://i.ytimg.com https://img.youtube.com https://www.googlevideo.com blob:",
      "frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com",
      "media-src 'self' data: blob:",
      "worker-src 'self' blob:",
      "frame-ancestors 'none'",
      "object-src 'none'",
      "base-uri 'self'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  devIndicators: false,
  agentRules: false,
  poweredByHeader: false,
  experimental: {
    // Un build incrémental a mêlé l'ancien CSS global au JavaScript à jour.
    turbopackFileSystemCacheForBuild: false,
  },
  async redirects() {
    return [
      // Ancienne adresse encore enregistrée dans la Search Console.
      { source: "/sitemap-index.xml", destination: "/sitemap.xml", permanent: true },
    ];
  },
  async headers() {
    const markdownHeaders = [
      ...securityHeaders,
      { key: "Content-Type", value: "text/markdown; charset=utf-8" },
      { key: "Cache-Control", value: "public, max-age=3600, stale-while-revalidate=86400" },
    ];
    return [
      {
        source: "/llms.txt",
        headers: markdownHeaders,
      },
      {
        source: "/llms-full.txt",
        headers: markdownHeaders,
      },
      {
        source: "/llms-en.txt",
        headers: markdownHeaders,
      },
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;

import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
initOpenNextCloudflareForDev();

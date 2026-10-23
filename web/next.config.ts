import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The service worker's cache version (lib/sw.ts): one per build.
  env: { NEXT_PUBLIC_BUILD_ID: process.env.BUILD_ID ?? Date.now().toString(36) },
  // Browser calls /api/* and /agent/* same-origin; Next proxies to Django and the agent (no CORS).
  async rewrites() {
    return [
      { source: "/api/:path*", destination: `${process.env.API_URL ?? "http://localhost:8000"}/api/:path*` },
      { source: "/agent/:path*", destination: `${process.env.AGENT_URL ?? "http://localhost:8001"}/agent/:path*` },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;

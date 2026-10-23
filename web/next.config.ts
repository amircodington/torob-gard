import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone", // web/Dockerfile runs .next/standalone/server.js
  // The service worker's cache version (lib/sw.ts): one per build.
  env: { NEXT_PUBLIC_BUILD_ID: process.env.BUILD_ID ?? Date.now().toString(36) },
  // Browser calls /api/* and /agent/* same-origin; src/app/{api,agent}/[...path] proxy them (addresses read at run time).
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

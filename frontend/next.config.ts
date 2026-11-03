import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cache Components + Partial Prefetching: bawaan templat Next.js 16.4.
  // Halaman diprarender menjadi "static shell"; bagian yang butuh data
  // per permintaan (mis. ?tab= di detail kos) dibungkus <Suspense>.
  cacheComponents: true,
  partialPrefetching: true,
  // Jangan biarkan `next dev` membuat AGENTS.md otomatis di repo tim.
  agentRules: false,
  turbopack: {
    rules: {
      // Tailwind CSS 4 diproses lewat loader Turbopack (tanpa postcss.config).
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;

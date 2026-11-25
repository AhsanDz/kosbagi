import type { NextConfig } from "next";

/**
 * Header keamanan untuk semua rute (halaman, aset, dan /api). Tidak memakai
 * Content-Security-Policy penuh supaya snap.js Midtrans dan font tetap jalan;
 * CSP khusus file nota datang dari backend dan diteruskan /api/backend.
 */
const securityHeaders = [
  // Peramban tidak boleh menebak jenis file dari isinya.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Situs lain hanya melihat asal (origin), bukan path dan query halaman KosBagi.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // KosBagi tidak boleh dimuat di dalam iframe situs lain (clickjacking).
  { key: "X-Frame-Options", value: "DENY" },
  // Fitur peramban yang tidak dipakai dimatikan, termasuk untuk iframe Snap.
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
];

const nextConfig: NextConfig = {
  // Cache Components + Partial Prefetching: bawaan templat Next.js 16.4.
  // Halaman diprarender menjadi "static shell"; bagian yang butuh data
  // per permintaan (mis. ?tab= di detail kos) dibungkus <Suspense>.
  cacheComponents: true,
  partialPrefetching: true,
  // Jangan biarkan `next dev` membuat AGENTS.md otomatis di repo tim.
  agentRules: false,
  // Tanpa header X-Powered-By: Next.js.
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
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

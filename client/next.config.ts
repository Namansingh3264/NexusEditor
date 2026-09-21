import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /*
   * ESLint and TypeScript errors were previously ignored during builds
   * (`ignoreDuringBuilds` / `ignoreBuildErrors`), which let real type errors —
   * including a route handler with an invalid signature — ship to production.
   * The underlying errors are fixed, so the checks are back on.
   */
  eslint: {
    dirs: ["src"],
  },

  // Surfaces unsafe lifecycles and double-invokes effects in development.
  reactStrictMode: true,

  // Don't advertise the framework version to the world.
  poweredByHeader: false,

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;

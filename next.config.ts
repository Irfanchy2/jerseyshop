import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  // The store is database-driven and admin-editable, so pages render dynamically
  // (classic caching model) rather than with Cache Components.
  cacheComponents: false,
  poweredByHeader: false,
  serverExternalPackages: ["sharp", "@prisma/client", "bcryptjs"],
  images: {
    dangerouslyAllowSVG: true,
    contentDispositionType: "inline",
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    remotePatterns: process.env.S3_PUBLIC_BASE_URL ? [new URL(`${process.env.S3_PUBLIC_BASE_URL}/**`)] : [],
  },
  experimental: {
    serverActions: { bodySizeLimit: "12mb" },
    optimizePackageImports: ["lucide-react", "recharts", "motion"],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;

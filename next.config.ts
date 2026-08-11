import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co", pathname: "/storage/v1/object/sign/**" },
      { protocol: "https", hostname: "images.unsplash.com", pathname: "/**" },
    ],
    formats: ["image/avif", "image/webp"],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  async redirects() {
    return [
      { source: "/bargain", has: [{ type: "query", key: "bargain", value: "2-dollar-deals" }], destination: "/market/2dollarshop", permanent: true },
      { source: "/bargain", has: [{ type: "query", key: "bargain", value: "5-dollar-deals" }], destination: "/market/2dollarshop", permanent: true },
      { source: "/bargain", has: [{ type: "query", key: "bargain", value: "10-dollar-deals" }], destination: "/market/2dollarshop", permanent: true },
      { source: "/bargain", has: [{ type: "query", key: "bargain", value: "moving-sale" }], destination: "/market/moving-sales", permanent: true },
      { source: "/bargain", has: [{ type: "query", key: "bargain", value: "garage-sale" }], destination: "/market/garage-sales", permanent: true },
      { source: "/bargain", destination: "/market", permanent: true },
      { source: "/bargain/create", destination: "/market/create/bargain", permanent: true },
      { source: "/bargain/:listingId/items/:itemId/edit", destination: "/market/:listingId/items/:itemId/edit", permanent: true },
      { source: "/bargain/:listingId/edit", destination: "/market/:listingId/edit", permanent: true },
      { source: "/bargain/:listingId", destination: "/market/:listingId", permanent: true },
    ];
  },
};

export default nextConfig;

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  distDir: "dist",
  turbopack: {
    root: __dirname,
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
        ],
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: "/illysocial/:path*",
        destination: "https://illysocial.illyrobotics-ai.com/:path*",
      },
      {
        source: "/livepay/:path*",
        destination: "https://livepay.illyrobotics-ai.com/:path*",
      },
    ];
  },
  async redirects() {
    return [
      {
        source: "/favicon.ico",
        destination: "/assets/illy-logo.png",
        permanent: false,
      },
      {
        source: "/two",
        destination: "https://livepay.illyrobotics-ai.com/two",
        permanent: false,
      },
      {
        source: "/settings",
        destination: "https://livepay.illyrobotics-ai.com/settings",
        permanent: false,
      },
      {
        source: "/modal",
        destination: "https://livepay.illyrobotics-ai.com/modal",
        permanent: false,
      },
      {
        source: "/cashout",
        destination: "https://livepay.illyrobotics-ai.com/cashout",
        permanent: false,
      },
      {
        source: "/onboarding",
        destination: "https://livepay.illyrobotics-ai.com/onboarding",
        permanent: false,
      },
      {
        source: "/whitepaper",
        destination: "/whitepaper/index.html",
        permanent: false,
      },
      {
        source: "/whitepaper/",
        destination: "/whitepaper/index.html",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;

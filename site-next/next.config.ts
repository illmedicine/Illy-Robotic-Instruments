import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  async redirects() {
    return [
      {
        source: "/",
        destination: "/index.html",
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

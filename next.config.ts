import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: "/creators", destination: "/master-data", permanent: true },
      { source: "/companies", destination: "/master-data", permanent: true },
    ];
  },
};

export default nextConfig;

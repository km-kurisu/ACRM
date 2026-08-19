import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: "/companies", destination: "/master-data", permanent: true },
    ];
  },
};

export default nextConfig;

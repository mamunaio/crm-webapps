import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev',
      },
    ],
  },
  // Ensure we are using standard standalone output for Vercel if needed
  output: 'standalone',
};

export default nextConfig;

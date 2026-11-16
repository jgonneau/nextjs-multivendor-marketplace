import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Minimal .next/standalone server for the Docker image.
  output: "standalone",
};

export default nextConfig;

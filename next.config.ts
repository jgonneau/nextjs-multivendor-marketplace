import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Produces a minimal .next/standalone output (just the files needed to
  // run the server) so the Docker runtime image doesn't need node_modules
  // or source at all.
  output: "standalone",
  // jose ships ESM only. Listing it here is also what makes next/jest
  // transform it; next/jest always ignores node_modules otherwise, and
  // custom transformIgnorePatterns can only add to that, never override it.
  transpilePackages: ["jose"],
  // webpack: (config, options) => {
  //   config.module.rules.push({
  //     nextRuntime: "nodejs",
  //   });
  //   return config;
  // },
};

export default nextConfig;

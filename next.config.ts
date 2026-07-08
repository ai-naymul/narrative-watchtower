import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ensure the precomputed intelligence JSON ships with any server functions
  // that read it at runtime (e.g. the Copilot API), not just static builds.
  outputFileTracingIncludes: {
    "/**": ["./data/**"],
  },
};

export default nextConfig;

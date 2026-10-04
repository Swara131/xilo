import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // A lockfile in a parent folder should not become the app root.
  turbopack: {
    root: process.cwd(),
  },
  // Don't generate extra agent instruction files.
  agentRules: false,
};

export default nextConfig;

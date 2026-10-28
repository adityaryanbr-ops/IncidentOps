import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  agentRules: false,
  // README opens the UI at 127.0.0.1; Next blocks that host unless it is listed.
  allowedDevOrigins: ["127.0.0.1"],
};

export default nextConfig;

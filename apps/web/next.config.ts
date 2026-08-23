import type { NextConfig } from "next";

const config: NextConfig = {
  // Workspace packages ship TypeScript from src; let Next transpile them.
  transpilePackages: [
    "@observatory/config",
    "@observatory/core",
    "@observatory/db",
    "@observatory/scoring-engine",
  ],
  // Keep the Postgres driver out of the bundle (server-only native-ish deps).
  serverExternalPackages: ["postgres"],
  experimental: {
    typedRoutes: false,
  },
};

export default config;

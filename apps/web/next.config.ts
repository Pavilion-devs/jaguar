import { resolve } from "node:path";
import process from "node:process";

import type { NextConfig } from "next";

const monorepoRoot = resolve(process.cwd(), "../..");

// Load the monorepo-root .env so the web app shares one source of truth with the
// worker. Node's process.loadEnvFile sets process.env before Next boots, which is
// what Prisma needs since the Prisma client reads DATABASE_URL at module init.
try {
  process.loadEnvFile(resolve(monorepoRoot, ".env"));
} catch {
  // Ignored on purpose - in production the env is injected by the host.
}

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/*": ["./generated/client/**/*", "../../packages/db/generated/client/**/*"],
  },
  transpilePackages: [
    "@jaguar/agent",
    "@jaguar/db",
    "@jaguar/domain",
    "@jaguar/goldrush",
    "@jaguar/scoring",
  ],
};

export default nextConfig;

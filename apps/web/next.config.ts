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

// Prisma resolves relative "file:" URLs against the schema.prisma location at
// generate time. Next.js bundling relocates the Prisma runtime during dev and
// build, so that base path changes and the sqlite file cannot be found. Rewrite
// to absolute here, using the same schema-relative rule, so the resolved path
// is unambiguous regardless of where Next loads the client from.
const databaseUrl = process.env.DATABASE_URL;
if (databaseUrl?.startsWith("file:") && !databaseUrl.startsWith("file:/")) {
  const relativePath = databaseUrl.slice("file:".length);
  const schemaDir = resolve(monorepoRoot, "packages/db/prisma");
  process.env.DATABASE_URL = `file:${resolve(schemaDir, relativePath)}`;
}

const nextConfig: NextConfig = {
  transpilePackages: [
    "@jaguar/agent",
    "@jaguar/db",
    "@jaguar/domain",
    "@jaguar/goldrush",
    "@jaguar/scoring",
  ],
};

export default nextConfig;

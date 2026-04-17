import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Pin workspace root to this repo so Next doesn't walk up and pick a stray
  // lockfile in the user's home dir.
  outputFileTracingRoot: __dirname,
  // better-sqlite3 is a native (.node) module — keep it external so Webpack /
  // Turbopack don't try to bundle the binary. Chat uses the same DB via
  // lazy createRequire in src/lib/chat.ts.
  serverExternalPackages: ["better-sqlite3"],
};

export default nextConfig;

import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Pin workspace root to this repo so Next doesn't walk up and pick a stray
  // lockfile in the user's home dir.
  outputFileTracingRoot: __dirname,
};

export default nextConfig;

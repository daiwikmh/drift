import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root to the monorepo root; a stray parent lockfile
  // otherwise makes Next infer the wrong root directory.
  turbopack: {
    root: path.join(__dirname, "../.."),
  },
  // @drip/shared ships raw TypeScript; Next compiles it in-place.
  transpilePackages: ["@drip/shared"],
};

export default nextConfig;

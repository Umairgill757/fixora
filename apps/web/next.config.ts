import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // cacheComponents disabled: this is a dynamic marketplace — pages render
  // per-request from the live API, so the classic dynamic model is used.
  cacheComponents: false,
  // NOTE: partialPrefetching requires cacheComponents — left disabled.
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;

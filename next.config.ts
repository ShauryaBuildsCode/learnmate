import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdfjs locates its own worker file at runtime, which breaks when the bundler inlines it.
  serverExternalPackages: ["pdfjs-dist"],
  // The worker file is loaded by path at runtime, so tracing can't see it: include it in deployments.
  outputFileTracingIncludes: { "/api/ingest": ["./node_modules/pdfjs-dist/legacy/build/**"] },
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

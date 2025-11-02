import type { NextConfig } from "next";

// Get basePath from environment variable (set by GitHub Actions)
// If NEXT_PUBLIC_BASE_PATH is empty string, basePath will be undefined (root path)
const basePathEnv = process.env.NEXT_PUBLIC_BASE_PATH;
const basePath = basePathEnv && basePathEnv !== "" ? basePathEnv : undefined;

// Check if we're building for static export (GitHub Pages)
const isStaticExport = process.env.NEXT_EXPORT === "true";

const nextConfig: NextConfig = {
  ...(basePath && { basePath }),
  // For GitHub Pages, we always use static export
  ...(isStaticExport && {
    output: "export",
    images: {
      unoptimized: true,
    },
  }),
  // Headers are not supported in static export, only in server mode
  // For development, headers are still needed for FHEVM
  ...(!isStaticExport && {
    headers() {
      // Required by FHEVM 
      return Promise.resolve([
        {
          source: '/',
          headers: [
            {
              key: 'Cross-Origin-Opener-Policy',
              value: 'same-origin',
            },
            {
              key: 'Cross-Origin-Embedder-Policy',
              value: 'require-corp',
            },
          ],
        },
      ]);
    },
  }),
};

export default nextConfig;


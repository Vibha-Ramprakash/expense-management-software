import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Vinext applies the Server Action bridge limit to multipart App Route
  // requests in local development. Leave room for Keel's 8 MB receipt plus
  // multipart framing; the extraction route still enforces the exact 8 MB cap.
  experimental: {
    serverActions: {
      bodySizeLimit: "9mb",
    },
  },
};

export default nextConfig;

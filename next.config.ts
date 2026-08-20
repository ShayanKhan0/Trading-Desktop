import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["bcryptjs"],
  // The floating dev badge overlaps the UI in screenshots; it has no production effect.
  devIndicators: false,
  experimental: { optimizePackageImports: ["lucide-react", "recharts"] },
};

export default nextConfig;

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["bcryptjs"],
  experimental: { optimizePackageImports: ["lucide-react", "recharts"] },
};

export default nextConfig;

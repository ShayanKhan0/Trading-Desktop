import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["bcryptjs"],
  // The floating dev badge overlaps the UI in screenshots. Next 15.1 expects the
  // object form here; the boolean shorthand is a later addition and fails typecheck.
  devIndicators: { buildActivity: false, appIsrStatus: false },
  experimental: { optimizePackageImports: ["lucide-react", "recharts"] },
};

export default nextConfig;

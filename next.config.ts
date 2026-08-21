import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["bcryptjs"],
  // Hides the floating dev badge, which overlaps the UI in screenshots and has no
  // production effect. The boolean form requires Next >= 15.2; the older object
  // form's keys are deprecated and warn on every build.
  devIndicators: false,
  experimental: { optimizePackageImports: ["lucide-react", "recharts"] },
};

export default nextConfig;

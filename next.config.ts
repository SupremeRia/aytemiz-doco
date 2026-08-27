import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: { remotePatterns: [{ protocol: "https", hostname: "dwniplcslvfuifwymhlo.supabase.co", pathname: "/storage/v1/object/public/station-images/**" }] },
  async headers() {
    return [{ source: "/sw.js", headers: [{ key: "Cache-Control", value: "public, max-age=0, must-revalidate" }, { key: "Service-Worker-Allowed", value: "/" }] }];
  },
};

export default nextConfig;

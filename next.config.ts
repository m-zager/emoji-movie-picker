import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The brand switch owns the bottom-left corner.
  devIndicators: { position: "bottom-right" },
  images: {
    remotePatterns: [new URL("https://image.tmdb.org/t/p/**")],
  },
};

export default nextConfig;

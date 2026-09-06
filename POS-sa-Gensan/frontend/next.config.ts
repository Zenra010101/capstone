import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /** Smaller production footprint — copy .next/standalone per deploy/DEPLOY.md */
  output: "standalone",
  /** Hides the bottom-left Next.js dev menu (Route / Turbopack) — dev only; never shown in production */
  devIndicators: false,
};

export default nextConfig;

import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  serverExternalPackages: ["better-sqlite3"],
  // Hashtag-Liste auch im Client (Composer) verfügbar machen.
  env: { NEXT_PUBLIC_MENTION_SLUGS: process.env.BOARD_MENTION_SLUGS ?? "claude,gemini,kimi,chatgpt" },
};
export default nextConfig;

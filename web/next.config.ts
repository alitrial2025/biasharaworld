import type { NextConfig } from "next";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";
import androidRelease from "./src/lib/android-release.json";

if (androidRelease.available) {
  if (
    !/^\/downloads\/biasharaos-[\d.]+-release\.apk$/.test(androidRelease.href)
  ) {
    throw new Error("Invalid Android release download path.");
  }
  const apk = readFileSync(join(process.cwd(), "public", androidRelease.href));
  if (
    apk.byteLength !== androidRelease.bytes ||
    createHash("sha256").update(apk).digest("hex") !== androidRelease.sha256
  ) {
    throw new Error(
      "Android release download does not match its verified manifest.",
    );
  }
}

const config: NextConfig = {
  poweredByHeader: false,
  devIndicators: false,
  images: { formats: ["image/avif", "image/webp"] },
  experimental: { cpus: 2 },
  turbopack: { root: join(process.cwd(), "..") },
  outputFileTracingRoot: join(process.cwd(), ".."),
  async headers() {
    return [
      {
        source: "/downloads/:file(.*\\.apk)",
        headers: [
          {
            key: "Content-Type",
            value: "application/vnd.android.package-archive",
          },
          { key: "Content-Disposition", value: "attachment" },
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          {
            key: "X-Biashara-Source",
            value: process.env.APP_SOURCE_REVISION || "development",
          },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
        ],
      },
    ];
  },
};
export default config;

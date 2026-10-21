import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Native / WASM-backed packages are loaded by Node at runtime, not bundled.
  serverExternalPackages: ["@huggingface/transformers", "onnxruntime-node", "sharp", "pg", "exceljs", "pino"],
  poweredByHeader: false,
  experimental: {
    serverActions: { bodySizeLimit: "2mb" },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
          // private deployment: also covers PDFs and API responses, which have no <meta> tag
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "img-src 'self' data: https://i.ytimg.com",
              "frame-src https://www.youtube-nocookie.com https://www.youtube.com",
              "script-src 'self' 'unsafe-inline'" + (process.env.NODE_ENV === "production" ? "" : " 'unsafe-eval'"),
              "style-src 'self' 'unsafe-inline'",
              "connect-src 'self'",
              "frame-ancestors 'self'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;

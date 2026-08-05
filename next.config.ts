import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: "default-src 'self' https: data: blob:; script-src 'self' 'unsafe-eval' 'unsafe-inline' https:; connect-src 'self' https: wss:; img-src 'self' https: data: blob:; style-src 'self' 'unsafe-inline' https:; font-src 'self' https: data:; frame-src 'self' https:;"
          },
        ],
      },
    ];
  },
};

export default nextConfig;

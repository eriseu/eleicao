import type { NextConfig } from "next";

const cspHeader = `
  default-src 'self' https: data: blob:;
  script-src 'self' 'unsafe-eval' 'unsafe-inline' https: https://*.google.com https://*.google.com.br https://*.googlesyndication.com;
  style-src 'self' 'unsafe-inline' https:;
  img-src 'self' https: data: blob:;
  font-src 'self' https: data:;
  connect-src 'self' https: wss: https://api.centraleti.com.br;
  frame-src 'self' https:;
  object-src 'none';
  base-uri 'self';
`;

const nextConfig: NextConfig = {
  // Resolve profile existence before sending headers, including to JS-capable crawlers.
  // This prevents a streamed 200 response for a missing profile.
  htmlLimitedBots: /.*/,
  async rewrites() {
    return [
      {
        source: "/api/vps/:path*",
        destination: "https://api.centraleti.com.br/api/:path*",
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: cspHeader.replace(/\s{2,}/g, " ").trim(),
          },
        ],
      },
    ];
  },
};

export default nextConfig;

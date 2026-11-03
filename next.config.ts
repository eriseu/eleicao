import type { NextConfig } from "next";

const cspHeader = `
  default-src 'self' https: data: blob:;
  script-src 'self' 'unsafe-eval' 'unsafe-inline' https: https://*.google.com https://*.google.com.br https://*.googlesyndication.com https://fundingchoicesmessages.google.com;
  style-src 'self' 'unsafe-inline' https:;
  img-src 'self' https: data: blob: https://f.centraleti.com.br https://fotos.centraleti.com.br;
  font-src 'self' https: data:;
  connect-src 'self' https: wss: https://api.centraleti.com.br https://politica.centraleti.com.br https://f.centraleti.com.br https://fotos.centraleti.com.br;
  frame-src 'self' https:;
  object-src 'none';
  base-uri 'self';
`;

const vpsApiUrl = (process.env.NEXT_PUBLIC_VPS_API_URL || "https://api.centraleti.com.br").replace(/\/+$/, "");

const nextConfig: NextConfig = {
  output: "standalone",
  htmlLimitedBots: /.*/,
  async rewrites() {
    return [
      {
        source: "/api/vps/:path*",
        destination: `${vpsApiUrl}/api/:path*`,
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

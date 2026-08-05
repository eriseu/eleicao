import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://www.googletagmanager.com https://pagead2.googlesyndication.com https://partner.googleadservices.com https://tpc.googlesyndication.com",
              "style-src 'self' 'unsafe-inline'",
              "connect-src 'self' https://api.centraleti.com.br https://*.supabase.co https://pagead2.googlesyndication.com https://googleads.g.doubleclick.net https://ep1.adtrafficquality.google",
              "img-src 'self' data: https://fotos.centraleti.com.br https://f.centraleti.com.br https://pagead2.googlesyndication.com https://googleads.g.doubleclick.net",
              "frame-src 'self' https://googleads.g.doubleclick.net https://tpc.googlesyndication.com",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' https://pagead2.googlesyndication.com; connect-src 'self' https://api.centraleti.com.br https://*.supabase.co; img-src 'self' data: https://fotos.centraleti.com.br https://f.centraleti.com.br;",
          },
        ],
      },
    ];
  },
};

export default nextConfig;

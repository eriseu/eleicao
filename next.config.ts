import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' https://www.googletagmanager.com https://pagead2.googlesyndication.com https://partner.googleadservices.com https://tpc.googlesyndication.com https://fundingchoicesmessages.google.com https://*.cloudflare.com https://ep1.adtrafficquality.google https://ep2.adtrafficquality.google; connect-src 'self' https://api.centraleti.com.br https://*.supabase.co https://pagead2.googlesyndication.com https://googleads.g.doubleclick.net https://ep1.adtrafficquality.google https://ep2.adtrafficquality.google https://analytics.google.com https://www.google.com https://*.google.com; img-src 'self' data: https://fotos.centraleti.com.br https://f.centraleti.com.br https://pagead2.googlesyndication.com https://googleads.g.doubleclick.net https://www.google.com.br https://www.google.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; frame-src 'self' https://googleads.g.doubleclick.net https://tpc.googlesyndication.com https://pagead2.googlesyndication.com https://fundingchoicesmessages.google.com;"
          },
        ],
      },
    ];
  },
};

export default nextConfig;

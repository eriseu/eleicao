import "./globals.css";
import type { Metadata } from "next";
import Script from 'next/script';
import BottomNav from '@/components/layout/BottomNav';
import GoogleAnalytics from '@/components/analytics/GoogleAnalytics';

export const metadata: Metadata = {
  title: "Tinder Político",
  description: "Descubra quais candidatos combinam com você.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const configuredClient = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID;
  const adsenseClient = configuredClient?.startsWith('ca-')
    ? configuredClient
    : configuredClient?.startsWith('pub-')
      ? `ca-${configuredClient}`
      : null;
  const configuredAnalyticsId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
  const googleAnalyticsId = configuredAnalyticsId && /^G-[A-Z0-9]+$/i.test(configuredAnalyticsId)
    ? configuredAnalyticsId
    : null;

  return (
    <html lang="pt-BR">
      <body className="bg-slate-950 text-slate-100">
        {adsenseClient && (
          <Script
            id="adsense-auto-ads"
            async
            strategy="afterInteractive"
            crossOrigin="anonymous"
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(adsenseClient)}`}
          />
        )}
        {googleAnalyticsId && (
          <GoogleAnalytics measurementId={googleAnalyticsId} />
        )}
        {children}
        <BottomNav />
      </body>
    </html>
  );
}

import "./globals.css";
import type { Metadata } from "next";
import Script from 'next/script';
import BottomNav from '@/components/layout/BottomNav';
import GoogleAnalytics from '@/components/analytics/GoogleAnalytics';
import { getSiteUrl, SITE_DESCRIPTION, SITE_NAME } from '@/lib/seo';

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: `${SITE_NAME} — Compare candidatos e veja o ranking`,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    'candidatos',
    'eleições',
    'ranking político',
    'duelo político',
    'política brasileira',
  ],
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    siteName: SITE_NAME,
    title: `${SITE_NAME} — Compare candidatos e veja o ranking`,
    description: SITE_DESCRIPTION,
    url: '/',
  },
  twitter: {
    card: 'summary',
    title: `${SITE_NAME} — Compare candidatos e veja o ranking`,
    description: SITE_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
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
  const websiteStructuredData = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: getSiteUrl(),
    description: SITE_DESCRIPTION,
    inLanguage: 'pt-BR',
  };

  return (
    <html lang="pt-BR">
      <head>
        {googleAnalyticsId && (
          <>
            <script
              async
              src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(googleAnalyticsId)}`}
            />
            <script
              dangerouslySetInnerHTML={{
                __html: `
                  window.dataLayer = window.dataLayer || [];
                  function gtag(){dataLayer.push(arguments);}
                  window.gtag = gtag;
                  gtag('js', new Date());
                  gtag('config', '${googleAnalyticsId}', { anonymize_ip: true });
                `,
              }}
            />
          </>
        )}
      </head>
      <body className="bg-slate-950 text-slate-100">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(websiteStructuredData).replace(/</g, '\\u003c'),
          }}
        />
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

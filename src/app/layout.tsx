import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Script from 'next/script';
import './globals.css';

import FooterMenu from '@/components/layout/BottomNav';
const inter = Inter({ subsets: ['latin'] });

const siteUrl = new URL('https://politica.centraleti.com.br');
const siteTitle = 'Duelo Político - Quem te representa melhor?';
const siteDescription = 'Compare candidatos e veja quem está mais alinhado com suas escolhas. Participe do ranking e compartilhe seus duelos.';
const ogImageUrl = new URL('/politica.centraleti.com.br.png', siteUrl).toString();

export const metadata: Metadata = {
  metadataBase: siteUrl,
  title: siteTitle,
  description: siteDescription,
  keywords: ['eleições', 'política', 'duelo', 'comparação', 'candidatos', 'ranking'],
  authors: [{ name: 'Central IT', url: 'https://centraleti.com.br' }],
  openGraph: {
    title: siteTitle,
    description: siteDescription,
    url: siteUrl.toString(),
    siteName: 'Duelo Político',
    images: [
      {
        url: ogImageUrl,
        secure_url: ogImageUrl,
        width: 1200,
        height: 630,
        alt: 'Arte promocional do Duelo Político',
        type: 'image/png',
      },
    ],
    locale: 'pt_BR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: siteTitle,
    description: siteDescription,
    images: [ogImageUrl], // Must be an absolute URL
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <head>
        {/* Google AdSense */}
        <Script
          async
          src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-${process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID}`}
          crossOrigin="anonymous"
          strategy="afterInteractive"
        /> 
        {/* Google Analytics */}
        <Script
          strategy="afterInteractive"
          src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID}`}
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID}');`}
        </Script>
      </head>
      <body className={inter.className}>
        <main>
          {children}
        </main>
        <FooterMenu />
      </body>
    </html>
  );
}
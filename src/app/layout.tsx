import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import Script from 'next/script';
import './globals.css';

import FooterMenu from '@/components/layout/BottomNav';

const inter = Inter({ subsets: ['latin'] });

export async function generateMetadata(): Promise<Metadata> {
  const siteUrl = 'https://politica.centraleti.com.br';
  const siteTitle = 'Duelo Político - Quem te representa melhor?';
  const siteDescription = 'Compare candidatos e veja quem está mais alinhado com suas escolhas. Participe do ranking e compartilhe seus duelos.';
  const ogImageUrl = `${siteUrl}/politica.centraleti.com.br.png`;

  return {
    metadataBase: new URL(siteUrl),
    title: siteTitle,
    description: siteDescription,
    keywords: ['eleições', 'política', 'duelo', 'comparação', 'candidatos', 'ranking'],
    authors: [{ name: 'Central IT', url: 'https://centraleti.com.br' }],
    openGraph: {
      title: siteTitle,
      description: siteDescription,
      url: siteUrl,
      siteName: 'Duelo Político',
      images: [
        {
          url: ogImageUrl,
          secureUrl: ogImageUrl,
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
      images: [ogImageUrl],
    },
  };
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <head />
      <body className={inter.className}>
        {/* Google AdSense */}
        <Script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-0388943655208566"
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
        <main>
          {children}
        </main>
        <FooterMenu />
      </body>
    </html>
  );
}

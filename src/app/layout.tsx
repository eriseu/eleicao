import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

const siteUrl = 'https://politica.centraleti.com.br';
const siteTitle = 'Duelo Político - Quem te representa melhor?';
const siteDescription = 'Compare candidatos e veja quem está mais alinhado com suas escolhas. Participe do ranking e compartilhe seus duelos.';
const ogImageUrl = `${siteUrl}/politica.centraleti.com.br.png`;

export const metadata: Metadata = {
  title: siteTitle,
  description: siteDescription,
  openGraph: {
    title: siteTitle,
    description: siteDescription,
    url: siteUrl,
    siteName: 'Duelo Político',
    images: [
      {
        url: ogImageUrl,
        width: 1200,
        height: 630,
        alt: 'Arte promocional do Duelo Político',
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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
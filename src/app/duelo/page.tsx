import React, { Suspense } from 'react';
import type { Metadata } from 'next';
import DueloClient from './DueloClient';
import { AVAILABLE_UFS } from '@/constants/elections';
import { supabase } from '@/lib/supabaseClient';
import { buildDuelOgImageUrl } from '@/lib/duelOgImage';
import { getSiteUrl } from '@/lib/seo';

export const dynamic = 'force-dynamic';

type DueloPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

// Asserte que a palavra 'async function' está abrindo a função corretamente
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ c1?: string; c2?: string; uf?: string }>;
}) { // <-- Certifique-se de que a chave de abertura está aqui
  const { c1, c2, uf } = await searchParams;

  const firstId = c1 || '';
  const secondId = c2 || '';
  const requestedUf = uf || '';

  // Exemplo de verificação que você tem no seu código:
  if (!firstName || !secondName) {
    return {
      title: 'Compare candidatos',
      alternates: { canonical: '/duelo' },
      robots: { index: false, follow: true },
    };
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://politica.centraleti.com.br';
  const ogImage = `${baseUrl}/api/og?c1=${firstId}&c2=${secondId}&uf=${requestedUf}`;
  const canonical = `${baseUrl}/duelo?c1=${firstId}&c2=${secondId}`;
  const title = `${firstName} x ${secondName}`;
  const description = `Compare o perfil e histórico de ${firstName} e ${secondName}`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      images: [{ url: ogImage, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage],
    },
  };
} // <-- Fechamento da função generateMetadata

export default function Page() {
  return <DueloClient />;
}

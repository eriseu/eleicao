import { Suspense } from 'react';
import { supabase } from '@/lib/supabaseClient';
import DueloClient from './DueloClient';
import type { Metadata } from 'next';

type Props = {
  searchParams: Promise<{ c1?: string; c2?: string; uf?: string }>;
};

export const dynamic = 'force-dynamic';

interface CandidatePerfil {
  id: string;
  nome_completo?: string | null;
  nome_urna?: string | null;
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const params = await searchParams;
  const c1 = params.c1 || '';
  const c2 = params.c2 || '';
  const uf = params.uf || '';

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://politica.centraleti.com.br';

  const ogParams = new URLSearchParams();
  if (c1) ogParams.set('c1', c1);
  if (c2) ogParams.set('c2', c2);
  if (uf) ogParams.set('uf', uf);

  const ogImageUrl = `${baseUrl}/api/og?${ogParams.toString()}`;
  const canonicalUrl = `${baseUrl}/duelo?${ogParams.toString()}`;

  return {
    title: 'Duelo Político',
    description: 'Escolha seu candidato e vote no duelo político!',
    alternates: { canonical: canonicalUrl },
    openGraph: {
      title: 'Duelo Político',
      description: 'Escolha seu candidato e vote no duelo político!',
      url: canonicalUrl,
      siteName: 'Duelo Político',
      images: [
        {
          url: ogImageUrl,
          secureUrl: ogImageUrl,
          width: 1200,
          height: 630,
          type: 'image/png',
          alt: 'Duelo Político',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Duelo Político',
      description: 'Escolha seu candidato e vote no duelo político!',
      images: [ogImageUrl],
    },
  };
}

export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 text-white p-8">Carregando duelo...</div>}>
      <DueloClient />
    </Suspense>
  );
}

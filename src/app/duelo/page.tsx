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

  const baseUrl = 'https://politica.centraleti.com.br';
  const title = 'Duelo Político';
  const description = 'Escolha seu candidato e vote no duelo político!';

  const ogParams = new URLSearchParams();
  if (c1) ogParams.set('c1', c1);
  if (c2) ogParams.set('c2', c2);
  if (uf) ogParams.set('uf', uf);

  const ogImage = `${baseUrl}/api/og?${ogParams.toString()}`;

  const canonicalParams = new URLSearchParams();
  if (c1) canonicalParams.set('c1', c1);
  if (c2) canonicalParams.set('c2', c2);
  if (uf) canonicalParams.set('uf', uf);

  const canonical = `${baseUrl}/duelo?${canonicalParams.toString()}`;

  // 2. O return DEVE estar estritamente dentro dos blocos { } da função generateMetadata
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: 'Duelo Político',
      images: [
        {
          url: ogImage,
          secureUrl: ogImage,
          width: 1200,
          height: 630,
          type: 'image/png',
          alt: title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage],
    },
  };
}

  const title = firstName && secondName ? `${firstName} x ${secondName}` : 'Duelo Político';
  const description =
    firstName && secondName
      ? `Compare o perfil e histórico de ${firstName} e ${secondName}`
      : 'Escolha seu candidato e vote no duelo político!';

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://politica.centraleti.com.br';
  const ogImage = `${baseUrl}/api/og?c1=${firstId}&c2=${secondId}&uf=${requestedUf}`;

  const canonicalParams = new URLSearchParams();
  if (firstId) canonicalParams.set('c1', firstId);
  if (secondId) canonicalParams.set('c2', secondId);
  if (requestedUf) canonicalParams.set('uf', requestedUf);

  const canonical = `${baseUrl}/duelo?${canonicalParams.toString()}`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: 'Duelo Político',
      images: [
        {
          url: ogImage,
          secureUrl: ogImage,
          width: 1200,
          height: 630,
          type: 'image/png',
          alt: title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage],
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

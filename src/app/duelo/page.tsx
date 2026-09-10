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
  
  // Busca nomes caso haja IDs para personalização das tags OG
  let firstName = '';
  let secondName = '';

  if (c1 || c2) {
    const ids = [c1, c2].filter(Boolean);
    const { data } = await supabase
      .from('perfis')
      .select('id, nome_urna, nome_completo')
      .in('id', ids);

    if (data) {
      const p1 = data.find((p: CandidatePerfil) => p.id === c1);
      const p2 = data.find((p: CandidatePerfil) => p.id === c2);
      firstName = p1?.nome_urna || p1?.nome_completo || '';
      secondName = p2?.nome_urna || p2?.nome_completo || '';
    }
  }

  const title = firstName && secondName ? `${firstName} x ${secondName}` : 'Duelo Político';
  const description =
    firstName && secondName
      ? `Compare o perfil e histórico de ${firstName} e ${secondName}`
      : 'Escolha seu candidato e vote no duelo político!';

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

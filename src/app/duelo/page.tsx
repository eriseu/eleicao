import { Suspense } from 'react';
import { supabase } from '@/lib/supabaseClient';
import DueloClient from './DueloClient';

export const dynamic = 'force-dynamic';

interface CandidatePerfil {
  id: string;
  nome_completo?: string | null;
  nome_urna?: string | null;
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const c1 = searchParams.c1 || '';
  const c2 = searchParams.c2 || '';
  const uf = searchParams.uf || '';

  const ogUrl = `https://politica.centraleti.com.br/api/og?c1=${c1}&c2=${c2}&uf=${uf}`;

  return {
    title: 'Duelo Político',
    description: 'Escolha seu candidato e vote no duelo político!',
    openGraph: {
      title: 'Duelo Político',
      description: 'Escolha seu candidato e vote no duelo político!',
      url: `https://politica.centraleti.com.br/duelo?c1=${c1}&c2=${c2}&uf=${uf}`,
      images: [
        {
          url: ogUrl,
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
      images: [ogUrl],
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

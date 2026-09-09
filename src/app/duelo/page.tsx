import { Suspense } from 'react';
import { supabase } from '@/lib/supabaseClient';
import DueloClient from './DueloClient';

export const dynamic = 'force-dynamic';

interface CandidatePerfil {
  id: string;
  nome_completo?: string | null;
  nome_urna?: string | null;
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ c1?: string; c2?: string; uf?: string }>;
}) {
  let firstId = '';
  let secondId = '';
  let requestedUf = '';

  try {
    const resolvedParams = await searchParams;
    firstId = resolvedParams?.c1 || '';
    secondId = resolvedParams?.c2 || '';
    requestedUf = resolvedParams?.uf || '';
  } catch (e) {
    console.error('Erro ao resolver searchParams:', e);
  }

  let firstName = '';
  let secondName = '';

  if (firstId && secondId) {
    try {
      const { data: candidates, error } = await supabase
        .from('perfis_candidatos')
        .select('id, nome_completo, nome_urna')
        .in('id', [firstId, secondId]);

      if (!error && candidates && candidates.length > 0) {
        const castedCandidates = candidates as CandidatePerfil[];
        const byId = new Map<string, CandidatePerfil>(
          castedCandidates.map((c) => [c.id, c])
        );
        const c1 = byId.get(firstId);
        const c2 = byId.get(secondId);

        firstName = c1?.nome_urna || c1?.nome_completo || '';
        secondName = c2?.nome_urna || c2?.nome_completo || '';
      }
    } catch (err) {
      console.error('Erro ao buscar candidatos para metadados:', err);
    }
  }

  const title = firstName && secondName ? `${firstName} x ${secondName}` : 'Duelo Político';
  const description =
    firstName && secondName
      ? `Compare o perfil e histórico de ${firstName} e ${secondName}`
      : 'Escolha seu candidato e vote no duelo político!';

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://politica.centraleti.com.br';
  const ogImage = `${baseUrl}/api/og?c1=${firstId}&c2=${secondId}&uf=${requestedUf}`;
  const canonical = `${baseUrl}/duelo?c1=${firstId}&c2=${secondId}`;

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
          width: 1200,
          height: 630,
          alt: title,
          type: 'image/png',
        },
      ],
      type: 'website',
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
    <Suspense fallback={<div className="p-8 text-white">Carregando...</div>}>
      <DueloClient />
    </Suspense>
  );
}

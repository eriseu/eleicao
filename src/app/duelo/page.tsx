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
    const params = await searchParams;
    firstId = params?.c1 || '';
    secondId = params?.c2 || '';
    requestedUf = params?.uf || '';
  } catch (e) {
    // Fallback silencioso
  }

  let firstName = '';
  let secondName = '';

  if (firstId && secondId) {
    try {
      const { data: candidates } = await supabase
        .from('perfis_candidatos')
        .select('id, nome_completo, nome_urna')
        .in('id', [firstId, secondId]);

      if (candidates && candidates.length > 0) {
        const casted = candidates as CandidatePerfil[];
        const byId = new Map(casted.map((c) => [c.id, c]));
        const c1 = byId.get(firstId);
        const c2 = byId.get(secondId);

        firstName = c1?.nome_urna || c1?.nome_completo || '';
        secondName = c2?.nome_urna || c2?.nome_completo || '';
      }
    } catch (err) {
      console.error('Erro ao gerar metadados:', err);
    }
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

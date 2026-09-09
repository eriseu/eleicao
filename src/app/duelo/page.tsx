import { Suspense } from 'react';
import { supabase } from '@/lib/supabaseClient';
import DueloClient from './DueloClient';

export const dynamic = 'force-dynamic';

// Interface para garantir que o TypeScript reconheça os campos do Supabase
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
  const resolvedParams = await searchParams;
  const firstId = resolvedParams?.c1 || '';
  const secondId = resolvedParams?.c2 || '';
  const requestedUf = resolvedParams?.uf || '';

  let firstName = '';
  let secondName = '';

  if (firstId && secondId) {
    try {
      const fetchPromise = supabase
        .from('perfis_candidatos')
        .select('id, nome_completo, nome_urna')
        .in('id', [firstId, secondId]);

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), 2500)
      );

      const response: any = await Promise.race([fetchPromise, timeoutPromise]);
      const candidates = response?.data as CandidatePerfil[] | null;

      if (candidates && candidates.length > 0) {
        const byId = new Map<string, CandidatePerfil>(candidates.map((c) => [c.id, c]));
        const c1 = byId.get(firstId);
        const c2 = byId.get(secondId);

        firstName = c1?.nome_urna || c1?.nome_completo || '';
        secondName = c2?.nome_urna || c2?.nome_completo || '';
      }
    } catch (err) {
      console.error('Erro/Timeout ao carregar metadados:', err);
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
      images: [{ url: ogImage, width: 1200, height: 630, alt: title }],
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
    <Suspense fallback={<div>Carregando duelo...</div>}>
      <DueloClient />
    </Suspense>
  );
}

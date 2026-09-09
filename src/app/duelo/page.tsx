import { Suspense } from 'react';
import { supabase } from '@/lib/supabaseClient';
import DueloClient from './DueloClient';

// Força o Next.js a ler a URL dinamicamente em tempo de requisição
export const dynamic = 'force-dynamic';

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ c1?: string; c2?: string; uf?: string }>;
}) {
  // O searchParams precisa obrigatoriamente do await no Next.js 15+
  const resolvedParams = await searchParams;
  const firstId = resolvedParams?.c1 || '';
  const secondId = resolvedParams?.c2 || '';
  const requestedUf = resolvedParams?.uf || '';

  let firstName = '';
  let secondName = '';

  if (firstId && secondId) {
    try {
      const { data: candidates } = await supabase
        .from('perfis_candidatos')
        .select('id, nome_completo, nome_urna')
        .in('id', [firstId, secondId]);

      if (candidates && candidates.length > 0) {
        const byId = new Map(candidates.map((c) => [c.id, c]));
        const c1 = byId.get(firstId);
        const c2 = byId.get(secondId);

        firstName = c1?.nome_urna || c1?.nome_completo || '';
        secondName = c2?.nome_urna || c2?.nome_completo || '';
      }
    } catch (err) {
      console.error('Erro Supabase OG:', err);
    }
  }

  // Se por algum motivo os IDs forem inválidos, usa o fallback genérico
  if (!firstName || !secondName) {
    return {
      title: 'Duelo Político - Compare candidatos',
      description: 'Escolha seu candidato e vote no duelo político!',
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
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
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
    <Suspense fallback={<div>Carregando duelo...</div>}>
      <DueloClient />
    </Suspense>
  );
}

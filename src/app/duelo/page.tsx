import { Suspense } from 'react';
import { supabase } from '@/lib/supabaseClient';
import DueloClient from './DueloClient'; // Ajuste o caminho da importação se necessário

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
      console.error('Erro ao buscar dados dos candidatos para metadados:', err);
    }
  }

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
}

export default function Page() {
  return (
    <Suspense fallback={<div>Carregando...</div>}>
      <DueloClient />
    </Suspense>
  );
}

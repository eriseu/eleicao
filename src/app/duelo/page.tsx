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
      // ... (mantenha a lógica existente de extração dos nomes)

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
              type: 'image/png', // Força o Facebook a entender o formato imediatamente
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
  
  // 1. Preserva o parâmetro `uf` na imagem OG
  const ogImage = `${baseUrl}/api/og?c1=${firstId}&c2=${secondId}&uf=${requestedUf}`;
  
  // 2. Preserva o `uf` na URL canônica e no og:url para evitar discrepância no Facebook
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
          width: 1200, // Corrige o aviso de dimensões do Facebook
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
    <Suspense fallback={<div className="min-h-screen bg-slate-950 text-white p-8">Carregando duelo...</div>}>
      <DueloClient />
    </Suspense>
  );
}

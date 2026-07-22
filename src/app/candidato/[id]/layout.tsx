import type { Metadata } from 'next';
import { cache } from 'react';
import { supabase } from '@/lib/supabaseClient';

type CandidateLayoutProps = {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
};

const getCandidate = cache(async (id: string) => {
  const [{ data: profile }, { data: candidacies }] = await Promise.all([
    supabase
      .from('perfis_candidatos')
      .select('id, nome_completo, elo_score, matches_count')
      .eq('id', id)
      .maybeSingle(),
    supabase
      .from('candidaturas')
      .select('nome_urna, partido, cargo, uf, municipio, ano_eleicao')
      .eq('perfil_id', id)
      .order('ano_eleicao', { ascending: false })
      .limit(1),
  ]);

  if (!profile) return null;
  return { ...profile, candidacy: candidacies?.[0] || null };
});

export async function generateMetadata({ params }: CandidateLayoutProps): Promise<Metadata> {
  const { id } = await params;
  const candidate = await getCandidate(id);

  if (!candidate) {
    return {
      title: 'Candidato não encontrado',
      robots: { index: false, follow: true },
    };
  }

  const displayName = candidate.candidacy?.nome_urna || candidate.nome_completo;
  const details = [
    candidate.candidacy?.cargo,
    candidate.candidacy?.partido,
    candidate.candidacy?.municipio,
    candidate.candidacy?.uf,
  ].filter(Boolean).join(' · ');
  const title = `${displayName} — perfil político`;
  const description = `Conheça o perfil de ${candidate.nome_completo}${details ? `: ${details}` : ''}. Veja sua pontuação Elo e participação nos duelos.`;
  const canonical = `/candidato/${encodeURIComponent(id)}`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      type: 'profile',
      title,
      description,
      url: canonical,
    },
    twitter: { card: 'summary', title, description },
  };
}

export default async function CandidateLayout({ children, params }: CandidateLayoutProps) {
  const { id } = await params;
  const candidate = await getCandidate(id);

  if (!candidate) return children;

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: candidate.nome_completo,
    alternateName: candidate.candidacy?.nome_urna || undefined,
    description: [candidate.candidacy?.cargo, candidate.candidacy?.partido].filter(Boolean).join(' · '),
    address: candidate.candidacy?.uf
      ? {
          '@type': 'PostalAddress',
          addressLocality: candidate.candidacy.municipio || undefined,
          addressRegion: candidate.candidacy.uf,
          addressCountry: 'BR',
        }
      : undefined,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData).replace(/</g, '\\u003c'),
        }}
      />
      {children}
    </>
  );
}


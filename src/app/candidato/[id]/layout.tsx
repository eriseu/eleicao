import type { Metadata } from 'next';
import { cache } from 'react';
import { redirect } from 'next/navigation'; // <-- Importe o redirect
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

  if (!profile && (!candidacies || candidacies.length === 0)) return null;
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

  const displayName = candidate.nome_completo || candidate.candidacy?.nome_urna || 'Perfil Político';
  const details = [
    candidate.candidacy?.cargo,
    candidate.candidacy?.partido,
    candidate.candidacy?.municipio,
    candidate.candidacy?.uf,
  ].filter(Boolean).join(' · ');

  const title = `${displayName} — perfil político`;
  const description = `Conheça o perfil de ${candidate.nome_completo}${details ? `: ${details}` : ''}.`;
  const canonical = `/candidato/${encodeURIComponent(id)}`;

  return {
    title,
    description,
    alternates: { canonical },
  };
}

export default async function CandidateLayout({ children, params }: CandidateLayoutProps) {
  const { id } = await params;
  const candidate = await getCandidate(id);

  // SE NÃO EXISTIR CANDIDATO, REDIRECIONA IMEDIATAMENTE NO SERVIDOR
  if (!candidate) {
    redirect('/ranking');
  }

  return <>{children}</>;
}

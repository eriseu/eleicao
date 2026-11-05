import type { Metadata } from 'next';
import { getSocialCandidate as getCandidate } from '@/lib/socialCandidate';
import { socialMetadata } from '@/lib/socialMetadata';

type CandidateLayoutProps = {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
};

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
  const description = `Conheça o perfil de ${displayName}${details ? `: ${details}` : ''}.`;
  const canonical = `/candidato/${encodeURIComponent(id)}`;

  return socialMetadata(title, description, canonical, `/api/og?${new URLSearchParams({ candidato: id })}`);
}

export default async function CandidateLayout({ children, params }: CandidateLayoutProps) {
  const { id } = await params;
  // A página cliente diferencia 404 de indisponibilidade temporária da API.
  // O layout não deve transformar falha de upstream em redirecionamento.
  try {
    await getCandidate(id);
  } catch (error) {
    console.warn('[Perfil] metadata indisponível; página continuará carregando:', error);
  }

  return <>{children}</>;
}

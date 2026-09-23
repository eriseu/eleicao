import 'server-only';
import { cache } from 'react';
import { supabase } from './supabaseClient';
import { candidateOffices } from './candidateFilters';
import type { Candidato } from '@/types';
import { getProfileData, type PublicCandidacy } from './profileData';

export const RANKING_PAGE_SIZE = 10;
export interface RankingData { ranking: Candidato[]; page: number; hasMore: boolean; featured?: Candidato | null }
const VPS = process.env.NEXT_PUBLIC_VPS_API_URL || 'https://api.centraleti.com.br';

export const getRankingData = cache(async (uf: string, municipio: string, page: number, highlight = ''): Promise<RankingData> => {
  const params = new URLSearchParams({ uf });
  candidateOffices(uf, municipio).forEach(cargo => params.append('cargos', cargo));
  if (municipio) params.set('municipio', municipio);
  const response = await fetch(`${VPS}/api/candidatos-filtrados?${params}`, { next: { revalidate: 300 }, signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error('Ranking source unavailable');
  const ids: string[] = await response.json();
  if (!Array.isArray(ids)) throw new Error('Invalid ranking source');
  if (!ids.length) return { ranking: [], page, hasMore: false };
  // Highlight is presentation only: never download the entire ranking to locate it.
  const featuredProfile = highlight && ids.includes(highlight) ? await getProfileData(highlight) : null;
  const { data, error } = await supabase.rpc('get_ranking_paginado', {
    ids, limite: RANKING_PAGE_SIZE + 1, deslocamento: (page - 1) * RANKING_PAGE_SIZE,
  });
  if (error) throw new Error('Ranking unavailable');
  const profiles = (data || []).slice(0, RANKING_PAGE_SIZE) as Candidato[];
  if (!profiles.length) return { ranking: [], page, hasMore: false };
  const historyResponse = await fetch(`${VPS}/api/candidaturas`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ perfil_id: `in.(${profiles.map(p => p.id).join(',')})` }),
    next: { revalidate: 300 }, signal: AbortSignal.timeout(15000),
  });
  if (!historyResponse.ok) throw new Error('Ranking history unavailable');
  const history: PublicCandidacy[] = await historyResponse.json();
  if (!Array.isArray(history)) throw new Error('Invalid ranking history');
  const ranking = profiles.map(profile => {
    const candidaturas = history.filter(c => c.perfil_id === profile.id).sort((a, b) => Number(b.ano_eleicao) - Number(a.ano_eleicao));
    const latest = candidaturas.find(c => (uf === 'BR' || c.uf === uf) && (!municipio || c.municipio?.toUpperCase() === municipio.toUpperCase())) || candidaturas[0];
    // Send only public display fields to the browser, not CPF or voter identifiers.
    return {
      id: profile.id, nome_completo: profile.nome_completo, elo_score: profile.elo_score,
      matches_count: profile.matches_count, nome_urna: latest?.nome_urna,
      cargo: latest?.cargo, partido: latest?.partido, uf: latest?.uf, municipio: latest?.municipio,
      foto: latest?.foto, ano_eleicao: latest?.ano_eleicao, nr_candidato: latest?.nr_candidato,
      candidaturas,
    } as Candidato;
  });
  return { ranking, page, hasMore: (data?.length || 0) > RANKING_PAGE_SIZE, featured: featuredProfile?.candidato || null };
});

import 'server-only';
import { cache } from 'react';

const VPS = process.env.NEXT_PUBLIC_VPS_API_URL || 'https://api.centraleti.com.br';
export const PROFILE_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface PublicCandidacy {
  perfil_id: string;
  nome_urna?: string;
  cargo?: string;
  partido?: string;
  uf?: string;
  municipio?: string;
  ano_eleicao?: number;
  nr_candidato?: number;
  foto?: string;
  sq_candidato?: string | number;
  ocupacao?: string;
  grau_instrucao?: string;
  situacao_candidatura?: string;
  resultado_turno?: string;
}
export interface PublicProfile {
  id: string;
  nome_completo?: string;
  nome_social?: string;
  genero?: string;
  cor_raca?: string;
  data_nascimento?: string;
  elo_score?: number;
  matches_count?: number;
}

async function json(url: string, init?: RequestInit) {
  const response = await fetch(url, { ...init, next: { revalidate: 300 }, signal: AbortSignal.timeout(15000) });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Candidate source unavailable (${response.status})`);
  return response.json();
}

// Shared by metadata, page and API. A source failure must never become "not found".
export const getProfileData = cache(async (rawId: string) => {
  if (!PROFILE_ID.test(rawId)) return null;
  const id = rawId.toLowerCase();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const [profileResult, historyResult, statsResult] = await Promise.all([
    json(`${VPS}/api/perfis-candidatos?id=${id}`),
    json(`${VPS}/api/candidaturas`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ perfil_id: `in.(${id})` }),
    }),
    supabaseUrl && key ? json(`${supabaseUrl}/rest/v1/perfis_candidatos?id=eq.${id}&select=nome_completo,nome_social,genero,cor_raca,data_nascimento,elo_score,matches_count`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    }) : Promise.resolve(null),
  ]);
  const profile: PublicProfile | undefined = Array.isArray(profileResult) ? profileResult[0] : profileResult;
  if (historyResult !== null && !Array.isArray(historyResult)) throw new Error('Invalid candidate history');
  const history: PublicCandidacy[] = (historyResult || []).filter((c: PublicCandidacy) => c.perfil_id?.toLowerCase() === id);
  history.sort((a, b) => Number(b.ano_eleicao) - Number(a.ano_eleicao));
  const stats: PublicProfile | undefined = statsResult?.[0];
  const validName = (value: string | undefined) => Boolean(value?.trim() && !['#NULO', '#NULO#', 'NULO', '#NE#'].includes(value.trim().toUpperCase()));
  // The VPS returns { id } with status 200 even for an unknown profile.
  if (!validName(profile?.nome_completo) && !validName(stats?.nome_completo) && !history.length) return null;
  if (profile && profile.id?.toLowerCase() !== id) throw new Error('Invalid candidate profile');
  const latest = history[0];
  return {
    candidato: {
      id,
      nome_completo: stats?.nome_completo || profile?.nome_completo || latest?.nome_urna || 'Candidato',
      nome_social: stats?.nome_social ?? profile?.nome_social,
      genero: stats?.genero ?? profile?.genero,
      cor_raca: stats?.cor_raca ?? profile?.cor_raca,
      data_nascimento: stats?.data_nascimento ?? profile?.data_nascimento,
      elo_score: stats?.elo_score ?? profile?.elo_score ?? 1200,
      matches_count: stats?.matches_count ?? profile?.matches_count ?? 0,
      nome_urna: latest?.nome_urna,
      cargo: latest?.cargo, partido: latest?.partido, uf: latest?.uf,
      municipio: latest?.municipio, ano_eleicao: latest?.ano_eleicao,
      nr_candidato: latest?.nr_candidato, foto: latest?.foto,
      candidaturas: history,
    },
    historico: history,
  };
});

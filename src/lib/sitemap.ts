import { ACTIVE_ELECTION_YEARS } from '@/constants/elections';
import { supabase } from '@/lib/supabaseClient';

export const SITEMAP_PAGE_SIZE = 1000;

export type SitemapCandidate = {
  id: string;
  uf: string;
};

export async function getSitemapCandidateCount() {
  const { count, error } = await supabase
    .from('candidaturas')
    .select('perfil_id', { count: 'exact', head: true })
    .in('ano_eleicao', [...ACTIVE_ELECTION_YEARS])
    .not('perfil_id', 'is', null)
    .not('uf', 'is', null);

  if (error) throw new Error(`Erro ao contar candidatos do sitemap: ${error.message}`);
  return count || 0;
}

export async function getSitemapCandidates(page: number): Promise<SitemapCandidate[]> {
  const from = page * SITEMAP_PAGE_SIZE;
  const { data, error } = await supabase
    .from('candidaturas')
    .select('perfil_id, uf, ano_eleicao')
    .in('ano_eleicao', [...ACTIVE_ELECTION_YEARS])
    .not('perfil_id', 'is', null)
    .not('uf', 'is', null)
    .order('ano_eleicao', { ascending: false })
    .order('perfil_id', { ascending: true })
    .range(from, from + SITEMAP_PAGE_SIZE - 1);

  if (error) throw new Error(`Erro ao carregar candidatos do sitemap: ${error.message}`);

  const candidates = new Map<string, string>();
  for (const candidacy of data || []) {
    if (!candidates.has(candidacy.perfil_id)) {
      candidates.set(candidacy.perfil_id, candidacy.uf);
    }
  }

  return Array.from(candidates, ([id, uf]) => ({ id, uf }));
}

export function xmlEscape(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

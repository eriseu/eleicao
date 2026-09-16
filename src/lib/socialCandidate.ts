import { cache } from 'react';
import { supabase } from './supabaseClient';
import { fetchCandidaturasFromVPS } from './vpsClient';

export const getSocialCandidate = cache(async (id: string) => {
  const [{ data: profile }, candidacies] = await Promise.all([
    supabase.from('perfis_candidatos').select('id, nome_completo').eq('id', id).maybeSingle(),
    fetchCandidaturasFromVPS([id]),
  ]);
  const candidaturas = [...candidacies].sort((a, b) => Number(b.ano_eleicao) - Number(a.ano_eleicao));
  if (!profile && !candidaturas.length) return null;
  return { ...profile, id, nome_urna: candidaturas[0]?.nome_urna, candidacy: candidaturas[0], candidaturas };
});

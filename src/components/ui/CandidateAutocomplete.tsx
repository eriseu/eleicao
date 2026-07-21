'use client';

import { useEffect, useState } from 'react';
import { ACTIVE_ELECTION_YEARS } from '@/constants/elections';
import { supabase } from '@/lib/supabaseClient';
import type { Candidato } from '@/types';

interface CandidateAutocompleteProps {
  label: string;
  selected: Candidato | null;
  onSelect: (candidate: Candidato) => void;
  uf: string;
  municipio?: string;
  excludeId?: string;
  disabled?: boolean;
}

const candidateSelection = `
  foto,
  nome_urna,
  partido,
  cargo,
  ano_eleicao,
  uf,
  municipio,
  sq_candidato,
  perfis_candidatos!perfil_id (
    id,
    nome_completo,
    cpf,
    titulo_eleitoral,
    created_at,
    elo_score,
    matches_count
  )
`;

function candidateLabel(candidate: Candidato) {
  const name = candidate.nome_urna || candidate.nome_completo;
  return `${name}${candidate.partido ? ` (${candidate.partido})` : ''}`;
}

export default function CandidateAutocomplete({
  label,
  selected,
  onSelect,
  uf,
  municipio,
  excludeId,
  disabled,
}: CandidateAutocompleteProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Candidato[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setQuery(selected ? candidateLabel(selected) : '');
    setResults([]);
  }, [selected]);

  useEffect(() => {
    const term = query.trim();
    if (disabled || term.length < 2 || (selected && term === candidateLabel(selected))) {
      setResults([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    const timeout = window.setTimeout(async () => {
      setLoading(true);

      let profilesQuery = supabase
        .from('perfis_candidatos')
        .select('id')
        .ilike('nome_completo', `%${term}%`)
        .limit(20);
      const profileResult = await profilesQuery;
      const profileIds = (profileResult.data || []).map((profile) => profile.id);

      let nameQuery = supabase
        .from('candidaturas')
        .select(candidateSelection)
        .in('ano_eleicao', [...ACTIVE_ELECTION_YEARS])
        .eq('uf', uf)
        .ilike('nome_urna', `%${term}%`)
        .limit(20);
      let profileCandidateQuery = supabase
        .from('candidaturas')
        .select(candidateSelection)
        .in('ano_eleicao', [...ACTIVE_ELECTION_YEARS])
        .eq('uf', uf)
        .in('perfil_id', profileIds.length > 0 ? profileIds : ['00000000-0000-0000-0000-000000000000'])
        .limit(20);

      if (uf !== 'BR' && municipio) {
        nameQuery = nameQuery.eq('municipio', municipio);
        profileCandidateQuery = profileCandidateQuery.eq('municipio', municipio);
      }

      const [nameResult, fullNameResult] = await Promise.all([nameQuery, profileCandidateQuery]);
      if (cancelled) return;

      const included = new Set<string>();
      const mapped = [...(nameResult.data || []), ...(fullNameResult.data || [])].flatMap((candidatura) => {
        const perfil = Array.isArray(candidatura.perfis_candidatos)
          ? candidatura.perfis_candidatos[0]
          : candidatura.perfis_candidatos;
        if (!perfil || perfil.id === excludeId || included.has(perfil.id)) return [];
        included.add(perfil.id);

        return [{
          id: perfil.id,
          nome_completo: perfil.nome_completo,
          cpf: perfil.cpf,
          titulo_eleitoral: perfil.titulo_eleitoral,
          created_at: perfil.created_at,
          elo_score: perfil.elo_score || 0,
          matches_count: perfil.matches_count || 0,
          nome_urna: candidatura.nome_urna || perfil.nome_completo,
          partido: candidatura.partido || 'S/P',
          cargo: candidatura.cargo,
          uf: candidatura.uf,
          municipio: candidatura.municipio,
          ultima_candidatura: {
            ...candidatura,
            perfil_id: perfil.id,
            created_at: perfil.created_at,
            sq_candidato: candidatura.sq_candidato || candidatura.foto,
          },
        }];
      }).sort((a, b) => candidateLabel(a).localeCompare(candidateLabel(b), 'pt-BR'));

      setResults(mapped.slice(0, 20));
      setLoading(false);
      setOpen(true);
    }, 300);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [disabled, excludeId, municipio, query, selected, uf]);

  return (
    <label className="relative block">
      <span className="mb-2 block text-xs uppercase tracking-[0.24em] text-slate-400">{label}</span>
      <input
        type="search"
        value={query}
        disabled={disabled}
        autoComplete="off"
        placeholder="Digite nome ou nome de urna"
        className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white shadow-inner outline-none focus:border-slate-500 disabled:cursor-not-allowed disabled:opacity-50"
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => window.setTimeout(() => setOpen(false), 150)}
      />
      {open && query.trim().length >= 2 && (
        <div className="absolute z-30 mt-2 max-h-72 w-full overflow-y-auto rounded-2xl border border-slate-700 bg-slate-950 p-2 shadow-2xl">
          {loading ? (
            <p className="px-3 py-2 text-sm text-slate-400">Buscando...</p>
          ) : results.length > 0 ? (
            results.map((candidate) => (
              <button
                key={candidate.id}
                type="button"
                className="block w-full rounded-xl px-3 py-2 text-left hover:bg-slate-800"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  onSelect(candidate);
                  setQuery(candidateLabel(candidate));
                  setOpen(false);
                }}
              >
                <span className="block text-sm font-semibold text-white">{candidate.nome_urna || candidate.nome_completo}</span>
                <span className="block text-xs text-slate-400">{candidate.cargo} · {candidate.partido}</span>
              </button>
            ))
          ) : (
            <p className="px-3 py-2 text-sm text-slate-400">Nenhum candidato encontrado.</p>
          )}
        </div>
      )}
    </label>
  );
}

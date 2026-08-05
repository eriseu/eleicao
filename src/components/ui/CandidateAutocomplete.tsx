'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { fetchCandidaturasFromVPS } from '@/lib/vpsClient';
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

      try {
        const sanitizedTerm = term.replace(/[()[\]{}]/g, '').trim();
        if (!sanitizedTerm) {
          if (!cancelled) {
            setResults([]);
            setLoading(false);
          }
          return;
        }

        const { data: perfisData, error: perfilError } = await supabase
          .from('perfis_candidatos')
          .select('*')
          .ilike('nome_completo', `%${sanitizedTerm}%`)
          .limit(25);

        if (perfilError || !perfisData || perfisData.length === 0) {
          if (!cancelled) {
            setResults([]);
            setLoading(false);
          }
          return;
        }

        const perfilIds = perfisData.map((p: any) => p.id);
        const candidaturas = await fetchCandidaturasFromVPS(perfilIds);

        if (cancelled) return;

        const perfisIncluidos = new Set<string>();
        const mapped = perfisData.flatMap((perfil: any) => {
          if (!perfil || !perfil.id || perfisIncluidos.has(perfil.id) || perfil.id === excludeId) {
            return [];
          }
          
          const candsDoPerfil = candidaturas.filter((c: any) => c.perfil_id === perfil.id);
          if (candsDoPerfil.length === 0) return [];

          const sortedCands = candsDoPerfil.sort((a: any, b: any) => Number(b.ano_eleicao) - Number(a.ano_eleicao));
          const candidaturaPrincipal = sortedCands[0];

          if (uf !== 'BR' && candidaturaPrincipal.uf !== uf) {
            return [];
          }
          if (municipio && candidaturaPrincipal.municipio !== municipio) {
            return [];
          }

          perfisIncluidos.add(perfil.id);

          const candidaturaComFoto = sortedCands.find((c: any) => {
            const foto = c.foto || c.sq_candidato;
            if (!foto) return false;
            const fotoStr = String(foto);
            return fotoStr.trim() !== '' && !fotoStr.includes('avatar.png');
          });

          const fotoFinal = candidaturaComFoto ? (candidaturaComFoto.foto || candidaturaComFoto.sq_candidato) : candidaturaPrincipal.foto;

          return [{
            id: perfil.id,
            nome_completo: perfil.nome_completo,
            cpf: perfil.cpf,
            titulo_eleitoral: perfil.titulo_eleitoral,
            created_at: perfil.created_at,
            elo_score: perfil.elo_score ?? 1200,
            matches_count: perfil.matches_count ?? 0,
            nome_urna: candidaturaPrincipal.nome_urna || perfil.nome_completo,
            partido: candidaturaPrincipal.partido || 'S/P',
            cargo: candidaturaPrincipal.cargo,
            ano_eleicao: candidaturaPrincipal.ano_eleicao,
            uf: candidaturaPrincipal.uf,
            municipio: candidaturaPrincipal.municipio,
            foto: fotoFinal,
            candidaturas: sortedCands,
            ultima_candidatura: {
              ...candidaturaPrincipal,
              foto: fotoFinal,
              perfil_id: perfil.id,
              created_at: perfil.created_at,
              sq_candidato: Number(candidaturaPrincipal.sq_candidato) || 0,
            },
          }];
        }).sort((a, b) => candidateLabel(a).localeCompare(candidateLabel(b), 'pt-BR'));

        if (!cancelled) {
          setResults(mapped.slice(0, 20));
          setLoading(false);
          setOpen(true);
        }
      } catch (err) {
        console.error('Erro no Autocomplete:', err);
        if (!cancelled) {
          setResults([]);
          setLoading(false);
        }
      }
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

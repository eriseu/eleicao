'use client';

import { useEffect, useState, useRef } from 'react';
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

const R2_URL = process.env.NEXT_PUBLIC_R2_URL || '';

// Cache local em memória para não baixar o JSON do R2 repetidas vezes na mesma sessão
const cacheCandidatosUf: Record<string, any[]> = {};

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
  
  // Referência para guardar a lista bruta do estado atual
  const candidatosUfRef = useRef<any[]>([]);

  useEffect(() => {
    setQuery(selected ? candidateLabel(selected) : '');
    setResults([]);
  }, [selected]);

  // Carrega o JSON do R2 assim que a UF mudar
  useEffect(() => {
    let cancelled = false;
    if (!uf) return;

    async function carregarCacheR2() {
      const ufKey = uf.toUpperCase();
      if (cacheCandidatosUf[ufKey]) {
        candidatosUfRef.current = cacheCandidatosUf[ufKey];
        return;
      }

      try {
        const res = await fetch(`${R2_URL}/candidatos/${ufKey}.json`);
        if (res.ok) {
          const data = await res.json();
          if (!cancelled) {
            cacheCandidatosUf[ufKey] = data;
            candidatosUfRef.current = data;
          }
        }
      } catch (err) {
        console.error('Erro ao carregar candidatos do R2:', err);
      }
    }

    carregarCacheR2();
    return () => {
      cancelled = true;
    };
  }, [uf]);

  // Processo de busca local instantânea
  useEffect(() => {
    const term = query.trim();
    if (disabled || term.length < 2 || (selected && term === candidateLabel(selected))) {
      setResults([]);
      setLoading(false);
      return;
    }

    const timeout = window.setTimeout(() => {
      setLoading(true);
      const sanitizedTerm = term.replace(/[()[\]{}]/g, '').toLowerCase();
      
      if (!sanitizedTerm || candidatosUfRef.current.length === 0) {
        setResults([]);
        setLoading(false);
        return;
      }

      // Filtra direto na lista em memória vinda do R2
      const filtrados = candidatosUfRef.current.filter((c: any) => {
        if (c.id === excludeId) return false;

        // Filtro opcional por município se informado
        if (municipio && c.municipio && c.municipio.toLowerCase() !== municipio.toLowerCase()) {
          return false;
        }

        const nomeCompleto = (c.nome_completo || '').toLowerCase();
        const nomeUrna = (c.nome_urna || '').toLowerCase();

        return nomeCompleto.includes(sanitizedTerm) || nomeUrna.includes(sanitizedTerm);
      });

      // Mapeia para o formato esperado pelo componente
      const mapped: Candidato[] = filtratesMap(filtrados);

      setResults(mapped.slice(0, 20));
      setLoading(false);
      setOpen(true);
    }, 200);

    return () => window.clearTimeout(timeout);
  }, [query, municipio, excludeId, selected, disabled]);

  function filtratesMap(lista: any[]): Candidato[] {
    const mapUnicos = new Map();

    lista.forEach((c: any) => {
      // Como o R2 já traz a candidatura/perfil consolidada por ID, evitamos duplicatas
      if (!mapUnicos.has(c.id)) {
        mapUnicos.set(c.id, {
          id: c.id,
          nome_completo: c.nome_completo,
          nome_urna: c.nome_urna || c.nome_completo,
          partido: c.partido || 'S/P',
          cargo: c.cargo,
          ano_eleicao: c.ano_eleicao,
          uf: c.uf,
          municipio: c.municipio,
          foto: c.foto || c.sq_candidato,
          elo_score: 1200,
          matches_count: 0,
          ultima_candidatura: {
            ...c,
            perfil_id: c.id,
            sq_candidato: Number(c.sq_candidato) || 0,
          },
        });
      }
    });

    return Array.from(mapUnicos.values()).sort((a, b) => 
      candidateLabel(a).localeCompare(candidateLabel(b), 'pt-BR')
    );
  }

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

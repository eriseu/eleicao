'use client';

/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useState } from 'react';
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
  const [error, setError] = useState('');

  useEffect(() => {
    setQuery(selected ? candidateLabel(selected) : '');
    setResults([]);
  }, [selected]);

  useEffect(() => {
    const term = query.trim();
    if (disabled || term.length < 2 || (selected && term === candidateLabel(selected))) {
      setResults([]);
      setLoading(false);
      setError('');
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    setResults([]);
    setError('');
    const timer = window.setTimeout(async () => {
      try {
        const params = new URLSearchParams({ uf, q: term });
        if (municipio) params.set('municipio', municipio);
        if (excludeId) params.set('exclude', excludeId);
        const response = await fetch(`/api/candidatos?${params}`, { signal: controller.signal });
        if (!response.ok) throw new Error('Busca indisponível');
        const data = await response.json();
        if (!controller.signal.aborted) setResults(data);
      } catch {
        if (!controller.signal.aborted) setError('Não foi possível buscar. Tente novamente.');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 250);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [query, uf, municipio, excludeId, selected, disabled]);

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
          ) : error ? (
            <p role="alert" className="px-3 py-2 text-sm text-amber-300">{error}</p>
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
                <span className="block text-sm font-semibold text-white">
                  {candidate.nome_urna || candidate.nome_completo}
                </span>
                <span className="block text-xs text-slate-400">
                  {candidate.cargo} · {candidate.partido}
                </span>
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

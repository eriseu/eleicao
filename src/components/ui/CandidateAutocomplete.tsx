'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import type { Candidato } from '@/types';
import { fetchJsonSafely } from '@/lib/robustJson';
import { normalizeText } from '@/lib/municipioOptions';

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

// Mapeamento de cargos permitidos por escopo
const CARGOS_POR_ESCOPO = {
  nacional: ['PRESIDENTE', 'VICE-PRESIDENTE'],
  estadual: [
    'DEPUTADO ESTADUAL',
    'DEPUTADO FEDERAL',
    'GOVERNADOR',
    'VICE-GOVERNADOR',
    'SENADOR',
  ],
  municipal: ['PREFEITO', 'VICE-PREFEITO', 'VEREADOR'],
};

// Cache local em memória para não baixar o JSON do R2 repetidas vezes na mesma sessão
const cacheCandidatosUf: Record<string, any[]> = {};
const cacheCandidatosCompletos: Record<string, any[]> = {};

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
        const data = await fetchJsonSafely<any[]>(`${R2_URL}/candidatos/${ufKey}.json`);
        if (!cancelled && Array.isArray(data)) {
          cacheCandidatosUf[ufKey] = data;
          candidatosUfRef.current = data;
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

  // Retorna os cargos permitidos de acordo com o estado/município selecionados
  const getCargosPermitidos = useCallback(() => {
    if (uf === 'BR') {
      return CARGOS_POR_ESCOPO.nacional;
    }
    // Se selecionou município => SOMENTE municipal
    if (municipio && municipio.trim() !== '') {
      return CARGOS_POR_ESCOPO.municipal;
    }
    // Se selecionou UF sem município => SOMENTE estadual
    return CARGOS_POR_ESCOPO.estadual;
  }, [uf, municipio]);

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

      const termoBusca = normalizeText(sanitizedTerm);
      const cargosPermitidos = getCargosPermitidos();
      const municipioBusca = normalizeText(municipio);

      const getMunicipioCandidate = (c: any): string => {
        const values = [
          c?.municipio,
          c?.ultima_candidatura?.municipio,
          c?.candidaturas?.map((item: any) => item?.municipio),
        ].flat();

        return values.find((value) => typeof value === 'string' && value.trim() !== '') || '';
      };

      // Filtra direto na lista em memória vinda do R2 usando a busca tolerante a acentos
      const filtrarCandidatos = (lista: any[]) => lista.filter((c: any) => {
        if (c.id === excludeId) return false;

        const cargoCandidato = (c.cargo || '').toUpperCase().trim();
        const cargoValido = cargosPermitidos.some(
          (cargo) => cargo.toUpperCase().trim() === cargoCandidato
        );
        if (!cargoValido) return false;

        if (municipioBusca && getMunicipioCandidate(c) && normalizeText(getMunicipioCandidate(c)) !== municipioBusca) {
          return false;
        }

        const matchCompleto = normalizeText(c.nome_completo).includes(termoBusca);
        const matchUrna = normalizeText(c.nome_urna || '').includes(termoBusca);

        return matchCompleto || matchUrna;
      });

      const filtrados = filtrarCandidatos(candidatosUfRef.current);

      const concluirBusca = (lista: any[]) => {
        const mapped: Candidato[] = filtratesMap(lista);

        setResults(mapped.slice(0, 20));
        setLoading(false);
        setOpen(true);
      };

      if (filtrados.length > 0 || cacheCandidatosCompletos[uf.toUpperCase()]) {
        concluirBusca(filtrados.length > 0 ? filtrados : filtrarCandidatos(cacheCandidatosCompletos[uf.toUpperCase()]));
        return;
      }

      void fetch(`${process.env.NEXT_PUBLIC_VPS_API_URL || 'https://api.centraleti.com.br'}/api/candidatos-completos?uf=${encodeURIComponent(uf.toUpperCase())}`)
        .then((response) => response.ok ? response.json() : [])
        .then((data) => {
          const completos = Array.isArray(data) ? data : [];
          cacheCandidatosCompletos[uf.toUpperCase()] = completos;
          concluirBusca(filtrarCandidatos(completos));
        })
        .catch((error) => {
          console.error('Erro ao carregar candidatos completos:', error);
          concluirBusca([]);
        });
    }, 200);

    return () => window.clearTimeout(timeout);
  }, [query, municipio, excludeId, selected, disabled, getCargosPermitidos]);

  function filtratesMap(lista: any[]): Candidato[] {
    const mapUnicos = new Map();

    lista.forEach((c: any) => {
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

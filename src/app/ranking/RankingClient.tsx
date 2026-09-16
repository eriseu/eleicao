'use client';

/* eslint-disable react-hooks/set-state-in-effect, @typescript-eslint/no-explicit-any */

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { fetchCandidaturasFromVPS } from '@/lib/vpsClient';
import { Candidato } from '@/types';
import CandidateImage from '@/components/ui/CandidateImage';
import Link from 'next/link';
import { ACTIVE_ELECTION_YEARS, AVAILABLE_UFS } from '@/constants/elections';
import { buildMunicipioOptions, buildStateOptions, getStateNameFromUf, STATE_CAPITAIS } from '@/lib/municipioOptions';

// Helper para validar campos ignorando nulos e marcadores
function eValido(valor: any): boolean {
  if (valor === null || valor === undefined) return false;
  const str = String(valor).trim().toUpperCase();
  return str !== '' && str !== '#NULO' && str !== '#NULO#' && str !== 'NULO' && str !== '#NE#';
}

const CARGOS_POR_ESCOPO: { [key: string]: string[] } = {
  nacional: ['PRESIDENTE', 'VICE-PRESIDENTE'],
  estadual: [
    'DEPUTADO ESTADUAL',
    'DEPUTADA ESTADUAL',
    'DEPUTADO FEDERAL',
    'DEPUTADA FEDERAL',
    'GOVERNADOR',
    'GOVERNADORA',
    'VICE-GOVERNADOR',
    'VICE-GOVERNADORA',
    'SENADOR',
    'SENADORA',
  ],
  municipal: ['PREFEITO', 'PREFEITA', 'VICE-PREFEITO', 'VICE-PREFEITA', 'VEREADOR', 'VEREADORA'],
};

const ITEMS_PER_PAGE = 10;

function RankingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const requestedUf = searchParams.get('uf')?.toUpperCase();
  const initialUf = requestedUf && AVAILABLE_UFS.some(uf => uf === requestedUf)
    ? requestedUf 
    : 'BR';

  const [ranking, setRanking] = useState<Candidato[]>([]);
  const [page, setPage] = useState(0);
  const [municipios, setMunicipios] = useState<Array<{ value: string; label: string }>>([]);
  const [selectedUf, setSelectedUf] = useState(initialUf);
  const [selectedMunicipio, setSelectedMunicipio] = useState(searchParams.get('municipio') || '');
  const [activeHighlightId, setActiveHighlightId] = useState(searchParams.get('highlight') || '');
  const loadRequestIdRef = useRef(0);

  const [loading, setLoading] = useState(false);
  const [shareFeedback, setShareFeedback] = useState('');
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    const ufParam = searchParams.get('uf')?.toUpperCase();
    if (ufParam && (AVAILABLE_UFS as readonly string[]).includes(ufParam)) {
      setSelectedUf(ufParam as any);
    }
    const munParam = searchParams.get('municipio');
    if (munParam !== null) {
      setSelectedMunicipio(munParam);
    }

    const nextHighlightId = searchParams.get('highlight') || '';
    if (nextHighlightId) {
      setActiveHighlightId(nextHighlightId);
      return;
    }

    setActiveHighlightId('');
  }, [searchParams]);

  useEffect(() => {
    if (selectedUf === 'BR') {
      setMunicipios(buildStateOptions());
      return;
    }

    async function loadMunicipios() {
      const response = await fetch(`${process.env.NEXT_PUBLIC_VPS_API_URL}/api/municipios?uf=${selectedUf}`);
      if (!response.ok) {
        console.error('Falha ao buscar municípios do VPS');
        setMunicipios([]);
        return;
      }
      const data = await response.json();
      setMunicipios(buildMunicipioOptions(data || [], selectedUf));
    }

    void loadMunicipios();
  }, [selectedUf]);

  const getCargosPorEscopo = useCallback(() => {
    if (selectedUf === 'BR') {
      return CARGOS_POR_ESCOPO.nacional;
    }
    if (selectedMunicipio && selectedMunicipio.trim() !== '') {
      return CARGOS_POR_ESCOPO.municipal;
    }
    return CARGOS_POR_ESCOPO.estadual;
  }, [selectedUf, selectedMunicipio]);

  const processCandidaturas = (perfis: any[], candidaturas: any[], cargosPermitidos: string[]): Candidato[] => {
    const perfisIncluidos = new Set<string>();

    return perfis.flatMap((perfil) => {
      if (!perfil || !perfil.id || perfisIncluidos.has(perfil.id)) {
        return [];
      }
      perfisIncluidos.add(perfil.id);

      const candsDoPerfil = candidaturas.filter((c: any) => c.perfil_id === perfil.id);
      if (candsDoPerfil.length === 0) return [];

      // ORDENAÇÃO RIGOROSA: Garante que a primeira seja SEMPRE a eleição mais recente (ex: 2026 > 2022 > 2018)
      const sortedCands = [...candsDoPerfil].sort((a: any, b: any) => Number(b.ano_eleicao) - Number(a.ano_eleicao));

      // 1. Procura a candidatura mais recente que se encaixe nos filtros atuais
      const candidaturaCorrespondente = sortedCands.find((c: any) => 
        (selectedUf === 'BR' || c.uf?.toUpperCase() === selectedUf.toUpperCase()) &&
        (!selectedMunicipio || (c.municipio || '').toUpperCase().trim() === selectedMunicipio.toUpperCase().trim())
      );

      // 2. Se não achar filtro específico, pega estritamente a mais recente do histórico geral
      const candidaturaPrincipal = candidaturaCorrespondente || sortedCands[0];
      const fotoFinal = candidaturaPrincipal.foto || candidaturaPrincipal.sq_candidato || '';

      return [{
        id: perfil.id,
        nome_completo: perfil.nome_completo,
        cpf: perfil.cpf,
        titulo_eleitoral: perfil.titulo_eleitoral,
        created_at: perfil.created_at,
        elo_score: perfil.elo_score ?? 1200,
        matches_count: perfil.matches_count ?? 0,
        nome_urna: candidaturaPrincipal.nome_urna || perfil.nome_completo,
        nr_candidato: candidaturaPrincipal.nr_candidato,
        partido: candidaturaPrincipal.partido || 'S/P',
        cargo: candidaturaPrincipal.cargo,
        ano_eleicao: candidaturaPrincipal.ano_eleicao, // Garantido o ano mais recente
        uf: candidaturaPrincipal.uf,
        municipio: candidaturaPrincipal.municipio,
        foto: fotoFinal,
        candidaturas: sortedCands,
        ultima_candidatura: {
          ...candidaturaPrincipal,
          foto: fotoFinal,
          perfil_id: perfil.id,
          created_at: perfil.created_at,
          sq_candidato: candidaturaPrincipal.sq_candidato,
        },
      }];
    });
  };

  const fetchRankingData = useCallback(async (currentPage: number, cargos: string[], targetHighlightId?: string) => {
    try {
      const queryParams = new URLSearchParams();
      queryParams.append('uf', selectedUf);
      cargos.forEach(cargo => queryParams.append('cargos', cargo));
      if (selectedMunicipio) {
        queryParams.append('municipio', selectedMunicipio);
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_VPS_API_URL}/api/candidatos-filtrados?${queryParams.toString()}`);
      if (!response.ok) return [];

      const perfilIdsVps: string[] = await response.json();
      if (!perfilIdsVps || perfilIdsVps.length === 0) return [];

      let actualPage = currentPage;
      if (targetHighlightId && perfilIdsVps.includes(targetHighlightId)) {
        const { data: allRankedIds } = await supabase.rpc('get_ranking_paginado', {
          ids: perfilIdsVps,
          limite: perfilIdsVps.length,
          deslocamento: 0
        });
        
        if (allRankedIds) {
          const index = allRankedIds.findIndex((p: any) => p.id === targetHighlightId);
          if (index !== -1) {
            actualPage = Math.floor(index / ITEMS_PER_PAGE);
            if (actualPage !== page) {
              setPage(actualPage);
            }
          }
        }
      }

      const from = actualPage * ITEMS_PER_PAGE;
      const { data, error } = await supabase.rpc('get_ranking_paginado', {
        ids: perfilIdsVps,
        limite: ITEMS_PER_PAGE,
        deslocamento: from
      });

      if (error || !data || data.length === 0) {
        setHasMore(false);
        return [];
      }

      setHasMore(data.length === ITEMS_PER_PAGE);

      const perfilIds = data.map((p: any) => p.id);
      const candidaturas = (await fetchCandidaturasFromVPS(perfilIds)) || [];

      // Ordena candidaturas trazidas para pegar a mais recente
      const candidaturasProcessadas = perfilIds.map((id: any) => {
        const candsDoPerfil = (candidaturas as any[]).filter((c: any) =>
          c.perfil_id === id &&
          (ACTIVE_ELECTION_YEARS as readonly number[]).includes(Number(c.ano_eleicao)) &&
          (selectedUf === 'BR' || c.uf?.toUpperCase() === selectedUf.toUpperCase()) &&
          (!selectedMunicipio || c.municipio?.trim().toUpperCase() === selectedMunicipio.trim().toUpperCase())
        );
        return candsDoPerfil.sort((a: any, b: any) => Number(b.ano_eleicao) - Number(a.ano_eleicao))[0];
      }).filter(Boolean);

      const perfisValidosIds = new Set(candidaturasProcessadas.map((c: any) => c.perfil_id));
      const perfisFiltrados = data.filter((p: any) => perfisValidosIds.has(p.id));

      return processCandidaturas(perfisFiltrados, candidaturas, cargos);
    } catch (err) {
      console.error('Erro ao buscar dados do ranking:', err);
      return [];
    }
  }, [selectedUf, selectedMunicipio, page]);

  useEffect(() => {
    if (!isMounted) return;

    const loadRanking = async () => {
      const currentRequestId = ++loadRequestIdRef.current;
      setLoading(true);
      const cargos = getCargosPorEscopo();

      const rankingData = await fetchRankingData(page, cargos, activeHighlightId);
      if (currentRequestId !== loadRequestIdRef.current) return;

      setRanking(rankingData);
      setLoading(false);
    };

    void loadRanking();
  }, [isMounted, activeHighlightId, page, selectedUf, selectedMunicipio, getCargosPorEscopo, fetchRankingData]);

  useEffect(() => {
    if (!activeHighlightId || loading) return;
    const timer = setTimeout(() => {
      document.getElementById(`ranking-${activeHighlightId}`)?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }, 150);

    return () => clearTimeout(timer);
  }, [activeHighlightId, loading, ranking]);

  useEffect(() => {
    setPage(0);
  }, [selectedUf, selectedMunicipio]);

  useEffect(() => {
    if (!isMounted) return;

    const params = new URLSearchParams();
    if (selectedUf) params.set('uf', selectedUf);
    if (selectedMunicipio) params.set('municipio', selectedMunicipio);
    if (activeHighlightId) params.set('highlight', activeHighlightId);

    const nextUrl = `/ranking?${params.toString()}`;
    const currentUrl = `${window.location.pathname}${window.location.search}`;

    if (currentUrl !== nextUrl) {
      router.replace(nextUrl, { scroll: false });
    }
  }, [isMounted, selectedUf, selectedMunicipio, activeHighlightId, router]);

  const syncRankingUrl = useCallback((preserveHighlight = false) => {
    const params = new URLSearchParams();
    if (selectedUf) params.set('uf', selectedUf);
    if (selectedMunicipio) params.set('municipio', selectedMunicipio);
    if (preserveHighlight && activeHighlightId) params.set('highlight', activeHighlightId);

    const nextUrl = `/ranking?${params.toString()}`;
    const currentUrl = `${window.location.pathname}${window.location.search}`;

    if (currentUrl !== nextUrl) {
      router.replace(nextUrl, { scroll: false });
    }
  }, [activeHighlightId, router, selectedMunicipio, selectedUf]);

  const handlePageChange = useCallback((nextPage: number) => {
    setPage(nextPage);
    setActiveHighlightId('');
    syncRankingUrl(false);
  }, [syncRankingUrl]);

  const handleShare = async () => {
    try {
      const region = selectedMunicipio || getStateNameFromUf(selectedUf);
      const shareUrl = new URL(window.location.href);
      shareUrl.searchParams.delete('highlight');

      const targetUrl = shareUrl.pathname + shareUrl.search + shareUrl.hash;
      const fullUrl = new URL(targetUrl, process.env.NEXT_PUBLIC_SITE_URL || window.location.origin).toString();

      const shareData = {
        title: 'Ranking Duelo Político',
        text: `Confira o ranking dos políticos de ${region} no Duelo Político!`,
        url: fullUrl,
      };

      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(shareData.url);
        setShareFeedback('✅ Link copiado para a área de transferência!');
        setTimeout(() => setShareFeedback(''), 3000);
      }
    } catch (error) {
      console.error('[Ranking Share Error]:', error);
      try {
        const shareUrl = new URL(window.location.href);
        shareUrl.searchParams.delete('highlight');
        const targetUrl = shareUrl.pathname + shareUrl.search + shareUrl.hash;
        const fullUrl = new URL(targetUrl, process.env.NEXT_PUBLIC_SITE_URL || window.location.origin).toString();
        
        await navigator.clipboard.writeText(fullUrl);
        setShareFeedback('✅ Link copiado para a área de transferência!');
        setTimeout(() => setShareFeedback(''), 3000);
      } catch (copyError) {
        console.error('[Ranking Copy Error]:', copyError);
        setShareFeedback('❌ Erro ao copiar o link. Tente novamente.');
        setTimeout(() => setShareFeedback(''), 3000);
      }
    }
  };

  if (!isMounted) {
    return <div className="min-h-screen bg-slate-950 p-8 text-center text-slate-400">Carregando ranking...</div>;
  }

  return (
    <main className="bg-slate-950 text-slate-100 pb-28">
      <div className="mx-auto max-w-3xl px-4 py-6">
        <header className="text-center mb-6">
          <p className="text-sm uppercase tracking-[0.35em] text-slate-400">Ranking</p>
          <h1 className="mt-2 text-3xl font-black text-white">Top Candidatos</h1>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-slate-400">
            Filtre por Brasil, estado ou município para ver os candidatos com maior elo.
          </p>
        </header>

        <section className="mb-6 rounded-[32px] border border-white/10 bg-slate-900/80 p-5 shadow-xl shadow-slate-950/30">
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="block min-w-0">
              <span className="mb-2 block text-xs uppercase tracking-[0.24em] text-slate-400">Estado</span>
              <select
                className="min-w-0 max-w-full w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white shadow-inner outline-none focus:border-slate-500"
                value={selectedUf}
                onChange={(event) => {
                  setSelectedUf(event.target.value);
                  setSelectedMunicipio('');
                  setPage(0);
                  setActiveHighlightId('');
                  syncRankingUrl(false);
                }}
              >
                <option value="BR">Brasil</option>
                {AVAILABLE_UFS.filter((uf) => uf !== 'BR').map((uf) => (
                  <option key={uf} value={uf}>{uf}</option>
                ))}
              </select>
            </label>
            <label className="block min-w-0">
              <span className="mb-2 block text-xs uppercase tracking-[0.24em] text-slate-400">
                {selectedUf === 'BR' ? 'Estado' : 'Município'}
              </span>
              <select
                className="min-w-0 max-w-full w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white shadow-inner outline-none focus:border-slate-500"
                value={selectedMunicipio}
                onChange={(event) => {
                  const nextValue = event.target.value;

                  if (selectedUf === 'BR') {
                    if (!nextValue) {
                      setSelectedUf('BR');
                      setSelectedMunicipio('');
                    } else {
                      setSelectedUf(nextValue);
                      setSelectedMunicipio('');
                    }
                    setPage(0);
                    setActiveHighlightId('');
                    syncRankingUrl(false);
                    return;
                  }

                  setSelectedMunicipio(nextValue);
                  setPage(0);
                  setActiveHighlightId('');
                  syncRankingUrl(false);
                }}
              >
                <option value="">{selectedUf === 'BR' ? 'Todos os Estados' : 'Todos os Municípios'}</option>
                {municipios.map((option, index) => {
                  const isCapital = selectedUf !== 'BR' && option.value.toUpperCase() === STATE_CAPITAIS[selectedUf.toUpperCase()]?.toUpperCase();

                  return (
                    <option
                      key={`${option.value}-${index}`}
                      value={option.value}
                      style={isCapital ? { color: '#fbbf24' } : undefined}
                    >
                      {option.label}
                    </option>
                  );
                })}
              </select>
            </label>
            <div className="flex min-w-0 flex-col items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Escopo</p>
                <p className="mt-2 break-words text-sm text-slate-200">{selectedUf === 'BR' ? 'Brasil' : `${selectedUf}${selectedMunicipio ? ` · ${selectedMunicipio}` : ''}`}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedUf('BR');
                  setSelectedMunicipio('');
                  setPage(0);
                  setActiveHighlightId('');
                  syncRankingUrl(false);
                }}
                disabled={selectedUf === 'BR' && selectedMunicipio === ''}
                className="inline-flex items-center justify-center rounded-2xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:border-slate-500 hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Limpar filtros
              </button>
            </div>
          </div>
        </section>

        <section className="space-y-3">
          {loading ? (
            <div className="rounded-[32px] border border-dashed border-slate-700 bg-slate-900/80 p-8 text-center text-sm text-slate-400">
              Carregando candidatos...
            </div>
          ) : ranking.length > 0 ? (
            ranking.map((cand, index) => (
              <Link
                href={`/candidato/${cand.id}`}
                key={cand.id}
                id={`ranking-${cand.id}`}
                className={`group grid grid-cols-[3rem_minmax(0,1fr)] items-start gap-x-3 gap-y-3 rounded-[24px] border p-4 transition sm:grid-cols-[4rem_minmax(0,1fr)_auto] sm:gap-x-4 sm:gap-y-1 sm:rounded-[28px] ${
                  cand.id === activeHighlightId
                    ? 'border-emerald-400 bg-emerald-500/10 shadow-lg shadow-emerald-500/10 ring-2 ring-emerald-400/40'
                    : 'border-white/10 bg-slate-900/80 hover:border-slate-500 hover:bg-slate-800'
                }`}
              >
                <div className="h-12 w-12 overflow-hidden rounded-2xl border border-slate-700 bg-slate-950 sm:row-span-2 sm:h-16 sm:w-16 sm:rounded-3xl">
                  <CandidateImage candidato={cand} alt={cand.nome_completo} className="h-full w-full object-cover" />
                </div>
                <div className="min-w-0 sm:col-start-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="shrink-0 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold tabular-nums text-emerald-300">
                      {page * ITEMS_PER_PAGE + index + 1}º
                    </span>
                    {cand.id === activeHighlightId && (
                      <span className="rounded-full bg-emerald-400 px-2 py-1 text-[10px] font-black uppercase text-slate-950">Destaque</span>
                    )}
                  </div>
                  <p className="mt-1 break-words text-sm font-bold leading-snug text-white">{cand.nome_completo}</p>
                </div>
                <div className="col-span-2 min-w-0 sm:col-span-1 sm:col-start-2 sm:row-start-2">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs leading-relaxed text-slate-400 sm:text-sm">
                    <span className="font-semibold text-emerald-400">{cand.ultima_candidatura?.ano_eleicao}</span>
                    <span className="min-w-0 break-words">{[cand.cargo, cand.partido].filter(Boolean).join(' · ')}</span>
                    {eValido((cand as any).nr_candidato) && (
                      <span className="max-w-full break-words rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 font-mono text-xs font-bold text-amber-300">
                        Nº {(cand as any).nr_candidato}
                      </span>
                    )}
                  </div>
                  <p className="mt-2 break-words text-xs uppercase leading-relaxed tracking-wide text-slate-400">{[cand.municipio, cand.uf].filter(Boolean).join(' · ')}</p>
                </div>
                <div className="col-span-2 flex min-w-0 items-center justify-between gap-3 border-t border-white/10 pt-3 sm:col-span-1 sm:col-start-3 sm:row-start-1 sm:row-span-2 sm:flex-col sm:self-center sm:gap-0 sm:rounded-3xl sm:border-0 sm:bg-slate-950 sm:px-4 sm:py-2">
                  <p className="text-xs uppercase tracking-wider text-slate-400">Elo</p>
                  <p className="break-words text-lg font-black tabular-nums text-white">{cand.elo_score}</p>
                </div>
              </Link>
            ))
          ) : (
            <div className="rounded-[32px] border border-dashed border-slate-700 bg-slate-900/80 p-8 text-center text-sm text-slate-400">
              Nenhum candidato encontrado para esse filtro.
            </div>
          )}
        </section>

        <div className="mt-6 grid grid-cols-[1fr_auto_1fr] items-center gap-2 rounded-3xl border border-white/10 bg-slate-900/80 p-4 text-sm text-slate-400 shadow-xl shadow-slate-950/20">
          <button
            disabled={page === 0}
            onClick={() => handlePageChange(Math.max(page - 1, 0))}
            className="min-h-11 min-w-0 rounded-2xl border border-slate-700 bg-slate-950 px-2 py-2 text-xs font-semibold transition sm:px-4 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Anterior
          </button>
          <span className="text-center text-xs font-bold text-white sm:text-sm">Página {page + 1}</span>
          <button
            disabled={!hasMore || ranking.length < ITEMS_PER_PAGE}
            onClick={() => handlePageChange(page + 1)}
            className="min-h-11 min-w-0 rounded-2xl border border-slate-700 bg-slate-950 px-2 py-2 text-xs font-semibold transition sm:px-4 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Próxima
          </button>
        </div>

        <div className="mt-8 text-center">
          <button
            type="button"
            onClick={handleShare}
            className="inline-flex items-center justify-center rounded-full border border-emerald-500 bg-emerald-500 px-8 py-3 text-sm font-bold text-slate-950 transition hover:bg-emerald-400 hover:border-emerald-400"
          >
            Compartilhar Ranking
          </button>
          {shareFeedback && (
            <p className="mt-3 text-xs text-emerald-300">{shareFeedback}</p>
          )}
        </div>

      </div>
    </main>
  );
}

export default function Ranking() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 p-8 text-center text-slate-400">Carregando ranking...</div>}>
      <RankingContent />
    </Suspense>
  );
}

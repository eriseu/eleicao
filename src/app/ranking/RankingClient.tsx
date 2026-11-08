'use client';

/* eslint-disable react-hooks/set-state-in-effect, @typescript-eslint/no-explicit-any */

import { getVpsApiUrl } from '@/lib/vpsUrl';
import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { fetchCandidaturasFromVPS } from '@/lib/vpsClient';
import { Candidato } from '@/types';
import CandidateImage from '@/components/ui/CandidateImage';
import Link from 'next/link';
import { ACTIVE_ELECTION_YEARS, AVAILABLE_UFS } from '@/constants/elections';
import { buildMunicipioOptions, buildStateOptions, getStateNameFromUf, normalizeText, STATE_CAPITAIS } from '@/lib/municipioOptions';

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
  const selectedUf = initialUf;
  const selectedMunicipio = selectedUf === 'BR' ? '' : searchParams.get('municipio')?.trim() || '';
  const activeHighlightId = searchParams.get('highlight') || '';
  const resolvedHighlightRef = useRef('');

  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [shareFeedback, setShareFeedback] = useState('');
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    if (selectedUf === 'BR') {
      setMunicipios(buildStateOptions());
      return;
    }
    setMunicipios([]);
    async function loadMunicipios() {
      try {

        const response = await fetch(`${getVpsApiUrl()}/municipios?uf=${selectedUf}`, { signal: controller.signal });
        if (!response.ok) throw new Error(`Municípios: HTTP ${response.status}`);
        const data = await response.json();
        if (!Array.isArray(data)) throw new Error('Formato de municípios inválido');
        if (!controller.signal.aborted) setMunicipios(buildMunicipioOptions(data, selectedUf));
      } catch (error) {
        if (!controller.signal.aborted) console.error('Falha ao buscar municípios', error);
      }
    }
    void loadMunicipios();
    return () => controller.abort();
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

  const processCandidaturas = useCallback((perfis: any[], candidaturas: any[], cargosPermitidos: string[]): Candidato[] => {
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
        cargosPermitidos.includes(normalizeText(c.cargo)) &&
        (ACTIVE_ELECTION_YEARS as readonly number[]).includes(Number(c.ano_eleicao)) &&
        (selectedUf === 'BR' || c.uf?.toUpperCase() === selectedUf.toUpperCase()) &&
        (!selectedMunicipio || normalizeText(c.municipio) === normalizeText(selectedMunicipio))
      );

      // Não exibe uma candidatura de outro cargo ou região.
      const candidaturaPrincipal = candidaturaCorrespondente;
      if (!candidaturaPrincipal) return [];
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
  }, [selectedUf, selectedMunicipio]);

  const fetchRankingData = useCallback(async (currentPage: number, cargos: string[], targetHighlightId?: string) => {
    const queryParams = new URLSearchParams();
    queryParams.append('uf', selectedUf);
    cargos.forEach(cargo => queryParams.append('cargos', cargo));
    if (selectedMunicipio) {
      queryParams.append('municipio', selectedMunicipio);
    }

    const response = await fetch(`${getVpsApiUrl()}/candidatos-filtrados?${queryParams.toString()}`);
    if (!response.ok) {
      throw new Error(`VPS candidatos respondeu HTTP ${response.status}`);
    }

    const perfilIdsVps: unknown = await response.json();
    if (!Array.isArray(perfilIdsVps)) {
      throw new Error('VPS candidatos retornou um formato inválido');
    }
    if (perfilIdsVps.length === 0) return { ranking: [], actualPage: 0, hasMore: false };

      let actualPage = currentPage;
      if (targetHighlightId && perfilIdsVps.includes(targetHighlightId)) {
        const { data: allRankedIds, error: allRankedIdsError } = await supabase.rpc('get_ranking_paginado', {
          ids: perfilIdsVps,
          limite: perfilIdsVps.length,
          deslocamento: 0
        });
        if (allRankedIdsError) throw allRankedIdsError;

        if (allRankedIds) {
          const index = allRankedIds.findIndex((p: any) => p.id === targetHighlightId);
          if (index !== -1) {
            actualPage = Math.floor(index / ITEMS_PER_PAGE);

          }
        }
      }

      const from = actualPage * ITEMS_PER_PAGE;
      const { data, error } = await supabase.rpc('get_ranking_paginado', {
        ids: perfilIdsVps,
        limite: ITEMS_PER_PAGE,
        deslocamento: from
      });

      if (error) throw error;
      if (!data || data.length === 0) {
        return { ranking: [], actualPage, hasMore: false };
      }


      const perfilIds = data.map((p: any) => p.id);
      const candidaturas = await fetchCandidaturasFromVPS(perfilIds, { throwOnError: true });

      return {
        ranking: processCandidaturas(data, candidaturas, cargos),
        actualPage,
        hasMore: from + data.length < perfilIdsVps.length,
      };
  }, [selectedUf, selectedMunicipio, processCandidaturas]);

  useEffect(() => {
    if (!isMounted) return;

    let cancelled = false;
    const loadRanking = async () => {
      setLoading(true);
      setLoadError(null);
      setHasMore(true);
      const cargos = getCargosPorEscopo();

      try {
        const highlightKey = `${selectedUf}/${selectedMunicipio}/${activeHighlightId}`;
        const rankingData = await fetchRankingData(page, cargos, resolvedHighlightRef.current === highlightKey ? undefined : activeHighlightId);
        if (cancelled) return;

        resolvedHighlightRef.current = highlightKey;
        setRanking(rankingData.ranking);
        setPage(rankingData.actualPage);
        setHasMore(rankingData.hasMore);
      } catch (error) {
        if (cancelled) return;
        console.error('Erro ao buscar dados do ranking:', error);
        setRanking([]);
        setHasMore(false);
        setLoadError('Não foi possível carregar o ranking agora. Tente novamente.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void loadRanking();
    return () => { cancelled = true; };
  }, [isMounted, activeHighlightId, page, retryCount, selectedUf, selectedMunicipio, getCargosPorEscopo, fetchRankingData]);

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

  const updateFilters = (uf: string, municipio = '') => {
    setPage(0);
    const params = new URLSearchParams({ uf });
    if (uf !== 'BR' && municipio) params.set('municipio', municipio);
    router.replace(`/ranking?${params}`, { scroll: false });
  };

  const handlePageChange = (nextPage: number) => {
    setPage(nextPage);
    const params = new URLSearchParams(searchParams.toString());
    params.delete('highlight');
    router.replace(`/ranking?${params}`, { scroll: false });
  };

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
                onChange={(event) => updateFilters(event.target.value)}
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
                onChange={(event) => selectedUf === 'BR'
                  ? updateFilters(event.target.value || 'BR')
                  : updateFilters(selectedUf, event.target.value)}
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
                  updateFilters('BR');
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
          ) : loadError ? (
            <div className="rounded-[32px] border border-amber-500/30 bg-amber-500/10 p-8 text-center text-sm text-amber-100">
              <p>{loadError}</p>
              <button
                type="button"
                onClick={() => setRetryCount((count) => count + 1)}
                className="mt-4 rounded-2xl border border-amber-300/40 bg-slate-950 px-4 py-2 text-xs font-semibold text-amber-100 transition hover:bg-slate-900"
              >
                Tentar novamente
              </button>
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
            disabled={loading || page === 0}
            onClick={() => handlePageChange(Math.max(page - 1, 0))}
            className="min-h-11 min-w-0 rounded-2xl border border-slate-700 bg-slate-950 px-2 py-2 text-xs font-semibold transition sm:px-4 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Anterior
          </button>
          <span className="text-center text-xs font-bold text-white sm:text-sm">Página {page + 1}</span>
          <button
            disabled={loading || !hasMore}
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

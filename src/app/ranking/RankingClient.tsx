'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { fetchCandidaturasFromVPS } from '@/lib/vpsClient';
import { Candidato } from '@/types';
import CandidateImage from '@/components/ui/CandidateImage';
import Link from 'next/link';
import { ACTIVE_ELECTION_YEARS, AVAILABLE_UFS } from '@/constants/elections';

const ufToStateName: { [key: string]: string } = {
  'AC': 'Acre', 'AL': 'Alagoas', 'AP': 'Amapá', 'AM': 'Amazonas', 'BA': 'Bahia',
  'CE': 'Ceará', 'DF': 'Distrito Federal', 'ES': 'Espírito Santo', 'GO': 'Goiás',
  'MA': 'Maranhão', 'MT': 'Mato Grosso', 'MS': 'Mato Grosso do Sul', 'MG': 'Minas Gerais',
  'PA': 'Pará', 'PB': 'Paraíba', 'PR': 'Paraná', 'PE': 'Pernambuco', 'PI': 'Piauí',
  'RJ': 'Rio de Janeiro', 'RN': 'Rio Grande do Norte', 'RS': 'Rio Grande do Sul',
  'RO': 'Rondônia', 'RR': 'Roraima', 'SC': 'Santa Catarina', 'SP': 'São Paulo',
  'SE': 'Sergipe', 'TO': 'Tocantins', 'BR': 'Brasil'
};

function getStateNameFromUf(uf: string): string {
  return ufToStateName[uf.toUpperCase()] || uf;
}

const CARGOS_POR_ESCOPO: { [key: string]: string[] } = {
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

const ITEMS_PER_PAGE = 10;

function RankingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedUf = searchParams.get('uf')?.toUpperCase();
  const initialUf = requestedUf && AVAILABLE_UFS.some(uf => uf === requestedUf)
    ? requestedUf 
    : 'BR';
  const [ranking, setRanking] = useState<Candidato[]>([]);
  const [page, setPage] = useState(0);
  const [municipios, setMunicipios] = useState<string[]>([]);
  const [selectedUf, setSelectedUf] = useState(initialUf);
  const [selectedMunicipio, setSelectedMunicipio] = useState(searchParams.get('municipio') || '');
  const [highlightedId, setHighlightedId] = useState(searchParams.get('highlight') || '');
  const [loading, setLoading] = useState(false);
  const [shareFeedback, setShareFeedback] = useState('');

  useEffect(() => {
    if (selectedUf === 'BR') {
      setMunicipios([]);
      setSelectedMunicipio('');
      return;
    }

    async function loadMunicipios() {
      const response = await fetch(`${process.env.NEXT_PUBLIC_VPS_API_URL}/api/municipios?uf=${selectedUf}`);
      if (!response.ok) {
        console.error("Falha ao buscar municípios do VPS");
        setMunicipios([]);
        return;
      }
      const data = await response.json();

      const uniqueMunicipios = Array.from(
        new Set((data || [])
          .map((item: any) => item.municipio?.trim())
          .filter((m: string | null | undefined): m is string => Boolean(m) && m?.toUpperCase() !== selectedUf.toUpperCase()))
      ).sort() as string[];
      setMunicipios(uniqueMunicipios);
    }

    void loadMunicipios();
  }, [selectedUf]);

  const getCargosPorEscopo = useCallback(() => {
    if (selectedUf === 'BR') {
      return CARGOS_POR_ESCOPO.nacional;
    }
    if (selectedMunicipio) {
      const stateName = getStateNameFromUf(selectedUf);
      if (selectedMunicipio.localeCompare(stateName, 'pt-BR', { sensitivity: 'base' }) !== 0) {
        return CARGOS_POR_ESCOPO.municipal;
      }
    }
    return CARGOS_POR_ESCOPO.estadual;
  }, [selectedUf, selectedMunicipio]);

  const processCandidaturas = (perfis: any[], candidaturas: any[]): Candidato[] => {
    const perfisIncluidos = new Set<string>();
    return perfis.flatMap((perfil) => {
      if (!perfil || !perfil.id || perfisIncluidos.has(perfil.id)) {
        return [];
      }
      perfisIncluidos.add(perfil.id);

      const candidatura = candidaturas.find(c => c.perfil_id === perfil.id);
      if (!candidatura) return [];

      return [{
        id: perfil.id,
        nome_completo: perfil.nome_completo,
        cpf: perfil.cpf,
        titulo_eleitoral: perfil.titulo_eleitoral,
        created_at: perfil.created_at,
        elo_score: perfil.elo_score ?? 1200,
        matches_count: perfil.matches_count ?? 0,
        nome_urna: candidatura.nome_urna || perfil.nome_completo,
        partido: candidatura.partido || 'S/P',
        cargo: candidatura.cargo,
        ano_eleicao: candidatura.ano_eleicao,
        uf: candidatura.uf,
        municipio: candidatura.municipio,
        foto: candidatura.foto,
        ultima_candidatura: {
          ...candidatura,
          perfil_id: perfil.id,
          created_at: perfil.created_at,
          sq_candidato: candidatura.sq_candidato,
        },
      }];
    });
  };

  const fetchRankingData = useCallback(async (currentPage: number, cargos: string[]) => {
    try {
      // 1. Busca os IDs filtrados diretamente na API VPS de acordo com a UF e Município
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

      // 2. Consulta o Supabase ordenando por elo_score apenas para os IDs válidos da região
      const from = currentPage * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      const { data, error } = await supabase.rpc('get_perfis_por_ids', {
          ids: perfilIdsVps
        });

      if (error || !data || data.length === 0) return [];

      // Se precisar aplicar a paginação (.range) que estava no final, 
      // você pode recortar o array já ordenado aqui no JS:
      const perfisPaginados = data.slice(from, to + 1);
      const perfilIds = perfisPaginados.map((p: any) => p.id);
      const candidaturas = await fetchCandidaturasFromVPS(perfilIds);

      const candidaturasProcessadas = perfilIds.map((id: any) => {
        const candsDoPerfil = candidaturas.filter((c: any) => 
          c.perfil_id === id &&
          (ACTIVE_ELECTION_YEARS as readonly number[]).includes(Number(c.ano_eleicao)) &&
          cargos.some(cargoPermitido => cargoPermitido.toUpperCase() === c.cargo?.toUpperCase()) &&
          (selectedUf === 'BR' || c.uf?.toUpperCase() === selectedUf.toUpperCase()) &&
          (!selectedMunicipio || c.municipio?.trim().toUpperCase() === selectedMunicipio.trim().toUpperCase())
        );
        return candsDoPerfil.sort((a: any, b: any) => b.ano_eleicao - a.ano_eleicao)[0];
      }).filter(Boolean);

      const perfisValidosIds = new Set(candidaturasProcessadas.map((c: any) => c.perfil_id));
      const perfisFiltrados = perfis.filter(p => perfisValidosIds.has(p.id));

      return processCandidaturas(perfisFiltrados, candidaturasProcessadas);
    } catch (err) {
      console.error('Erro ao buscar dados do ranking:', err);
      return [];
    }
  }, [selectedUf, selectedMunicipio]);

  useEffect(() => {
    const loadRanking = async () => {
      setLoading(true);
      const cargos = getCargosPorEscopo();
      let targetPage = page;

      if (highlightedId) {
        const { data: highlightedProfile, error: profileError } = await supabase
          .from('perfis_candidatos')
          .select('elo_score')
          .eq('id', highlightedId)
          .single();

        if (profileError || !highlightedProfile) {
          setHighlightedId('');
          const rankingData = await fetchRankingData(0, cargos);
          setRanking(rankingData);
          setLoading(false);
          return;
        }

        const rankingDataFull = await fetchRankingData(0, cargos);
        const indexHighlight = rankingDataFull.findIndex(c => c.id === highlightedId);
        
        if (indexHighlight !== -1) {
          targetPage = Math.floor(indexHighlight / ITEMS_PER_PAGE);
          setPage(targetPage);
        }
      }

      const rankingData = await fetchRankingData(targetPage, cargos);
      setRanking(rankingData);
      setLoading(false);
    };

    void loadRanking();
  }, [highlightedId, page, selectedUf, selectedMunicipio, getCargosPorEscopo, fetchRankingData]);

  useEffect(() => {
    if (!highlightedId || loading) return;
    document.getElementById(`ranking-${highlightedId}`)?.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    });
  }, [highlightedId, loading, ranking]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (selectedUf) params.set('uf', selectedUf);
    if (selectedMunicipio) params.set('municipio', selectedMunicipio);
    router.replace(`/ranking?${params.toString()}`);
  }, [selectedUf, selectedMunicipio, router]);

  useEffect(() => {
    setPage(0);
  }, [selectedUf, selectedMunicipio]);

  const handleShare = async () => {
    const region = selectedMunicipio || getStateNameFromUf(selectedUf);
    const shareUrl = new URL(window.location.href);
    shareUrl.searchParams.delete('highlight');

    const shareData = {
      title: 'Ranking Duelo Político',
      text: `Confira o ranking dos políticos de ${region} no Duelo Político!`,
      url: shareUrl.toString(),
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(shareData.url);
        setShareFeedback('Link copiado para a área de transferência!');
        setTimeout(() => setShareFeedback(''), 3000);
      }
    } catch (error) {
      console.error('Erro ao compartilhar:', error);
      try {
        await navigator.clipboard.writeText(shareData.url);
        setShareFeedback('Link copiado para a área de transferência!');
        setTimeout(() => setShareFeedback(''), 3000);
      } catch (copyError) {
        console.error('Erro ao copiar o link:', copyError);
        setShareFeedback('Não foi possível compartilhar ou copiar o link.');
        setTimeout(() => setShareFeedback(''), 3000);
      }
    }
  };

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
              <label className="block">
                <span className="mb-2 block text-xs uppercase tracking-[0.24em] text-slate-400">Estado</span>
                <select
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white shadow-inner outline-none focus:border-slate-500"
                  value={selectedUf}
                  onChange={(event) => {
                    setSelectedUf(event.target.value);
                    setSelectedMunicipio('');
                    setHighlightedId('');
                    setPage(0);
                  }}
                >
                  <option value="BR">Brasil</option>
                  {AVAILABLE_UFS.filter((uf) => uf !== 'BR').map((uf) => (
                    <option key={uf} value={uf}>{uf}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-2 block text-xs uppercase tracking-[0.24em] text-slate-400">Município</span>
                <select
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white shadow-inner outline-none focus:border-slate-500"
                  value={selectedMunicipio}
                  onChange={(event) => {
                    setSelectedMunicipio(event.target.value);
                    setHighlightedId('');
                    setPage(0);
                  }}
                  disabled={selectedUf === 'BR'}
                >
                  <option value="">Todos os Municípios</option>
                  {municipios.map((municipio) => (
                    <option key={municipio} value={municipio}>{municipio}</option>
                  ))}
                </select>
              </label>
              <div className="flex flex-col items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Escopo</p>
                  <p className="mt-2 text-sm text-slate-200">{selectedUf === 'BR' ? 'Brasil' : `${selectedUf}${selectedMunicipio ? ` · ${selectedMunicipio}` : ''}`}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedUf('BR');
                    setSelectedMunicipio('');
                    setHighlightedId('');
                    setPage(0);
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
                  className={`group flex items-center gap-4 rounded-[28px] border p-4 transition ${
                    cand.id === highlightedId
                      ? 'border-emerald-400 bg-emerald-500/10 shadow-lg shadow-emerald-500/10 ring-2 ring-emerald-400/40'
                      : 'border-white/10 bg-slate-900/80 hover:border-slate-500 hover:bg-slate-800'
                  }`}
                >
                  <div className="flex h-16 w-16 items-center justify-center rounded-3xl border border-slate-700 bg-slate-950">
                    <CandidateImage candidato={cand} alt={cand.nome_completo} className="h-full w-full object-cover rounded-3xl" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <p className="truncate text-sm font-bold text-white">{cand.nome_completo}</p>
                      <div className="flex items-center gap-2">
                        {cand.id === highlightedId && (
                          <span className="hidden rounded-full bg-emerald-400 px-2 py-1 text-[10px] font-black uppercase text-slate-950 sm:inline">Destaque</span>
                        )}
                        <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300">{page * ITEMS_PER_PAGE + index + 1}º</span>
                      </div>
                    </div>
                    <p className="mt-1 text-sm text-slate-400">{cand.cargo} · {cand.partido}</p>
                    <p className="mt-2 text-xs uppercase tracking-[0.18em] text-slate-500">{cand.municipio} · {cand.uf}</p>
                  </div>
                  <div className="rounded-3xl bg-slate-950 px-4 py-2 text-right">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Elo</p>
                    <p className="text-lg font-black text-white">{cand.elo_score}</p>
                  </div>
                </Link>
              ))
            ) : (
              <div className="rounded-[32px] border border-dashed border-slate-700 bg-slate-900/80 p-8 text-center text-sm text-slate-400">
                Nenhum candidato encontrado para esse filtro.
              </div>
            )}
          </section>

          <div className="mt-6 flex items-center justify-between rounded-3xl border border-white/10 bg-slate-900/80 p-4 text-sm text-slate-400 shadow-xl shadow-slate-950/20">
            <button
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
              className="rounded-2xl border border-slate-700 bg-slate-950 px-4 py-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50"
            >
              Anterior
            </button>
            <span className="font-bold text-white">Página {page + 1}</span>
            <button
              disabled={ranking.length < ITEMS_PER_PAGE}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-2xl border border-slate-700 bg-slate-950 px-4 py-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50"
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

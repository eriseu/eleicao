'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { Candidato } from '@/types';
import CandidateImage from '@/components/ui/CandidateImage';
import Link from 'next/link';
import { ACTIVE_ELECTION_YEARS, AVAILABLE_UFS } from '@/constants/elections';

function RankingContent() {
  const searchParams = useSearchParams();
  const requestedUf = searchParams.get('uf');
  const initialUf = requestedUf && AVAILABLE_UFS.some((uf) => uf === requestedUf)
    ? requestedUf
    : 'BR';
  const [ranking, setRanking] = useState<Candidato[]>([]);
  const [page, setPage] = useState(0);
  const [municipios, setMunicipios] = useState<string[]>([]);
  const [selectedUf, setSelectedUf] = useState(initialUf);
  const [selectedMunicipio, setSelectedMunicipio] = useState(searchParams.get('municipio') || '');
  const [highlightedId, setHighlightedId] = useState(searchParams.get('highlight') || '');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (selectedUf === 'BR') {
      setMunicipios([]);
      setSelectedMunicipio('');
      return;
    }

    async function loadMunicipios() {
      const { data } = await supabase
        .from('candidaturas')
        .select('municipio')
        .in('ano_eleicao', [...ACTIVE_ELECTION_YEARS])
        .eq('uf', selectedUf)
        .not('municipio', 'is', null)
        .limit(1000);

      const uniqueMunicipios = Array.from(
        new Set((data || []).map((item) => item.municipio).filter(Boolean))
      ).sort();
      setMunicipios(uniqueMunicipios);
    }

    void loadMunicipios();
  }, [selectedUf]);

  useEffect(() => {
    async function loadRanking() {
      setLoading(true);

      if (highlightedId) {
        const relatedRows = [];
        const batchSize = 1000;

        for (let from = 0; ; from += batchSize) {
          let highlightedQuery = supabase
            .from('candidaturas')
            .select(`
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
            `)
            .in('ano_eleicao', [...ACTIVE_ELECTION_YEARS])
            .eq('uf', selectedUf)
            .order('ano_eleicao', { ascending: false })
            .range(from, from + batchSize - 1);

          if (selectedUf !== 'BR' && selectedMunicipio) {
            highlightedQuery = highlightedQuery.eq('municipio', selectedMunicipio);
          }

          const { data, error } = await highlightedQuery;

          if (error || !data) {
            console.error('Erro ao carregar ranking relacionado:', error?.message);
            setRanking([]);
            setLoading(false);
            return;
          }

          relatedRows.push(...data);
          if (data.length < batchSize) break;
        }

        const includedProfiles = new Set<string>();
        const relatedRanking: Candidato[] = relatedRows.flatMap((candidatura) => {
          const perfil = Array.isArray(candidatura.perfis_candidatos)
            ? candidatura.perfis_candidatos[0]
            : candidatura.perfis_candidatos;
          if (!perfil || includedProfiles.has(perfil.id)) return [];
          includedProfiles.add(perfil.id);

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
        }).sort((a, b) =>
          b.elo_score - a.elo_score || a.nome_completo.localeCompare(b.nome_completo, 'pt-BR')
        );

        const highlightedPosition = relatedRanking.findIndex((candidate) => candidate.id === highlightedId);
        const targetPage = highlightedPosition >= 0 ? Math.floor(highlightedPosition / 10) : 0;
        setPage(targetPage);
        setRanking(relatedRanking.slice(targetPage * 10, targetPage * 10 + 10));
        setLoading(false);
        return;
      }

      if (selectedUf === 'BR') {
        const from = page * 10;
        const { data, error } = await supabase
          .from('perfis_candidatos')
          .select(`
            id,
            nome_completo,
            cpf,
            titulo_eleitoral,
            created_at,
            elo_score,
            matches_count,
            candidaturas!perfil_id!inner (
              foto,
              nome_urna,
              partido,
              cargo,
              ano_eleicao,
              uf,
              municipio,
              sq_candidato
            )
          `)
          .in('candidaturas.ano_eleicao', [...ACTIVE_ELECTION_YEARS])
          .order('elo_score', { ascending: false })
          .range(from, from + 9);

        if (error || !data) {
          console.error('Erro ao carregar ranking nacional:', error?.message);
          setRanking([]);
          setLoading(false);
          return;
        }

        const mappedProfiles: Candidato[] = data.flatMap((perfil) => {
          const candidaturaAtiva = [...perfil.candidaturas].sort(
            (a, b) => (b.ano_eleicao || 0) - (a.ano_eleicao || 0)
          )[0];
          if (!candidaturaAtiva) return [];

          return [{
            id: perfil.id,
            nome_completo: perfil.nome_completo,
            cpf: perfil.cpf,
            titulo_eleitoral: perfil.titulo_eleitoral,
            created_at: perfil.created_at,
            elo_score: perfil.elo_score || 0,
            matches_count: perfil.matches_count || 0,
            nome_urna: candidaturaAtiva.nome_urna || perfil.nome_completo,
            partido: candidaturaAtiva.partido || 'S/P',
            cargo: candidaturaAtiva.cargo,
            uf: candidaturaAtiva.uf,
            municipio: candidaturaAtiva.municipio,
            ultima_candidatura: {
              ...candidaturaAtiva,
              perfil_id: perfil.id,
              created_at: perfil.created_at,
              sq_candidato: candidaturaAtiva.sq_candidato || candidaturaAtiva.foto,
            },
          }];
        });

        setRanking(mappedProfiles.sort((a, b) => b.elo_score - a.elo_score));
        setLoading(false);
        return;
      }

      const to = (page + 1) * 50 - 1;

      let query = supabase
        .from('candidaturas')
        .select(`
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
        `)
        .in('ano_eleicao', [...ACTIVE_ELECTION_YEARS])
        .order('elo_score', { referencedTable: 'perfis_candidatos', ascending: false })
        .order('ano_eleicao', { ascending: false })
        .range(0, to);

      if (selectedUf !== 'BR') {
        query = query.eq('uf', selectedUf);
      }
      if (selectedMunicipio) {
        query = query.eq('municipio', selectedMunicipio);
      }

      const { data, error } = await query;

      if (error || !data) {
        console.error('Erro ao carregar ranking:', error?.message);
        setRanking([]);
        setLoading(false);
        return;
      }

      const perfisIncluidos = new Set<string>();
      const mappedData: Candidato[] = data.flatMap((candidaturaAtiva) => {
        const perfil = Array.isArray(candidaturaAtiva.perfis_candidatos)
          ? candidaturaAtiva.perfis_candidatos[0]
          : candidaturaAtiva.perfis_candidatos;
        if (!perfil || perfisIncluidos.has(perfil.id)) return [];
        perfisIncluidos.add(perfil.id);

        return [{
          id: perfil.id,
          nome_completo: perfil.nome_completo,
          cpf: perfil.cpf,
          titulo_eleitoral: perfil.titulo_eleitoral,
          created_at: perfil.created_at,
          elo_score: perfil.elo_score || 0,
          matches_count: perfil.matches_count || 0,
          nome_urna: candidaturaAtiva.nome_urna || perfil.nome_completo,
          partido: candidaturaAtiva.partido || 'S/P',
          cargo: candidaturaAtiva.cargo,
          uf: candidaturaAtiva.uf,
          municipio: candidaturaAtiva.municipio,
          ultima_candidatura: {
            ...candidaturaAtiva,
            perfil_id: perfil.id,
            created_at: perfil.created_at,
            sq_candidato: candidaturaAtiva.sq_candidato || candidaturaAtiva.foto,
          },
        }];
      });

      const sortedData = mappedData.sort((a, b) => b.elo_score - a.elo_score);
      setRanking(sortedData.slice(page * 10, page * 10 + 10));
      setLoading(false);
    }

    loadRanking();
  }, [highlightedId, page, selectedUf, selectedMunicipio]);

  useEffect(() => {
    if (!highlightedId || loading) return;
    document.getElementById(`ranking-${highlightedId}`)?.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    });
  }, [highlightedId, loading, ranking]);

  useEffect(() => {
    setPage(0);
  }, [selectedUf, selectedMunicipio]);

  const filteredByRegion = ranking.filter((cand) => {
    if (selectedUf !== 'BR' && cand.uf !== selectedUf) return false;
    if (selectedMunicipio && cand.municipio !== selectedMunicipio) return false;
    return true;
  });

  return (
      <main className="min-h-screen bg-slate-950 text-slate-100 pb-28">
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
                  <option value="BR">Todos os Estados</option>
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
            ) : filteredByRegion.length > 0 ? (
              filteredByRegion.map((cand, index) => (
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
                        <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300">{page * 10 + index + 1}º</span>
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
              disabled={ranking.length < 10}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-2xl border border-slate-700 bg-slate-950 px-4 py-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50"
            >
              Próxima
            </button>
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

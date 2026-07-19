'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Candidato } from '@/types';
import CandidateImage from '@/components/ui/CandidateImage';
import Navbar from '@/components/layout/Navbar';
import Link from 'next/link';

export default function Ranking() {
  const [ranking, setRanking] = useState<Candidato[]>([]);
  const [page, setPage] = useState(0);
  const [ufs, setUfs] = useState<string[]>([]);
  const [municipios, setMunicipios] = useState<string[]>([]);
  const [regionMunicipios, setRegionMunicipios] = useState<Record<string, string[]>>({});
  const [selectedUf, setSelectedUf] = useState('BR');
  const [selectedMunicipio, setSelectedMunicipio] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadRegions() {
      const { data } = await supabase
        .from('perfis_candidatos')
        .select(`
          candidaturas!perfil_id (
            uf,
            municipio
          )
        `)
        .limit(300);

      if (!data) return;

      const candidaturas = data.flatMap((perfil: any) => (Array.isArray(perfil.candidaturas) ? perfil.candidaturas : []));
      const uniqueUfs = Array.from(
        new Set(candidaturas.map((c: any) => c.uf).filter(Boolean))
      ).sort();

      const groupByUf = uniqueUfs.reduce<Record<string, string[]>>((acc, uf) => {
        acc[uf] = [];
        return acc;
      }, {});

      candidaturas.forEach((c: any) => {
        if (c.uf && c.municipio) {
          const list = groupByUf[c.uf] || [];
          if (!list.includes(c.municipio)) {
            list.push(c.municipio);
          }
        }
      });

      Object.keys(groupByUf).forEach((uf) => {
        groupByUf[uf].sort();
      });

      setUfs(uniqueUfs);
      setRegionMunicipios(groupByUf);
    }

    loadRegions();
  }, []);

  useEffect(() => {
    if (selectedUf === 'BR') {
      setMunicipios([]);
      setSelectedMunicipio('');
    } else {
      setMunicipios(regionMunicipios[selectedUf] || []);
      setSelectedMunicipio('');
    }
  }, [selectedUf, regionMunicipios]);

  useEffect(() => {
    async function loadRanking() {
      setLoading(true);
      const from = page * 10;
      const to = from + 9;

      const query = supabase
        .from('perfis_candidatos')
        .select(`
          *,
          candidaturas!perfil_id (
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
        .order('elo_score', { ascending: false })
        .range(from, to);

      if (selectedUf !== 'BR') {
        query.eq('candidaturas.uf', selectedUf);
      }
      if (selectedMunicipio) {
        query.eq('candidaturas.municipio', selectedMunicipio);
      }

      const { data } = await query;

      if (!data) return;

      const mappedData = data.map((perfil: any) => {
        const listaCandidaturas = Array.isArray(perfil.candidaturas) ? perfil.candidaturas : [];
        const candidaturaAtiva = listaCandidaturas.find((c: any) => c.ano_eleicao === 2024) || listaCandidaturas[0];

        return {
          id: perfil.id,
          nome_completo: perfil.nome_completo,
          elo_score: perfil.elo_score || 0,
          matches_count: perfil.matches_count || 0,
          nome_urna: candidaturaAtiva?.nome_urna || perfil.nome_completo,
          partido: candidaturaAtiva?.partido || 'S/P',
          cargo: candidaturaAtiva?.cargo || 'Não informado',
          uf: candidaturaAtiva?.uf || perfil.uf || 'BR',
          municipio: candidaturaAtiva?.municipio || perfil.municipio || 'Não informado',
          ultima_candidatura: candidaturaAtiva
            ? {
                ...candidaturaAtiva,
                uf: candidaturaAtiva.uf || perfil.uf || 'BR',
                municipio: candidaturaAtiva.municipio || perfil.municipio || 'Não informado',
                sq_candidato: candidaturaAtiva.sq_candidato || candidaturaAtiva.foto,
              }
            : null,
        };
      });

      setRanking(mappedData as any);
      setLoading(false);
    }

    loadRanking();
  }, [page, selectedUf, selectedMunicipio]);

  useEffect(() => {
    if (selectedUf === 'BR') {
      setSelectedMunicipio('');
    }
  }, [selectedUf]);

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
                  onChange={(event) => setSelectedUf(event.target.value)}
                >
                  <option value="BR">Todos os Estados</option>
                  {ufs.map((uf) => (
                    <option key={uf} value={uf}>{uf}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-2 block text-xs uppercase tracking-[0.24em] text-slate-400">Município</span>
                <select
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white shadow-inner outline-none focus:border-slate-500"
                  value={selectedMunicipio}
                  onChange={(event) => setSelectedMunicipio(event.target.value)}
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
                  className="group flex items-center gap-4 rounded-[28px] border border-white/10 bg-slate-900/80 p-4 transition hover:border-slate-500 hover:bg-slate-800"
                >
                  <div className="flex h-16 w-16 items-center justify-center rounded-3xl border border-slate-700 bg-slate-950">
                    <CandidateImage candidato={cand} alt={cand.nome_completo} className="h-full w-full object-cover rounded-3xl" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <p className="truncate text-sm font-bold text-white">{cand.nome_completo}</p>
                      <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300">{page * 10 + index + 1}º</span>
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

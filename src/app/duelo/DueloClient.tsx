"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { Candidato } from '@/types';
import CandidateImage from '@/components/ui/CandidateImage';
import { ACTIVE_ELECTION_YEARS, AVAILABLE_UFS } from '@/constants/elections';

export default function DueloClient() {
  const searchParams = useSearchParams();
  const [candidates, setCandidates] = useState<Candidato[]>([]);
  const [c1, setC1] = useState<Candidato | null>(null);
  const [c2, setC2] = useState<Candidato | null>(null);
  const [selectedUf, setSelectedUf] = useState('BR');
  const [selectedMunicipio, setSelectedMunicipio] = useState('');

  useEffect(() => {
    async function loadData() {
      const results = await Promise.all(
        ACTIVE_ELECTION_YEARS.map((ano) =>
          supabase
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
            .eq('ano_eleicao', ano)
            .eq('uf', selectedUf)
            .limit(1000)
        )
      );

      const failedResult = results.find(({ error }) => error);

      if (failedResult?.error) {
        console.error('Erro ao buscar candidatos para o duelo:', failedResult.error.message);
        setCandidates([]);
        return;
      }

      const data = results.flatMap((result) => result.data || []);

      const perfisIncluidos = new Set<string>();
      const mappedData = data.flatMap((candidaturaAtiva) => {
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
          nome_urna: candidaturaAtiva?.nome_urna || perfil.nome_completo,
          partido: candidaturaAtiva?.partido || 'S/P',
          cargo: candidaturaAtiva?.cargo || 'Não informado',
          uf: candidaturaAtiva.uf || 'BR',
          municipio: candidaturaAtiva.municipio || 'Não informado',
          ultima_candidatura: candidaturaAtiva
            ? {
                ...candidaturaAtiva,
                perfil_id: perfil.id,
                created_at: perfil.created_at,
                uf: candidaturaAtiva.uf || 'BR',
                municipio: candidaturaAtiva.municipio || 'Não informado',
                sq_candidato: candidaturaAtiva.sq_candidato || candidaturaAtiva.foto,
              }
            : null,
        }];
      });

      setCandidates(mappedData);
    }

    loadData();
  }, [selectedUf]);

  const municipioOptions = useMemo(() => {
    if (selectedUf === 'BR') return [];
    return Array.from(
      new Set(
        candidates
          .filter((candidate) => candidate.uf === selectedUf)
          .map((candidate) => candidate.municipio)
          .filter(Boolean)
      )
    ).sort();
  }, [candidates, selectedUf]);

  const filteredCandidates = useMemo(() => {
    return candidates.filter((candidate) => {
      if (candidate.uf !== selectedUf) return false;
      if (selectedMunicipio && candidate.municipio !== selectedMunicipio) return false;
      return true;
    });
  }, [candidates, selectedUf, selectedMunicipio]);

  const getCandidateLabel = (candidate: Candidato) => {
    const nome = candidate.ultima_candidatura?.nome_urna || candidate.nome_urna || candidate.nome_completo;
    const partido = candidate.ultima_candidatura?.partido || candidate.partido;
    return `${nome}${partido ? ` (${partido})` : ''}`;
  };

  useEffect(() => {
    const param1 = searchParams.get('c1');
    const param2 = searchParams.get('c2');

    if (param1) {
      const encontrado1 = filteredCandidates.find((c) => c.id === param1);
      if (encontrado1) setC1(encontrado1);
    }
    if (param2) {
      const encontrado2 = filteredCandidates.find((c) => c.id === param2);
      if (encontrado2) setC2(encontrado2);
    }

    if (!param1 && !param2 && filteredCandidates.length >= 2) {
      setC1(filteredCandidates[0]);
      setC2(filteredCandidates[1]);
    }
  }, [filteredCandidates, searchParams]);

  const candidateOptions2 = useMemo(
    () => filteredCandidates.filter((candidate) => candidate.id !== c1?.id),
    [filteredCandidates, c1]
  );

  const availableCandidatesCount = filteredCandidates.length;
  const canClearFilters = selectedUf !== 'BR' || selectedMunicipio !== '';

  const resetFilters = () => {
    setSelectedUf('BR');
    setSelectedMunicipio('');
  };

  const randomizeMatch = () => {
    if (filteredCandidates.length < 2) return;
    const shuffled = [...filteredCandidates].sort(() => Math.random() - 0.5);
    setC1(shuffled[0]);
    setC2(shuffled.find((candidate) => candidate.id !== shuffled[0].id) || null);
  };

  useEffect(() => {
    if (filteredCandidates.length === 0) {
      setC1(null);
      setC2(null);
      return;
    }

    const firstCandidate = filteredCandidates[0];
    const currentC1Id = c1?.id || firstCandidate.id;
    const nextCandidate = filteredCandidates.find((candidate) => candidate.id !== currentC1Id) || null;

    if (!c1 || !filteredCandidates.some((candidate) => candidate.id === c1.id)) {
      setC1(firstCandidate);
    }

    if (filteredCandidates.length === 1) {
      setC2(null);
      return;
    }

    if (
      !c2 ||
      c2.id === currentC1Id ||
      !filteredCandidates.some((candidate) => candidate.id === c2.id)
    ) {
      setC2(nextCandidate);
    }
  }, [filteredCandidates, c1, c2]);

  const displayedCandidates = useMemo(() => {
    const selected = [c1, c2].filter(Boolean) as Candidato[];
    const chosen = [...selected];

    if (chosen.length === 2) return chosen;

    const fallback = filteredCandidates.filter(
      (candidate) => candidate.id !== c1?.id && candidate.id !== c2?.id
    );

    while (chosen.length < 2 && fallback.length > 0) {
      chosen.push(fallback.shift()!);
    }

    return chosen;
  }, [filteredCandidates, c1, c2]);

  const votar = async (vencedor: Candidato, perdedor: Candidato) => {
    const K = 32;
    const Ra = vencedor.elo_score;
    const Rb = perdedor.elo_score;

    const Ea = 1 / (1 + Math.pow(10, (Rb - Ra) / 400));
    const Eb = 1 / (1 + Math.pow(10, (Ra - Rb) / 400));

    const novoEloA = Math.round(Ra + K * (1 - Ea));
    const novoEloB = Math.round(Rb + K * (0 - Eb));

    const vencedorAtualizado = {
      ...vencedor,
      elo_score: novoEloA,
      matches_count: (vencedor.matches_count || 0) + 1,
    };
    const perdedorAtualizado = {
      ...perdedor,
      elo_score: novoEloB,
      matches_count: (perdedor.matches_count || 0) + 1,
    };

    if (c1?.id === vencedor.id) {
      setC1(vencedorAtualizado);
      setC2(perdedorAtualizado);
    } else {
      setC1(perdedorAtualizado);
      setC2(vencedorAtualizado);
    }

    try {
      await supabase
        .from('perfis_candidatos')
        .update({ elo_score: novoEloA, matches_count: vencedorAtualizado.matches_count })
        .eq('id', vencedor.id);

      await supabase
        .from('perfis_candidatos')
        .update({ elo_score: novoEloB, matches_count: perdedorAtualizado.matches_count })
        .eq('id', perdedor.id);

      await supabase.rpc('registrar_voto', {
        vencedor_id: vencedor.id,
        perdedor_id: perdedor.id,
      });

      alert(`Voto computado! ${vencedor.ultima_candidatura?.nome_urna} derrotou ${perdedor.ultima_candidatura?.nome_urna}.`);
    } catch (err) {
      console.error('Erro ao registrar voto:', err);
    }
  };

  const handleShare = () => {
    if (!c1 || !c2) return;
    const shareUrl = `${window.location.origin}/duelo?c1=${c1.id}&c2=${c2.id}`;
    navigator.clipboard.writeText(shareUrl);
    alert('Link copiado para compartilhar seu duelo!');
  };

  return (
      <main className="min-h-screen bg-slate-950 text-slate-100 pb-32">
        <div className="mx-auto max-w-3xl px-4 py-6">
          <header className="text-center mb-6">
            <p className="text-sm uppercase tracking-[0.35em] text-slate-400">Duelo Político</p>
            <h1 className="mt-2 text-3xl font-black text-white">Quem representa melhor suas escolhas?</h1>
            <p className="mx-auto mt-3 max-w-2xl text-sm text-slate-400">
              Filtre por Brasil, estado ou município e escolha entre dois candidatos com visual moderno e ações embaixo.
            </p>
          </header>

          <section className="mb-6 rounded-[32px] border border-white/10 bg-slate-900/80 p-5 shadow-xl shadow-slate-950/30">
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="block">
                <span className="mb-2 block text-xs uppercase tracking-[0.24em] text-slate-400">Brasil / UF</span>
                <select
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white shadow-inner outline-none focus:border-slate-500"
                  value={selectedUf}
                  onChange={(event) => {
                    setSelectedUf(event.target.value);
                    setSelectedMunicipio('');
                  }}
                >
                  {AVAILABLE_UFS.map((uf) => (
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
                  <option value="">Todos</option>
                  {municipioOptions.map((municipio) => (
                    <option key={municipio} value={municipio}>{municipio}</option>
                  ))}
                </select>
              </label>

              <div className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Escopo atual</p>
                  <p className="mt-2 text-sm text-white">
                    {selectedUf === 'BR' ? 'Brasil' : `${selectedUf}${selectedMunicipio ? ` · ${selectedMunicipio}` : ''}`}
                  </p>
                  <p className="mt-2 text-sm text-slate-300">{availableCandidatesCount} candidato{availableCandidatesCount === 1 ? '' : 's'} disponível{availableCandidatesCount === 1 ? '' : 's'}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={resetFilters}
                    disabled={!canClearFilters}
                    className="inline-flex items-center justify-center rounded-2xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:border-slate-500 hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Limpar filtros
                  </button>
                  <button
                    type="button"
                    onClick={randomizeMatch}
                    disabled={availableCandidatesCount < 2}
                    className="inline-flex items-center justify-center rounded-2xl border border-emerald-500 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-200 transition hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Aleatório
                  </button>
                </div>
              </div>
            </div>
          </section>

          <section className="mb-6 grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-xs uppercase tracking-[0.24em] text-slate-400">Candidato 1</span>
              <select
                className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white shadow-inner outline-none focus:border-slate-500"
                value={c1?.id || ''}
                onChange={(event) => {
                  const next = filteredCandidates.find((candidate) => candidate.id === event.target.value) || null;
                  setC1(next);
                }}
              >
                <option value="">Selecione o candidato 1</option>
                {filteredCandidates.map((candidate) => (
                  <option key={candidate.id} value={candidate.id}>{getCandidateLabel(candidate)}</option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block text-xs uppercase tracking-[0.24em] text-slate-400">Candidato 2</span>
              <select
                className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white shadow-inner outline-none focus:border-slate-500"
                value={c2?.id || ''}
                onChange={(event) => {
                  const next = candidateOptions2.find((candidate) => candidate.id === event.target.value) || null;
                  setC2(next);
                }}
              >
                <option value="">Selecione o candidato 2</option>
                {candidateOptions2.length > 0 ? (
                  candidateOptions2.map((candidate) => (
                    <option key={candidate.id} value={candidate.id}>{getCandidateLabel(candidate)}</option>
                  ))
                ) : (
                  <option value="" disabled>Sem opção disponível</option>
                )}
              </select>
            </label>
          </section>

          <section className="grid gap-4 sm:grid-cols-2">
            {displayedCandidates.slice(0, 2).map((candidate) => (
              <div key={candidate.id} className="rounded-[32px] border border-white/10 bg-slate-900/80 shadow-xl shadow-slate-950/30 transition hover:-translate-y-1">
                <div className="relative overflow-hidden rounded-t-[32px] bg-slate-800">
                  <CandidateImage candidato={candidate} alt={candidate.nome_completo} className="h-80 w-full object-cover" />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent px-4 py-3">
                    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-300">{candidate.nome_urna}</p>
                    <p className="text-xs text-slate-400">{candidate.cargo} · {candidate.partido}</p>
                  </div>
                </div>
                <div className="space-y-3 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.24em] text-slate-400">UF / Município</p>
                      <p className="mt-1 text-sm text-slate-200">{candidate.uf} · {candidate.municipio}</p>
                    </div>
                    <div className="rounded-3xl bg-emerald-500/15 px-3 py-2 text-sm font-semibold text-emerald-300">
                      Elo {candidate.elo_score}
                    </div>
                  </div>
                  <div className="rounded-3xl bg-slate-950/70 px-4 py-3 text-sm text-slate-300">
                    Clique no botão abaixo para enviar seu voto para este candidato.
                  </div>
                </div>
              </div>
            ))}
          </section>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => c1 && c2 && votar(c1, c2)}
              disabled={!c1 || !c2}
              className="rounded-full bg-emerald-500 px-4 py-4 text-sm font-bold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Votar em {c1?.nome_urna || 'Candidato 1'}
            </button>
            <button
              type="button"
              onClick={() => c1 && c2 && votar(c2, c1)}
              disabled={!c1 || !c2}
              className="rounded-full bg-slate-200 px-4 py-4 text-sm font-bold text-slate-950 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Votar em {c2?.nome_urna || 'Candidato 2'}
            </button>
          </div>

          <div className="mt-6 rounded-[32px] border border-white/10 bg-slate-900/80 p-5 text-sm text-slate-400 shadow-xl shadow-slate-950/20">
            <p className="font-semibold text-white">Dica</p>
            <p className="mt-2">Use os filtros para comparar candidatos do seu estado ou município e clique nos botões abaixo para escolher o vencedor.</p>
          </div>

          <button
            type="button"
            onClick={handleShare}
            className="mt-6 w-full rounded-3xl bg-indigo-600 px-5 py-4 text-sm font-semibold text-white shadow-xl shadow-indigo-600/20 transition hover:bg-indigo-500"
          >
            Compartilhar Duelo 🔗
          </button>
        </div>
      </main>
  );
}

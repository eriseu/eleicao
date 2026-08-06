"use client";

import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { fetchCandidaturasFromVPS } from '@/lib/vpsClient';
import { Candidato } from '@/types';
import CandidateImage from '@/components/ui/CandidateImage';
import CandidateAutocomplete from '@/components/ui/CandidateAutocomplete';
import { AVAILABLE_UFS } from '@/constants/elections';

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

export default function DueloClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sharedUf = searchParams.get('uf');
  const sharedC1Id = searchParams.get('c1');
  const sharedC2Id = searchParams.get('c2');
  const isSharedDuel = Boolean(sharedC1Id && sharedC2Id);
  const hasValidSharedUf = Boolean(
    sharedUf && AVAILABLE_UFS.some((uf) => uf === sharedUf)
  );
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const [candidates, setCandidates] = useState<Candidato[]>([]);
  const [c1, setC1] = useState<Candidato | null>(null);
  const [c2, setC2] = useState<Candidato | null>(null);
  const [selectedUf, setSelectedUf] = useState(
    sharedUf && AVAILABLE_UFS.some((uf) => uf === sharedUf) ? sharedUf : 'BR'
  );
  const [selectedMunicipio, setSelectedMunicipio] = useState('');
  const [municipios, setMunicipios] = useState<string[]>([]);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState('');

  // Busca de municípios corrigida usando a API correta de municípios por UF
  useEffect(() => {
    if (selectedUf === 'BR') {
      setMunicipios([]);
      setSelectedMunicipio('');
      return;
    }

    async function loadMunicipios() {
      try {
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
      } catch (error) {
        console.error("Erro ao carregar municípios:", error);
        setMunicipios([]);
      }
    }

    void loadMunicipios();
  }, [selectedUf]);

  const getCargosPorEscopo = useCallback(() => {
      if (selectedUf === 'BR') {
        return CARGOS_POR_ESCOPO.nacional;
      }
      // Se houver município selecionado: apenas cargos MUNICIPAIS
      if (selectedMunicipio) {
        return CARGOS_POR_ESCOPO.municipal;
      }
      // Apenas ESTADO selecionado: apenas cargos ESTADUAIS (Deputados, Governador, Senador)
      return CARGOS_POR_ESCOPO.estadual;
    }, [selectedUf, selectedMunicipio]);

  // Função robusta de mapeamento e tratamento de fotos idêntica ao app/page
  const processCandidaturas = (perfis: any[], candidaturas: any[]): Candidato[] => {
      const perfisIncluidos = new Set<string>();
      return perfis.flatMap((perfil) => {
        if (!perfil || !perfil.id || perfisIncluidos.has(perfil.id)) return [];
        perfisIncluidos.add(perfil.id);

        const candsDoPerfil = candidaturas.filter((c: any) => c.perfil_id === perfil.id);
        if (candsDoPerfil.length === 0) return [];

        // Ordena da eleição mais recente para a mais antiga
        const sortedCands = candsDoPerfil.sort((a: any, b: any) => Number(b.ano_eleicao) - Number(a.ano_eleicao));
        const candidaturaPrincipal = sortedCands[0];

        // Busca a foto mais recente que SEJA válida
        const candidaturaComFoto = sortedCands.find((c: any) => {
          const foto = c.foto || c.sq_candidato;
          if (!foto) return false;
          const fotoStr = String(foto);
          return fotoStr.trim() !== '' && !fotoStr.includes('avatar.png');
        });

        // Garante que o objeto retornado utilize o caminho padronizado da foto mais recente
        const fotoFinal = candidaturaComFoto 
          ? (candidaturaComFoto.foto || candidaturaComFoto.sq_candidato) 
          : candidaturaPrincipal.foto;

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
      });
    };

  // Lógica de carregamento integrada com VPS e Supabase
  const loadData = useCallback(async () => {
    setLoadingCandidates(true);
    try {
      if (isSharedDuel) {
        const { data: perfisData, error } = await supabase
          .from('perfis_candidatos')
          .select('*')
          .in('id', [sharedC1Id!, sharedC2Id!]);

        if (error || !perfisData) {
          setCandidates([]);
          setLoadingCandidates(false);
          return;
        }

        const candidaturas = (await fetchCandidaturasFromVPS([sharedC1Id!, sharedC2Id!])) || [];
        const mappedDataFinal = processCandidaturas(perfisData, candidaturas as any[]);
        setCandidates(mappedDataFinal);
        setLoadingCandidates(false);
        if (!hasValidSharedUf && mappedDataFinal[0]?.uf) {
          setSelectedUf(mappedDataFinal[0].uf);
        }
        return;
      }

      const cargos = getCargosPorEscopo();
      const queryParams = new URLSearchParams();
      queryParams.append('uf', selectedUf);
      cargos.forEach(cargo => queryParams.append('cargos', cargo));
      if (selectedMunicipio) {
        queryParams.append('municipio', selectedMunicipio);
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_VPS_API_URL}/api/candidatos-filtrados?${queryParams.toString()}`);
      if (!response.ok) {
        setCandidates([]);
        setLoadingCandidates(false);
        return;
      }

      const perfilIdsVps: string[] = await response.json();
      if (!perfilIdsVps || perfilIdsVps.length === 0) {
        setCandidates([]);
        setLoadingCandidates(false);
        return;
      }

      const idsAmostra = perfilIdsVps.slice(0, 300); // Amostra robusta para alimentar o autocompletar e o duelo
      const { data: perfisData, error } = await supabase
        .from('perfis_candidatos')
        .select('*')
        .in('id', idsAmostra);

      if (error || !perfisData || perfisData.length === 0) {
        setCandidates([]);
        setLoadingCandidates(false);
        return;
      }

      const perfilIds = perfisData.map((p: any) => p.id);
      const candidaturas = (await fetchCandidaturasFromVPS(perfilIds)) || [];

      const mappedDataFinal = processCandidaturas(perfisData, candidaturas as any[]);
      setCandidates(mappedDataFinal);
    } catch (error) {
      console.error('Erro ao buscar candidatos para o duelo:', error);
      setCandidates([]);
    } finally {
      setLoadingCandidates(false);
    }
  }, [isSharedDuel, selectedUf, selectedMunicipio, getCargosPorEscopo, hasValidSharedUf, sharedC1Id, sharedC2Id]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const getCandidateLabel = (candidate: Candidato) => {
    const nome = candidate.ultima_candidatura?.nome_urna || candidate.nome_urna || candidate.nome_completo;
    const partido = candidate.ultima_candidatura?.partido || candidate.partido;
    return `${nome}${partido ? ` (${partido})` : ''}`;
  };

  const filteredCandidates = useMemo(() => {
    if (isSharedDuel) return candidates;

    return candidates
      .filter((candidate) => {
        if (candidate.uf !== selectedUf) return false;
        if (selectedMunicipio && candidate.municipio !== selectedMunicipio) return false;
        return true;
      })
      .sort((a, b) => getCandidateLabel(a).localeCompare(getCandidateLabel(b), 'pt-BR'));
  }, [candidates, isSharedDuel, selectedUf, selectedMunicipio]);

  useEffect(() => {
    if (sharedC1Id) {
      const encontrado1 = filteredCandidates.find((c) => c.id === sharedC1Id);
      if (encontrado1) setC1(encontrado1);
    }
    if (sharedC2Id) {
      const encontrado2 = filteredCandidates.find((c) => c.id === sharedC2Id);
      if (encontrado2) setC2(encontrado2);
    }

    if (!isSharedDuel && filteredCandidates.length >= 2) {
      const shuffled = [...filteredCandidates].sort(() => Math.random() - 0.5);
      setC1(shuffled[0]);
      setC2(shuffled[1]);
    } else if (!isSharedDuel) {
      setC1(null);
      setC2(null);
    }
  }, [filteredCandidates, isSharedDuel, sharedC1Id, sharedC2Id]);

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

  const getRankingUrl = (candidate: Candidato) => {
      const uf = candidate.ultima_candidatura?.uf || candidate.uf || 'BR';
      const municipio = candidate.ultima_candidatura?.municipio || candidate.municipio;
      
      // Determina o escopo com base no estado/município selecionados no momento do duelo
      const escopo = selectedMunicipio ? 'municipal' : (selectedUf === 'BR' ? 'nacional' : 'estadual');

      const params = new URLSearchParams({ 
        uf, 
        escopo,
        highlight: candidate.id 
      });

      if (selectedMunicipio && municipio) {
        params.set('municipio', municipio);
      }

      return `/ranking?${params.toString()}`;
    };

  const escolher = async (escolhido: Candidato, outro: Candidato) => {
    if (submitting) return;
    setSubmitting(true);
    setFeedback('');
    try {
      const response = await fetch('/api/duelo/votar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vencedorId: escolhido.id,
          perdedorId: outro.id,
        }),
      });
      const result = await response.json();

      if (!response.ok) {
        if (response.status === 409) {
          router.replace(getRankingUrl(escolhido));
          return;
        }
        setFeedback(result.error || 'Não foi possível concluir a comparação.');
        return;
      }

      router.replace(getRankingUrl(escolhido));
    } catch (error) {
      console.error('Erro ao registrar escolha:', error);
      setFeedback('Não foi possível concluir a comparação.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleShare = () => {
    if (!c1 || !c2) return;
    const params = new URLSearchParams({ uf: selectedUf, c1: c1.id, c2: c2.id });
    const shareUrl = `${window.location.origin}/duelo?${params.toString()}`;
    navigator.clipboard.writeText(shareUrl);
    alert('Link copiado para compartilhar seu duelo!');
  };

  if (!isMounted) {
    return <div className="min-h-screen bg-slate-950 p-8 text-center text-slate-400">Carregando duelo...</div>;
  }
  
  return (
      <main className="min-h-screen bg-slate-950 text-slate-100 pb-32">
        <div className="mx-auto max-w-3xl px-4 py-6">
          <header className="text-center mb-6">
            <p className="text-sm uppercase tracking-[0.35em] text-slate-400">Duelo Político</p>
            <h1 className="mt-2 text-3xl font-black text-white">Quem representa melhor suas escolhas?</h1>
            <p className="mx-auto mt-3 max-w-2xl text-sm text-slate-400">
              {isSharedDuel
                ? 'Toque na foto da sua escolha.'
                : 'Filtre por Brasil, estado ou município e toque na foto da sua escolha.'}
            </p>
          </header>

          {!isSharedDuel && <section className="mb-6 rounded-[32px] border border-white/10 bg-slate-900/80 p-5 shadow-xl shadow-slate-950/30">
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="block">
                <span className="mb-2 block text-xs uppercase tracking-[0.24em] text-slate-400">Brasil / UF</span>
                <select
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white shadow-inner outline-none focus:border-slate-500"
                  value={selectedUf}
                  disabled={isSharedDuel}
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
                  disabled={isSharedDuel || selectedUf === 'BR'}
                >
                  <option value="">Todos</option>
                  {municipios.map((municipio) => (
                    <option key={municipio} value={municipio}>{municipio}</option>
                  ))}
                </select>
              </label>

                {/* Substituir o bloco do Escopo Atual por uma versão inline e compacta */}
                <div className="flex flex-col justify-between gap-2 rounded-2xl border border-slate-800 bg-slate-950 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Escopo</span>
                    <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs font-semibold text-emerald-400">
                      {selectedUf === 'BR' ? 'Brasil' : `${selectedUf}${selectedMunicipio ? ` · ${selectedMunicipio}` : ''}`}
                    </span>
                  </div>
                  
                  <div className="flex gap-2 mt-1">
                    <button
                      type="button"
                      onClick={resetFilters}
                      disabled={isSharedDuel || !canClearFilters}
                      className="flex-1 rounded-xl border border-slate-700 bg-slate-800 py-1.5 text-xs font-medium text-slate-300 transition hover:bg-slate-700 disabled:opacity-40"
                    >
                      Limpar
                    </button>
                    <button
                      type="button"
                      onClick={randomizeMatch}
                      disabled={isSharedDuel || loadingCandidates || availableCandidatesCount < 2}
                      className="flex-1 rounded-xl border border-emerald-500/30 bg-emerald-500/10 py-1.5 text-xs font-medium text-emerald-300 transition hover:bg-emerald-500/20 disabled:opacity-40"
                    >
                      Aleatório
                    </button>
                  </div>
                </div>
            </div>
          </section>}

          {!isSharedDuel && <section className="mb-6 grid gap-4 sm:grid-cols-2">
            <CandidateAutocomplete
              label="Candidato 1"
              selected={c1}
              onSelect={setC1}
              uf={selectedUf}
              municipio={selectedMunicipio}
              excludeId={c2?.id}
              disabled={loadingCandidates}
            />
            <CandidateAutocomplete
              label="Candidato 2"
              selected={c2}
              onSelect={setC2}
              uf={selectedUf}
              municipio={selectedMunicipio}
              excludeId={c1?.id}
              disabled={loadingCandidates}
            />
          </section>}

          <section className={isSharedDuel ? 'mx-auto grid w-full max-w-sm grid-cols-2 gap-4' : 'grid gap-4 sm:grid-cols-2'}>
            {displayedCandidates.slice(0, 2).map((candidate, index) => {
              const otherCandidate = displayedCandidates[index === 0 ? 1 : 0];
              if (isSharedDuel) {
                return (
                  <button
                    key={candidate.id}
                    type="button"
                    className="relative aspect-[3/4] w-full overflow-hidden rounded-[28px] border border-white/10 bg-slate-800 shadow-xl transition hover:-translate-y-1 hover:border-emerald-500/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 active:scale-95 disabled:cursor-wait disabled:opacity-60"
                    onClick={() => otherCandidate && void escolher(candidate, otherCandidate)}
                    disabled={submitting || !otherCandidate}
                    aria-label={`Escolher ${candidate.nome_urna || candidate.nome_completo}`}
                  >
                    <CandidateImage candidato={candidate} alt={candidate.nome_completo} className="h-full w-full object-cover" />
                  </button>
                );
              }

              return (
              <div key={candidate.id} className="rounded-[32px] border border-white/10 bg-slate-900/80 shadow-xl shadow-slate-950/30 transition hover:-translate-y-1">
                <button
                  type="button"
                  className="relative block w-full overflow-hidden rounded-t-[32px] bg-slate-800 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 disabled:cursor-wait disabled:opacity-60"
                  onClick={() => otherCandidate && void escolher(candidate, otherCandidate)}
                  disabled={submitting || !otherCandidate}
                  aria-label={`Escolher ${candidate.nome_urna || candidate.nome_completo}`}
                >
                  <CandidateImage candidato={candidate} alt={candidate.nome_completo} className="h-56 w-full object-cover sm:h-72" />
                </button>
                <div className="space-y-3 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">{candidate.cargo} · {candidate.partido}</p>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.24em] text-slate-400">UF / Município</p>
                      <p className="mt-1 text-sm text-slate-200">{candidate.uf} · {candidate.municipio}</p>
                    </div>
                    <div className="rounded-3xl bg-emerald-500/15 px-3 py-2 text-sm font-semibold text-emerald-300">
                      Elo {candidate.elo_score}
                    </div>
                  </div>
                  <p className="rounded-3xl bg-slate-950/70 px-4 py-3 text-sm text-slate-300">Toque na foto para escolher.</p>
                </div>
              </div>
              );
            })}
          </section>

          {feedback && <p className="mt-6 text-center text-sm text-emerald-300">{feedback}</p>}

          {!isSharedDuel && <div className="mt-6 rounded-[32px] border border-white/10 bg-slate-900/80 p-5 text-sm text-slate-400 shadow-xl shadow-slate-950/20">
            <p className="font-semibold text-white">Dica</p>
            <p className="mt-2">Use os filtros para comparar candidatos do seu estado ou município e toque diretamente em uma das fotos.</p>
          </div>}

          {!isSharedDuel && <button
            type="button"
            onClick={handleShare}
            className="mt-6 w-full rounded-3xl bg-indigo-600 px-5 py-4 text-sm font-semibold text-white shadow-xl shadow-indigo-600/20 transition hover:bg-indigo-500"
          >
            Compartilhar Duelo 🔗
          </button>}
        </div>
      </main>
  );
}

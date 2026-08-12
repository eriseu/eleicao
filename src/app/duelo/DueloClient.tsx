"use client";

import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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

const CARGOS_ESTADUAIS_NACIONAIS = [
  'PRESIDENTE',
  'VICE-PRESIDENTE',
  'GOVERNADOR',
  'VICE-GOVERNADOR',
  'SENADOR',
  'DEPUTADO FEDERAL',
  'DEPUTADO ESTADUAL',
  'DEPUTADO DISTRITAL',
];

export default function DueloClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sharedUf = searchParams.get('uf');
  const sharedMunicipio = searchParams.get('municipio') || '';
  const sharedC1Id = searchParams.get('c1');
  const sharedC2Id = searchParams.get('c2');

  const isSharedDuel = Boolean(sharedC1Id && sharedC2Id);
  const hasValidSharedUf = Boolean(
    sharedUf && AVAILABLE_UFS.some((uf) => uf === sharedUf)
  );

  const [isMounted, setIsMounted] = useState(false);
  const [candidates, setCandidates] = useState<Candidato[]>([]);
  const [c1, setC1] = useState<Candidato | null>(null);
  const [c2, setC2] = useState<Candidato | null>(null);
  
  const [selectedUf, setSelectedUf] = useState(
    hasValidSharedUf ? (sharedUf as string) : 'BR'
  );
  const [selectedMunicipio, setSelectedMunicipio] = useState(sharedMunicipio);
  const [municipios, setMunicipios] = useState<string[]>([]);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState('');

  // 1️⃣ Hydration & Sincronização dos parâmetros da URL
  useEffect(() => {
    setIsMounted(true);
    if (sharedUf) setSelectedUf(sharedUf);
    if (sharedMunicipio) setSelectedMunicipio(sharedMunicipio);
  }, [sharedUf, sharedMunicipio]);

  // 2️⃣ Busca de municípios por UF (via VPS)
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
    if (selectedMunicipio) {
      return CARGOS_POR_ESCOPO.municipal;
    }
    return CARGOS_POR_ESCOPO.estadual;
  }, [selectedUf, selectedMunicipio]);

  const processCandidaturas = (perfis: any[], candidaturas: any[]): Candidato[] => {
    const perfisIncluidos = new Set<string>();
    return perfis.flatMap((perfil) => {
      if (!perfil || !perfil.id || perfisIncluidos.has(perfil.id)) return [];

      const candsDoPerfil = candidaturas.filter((c: any) => c.perfil_id === perfil.id);
      if (candsDoPerfil.length === 0) return [];

      const sortedCands = candsDoPerfil.sort((a: any, b: any) => Number(b.ano_eleicao) - Number(a.ano_eleicao));
      const candidaturaMaisRecente = sortedCands[0];

      const candidaturaComFoto = sortedCands.find((c: any) => {
        const foto = c.foto || c.sq_candidato;
        if (!foto) return false;
        const fotoStr = String(foto).trim();
        return fotoStr !== '' && !fotoStr.includes('avatar.png');
      });

      const fotoFinal = candidaturaComFoto 
        ? (candidaturaComFoto.foto || candidaturaComFoto.sq_candidato) 
        : candidaturaMaisRecente.foto;

      if (!fotoFinal || String(fotoFinal).trim() === '' || String(fotoFinal).includes('avatar.png')) {
        return [];
      }

      perfisIncluidos.add(perfil.id);

      const candidaturaEstadualOuNacional = sortedCands.find((c: any) =>
        CARGOS_ESTADUAIS_NACIONAIS.includes((c.cargo || '').toUpperCase().trim())
      );

      const candidaturaReferencia = candidaturaEstadualOuNacional || candidaturaMaisRecente;
      const isNacional = CARGOS_POR_ESCOPO.nacional.includes((candidaturaMaisRecente.cargo || '').toUpperCase().trim());

      return [{
        id: perfil.id,
        nome_completo: perfil.nome_completo,
        cpf: perfil.cpf,
        titulo_eleitoral: perfil.titulo_eleitoral,
        created_at: perfil.created_at,
        elo_score: perfil.elo_score ?? 1200,
        matches_count: perfil.matches_count ?? 0,
        nome_urna: candidaturaMaisRecente.nome_urna || perfil.nome_completo,
        partido: candidaturaMaisRecente.partido || 'S/P',
        cargo: candidaturaMaisRecente.cargo,
        uf: isNacional ? 'BR' : (candidaturaReferencia.uf || perfil.uf),
        municipio: isNacional || CARGOS_ESTADUAIS_NACIONAIS.includes((candidaturaReferencia.cargo || '').toUpperCase().trim())
          ? '' 
          : candidaturaReferencia.municipio,
        foto: fotoFinal,
        candidaturas: sortedCands,
        ultima_candidatura: {
          ...candidaturaMaisRecente,
          foto: fotoFinal,
          perfil_id: perfil.id,
          created_at: perfil.created_at,
          sq_candidato: Number(candidaturaMaisRecente.sq_candidato) || 0,
        },
      }];
    });
  };

  const getCandidateLabel = (candidate: Candidato) => {
    const nome = candidate.ultima_candidatura?.nome_urna || candidate.nome_urna || candidate.nome_completo;
    const partido = candidate.ultima_candidatura?.partido || candidate.partido;
    return `${nome}${partido ? ` (${partido})` : ''}`;
  };

  const filteredCandidates = useMemo(() => {
    if (isSharedDuel) return candidates;

    const cargosPermitidos = getCargosPorEscopo();

    return candidates
      .filter((candidate) => {
        const cargoCandidato = (
          candidate.ultima_candidatura?.cargo || 
          candidate.cargo || 
          ''
        ).toUpperCase().trim();

        if (selectedUf === 'BR') {
          return candidate.uf === 'BR' && CARGOS_POR_ESCOPO.nacional.includes(cargoCandidato);
        }

        if (candidate.uf !== selectedUf) return false;

        if (selectedMunicipio) {
          if (candidate.municipio !== selectedMunicipio) return false;
        } else {
          if (CARGOS_POR_ESCOPO.municipal.includes(cargoCandidato)) return false;
        }

        return cargosPermitidos.some(
          (c) => c.toUpperCase().trim() === cargoCandidato
        );
      })
      .sort((a, b) => getCandidateLabel(a).localeCompare(getCandidateLabel(b), 'pt-BR'));
  }, [candidates, isSharedDuel, selectedUf, selectedMunicipio, getCargosPorEscopo]);

  const randomizeMatch = useCallback((poolList = filteredCandidates) => {
    if (poolList.length < 2) {
      setC1(poolList[0] || null);
      setC2(poolList[1] || null);
      return;
    }
    const shuffled = [...poolList].sort(() => Math.random() - 0.5);
    setC1(shuffled[0]);
    setC2(shuffled[1]);
  }, [filteredCandidates]);

  // 3️⃣ Carregamento dos dados 100% via VPS
  const loadData = useCallback(async () => {
    setLoadingCandidates(true);
    try {
      // 🟢 CASO 1: DUELO COMPARTILHADO VIA VPS
      if (isSharedDuel) {
        const responsePerfis = await fetch(`${process.env.NEXT_PUBLIC_VPS_API_URL}/api/perfis?ids=${sharedC1Id},${sharedC2Id}`);
        if (!responsePerfis.ok) {
          setCandidates([]);
          setLoadingCandidates(false);
          return;
        }
        const perfisData = await responsePerfis.json();

        const candidaturas = (await fetchCandidaturasFromVPS([sharedC1Id!, sharedC2Id!])) || [];
        const mappedDataFinal = processCandidaturas(perfisData, candidaturas as any[]);
        setCandidates(mappedDataFinal);
        setC1(mappedDataFinal.find(c => c.id === sharedC1Id) || mappedDataFinal[0] || null);
        setC2(mappedDataFinal.find(c => c.id === sharedC2Id) || mappedDataFinal[1] || null);

        if (!hasValidSharedUf && mappedDataFinal[0]?.uf) {
          setSelectedUf(mappedDataFinal[0].uf);
        }
        setLoadingCandidates(false);
        return;
      }

      // 🟢 CASO 2: BUSCA DE CANDIDATOS PARA DUELO NORMAL VIA VPS
      const cargos = getCargosPorEscopo();
      const queryParams = new URLSearchParams();
      queryParams.append('uf', selectedUf);
      cargos.forEach(cargo => queryParams.append('cargos', cargo));
      if (selectedMunicipio) {
        queryParams.append('municipio', selectedMunicipio);
      }

      // Requisição à VPS
      const response = await fetch(`${process.env.NEXT_PUBLIC_VPS_API_URL}/api/candidatos-filtrados?${queryParams.toString()}`);
      if (!response.ok) {
        setCandidates([]);
        setC1(null);
        setC2(null);
        setLoadingCandidates(false);
        return;
      }

      const perfisVps: any[] = await response.json(); // Espera-se que a VPS retorne a lista de objetos dos perfis
      if (!perfisVps || perfisVps.length === 0) {
        setCandidates([]);
        setC1(null);
        setC2(null);
        setLoadingCandidates(false);
        return;
      }

      const perfilIds = perfisVps.map((p: any) => p.id);
      const candidaturas = (await fetchCandidaturasFromVPS(perfilIds)) || [];

      const mappedDataFinal = processCandidaturas(perfisVps, candidaturas as any[]);
      setCandidates(mappedDataFinal);

      if (mappedDataFinal.length >= 2) {
        const shuffled = [...mappedDataFinal].sort(() => Math.random() - 0.5);
        setC1(shuffled[0]);
        setC2(shuffled[1]);
      } else {
        setC1(mappedDataFinal[0] || null);
        setC2(mappedDataFinal[1] || null);
      }
    } catch (error) {
      console.error('Erro ao buscar candidatos para o duelo:', error);
      setCandidates([]);
      setC1(null);
      setC2(null);
    } finally {
      setLoadingCandidates(false);
    }
  }, [isSharedDuel, selectedUf, selectedMunicipio, getCargosPorEscopo, hasValidSharedUf, sharedC1Id, sharedC2Id]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const displayedCandidates = useMemo(() => {
    return [c1, c2].filter(Boolean) as Candidato[];
  }, [c1, c2]);

  const availableCandidatesCount = filteredCandidates.length;
  const canClearFilters = selectedUf !== 'BR' || selectedMunicipio !== '';

  const resetFilters = () => {
    setSelectedUf('BR');
    setSelectedMunicipio('');
  };

  const getRankingUrl = (candidate: Candidato) => {
    if (selectedUf === 'BR') {
      const params = new URLSearchParams({
        uf: 'BR',
        escopo: 'nacional',
        highlight: candidate.id,
      });
      return `/ranking?${params.toString()}`;
    }

    if (selectedMunicipio) {
      const params = new URLSearchParams({
        uf: selectedUf,
        municipio: selectedMunicipio,
        escopo: 'municipal',
        highlight: candidate.id,
      });
      return `/ranking?${params.toString()}`;
    }

    const params = new URLSearchParams({
      uf: selectedUf,
      escopo: 'estadual',
      highlight: candidate.id,
    });

    return `/ranking?${params.toString()}`;
  };

  const escolher = async (escolhido: Candidato, outro: Candidato) => {
    if (submitting || !isSharedDuel) return;
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
    const params = new URLSearchParams({ 
      uf: selectedUf, 
      c1: c1.id, 
      c2: c2.id 
    });

    if (selectedMunicipio) {
      params.set('municipio', selectedMunicipio);
    }

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
              : 'Selecione os dois candidatos ou clique em "Aleatório". Em seguida, compartilhe o duelo para permitir votos!'}
          </p>
        </header>

        {!isSharedDuel && (
          <section className="mb-6 rounded-[32px] border border-white/10 bg-slate-900/80 p-5 shadow-xl shadow-slate-950/30">
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
                    onClick={() => randomizeMatch()}
                    disabled={isSharedDuel || loadingCandidates || availableCandidatesCount < 2}
                    className="flex-1 rounded-xl border border-emerald-500/30 bg-emerald-500/10 py-1.5 text-xs font-medium text-emerald-300 transition hover:bg-emerald-500/20 disabled:opacity-40"
                  >
                    Aleatório
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}

        {!isSharedDuel && (
          <section className="mb-6 grid gap-4 sm:grid-cols-2">
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
          </section>
        )}

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
              <div key={candidate.id} className="rounded-[32px] border border-white/10 bg-slate-900/80 shadow-xl shadow-slate-950/30">
                <div className="relative block w-full overflow-hidden rounded-t-[32px] bg-slate-800 text-left">
                  <CandidateImage candidato={candidate} alt={candidate.nome_completo} className="h-56 w-full object-cover sm:h-72" />
                </div>
                <div className="space-y-3 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">{candidate.cargo} · {candidate.partido}</p>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.24em] text-slate-400">UF / Município</p>
                      <p className="mt-1 text-sm text-slate-200">
                        {candidate.uf === 'BR' 
                          ? 'Brasil' 
                          : candidate.municipio 
                            ? `${candidate.municipio} (${candidate.uf})` 
                            : candidate.uf}
                      </p>
                    </div>
                    <div className="rounded-3xl bg-emerald-500/15 px-3 py-2 text-sm font-semibold text-emerald-300">
                      Elo {candidate.elo_score}
                    </div>
                  </div>
                  <p className="rounded-3xl bg-slate-950/70 px-4 py-3 text-center text-xs text-slate-400">
                    Clique em "Compartilhar Duelo" para liberar a votação! 🔗
                  </p>
                </div>
              </div>
            );
          })}
        </section>

        {feedback && <p className="mt-6 text-center text-sm text-emerald-300">{feedback}</p>}

        {!isSharedDuel && (
          <button
            type="button"
            onClick={handleShare}
            disabled={!c1 || !c2}
            className="mt-6 w-full rounded-3xl bg-indigo-600 px-5 py-4 text-sm font-semibold text-white shadow-xl shadow-indigo-600/20 transition hover:bg-indigo-500 disabled:opacity-50"
          >
            Compartilhar Duelo 🔗
          </button>
        )}
      </div>
    </main>
  );
}

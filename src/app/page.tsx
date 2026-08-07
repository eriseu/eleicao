'use client';

import { useEffect, useState, useCallback } from 'react';
import CandidateImage from '@/components/ui/CandidateImage';
import { AVAILABLE_UFS } from '@/constants/elections';
import type { Candidato } from '@/types';

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

export default function Home() {
  const [par, setPar] = useState<[Candidato, Candidato] | null>(null);
  const [candidates, setCandidates] = useState<Candidato[]>([]);
  const [selectedUf, setSelectedUf] = useState('BR');
  const [selectedMunicipio, setSelectedMunicipio] = useState('');
  const [municipios, setMunicipios] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState('');

  // Busca de municípios para o select via API VPS
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
            .map((item: any) => (typeof item === 'string' ? item : item.municipio)?.trim())
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
    return [...CARGOS_POR_ESCOPO.estadual, ...CARGOS_POR_ESCOPO.municipal];
  }, [selectedUf, selectedMunicipio]);

  // Função para sortear um par aleatório do array
  const pickRandomPair = (source: Candidato[]) => {
    if (source.length < 2) return null;
    const shuffled = [...source].sort(() => Math.random() - 0.5);
    return [shuffled[0], shuffled[1]] as [Candidato, Candidato];
  };

  // Carrega os candidatos consumindo direto o JSON gerado no R2 (CDN)
  const fetchCandidates = useCallback(async () => {
    setLoading(true);
    try {
      const r2Url = `https://fotos.centraleti.com.br/candidatos/${selectedUf.toUpperCase()}.json`;
      const response = await fetch(r2Url);

      if (!response.ok) {
        setCandidates([]);
        setPar(null);
        return;
      }

      const todosCandidatosR2: Candidato[] = await response.json();
      const cargosPermitidos = getCargosPorEscopo().map(c => c.toUpperCase().trim());

      // Filtra de acordo com as regras de escopo e município
      const filtrados = todosCandidatosR2.filter((c: Candidato) => {
        const cargoCand = (c.cargo || '').toUpperCase().trim();
        const condCargo = cargosPermitidos.includes(cargoCand);

        if (!condCargo) return false;

        if (selectedMunicipio) {
          return (c.municipio || '').toUpperCase().trim() === selectedMunicipio.toUpperCase().trim();
        }

        return true;
      });

      setCandidates(filtrados);
      
      const pair = pickRandomPair(filtrados);
      setPar(pair);

    } catch (error) {
      console.error('Erro ao carregar candidatos do R2:', error);
      setCandidates([]);
      setPar(null);
    } finally {
      setLoading(false);
    }
  }, [selectedUf, selectedMunicipio, getCargosPorEscopo]);

  useEffect(() => {
    void fetchCandidates();
  }, [fetchCandidates]);

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
        setFeedback(result.error || 'Não foi possível concluir a comparação.');
        return;
      }

      // Sorteia o próximo par excluindo os anteriores para variar a disputa
      const alternatives = candidates.filter(
        (candidate) => candidate.id !== escolhido.id && candidate.id !== outro.id
      );
      const nextPair = pickRandomPair(alternatives.length >= 2 ? alternatives : candidates);
      setPar(nextPair);
      setFeedback(
        nextPair
          ? 'Voto registrado! Um novo duelo foi preparado.'
          : 'Comparação concluída para este filtro.'
      );
    } catch (error) {
      console.error('Erro ao registrar escolha:', error);
      setFeedback('Não foi possível concluir a comparação.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 pb-28 text-slate-100">
      <div className="mx-auto flex min-h-screen max-w-md flex-col px-4 py-6">
        <header className="text-center">
          <p className="text-sm uppercase tracking-[0.35em] text-slate-400">Duelo Político</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-white">
            DU<b>ELO</b> POLÍTICO
          </h1>
          <p className="mt-3 text-sm text-slate-400">Filtre por estado ou município e toque na foto da sua escolha.</p>
        </header>

        <section className="my-6 rounded-[28px] border border-white/10 bg-slate-900/80 p-4 shadow-xl shadow-slate-950/30 backdrop-blur-sm">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-[11px] uppercase tracking-[0.3em] text-slate-400">Estado</span>
              <select
                className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-500"
                value={selectedUf}
                onChange={(event) => {
                  setSelectedUf(event.target.value);
                  setSelectedMunicipio('');
                }}
              >
                <option value="BR">Brasil</option>
                {AVAILABLE_UFS.filter((uf) => uf !== 'BR').map((uf) => (
                  <option key={uf} value={uf}>{uf}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-2 block text-[11px] uppercase tracking-[0.3em] text-slate-400">Município</span>
              <select
                className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
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
          </div>
        </section>

        {loading && (
          <p className="my-auto text-center text-slate-400">Carregando duelo...</p>
        )}

        {!loading && par && (
          <div className="mx-auto mt-2 grid w-full max-w-sm grid-cols-2 gap-4">
            {par.map((candidato, index) => {
              const outroCandidato = index === 0 ? par[1] : par[0];

              return (
                <button
                  key={candidato.id}
                  type="button"
                  onClick={() => void escolher(candidato, outroCandidato)}
                  disabled={submitting}
                  aria-label={`Escolher ${candidato.nome_urna || candidato.nome_completo}`}
                  className="relative aspect-[3/4] w-full overflow-hidden rounded-[28px] border border-white/10 bg-slate-800 shadow-xl transition duration-100 hover:-translate-y-1 hover:border-emerald-500/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 active:scale-95 disabled:cursor-wait disabled:opacity-60"
                >
                  <CandidateImage
                    candidato={candidato}
                    alt={candidato.nome_completo}
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-transparent p-3 text-left">
                    <p className="truncate text-xs font-bold text-white">{candidato.nome_urna || candidato.nome_completo}</p>
                    <p className="text-[10px] text-slate-300">{candidato.cargo} · {candidato.partido}</p>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {!loading && !par && (
          <p className="my-auto text-center text-slate-400">Nenhum duelo disponível para este filtro.</p>
        )}
        {feedback && <p className="mt-6 text-center text-sm text-emerald-300">{feedback}</p>}
      </div>
    </main>
  );
}

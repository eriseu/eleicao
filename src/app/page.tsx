'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { fetchCandidaturasFromVPS } from '@/lib/vpsClient';
import CandidateImage from '@/components/ui/CandidateImage';
import { AVAILABLE_UFS } from '@/constants/elections';
import { supabase } from '@/lib/supabaseClient';
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

  // Busca de municípios corrigida usando a API do VPS corretamente
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

  const processCandidaturas = (perfis: any[], candidaturas: any[]): Candidato[] => {
    const perfisIncluidos = new Set<string>();
    return perfis.flatMap((perfil) => {
      if (!perfil || !perfil.id || perfisIncluidos.has(perfil.id)) {
        return [];
      }
      perfisIncluidos.add(perfil.id);

      const candsDoPerfil = candidaturas.filter((c: any) => c.perfil_id === perfil.id);
      if (candsDoPerfil.length === 0) return [];

      const sortedCands = candsDoPerfil.sort((a: any, b: any) => Number(b.ano_eleicao) - Number(a.ano_eleicao));
      const candidaturaPrincipal = sortedCands[0];

      const candidaturaComFoto = sortedCands.find((c: any) => {
        const foto = c.foto || c.sq_candidato;
        if (!foto) return false;
        const fotoStr = String(foto);
        return fotoStr.trim() !== '' && !fotoStr.includes('avatar.png');
      });

      const fotoFinal = candidaturaComFoto ? (candidaturaComFoto.foto || candidaturaComFoto.sq_candidato) : candidaturaPrincipal.foto;

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

  const fetchCandidates = useCallback(async () => {
    setLoading(true);
    try {
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
        setPar(null);
        return;
      }

      const perfilIdsVps: string[] = await response.json();
      if (!perfilIdsVps || perfilIdsVps.length === 0) {
        setCandidates([]);
        setPar(null);
        return;
      }

      // Busca os perfis no Supabase limitando a uma quantidade saudável para os duelos (ex: 150)
      const idsAmostra = perfilIdsVps.slice(0, 150);

      const { data: perfisData, error } = await supabase
        .from('perfis_candidatos')
        .select('*')
        .in('id', idsAmostra);

      if (error || !perfisData || perfisData.length === 0) {
        setCandidates([]);
        setPar(null);
        return;
      }

      const perfilIds = perfisData.map((p: any) => p.id);
      const candidaturas = await fetchCandidaturasFromVPS(perfilIds);

      const mappedDataFinal = processCandidaturas(perfisData, candidaturas);
      setCandidates(mappedDataFinal);
    } catch (error) {
      console.error('Erro geral ao buscar matchup:', error);
      setCandidates([]);
    } finally {
      setLoading(false);
    }
  }, [selectedUf, selectedMunicipio, getCargosPorEscopo]);

  const pickRandomPair = (source: Candidato[]) => {
    if (source.length < 2) return null;
    const shuffled = [...source].sort(() => Math.random() - 0.5);
    return [shuffled[0], shuffled[1]] as [Candidato, Candidato];
  };

  useEffect(() => {
    void fetchCandidates();
  }, [fetchCandidates]);

  const filteredCandidates = useMemo(() => {
    return candidates;
  }, [candidates]);

  useEffect(() => {
    if (loading) return;
    if (filteredCandidates.length < 2) {
      setPar(null);
      return;
    }

    const pair = pickRandomPair(filteredCandidates);
    if (pair) setPar(pair);
  }, [filteredCandidates, loading]);

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

      const alternatives = filteredCandidates.filter(
        (candidate) => candidate.id !== escolhido.id && candidate.id !== outro.id
      );
      const nextPair = pickRandomPair(alternatives);
      setPar(nextPair);
      setFeedback(
        nextPair
          ? 'Comparação concluída. Um novo duelo foi preparado.'
          : 'Comparação concluída nesta sessão.'
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

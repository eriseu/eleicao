'use client';

import { useEffect, useMemo, useState } from 'react';
import AdBanner from '@/components/ui/AdBanner';
import CandidateImage from '@/components/ui/CandidateImage';
import { supabase } from '@/lib/supabaseClient';
import type { Candidato } from '@/types';

// Altere somente este valor quando quiser usar outra eleição.
const ANO_ELEICAO_ATIVO = 2024;

export default function Home() {
  const [par, setPar] = useState<[Candidato, Candidato] | null>(null);
  const [candidates, setCandidates] = useState<Candidato[]>([]);
  const [selectedUf, setSelectedUf] = useState('BR');
  const [selectedMunicipio, setSelectedMunicipio] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchCandidates = async () => {
    setLoading(true);

    try {
      const { data, error } = await supabase
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
        .eq('candidaturas.ano_eleicao', ANO_ELEICAO_ATIVO)
        .not('candidaturas', 'is', null)
        .limit(250);

      if (error) {
        console.error('Erro ao buscar matchup:', error.message);
        return;
      }

      if (!data || data.length < 1) {
        setCandidates([]);
        setPar(null);
        return;
      }

      const mappedData: Candidato[] = data.map((perfil) => {
        const listaCandidaturas = Array.isArray(perfil.candidaturas)
          ? perfil.candidaturas
          : [];

        const candidaturaAtiva = listaCandidaturas[0];

        return {
          id: perfil.id,
          nome_completo: perfil.nome_completo,
          cpf: perfil.cpf,
          titulo_eleitoral: perfil.titulo_eleitoral,
          created_at: perfil.created_at,
          elo_score: perfil.elo_score,
          ultima_candidatura: candidaturaAtiva
            ? {
                ...candidaturaAtiva,
                ano_eleicao: candidaturaAtiva.ano_eleicao || perfil.ano,
                uf: candidaturaAtiva.uf || perfil.uf,
                municipio: candidaturaAtiva.municipio || perfil.municipio,
                sq_candidato:
                  candidaturaAtiva.sq_candidato ||
                  candidaturaAtiva.foto
                    ?.replace(/_div\.(jpg|jpeg|png)/g, '')
                    .replace(/[A-Z]/g, ''),
              }
            : null,
          nome_urna: candidaturaAtiva?.nome_urna || perfil.nome_completo,
          partido: candidaturaAtiva?.partido || 'S/P',
          cargo: candidaturaAtiva?.cargo || 'Não informado',
          matches_count: perfil.matches_count || 0,
        };
      });

      setCandidates(mappedData);
    } catch (error) {
      console.error('Erro geral ao buscar matchup:', error);
    } finally {
      setLoading(false);
    }
  };

  const ufs = useMemo(
    () =>
      Array.from(
        new Set(
          candidates
            .map((candidate) => candidate.ultima_candidatura?.uf || candidate.uf || 'BR')
            .filter(Boolean)
        )
      ).sort(),
    [candidates]
  );

  const municipios = useMemo(() => {
    if (selectedUf === 'BR') return [];
    return Array.from(
      new Set(
        candidates
          .filter((candidate) => (candidate.ultima_candidatura?.uf || candidate.uf || 'BR') === selectedUf)
          .map((candidate) => candidate.ultima_candidatura?.municipio || candidate.municipio)
          .filter(Boolean)
      )
    ).sort();
  }, [candidates, selectedUf]);

  const filteredCandidates = useMemo(() => {
    return candidates.filter((candidate) => {
      const candidateUf = candidate.ultima_candidatura?.uf || candidate.uf || 'BR';
      const candidateMunicipio = candidate.ultima_candidatura?.municipio || candidate.municipio || '';

      if (selectedUf !== 'BR' && candidateUf !== selectedUf) return false;
      if (selectedMunicipio && candidateMunicipio !== selectedMunicipio) return false;
      return true;
    });
  }, [candidates, selectedUf, selectedMunicipio]);

  const pickRandomPair = (source: Candidato[]) => {
    const shuffled = [...source].sort(() => Math.random() - 0.5);
    if (shuffled.length < 2) return null;
    const first = shuffled[0];
    const second = shuffled.find((candidate) => candidate.id !== first.id) || shuffled[1];
    return [first, second] as [Candidato, Candidato];
  };

  useEffect(() => {
    void fetchCandidates();
  }, []);

  useEffect(() => {
    if (loading) return;
    if (filteredCandidates.length < 2) {
      setPar(null);
      return;
    }

    const pair = pickRandomPair(filteredCandidates);
    if (pair) setPar(pair);
  }, [filteredCandidates, loading]);

  const votar = async (vencedor: Candidato, perdedor: Candidato) => {
    try {
      const { error } = await supabase.rpc('registrar_voto_seguro', {
        vencedor_id: vencedor.id,
        perdedor_id: perdedor.id,
      });

      if (error) {
        console.error('Erro ao computar voto:', error.message);
      }
    } catch (error) {
      console.error('Erro geral na requisição:', error);
    } finally {
      await fetchCandidates();
    }
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-between px-4 py-6">
      <header className="text-center">
        <h1 className="text-2xl font-black tracking-tight text-slate-800">
          DU<b>ELO</b> POLÍTICO
        </h1>
        <p className="text-xs text-slate-500">Filtre por estado ou município e vote nas duas imagens.</p>
      </header>

      <section className="mb-6 rounded-[28px] border border-slate-200/50 bg-white/80 p-4 shadow-sm backdrop-blur-sm">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-[11px] uppercase tracking-[0.3em] text-slate-500">Estado</span>
            <select
              className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-emerald-500"
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
            <span className="mb-2 block text-[11px] uppercase tracking-[0.3em] text-slate-500">Município</span>
            <select
              className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-emerald-500"
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
        <p className="text-center text-slate-500">Carregando duelo...</p>
      )}

      {!loading && par && (
        <div className="mx-auto my-auto grid w-full max-w-sm grid-cols-2 gap-4">
          {par.map((candidato, index) => {
            const outroCandidato = index === 0 ? par[1] : par[0];

            return (
              <button
                key={candidato.id}
                type="button"
                onClick={() => void votar(candidato, outroCandidato)}
                className="relative aspect-[3/4] w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-md transition duration-100 hover:shadow-lg focus:outline-none active:scale-95"
              >
                <CandidateImage
                  candidato={candidato}
                  alt={candidato.nome_completo}
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/95 to-transparent px-2 py-2">
                  <p className="truncate text-xs font-semibold text-white">{candidato.nome_urna}</p>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {!loading && !par && (
        <p className="text-center text-slate-500">Nenhum duelo disponível para este filtro.</p>
      )}
    </main>
  );
}

'use client';

import { useEffect, useMemo, useState } from 'react';
import { fetchCandidaturasFromVPS } from '@/lib/vpsClient';
import CandidateImage from '@/components/ui/CandidateImage';
import { ACTIVE_ELECTION_YEARS, AVAILABLE_UFS } from '@/constants/elections';
import { supabase } from '@/lib/supabaseClient';
import type { Candidato } from '@/types';

export default function Home() {
  const [par, setPar] = useState<[Candidato, Candidato] | null>(null);
  const [candidates, setCandidates] = useState<Candidato[]>([]);
  const [selectedUf, setSelectedUf] = useState('BR');
  const [selectedMunicipio, setSelectedMunicipio] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState('');

  const fetchCandidates = async () => {
    setLoading(true);

    const cargosPorEscopo: { [key: string]: string[] } = {
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

    let cargosPermitidos: string[] = [];
    if (selectedUf === 'BR') {
      cargosPermitidos = cargosPorEscopo.nacional;
    } else if (selectedMunicipio) {
      cargosPermitidos = cargosPorEscopo.municipal;
    } else {
      cargosPermitidos = [...cargosPorEscopo.estadual, ...cargosPorEscopo.municipal];
    }

    try {
      // 1. Buscar perfis de candidatos do Supabase (sem usar join restritivo com !inner)
      const { data: perfis, error: perfisError } = await supabase
        .from('perfis_candidatos')
        .select('*')
        .limit(1000);

      if (perfisError) {
        console.error('Erro ao buscar perfis:', perfisError.message);
        setCandidates([]);
        setPar(null);
        return;
      }

      if (!perfis || perfis.length < 1) {
        setCandidates([]);
        setPar(null);
        return;
      }

      const perfilIds = perfis.map(p => p.id);

      // 2. Buscar candidaturas do VPS para os perfis encontrados
      const candidaturas = await fetchCandidaturasFromVPS(perfilIds);

      // 3. Mapear, combinar e filtrar os dados localmente
      const mappedData: Candidato[] = perfis.flatMap((perfil) => {
        const candidaturasDoPerfil = candidaturas.filter((c: any) => c.perfil_id === perfil.id);
        if (candidaturasDoPerfil.length === 0) return [];

        // Filtra candidaturas de acordo com os anos e cargos permitidos
        const candidaturasFiltradas = candidaturasDoPerfil.filter((c: any) => {
          const anoValid = (ACTIVE_ELECTION_YEARS as readonly number[]).includes(Number(c.ano_eleicao));
          const cargoValid = cargosPermitidos.includes(c.cargo);
          const ufValid = selectedUf === 'BR' || c.uf === selectedUf;
          const munValid = !selectedMunicipio || c.municipio === selectedMunicipio;
          return anoValid && cargoValid && ufValid && munValid;
        });

        if (candidaturasFiltradas.length === 0) return [];

        // Ordena do ano mais recente para o mais antigo
        const sortedCands = candidaturasFiltradas.sort((a: any, b: any) => Number(b.ano_eleicao) - Number(a.ano_eleicao));
        const candidaturaAtiva = sortedCands[0];

        // 🔍 Varre o histórico filtrado para encontrar uma foto válida
        const candidaturaComFoto = sortedCands.find((c: any) => {
          const foto = c.foto || c.sq_candidato;
          if (!foto) return false;
          const fotoStr = String(foto);
          return fotoStr.trim() !== '' && !fotoStr.includes('avatar.png');
        });

        const fotoFinal = candidaturaComFoto ? (candidaturaComFoto.foto || candidaturaComFoto.sq_candidato) : candidaturaAtiva.foto;

        return [{
          id: perfil.id,
          nome_completo: perfil.nome_completo,
          cpf: perfil.cpf,
          titulo_eleitoral: perfil.titulo_eleitoral,
          created_at: perfil.created_at,
          elo_score: perfil.elo_score || 1200,
          matches_count: perfil.matches_count || 0,
          nome_urna: candidaturaAtiva?.nome_urna || perfil.nome_completo,
          partido: candidaturaAtiva?.partido || 'S/P',
          cargo: candidaturaAtiva?.cargo || 'Não informado',
          foto: fotoFinal,
          candidaturas: sortedCands,
          ultima_candidatura: candidaturaAtiva
            ? {
                ...candidaturaAtiva,
                perfil_id: perfil.id,
                created_at: perfil.created_at,
                sq_candidato: Number(candidaturaAtiva.sq_candidato) || 0,
                foto: fotoFinal,
            }
            : null,
        }];
      });

      setCandidates(mappedData);
    } catch (error) {
      console.error('Erro geral ao buscar matchup:', error);
    } finally {
      setLoading(false);
    }
  };

  const municipios = useMemo(() => {
    if (selectedUf === 'BR') return [];
    return Array.from(
      new Set( // Usamos um Set para garantir que os municípios sejam únicos
        candidates // Começamos com a lista completa de candidatos
          .filter(
            (c) =>
              c.ultima_candidatura?.uf === selectedUf && // Filtramos pelo estado selecionado
              ['PREFEITO', 'VICE-PREFEITO', 'VEREADOR'].includes(c.ultima_candidatura?.cargo || '') // Consideramos apenas cargos municipais
          )
          .map((c) => c.ultima_candidatura?.municipio) // Extraímos o nome do município
          .filter((m): m is string => !!m) // Filtramos valores nulos ou vazios
      )
    ).sort();
  }, [candidates, selectedUf]);

  const filteredCandidates = useMemo(() => {
    // A filtragem agora é feita diretamente na query, então apenas retornamos os candidatos.
    // Poderíamos adicionar filtros do lado do cliente aqui se necessário no futuro.
    return candidates;
  }, [candidates]);

  const pickRandomPair = (source: Candidato[]) => {
    if (source.length < 2) return null;
    const shuffled = [...source].sort(() => Math.random() - 0.5);
    return [shuffled[0], shuffled[1]] as [Candidato, Candidato];
  };

  useEffect(() => {
    void fetchCandidates();
  }, [selectedUf, selectedMunicipio]);

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
              {AVAILABLE_UFS.map((uf) => (
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

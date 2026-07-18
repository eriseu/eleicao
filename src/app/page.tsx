'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

import AdBanner from '@/components/ui/AdBanner';
import CandidateImage from '@/components/ui/CandidateImage';
import Navbar from '@/components/layout/Navbar';
import { supabase } from '@/lib/supabaseClient';
import type { Candidato } from '@/types';

// Altere somente este valor quando quiser usar outra eleição.
const ANO_ELEICAO_ATIVO = 2024;

export default function Home() {
  const [par, setPar] = useState<[Candidato, Candidato] | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchMatchup = async () => {
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
            sq_candidato
          )
        `)
        .eq('candidaturas.ano_eleicao', ANO_ELEICAO_ATIVO)
        .not('candidaturas', 'is', null)
        .limit(50);

      if (error) {
        console.error('Erro ao buscar matchup:', error.message);
        return;
      }

      if (!data || data.length < 2) {
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

      const shuffled = [...mappedData].sort(() => Math.random() - 0.5);

      if (shuffled[0].id === shuffled[1].id && shuffled[2]) {
        setPar([shuffled[0], shuffled[2]]);
      } else {
        setPar([shuffled[0], shuffled[1]]);
      }
    } catch (error) {
      console.error('Erro geral ao buscar matchup:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchMatchup();
  }, []);

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
      await fetchMatchup();
    }
  };

  return (
    <>
      <Navbar />

      <main className="mx-auto flex min-h-screen max-w-md flex-col justify-between px-4 py-6">
        <header className="text-center">
          <h1 className="text-2xl font-black tracking-tight text-slate-800">
            DUELO POLÍTICO
          </h1>
          <p className="text-xs text-slate-500">Vote no candidato ideal</p>
        </header>

        <AdBanner slot="1234567890" />

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
                </button>
              );
            })}
          </div>
        )}

        <div className="mt-4 flex justify-around text-xs font-semibold text-blue-600">
          <Link href="/duelo">Duelo Sugerido ⚔️</Link>
          <Link href="/ranking">Ver Ranking 🏆</Link>
        </div>

        <AdBanner slot="0987654321" />
      </main>
    </>
  );
}

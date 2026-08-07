'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import CandidateImage from '@/components/ui/CandidateImage';
import Link from 'next/link';
import type { Candidato } from '@/types';

export const dynamic = 'force-dynamic';

export default function Perfil({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = React.use(params);

  const [candidato, setCandidato] = useState<Candidato | null>(null);
  const [historicoCandidaturas, setHistoricoCandidaturas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingStats, setLoadingStats] = useState(true);

  // 1️⃣ CARREGAMENTO DIRETO DO BANCO DA VPS VIA API
  useEffect(() => {
    async function loadCandidato() {
      try {
        setLoading(true);
        const res = await fetch(`/api/candidato/${resolvedParams.id}`);
        if (!res.ok) throw new Error('Candidato não encontrado');

        const data = await res.json();

        setHistoricoCandidaturas(data.historico || []);
        setCandidato({
          ...data.candidato,
          candidaturas: data.historico,
          elo_score: 1200,
          matches_count: 0,
        });
      } catch (err) {
        console.error('Erro ao buscar candidato no Postgres:', err);
      } finally {
        setLoading(false);
      }
    }

    if (resolvedParams.id) {
      loadCandidato();
    }
  }, [resolvedParams.id]);

  // 2️⃣ MANTÉM OS DADOS DE RANKING/ELO DO SUPABASE
  useEffect(() => {
    async function loadStatsSupabase() {
      if (!resolvedParams.id) return;

      try {
        setLoadingStats(true);
        const { data: perfilData, error } = await supabase
          .from('perfis_candidatos')
          .select('elo_score, matches_count')
          .eq('id', resolvedParams.id)
          .maybeSingle();

        if (error) return;

        if (perfilData) {
          setCandidato((prev) =>
            prev
              ? {
                  ...prev,
                  elo_score: perfilData.elo_score ?? prev.elo_score ?? 1200,
                  matches_count: perfilData.matches_count ?? prev.matches_count ?? 0,
                }
              : null
          );
        }
      } catch (err) {
        console.error('Erro ao carregar estatísticas do Supabase:', err);
      } finally {
        setLoadingStats(false);
      }
    }

    loadStatsSupabase();
  }, [resolvedParams.id]);

  if (loading) return <p className="text-center mt-12 text-slate-400">Carregando perfil...</p>;
  if (!candidato) return <p className="text-center mt-12 text-red-400">Candidato não encontrado.</p>;

  const anoReferencia = historicoCandidaturas[0]?.ano_eleicao || (candidato as any).ano_eleicao || '2024';

  return (
    <main className="max-w-md mx-auto px-4 py-6 text-slate-100">
      <div className="bg-slate-900 rounded-3xl border border-white/10 shadow-xl p-6 flex flex-col items-center">
        
        {/* Foto Atual */}
        <div className="w-28 h-28 rounded-full overflow-hidden border border-slate-700 bg-slate-950 shadow">
          <CandidateImage candidato={candidato} alt={candidato.nome_completo} className="w-full h-full object-cover" />
        </div>

        <h1 className="text-xl font-black text-white mt-4 text-center leading-tight">
          {candidato.nome_completo}
        </h1>
        <p className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full mt-2">
          {candidato.cargo} • {candidato.partido}
        </p>

        {/* ELO e Duelos */}
        <div className="grid grid-cols-2 gap-4 w-full mt-6 border-t border-white/10 pt-4">
          <div className="text-center border-r border-white/10">
            <span className="block text-[10px] text-slate-400 uppercase font-bold tracking-wider">Score ELO</span>
            <span className={`text-lg font-black text-emerald-400 transition-opacity duration-300 ${loadingStats ? 'opacity-40 animate-pulse' : 'opacity-100'}`}>
              {candidato.elo_score}
            </span>
          </div>
          <div className="text-center">
            <span className="block text-[10px] text-slate-400 uppercase font-bold tracking-wider">Total Duelos</span>
            <span className={`text-lg font-black text-slate-200 transition-opacity duration-300 ${loadingStats ? 'opacity-40 animate-pulse' : 'opacity-100'}`}>
              {candidato.matches_count || 0}
            </span>
          </div>
        </div>

        {/* Ficha Geral */}
        <div className="w-full mt-6 border-t border-white/10 pt-4 space-y-3 text-xs">
          <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Ficha do Candidato</h3>

          <div className="flex justify-between border-b border-white/5 pb-1.5">
            <span className="text-slate-400">Nome de Urna:</span>
            <span className="font-bold text-white">{candidato.nome_urna || candidato.nome_completo}</span>
          </div>

          <div className="flex justify-between border-b border-white/5 pb-1.5">
            <span className="text-slate-400">Município / UF:</span>
            <span className="font-medium text-white uppercase">{candidato.municipio ? `${candidato.municipio} ` : ''}({candidato.uf})</span>
          </div>

          <div className="flex justify-between border-b border-white/5 pb-1.5">
            <span className="text-slate-400">Última Eleição:</span>
            <span className="font-mono text-white">{anoReferencia}</span>
          </div>
        </div>

        {/* Histórico com Fotos de cada Eleição */}
        <div className="w-full mt-6 border-t border-white/10 pt-4">
          <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3">Histórico de Candidaturas</h3>

          {historicoCandidaturas.length > 0 ? (
            <div className="space-y-2.5">
              {historicoCandidaturas.map((cand: any, index: number) => (
                <div key={index} className="bg-slate-950/60 border border-white/5 rounded-2xl p-3 flex items-center gap-3 text-xs">
                  
                  {/* Foto da candidatura daquela eleição */}
                  <div className="w-10 h-10 rounded-full overflow-hidden border border-slate-700 bg-slate-900 flex-shrink-0">
                    <CandidateImage candidato={cand} alt={cand.nome_urna || "Candidato"} className="w-full h-full object-cover" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white">{cand.ano_eleicao}</span>
                      <span className="text-[10px] font-semibold bg-emerald-500/10 text-emerald-300 px-2 py-0.5 rounded-md truncate">
                        {cand.cargo}
                      </span>
                    </div>
                    <p className="text-slate-400 mt-0.5 truncate">
                      {cand.partido} {cand.municipio ? `• ${cand.municipio}` : ''} ({cand.uf})
                    </p>
                  </div>

                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-500 text-center py-2">Nenhum histórico encontrado.</p>
          )}
        </div>

      </div>

      <div className="text-center mt-6">
        <Link href="/" className="text-sm text-slate-400 underline hover:text-white transition">
          Voltar para Início
        </Link>
      </div>
    </main>
  );
}

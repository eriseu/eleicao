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

  // 1️⃣ CARREGAMENTO DOS DADOS DO CANDIDATO
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

  // 2️⃣ CARREGAMENTO DE ELO E DISPUTAS NO SUPABASE
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

        if (error) {
          console.error('Erro Supabase:', error);
          return;
        }

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

  const candAtual = historicoCandidaturas[0] || candidato;
  const anoReferencia = candAtual?.ano_eleicao || (candidato as any).ano_eleicao || '2026';

  return (
    <main className="max-w-md mx-auto px-4 py-6 text-slate-100">
      <div className="bg-slate-900 rounded-3xl border border-white/10 shadow-xl p-5 flex flex-col items-center">
        
        {/* Foto Atual com Moldura e Status */}
        <div className="relative">
          <div className="w-28 h-28 rounded-full overflow-hidden border-2 border-slate-700 bg-slate-950 shadow-lg">
            <CandidateImage 
              candidato={candidato} 
              alt={candidato.nome_completo || candidato.nome_urna} 
              className="w-full h-full object-cover" 
            />
          </div>
          {candAtual.situacao_candidatura && (
            <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-slate-800 text-emerald-400 border border-emerald-500/30 whitespace-nowrap shadow-sm">
              {candAtual.situacao_candidatura}
            </span>
          )}
        </div>

        {/* Nome Completo em destaque abaixo da imagem */}
        <h1 className="text-lg font-black text-white mt-4 text-center leading-tight">
          {candidato.nome_completo || candidato.nome_urna}
        </h1>

        {/* Cargo e Partido em Tag Compacta */}
        <div className="flex items-center gap-1.5 mt-2">
          <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full">
            {candAtual.cargo || candidato.cargo} • {candAtual.partido || candidato.partido}
          </span>
        </div>

        {/* Placar ELO e Duelos / Disputas */}
        <div className="grid grid-cols-2 gap-3 w-full mt-5 bg-slate-950/50 border border-white/5 p-3 rounded-2xl">
          <div className="text-center border-r border-white/10 pr-2">
            <span className="block text-[10px] text-slate-400 uppercase font-bold tracking-wider">Score ELO</span>
            <span className={`text-xl font-black text-emerald-400 transition-opacity duration-300 ${loadingStats ? 'opacity-40 animate-pulse' : 'opacity-100'}`}>
              {candidato.elo_score ?? 1200}
            </span>
          </div>
          <div className="text-center pl-2">
            <span className="block text-[10px] text-slate-400 uppercase font-bold tracking-wider">Total Disputas</span>
            <span className={`text-xl font-black text-slate-200 transition-opacity duration-300 ${loadingStats ? 'opacity-40 animate-pulse' : 'opacity-100'}`}>
              {candidato.matches_count ?? 0}
            </span>
          </div>
        </div>

        {/* Ficha Geral do Candidato */}
        <div className="w-full mt-5 space-y-2 text-xs">
          <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Ficha Técnica</h3>

          <div className="flex justify-between items-center bg-slate-950/30 px-3 py-2 rounded-xl border border-white/5">
            <span className="text-slate-400">Nome de Urna:</span>
            <span className="font-bold text-white">{candidato.nome_urna || '-'}</span>
          </div>

          <div className="flex justify-between items-center bg-slate-950/30 px-3 py-2 rounded-xl border border-white/5">
            <span className="text-slate-400">Município / UF:</span>
            <span className="font-medium text-white uppercase">
              {candAtual.municipio ? `${candAtual.municipio} ` : ''}({candAtual.uf || candidato.uf || 'BR'})
            </span>
          </div>

          {candAtual.ocupacao && (
            <div className="flex justify-between items-center bg-slate-950/30 px-3 py-2 rounded-xl border border-white/5">
              <span className="text-slate-400">Ocupação:</span>
              <span className="font-medium text-white capitalize truncate max-w-[200px]">
                {candAtual.ocupacao.toLowerCase()}
              </span>
            </div>
          )}

          <div className="flex justify-between items-center bg-slate-950/30 px-3 py-2 rounded-xl border border-white/5">
            <span className="text-slate-400">Última Eleição:</span>
            <span className="font-mono font-bold text-emerald-400">{anoReferencia}</span>
          </div>
        </div>

        {/* Histórico de Candidaturas */}
        <div className="w-full mt-5 border-t border-white/10 pt-4">
          <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Histórico Eleitoral</h3>

          {historicoCandidaturas.length > 0 ? (
            <div className="space-y-2">
              {historicoCandidaturas.map((cand: any, index: number) => (
                <div key={index} className="bg-slate-950/60 border border-white/5 rounded-2xl p-2.5 flex items-center gap-3 text-xs">
                  
                  {/* Foto de cada ano específico */}
                  <div className="w-10 h-10 rounded-full overflow-hidden border border-slate-700 bg-slate-900 flex-shrink-0">
                    <CandidateImage candidato={cand} alt={cand.nome_urna || "Candidato"} className="w-full h-full object-cover" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-bold text-white">{cand.ano_eleicao}</span>
                      <span className="text-[9px] font-semibold bg-emerald-500/10 text-emerald-300 px-2 py-0.5 rounded-md truncate">
                        {cand.cargo}
                      </span>
                    </div>
                    <p className="text-slate-400 text-[11px] mt-0.5 truncate">
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

      <div className="text-center mt-5">
        <Link href="/" className="text-xs text-slate-400 hover:text-white underline transition">
          Voltar para Início
        </Link>
      </div>
    </main>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import CandidateImage from '@/components/ui/CandidateImage';
import Link from 'next/link';
import type { Candidato } from '@/types';

export const dynamic = 'force-dynamic';

// Função auxiliar para calcular a idade exata com base na data de nascimento
function calcularIdade(dataNascimento: string | null): number | null {
  if (!dataNascimento) return null;
  const nascimento = new Date(dataNascimento);
  if (isNaN(nascimento.getTime())) return null;

  const hoje = new Date();
  let idade = hoje.getFullYear() - nascimento.getFullYear();
  const mes = hoje.getMonth() - nascimento.getMonth();

  if (mes < 0 || (mes === 0 && hoje.getDate() < nascimento.getDate())) {
    idade--;
  }
  return idade;
}

// Mapeamento de siglas/códigos de gênero para exibição amigável
function formatarGenero(genero: string | null): string | null {
  if (!genero) return null;
  const g = genero.toString().trim().toUpperCase();
  if (g === 'M' || g === '2') return 'Masculino';
  if (g === 'F' || g === '4') return 'Feminino';
  return genero;
}

export default function Perfil({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = React.use(params);

  const [candidato, setCandidato] = useState<any | null>(null);
  const [historicoCandidaturas, setHistoricoCandidaturas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    async function loadPerfilCompleto() {
      if (!resolvedParams.id) return;

      try {
        setLoading(true);
        // 1. Consulta dados no Postgres via VPS
        const res = await fetch(`/api/candidato/${resolvedParams.id}`);
        if (!res.ok) throw new Error('Candidato não encontrado');

        const data = await res.json();
        const candData = data.candidato || {};
        const historico = data.historico || [];

        setHistoricoCandidaturas(historico);

        const candidatoBase = {
          ...candData,
          candidaturas: historico,
          elo_score: candData.elo_score ?? 1200,
          matches_count: candData.matches_count ?? 0,
        };

        setCandidato(candidatoBase);
        setLoading(false);

        // 2. Consulta dados dinâmicos do Supabase (Score, Duelos + Campos Extras de perfis_candidatos)
        setLoadingStats(true);
        const perfilIdParaConsulta = candData.perfil_id || candData.id || resolvedParams.id;

        const { data: perfilSupabase, error } = await supabase
          .from('perfis_candidatos')
          .select('elo_score, matches_count, genero, cor_raca, data_nascimento, nome_social')
          .eq('id', perfilIdParaConsulta)
          .maybeSingle();

        if (error) {
          console.error('Erro ao consultar Supabase:', error);
        } else if (perfilSupabase) {
          setCandidato((prev: any) =>
            prev
              ? {
                  ...prev,
                  elo_score: perfilSupabase.elo_score ?? prev.elo_score ?? 1200,
                  matches_count: perfilSupabase.matches_count ?? prev.matches_count ?? 0,
                  genero: perfilSupabase.genero ?? prev.genero,
                  cor_raca: perfilSupabase.cor_raca ?? prev.cor_raca,
                  data_nascimento: perfilSupabase.data_nascimento ?? prev.data_nascimento,
                  nome_social: perfilSupabase.nome_social ?? prev.nome_social,
                }
              : null
          );
        }
      } catch (err) {
        console.error('Erro ao carregar perfil:', err);
      } finally {
        setLoading(false);
        setLoadingStats(false);
      }
    }

    loadPerfilCompleto();
  }, [resolvedParams.id]);

  if (loading) return <p className="text-center mt-12 text-slate-400">Carregando perfil...</p>;
  if (!candidato) return <p className="text-center mt-12 text-red-400">Candidato não encontrado.</p>;

  const candAtual = historicoCandidaturas[0] || candidato;
  const anoReferencia = candAtual?.ano_eleicao || candidato?.ano_eleicao || '2026';
  const idade = calcularIdade(candidato.data_nascimento);

  return (
    <main className="max-w-md mx-auto px-4 py-6 text-slate-100">
      <div className="bg-slate-900 rounded-3xl border border-white/10 shadow-xl p-5 flex flex-col items-center">
        
        {/* Foto do Candidato */}
        <div className="relative">
          <div className="w-28 h-28 rounded-full overflow-hidden border-2 border-slate-700 bg-slate-950 shadow-lg">
            <CandidateImage 
              candidato={candidato} 
              alt={candidato.nome_completo || candidato.nome_urna || 'Foto do Candidato'} 
              className="w-full h-full object-cover" 
            />
          </div>
        </div>

        {/* Nome Completo */}
        <h1 className="text-lg font-black text-white mt-4 text-center leading-tight">
          {candidato.nome_completo || candidato.nome_urna}
        </h1>

        {/* Nome Social (Exibido apenas se existir) */}
        {candidato.nome_social && (
          <p className="text-xs font-medium text-slate-400 mt-1 text-center">
            Nome social: <span className="text-slate-200">{candidato.nome_social}</span>
          </p>
        )}

        {/* Cargo e Partido Atual */}
        <div className="flex items-center gap-1.5 mt-2">
          <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full">
            {candAtual.cargo || candidato.cargo} • {candAtual.partido || candidato.partido}
          </span>
        </div>

        {/* Placar ELO e Disputas */}
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

        {/* Ficha Técnica (Apenas exibe os campos que existirem) */}
        <div className="w-full mt-5 space-y-2 text-xs">
          <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Ficha Técnica</h3>

          {(candAtual.municipio || candAtual.uf || candidato.uf) && (
            <div className="flex justify-between items-center bg-slate-950/30 px-3 py-2 rounded-xl border border-white/5">
              <span className="text-slate-400">Município / UF:</span>
              <span className="font-medium text-white uppercase">
                {candAtual.municipio ? `${candAtual.municipio} ` : ''}({candAtual.uf || candidato.uf || 'BR'})
              </span>
            </div>
          )}

          {idade !== null && (
            <div className="flex justify-between items-center bg-slate-950/30 px-3 py-2 rounded-xl border border-white/5">
              <span className="text-slate-400">Idade:</span>
              <span className="font-medium text-white">{idade} anos</span>
            </div>
          )}

          {candidato.genero && (
            <div className="flex justify-between items-center bg-slate-950/30 px-3 py-2 rounded-xl border border-white/5">
              <span className="text-slate-400">Gênero:</span>
              <span className="font-medium text-white capitalize">{formatarGenero(candidato.genero)}</span>
            </div>
          )}

          {candidato.cor_raca && (
            <div className="flex justify-between items-center bg-slate-950/30 px-3 py-2 rounded-xl border border-white/5">
              <span className="text-slate-400">Cor / Raça:</span>
              <span className="font-medium text-white capitalize">{candidato.cor_raca.toLowerCase()}</span>
            </div>
          )}

          {candAtual.ocupacao && (
            <div className="flex justify-between items-center bg-slate-950/30 px-3 py-2 rounded-xl border border-white/5">
              <span className="text-slate-400">Ocupação:</span>
              <span className="font-medium text-white capitalize truncate max-w-[200px]">
                {candAtual.ocupacao.toLowerCase()}
              </span>
            </div>
          )}

          {candAtual.grau_instrucao && (
            <div className="flex justify-between items-center bg-slate-950/30 px-3 py-2 rounded-xl border border-white/5">
              <span className="text-slate-400">Grau de Instrução:</span>
              <span className="font-medium text-white capitalize truncate max-w-[200px]">
                {candAtual.grau_instrucao.toLowerCase()}
              </span>
            </div>
          )}

          <div className="flex justify-between items-center bg-slate-950/30 px-3 py-2 rounded-xl border border-white/5">
            <span className="text-slate-400">Última Eleição:</span>
            <span className="font-mono font-bold text-emerald-400">{anoReferencia}</span>
          </div>
        </div>

        {/* Histórico Eleitoral (Com Situação, Resultado de Turno e Nome de Urna por Mandato) */}
        <div className="w-full mt-5 border-t border-white/10 pt-4">
          <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Histórico Eleitoral</h3>

          {historicoCandidaturas.length > 0 ? (
            <div className="space-y-2.5">
              {historicoCandidaturas.map((cand: any, index: number) => (
                <div key={index} className="bg-slate-950/60 border border-white/5 rounded-2xl p-3 flex items-center gap-3 text-xs">
                  
                  <div className="w-10 h-10 rounded-full overflow-hidden border border-slate-700 bg-slate-900 flex-shrink-0">
                    <CandidateImage 
                      candidato={{ ...cand, candidaturas: historicoCandidaturas }} 
                      alt={cand.nome_urna || cand.nome_completo || 'Foto do Candidato'} 
                      className="w-full h-full object-cover" 
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="font-bold text-emerald-400">{cand.ano_eleicao}</span>
                        <span className="font-semibold text-white truncate">
                          • {cand.nome_urna || candidato.nome_urna || '-'}
                        </span>
                      </div>

                      {/* Situação da Candidatura no mandato */}
                      {cand.situacao_candidatura && (
                        <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-slate-800 text-emerald-300 border border-emerald-500/30 whitespace-nowrap">
                          {cand.situacao_candidatura}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between mt-1 text-[11px] text-slate-400">
                      <span className="truncate">
                        {cand.cargo} ({cand.partido})
                      </span>
                      <span className="uppercase text-[10px] text-slate-500 ml-2 whitespace-nowrap">
                        {cand.municipio ? `${cand.municipio} - ` : ''}{cand.uf}
                      </span>
                    </div>

                    {/* Resultado do Turno (Exibido apenas se disponível) */}
                    {cand.resultado_turno && (
                      <p className="text-[10px] text-slate-400 font-medium mt-1 border-t border-white/5 pt-1">
                        Resultado: <span className="text-slate-200 capitalize">{cand.resultado_turno.toLowerCase()}</span>
                      </p>
                    )}
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

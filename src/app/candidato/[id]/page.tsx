'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import CandidateImage from '@/components/ui/CandidateImage';
import Link from 'next/link';
import { AVAILABLE_UFS } from '@/constants/elections';
import type { Candidato } from '@/types';

// 🎯 Força o Next.js a ignorar caches agressivos de rota em desenvolvimento
export const dynamic = 'force-dynamic';

export default function Perfil({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = React.use(params);
  
  const [candidato, setCandidato] = useState<Candidato | null>(null);
  const [historicoCandidaturas, setHistoricoCandidaturas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadCandidatoCompleto() {
      try {
        setLoading(true);

        // 1️⃣ Busca dados dinâmicos em tempo real (Elo Score e Matches) via Supabase
        const { data: perfilData, error: errorPerfil } = await supabase
          .from('perfis_candidatos')
          .select('id, elo_score, matches_count, nome_completo, uf')
          .eq('id', resolvedParams.id)
          .maybeSingle();

        if (errorPerfil || !perfilData) {
          console.error("Erro ao buscar perfil no Supabase:", errorPerfil);
          setLoading(false);
          return;
        }

        // 2️⃣ Define quais arquivos JSON consultar no R2 (prioriza a UF do perfil se disponível)
        const ufsParaConsultar = perfilData.uf 
          ? [perfilData.uf.toUpperCase(), 'BR'] 
          : AVAILABLE_UFS;

        let candidatoEncontradoR2: Candidato | null = null;

        // 3️⃣ Busca nos arquivos JSON da CDN R2
        for (const uf of ufsParaConsultar) {
          try {
            const res = await fetch(`https://fotos.centraleti.com.br/candidatos/${uf}.json`);
            if (!res.ok) continue;

            const listaCandidatos: Candidato[] = await res.json();
            const cand = listaCandidatos.find((item) => item.id === resolvedParams.id);

            if (cand) {
              candidatoEncontradoR2 = cand;
              break;
            }
          } catch (e) {
            console.error(`Erro ao consultar R2 para UF ${uf}:`, e);
          }
        }

        if (!candidatoEncontradoR2) {
          console.error("Candidato não encontrado nos arquivos JSON do R2.");
          setLoading(false);
          return;
        }

        // 4️⃣ Prepara e ordena o histórico de candidaturas se houver (Cast de tipo para evitar erro no TypeScript)
        const historico = (candidatoEncontradoR2 as any).candidaturas || [];
        const historicoOrdenado = [...historico].sort(
          (a: any, b: any) => Number(b.ano_eleicao) - Number(a.ano_eleicao)
        );

        setHistoricoCandidaturas(historicoOrdenado);

        // 5️⃣ Mescla as informações estáticas do R2 com os pontos dinâmicos do Supabase
        setCandidato({
          ...candidatoEncontradoR2,
          elo_score: perfilData.elo_score ?? candidatoEncontradoR2.elo_score ?? 1200,
          matches_count: perfilData.matches_count ?? candidatoEncontradoR2.matches_count ?? 0,
        });

      } catch (err) {
        console.error("Erro geral no carregamento do perfil:", err);
      } finally {
        setLoading(false);
      }
    }
    
    if (resolvedParams.id) {
      loadCandidatoCompleto();
    }
  }, [resolvedParams.id]);

  if (loading) return <p className="text-center mt-12 text-slate-400">Carregando perfil...</p>;
  if (!candidato) return <p className="text-center mt-12 text-red-400">Candidato não encontrado.</p>;

  // Busca o ano da candidatura mais recente ou do objeto estático
  const anoReferencia = historicoCandidaturas[0]?.ano_eleicao || (candidato as any).ano_eleicao || '2024';

  return (
    <main className="max-w-md mx-auto px-4 py-6 text-slate-100">
      <div className="bg-slate-900 rounded-3xl border border-white/10 shadow-xl p-6 flex flex-col items-center">
        
        {/* Foto e Identificação Principal */}
        <div className="w-28 h-28 rounded-full overflow-hidden border border-slate-700 bg-slate-950 shadow">
          <CandidateImage 
            candidato={{
              ...candidato,
              candidaturas: historicoCandidaturas
            }} 
            alt={candidato.nome_completo} 
            className="w-full h-full object-cover" 
          />
        </div>

        <h1 className="text-xl font-black text-white mt-4 text-center leading-tight">
          {candidato.nome_completo}
        </h1>
        <p className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full mt-2">
          {candidato.cargo} • {candidato.partido}
        </p>

        {/* Estatísticas de Duelo */}
        <div className="grid grid-cols-2 gap-4 w-full mt-6 border-t border-white/10 pt-4">
          <div className="text-center border-r border-white/10">
            <span className="block text-[10px] text-slate-400 uppercase font-bold tracking-wider">Score ELO</span>
            <span className="text-lg font-black text-emerald-400">{candidato.elo_score}</span>
          </div>
          <div className="text-center">
            <span className="block text-[10px] text-slate-400 uppercase font-bold tracking-wider">Total Duelos</span>
            <span className="text-lg font-black text-slate-200">{candidato.matches_count || 0}</span>
          </div>
        </div>

        {/* Ficha Técnica */}
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
            <span className="text-slate-400">Ano de Referência:</span>
            <span className="font-mono text-white">{anoReferencia}</span>
          </div>

          {candidato.titulo_eleitoral && (
            <div className="flex justify-between pb-1">
              <span className="text-slate-500">Inscrição (Título):</span>
              <span className="font-mono font-bold text-slate-400">****{candidato.titulo_eleitoral.slice(-4)}</span>
            </div>
          )}
        </div>

        {/* Histórico de Candidaturas */}
        <div className="w-full mt-6 border-t border-white/10 pt-4">
          <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3">Histórico de Candidaturas</h3>
          
          {historicoCandidaturas.length > 0 ? (
            <div className="space-y-2.5">
              {historicoCandidaturas.map((cand: any, index: number) => (
                <div key={index} className="bg-slate-950/60 border border-white/5 rounded-2xl p-3 flex items-center justify-between text-xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white">{cand.ano_eleicao}</span>
                      <span className="text-[10px] font-semibold bg-emerald-500/10 text-emerald-300 px-2 py-0.5 rounded-md">
                        {cand.cargo}
                      </span>
                    </div>
                    <p className="text-slate-400 mt-1">
                      {cand.partido} {cand.municipio ? `• ${cand.municipio}` : ''} ({cand.uf})
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-500 text-center py-2">Nenhum histórico adicional encontrado.</p>
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

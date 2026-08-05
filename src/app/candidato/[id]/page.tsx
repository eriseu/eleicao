'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { fetchCandidaturasFromVPS } from '@/lib/vpsClient';
import CandidateImage from '@/components/ui/CandidateImage';
import Navbar from "@/components/layout/Navbar";
import Link from 'next/link';

// 🎯 Força o Next.js a ignorar caches agressivos de rota em desenvolvimento
export const dynamic = 'force-dynamic';

export default function Perfil({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = React.use(params);
  
  const [candidato, setCandidato] = useState<any | null>(null);
  const [historicoCandidaturas, setHistoricoCandidaturas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadCandidatoCompleto() {
      try {
        setLoading(true);

        // 1️⃣ Chamada ultra simples: Sem joins, sem parênteses, sem chance de erro 400
        const { data: cand, error: errorPerfil } = await supabase
          .from('perfis_candidatos')
          .select('*')
          .eq('id', resolvedParams.id)
          .maybeSingle(); // Usando maybeSingle para evitar quebras se vier vazio

        if (errorPerfil || !cand) {
          console.error("Erro ao buscar perfil:", errorPerfil);
          setLoading(false);
          return;
        }

        // 2️⃣ Chamada para a API do VPS
        const candsArray = await fetchCandidaturasFromVPS([resolvedParams.id]) || [];
        
        // Ordena o histórico da eleição mais recente para a mais antiga
        const candsOrdenadas = candsArray.sort((a: any, b: any) => Number(b.ano_eleicao) - Number(a.ano_eleicao));
        setHistoricoCandidaturas(candsOrdenadas);

        const candidaturaAtiva = candsOrdenadas.find((c: any) => c.ano_eleicao === 2024) || candsOrdenadas[0];

        // 🔍 Procura a primeira candidatura no histórico inteiro que realmente possua uma foto válida
        const candidaturaComFoto = candsOrdenadas.find((c: any) => c.foto && c.foto.trim() !== '' && !c.foto.includes('avatar.png'));
        const fotoFinal = candidaturaComFoto ? candidaturaComFoto.foto : candidaturaAtiva?.foto;

        // 3️⃣ Agrupamento dos dados principais incluindo a foto encontrada no histórico
        setCandidato({
          ...cand,
          foto: fotoFinal || cand.foto,
          nome_urna: candidaturaAtiva?.nome_urna || cand.nome_completo,
          partido: candidaturaAtiva?.partido || 'Não informado',
          cargo: candidaturaAtiva?.cargo || 'Não informado',
          uf: candidaturaAtiva?.uf || cand.uf || '—',
          municipio: candidaturaAtiva?.municipio || 'Não informado',
          nm_coligacao: candidaturaAtiva?.nm_coligacao || 'Nenhum / Chapa Pura',
          ultima_candidatura: candidaturaAtiva ? {
            ano_eleicao: candidaturaAtiva.ano_eleicao,
            uf: candidaturaAtiva.uf,
            sq_candidato: Number(candidaturaAtiva.sq_candidato) || 0,
            foto: fotoFinal
          } : null
        }) as any;

      } catch (err) {
        console.error("Erro geral na carga do perfil:", err);
      } finally {
        setLoading(false);
      }
    }
    
    if (resolvedParams.id) {
      loadCandidatoCompleto();
    }
  }, [resolvedParams.id]);

  if (loading) return <p className="text-center mt-12 text-slate-500">Carregando perfil...</p>;
  if (!candidato) return <p className="text-center mt-12 text-red-500">Candidato não encontrado.</p>;

  return (
    <main className="max-w-md mx-auto px-4 py-6">
      <div className="bg-white rounded-3xl border shadow-sm p-6 flex flex-col items-center">
        
        {/* Foto e Identificação Principal */}
        <div className="w-28 h-28 rounded-full overflow-hidden border bg-slate-50 shadow">
          <CandidateImage candidato={candidato} alt={candidato.nome_completo} className="w-full h-full object-cover" />
        </div>
        <h1 className="text-xl font-black text-slate-800 mt-4 text-center leading-tight">
          {candidato.nome_completo}
        </h1>
        <p className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full mt-2">
          {candidato.cargo} • {candidato.partido}
        </p>

        {/* Estatísticas de Duelo */}
        <div className="grid grid-cols-2 gap-4 w-full mt-6 border-t pt-4">
          <div className="text-center border-r">
            <span className="block text-[10px] text-slate-400 uppercase font-bold tracking-wider">Score ELO</span>
            <span className="text-lg font-black text-blue-600">{candidato.elo_score}</span>
          </div>
          <div className="text-center">
            <span className="block text-[10px] text-slate-400 uppercase font-bold tracking-wider">Total Duelos</span>
            <span className="text-lg font-black text-slate-700">{candidato.matches_count || 0}</span>
          </div>
        </div>

        {/* Ficha Técnica */}
        <div className="w-full mt-6 border-t pt-4 space-y-3 text-xs">
          <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Ficha do Candidato</h3>
          
          <div className="flex justify-between border-b border-slate-50 pb-1.5">
            <span className="text-slate-500">Nome de Urna:</span>
            <span className="font-bold text-slate-800">{candidato.nome_urna}</span>
          </div>

          <div className="flex justify-between border-b border-slate-50 pb-1.5">
            <span className="text-slate-500">Município / UF:</span>
            <span className="font-medium text-slate-800 uppercase">{candidato.municipio}{candidato.uf !== '—' ? ` (${candidato.uf})` : ''}</span>
          </div>

          <div className="flex justify-between border-b border-slate-50 pb-1.5">
            <span className="text-slate-500">Ano de Referência:</span>
            <span className="font-mono text-slate-800">{candidato.ano || candidato.ultima_candidatura?.ano_eleicao || '2024'}</span>
          </div>

          <div className="flex justify-between border-b border-slate-50 pb-1.5">
            <span className="text-slate-500">Coligação:</span>
            <span className="font-medium text-slate-800 truncate max-w-[220px]" title={candidato.nm_coligacao}>
              {candidato.nm_coligacao}
            </span>
          </div>

          {candidato.titulo_eleitoral && (
            <div className="flex justify-between pb-1">
              <span className="text-slate-400">Inscrição (Título):</span>
              <span className="font-mono font-bold text-slate-500">****{candidato.titulo_eleitoral.slice(-4)}</span>
            </div>
          )}
        </div>

        {/* Histórico de Candidaturas */}
        <div className="w-full mt-6 border-t pt-4">
          <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3">Histórico de Candidaturas</h3>
          
          {historicoCandidaturas.length > 0 ? (
            <div className="space-y-2.5">
              {historicoCandidaturas.map((cand: any, index: number) => (
                <div key={index} className="bg-slate-50 border border-slate-100 rounded-2xl p-3 flex items-center justify-between text-xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800">{cand.ano_eleicao}</span>
                      <span className="text-[10px] font-semibold bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-md">
                        {cand.cargo}
                      </span>
                    </div>
                    <p className="text-slate-500 mt-1">
                      {cand.partido} • {cand.municipio} ({cand.uf})
                    </p>
                  </div>
                  <div className="text-right font-mono text-[10px] text-slate-400">
                    {cand.sg_ue || ''}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400 text-center py-2">Nenhum histórico adicional encontrado.</p>
          )}
        </div>

      </div>

      <div className="text-center mt-6">
        <Link href="/" className="text-sm text-slate-500 underline hover:text-slate-800 transition">
          Voltar para Início
        </Link>
      </div>
    </main>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { Candidato } from '@/types';
import CandidateImage from '@/components/ui/CandidateImage';
import Navbar from "@/components/layout/Navbar";
import Link from 'next/link';

export default function Duelo() {
  const searchParams = useSearchParams();
  const [candidates, setCandidates] = useState<Candidato[]>([]);
  const [c1, setC1] = useState<Candidato | null>(null);
  const [c2, setC2] = useState<Candidato | null>(null);

  async function loadData() {
    const { data } = await supabase
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
      .limit(150);

    if (data) {
      const mappedData = data.map((perfil: any) => {
        const listaCandidaturas = Array.isArray(perfil.candidaturas) ? perfil.candidaturas : [];
        const candidaturaAtiva = listaCandidaturas.find((c: any) => c.ano_eleicao === 2024) || listaCandidaturas[0];

        return {
          id: perfil.id,
          nome_completo: perfil.nome_completo,
          elo_score: perfil.elo_score,
          matches_count: perfil.matches_count || 0,
          ultima_candidatura: candidaturaAtiva ? {
            ano_eleicao: candidaturaAtiva.ano_eleicao,
            uf: candidaturaAtiva.uf,
            sq_candidato: candidaturaAtiva.sq_candidato || candidaturaAtiva.foto
          } : null,
          nome_urna: candidaturaAtiva?.nome_urna || perfil.nome_completo,
          partido: candidaturaAtiva?.partido || 'S/P',
          cargo: candidaturaAtiva?.cargo || 'Não informado'
        };
      });

      setCandidates(mappedData as any);

      const param1 = searchParams.get('c1');
      const param2 = searchParams.get('c2');

      if (param1) {
        const encontrado1 = mappedData.find(c => c.id === param1);
        if (encontrado1) setC1(encontrado1 as any);
      }
      if (param2) {
        const encontrado2 = mappedData.find(c => c.id === param2);
        if (encontrado2) setC2(encontrado2 as any);
      }
    }
  }

  useEffect(() => {
    loadData();
  }, [searchParams]);

  const votar = async (vencedor: Candidato, perdedor: Candidato) => {
    const K = 32;
    const Ra = vencedor.elo_score;
    const Rb = perdedor.elo_score;

    const Ea = 1 / (1 + Math.pow(10, (Rb - Ra) / 400));
    const Eb = 1 / (1 + Math.pow(10, (Ra - Rb) / 400));

    const novoEloA = Math.round(Ra + K * (1 - Ea));
    const novoEloB = Math.round(Rb + K * (0 - Eb));

    // Atualização otimista de interface para manter o card ativo com a nova pontuação
    const vencedorAtualizado = { ...vencedor, elo_score: novoEloA, matches_count: (vencedor.matches_count || 0) + 1 };
    const perdedorAtualizado = { ...perdedor, elo_score: novoEloB, matches_count: (perdedor.matches_count || 0) + 1 };

    if (c1?.id === vencedor.id) {
      setC1(vencedorAtualizado);
      setC2(perdedorAtualizado);
    } else {
      setC1(perdedorAtualizado);
      setC2(vencedorAtualizado);
    }

    try {
      await supabase
        .from('perfis_candidatos')
        .update({ elo_score: novoEloA, matches_count: vencedorAtualizado.matches_count })
        .eq('id', vencedor.id);

      await supabase
        .from('perfis_candidatos')
        .update({ elo_score: novoEloB, matches_count: perdedorAtualizado.matches_count })
        .eq('id', perdedor.id);

      await supabase.rpc('registrar_voto', {
        vencedor_id: vencedor.id,
        perdedor_id: perdedor.id
      });

      alert(`Voto computado! ${vencedor.nome_urna} derrotou ${perdedor.nome_urna}.`);
    } catch (err) {
      console.error("Erro ao registrar voto:", err);
    }
  };

  const handleShare = () => {
    if (!c1 || !c2) return;
    const shareUrl = `${window.location.origin}/duelo?c1=${c1.id}&c2=${c2.id}`;
    navigator.clipboard.writeText(shareUrl);
    alert('Link copiado para compartilhar seu duelo!');
  };

  return (
      <>
      <Navbar />
    <main className="max-w-md mx-auto px-4 py-6 flex flex-col min-h-screen justify-between">
      <header className="text-center mb-6">
        <h1 className="text-2xl font-black text-slate-800 tracking-tight">⚔️ SIMULAR DUELO</h1>
        <p className="text-xs text-slate-500">Selecione ou vote clicando na foto de um candidato</p>
      </header>

      <div className="flex flex-col gap-3 w-full max-w-sm mx-auto">
        <select
          className="p-3 border rounded-xl text-slate-700 bg-white shadow-sm focus:outline-none text-sm font-medium"
          onChange={(e) => setC1(candidates.find(c => c.id === e.target.value) || null)}
          value={c1?.id || ""}
        >
          <option value="">Selecione o Candidato 1</option>
          {candidates.map(c => (
            <option key={c.id} value={c.id}>{c.nome_urna} ({c.partido})</option>
          ))}
        </select>

        <select
          className="p-3 border rounded-xl text-slate-700 bg-white shadow-sm focus:outline-none text-sm font-medium"
          onChange={(e) => setC2(candidates.find(c => c.id === e.target.value) || null)}
          value={c2?.id || ""}
        >
          <option value="">Selecione o Candidato 2</option>
          {candidates.map(c => (
            <option key={c.id} value={c.id}>{c.nome_urna} ({c.partido})</option>
          ))}
        </select>
      </div>

      {c1 && c2 && (
        <div className="my-auto w-full max-w-sm mx-auto flex flex-col items-center pt-6">
          <div className="grid grid-cols-2 gap-4 w-full">
            
            {/* Card Botão 1 */}
            <button
              onClick={() => votar(c1, c2)}
              className="relative aspect-[3/4] w-full bg-slate-100 rounded-2xl overflow-hidden border border-slate-200 shadow-md transition active:scale-95 duration-100 hover:shadow-lg focus:outline-none"
            >
              <CandidateImage candidato={c1} alt={c1.nome_completo} className="w-full h-full object-cover" />
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-2 text-left">
                <p className="text-white font-bold text-xs truncate">{c1.nome_urna}</p>
                <p className="text-blue-300 font-mono text-[10px] font-bold">ELO: {c1.elo_score}</p>
              </div>
            </button>

            {/* Card Botão 2 */}
            <button
              onClick={() => votar(c2, c1)}
              className="relative aspect-[3/4] w-full bg-slate-100 rounded-2xl overflow-hidden border border-slate-200 shadow-md transition active:scale-95 duration-100 hover:shadow-lg focus:outline-none"
            >
              <CandidateImage candidato={c2} alt={c2.nome_completo} className="w-full h-full object-cover" />
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-2 text-left">
                <p className="text-white font-bold text-xs truncate">{c2.nome_urna}</p>
                <p className="text-blue-300 font-mono text-[10px] font-bold">ELO: {c2.elo_score}</p>
              </div>
            </button>

          </div>

          <button
            onClick={handleShare}
            className="mt-6 w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl shadow transition"
          >
            Compartilhar Duelo 🔗
          </button>
        </div>
      )}

      <div className="text-center mt-auto pt-6">
        <Link href="/" className="text-xs font-semibold text-blue-600 hover:underline">
          Voltar para Votação
        </Link>
      </div>
    </main>
      </>
  );
}

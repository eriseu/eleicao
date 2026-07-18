'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Candidato } from '@/types';
import CandidateImage from '@/components/ui/CandidateImage';
import Navbar from "@/components/layout/Navbar";
import Link from 'next/link';

export default function Ranking() {
  const [ranking, setRanking] = useState<Candidato[]>([]);
  const [page, setPage] = useState(0);

  useEffect(() => {
    async function loadRanking() {
      const from = page * 10;
      const to = from + 9;

      // 🎯 MODIFICADO: Agora trazemos a tabela filha candidaturas junto na busca
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
        .order('elo_score', { ascending: false })
        .range(from, to);

      if (data) {
        // 🎯 MAPEAMENTO: Estrutura o objeto exatamente como o CandidateImage precisa ler
        const mappedData = data.map(perfil => {
          const listaCandidaturas = Array.isArray(perfil.candidaturas) ? perfil.candidaturas : [];
          const candidaturaAtiva = listaCandidaturas.find((c: any) => c.ano_eleicao === 2024) || listaCandidaturas[0];

          return {
            id: perfil.id,
            nome_completo: perfil.nome_completo,
            elo_score: perfil.elo_score,
            matches_count: perfil.matches_count || 0,
            // Preenche a chave que o getPhotoUrls() usa para montar a fila de fotos da VPS
            ultima_candidatura: candidaturaAtiva ? {
              ano_eleicao: candidaturaAtiva.ano_eleicao || perfil.ano,
              uf: candidaturaAtiva.uf || perfil.uf,
              sq_candidato: candidaturaAtiva.sq_candidato || candidaturaAtiva.foto?.replace(/_div\.jpg|_div\.jpeg|_div\.png/g, '').replace(/[A-Z]/g, '')
            } : null,
            nome_urna: candidaturaAtiva?.nome_urna || perfil.nome_completo,
            partido: candidaturaAtiva?.partido || 'S/P',
            cargo: candidaturaAtiva?.cargo || 'Não informado'
          };
        });

        setRanking(mappedData as any);
      }
    }
    loadRanking();
  }, [page]);

  return (
      <>
      <Navbar />
    <main className="max-w-md mx-auto px-4 py-6">
      <h1 className="text-xl font-black text-center text-slate-800 mb-6">🏆 TOP CANDIDATOS</h1>

      <div className="flex flex-col gap-2 bg-white rounded-2xl border p-2 shadow-sm">
        {ranking.map((cand, index) => (
          <Link
            href={`/candidato/${cand.id}`}
            key={cand.id}
            className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-xl transition"
          >
            <span className="font-bold text-slate-400 w-6 text-center">
              {page * 10 + index + 1}º
            </span>
            <div className="w-10 h-10 rounded-full overflow-hidden border bg-slate-100 flex-shrink-0">
              <CandidateImage candidato={cand} alt={cand.nome_completo} className="w-full h-full object-cover" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-bold text-slate-800 leading-tight">{cand.nome_completo}</p>
              <p className="text-[10px] text-slate-400">Partidas: {cand.matches_count}</p>
            </div>
            <span className="text-xs font-mono font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded">
              {cand.elo_score}
            </span>
          </Link>
        ))}
      </div>

      <div className="flex justify-between items-center mt-6">
        <button
          disabled={page === 0}
          onClick={() => setPage(p => p - 1)}
          className="text-xs px-3 py-1.5 border rounded-lg bg-white font-bold disabled:opacity-50 text-slate-700"
        >
          Anterior
        </button>
        <span className="text-xs text-slate-500 font-bold">Página {page + 1}</span>
        <button
          disabled={ranking.length < 10}
          onClick={() => setPage(p => p + 1)}
          className="text-xs px-3 py-1.5 border rounded-lg bg-white font-bold disabled:opacity-50 text-slate-700"
        >
          Próxima
        </button>
      </div>
    </main>
      </>
  );
}

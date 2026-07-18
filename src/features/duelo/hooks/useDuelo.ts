// src/features/duelo/hooks/useDuelo.ts
'use client';

import { useState } from 'react';
import { Proposta } from '../types'; // Ou tipo Candidato

export function useDuelo() {
  const [votando, setVotando] = useState(false);
  const [dueloVotado, setDueloVotado] = useState<number | null>(null); // 1 para Candidato A, 2 para B
  const [novosScores, setNovosScores] = useState<{ c1: number; c2: number } | null>(null);

  const enviarVoto = async (vencedorId: string, perdedorId: string, opcaoSelecionada: number) => {
    if (votando || dueloVotado !== null) return;
    setVotando(true);

    try {
      // Faz o POST seguro na API Route
      const response = await fetch('/api/duelo/votar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vencedorId, perdedorId }),
      });

      const data = await response.json();

      if (data.success) {
        setDueloVotado(opcaoSelecionada);
        
        // Define o feedback de pontos atualizado vindo em tempo real do banco
        setNovosScores({
          c1: opcaoSelecionada === 1 ? data.novoEloVencedor : data.novoEloPerdedor,
          c2: opcaoSelecionada === 2 ? data.novoEloVencedor : data.novoEloPerdedor,
        });

        // Trava física contra F5 (Evita spam do mesmo par)
        const chaveDuelo = `duelo_votado_${vencedorId}_${perdedorId}`;
        localStorage.setItem(chaveDuelo, opcaoSelecionada.toString());
      }
    } catch (error) {
      console.error("Erro ao registrar voto de Elo:", error);
    } finally {
      setVotando(false);
    }
  };

  return {
    enviarVoto,
    votando,
    dueloVotado,
    novosScores,
  };
}

// src/app/api/duelo/votar/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js'; // ou seu arquivo de config do Supabase

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Usar service role para gravação segura
);

export async function POST(request: Request) {
  try {
    const { vencedorId, perdedorId } = await request.json();

    if (!vencedorId || !perdedorId) {
      return NextResponse.json({ error: 'Dados insuficientes.' }, { status: 400 });
    }

    // 1. Busca as pontuações atuais dos dois candidatos diretamente no banco
    const { data: candidatos, error } = await supabase
      .from('candidatos')
      .select('id, elo_score, matches_count')
      .in('id', [vencedorId, perdedorId]);

    if (error || !candidatos || candidatos.length < 2) {
      return NextResponse.json({ error: 'Candidatos não encontrados.' }, { status: 404 });
    }

    const vencedor = candidatos.find(c => c.id === vencedorId)!;
    const perdedor = candidatos.find(c => c.id === perdedorId)!;

    // 2. Aplicação da fórmula matemática do Elo Rating (idêntica à do seu JS antigo)
    const eloVencedor = vencedor.elo_score;
    const eloPerdedor = perdedor.elo_score;
    
    const K = 32; // Fator de sensibilidade
    const espVencedor = 1 / (1 + Math.pow(10, (eloPerdedor - eloVencedor) / 400));
    const espPerdedor = 1 / (1 + Math.pow(10, (eloVencedor - eloPerdedor) / 400));

    // Novas pontuações arredondadas
    const novoEloVencedor = Math.round(eloVencedor + K * (1 - espVencedor));
    const novoEloPerdedor = Math.round(eloPerdedor + K * (0 - espPerdedor));

    // 3. Atualiza os dados de forma atômica no Supabase
    await supabase
      .from('candidatos')
      .update({ elo_score: novoEloVencedor, matches_count: vencedor.matches_count + 1 })
      .eq('id', vencedorId);

    await supabase
      .from('candidatos')
      .update({ elo_score: novoEloPerdedor, matches_count: perdedor.matches_count + 1 })
      .eq('id', perdedorId);

    // Opcional: Registrar no histórico para auditoria
    await supabase.from('historico_duelos').insert({
      candidato_vencedor_id: vencedorId,
      candidato_perdedor_id: perdedorId
    });

    return NextResponse.json({
      success: true,
      novoEloVencedor,
      novoEloPerdedor
    });

  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Erro interno no servidor.' }, { status: 500 });
  }
}

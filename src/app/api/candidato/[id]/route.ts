import { NextResponse } from 'next/server';
import { fetchCandidaturasFromVPS } from '@/lib/vpsClient';

const VPS_API_URL = process.env.NEXT_PUBLIC_VPS_API_URL || 'https://api.centraleti.com.br';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    // 1. Busca as candidaturas do perfil no VPS usando a função já testada
    const candidaturas = await fetchCandidaturasFromVPS([id]);

    // Ordena do ano mais recente ao mais antigo
    const candidaturasOrdenadas = (candidaturas || []).sort(
      (a: any, b: any) => Number(b.ano_eleicao) - Number(a.ano_eleicao)
    );

    // 2. Busca os dados da tabela de perfil se disponível
    let perfil: any = null;
    try {
      const perfilResponse = await fetch(`${VPS_API_URL}/api/perfis-candidatos?id=${id}`, {
        headers: { 'Content-Type': 'application/json' },
      });

      if (perfilResponse.ok) {
        const perfis = await perfilResponse.json();
        perfil = Array.isArray(perfis) ? perfis[0] : perfis;
      }
    } catch (e) {
      console.warn('Não foi possível buscar perfil diretamente, usando dados das candidaturas');
    }

    const candidaturaMaisRecente = candidaturasOrdenadas[0];

    // Se não encontrou nem perfil e nem histórico de candidaturas, aí sim é 404
    if (!perfil && !candidaturaMaisRecente) {
      return NextResponse.json({ error: 'Candidato não encontrado' }, { status: 404 });
    }

    // 3. Consolida os dados do candidato (com fallback para os dados da candidatura mais recente)
    const candidato = {
      id: perfil?.id || candidaturaMaisRecente?.perfil_id || id,
      nome_completo: perfil?.nome_completo || candidaturaMaisRecente?.nome_urna || 'Candidato',
      cpf: perfil?.cpf || null,
      elo_score: perfil?.elo_score ?? 1200,
      matches_count: perfil?.matches_count ?? 0,
      nome_urna: candidaturaMaisRecente?.nome_urna || perfil?.nome_completo,
      sq_candidato: candidaturaMaisRecente?.sq_candidato || null,
      cargo: candidaturaMaisRecente?.cargo || null,
      uf: candidaturaMaisRecente?.uf || null,
      municipio: candidaturaMaisRecente?.municipio || null,
      partido: candidaturaMaisRecente?.partido || 'S/P',
      foto: candidaturaMaisRecente?.foto || candidaturaMaisRecente?.sq_candidato || null,
    };

    return NextResponse.json({
      candidato,
      historico: candidaturasOrdenadas,
    });

  } catch (error: any) {
    console.error('Erro ao buscar candidato na VPS:', error);
    return NextResponse.json(
      { error: 'Erro interno ao consultar o candidato', details: error.message },
      { status: 500 }
    );
  }
}

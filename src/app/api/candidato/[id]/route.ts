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

    // 1. Busca os dados do perfil do candidato direto no VPS
    const perfilResponse = await fetch(`${VPS_API_URL}/api/perfis-candidatos?id=eq.${id}`, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!perfilResponse.ok) {
      return NextResponse.json({ error: 'Erro ao buscar perfil no VPS' }, { status: perfilResponse.status });
    }

    const perfis = await perfilResponse.json();
    const perfil = Array.isArray(perfis) ? perfis[0] : perfis;

    if (!perfil) {
      return NextResponse.json({ error: 'Candidato não encontrado' }, { status: 404 });
    }

    // 2. Busca as candidaturas associadas a esse perfil no VPS
    const candidaturas = await fetchCandidaturasFromVPS([id]);

    // Ordena as candidaturas do ano mais recente ao mais antigo
    const candidaturasOrdenadas = (candidaturas || []).sort(
      (a: any, b: any) => Number(b.ano_eleicao) - Number(a.ano_eleicao)
    );

    const candidaturaMaisRecente = candidaturasOrdenadas[0] || {};

    // 3. Monta o objeto padronizado
    const candidato = {
      id: perfil.id,
      nome_completo: perfil.nome_completo,
      cpf: perfil.cpf,
      elo_score: perfil.elo_score ?? 1200,
      matches_count: perfil.matches_count ?? 0,
      nome_urna: candidaturaMaisRecente.nome_urna || perfil.nome_completo,
      sq_candidato: candidaturaMaisRecente.sq_candidato || null,
      cargo: candidaturaMaisRecente.cargo || null,
      uf: candidaturaMaisRecente.uf || null,
      partido: candidaturaMaisRecente.partido || 'S/P',
      foto: candidaturaMaisRecente.foto || candidaturaMaisRecente.sq_candidato || null,
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

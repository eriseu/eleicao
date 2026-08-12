import { NextResponse } from 'next/server';
import { pool } from '@/lib/db'; // Ajuste o import do seu conector Postgres

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    // 1. Busca os dados do perfil unindo com todas as candidaturas que possuem esse perfil_id
    const query = `
      SELECT 
        p.id AS perfil_id,
        p.nome_completo,
        p.cpf,
        p.elo_score,
        p.matches_count,
        c.id AS candidatura_id,
        c.sq_candidato,
        c.nome_urna,
        c.cargo,
        c.uf
      FROM perfis_candidatos p
      LEFT JOIN candidaturas c ON c.perfil_id = p.id::text
      WHERE p.id::text = $1
      ORDER BY c.id DESC;
    `;

    const { rows } = await pool.query(query, [id]);

    if (!rows || rows.length === 0) {
      return NextResponse.json({ error: 'Candidato não encontrado' }, { status: 404 });
    }

    // Estrutura a resposta enviando o perfil principal e a lista de candidaturas
    const primeiroRegistro = rows[0];

    const candidato = {
      id: primeiroRegistro.perfil_id,
      nome_completo: primeiroRegistro.nome_completo,
      nome_urna: primeiroRegistro.nome_urna || primeiroRegistro.nome_completo,
      sq_candidato: primeiroRegistro.sq_candidato,
      cargo: primeiroRegistro.cargo,
      uf: primeiroRegistro.uf,
      elo_score: primeiroRegistro.elo_score,
      matches_count: primeiroRegistro.matches_count,
    };

    return NextResponse.json({
      candidato,
      historico: rows,
    });

  } catch (error: any) {
    console.error('Erro ao buscar candidato no Postgres:', error);
    return NextResponse.json(
      { error: 'Erro interno ao consultar o candidato', details: error.message },
      { status: 500 }
    );
  }
}

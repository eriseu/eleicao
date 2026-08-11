import { NextResponse } from 'next/server';
import { Pool } from 'pg';

// Conexão com a VPS
const pool = new Pool({
  host: process.env.DB_HOST || '72.61.58.199',
  port: Number(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'tinder_politico',
  user: process.env.DB_USER || 'tinder',
  password: process.env.DB_PASSWORD,
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    // 1. Busca todas as candidaturas daquele perfil_id no banco da VPS
    const result = await pool.query(
      `SELECT 
        c.perfil_id,
        p.nome_completo,
        c.nome_urna,
        c.partido,
        c.cargo,
        c.ano_eleicao,
        c.uf,
        c.municipio,
        c.foto,
        c.sq_candidato
       FROM public.candidaturas c
       LEFT JOIN public.perfis_candidatos p ON p.id::text = c.perfil_id::text
       WHERE c.perfil_id = $1
       ORDER BY c.ano_eleicao DESC`,
      [id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Candidato não encontrado' }, { status: 404 });
    }

    const historicoBruto = result.rows;

    // Formata cada candidatura do histórico
    const historicoFormatado = historicoBruto.map((row) => {
      let fotoLimpa = row.foto;
      if (fotoLimpa && fotoLimpa.includes('/')) {
        fotoLimpa = fotoLimpa.split('/').pop();
      }

      return {
        ...row,
        id: row.perfil_id,
        cargo: (row.cargo || '').toUpperCase().trim(),
        foto: fotoLimpa || 'avatar.png',
      };
    });

    // Pega os dados principais da candidatura mais recente
    const candMaisRecente = historicoFormatado[0];

    return NextResponse.json({
      candidato: {
        id: candMaisRecente.perfil_id,
        nome_completo: candMaisRecente.nome_completo || candMaisRecente.nome_urna,
        nome_urna: candMaisRecente.nome_urna,
        cargo: candMaisRecente.cargo,
        partido: candMaisRecente.partido,
        uf: candMaisRecente.uf,
        municipio: candMaisRecente.municipio,
        foto: candMaisRecente.foto,
        sq_candidato: candMaisRecente.sq_candidato,
        ano_eleicao: candMaisRecente.ano_eleicao,
      },
      historico: historicoFormatado,
    });
  } catch (error) {
    console.error('Erro ao consultar Postgres da VPS:', error);
    return NextResponse.json({ error: 'Erro ao buscar perfil no banco' }, { status: 500 });
  }
}

import 'server-only';
import { Pool } from 'pg';
import { candidateOffices } from './candidateFilters';
import type { Candidato } from '@/types';

// Reuse a small server-side connection pool. No credentials enter client bundles.
const globalPool = globalThis as typeof globalThis & { candidateSearchPool?: Pool };
function pool() {
  if (!process.env.VPS_DB_HOST || !process.env.VPS_DB_PASSWORD) throw new Error('Candidate database unavailable');
  if (!globalPool.candidateSearchPool) {
    globalPool.candidateSearchPool = new Pool({
      host: process.env.VPS_DB_HOST, port: Number(process.env.VPS_DB_PORT || 5432),
      database: process.env.VPS_DB_NAME, user: process.env.VPS_DB_USER, password: process.env.VPS_DB_PASSWORD,
      max: 3, connectionTimeoutMillis: 5000, idleTimeoutMillis: 10000, statement_timeout: 10000,
      options: '-c default_transaction_read_only=on',
    });
    globalPool.candidateSearchPool.on('error', () => console.error('Candidate search connection unavailable'));
  }
  return globalPool.candidateSearchPool;
}

export async function searchCandidates(uf: string, municipio: string, query: string, excludeId = ''): Promise<Candidato[]> {
  const term = query.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[\\%_]/g, '\\$&');
  const values = [uf, candidateOffices(uf, municipio), municipio, `%${term}%`, excludeId];
  const result = await pool().query(`
    WITH candidates AS (
      SELECT DISTINCT ON (c.perfil_id)
        p.id, p.nome_completo, c.nome_urna, c.cargo, c.partido, c.uf, c.municipio,
        c.ano_eleicao, c.nr_candidato, c.foto, c.sq_candidato,
        p.elo_score, p.matches_count
      FROM public.candidaturas c
      JOIN public.perfis_candidatos p ON p.id::text = c.perfil_id
      WHERE ($1 = 'BR' OR c.uf = $1) AND c.cargo = ANY($2::text[])
        AND ($3 = '' OR upper(c.municipio) = upper($3))
        AND ($4 = '%%' OR translate(lower(p.nome_completo || ' ' || coalesce(c.nome_urna, '')),
          'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc') LIKE $4)
        AND p.id::text <> $5
      ORDER BY c.perfil_id, c.ano_eleicao DESC, c.id DESC
    )
    SELECT * FROM candidates
    ORDER BY ${query ? 'nome_completo, id' : 'random()'}
    LIMIT ${query ? 20 : 30}
  `, values);
  return result.rows.map(row => ({ ...row, ultima_candidatura: { ...row, perfil_id: row.id } }));
}

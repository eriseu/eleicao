import { NextResponse } from 'next/server';
import { normalizeUf } from '@/lib/candidateFilters';
import { searchCandidates } from '@/lib/candidateSearch';

export const runtime = 'nodejs';
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const uf = normalizeUf(params.get('uf'));
  const municipio = uf === 'BR' ? '' : (params.get('municipio') || '').trim().slice(0, 100);
  const query = (params.get('q') || '').trim().slice(0, 100);
  if (query && query.length < 2) return NextResponse.json([]);
  try {
    const data = await searchCandidates(uf, municipio, query, (params.get('exclude') || '').slice(0, 36));
    return NextResponse.json(data, { headers: { 'Cache-Control': query ? 'public, s-maxage=300, stale-while-revalidate=600' : 'no-store' } });
  } catch {
    return NextResponse.json({ error: 'Busca temporariamente indisponível. Tente novamente.' }, { status: 503 });
  }
}

import type { Metadata } from 'next';
import RankingClient from './RankingClient';
import { normalizeUf, normalizePage, rankingUrl } from '@/lib/candidateFilters';
import { getRankingData } from '@/lib/rankingData';
import { notFound } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { socialMetadata } from '@/lib/socialMetadata';
import { getStateNameFromUf } from '@/lib/municipioOptions';

export const dynamic = 'force-dynamic';
type RankingPageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };
const firstValue = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;

export async function generateMetadata({ searchParams }: RankingPageProps): Promise<Metadata> {
  const query = await searchParams;
  const requestedUf = firstValue(query.uf)?.toUpperCase() || 'BR';
  const uf = normalizeUf(requestedUf);
  const municipio = uf === 'BR' ? '' : firstValue(query.municipio)?.trim() || '';
  const params = new URLSearchParams({ uf });
  if (municipio) params.set('municipio', municipio);
  const scope = [municipio, getStateNameFromUf(uf)].filter(Boolean).join(' · ');
  const page = normalizePage(firstValue(query.page));
  if (page > 1) params.set('page', String(page));
  let title = `Ranking de candidatos — ${scope}`;
  const highlight = firstValue(query.highlight);
  if (highlight) {
    const { data } = await supabase.from('perfis_candidatos').select('nome_completo').eq('id', highlight).maybeSingle();
    if (data) {
      title = `${data.nome_completo} no ranking de ${scope}`;

    }
  }
  const imageParams = new URLSearchParams({ tipo: 'ranking', uf });
  if (municipio) imageParams.set('municipio', municipio);
  if (page > 1) title += ` — página ${page}`;
  return socialMetadata(title, `Acompanhe os candidatos mais bem posicionados no ranking político de ${scope}.`, `/ranking?${params}`, `/api/og?${imageParams}`);
}

export default async function RankingPage({ searchParams }: RankingPageProps) {
  const query = await searchParams;
  const uf = normalizeUf(firstValue(query.uf));
  const municipio = uf === 'BR' ? '' : (firstValue(query.municipio) || '').trim().slice(0, 100);
  const page = normalizePage(firstValue(query.page));
  const highlight = firstValue(query.highlight) || '';
  const data = await getRankingData(uf, municipio, page, highlight);
  if (page > 1 && !data.ranking.length) notFound();
  return <RankingClient key={rankingUrl(uf, municipio, data.page, highlight)} data={data} uf={uf} municipio={municipio} highlight={highlight} />;
}

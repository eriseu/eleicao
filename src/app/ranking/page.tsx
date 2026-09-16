import type { Metadata } from 'next';
import RankingClient from './RankingClient';
import { AVAILABLE_UFS } from '@/constants/elections';
import { supabase } from '@/lib/supabaseClient';
import { socialMetadata } from '@/lib/socialMetadata';
import { getStateNameFromUf } from '@/lib/municipioOptions';

export const dynamic = 'force-dynamic';
type RankingPageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };
const firstValue = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;

export async function generateMetadata({ searchParams }: RankingPageProps): Promise<Metadata> {
  const query = await searchParams;
  const requestedUf = firstValue(query.uf)?.toUpperCase() || 'BR';
  const uf = AVAILABLE_UFS.some(item => item === requestedUf) ? requestedUf : 'BR';
  const municipio = uf === 'BR' ? '' : firstValue(query.municipio)?.trim() || '';
  const params = new URLSearchParams({ uf });
  if (municipio) params.set('municipio', municipio);
  const scope = [municipio, getStateNameFromUf(uf)].filter(Boolean).join(' · ');
  let title = `Ranking de candidatos — ${scope}`;
  const highlight = firstValue(query.highlight);
  if (highlight) {
    const { data } = await supabase.from('perfis_candidatos').select('nome_completo').eq('id', highlight).maybeSingle();
    if (data) {
      title = `${data.nome_completo} no ranking de ${scope}`;
      params.set('highlight', highlight);
    }
  }
  const imageParams = new URLSearchParams({ tipo: 'ranking', uf });
  if (municipio) imageParams.set('municipio', municipio);
  return socialMetadata(title, `Acompanhe os candidatos mais bem posicionados no ranking político de ${scope}.`, `/ranking?${params}`, `/api/og?${imageParams}`);
}

export default function RankingPage() {
  return <RankingClient />;
}

import { AVAILABLE_UFS } from '@/constants/elections';

export function normalizeUf(value: string | null | undefined) {
  const uf = (value || 'BR').toUpperCase();
  return (AVAILABLE_UFS as readonly string[]).includes(uf) ? uf : 'BR';
}
export function candidateOffices(uf: string, municipio: string) {
  if (uf === 'BR') return ['PRESIDENTE', 'VICE-PRESIDENTE'];
  if (municipio) return ['PREFEITO', 'PREFEITA', 'VICE-PREFEITO', 'VICE-PREFEITA', 'VEREADOR', 'VEREADORA'];
  return ['DEPUTADO ESTADUAL', 'DEPUTADA ESTADUAL', 'DEPUTADO DISTRITAL', 'DEPUTADA DISTRITAL', 'DEPUTADO FEDERAL', 'DEPUTADA FEDERAL', 'GOVERNADOR', 'GOVERNADORA', 'VICE-GOVERNADOR', 'VICE-GOVERNADORA', 'SENADOR', 'SENADORA'];
}
export function rankingUrl(uf: string, municipio = '', page = 1, highlight = '') {
  const params = new URLSearchParams({ uf: normalizeUf(uf) });
  if (uf !== 'BR' && municipio) params.set('municipio', municipio);
  if (page > 1) params.set('page', String(page));
  if (highlight) params.set('highlight', highlight);
  return `/ranking?${params}`;
}
export function normalizePage(raw: string | undefined) {
  return raw && /^[1-9]\d*$/.test(raw) && Number.isSafeInteger(Number(raw)) && Number(raw) <= 100000 ? Number(raw) : 1;
}

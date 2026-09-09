import { getSiteUrl } from '@/lib/seo';

export function buildDuelOgImageUrl(c1: string, c2: string, uf?: string) {
  const params = new URLSearchParams({ c1, c2 });
  if (uf) params.set('uf', uf);
  
  // Retorna a URL ABSOLUTA apontando para a imagem OG
  return new URL(`/duelo/opengraph-image?${params.toString()}`, getSiteUrl()).toString();
}

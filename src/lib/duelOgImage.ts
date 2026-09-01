import { getSiteUrl } from '@/lib/seo';

export function buildDuelOgImageUrl(c1Id: string, c2Id: string, uf?: string): string {
  const params = new URLSearchParams({
    c1: c1Id,
    c2: c2Id,
  });

  if (uf) params.set('uf', uf);

  return new URL(`/duelo/opengraph-image?${params.toString()}`, getSiteUrl()).toString();
}

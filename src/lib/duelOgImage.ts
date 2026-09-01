export function buildDuelOgImageUrl(c1Id: string, c2Id: string, uf?: string): string {
  const params = new URLSearchParams({
    c1: c1Id,
    c2: c2Id,
  });

  if (uf) params.set('uf', uf);

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://politica.centraleti.com.br';
  return new URL(`/duelo/opengraph-image?${params.toString()}`, baseUrl).toString();
}

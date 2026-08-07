import { AVAILABLE_UFS } from '@/constants/elections';

export const SITEMAP_PAGE_SIZE = 5000;

export function xmlEscape(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

const R2_BASE_URL = 'https://fotos.centraleti.com.br/candidatos';

/**
 * Busca e consolida a lista completa de IDs de candidatos a partir dos arquivos JSON no R2
 */
export async function getAllCandidateIdsFromR2(): Promise<string[]> {
  try {
    // Lê os JSONs de todas as UFs simultaneamente a partir da CDN
    const promises = AVAILABLE_UFS.map(async (uf) => {
      try {
        const res = await fetch(`${R2_BASE_URL}/${uf.toUpperCase()}.json`, {
          next: { revalidate: 86400 } // Cache de 24 horas
        });
        if (!res.ok) return [];
        const data = await res.json();
        return Array.isArray(data) ? data.map((c: any) => c.id) : [];
      } catch (err) {
        console.error(`Erro ao carregar candidatos do R2 para UF ${uf}:`, err);
        return [];
      }
    });

    const results = await Promise.all(promises);
    
    // Remove duplicatas (ex: candidatos presentes tanto em 'BR' quanto na UF de origem)
    const uniqueIds = Array.from(new Set(results.flat().filter(Boolean)));
    return uniqueIds;
  } catch (error) {
    console.error('Erro ao consolidar IDs de candidatos para o sitemap:', error);
    return [];
  }
}

/**
 * Retorna o total de candidatos únicos cadastrados nos JSONs
 */
export async function getSitemapCandidateCount(): Promise<number> {
  const ids = await getAllCandidateIdsFromR2();
  return ids.length;
}

/**
 * Retorna uma fatia (página) de IDs de candidatos para montar sitemaps paginados
 */
export async function getSitemapCandidatePage(page: number) {
  const allIds = await getAllCandidateIdsFromR2();
  const start = page * SITEMAP_PAGE_SIZE;
  const end = start + SITEMAP_PAGE_SIZE;
  return allIds.slice(start, end);
}

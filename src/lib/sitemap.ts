import { cache } from 'react';
import { AVAILABLE_UFS } from '@/constants/elections';

export const SITEMAP_PAGE_SIZE = 10000;

export function xmlEscape(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

const R2_BASE_URL = 'https://fotos.centraleti.com.br/candidatos';

function normalizeCandidateIds(items: unknown[]): string[] {
  return Array.from(
    new Set(
      items
        .map((item) => {
          if (typeof item === 'string') return item.trim();
          if (item && typeof item === 'object' && 'id' in item && typeof (item as { id?: unknown }).id === 'string') {
            return (item as { id: string }).id.trim();
          }
          return '';
        })
        .filter((id): id is string => Boolean(id))
    )
  );
}

export async function getCandidateIdsForUf(uf: string): Promise<string[]> {
  const url = `${R2_BASE_URL}/${uf.toUpperCase()}.json`;
  try {
    const res = await fetch(url, {
      next: {
        revalidate: 86400,
        tags: ['candidates-list'],
      },
    });

    if (!res.ok) {
      console.error(`[SITEMAP FETCH ERROR] ${url} retornou status ${res.status}`);
      return [];
    }

    const data = await res.json();
    if (!Array.isArray(data)) {
      console.error(`[SITEMAP DATA ERROR] O conteúdo de ${url} não é um Array`);
      return [];
    }

    return normalizeCandidateIds(data);
  } catch (error) {
    console.error(`[SITEMAP EXCEPTION] Falha ao buscar ${url}:`, error);
    return [];
  }
}

/**
 * Busca e consolida a lista completa de IDs de candidatos a partir dos arquivos JSON no R2
 */
export const getAllCandidateIdsFromR2 = cache(async (): Promise<string[]> => {
  try {
    const results = await Promise.all(AVAILABLE_UFS.map((uf) => getCandidateIdsForUf(uf)));
    return normalizeCandidateIds(results.flat());
  } catch {
    return [];
  }
});

/**
 * Retorna o total de candidatos únicos cadastrados nos JSONs
 */
export async function getSitemapCandidateCount(): Promise<number> {
  const ids = await getAllCandidateIdsFromR2();
  return ids.length;
}

export async function getSitemapPageCountForUf(uf: string): Promise<number> {
  const ids = await getCandidateIdsForUf(uf);
  return Math.max(0, Math.ceil(ids.length / SITEMAP_PAGE_SIZE));
}

/**
 * Retorna uma fatia (página) de IDs de candidatos para montar sitemaps paginados
 */
export async function getSitemapCandidatePage(page: number, uf?: string) {
  const allIds = uf ? await getCandidateIdsForUf(uf) : await getAllCandidateIdsFromR2();
  const start = page * SITEMAP_PAGE_SIZE;
  const end = start + SITEMAP_PAGE_SIZE;
  return allIds.slice(start, end);
}

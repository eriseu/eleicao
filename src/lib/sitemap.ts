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

const R2_BASE_URL = 'https://fotos.centraleti.com.br/candidatos-ids';

function normalizeCandidateIds(items: unknown[]): string[] {
  if (!Array.isArray(items)) return [];

  const ids = items
    .map((item) => {
      // Caso 1: Item já é uma string simples ("00156063-27ab-...")
      if (typeof item === 'string') return item.trim();

      // Caso 2: Item é um número
      if (typeof item === 'number') return String(item).trim();

      // Caso 3: Item é um objeto ({ id: "...", sq_candidato: ... })
      if (item && typeof item === 'object') {
        const candidate = item as Record<string, unknown>;
        if (typeof candidate.id === 'string' && candidate.id.trim()) {
          return candidate.id.trim();
        }
        if (candidate.sq_candidato) {
          return String(candidate.sq_candidato).trim();
        }
      }

      return null;
    })
    .filter((id): id is string => Boolean(id));

  return Array.from(new Set(ids));
}

export async function getCandidateIdsForUf(uf: string): Promise<string[]> {
  const url = `${R2_BASE_URL}/${uf.toUpperCase()}.json`;

  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      'Accept': 'application/json, text/plain, */*',
      'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
      'Cache-Control': 'no-cache',
    },
    next: {
      revalidate: 86400,
      tags: ['candidates-list'],
    },
  });

  if (!res.ok) {
    const errorMsg = `HTTP ${res.status} ${res.statusText} ao buscar ${url}`;
    console.error(`[SITEMAP FETCH ERROR] ${errorMsg}`);
    throw new Error(errorMsg);
  }

  const data = await res.json();
  if (!Array.isArray(data)) {
    const errorMsg = `JSON retornado em ${url} não é uma lista/array válida.`;
    console.error(`[SITEMAP PARSE ERROR] ${errorMsg}`);
    throw new Error(errorMsg);
  }

  return normalizeCandidateIds(data);
}

export const getAllCandidateIdsFromR2 = cache(async (): Promise<string[]> => {
  try {
    const results = await Promise.all(AVAILABLE_UFS.map((uf) => getCandidateIdsForUf(uf)));
    return normalizeCandidateIds(results.flat());
  } catch {
    return [];
  }
});

export async function getSitemapCandidateCount(): Promise<number> {
  const ids = await getAllCandidateIdsFromR2();
  return ids.length;
}

export async function getSitemapPageCountForUf(uf: string): Promise<number> {
  const ids = await getCandidateIdsForUf(uf);
  return Math.max(0, Math.ceil(ids.length / SITEMAP_PAGE_SIZE));
}

export async function getSitemapCandidatePage(page: number, uf?: string) {
  const allIds = uf ? await getCandidateIdsForUf(uf) : await getAllCandidateIdsFromR2();
  const start = page * SITEMAP_PAGE_SIZE;
  const end = start + SITEMAP_PAGE_SIZE;
  return allIds.slice(start, end);
}

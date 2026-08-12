import { cache } from 'react';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
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

// Inicializa o cliente do R2 de forma resiliente
const r2 = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT, // Ex: https://<ACCOUNT_ID>.r2.cloudflarestorage.com
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  },
});

const BUCKET_NAME = process.env.R2_BUCKET || 'eleicao';

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
  const objectKey = `candidatos-ids/${uf.toUpperCase()}.json`;

  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: objectKey,
    });

    const response = await r2.send(command);
    const bodyContents = await response.Body?.transformToString();

    if (!bodyContents) {
      throw new Error(`O arquivo '${objectKey}' veio vazio do R2.`);
    }

    const data = JSON.parse(bodyContents);

    if (!Array.isArray(data)) {
      throw new Error(`JSON retornado no arquivo '${objectKey}' não é uma lista/array válida.`);
    }

    return normalizeCandidateIds(data);

  } catch (error: any) {
    const errorMsg = `Erro ao ler '${objectKey}' via R2 SDK: ${error?.message || error}`;
    console.error(`[SITEMAP SDK ERROR] ${errorMsg}`);
    throw new Error(errorMsg);
  }
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
